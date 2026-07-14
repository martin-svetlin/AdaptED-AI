import Header from "../components/Header";
import { useLocation, useNavigate } from "react-router-dom";
import { useState } from "react";
import { db } from "../firebase";
import {
  addDoc,
  collection,
  serverTimestamp,
  doc,
  getDoc,
  setDoc,
  query,
  where,
  getDocs
} from "firebase/firestore";
import { useAuth } from "../context/AuthContext";
import {
  buildAdaptiveQuiz,
  applyMasteryUpdates,
  INITIAL_MASTERY
} from "../utils/adaptiveLearning";

// FastAPI backend - same host convention already used elsewhere in the
// project (see QuestionBank.jsx).
const GRADING_ENDPOINT = "http://127.0.0.1:8000/grade-written-answers";

const WRITTEN_TYPES = ["Short Answer", "Fill in the Blank", "Scenario-Based"];

// AI-generated questions don't always have a "type" field that exactly
// matches one of the expected strings (casing/spacing can vary, or the
// field can be missing entirely). Normalise it, and fall back to
// inferring the type from the question's actual shape so an answer
// input always renders instead of silently showing nothing. Pulled out
// to module level so it can be reused both for rendering the current
// question and for classifying every question at submission time.
function resolveQuestionType(question) {

  const normalizedType = question?.type?.trim().toLowerCase();

  if (normalizedType === "multiple choice") return "Multiple Choice";
  if (normalizedType === "true/false" || normalizedType === "true / false")
    return "True/False";
  if (normalizedType === "short answer") return "Short Answer";
  if (normalizedType === "fill in the blank") return "Fill in the Blank";
  if (normalizedType === "scenario-based" || normalizedType === "scenario based")
    return "Scenario-Based";

  // Type missing/unrecognised: infer from the data itself.
  if (question?.options && Object.keys(question.options).length > 0) {
    return "Multiple Choice";
  }
  return "Short Answer";

}

// Formats a mastery delta as a signed percentage string, e.g. 0.1 ->
// "+10%", -0.05 -> "-5%".
function formatMasteryChange(change) {
  const rounded = Math.round(change * 100);
  return `${rounded >= 0 ? "+" : ""}${rounded}%`;
}

function StudentQuiz() {

  const location = useLocation();
  const navigate = useNavigate();

  const { user } = useAuth();

  const week = location.state;

  // "intro" -> "quiz" -> "results" -> "review" (review can go back to "results")
  const [stage, setStage] = useState("intro");

  const [quizQuestions, setQuizQuestions] = useState([]);

  const [currentQuestion, setCurrentQuestion] = useState(0);

  const [answers, setAnswers] = useState({});

  const [quizResults, setQuizResults] = useState(null);

  const [submitting, setSubmitting] = useState(false);

  const [submitStatus, setSubmitStatus] = useState("");

  const [preparingQuiz, setPreparingQuiz] = useState(false);

  // The mastery values the current quiz was generated from. Captured
  // once at "Start Quiz" and reused (rather than re-read) when the
  // quiz is submitted, so the post-quiz mastery update is applied on
  // top of the exact same baseline the difficulty selection used.
  const [masteryAtStart, setMasteryAtStart] = useState({});

  if (!week) {
    return (
      <>
        <Header />
        <div className="min-h-screen bg-slate-100 flex items-center justify-center">
          <p>No quiz selected.</p>
        </div>
      </>
    );
  }

  const startQuiz = async () => {

    setPreparingQuiz(true);

    let existingMastery = {};

    try {

      const userSnap = await getDoc(doc(db, "users", user.uid));

      if (userSnap.exists()) {
        existingMastery = userSnap.data().mastery || {};
      }

    } catch (error) {

      // If mastery can't be read, buildAdaptiveQuiz still works - every
      // topic just falls back to INITIAL_MASTERY, same as a first-time
      // topic would.
      console.error("Failed to load mastery scores:", error);

    }

    const previouslySeenQuestions = new Set();

    try {

      const attemptsSnap = await getDocs(
        query(
          collection(db, "quizAttempts"),
          where("studentId", "==", user.uid)
        )
      );

      attemptsSnap.docs.forEach((attemptDoc) => {

        const attemptAnswers = attemptDoc.data().answers || [];

        attemptAnswers.forEach((a) => {
          if (a.question) previouslySeenQuestions.add(a.question);
        });

      });

    } catch (error) {

      // If history can't be read, question variety just falls back to
      // "avoid repeats within this quiz only" - buildAdaptiveQuiz still
      // works correctly with an empty seen-questions set.
      console.error("Failed to load quiz history:", error);

    }

    const generatedQuiz =
      buildAdaptiveQuiz(week, existingMastery, previouslySeenQuestions);

    // Snapshot the mastery baseline the quiz was actually built from,
    // for every topic in this week (not just ones already in Firestore).
    const topicNames = Object.keys(week.questions);

    const snapshot = {};

    topicNames.forEach((topic) => {
      snapshot[topic] =
        existingMastery[topic] !== undefined
          ? existingMastery[topic]
          : INITIAL_MASTERY;
    });

    setMasteryAtStart(snapshot);

    setQuizQuestions(generatedQuiz);

    setPreparingQuiz(false);

    setStage("quiz");

  };


  const current = quizQuestions[currentQuestion];

  const resolvedType = resolveQuestionType(current);

  const saveAnswer = (value) => {

    setAnswers({
      ...answers,
      [currentQuestion]: value
    });

  };

  const nextQuestion = () => {

    if (currentQuestion < quizQuestions.length - 1) {

      setCurrentQuestion(currentQuestion + 1);

    }

  };

  const previousQuestion = () => {

    if (currentQuestion > 0) {

      setCurrentQuestion(currentQuestion - 1);

    }

  };

  const answerProvided = () => {

    const answer = answers[currentQuestion];

    return answer !== undefined &&
      answer !== "";

  };

  // Joins topic names into a natural-reading list, e.g.
  // ["A"] -> "A", ["A","B"] -> "A and B", ["A","B","C"] -> "A, B and C"
  const formatTopicList = (topics) => {

    if (topics.length === 0) return "";

    if (topics.length === 1) return topics[0];

    return `${topics.slice(0, -1).join(", ")} and ${topics[topics.length - 1]}`;

  };

  // Generates simple, rule-based feedback locally from the topic
  // breakdown. No Gemini call - this is intentionally a fixed threshold
  // rather than a model call, so it's fast, free, and fully explainable.
  const generateFeedback = (topicStats) => {

    const MASTERY_THRESHOLD = 70;

    const strongTopics = [];
    const weakTopics = [];

    Object.entries(topicStats).forEach(([topic, stats]) => {

      const topicPercentage =
        stats.total > 0 ? (stats.correct / stats.total) * 100 : 0;

      if (topicPercentage >= MASTERY_THRESHOLD) {
        strongTopics.push(topic);
      } else {
        weakTopics.push(topic);
      }

    });

    if (weakTopics.length === 0) {
      return `Excellent work! You demonstrated strong understanding of ${formatTopicList(strongTopics)}.`;
    }

    if (strongTopics.length === 0) {
      return `You may benefit from revising ${formatTopicList(weakTopics)} before attempting another quiz.`;
    }

    return `You performed well in ${formatTopicList(strongTopics)}. You may benefit from revising ${formatTopicList(weakTopics)} before attempting another quiz.`;

  };

  const submitQuiz = async () => {

    setSubmitting(true);
    setSubmitStatus("Grading your answers...");

    // Phase 1: grade every question locally. Multiple Choice and
    // True/False get an exact-match verdict immediately, since exact
    // matching is genuinely correct for those types. Written-response
    // questions are left unresolved here (outcome: null) and graded by
    // Gemini in Phase 2.
    let detailedAnswers = quizQuestions.map((q, index) => {

      const studentAnswer = answers[index] ?? "";

      const questionType = resolveQuestionType(q);

      if (WRITTEN_TYPES.includes(questionType)) {

        return {
          topic: q.topic,
          difficulty: q.difficulty,
          question: q.question,
          questionType,
          studentAnswer,
          correctAnswer: q.answer,
          explanation: q.explanation || "",
          outcome: null,
          feedback: ""
        };

      }

      const isCorrect =
        typeof q.answer === "string" &&
        studentAnswer.toString().trim().toLowerCase() ===
          q.answer.trim().toLowerCase();

      return {
        topic: q.topic,
        difficulty: q.difficulty,
        question: q.question,
        questionType,
        studentAnswer,
        correctAnswer: q.answer,
        explanation: q.explanation || "",
        outcome: isCorrect ? "correct" : "incorrect",
        feedback: ""
      };

    });

    // Phase 2: every written-response question is sent to the backend
    // in a single request - not one request per question.
    const writtenIndices = detailedAnswers
      .map((entry, index) =>
        WRITTEN_TYPES.includes(entry.questionType) ? index : -1
      )
      .filter((index) => index !== -1);

    if (writtenIndices.length > 0) {

      setSubmitStatus("Evaluating written answers...");

      try {

        const response = await fetch(GRADING_ENDPOINT, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            questions: writtenIndices.map((index) => {

              const entry = detailedAnswers[index];

              return {
                id: index,
                question: entry.question,
                expectedAnswer: entry.correctAnswer,
                explanation: entry.explanation,
                studentAnswer: entry.studentAnswer,
                questionType: entry.questionType
              };

            })
          })
        });

        if (!response.ok) {
          throw new Error(`Grading request failed with status ${response.status}`);
        }

        const data = await response.json();

        const results = data.results || [];

        const validOutcomes = ["correct", "partial", "incorrect"];

        detailedAnswers = detailedAnswers.map((entry, index) => {

          if (!writtenIndices.includes(index)) return entry;

          const result = results.find((r) => r.id === index);

          if (!result || !validOutcomes.includes(result.outcome)) {
            return {
              ...entry,
              outcome: "incorrect",
              feedback: "This answer could not be graded automatically."
            };
          }

          return {
            ...entry,
            outcome: result.outcome,
            feedback: result.feedback || ""
          };

        });

      } catch (error) {

        console.error("Written answer grading failed:", error);

        detailedAnswers = detailedAnswers.map((entry, index) =>
          writtenIndices.includes(index)
            ? {
                ...entry,
                outcome: "incorrect",
                feedback: "Unable to connect to the grading service."
              }
            : entry
        );

      }

    }

    setSubmitStatus("Saving results...");

    // Phase 3: convert outcomes into marks, apply mastery updates now
    // every question has a final outcome, and roll everything up into
    // the overall result summary.
    const QUESTION_MARK = { correct: 100, partial: 50, incorrect: 0 };

    const markedAnswers = detailedAnswers.map((entry) => ({
      ...entry,
      questionMark: QUESTION_MARK[entry.outcome] ?? 0
    }));

    const { updatedMastery, detailedAnswers: finalAnswers } =
      applyMasteryUpdates(markedAnswers, masteryAtStart);

    const total = finalAnswers.length;

    // "Correct" here means full marks - partial-credit answers are
    // grouped with incorrect ones for this simple two-card summary,
    // since a third card wasn't part of the existing Results layout.
    // The overall percentage below is what actually reflects partial
    // credit in the headline score (it's an average of question marks,
    // not a correct/total count).
    const correctCount = finalAnswers.filter((a) => a.outcome === "correct").length;

    const incorrectCount = total - correctCount;

    const totalMarks = finalAnswers.reduce((sum, a) => sum + a.questionMark, 0);

    const percentage = total > 0 ? Math.round(totalMarks / total) : 0;

    const topicStats = {};

    finalAnswers.forEach((a) => {

      if (!topicStats[a.topic]) {
        topicStats[a.topic] = { correct: 0, total: 0 };
      }

      topicStats[a.topic].total++;

      if (a.outcome === "correct") topicStats[a.topic].correct++;

    });

    const feedback = generateFeedback(topicStats);

    const finalResults = {
      correctCount,
      incorrectCount,
      total,
      percentage,
      topicStats,
      detailedAnswers: finalAnswers,
      feedback
    };

    setQuizResults(finalResults);

    try {

      await addDoc(collection(db, "quizAttempts"), {

        studentId: user.uid,

        weekId: week.id,
        weekTitle: week.title,

        date: serverTimestamp(),

        score: correctCount,
        totalQuestions: total,
        percentage,
        correctCount,
        incorrectCount,

        // Every field the Review Answers page and future analytics
        // need, per question: student answer, correct answer, question
        // text, difficulty, topic, outcome, mark, mastery change,
        // AI feedback and explanation.
        answers: finalAnswers,

        topicPerformance: topicStats,

        // Mastery snapshot before and after this attempt - an audit
        // trail per attempt. The live mastery scores themselves live
        // on the user document, not here.
        masteryBefore: masteryAtStart,
        masteryAfter: updatedMastery

      });

      // Live mastery scores, merged into the user's existing document
      // rather than a separate collection.
      await setDoc(
        doc(db, "users", user.uid),
        { mastery: updatedMastery },
        { merge: true }
      );

    } catch (error) {

      // Don't block the student's results screen on a save failure -
      // just log it so the attempt can still be debugged.
      console.error("Failed to save quiz attempt:", error);

    }

    setSubmitting(false);

    setSubmitStatus("");

    setStage("results");

  };


  return (
    <>
      <Header />

      <div className="min-h-screen bg-slate-100 px-10 py-16">

        <div className="max-w-5xl mx-auto">

          {stage === "quiz" && (

            <div className="flex justify-between items-center mb-8">

              <button
                onClick={() => navigate(-1)}
                className="
          border
          border-slate-300
          px-4
          py-2
          rounded-xl
        "
              >
                ← Back
              </button>

              <div className="w-72">

                <div className="flex justify-between text-sm text-gray-600 mb-2">

                  <p>
                    Question {currentQuestion + 1} of {quizQuestions.length}
                  </p>

                  <p>
                    {Math.round(((currentQuestion + 1) / quizQuestions.length) * 100)}%
                  </p>

                </div>

                <div className="w-full bg-slate-200 rounded-full h-2">

                  <div
                    className="bg-slate-900 h-2 rounded-full transition-all"
                    style={{
                      width: `${((currentQuestion + 1) / quizQuestions.length) * 100}%`
                    }}
                  />

                </div>

              </div>

            </div>

          )}

          {stage === "intro" && (

            <button
              onClick={() => navigate(-1)}
              className="
        mb-8
        border
        border-slate-300
        px-4
        py-2
        rounded-xl
      "
            >
              ← Back
            </button>

          )}


          {stage === "intro" && (

            <div className="bg-white rounded-3xl shadow-md p-10">

              <h1 className="text-5xl font-bold mb-3">
                {week.title}
              </h1>

              <p className="text-gray-500 text-lg mb-10">
                Adaptive Quiz
              </p>

              <div className="grid md:grid-cols-3 gap-6 mb-10">

                <div className="bg-slate-100 rounded-2xl p-6">

                  <p className="text-gray-500 mb-2">
                    Questions
                  </p>

                  <h2 className="text-4xl font-bold">
                    10
                  </h2>

                </div>

                <div className="bg-slate-100 rounded-2xl p-6">

                  <p className="text-gray-500 mb-2">
                    Estimated Time
                  </p>

                  <h2 className="text-4xl font-bold">
                    10 min
                  </h2>

                </div>

                <div className="bg-slate-100 rounded-2xl p-6">

                  <p className="text-gray-500 mb-2">
                    Difficulty
                  </p>

                  <h2 className="text-2xl font-bold">
                    Adaptive
                  </h2>

                </div>

              </div>

              <div className="grid md:grid-cols-2 gap-6 mb-10">

                <div className="bg-slate-100 rounded-2xl p-8">

                  <h2 className="text-2xl font-semibold mb-5">
                    Before You Begin
                  </h2>

                  <ul className="space-y-3 text-gray-700">

                    <li>• Questions are selected based on your learning progress.</li>

                    <li>• The quiz contains 10 questions.</li>

                    <li>• Your results will be saved automatically.</li>

                    <li>• You can review your performance afterwards.</li>

                  </ul>

                </div>

                <div className="bg-slate-100 rounded-2xl p-8">

                  <h2 className="text-2xl font-semibold mb-5">
                    Topics Covered
                  </h2>

                  <div className="space-y-3 max-h-56 overflow-y-auto">

                    {week.topics.map((topic, index) => (

                      <div
                        key={index}
                        className="bg-white rounded-xl px-4 py-3"
                      >
                        • {topic}
                      </div>

                    ))}

                  </div>

                </div>

              </div>

              <div className="flex justify-end">

                <button
                  onClick={startQuiz}
                  disabled={preparingQuiz}
                  className={`
        px-8
        py-4
        rounded-2xl
        text-white
        transition-all

        ${preparingQuiz
                      ? "bg-slate-400 cursor-not-allowed"
                      : "bg-slate-900 hover:bg-slate-800"
                    }
      `}
                >
                  {preparingQuiz ? "Preparing Quiz..." : "Start Quiz"}
                </button>

              </div>

            </div>

          )}

          {stage === "quiz" && (

            <div className="bg-white rounded-3xl shadow-md p-10">

              <p className="text-gray-500">
                Topic
              </p>

              <h2 className="text-3xl font-bold mb-2">
                {current.topic}
              </h2>

              {current.difficulty === "easy" && (
                <p className="text-green-600 font-semibold mb-8">
                  🟢 Easy Question
                </p>
              )}

              {current.difficulty === "medium" && (
                <p className="text-yellow-600 font-semibold mb-8">
                  🟡 Medium Question
                </p>
              )}

              {current.difficulty === "hard" && (
                <p className="text-red-600 font-semibold mb-8">
                  🔴 Hard Question
                </p>
              )}

              <hr className="border-slate-300 my-8" />

              <h1 className="text-4xl font-bold mb-10">
                {current.question}
              </h1>

              {/* MULTIPLE CHOICE */}

              {resolvedType === "Multiple Choice" && current.options && (

                <div className="grid grid-cols-2 gap-5 mb-10">

                  {Object.entries(current.options).map(

                    ([letter, option]) => (

                      <button
                        key={letter}
                        onClick={() => saveAnswer(letter)}
                        className={`
              text-left
              rounded-2xl
              border-2
              p-5
              transition-all

              ${answers[currentQuestion] === letter
                            ? "border-slate-900 bg-slate-100"
                            : "border-slate-300 hover:bg-slate-50"
                          }
            `}
                      >

                        <p className="font-bold text-lg mb-2">
                          {letter}
                        </p>

                        <p>
                          {option}
                        </p>

                      </button>

                    )

                  )}

                </div>

              )}

              {/* TRUE FALSE */}

              {resolvedType === "True/False" && (

                <div className="grid grid-cols-2 gap-5 mb-10">

                  {["True", "False"].map(

                    (option) => (

                      <button
                        key={option}
                        onClick={() => saveAnswer(option)}
                        className={`
              rounded-2xl
              border-2
              p-8
              text-xl
              font-semibold
              transition-all

              ${answers[currentQuestion] === option
                            ? "border-slate-900 bg-slate-100"
                            : "border-slate-300 hover:bg-slate-50"
                          }
            `}
                      >

                        {option}

                      </button>

                    )

                  )}

                </div>

              )}

              {/* SHORT ANSWER */}

              {(resolvedType === "Short Answer" ||

                resolvedType === "Fill in the Blank") && (

                  <input

                    type="text"

                    value={answers[currentQuestion] || ""}

                    onChange={(e) =>
                      saveAnswer(e.target.value)
                    }

                    placeholder="Type your answer..."

                    className="
          w-full
          border-2
          border-slate-300
          rounded-2xl
          p-5
          text-lg
          mb-10
          focus:outline-none
          focus:border-slate-900
        "

                  />

                )}

              {/* SCENARIO */}

              {resolvedType === "Scenario-Based" && (

                <textarea

                  value={answers[currentQuestion] || ""}

                  onChange={(e) =>
                    saveAnswer(e.target.value)
                  }

                  rows={6}

                  placeholder="Type your answer..."

                  className="
        w-full
        border-2
        border-slate-300
        rounded-2xl
        p-5
        text-lg
        mb-10
        resize-none
        focus:outline-none
        focus:border-slate-900
      "

                />

              )}

              {/* FALLBACK: type was "Multiple Choice" but options data is
                  missing/malformed. Rather than showing no input at all,
                  fall back to a text field so the question is still
                  answerable. */}

              {resolvedType === "Multiple Choice" && !current.options && (

                <input

                  type="text"

                  value={answers[currentQuestion] || ""}

                  onChange={(e) =>
                    saveAnswer(e.target.value)
                  }

                  placeholder="Type your answer..."

                  className="
          w-full
          border-2
          border-slate-300
          rounded-2xl
          p-5
          text-lg
          mb-10
          focus:outline-none
          focus:border-slate-900
        "

                />

              )}

              <hr className="border-slate-300 mb-8" />

              <div className="flex justify-between">

                <button

                  onClick={previousQuestion}

                  disabled={currentQuestion === 0}

                  className={`
      px-6
      py-3
      rounded-xl
      border

      ${currentQuestion === 0
                      ? "opacity-50 cursor-not-allowed"
                      : "hover:bg-slate-100"
                    }
    `}

                >

                  ← Previous

                </button>

                {currentQuestion === quizQuestions.length - 1 ? (

                  <button

                    onClick={submitQuiz}

                    disabled={!answerProvided() || submitting}

                    className={`
        px-8
        py-3
        rounded-xl
        text-white

        ${answerProvided() && !submitting

                        ? "bg-slate-900 hover:bg-slate-800"

                        : "bg-slate-400 cursor-not-allowed"
                      }
      `}

                  >

                    {submitting ? (submitStatus || "Submitting...") : "Submit Quiz"}

                  </button>

                ) : (

                  <button

                    onClick={nextQuestion}

                    disabled={!answerProvided()}

                    className={`
        px-8
        py-3
        rounded-xl
        text-white

        ${answerProvided()

                        ? "bg-slate-900 hover:bg-slate-800"

                        : "bg-slate-400 cursor-not-allowed"
                      }
      `}

                  >

                    Next →

                  </button>

                )}

              </div>


            </div>

          )}

          {/* RESULTS */}

          {stage === "results" && quizResults && (

            <div className="bg-white rounded-3xl shadow-md p-10">

              <div className="text-center mb-10">

                <h1 className="text-5xl font-bold mb-3">
                  Quiz Complete
                </h1>

                <p className="text-gray-500 text-lg">
                  {week.title}
                </p>

              </div>

              <div className="flex flex-col items-center mb-10">

                <h2 className="text-6xl font-bold mb-2">
                  {quizResults.correctCount} / {quizResults.total}
                </h2>

                <p className="text-2xl text-gray-600 mb-6">
                  {quizResults.percentage}%
                </p>

                <div className="w-full max-w-md bg-slate-200 rounded-full h-3">

                  <div
                    className="bg-slate-900 h-3 rounded-full transition-all"
                    style={{ width: `${quizResults.percentage}%` }}
                  />

                </div>

              </div>

              <div className="grid md:grid-cols-3 gap-6 mb-10">

                <div className="bg-slate-100 rounded-2xl p-6 text-center">

                  <p className="text-gray-500 mb-2">
                    Total Questions
                  </p>

                  <h2 className="text-4xl font-bold">
                    {quizResults.total}
                  </h2>

                </div>

                <div className="bg-slate-100 rounded-2xl p-6 text-center">

                  <p className="text-gray-500 mb-2">
                    Correct
                  </p>

                  <h2 className="text-4xl font-bold text-green-600">
                    {quizResults.correctCount}
                  </h2>

                </div>

                <div className="bg-slate-100 rounded-2xl p-6 text-center">

                  <p className="text-gray-500 mb-2">
                    Incorrect
                  </p>

                  <h2 className="text-4xl font-bold text-red-600">
                    {quizResults.incorrectCount}
                  </h2>

                </div>

              </div>

              <div className="bg-slate-100 rounded-2xl p-8 mb-10">

                <h2 className="text-2xl font-semibold mb-5">
                  Topic Performance
                </h2>

                <div className="space-y-3">

                  {Object.entries(quizResults.topicStats).map(
                    ([topic, stats]) => {

                      const topicPercentage =
                        stats.total > 0
                          ? Math.round((stats.correct / stats.total) * 100)
                          : 0;

                      const isStrong = topicPercentage >= 70;

                      return (

                        <div
                          key={topic}
                          className="bg-white rounded-xl px-5 py-4 flex justify-between items-center"
                        >

                          <div>

                            <p className="font-semibold">
                              {topic}
                            </p>

                            <p className="text-sm text-gray-500">
                              {stats.correct} / {stats.total} correct
                            </p>

                          </div>

                          <span
                            className={`
                      text-sm
                      font-semibold
                      px-3
                      py-1
                      rounded-full

                      ${isStrong
                                ? "bg-green-100 text-green-700"
                                : "bg-yellow-100 text-yellow-700"
                              }
                    `}
                          >
                            {isStrong ? "Strong" : "Needs Practice"}
                          </span>

                        </div>

                      );

                    }
                  )}

                </div>

              </div>

              <div className="bg-slate-100 rounded-2xl p-8 mb-10">

                <h2 className="text-2xl font-semibold mb-3">
                  Feedback
                </h2>

                <p className="text-gray-700">
                  {quizResults.feedback}
                </p>

              </div>

              <div className="flex justify-end gap-4">

                <button
                  onClick={() => setStage("review")}
                  className="
            border
            border-slate-300
            px-6
            py-3
            rounded-xl
            hover:bg-slate-100
          "
                >
                  Review Answers
                </button>

                <button
                  onClick={() => navigate(-1)}
                  className="
            bg-slate-900
            text-white
            px-6
            py-3
            rounded-xl
            hover:bg-slate-800
          "
                >
                  Return to Dashboard
                </button>

              </div>

            </div>

          )}

          {/* REVIEW ANSWERS */}

          {stage === "review" && quizResults && (

            <div className="bg-white rounded-3xl shadow-md p-10">

              <div className="flex justify-between items-center mb-8">

                <h1 className="text-4xl font-bold">
                  Review Answers
                </h1>

                <button
                  onClick={() => setStage("results")}
                  className="
            border
            border-slate-300
            px-4
            py-2
            rounded-xl
            hover:bg-slate-100
          "
                >
                  ← Back to Results
                </button>

              </div>

              <div className="space-y-6">

                {quizResults.detailedAnswers.map((item, index) => {

                  const outcomeStyles = {
                    correct: {
                      badge: "bg-green-100 text-green-700",
                      text: "text-green-700",
                      label: "Correct"
                    },
                    partial: {
                      badge: "bg-yellow-100 text-yellow-700",
                      text: "text-yellow-700",
                      label: "Partial Credit"
                    },
                    incorrect: {
                      badge: "bg-red-100 text-red-700",
                      text: "text-red-700",
                      label: "Incorrect"
                    }
                  }[item.outcome] || {
                    badge: "bg-red-100 text-red-700",
                    text: "text-red-700",
                    label: "Incorrect"
                  };

                  return (

                    <div
                      key={index}
                      className="bg-slate-100 rounded-2xl p-6"
                    >

                      <div className="flex justify-between items-start mb-3 gap-3">

                        <p className="text-sm text-gray-500">
                          Question {index + 1} • {item.topic}
                        </p>

                        <div className="flex items-center gap-2 flex-wrap justify-end">

                          <span
                            className={`text-sm font-semibold px-3 py-1 rounded-full ${outcomeStyles.badge}`}
                          >
                            {outcomeStyles.label} · {item.questionMark}%
                          </span>

                          <span
                            className={`
                              text-sm
                              font-semibold
                              px-3
                              py-1
                              rounded-full

                              ${item.masteryChange >= 0
                                ? "bg-green-100 text-green-700"
                                : "bg-red-100 text-red-700"
                              }
                            `}
                          >
                            Mastery {formatMasteryChange(item.masteryChange)}
                          </span>

                        </div>

                      </div>

                      <h3 className="text-lg font-semibold mb-4">
                        {item.question}
                      </h3>

                      <div className="bg-white rounded-xl p-4 mb-2">

                        <p className="text-sm text-gray-500 mb-1">
                          Your Answer
                        </p>

                        <p className={outcomeStyles.text}>
                          {item.studentAnswer || "No answer provided"}
                        </p>

                      </div>

                      {item.outcome !== "correct" && (

                        <div className="bg-white rounded-xl p-4 mb-2">

                          <p className="text-sm text-gray-500 mb-1">
                            Correct Answer
                          </p>

                          <p className="text-green-700">
                            {item.correctAnswer}
                          </p>

                        </div>

                      )}

                      {item.feedback && (

                        <div className="bg-white rounded-xl p-4 mb-2">

                          <p className="text-sm text-gray-500 mb-1">
                            AI Feedback
                          </p>

                          <p className="text-gray-700">
                            {item.feedback}
                          </p>

                        </div>

                      )}

                      {item.explanation && (

                        <div className="bg-white rounded-xl p-4">

                          <p className="text-sm text-gray-500 mb-1">
                            Explanation
                          </p>

                          <p className="text-gray-700">
                            {item.explanation}
                          </p>

                        </div>

                      )}

                    </div>

                  );

                })}

              </div>

              <div className="flex justify-end mt-8">

                <button
                  onClick={() => navigate(-1)}
                  className="
            bg-slate-900
            text-white
            px-6
            py-3
            rounded-xl
            hover:bg-slate-800
          "
                >
                  Return to Dashboard
                </button>

              </div>

            </div>

          )}

        </div>

      </div>

    </>
  );
}

export default StudentQuiz;
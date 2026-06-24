import Header from "../components/Header";
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { db } from "../firebase";
import {
  collection,
  getDocs,
  doc,
  updateDoc
} from "firebase/firestore";

function QuestionBank() {
const [selectedWeek, setSelectedWeek] = useState(null);
const [selectedTopic, setSelectedTopic] = useState(null);

const [showGenerateModal, setShowGenerateModal] = useState(false);

const [easyCount, setEasyCount] = useState(2);
const [mediumCount, setMediumCount] = useState(2);
const [hardCount, setHardCount] = useState(2);

const [weeks, setWeeks] = useState([]);

const navigate = useNavigate();

const topicData =
  selectedWeek?.questions?.[selectedTopic];

const easyQuestions =
  topicData?.easy || [];

const mediumQuestions =
  topicData?.medium || [];

const hardQuestions =
  topicData?.hard || [];

const totalQuestions =
  easyQuestions.length +
  mediumQuestions.length +
  hardQuestions.length;

useEffect(() => {

  const loadQuestionBanks = async () => {

    try {

      const snapshot = await getDocs(
        collection(db, "questionBank")
      );

      const data = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      setWeeks(data);

    } catch (error) {

      console.error(error);

    }

  };

  loadQuestionBanks();

}, []);


const deleteQuestion = async (
  difficulty,
  questionIndex
) => {

  const confirmed = window.confirm(
    "Delete this question?"
  );

  if (!confirmed) return;

  try {

    const updatedQuestions = {
      ...selectedWeek.questions
    };

    updatedQuestions[selectedTopic][difficulty] =
      updatedQuestions[selectedTopic][difficulty]
        .filter(
          (_, index) => index !== questionIndex
        );

    await updateDoc(
      doc(
        db,
        "questionBank",
        selectedWeek.id
      ),
      {
        questions: updatedQuestions
      }
    );

    setSelectedWeek({
      ...selectedWeek,
      questions: updatedQuestions
    });

  } catch (error) {

    console.error(error);

    alert("Failed to delete question.");

  }

};



const editQuestion = async (
  difficulty,
  questionIndex
) => {

  const currentQuestion =
    selectedWeek.questions
      [selectedTopic]
      [difficulty]
      [questionIndex];

  const updatedText = prompt(
    "Edit Question",
    currentQuestion.question
  );

  if (!updatedText) return;

  try {

    const updatedQuestions = {
      ...selectedWeek.questions
    };

    updatedQuestions[selectedTopic][difficulty][questionIndex] = {
      ...currentQuestion,
      question: updatedText
    };

    await updateDoc(
      doc(
        db,
        "questionBank",
        selectedWeek.id
      ),
      {
        questions: updatedQuestions
      }
    );

    setSelectedWeek({
      ...selectedWeek,
      questions: updatedQuestions
    });

  } catch (error) {

    console.error(error);

    alert("Failed to update question.");

  }

};


const generateMoreQuestions = async () => {

  try {

    const response = await fetch(
      "http://127.0.0.1:8000/generate-more-questions",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          topic: selectedTopic,
          easyCount,
          mediumCount,
          hardCount
        })
      }
    );

    const newQuestions =
      await response.json();

    const updatedQuestions = {
      ...selectedWeek.questions
    };

    updatedQuestions[selectedTopic].easy.push(
      ...newQuestions.easy
    );

    updatedQuestions[selectedTopic].medium.push(
      ...newQuestions.medium
    );

    updatedQuestions[selectedTopic].hard.push(
      ...newQuestions.hard
    );

    await updateDoc(
      doc(
        db,
        "questionBank",
        selectedWeek.id
      ),
      {
        questions: updatedQuestions
      }
    );

    setSelectedWeek({
      ...selectedWeek,
      questions: updatedQuestions
    });

    setShowGenerateModal(false);

    setEasyCount(2);
    setMediumCount(2);
    setHardCount(2);

    alert("Questions generated!");

  } catch (error) {

    console.error(error);

    alert(
      "Failed to generate questions."
    );

  }

};



  return (
    <>
      <Header />

      <div className="min-h-screen bg-slate-100 px-10 py-16">

        <div className="max-w-7xl mx-auto">

          <h1 className="text-5xl font-bold mb-3">
            Question Bank
          </h1>

          <p className="text-gray-600 text-lg mb-12">
            Manage approved questions and learning units.
          </p>

          

          {!selectedWeek && (

            <div className="grid md:grid-cols-2 gap-6">
              
              {weeks.map((week) => (

                <div
                  key={week.id}
                  onClick={() => setSelectedWeek(week)}
                  className="
                    bg-white
                    rounded-3xl
                    shadow-md
                    p-8
                    cursor-pointer
                    hover:shadow-xl
                    hover:-translate-y-1
                    transition-all
                  "
                >

                  <h2 className="text-2xl font-bold mb-2">
                    {week.title}
                  </h2>

                  <p className="text-gray-500">
                    {week.topics?.length || 0} Topics
                    </p>

                </div>

              ))}

            </div>

          )}

          {selectedWeek && !selectedTopic && (

            <div>

              <button
                onClick={() => setSelectedWeek(null)}
                className="
                  mb-6
                  border
                  border-slate-300
                  px-4
                  py-2
                  rounded-xl
                "
              >
                ← Back to Weeks
              </button>

              <div className="bg-white rounded-3xl shadow-md p-8">

                <h2 className="text-3xl font-bold mb-6">
                  {selectedWeek.title}
                </h2>

                <div className="space-y-4">

                  {selectedWeek.topics.map((topic, index) => (

                    <div
                      key={index}
                      onClick={() => setSelectedTopic(topic)}
                      className="
                        bg-slate-100
                        rounded-2xl
                        p-5
                        cursor-pointer
                        hover:bg-slate-200
                        transition-all
                      "
                    >

                      <h3 className="font-semibold text-lg">
                        {topic}
                      </h3>

                    </div>

                  ))}

                </div>

              </div>

            </div>

          )}

          {selectedWeek && selectedTopic && (

  <div>

    <button
      onClick={() => setSelectedTopic(null)}
      className="
        mb-6
        border
        border-slate-300
        px-4
        py-2
        rounded-xl
      "
    >
      ← Back to Topics
    </button>

    <div className="bg-white rounded-3xl shadow-md p-8">

      <div className="flex justify-between items-center mb-8">

        <div>

          <h2 className="text-3xl font-bold mb-2">
            {selectedTopic}
          </h2>

          <p className="text-gray-500">
            Total Questions: {totalQuestions}
          </p>

        </div>

        <button
          onClick={() => setShowGenerateModal(true)}
          className="
            bg-slate-900
            text-white
            px-5
            py-3
            rounded-xl
          "
        >
          Generate More Questions
        </button>

      </div>

      <div className="grid md:grid-cols-4 gap-4 mb-8">

        <div className="bg-slate-100 rounded-2xl p-4">
          <p className="text-gray-500 text-sm">Easy</p>
          <p className="text-2xl font-bold">
            {easyQuestions.length}
          </p>
        </div>

        <div className="bg-slate-100 rounded-2xl p-4">
          <p className="text-gray-500 text-sm">Medium</p>
          <p className="text-2xl font-bold">
            {mediumQuestions.length}
          </p>
        </div>

        <div className="bg-slate-100 rounded-2xl p-4">
          <p className="text-gray-500 text-sm">Hard</p>
          <p className="text-2xl font-bold">
            {hardQuestions.length}
          </p>
        </div>

        <div className="bg-slate-100 rounded-2xl p-4">
          <p className="text-gray-500 text-sm">Total</p>
          <p className="text-2xl font-bold">
            {totalQuestions}
          </p>
        </div>

      </div>

      <details className="bg-slate-100 rounded-2xl p-5 mb-4">

        <summary className="cursor-pointer font-semibold text-lg">
          Easy Questions ({easyQuestions.length})
        </summary>

        <div className="mt-4 space-y-3">

          {easyQuestions.map((q, index) => (

            <div
              key={index}
              className="
                bg-white
                rounded-xl
                p-4
              "
            >

              <div className="flex justify-between items-start mb-2">

                <p className="font-semibold">
                  {q.question}
                </p>

                <div className="flex gap-3 ml-4">

                  <button
                    onClick={() =>
                      editQuestion(
                        "easy",
                        index
                      )
                    }
                    title="Edit Question"
                  >
                    ✏️
                  </button>

                  <button
                    onClick={() =>
                      deleteQuestion(
                        "easy",
                        index
                      )
                    }
                    title="Delete Question"
                  >
                    🗑️
                  </button>

                </div>

              </div>

              {q.options && (
                <div className="mb-3 ml-4 text-sm">

                  <p>A. {q.options.A}</p>
                  <p>B. {q.options.B}</p>
                  <p>C. {q.options.C}</p>
                  <p>D. {q.options.D}</p>
                  
                  </div>

)}


              <p className="text-sm mt-2">
                <strong>Answer:</strong> {q.answer}
              </p>

              <p className="text-sm mt-1">
                <strong>Explanation:</strong> {q.explanation}
              </p>

            </div>

          ))}

        </div>

      </details>

      <details className="bg-slate-100 rounded-2xl p-5 mb-4">

        <summary className="cursor-pointer font-semibold text-lg">
          Medium Questions ({mediumQuestions.length})
        </summary>

        <div className="mt-4 space-y-3">

          {mediumQuestions.map((q, index) => (

            <div
              key={index}
              className="
                bg-white
                rounded-xl
                p-4
              "
            >

              <div className="flex justify-between items-start mb-2">

                <p className="font-semibold">
                  {q.question}
                </p>

                <div className="flex gap-3 ml-4">

                  <button
                    onClick={() =>
                      editQuestion(
                        "medium",
                        index
                      )
                    }
                    title="Edit Question"
                  >
                    ✏️
                  </button>

                  <button
                    onClick={() =>
                      deleteQuestion(
                        "medium",
                        index
                      )
                    }
                    title="Delete Question"
                  >
                    🗑️
                  </button>

                </div>

              </div>

              {q.options && (
                <div className="mb-3 ml-4 text-sm">

                  <p>A. {q.options.A}</p>
                  <p>B. {q.options.B}</p>
                  <p>C. {q.options.C}</p>
                  <p>D. {q.options.D}</p>
                  
                  </div>

)}             


              <p className="text-sm mt-2">
                <strong>Answer:</strong> {q.answer}
              </p>

              <p className="text-sm mt-1">
                <strong>Explanation:</strong> {q.explanation}
              </p>

            </div>

          ))}

        </div>

      </details>

      <details className="bg-slate-100 rounded-2xl p-5">

        <summary className="cursor-pointer font-semibold text-lg">
          Hard Questions ({hardQuestions.length})
        </summary>

        <div className="mt-4 space-y-3">

          {hardQuestions.map((q, index) => (

            <div
              key={index}
              className="
                bg-white
                rounded-xl
                p-4
              "
            >

              <div className="flex justify-between items-start mb-2">

                <p className="font-semibold">
                  {q.question}
                </p>

                <div className="flex gap-3 ml-4">

                  <button
                    onClick={() =>
                      editQuestion(
                        "hard",
                        index
                      )
                    }
                    title="Edit Question"
                  >
                    ✏️
                  </button>

                  <button
                    onClick={() =>
                      deleteQuestion(
                        "hard",
                        index
                      )
                    }
                    title="Delete Question"
                  >
                    🗑️
                  </button>

                </div>

              </div>

              {q.options && (
                <div className="mb-3 ml-4 text-sm">

                  <p>A. {q.options.A}</p>
                  <p>B. {q.options.B}</p>
                  <p>C. {q.options.C}</p>
                  <p>D. {q.options.D}</p>
                  
                  </div>

)} 


              <p className="text-sm mt-2">
                <strong>Answer:</strong> {q.answer}
              </p>

              <p className="text-sm mt-1">
                <strong>Explanation:</strong> {q.explanation}
              </p>

            </div>

          ))}

        </div>

      </details>

    </div>

  </div>

)}

        </div>

      </div>

{showGenerateModal && (

  <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">

    <div className="bg-white rounded-3xl p-8 w-full max-w-lg">

      <h2 className="text-2xl font-bold mb-6">
        Generate Additional Questions
      </h2>

      <div className="space-y-6">

        <div className="flex justify-between items-center">

          <span className="font-medium">
            Easy Questions
          </span>

          <div className="flex items-center gap-3">

            <button
              onClick={() =>
                setEasyCount(
                  Math.max(0, easyCount - 1)
                )
              }
              className="px-3 py-1 border rounded"
            >
              -
            </button>

            <span>{easyCount}</span>

            <button
              onClick={() =>
                setEasyCount(easyCount + 1)
              }
              className="px-3 py-1 border rounded"
            >
              +
            </button>

          </div>

        </div>

        <div className="flex justify-between items-center">

          <span className="font-medium">
            Medium Questions
          </span>

          <div className="flex items-center gap-3">

            <button
              onClick={() =>
                setMediumCount(
                  Math.max(0, mediumCount - 1)
                )
              }
              className="px-3 py-1 border rounded"
            >
              -
            </button>

            <span>{mediumCount}</span>

            <button
              onClick={() =>
                setMediumCount(mediumCount + 1)
              }
              className="px-3 py-1 border rounded"
            >
              +
            </button>

          </div>

        </div>

        <div className="flex justify-between items-center">

          <span className="font-medium">
            Hard Questions
          </span>

          <div className="flex items-center gap-3">

            <button
              onClick={() =>
                setHardCount(
                  Math.max(0, hardCount - 1)
                )
              }
              className="px-3 py-1 border rounded"
            >
              -
            </button>

            <span>{hardCount}</span>

            <button
              onClick={() =>
                setHardCount(hardCount + 1)
              }
              className="px-3 py-1 border rounded"
            >
              +
            </button>

          </div>

        </div>

      </div>

      <div className="flex justify-end gap-3 mt-8">

        <button
          onClick={() => setShowGenerateModal(false)}
          className="
            border
            border-slate-300
            px-5
            py-2
            rounded-xl
          "
        >
          Cancel
        </button>

              <button
                onClick={generateMoreQuestions}
                className="
    bg-slate-900
    text-white
    px-5
    py-2
    rounded-xl
  "
              >
                Generate
              </button>

      </div>

    </div>

  </div>

)}

    </>
  );
}

export default QuestionBank;
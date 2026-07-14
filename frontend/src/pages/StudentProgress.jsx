import Header from "../components/Header";
import ReviewAttemptModal from "../components/ReviewAttemptModal";
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { db } from "../firebase";
import {
  doc,
  getDoc,
  collection,
  getDocs,
  query,
  where
} from "firebase/firestore";
import { useAuth } from "../context/AuthContext";
import {
  calculateModuleMastery,
  calculateWeekMastery,
  roundMastery,
  INITIAL_MASTERY
} from "../utils/adaptiveLearning";
import {
  toDate,
  sortAttemptsByDate,
  reconstructMasteryTimeline,
  calculateStreak,
  calculateDifficultyDistribution,
  calculateAccuracyByDifficulty,
  generateInsights,
  getTrendInfo
} from "../utils/progressAnalytics";
import { sortWeeks } from "../utils/classAnalytics";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  BarChart,
  Bar,
  Cell
} from "recharts";

// A simple radial progress ring, built from a plain SVG circle rather
// than a chart library component - this is the one visual on the page
// that isn't really "a chart", it's a gauge, so it's kept separate.
function CircularProgress({ percentage, size = 176, strokeWidth = 16 }) {

  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (percentage / 100) * circumference;

  return (
    <div className="relative" style={{ width: size, height: size }}>

      <svg width={size} height={size} className="-rotate-90">

        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="#e2e8f0"
          strokeWidth={strokeWidth}
          fill="none"
        />

        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="#0f172a"
          strokeWidth={strokeWidth}
          fill="none"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          className="transition-all duration-700"
        />

      </svg>

      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-4xl font-bold">{percentage}%</span>
      </div>

    </div>
  );

}

function StudentProgress() {

  const { user } = useAuth();

  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);

  const [masteryMap, setMasteryMap] = useState({});

  const [weeks, setWeeks] = useState([]);

  const [attempts, setAttempts] = useState([]);

  const [expandedWeek, setExpandedWeek] = useState(null);

  const [reviewingAttempt, setReviewingAttempt] = useState(null);

  useEffect(() => {

    loadProgress();

  }, []);

  const loadProgress = async () => {

    setLoading(true);

    try {

      const [userSnap, weeksSnap, attemptsSnap] = await Promise.all([
        getDoc(doc(db, "users", user.uid)),
        getDocs(collection(db, "questionBank")),
        getDocs(
          query(collection(db, "quizAttempts"), where("studentId", "==", user.uid))
        )
      ]);

      setMasteryMap(userSnap.exists() ? (userSnap.data().mastery || {}) : {});

      setWeeks(weeksSnap.docs.map((d) => ({ id: d.id, ...d.data() })));

      setAttempts(attemptsSnap.docs.map((d) => ({ id: d.id, ...d.data() })));

    } catch (error) {

      console.error("Failed to load progress data:", error);

    }

    setLoading(false);

  };

  if (loading) {
    return (
      <>
        <Header />
        <div className="min-h-screen bg-slate-100 flex items-center justify-center">
          <p className="text-gray-500 text-lg">Loading your progress...</p>
        </div>
      </>
    );
  }

  const sortedAttempts = sortAttemptsByDate(attempts);

  const hasHistory = sortedAttempts.length > 0;

  const timeline = reconstructMasteryTimeline(sortedAttempts);

  const moduleMastery = calculateModuleMastery(masteryMap);

  const streak = calculateStreak(sortedAttempts);

  const difficultyDistribution = calculateDifficultyDistribution(sortedAttempts);

  const accuracyByDifficulty = calculateAccuracyByDifficulty(sortedAttempts);

  const insights = generateInsights(masteryMap, timeline);

  const latestAttempt = sortedAttempts[sortedAttempts.length - 1];

  const previousModuleMastery =
    timeline.length >= 2 ? timeline[timeline.length - 2].moduleMastery : null;

  const moduleMasteryChange =
    previousModuleMastery !== null
      ? roundMastery(moduleMastery - previousModuleMastery)
      : null;

  const trendInfo = getTrendInfo(moduleMasteryChange);

  const sortedTopicsAsc = Object.entries(masteryMap).sort((a, b) => a[1] - b[1]);

  // Maps each topic name to the week it belongs to, so the Learning
  // Snapshot's "Current Focus" can link directly to that week's quiz.
  const topicToWeek = {};

  weeks.forEach((week) => {
    (week.topics || []).forEach((topic) => {
      topicToWeek[topic] = week;
    });
  });

  const recommendedWeek = topicToWeek[insights.weakestTopic];

  // Learning Focus: 5 weakest and 5 strongest topics only, matching the
  // same compact treatment used on Teacher Analytics. If a topic would
  // land in both lists (few topics overall), it's kept in "weakest"
  // and dropped from "strongest".
  const weakestTopics = sortedTopicsAsc.slice(0, 5);

  const strongestTopics = [...sortedTopicsAsc]
    .reverse()
    .filter(([topic]) => !weakestTopics.some(([wTopic]) => wTopic === topic))
    .slice(0, 5);

  const weeksWithMastery = sortWeeks(weeks).map((week) => ({
    ...week,
    mastery: calculateWeekMastery(masteryMap, week.topics || [])
  }));

  // Zipped with the timeline (same order, same length) so each history
  // row can show "overall mastery after this quiz" and the change from
  // the previous attempt without recalculating anything.
  const historyRows = sortedAttempts
    .map((attempt, index) => ({
      attempt,
      timelinePoint: timeline[index],
      previousMastery: index > 0 ? timeline[index - 1].moduleMastery : null
    }))
    .reverse();

  const difficultyChartData = [
    { name: "Easy", value: difficultyDistribution.easy },
    { name: "Medium", value: difficultyDistribution.medium },
    { name: "Hard", value: difficultyDistribution.hard }
  ];

  const accuracyChartData = [
    { name: "Easy", value: accuracyByDifficulty.easy },
    { name: "Medium", value: accuracyByDifficulty.medium },
    { name: "Hard", value: accuracyByDifficulty.hard }
  ];

  const timelineChartData = timeline.map((point) => ({
    attempt: `#${point.attemptNumber}`,
    mastery: Math.round(point.moduleMastery * 100)
  }));

  return (
    <>
      <Header />

      <div className="min-h-screen bg-slate-100 px-10 py-16">

        <div className="max-w-7xl mx-auto space-y-8">

          <div>

            <h1 className="text-5xl font-bold mb-3">
              My Progress
            </h1>

            <p className="text-gray-600 text-lg">
              See how the adaptive learning engine is tracking your understanding over time.
            </p>

          </div>

          {!hasHistory && (

            <div className="bg-white rounded-3xl shadow-md p-10 text-center">

              <h2 className="text-2xl font-semibold mb-3">
                No quizzes completed yet
              </h2>

              <p className="text-gray-500">
                Complete your first adaptive quiz from the dashboard to start building your learning profile.
              </p>

            </div>

          )}

          {hasHistory && (

            <>

              {/* LEARNING SNAPSHOT */}

              <div className="bg-white rounded-3xl shadow-md p-10">

                <h2 className="text-2xl font-semibold mb-8">
                  Learning Snapshot
                </h2>

                <div className="grid md:grid-cols-3 lg:grid-cols-5 gap-6">

                  <div>
                    <p className="text-gray-500 text-sm mb-1">Overall Mastery</p>
                    <p className="text-3xl font-bold">{Math.round(moduleMastery * 100)}%</p>
                  </div>

                  <div>
                    <p className="text-gray-500 text-sm mb-1">Last Quiz</p>
                    <p className="text-3xl font-bold">{latestAttempt.percentage}%</p>
                  </div>

                  <div>
                    <p className="text-gray-500 text-sm mb-1">Learning Trend</p>
                    <p className={`text-2xl font-bold ${trendInfo.colorClass}`}>{trendInfo.label}</p>
                  </div>

                  <div>
                    <p className="text-gray-500 text-sm mb-1">Strongest Topic</p>
                    <p className="text-lg font-bold">{insights.strongestTopic}</p>
                  </div>

                  <div>

                    <p className="text-gray-500 text-sm mb-1">Current Focus</p>

                    {recommendedWeek ? (

                      <>

                        <p className="text-sm font-bold text-black-600 mb-2">{insights.weakestTopic}</p>

                        <button
                          onClick={() => navigate("/student-quiz", { state: recommendedWeek })}
                          className="
                            bg-slate-900
                            text-white
                            text-sm
                            px-4
                            py-2
                            rounded-xl
                            hover:bg-slate-800
                            transition-colors
                          "
                        >
                          Start Recommended Quiz
                        </button>
                      </>

                    ) : (

                      <p className="text-lg font-bold">{insights.weakestTopic || "—"}</p>

                    )}

                  </div>

                </div>

              </div>

              {/* OVERALL MODULE MASTERY */}

              <div className="bg-white rounded-3xl shadow-md p-10">

                <div className="flex flex-col md:flex-row items-center gap-10">

                  <CircularProgress percentage={Math.round(moduleMastery * 100)} />

                  <div>

                    <h2 className="text-2xl font-semibold mb-2">
                      Overall Module Mastery
                    </h2>

                    <p className="text-gray-500 mb-4">
                      Averaged across every topic you've encountered so far.
                    </p>

                    {moduleMasteryChange !== null && (

                      <span
                        className={`
                          text-sm font-semibold px-3 py-1 rounded-full
                          ${moduleMasteryChange >= 0
                            ? "bg-green-100 text-green-700"
                            : "bg-red-100 text-red-700"
                          }
                        `}
                      >
                        {moduleMasteryChange >= 0 ? "↑" : "↓"}{" "}
                        {Math.abs(Math.round(moduleMasteryChange * 100))}% since previous attempt
                      </span>

                    )}

                  </div>

                </div>

              </div>

              {/* LEARNING PROGRESS OVER TIME */}

              <div className="bg-white rounded-3xl shadow-md p-10">

                <h2 className="text-2xl font-semibold mb-6">
                  Learning Progress Over Time
                </h2>

                <ResponsiveContainer width="100%" height={300}>

                  <LineChart data={timelineChartData}>

                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />

                    <XAxis dataKey="attempt" tick={{ fontSize: 12 }} />

                    <YAxis domain={[0, 100]} tickFormatter={(v) => `${v}%`} />

                    <Tooltip formatter={(value) => [`${value}%`, "Module Mastery"]} />

                    <Line
                      type="monotone"
                      dataKey="mastery"
                      stroke="#0f172a"
                      strokeWidth={3}
                      dot={{ r: 4 }}
                    />

                  </LineChart>

                </ResponsiveContainer>

              </div>

              {/* WEEKLY MASTERY */}

              <div className="bg-white rounded-3xl shadow-md p-10">

                <h2 className="text-2xl font-semibold mb-6">
                  Weekly Mastery
                </h2>

                <div className="grid md:grid-cols-2 gap-4">

                  {weeksWithMastery.map((week) => (

                    <div
                      key={week.id}
                      onClick={() =>
                        setExpandedWeek(expandedWeek === week.id ? null : week.id)
                      }
                      className="bg-slate-100 rounded-2xl p-6 cursor-pointer hover:bg-slate-200 transition-colors"
                    >

                      <div className="flex justify-between items-center mb-2">
                        <h3 className="text-lg font-semibold">{week.title}</h3>
                        <span className="text-lg font-bold">
                          {Math.round(week.mastery * 100)}%
                        </span>
                      </div>

                      <div className="w-full bg-slate-200 rounded-full h-2">
                        <div
                          className="bg-slate-900 h-2 rounded-full transition-all"
                          style={{ width: `${week.mastery * 100}%` }}
                        />
                      </div>

                      {expandedWeek === week.id && (

                        <div className="mt-4 space-y-2" onClick={(e) => e.stopPropagation()}>

                          {(week.topics || []).map((topic) => (

                            <div
                              key={topic}
                              className="bg-white rounded-xl px-4 py-2 flex justify-between text-sm"
                            >
                              <span>{topic}</span>
                              <span className="font-semibold">
                                {Math.round((masteryMap[topic] ?? INITIAL_MASTERY) * 100)}%
                              </span>
                            </div>

                          ))}

                        </div>

                      )}

                    </div>

                  ))}

                </div>

              </div>

              {/* LEARNING FOCUS */}

              <div className="bg-white rounded-3xl shadow-md p-10">

                <h2 className="text-2xl font-semibold mb-2">
                  Learning Focus
                </h2>

                <p className="text-gray-500 mb-6">
                  Your weakest topics are your natural revision focus - your strongest are already going well.
                </p>

                <div className="grid md:grid-cols-2 gap-8">

                  <div>

                    <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-4">
                      Weakest Topics
                    </h3>

                    <div className="space-y-4">

                      {weakestTopics.map(([topic, value]) => (

                        <div key={topic}>

                          <div className="flex justify-between mb-1">
                            <span className="font-medium">{topic}</span>
                            <span className="text-sm text-gray-500">
                              {Math.round(value * 100)}%
                            </span>
                          </div>

                          <div className="w-full bg-slate-200 rounded-full h-2">
                            <div
                              className="bg-red-500 h-2 rounded-full transition-all"
                              style={{ width: `${value * 100}%` }}
                            />
                          </div>

                        </div>

                      ))}

                    </div>

                  </div>

                  <div>

                    <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-4">
                      Strongest Topics
                    </h3>

                    <div className="space-y-4">

                      {strongestTopics.map(([topic, value]) => (

                        <div key={topic}>

                          <div className="flex justify-between mb-1">
                            <span className="font-medium">{topic}</span>
                            <span className="text-sm text-gray-500">
                              {Math.round(value * 100)}%
                            </span>
                          </div>

                          <div className="w-full bg-slate-200 rounded-full h-2">
                            <div
                              className="bg-green-500 h-2 rounded-full transition-all"
                              style={{ width: `${value * 100}%` }}
                            />
                          </div>

                        </div>

                      ))}

                    </div>

                  </div>

                </div>

              </div>

              {/* DIFFICULTY DISTRIBUTION + ACCURACY BY DIFFICULTY */}

              <div className="grid md:grid-cols-2 gap-8">

                <div className="bg-white rounded-3xl shadow-md p-10">

                  <h2 className="text-2xl font-semibold mb-2">
                    Difficulty Distribution
                  </h2>

                  <p className="text-gray-500 mb-6 text-sm">
                    Share of questions at each difficulty across every quiz.
                  </p>

                  <ResponsiveContainer width="100%" height={220}>

                    <BarChart data={difficultyChartData}>

                      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />

                      <XAxis dataKey="name" />

                      <YAxis domain={[0, 100]} tickFormatter={(v) => `${v}%`} />

                      <Tooltip formatter={(value) => [`${value}%`, "Share of Questions"]} />

                      <Bar dataKey="value" radius={[8, 8, 0, 0]}>
                        <Cell fill="#16a34a" />
                        <Cell fill="#ca8a04" />
                        <Cell fill="#dc2626" />
                      </Bar>

                    </BarChart>

                  </ResponsiveContainer>

                </div>

                <div className="bg-white rounded-3xl shadow-md p-10">

                  <h2 className="text-2xl font-semibold mb-2">
                    Accuracy by Difficulty
                  </h2>

                  <p className="text-gray-500 mb-6 text-sm">
                    Average mark at each difficulty tier, across every quiz.
                  </p>

                  <ResponsiveContainer width="100%" height={220}>

                    <BarChart data={accuracyChartData}>

                      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />

                      <XAxis dataKey="name" />

                      <YAxis domain={[0, 100]} tickFormatter={(v) => `${v}%`} />

                      <Tooltip formatter={(value) => [`${value}%`, "Average Mark"]} />

                      <Bar dataKey="value" radius={[8, 8, 0, 0]}>
                        <Cell fill="#16a34a" />
                        <Cell fill="#ca8a04" />
                        <Cell fill="#dc2626" />
                      </Bar>

                    </BarChart>

                  </ResponsiveContainer>

                </div>

              </div>

              {/* LEARNING INSIGHTS */}

              <div className="bg-white rounded-3xl shadow-md p-10">

                <h2 className="text-2xl font-semibold mb-6">
                  Learning Insights
                </h2>

                <div className="grid md:grid-cols-3 gap-4 mb-6">

                  <div className="bg-slate-100 rounded-2xl p-6">
                    <p className="text-gray-500 text-sm mb-1">Strongest Topic</p>
                    <p className="text-xl font-bold">{insights.strongestTopic}</p>
                  </div>

                  <div className="bg-slate-100 rounded-2xl p-6">
                    <p className="text-gray-500 text-sm mb-1">Weakest Topic</p>
                    <p className="text-xl font-bold">{insights.weakestTopic}</p>
                  </div>

                  <div className="bg-slate-100 rounded-2xl p-6">
                    <p className="text-gray-500 text-sm mb-1">Most Improved</p>
                    <p className="text-xl font-bold">
                      {insights.mostImprovedTopic || "Not enough data yet"}
                    </p>
                  </div>

                </div>

                <div className="bg-slate-100 rounded-2xl p-6">
                  <p className="text-gray-500 text-sm mb-1">Recommendation</p>
                  <p className="text-gray-700">{insights.recommendation}</p>
                </div>

              </div>

              {/* STREAK + TIME SPENT */}

              <div className="grid md:grid-cols-2 gap-8">

                <div className="bg-white rounded-3xl shadow-md p-10">

                  <h2 className="text-2xl font-semibold mb-6">
                    Learning Streak
                  </h2>

                  <div className="grid grid-cols-2 gap-6">

                    <div className="bg-slate-100 rounded-2xl p-6 text-center">
                      <p className="text-gray-500 mb-2">Current Streak</p>
                      <p className="text-4xl font-bold">{streak.current}</p>
                    </div>

                    <div className="bg-slate-100 rounded-2xl p-6 text-center">
                      <p className="text-gray-500 mb-2">Longest Streak</p>
                      <p className="text-4xl font-bold">{streak.longest}</p>
                    </div>

                  </div>

                </div>

                <div className="bg-white rounded-3xl shadow-md p-10">

                  <h2 className="text-2xl font-semibold mb-6">
                    Time Spent Learning
                  </h2>

                  <div className="grid grid-cols-2 gap-6 mb-3">

                    <div className="bg-slate-100 rounded-2xl p-6 text-center">
                      <p className="text-gray-500 mb-2">Total Time</p>
                      <p className="text-2xl font-bold text-gray-400">Not yet available</p>
                    </div>

                    <div className="bg-slate-100 rounded-2xl p-6 text-center">
                      <p className="text-gray-500 mb-2">Avg. Quiz Duration</p>
                      <p className="text-2xl font-bold text-gray-400">Not yet available</p>
                    </div>

                  </div>

                  <p className="text-xs text-gray-400">
                    Quiz start times aren't recorded yet - this will populate once that's added.
                  </p>

                </div>

              </div>

              {/* QUIZ HISTORY */}

              <div className="bg-white rounded-3xl shadow-md p-10">

                <h2 className="text-2xl font-semibold mb-6">
                  Quiz History
                </h2>

                <div className="space-y-4">

                  {historyRows.map(({ attempt, timelinePoint, previousMastery }) => {

                    const masteryChange =
                      previousMastery !== null
                        ? roundMastery(timelinePoint.moduleMastery - previousMastery)
                        : null;

                    const attemptDate = toDate(attempt.date);

                    return (

                      <div
                        key={attempt.id}
                        className="bg-slate-100 rounded-2xl p-6 flex flex-wrap items-center justify-between gap-4"
                      >

                        <div>

                          <h3 className="text-lg font-semibold">{attempt.weekTitle}</h3>

                          <p className="text-sm text-gray-500">
                            {attemptDate ? attemptDate.toLocaleDateString() : "—"}
                          </p>

                        </div>

                        <div className="flex flex-wrap gap-6 items-center">

                          <div className="text-center">
                            <p className="text-xs text-gray-500">Score</p>
                            <p className="font-semibold">
                              {attempt.correctCount} / {attempt.totalQuestions}
                            </p>
                          </div>

                          <div className="text-center">
                            <p className="text-xs text-gray-500">Percentage</p>
                            <p className="font-semibold">{attempt.percentage}%</p>
                          </div>

                          <div className="text-center">
                            <p className="text-xs text-gray-500">Mastery After</p>
                            <p className="font-semibold">
                              {Math.round(timelinePoint.moduleMastery * 100)}%
                            </p>
                          </div>

                          <div className="text-center">
                            <p className="text-xs text-gray-500">Mastery Change</p>
                            <p className={`font-semibold ${
                              masteryChange === null
                                ? "text-gray-400"
                                : masteryChange >= 0
                                ? "text-green-600"
                                : "text-red-600"
                            }`}>
                              {masteryChange === null
                                ? "First attempt"
                                : `${masteryChange >= 0 ? "+" : ""}${Math.round(masteryChange * 100)}%`}
                            </p>
                          </div>

                          <button
                            onClick={() => setReviewingAttempt(attempt)}
                            className="border border-slate-300 px-4 py-2 rounded-xl hover:bg-white"
                          >
                            Review
                          </button>

                        </div>

                      </div>

                    );

                  })}

                </div>

              </div>

            </>

          )}

        </div>

      </div>

      {reviewingAttempt && (
        <ReviewAttemptModal
          attempt={reviewingAttempt}
          onClose={() => setReviewingAttempt(null)}
        />
      )}

    </>
  );

}

export default StudentProgress;
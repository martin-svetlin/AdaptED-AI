import Header from "../components/Header";
import StudentDetailModal from "../components/StudentDetailModal";
import { useState, useEffect } from "react";
import { db } from "../firebase";
import { collection, getDocs, query, where } from "firebase/firestore";
import {
  calculateStudentOverview,
  calculateClassSnapshot,
  calculateClassPerformanceOverTime,
  calculateTopicPerformance,
  calculateWeekPerformance,
  identifyStudentsRequiringAttention,
  calculateHeatmapData,
  generateTeacherInsights,
  sortWeeks
} from "../utils/classAnalytics";
import {
  calculateDifficultyDistribution,
  calculateAccuracyByDifficulty,
  getTrendInfo
} from "../utils/progressAnalytics";
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

function heatmapColor(mastery) {

  if (mastery === null) return "bg-slate-100 text-gray-400";

  if (mastery >= 0.7) return "bg-green-500 text-white";

  if (mastery >= 0.4) return "bg-yellow-400 text-white";

  return "bg-red-500 text-white";

}

function TeacherAnalytics() {

  const [loading, setLoading] = useState(true);

  const [students, setStudents] = useState([]);

  const [weeks, setWeeks] = useState([]);

  const [attempts, setAttempts] = useState([]);

  const [expandedWeek, setExpandedWeek] = useState(null);

  const [selectedStudent, setSelectedStudent] = useState(null);

  useEffect(() => {

    loadClassData();

  }, []);

  const loadClassData = async () => {

    setLoading(true);

    try {

      const [studentsSnap, weeksSnap, attemptsSnap] = await Promise.all([
        getDocs(query(collection(db, "users"), where("role", "==", "student"))),
        getDocs(collection(db, "questionBank")),
        getDocs(collection(db, "quizAttempts"))
      ]);

      setStudents(studentsSnap.docs.map((d) => ({ id: d.id, ...d.data() })));

      setWeeks(weeksSnap.docs.map((d) => ({ id: d.id, ...d.data() })));

      setAttempts(attemptsSnap.docs.map((d) => ({ id: d.id, ...d.data() })));

    } catch (error) {

      console.error("Failed to load class analytics data:", error);

    }

    setLoading(false);

  };

  if (loading) {
    return (
      <>
        <Header />
        <div className="min-h-screen bg-slate-100 flex items-center justify-center">
          <p className="text-gray-500 text-lg">Loading class analytics...</p>
        </div>
      </>
    );
  }

  const hasStudents = students.length > 0;
  const hasAttempts = attempts.length > 0;

  // Group attempts by student once, reused by both the overview rollup
  // and the class-wide timeline it's built from.
  const attemptsByStudentId = {};

  attempts.forEach((attempt) => {
    if (!attemptsByStudentId[attempt.studentId]) {
      attemptsByStudentId[attempt.studentId] = [];
    }
    attemptsByStudentId[attempt.studentId].push(attempt);
  });

  const studentOverview = calculateStudentOverview(students, attemptsByStudentId);

  const attentionList = identifyStudentsRequiringAttention(studentOverview);

  const classSnapshot = calculateClassSnapshot(students, attempts, studentOverview, attentionList);

  const classPerformanceOverTime = calculateClassPerformanceOverTime(studentOverview);

  const topicPerformance = calculateTopicPerformance(students, attempts);

  // Learning Focus: the 5 weakest and 5 strongest topics only, rather
  // than every topic - keeps this readable as the module grows. If a
  // topic would otherwise appear in both lists (few topics overall),
  // it's kept in "weakest" and dropped from "strongest".
  const weakestTopics = topicPerformance.slice(0, 5);

  const strongestTopics = [...topicPerformance]
    .reverse()
    .filter((topic) => !weakestTopics.some((w) => w.topic === topic.topic))
    .slice(0, 5);

  const sortedWeeks = sortWeeks(weeks);

  const weekPerformance = calculateWeekPerformance(sortedWeeks, students, attempts);

  const difficultyDistribution = calculateDifficultyDistribution(attempts);

  const accuracyByDifficulty = calculateAccuracyByDifficulty(attempts);

  const heatmapData = calculateHeatmapData(sortedWeeks, students);

  const teacherInsights = generateTeacherInsights({
    topicPerformance,
    weekPerformance,
    classPerformanceOverTime,
    students
  });

  const timelineChartData = classPerformanceOverTime.map((point) => ({
    attempt: `#${point.attemptNumber}`,
    mastery: Math.round(point.averageMastery * 100)
  }));

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

  const statusStyles = {
    Excellent: "bg-green-100 text-green-700",
    Good: "bg-yellow-100 text-yellow-700",
    "Needs Attention": "bg-red-100 text-red-700"
  };

  return (
    <>
      <Header />

      <div className="min-h-screen bg-slate-100 px-10 py-16">

        <div className="max-w-7xl mx-auto space-y-8">

          <div>

            <h1 className="text-5xl font-bold mb-3">
              Teacher Analytics
            </h1>

            <p className="text-gray-600 text-lg">
              See how your class is learning, which topics need attention, and who needs support.
            </p>

          </div>

          {!hasStudents && (

            <div className="bg-white rounded-3xl shadow-md p-10 text-center">

              <h2 className="text-2xl font-semibold mb-3">No students registered yet</h2>

              <p className="text-gray-500">
                Once students register and complete quizzes, class analytics will appear here.
              </p>

            </div>

          )}

          {hasStudents && (

            <>

              {/* CLASS OVERVIEW */}

              <div className="bg-white rounded-3xl shadow-md p-10">

                <h2 className="text-2xl font-semibold mb-8">Class Overview</h2>

                <div className="grid md:grid-cols-3 lg:grid-cols-6 gap-6">

                  <div>
                    <p className="text-gray-500 text-sm mb-1">Students</p>
                    <p className="text-3xl font-bold">{classSnapshot.studentCount}</p>
                  </div>

                  <div>
                    <p className="text-gray-500 text-sm mb-1">Avg. Module Mastery</p>
                    <p className="text-3xl font-bold">
                      {Math.round(classSnapshot.avgModuleMastery * 100)}%
                    </p>
                  </div>

                  <div>
                    <p className="text-gray-500 text-sm mb-1">Avg. Quiz Score</p>
                    <p className="text-3xl font-bold">{classSnapshot.avgQuizScore}%</p>
                  </div>

                  <div>
                    <p className="text-gray-500 text-sm mb-1">Avg. Completion Rate</p>
                    <p className="text-3xl font-bold">{classSnapshot.avgCompletionRate}%</p>
                  </div>

                  <div>
                    <p className="text-gray-500 text-sm mb-1">Needs Attention</p>
                    <p className="text-3xl font-bold text-red-600">
                      {classSnapshot.studentsRequiringAttention}
                    </p>
                  </div>

                  <div>
                    <p className="text-gray-500 text-sm mb-1">Avg. Weekly Improvement</p>
                    <p className={`text-2xl font-bold ${getTrendInfo(classSnapshot.avgWeeklyImprovement).colorClass}`}>
                      {classSnapshot.avgWeeklyImprovement === null
                        ? "—"
                        : `${classSnapshot.avgWeeklyImprovement >= 0 ? "+" : ""}${Math.round(classSnapshot.avgWeeklyImprovement * 100)}%`}
                    </p>
                  </div>

                </div>

              </div>

              {!hasAttempts && (

                <div className="bg-white rounded-3xl shadow-md p-10 text-center">

                  <h2 className="text-xl font-semibold mb-2">No quiz attempts yet</h2>

                  <p className="text-gray-500">
                    Charts and insights below will populate once students start completing quizzes.
                  </p>

                </div>

              )}

              {hasAttempts && (

                <>

                  {/* CLASS PERFORMANCE OVER TIME */}

                  <div className="bg-white rounded-3xl shadow-md p-10">

                    <h2 className="text-2xl font-semibold mb-2">Class Performance Over Time</h2>

                    <p className="text-gray-500 mb-6 text-sm">
                      Average mastery at each student's Nth quiz attempt.
                    </p>

                    <ResponsiveContainer width="100%" height={300}>

                      <LineChart data={timelineChartData}>

                        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />

                        <XAxis dataKey="attempt" tick={{ fontSize: 12 }} />

                        <YAxis domain={[0, 100]} tickFormatter={(v) => `${v}%`} />

                        <Tooltip formatter={(value) => [`${value}%`, "Average Mastery"]} />

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

                  {/* LEARNING FOCUS */}

                  <div className="bg-white rounded-3xl shadow-md p-10">

                    <h2 className="text-2xl font-semibold mb-2">Learning Focus</h2>

                    <p className="text-gray-500 mb-6">
                      The topics most worth attention, and the ones already going well.
                    </p>

                    <div className="grid md:grid-cols-2 gap-8">

                      <div>

                        <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-4">
                          Weakest Topics
                        </h3>

                        <div className="space-y-4">

                          {weakestTopics.map((topic) => (

                            <div key={topic.topic}>

                              <div className="flex justify-between mb-1">
                                <span className="font-medium">{topic.topic}</span>
                                <span className="text-sm text-gray-500">
                                  {Math.round(topic.averageMastery * 100)}% mastery ·{" "}
                                  {topic.averageAccuracy}% accuracy
                                </span>
                              </div>

                              <div className="w-full bg-slate-200 rounded-full h-2">
                                <div
                                  className="bg-red-500 h-2 rounded-full"
                                  style={{ width: `${topic.averageMastery * 100}%` }}
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

                          {strongestTopics.map((topic) => (

                            <div key={topic.topic}>

                              <div className="flex justify-between mb-1">
                                <span className="font-medium">{topic.topic}</span>
                                <span className="text-sm text-gray-500">
                                  {Math.round(topic.averageMastery * 100)}% mastery ·{" "}
                                  {topic.averageAccuracy}% accuracy
                                </span>
                              </div>

                              <div className="w-full bg-slate-200 rounded-full h-2">
                                <div
                                  className="bg-green-500 h-2 rounded-full"
                                  style={{ width: `${topic.averageMastery * 100}%` }}
                                />
                              </div>

                            </div>

                          ))}

                        </div>

                      </div>

                    </div>

                  </div>

                  {/* WEEK PERFORMANCE */}

                  <div className="bg-white rounded-3xl shadow-md p-10">

                    <h2 className="text-2xl font-semibold mb-6">Week Performance</h2>

                    <div className="grid md:grid-cols-2 gap-4">

                      {weekPerformance.map((week) => (

                        <div
                          key={week.weekId}
                          onClick={() =>
                            setExpandedWeek(expandedWeek === week.weekId ? null : week.weekId)
                          }
                          className="bg-slate-100 rounded-2xl p-6 cursor-pointer hover:bg-slate-200 transition-colors"
                        >

                          <div className="flex justify-between items-center mb-2">
                            <h3 className="text-lg font-semibold">{week.weekTitle}</h3>
                            <div className="text-right">
                              <p className="text-xs text-gray-500">Avg. Mastery</p>
                              <span className="text-lg font-bold">
                                {Math.round(week.avgWeekMastery * 100)}%
                              </span>
                            </div>
                          </div>

                          <div className="w-full bg-slate-200 rounded-full h-2 mb-3">
                            <div
                              className="bg-slate-900 h-2 rounded-full"
                              style={{ width: `${week.avgWeekMastery * 100}%` }}
                            />
                          </div>

                          <div className="flex justify-between text-sm text-gray-500">
                            <span>Avg. Score: {week.avgScore}%</span>
                            <span>Completion: {week.completionRate}%</span>
                          </div>

                          {expandedWeek === week.weekId && (

                            <div className="mt-4 space-y-2" onClick={(e) => e.stopPropagation()}>

                              {week.topics.map((topic) => {

                                const topicStats = topicPerformance.find((t) => t.topic === topic);

                                return (
                                  <div
                                    key={topic}
                                    className="bg-white rounded-xl px-4 py-2 flex justify-between text-sm"
                                  >
                                    <span>{topic}</span>
                                    <span className="font-semibold">
                                      {topicStats ? Math.round(topicStats.averageMastery * 100) : 0}%
                                    </span>
                                  </div>
                                );

                              })}

                            </div>

                          )}

                        </div>

                      ))}

                    </div>

                  </div>

                

                  {/* CLASS HEATMAP */}

                  <div className="bg-white rounded-3xl shadow-md p-10 overflow-x-auto">

                    <h2 className="text-2xl font-semibold mb-2">Class Heatmap</h2>

                    <p className="text-gray-500 mb-6 text-sm">
                      Average mastery per topic, per week, across the class.
                    </p>

                    <div className="min-w-[600px]">

                      {heatmapData.map((week) => (

                        <div key={week.weekId} className="mb-4">

                          <p className="font-semibold mb-2">{week.weekTitle}</p>

                          <div className="flex gap-2 flex-wrap">

                            {week.topics.map((topicCell) => (

                              <div
                                key={topicCell.topic}
                                className={`rounded-xl px-4 py-3 text-sm font-medium ${heatmapColor(topicCell.mastery)}`}
                                title={topicCell.topic}
                              >
                                <p className="text-xs opacity-90 mb-1">{topicCell.topic}</p>
                                <p className="font-bold">
                                  {topicCell.mastery === null
                                    ? "No data"
                                    : `${Math.round(topicCell.mastery * 100)}%`}
                                </p>
                              </div>

                            ))}

                          </div>

                        </div>

                      ))}

                    </div>

                  </div>


                </>

              )}

              {/* STUDENT OVERVIEW */}

              <div className="bg-white rounded-3xl shadow-md p-10">

                <h2 className="text-2xl font-semibold mb-2">Student Overview</h2>

                <p className="text-gray-500 mb-6">
                  Sorted weakest mastery first. Click a student for their full profile.
                </p>

                <div className="space-y-3">

                  {studentOverview.map((student) => (

                    <div
                      key={student.studentId}
                      onClick={() => setSelectedStudent(student)}
                      className="bg-slate-100 rounded-2xl p-6 flex flex-wrap items-center justify-between gap-4 cursor-pointer hover:bg-slate-200 transition-colors"
                    >

                      <div>
                        <h3 className="font-semibold">{student.username}</h3>
                        <p className="text-xs text-gray-500">
                          Last active:{" "}
                          {student.lastActiveDate
                            ? student.lastActiveDate.toLocaleDateString()
                            : "Never"}
                        </p>
                      </div>

                      <div className="flex flex-wrap gap-6 items-center">

                        <div className="text-center">
                          <p className="text-xs text-gray-500">Overall Mastery</p>
                          <p className="font-semibold">{Math.round(student.moduleMastery * 100)}%</p>
                        </div>

                        <div className="text-center">
                          <p className="text-xs text-gray-500">Last Quiz</p>
                          <p className="font-semibold">
                            {student.lastQuizScore !== null ? `${student.lastQuizScore}%` : "—"}
                          </p>
                        </div>

                        <div className="text-center">
                          <p className="text-xs text-gray-500">Trend</p>
                          <p className="font-semibold">
                            {student.trend === null
                              ? "—"
                              : `${student.trend >= 0 ? "+" : ""}${Math.round(student.trend * 100)}%`}
                          </p>
                        </div>

                        <span
                          className={`text-sm font-semibold px-3 py-1 rounded-full ${statusStyles[student.status]}`}
                        >
                          {student.status}
                        </span>

                      </div>

                    </div>

                  ))}

                </div>

              </div>

            </>

          )}

        </div>

      </div>

      {selectedStudent && (
        <StudentDetailModal
          student={selectedStudent}
          onClose={() => setSelectedStudent(null)}
        />
      )}

    </>
  );

}

export default TeacherAnalytics;
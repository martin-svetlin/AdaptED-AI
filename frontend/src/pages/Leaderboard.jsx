import Header from "../components/Header";
import { useState, useEffect } from "react";
import { db } from "../firebase";
import { collection, getDocs, query, where } from "firebase/firestore";
import { useAuth } from "../context/AuthContext";
import {
  calculateStudentOverview,
  calculateLeaderboard,
  sortWeeks
} from "../utils/classAnalytics";
import { calculateWeekMastery } from "../utils/adaptiveLearning";
import { getTrendInfo } from "../utils/progressAnalytics";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Cell,
  ReferenceLine,
  LabelList
} from "recharts";

const MEDAL_EMOJI = { 1: "🥇", 2: "🥈", 3: "🥉" };

function Leaderboard() {

  const { user } = useAuth();

  const [loading, setLoading] = useState(true);

  const [students, setStudents] = useState([]);

  const [weeks, setWeeks] = useState([]);

  const [attempts, setAttempts] = useState([]);

  const [expandedStudentId, setExpandedStudentId] = useState(null);

  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {

    loadData();

  }, []);

  const loadData = async () => {

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

      console.error("Failed to load leaderboard data:", error);

    }

    setLoading(false);

  };

  if (loading) {
    return (
      <>
        <Header />
        <div className="min-h-screen bg-slate-100 flex items-center justify-center">
          <p className="text-gray-500 text-lg">Loading leaderboard...</p>
        </div>
      </>
    );
  }

  const attemptsByStudentId = {};

  attempts.forEach((attempt) => {
    if (!attemptsByStudentId[attempt.studentId]) {
      attemptsByStudentId[attempt.studentId] = [];
    }
    attemptsByStudentId[attempt.studentId].push(attempt);
  });

  const studentOverview = calculateStudentOverview(students, attemptsByStudentId);

  const leaderboard = calculateLeaderboard(studentOverview);

  const sortedWeeksList = sortWeeks(weeks);

  const hasStudents = leaderboard.length > 0;

  const topThree = leaderboard.slice(0, 3);

  // Classic podium order: 2nd, 1st, 3rd - only when there are enough
  // students to make that arrangement meaningful.
  const podiumOrder = topThree.length === 3 ? [topThree[1], topThree[0], topThree[2]] : topThree;

  // Chart data for every student, ranked - grows with the class, so
  // it's wrapped in a scrollable container rather than squeezing bars
  // as more students are added.
  const chartData = leaderboard.map((student) => ({
    name: student.username,
    mastery: Math.round(student.moduleMastery * 100),
    isSelf: student.studentId === user.uid
  }));

  const classAverageMastery =
    leaderboard.length > 0
      ? Math.round(
          (leaderboard.reduce((sum, s) => sum + s.moduleMastery, 0) / leaderboard.length) * 100
        )
      : 0;

  // Vertical layout: width grows with the class instead of height, so
  // bars stay a readable, consistent thickness regardless of roster
  // size - the chart scrolls horizontally rather than squeezing bars.
  const chartWidth = Math.max(600, leaderboard.length * 70);

  // A muted, professional palette that cycles per student for subtle
  // variation - deliberately not bright/rainbow, since this should
  // read as a dashboard rather than a game.
  const BAR_PALETTE = ["#334155", "#475569", "#64748b", "#7c8fa8", "#5b7c99", "#8398b0"];

  const selfEntry = leaderboard.find((s) => s.studentId === user.uid);

  const selfInTopThree = topThree.some((s) => s.studentId === user.uid);

  const filteredLeaderboard = leaderboard.filter((student) =>
    student.username.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const renderMovement = (movement) => {

    if (movement === null) {
      return <span className="text-gray-400">New</span>;
    }

    if (movement > 0) {
      return <span className="text-green-600 font-semibold">↑{movement}</span>;
    }

    if (movement < 0) {
      return <span className="text-red-600 font-semibold">↓{Math.abs(movement)}</span>;
    }

    return <span className="text-gray-400">–</span>;

  };

  return (
    <>
      <Header />

      <div className="min-h-screen bg-slate-100 px-10 py-16">

        <div className="max-w-6xl mx-auto space-y-8">

          <div>

            <h1 className="text-5xl font-bold mb-3">
              Leaderboard
            </h1>

            <p className="text-gray-600 text-lg">
              Ranked by Overall Module Mastery - the clearest measure of long-term progress.
            </p>

          </div>

          {!hasStudents && (

            <div className="bg-white rounded-3xl shadow-md p-10 text-center">

              <h2 className="text-2xl font-semibold mb-3">No rankings yet</h2>

              <p className="text-gray-500">
                Complete an adaptive quiz to appear on the leaderboard.
              </p>

            </div>

          )}

          {hasStudents && (

            <>

              {/* TOP 3 PODIUM */}

              <div className="grid md:grid-cols-3 gap-6 items-end">

                {podiumOrder.map((student) => {

                  const isSelf = student.studentId === user.uid;

                  const isFirst = student.rank === 1;

                  return (

                    <div
                      key={student.studentId}
                      className={`
                        bg-white rounded-3xl shadow-md p-8 text-center transition-all

                        ${isFirst ? "md:scale-105 shadow-lg border-2 border-yellow-400" : ""}
                        ${isSelf ? "ring-2 ring-slate-900" : ""}
                      `}
                    >

                      <div className="text-5xl mb-3">{MEDAL_EMOJI[student.rank]}</div>

                      <h3 className="text-xl font-bold mb-1 flex items-center justify-center gap-2">
                        {student.username}
                        {isSelf && (
                          <span className="text-xs bg-slate-900 text-white px-2 py-0.5 rounded-full">
                            You
                          </span>
                        )}
                        {student.moduleMastery >= 0.9 && <span title="90%+ mastery">⭐</span>}
                      </h3>

                      <p className="text-3xl font-bold mb-1">
                        {Math.round(student.moduleMastery * 100)}%
                      </p>

                      <p className="text-sm text-gray-500">Overall Mastery</p>

                    </div>

                  );

                })}

              </div>

              {/* YOUR RANK (when not already visible in the podium) */}

              {selfEntry && !selfInTopThree && (

                <div className="bg-slate-900 text-white rounded-2xl p-6 flex items-center justify-between flex-wrap gap-4">

                  <div>
                    <p className="text-slate-300 text-sm">Your Rank</p>
                    <p className="text-2xl font-bold">
                      #{selfEntry.rank} of {leaderboard.length}
                    </p>
                  </div>

                  <div className="text-right">
                    <p className="text-slate-300 text-sm">Overall Mastery</p>
                    <p className="text-2xl font-bold">
                      {Math.round(selfEntry.moduleMastery * 100)}%
                    </p>
                  </div>

                </div>

              )}

              {/* CLASS RANKINGS CHART */}

              <div className="bg-white rounded-3xl shadow-md p-10">

                <h2 className="text-2xl font-semibold mb-2">Class Rankings</h2>

                <p className="text-gray-500 mb-6 text-sm">
                  Overall Module Mastery for every student, with the class average for context.
                </p>

                <div className="overflow-x-auto">

                  <div style={{ width: "100%", minWidth: chartWidth }}>

                    <ResponsiveContainer width="100%" height={380}>

                      <BarChart data={chartData} margin={{ top: 36, right: 20, left: 0, bottom: 40 }}>

                        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />

                        <XAxis
                          dataKey="name"
                          interval={0}
                          angle={-40}
                          textAnchor="end"
                          height={60}
                          tick={{ fontSize: 11 }}
                        />

                        <YAxis domain={[0, 100]} tickFormatter={(v) => `${v}%`} />

                        <Tooltip formatter={(value) => [`${value}%`, "Overall Mastery"]} />

                        <ReferenceLine
                          y={classAverageMastery}
                          stroke="#94a3b8"
                          strokeDasharray="4 4"
                          label={{
                            value: `Class Avg ${classAverageMastery}%`,
                            position: "right",
                            fill: "#64748b",
                            fontSize: 11
                          }}
                        />

                        <Bar dataKey="mastery" radius={[8, 8, 0, 0]}>

                          <LabelList
                            dataKey="mastery"
                            position="top"
                            formatter={(v) => `${v}%`}
                            style={{ fontSize: 11, fontWeight: 600, fill: "#334155" }}
                          />

                          {chartData.map((entry, index) => (
                            <Cell
                              key={index}
                              fill={entry.isSelf ? "#fb923c" : BAR_PALETTE[index % BAR_PALETTE.length]}
                              stroke={entry.isSelf ? "#c2410c" : "none"}
                              strokeWidth={entry.isSelf ? 2 : 0}
                            />
                          ))}

                        </Bar>

                      </BarChart>

                    </ResponsiveContainer>

                  </div>

                </div>

              </div>

              {/* FULL LEADERBOARD */}

              <div className="bg-white rounded-3xl shadow-md p-10">

                <div className="flex flex-wrap items-center justify-between gap-4 mb-6">

                  <h2 className="text-2xl font-semibold">Full Leaderboard</h2>

                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search students..."
                    className="
                      border-2
                      border-slate-300
                      rounded-xl
                      px-4
                      py-2
                      text-sm
                      w-full
                      sm:w-64
                      focus:outline-none
                      focus:border-slate-900
                    "
                  />

                </div>

                {filteredLeaderboard.length === 0 && (
                  <p className="text-sm text-gray-400 text-center py-6">
                    No students match your search.
                  </p>
                )}

                <div className="space-y-3">

                  {filteredLeaderboard.map((student) => {

                    const isExpanded = expandedStudentId === student.studentId;

                    const isSelf = student.studentId === user.uid;

                    const trendInfo = getTrendInfo(student.trend);

                    const latestTopicMastery =
                      student.timeline.length > 0
                        ? student.timeline[student.timeline.length - 1].topicMastery
                        : {};

                    const topicsAsc = Object.entries(latestTopicMastery).sort(
                      (a, b) => a[1] - b[1]
                    );

                    const weakestTopics = topicsAsc.slice(0, 5);

                    const strongestTopics = [...topicsAsc]
                      .reverse()
                      .filter(([topic]) => !weakestTopics.some(([w]) => w === topic))
                      .slice(0, 5);

                    return (

                      <div
                        key={student.studentId}
                        className={`rounded-2xl overflow-hidden ${isSelf ? "ring-2 ring-slate-900" : ""}`}
                      >

                        <div
                          onClick={() =>
                            setExpandedStudentId(isExpanded ? null : student.studentId)
                          }
                          className="bg-slate-100 hover:bg-slate-200 transition-colors p-6 flex flex-wrap items-center justify-between gap-4 cursor-pointer"
                        >

                          <div className="flex items-center gap-4">

                            <span className="text-lg font-bold w-10 text-center">
                              {MEDAL_EMOJI[student.rank] || `#${student.rank}`}
                            </span>

                            <div>

                              <h3 className="font-semibold flex items-center gap-2">
                                {student.username}
                                {isSelf && (
                                  <span className="text-xs bg-slate-900 text-white px-2 py-0.5 rounded-full">
                                    You
                                  </span>
                                )}
                                {student.moduleMastery >= 0.9 && (
                                  <span title="90%+ mastery">⭐</span>
                                )}
                              </h3>

                              <p className="text-xs text-gray-500">
                                {student.quizzesCompleted} quiz{student.quizzesCompleted === 1 ? "" : "zes"} completed
                              </p>

                            </div>

                          </div>

                          <div className="flex flex-wrap gap-6 items-center">

                            <div className="text-center">
                              <p className="text-xs text-gray-500">Mastery</p>
                              <p className="font-semibold">{Math.round(student.moduleMastery * 100)}%</p>
                            </div>

                            <div className="text-center">
                              <p className="text-xs text-gray-500">Avg. Score</p>
                              <p className="font-semibold">{student.avgQuizScore}%</p>
                            </div>

                            <div className="text-center">
                              <p className="text-xs text-gray-500">Streak</p>
                              <p className="font-semibold">
                                {student.streak.current}
                                {student.streak.current >= 3 ? " 🔥" : ""}
                              </p>
                            </div>

                            <div className="text-center w-14">
                              <p className="text-xs text-gray-500">Movement</p>
                              {renderMovement(student.movement)}
                            </div>

                            <span className="text-lg text-gray-400">
                              {isExpanded ? "▲" : "▼"}
                            </span>

                          </div>

                        </div>

                        {isExpanded && (

                          <div className="bg-white p-6 border-t border-slate-200">

                            <div className="grid md:grid-cols-3 gap-4 mb-6">

                              <div className="bg-slate-100 rounded-2xl p-5 text-center">
                                <p className="text-gray-500 text-sm mb-1">Overall Mastery</p>
                                <p className="text-2xl font-bold">
                                  {Math.round(student.moduleMastery * 100)}%
                                </p>
                              </div>

                              <div className="bg-slate-100 rounded-2xl p-5 text-center">
                                <p className="text-gray-500 text-sm mb-1">Average Quiz Score</p>
                                <p className="text-2xl font-bold">{student.avgQuizScore}%</p>
                              </div>

                              <div className="bg-slate-100 rounded-2xl p-5 text-center">
                                <p className="text-gray-500 text-sm mb-1">Learning Trend</p>
                                <p className={`text-lg font-bold ${trendInfo.colorClass}`}>
                                  {trendInfo.label}
                                </p>
                              </div>

                            </div>

                            <h4 className="font-semibold mb-3">Weekly Mastery</h4>

                            <div className="grid md:grid-cols-2 gap-3 mb-6">

                              {sortedWeeksList.map((week) => {

                                const weekMastery = calculateWeekMastery(
                                  latestTopicMastery,
                                  week.topics || []
                                );

                                return (

                                  <div key={week.id} className="bg-slate-100 rounded-xl p-4">

                                    <div className="flex justify-between mb-1 text-sm">
                                      <span className="font-medium">{week.title}</span>
                                      <span className="text-gray-500">
                                        {Math.round(weekMastery * 100)}%
                                      </span>
                                    </div>

                                    <div className="w-full bg-slate-200 rounded-full h-2">
                                      <div
                                        className="bg-slate-900 h-2 rounded-full"
                                        style={{ width: `${weekMastery * 100}%` }}
                                      />
                                    </div>

                                  </div>

                                );

                              })}

                            </div>

                            <h4 className="font-semibold mb-3">Learning Focus</h4>

                            <div className="grid md:grid-cols-2 gap-6 mb-6">

                              <div>

                                <h5 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
                                  Weakest Topics
                                </h5>

                                <div className="space-y-3">

                                  {weakestTopics.map(([topic, value]) => (

                                    <div key={topic}>
                                      <div className="flex justify-between mb-1 text-sm">
                                        <span>{topic}</span>
                                        <span className="text-gray-500">{Math.round(value * 100)}%</span>
                                      </div>
                                      <div className="w-full bg-slate-200 rounded-full h-2">
                                        <div
                                          className="bg-red-500 h-2 rounded-full"
                                          style={{ width: `${value * 100}%` }}
                                        />
                                      </div>
                                    </div>

                                  ))}

                                  {weakestTopics.length === 0 && (
                                    <p className="text-sm text-gray-400">No data yet</p>
                                  )}

                                </div>

                              </div>

                              <div>

                                <h5 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
                                  Strongest Topics
                                </h5>

                                <div className="space-y-3">

                                  {strongestTopics.map(([topic, value]) => (

                                    <div key={topic}>
                                      <div className="flex justify-between mb-1 text-sm">
                                        <span>{topic}</span>
                                        <span className="text-gray-500">{Math.round(value * 100)}%</span>
                                      </div>
                                      <div className="w-full bg-slate-200 rounded-full h-2">
                                        <div
                                          className="bg-green-500 h-2 rounded-full"
                                          style={{ width: `${value * 100}%` }}
                                        />
                                      </div>
                                    </div>

                                  ))}

                                  {strongestTopics.length === 0 && (
                                    <p className="text-sm text-gray-400">No data yet</p>
                                  )}

                                </div>

                              </div>

                            </div>

                            <div className="bg-slate-100 rounded-xl p-4">
                              <p className="text-sm text-gray-500 mb-1">Quiz History Summary</p>
                              <p className="text-sm text-gray-700">
                                {student.quizzesCompleted} quiz{student.quizzesCompleted === 1 ? "" : "zes"} completed
                                {student.lastActiveDate && (
                                  <> · Last active {student.lastActiveDate.toLocaleDateString()}</>
                                )}
                              </p>
                            </div>

                          </div>

                        )}

                      </div>

                    );

                  })}

                </div>

              </div>

            </>

          )}

        </div>

      </div>

    </>
  );

}

export default Leaderboard;
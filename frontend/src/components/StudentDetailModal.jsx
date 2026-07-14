import { useState } from "react";
import ReviewAttemptModal from "./ReviewAttemptModal";
import { getTrendInfo } from "../utils/progressAnalytics";

function StudentDetailModal({ student, onClose }) {

  const [reviewingAttempt, setReviewingAttempt] = useState(null);

  if (!student) return null;

  const latestTopicMastery =
    student.timeline.length > 0
      ? student.timeline[student.timeline.length - 1].topicMastery
      : {};

  const sortedTopics = Object.entries(latestTopicMastery).sort((a, b) => a[1] - b[1]);

  const weakestTopics = sortedTopics.slice(0, 3);

  const strongestTopics = [...sortedTopics].reverse().slice(0, 3);

  const avgQuizScore =
    student.attempts.length > 0
      ? Math.round(
          student.attempts.reduce((sum, a) => sum + (a.percentage || 0), 0) /
            student.attempts.length
        )
      : 0;

  const trendInfo = getTrendInfo(student.trend);

  const trendDetail =
    student.trend !== null
      ? ` (${student.trend >= 0 ? "+" : ""}${Math.round(student.trend * 100)}%)`
      : "";

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-6">

      <div className="bg-white rounded-[32px] shadow-xl p-10 w-full max-w-4xl max-h-[85vh] overflow-y-auto relative">

        <button
          onClick={onClose}
          className="absolute top-6 right-6 text-2xl hover:text-red-500"
        >
          ✕
        </button>

        <h2 className="text-3xl font-bold mb-1">
          {student.username}
        </h2>

        <p className="text-gray-500 mb-8">
          Student learning profile
        </p>

        <div className="grid md:grid-cols-4 gap-4 mb-8">

          <div className="bg-slate-100 rounded-2xl p-6 text-center">
            <p className="text-gray-500 text-sm mb-1">Overall Mastery</p>
            <p className="text-3xl font-bold">{Math.round(student.moduleMastery * 100)}%</p>
          </div>

          <div className="bg-slate-100 rounded-2xl p-6 text-center">
            <p className="text-gray-500 text-sm mb-1">Average Quiz Score</p>
            <p className="text-3xl font-bold">{avgQuizScore}%</p>
          </div>

          <div className="bg-slate-100 rounded-2xl p-6 text-center">
            <p className="text-gray-500 text-sm mb-1">Learning Trend</p>
            <p className={`text-lg font-bold ${trendInfo.colorClass}`}>
              {trendInfo.label}{trendDetail}
            </p>
          </div>

          <div className="bg-slate-100 rounded-2xl p-6 text-center">
            <p className="text-gray-500 text-sm mb-1">Status</p>
            <p className="text-lg font-bold">{student.status}</p>
          </div>

        </div>

        <div className="grid md:grid-cols-2 gap-6 mb-8">

          <div className="bg-slate-100 rounded-2xl p-6">

            <h3 className="font-semibold mb-4">Strongest Topics</h3>

            <div className="space-y-2">
              {strongestTopics.length > 0 ? (
                strongestTopics.map(([topic, value]) => (
                  <div key={topic} className="bg-white rounded-xl px-4 py-2 flex justify-between text-sm">
                    <span>{topic}</span>
                    <span className="font-semibold text-green-600">{Math.round(value * 100)}%</span>
                  </div>
                ))
              ) : (
                <p className="text-sm text-gray-400">No data yet</p>
              )}
            </div>

          </div>

          <div className="bg-slate-100 rounded-2xl p-6">

            <h3 className="font-semibold mb-4">Weakest Topics</h3>

            <div className="space-y-2">
              {weakestTopics.length > 0 ? (
                weakestTopics.map(([topic, value]) => (
                  <div key={topic} className="bg-white rounded-xl px-4 py-2 flex justify-between text-sm">
                    <span>{topic}</span>
                    <span className="font-semibold text-red-600">{Math.round(value * 100)}%</span>
                  </div>
                ))
              ) : (
                <p className="text-sm text-gray-400">No data yet</p>
              )}
            </div>

          </div>

        </div>

        <div className="bg-slate-100 rounded-2xl p-6 mb-8">

          <h3 className="font-semibold mb-4">Topic Mastery</h3>

          <div className="space-y-3">

            {sortedTopics.map(([topic, value]) => (

              <div key={topic}>

                <div className="flex justify-between mb-1 text-sm">
                  <span>{topic}</span>
                  <span className="text-gray-500">{Math.round(value * 100)}%</span>
                </div>

                <div className="w-full bg-slate-200 rounded-full h-2">
                  <div
                    className="bg-slate-900 h-2 rounded-full"
                    style={{ width: `${value * 100}%` }}
                  />
                </div>

              </div>

            ))}

          </div>

        </div>

        <div className="bg-slate-100 rounded-2xl p-6">

          <h3 className="font-semibold mb-4">Quiz History</h3>

          <div className="space-y-3">

            {[...student.attempts].reverse().map((attempt) => (

              <div
                key={attempt.id}
                className="bg-white rounded-xl px-4 py-3 flex flex-wrap items-center justify-between gap-3"
              >

                <div>
                  <p className="font-semibold text-sm">{attempt.weekTitle}</p>
                  <p className="text-xs text-gray-500">
                    {attempt.date?.toDate
                      ? attempt.date.toDate().toLocaleDateString()
                      : "—"}
                  </p>
                </div>

                <div className="flex items-center gap-4">

                  <span className="text-sm font-semibold">{attempt.percentage}%</span>

                  <button
                    onClick={() => setReviewingAttempt(attempt)}
                    className="border border-slate-300 px-3 py-1.5 rounded-lg text-sm hover:bg-slate-50"
                  >
                    Review
                  </button>

                </div>

              </div>

            ))}

            {student.attempts.length === 0 && (
              <p className="text-sm text-gray-400">No quiz attempts yet</p>
            )}

          </div>

        </div>

      </div>

      {reviewingAttempt && (
        <ReviewAttemptModal
          attempt={reviewingAttempt}
          onClose={() => setReviewingAttempt(null)}
        />
      )}

    </div>
  );

}

export default StudentDetailModal;
function ReviewAttemptModal({ attempt, onClose }) {

  if (!attempt) return null;

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
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-6">

      <div className="bg-white rounded-[32px] shadow-xl p-10 w-full max-w-3xl max-h-[85vh] overflow-y-auto relative">

        <button
          onClick={onClose}
          className="absolute top-6 right-6 text-2xl hover:text-red-500"
        >
          ✕
        </button>

        <h2 className="text-3xl font-bold mb-1">
          {attempt.weekTitle}
        </h2>

        <p className="text-gray-500 mb-8">
          {attempt.correctCount} / {attempt.totalQuestions} correct · {attempt.percentage}%
        </p>

        <div className="space-y-6">

          {(attempt.answers || []).map((item, index) => {

            const style = outcomeStyles[item.outcome] || outcomeStyles.incorrect;

            return (

              <div
                key={index}
                className="bg-slate-100 rounded-2xl p-6"
              >

                <div className="flex justify-between items-start mb-3 gap-3">

                  <p className="text-sm text-gray-500">
                    Question {index + 1} • {item.topic}
                  </p>

                  <span className={`text-sm font-semibold px-3 py-1 rounded-full ${style.badge}`}>
                    {style.label} · {item.questionMark ?? 0}%
                  </span>

                </div>

                <h3 className="text-lg font-semibold mb-4">
                  {item.question}
                </h3>

                <div className="bg-white rounded-xl p-4 mb-2">

                  <p className="text-sm text-gray-500 mb-1">
                    Your Answer
                  </p>

                  <p className={style.text}>
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

      </div>

    </div>
  );

}

export default ReviewAttemptModal;
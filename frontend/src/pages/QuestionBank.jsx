import Header from "../components/Header";
import { useState } from "react";

function QuestionBank() {
  const [selectedWeek, setSelectedWeek] = useState(null);
const [selectedTopic, setSelectedTopic] = useState(null);

const [showGenerateModal, setShowGenerateModal] = useState(false);

const [easyCount, setEasyCount] = useState(2);
const [mediumCount, setMediumCount] = useState(2);
const [hardCount, setHardCount] = useState(2);

  const weeks = [
    {
      id: 1,
      title: "Week 1 - Classical Ciphers",
      topics: [
        "Caesar Cipher",
        "Vigenere Cipher",
        "Vernam Cipher",
      ],
    },
    {
      id: 2,
      title: "Week 2 - Block Ciphers",
      topics: [
        "Feistel Network",
        "DES",
        "AES",
      ],
    },
    {
      id: 3,
      title: "Week 3 - Public Key Cryptography",
      topics: [
        "RSA",
        "Diffie-Hellman",
        "Digital Signatures",
      ],
    },
  ];

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
                    {week.topics.length} Topics
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
            Total Questions: 15
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
          <p className="text-2xl font-bold">5</p>
        </div>

        <div className="bg-slate-100 rounded-2xl p-4">
          <p className="text-gray-500 text-sm">Medium</p>
          <p className="text-2xl font-bold">5</p>
        </div>

        <div className="bg-slate-100 rounded-2xl p-4">
          <p className="text-gray-500 text-sm">Hard</p>
          <p className="text-2xl font-bold">5</p>
        </div>

        <div className="bg-slate-100 rounded-2xl p-4">
          <p className="text-gray-500 text-sm">Total</p>
          <p className="text-2xl font-bold">15</p>
        </div>

      </div>

      <details className="bg-slate-100 rounded-2xl p-5 mb-4">

        <summary className="cursor-pointer font-semibold text-lg">
          Easy Questions (5)
        </summary>

        <div className="mt-4 space-y-3">

          {[1,2,3,4,5].map((q) => (

            <div
              key={q}
              className="
                bg-white
                rounded-xl
                p-4
                flex
                justify-between
                items-center
              "
            >

              <span>
                Easy Question {q}
              </span>

              <div className="flex gap-2">

                <button>✏️</button>

                <button>🗑️</button>

              </div>

            </div>

          ))}

          <button
            className="
              border
              border-slate-300
              px-4
              py-2
              rounded-xl
            "
          >
            + Generate More Easy Questions
          </button>

        </div>

      </details>

      <details className="bg-slate-100 rounded-2xl p-5 mb-4">

        <summary className="cursor-pointer font-semibold text-lg">
          Medium Questions (5)
        </summary>

        <div className="mt-4 space-y-3">

          {[1,2,3,4,5].map((q) => (

            <div
              key={q}
              className="
                bg-white
                rounded-xl
                p-4
                flex
                justify-between
                items-center
              "
            >

              <span>
                Medium Question {q}
              </span>

              <div className="flex gap-2">

                <button>✏️</button>

                <button>🗑️</button>

              </div>

            </div>

          ))}

          <button
            className="
              border
              border-slate-300
              px-4
              py-2
              rounded-xl
            "
          >
            + Generate More Medium Questions
          </button>

        </div>

      </details>

      <details className="bg-slate-100 rounded-2xl p-5">

        <summary className="cursor-pointer font-semibold text-lg">
          Hard Questions (5)
        </summary>

        <div className="mt-4 space-y-3">

          {[1,2,3,4,5].map((q) => (

            <div
              key={q}
              className="
                bg-white
                rounded-xl
                p-4
                flex
                justify-between
                items-center
              "
            >

              <span>
                Hard Question {q}
              </span>

              <div className="flex gap-2">

                <button>✏️</button>

                <button>🗑️</button>

              </div>

            </div>

          ))}

          <button
            className="
              border
              border-slate-300
              px-4
              py-2
              rounded-xl
            "
          >
            + Generate More Hard Questions
          </button>

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
          onClick={() => {
            alert(
              `Generating ${easyCount} Easy, ${mediumCount} Medium and ${hardCount} Hard questions`
            );

            setShowGenerateModal(false);
          }}
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
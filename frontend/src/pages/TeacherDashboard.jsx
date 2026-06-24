import Header from "../components/Header";
import FeatureCard from "../components/FeatureCard";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { db } from "../firebase";
import {
  collection,
  addDoc,
  serverTimestamp
} from "firebase/firestore";

function TeacherDashboard() {
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploadStep, setUploadStep] = useState("upload");
  const [weekTitle, setWeekTitle] = useState("");
  

  const [topics, setTopics] = useState([
    "Caesar Cipher",
    "Vigenere Cipher",
    "Vernam Cipher",
    "Feistel Network",
  ]);

const [generatedQuestions, setGeneratedQuestions] = useState({});
const [loadingQuestions, setLoadingQuestions] = useState(false);
const [expandedTopic, setExpandedTopic] = useState(null);
const [loadingTopics, setLoadingTopics] = useState(false);

const navigate = useNavigate();

const extractTopics = async () => {

  if (!selectedFile) {
    alert("Please select a PDF first.");
    return;
  }

  setLoadingTopics(true);

  const formData = new FormData();

  formData.append(
    "file",
    selectedFile
  );

  try {

    const response = await fetch(
      "http://127.0.0.1:8000/extract-topics",
      {
        method: "POST",
        body: formData,
      }
    );

    const data = await response.json();

    if (data.topics) {

      setTopics(data.topics);

      setUploadStep("topics");

    } else {

      alert("Topic extraction failed.");

    }

  } catch (error) {

    console.error(error);

    alert("Could not connect to backend.");

  }

  setLoadingTopics(false);
};


const saveQuestionBank = async () => {

  if (!weekTitle.trim()) {

    alert("Please enter a week title.");

    return;

  }

  try {

    await addDoc(
      collection(db, "questionBank"),
      {
        title: weekTitle,
        topics: topics,
        questions: generatedQuestions,
        createdAt: serverTimestamp()
      }
    );

    alert("Questions Saved!");

    setShowUploadModal(false);
    setSelectedFile(null);
    setTopics([]);
    setGeneratedQuestions({});
    setUploadStep("upload");
    setWeekTitle("");

  } catch (error) {

    console.error(error);

    alert("Failed to save.");

  }

};



const generateQuestions = async () => {

  setLoadingQuestions(true);

  try {

    const response = await fetch(
      "http://127.0.0.1:8000/generate-questions",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          topics,
        }),
      }
    );

    const data = await response.json();

    setGeneratedQuestions(data);

    setUploadStep("questions");

  } catch (error) {

    console.error(error);

    alert("Question generation failed.");

  }

  setLoadingQuestions(false);
};

  return (
    <>
      <Header />

      <div className="min-h-screen bg-slate-100 px-10 py-16">
        <div className="max-w-7xl mx-auto">

          <h1 className="text-5xl font-bold mb-3">
            Cryptography
          </h1>

          <p className="text-gray-600 text-lg mb-12">
            Manage course content and monitor student performance.
          </p>

          <div className="grid md:grid-cols-3 gap-6 mb-10">

            <div className="bg-white rounded-3xl shadow-md p-6">
              <p className="text-gray-500 text-sm mb-2">
                Learning Units
              </p>

              <h2 className="text-4xl font-bold">
                3
              </h2>
            </div>

            <div className="bg-white rounded-3xl shadow-md p-6">
              <p className="text-gray-500 text-sm mb-2">
                Questions
              </p>

              <h2 className="text-4xl font-bold">
                120
              </h2>
            </div>

            <div className="bg-white rounded-3xl shadow-md p-6">
              <p className="text-gray-500 text-sm mb-2">
                Students
              </p>

              <h2 className="text-4xl font-bold">
                15
              </h2>
            </div>

          </div>

          <div className="grid md:grid-cols-2 gap-8">

            <div onClick={() => setShowUploadModal(true)}>
              <FeatureCard
                icon="📄"
                title="Upload Material"
                description="Upload learning materials and generate topics and assessment questions."
              />
            </div>

            <div onClick={() => navigate("/question-bank")}>

              <FeatureCard
                icon="❓"
                title="Question Bank"
                description="Review, edit and manage approved questions for each learning unit."
              />
            </div>


            <FeatureCard
              icon="📊"
              title="Student Analytics"
              description="Monitor student performance, learning gaps and leaderboard rankings."
            />


          </div>

        </div>
      </div>

      {showUploadModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">

          <div className="bg-white rounded-[32px] shadow-xl p-10 w-full max-w-2xl relative max-h-[90vh] overflow-y-auto">

            <button
              onClick={() => {
                setShowUploadModal(false);
                setSelectedFile(null);
                setUploadStep("upload");
              }}
              className="absolute top-6 right-6 text-2xl hover:text-red-500"
            >
              ✕
            </button>

            {uploadStep === "upload" && (
              <>
                <h2 className="text-3xl font-bold mb-3">
                  Upload Learning Material
                </h2>

                <p className="text-gray-500 mb-8">
                  Upload lecture notes or learning materials to generate topics and assessment questions.
                </p>

                <div className="mb-6">

                  <label className="block mb-2 font-medium">
                    Week / Learning Unit
                  </label>

                  <input
  type="text"
  placeholder="e.g. Week 1 - Classical Ciphers"
  value={weekTitle}
  onChange={(e) => setWeekTitle(e.target.value)}
  className="
    w-full
    border
    border-slate-300
    rounded-xl
    p-4
  "
/>

                </div>

                <div className="mb-8">

                  <label className="block mb-2 font-medium">
                    Upload PDF
                  </label>

                  <label
                    className="
                      flex
                      items-center
                      justify-center
                      w-full
                      border-2
                      border-dashed
                      border-slate-300
                      rounded-2xl
                      p-8
                      cursor-pointer
                      hover:border-cyan-400
                      hover:bg-slate-50
                      transition-all
                    "
                  >

                    {selectedFile ? (
                      <span className="font-medium text-slate-700">
                        📄 {selectedFile.name}
                      </span>
                    ) : (
                      <span>
                        📄 Select PDF File
                      </span>
                    )}

                    <input
                      type="file"
                      accept=".pdf"
                      className="hidden"
                      onChange={(e) => {
                        if (e.target.files && e.target.files.length > 0) {
                          setSelectedFile(e.target.files[0]);
                        }
                      }}
                    />

                  </label>

                </div>

                <div className="flex justify-center">

                    <button
  onClick={extractTopics}
  disabled={loadingTopics}
  className="
    bg-slate-900
    text-white
    px-8
    py-4
    rounded-2xl
    hover:bg-slate-800
    disabled:opacity-50
  "
>
  {loadingTopics
    ? "Analyzing PDF..."
    : "Upload Material"}
</button>

                </div>

              </>
            )}

            {uploadStep === "topics" && (
              <>
                <h2 className="text-3xl font-bold mb-3">
                  Topics Detected
                </h2>

                <p className="text-gray-500 mb-8">
                  Review the AI-generated topics before creating question sets.
                </p>

                <div className="space-y-4 mb-6">

                  {topics.map((topic, index) => (
                    <div
                      key={index}
                      className="bg-slate-100 rounded-2xl p-4 flex justify-between items-center"
                    >
                      <span>{topic}</span>

                      <div className="flex gap-3">

                        <button
                          onClick={() => {
                            const updatedTopic = prompt(
                              "Edit Topic",
                              topic
                            );

                            if (updatedTopic) {
                              const updatedTopics = [...topics];
                              updatedTopics[index] = updatedTopic;
                              setTopics(updatedTopics);
                            }
                          }}
                        >
                          ✏️
                        </button>

                        <button
                          onClick={() => {
                            setTopics(
                              topics.filter((_, i) => i !== index)
                            );
                          }}
                        >
                          🗑️
                        </button>

                      </div>

                    </div>
                  ))}

                </div>

                <div className="mb-8">

                  <button
                    onClick={() => {
                      const newTopic = prompt(
                        "Enter new topic"
                      );

                      if (newTopic) {
                        setTopics([...topics, newTopic]);
                      }
                    }}
                    className="
                      border
                      border-slate-300
                      px-5
                      py-3
                      rounded-xl
                      hover:bg-slate-50
                    "
                  >
                    + Add Topic
                  </button>

                </div>

                <div className="flex justify-center gap-4">

                  <button
                    onClick={() => setUploadStep("upload")}
                    className="
                      border
                      border-slate-300
                      px-6
                      py-3
                      rounded-xl
                    "
                  >
                    Back
                  </button>

                  <button
                    onClick={generateQuestions}
                    className="
                      bg-slate-900
                      text-white
                      px-6
                      py-3
                      rounded-xl
                    "
                  >
                    {loadingQuestions
  ? "Generating Questions..."
  : "Approve Topics"}
                  </button>

                </div>

              </>
            )}

            {uploadStep === "questions" && (
  <>
    <h2 className="text-3xl font-bold mb-3">
      Question Sets Generated
    </h2>

    <p className="text-gray-500 mb-8">
      Review AI-generated question pools before publishing them to the Question Bank.
    </p>

    <div className="space-y-4 mb-8">

      {topics.map((topic, index) => (
        <div
          key={index}
          className="bg-slate-100 rounded-2xl p-5"
        >

          <h3 className="font-semibold text-lg mb-3">
            {topic}
          </h3>

          <p className="text-gray-600">
            Easy Questions (3)
          </p>

          <p className="text-gray-600">
            Medium Questions (3)
          </p>

          <p className="text-gray-600">
            Hard Questions (3)
          </p>

          <div className="mt-4 flex gap-3">

            <button
              onClick={() =>
                setExpandedTopic(
                  expandedTopic === index ? null : index
                )
              }
              className="
                border
                border-slate-300
                px-4
                py-2
                rounded-xl
              "
            >
              {expandedTopic === index
                ? "Hide Preview"
                : "Preview"}
            </button>

            <button
              className="
                border
                border-slate-300
                px-4
                py-2
                rounded-xl
              "
            >
              Regenerate
            </button>

          </div>

          {expandedTopic === index &&
 generatedQuestions[topic] && (

  <div className="mt-4 border-t pt-4">

    <div className="mb-4">

      <h4 className="font-semibold mb-2">
        Easy Question Example
      </h4>

      <div className="bg-white rounded-xl p-4">

        {
          generatedQuestions[topic]
            ?.easy?.[0]?.question
        }

      </div>

    </div>

    <div className="mb-4">

      <h4 className="font-semibold mb-2">
        Medium Question Example
      </h4>

      <div className="bg-white rounded-xl p-4">

        {
          generatedQuestions[topic]
            ?.medium?.[0]?.question
        }

      </div>

    </div>

    <div>

      <h4 className="font-semibold mb-2">
        Hard Question Example
      </h4>

      <div className="bg-white rounded-xl p-4">

        {
          generatedQuestions[topic]
            ?.hard?.[0]?.question
        }

      </div>

    </div>

  </div>

)}

        </div>
      ))}

    </div>

    <div className="flex justify-center gap-4">

      <button
        onClick={() => setUploadStep("topics")}
        className="
          border
          border-slate-300
          px-6
          py-3
          rounded-xl
        "
      >
        Back
      </button>

      <button
        onClick={saveQuestionBank}
        className="
          bg-slate-900
          text-white
          px-6
          py-3
          rounded-xl
        "
      >
        Approve All
      </button>

    </div>

  </>
)}

          </div>

        </div>
      )}
    </>
  );
}

export default TeacherDashboard;
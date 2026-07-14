import Header from "../components/Header";
import FeatureCard from "../components/FeatureCard";
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { db } from "../firebase";
import { collection, getDocs } from "firebase/firestore";

function StudentDashboard() {

  const [showQuizModal, setShowQuizModal] = useState(false);

  const [weeks, setWeeks] = useState([]);

  const [expandedWeek, setExpandedWeek] = useState(null);

  const navigate = useNavigate();



  useEffect(() => {

    loadWeeks();

  }, []);

  const loadWeeks = async () => {

    const snapshot = await getDocs(
      collection(db, "questionBank")
    );

    const weekData = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data()
    }));

    weekData.sort((a, b) => {

      const weekA = parseInt(a.title.match(/\d+/)?.[0] || 0);
      const weekB = parseInt(b.title.match(/\d+/)?.[0] || 0);

      return weekA - weekB;

    });

    setWeeks(weekData);

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
            Access adaptive quizzes, monitor your learning progress and compete on the course leaderboard.
          </p>

          <div className="grid md:grid-cols-2 gap-8">

            <div onClick={() => setShowQuizModal(true)}>

              <FeatureCard
                icon="📝"
                title="Adaptive Quiz"
                description="Complete adaptive quizzes generated from your current learning progress."
              />

            </div>


            <div onClick={() => navigate("/student-progress")}>

              <FeatureCard
                icon="📈"
                title="My Progress"
                description="View quiz performance, topic mastery and personalised learning insights."
              />

            </div>

            <div onClick={() => navigate("/leaderboard")}>

              <FeatureCard
                icon="🏆"
                title="Leaderboard"
                description="Compare your progress with classmates and stay motivated through friendly competition."
              />

            </div>

          </div>

        </div>

      </div>

      {showQuizModal && (

        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">

          <div className="bg-white rounded-[32px] shadow-xl p-10 w-full max-w-3xl max-h-[80vh] overflow-y-auto relative">

            <button
              onClick={() => {
                setShowQuizModal(false);
                setExpandedWeek(null);
              }}
              className="absolute top-6 right-6 text-2xl hover:text-red-500"
            >
              ✕
            </button>

            <h2 className="text-3xl font-bold mb-3">
              Choose Learning Week
            </h2>

            <p className="text-gray-500 mb-8">
              Select the learning unit you would like to practise.
            </p>

            <div className="space-y-4">

              {weeks.map((week) => (

                <div
                  key={week.id}
                  className="bg-slate-100 rounded-2xl p-6"
                >

                  <div className="flex justify-between items-start">

                    <div>

                      <h3 className="text-xl font-semibold">
                        {week.title}
                      </h3>

                      <p className="text-gray-500 mt-1">
                        {week.topics.length} Topics
                      </p>

                    </div>

                    <div className="flex gap-3">

                      <button
                        onClick={() =>
                          setExpandedWeek(
                            expandedWeek === week.id
                              ? null
                              : week.id
                          )
                        }
                        className="
                    border
                    border-slate-300
                    px-4
                    py-2
                    rounded-xl
                    hover:bg-white
                  "
                      >
                        {expandedWeek === week.id
                          ? "Hide Topics"
                          : "Topics"}
                      </button>

                      <button
                        onClick={() =>
                          navigate("/student-quiz", {
                            state: week
                          })
                        }
                        className="
                    bg-slate-900
                    text-white
                    px-4
                    py-2
                    rounded-xl
                    hover:bg-slate-800
                  "
                      >
                        Start Quiz
                      </button>

                    </div>

                  </div>

                  {expandedWeek === week.id && (

                    <div className="mt-5 border-t border-slate-300 pt-5">

                      <h4 className="font-semibold mb-3">
                        Topics Covered
                      </h4>

                      <div className="space-y-2">

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

                  )}

                </div>

              ))}

            </div>

          </div>

        </div>

      )}


    </>
  );
}

export default StudentDashboard;
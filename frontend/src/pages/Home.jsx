import Header from "../components/Header";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import TeacherLoginModal from "../components/TeacherLoginModal";
import StudentLoginModal from "../components/StudentLoginModal";
import { useAuth } from "../context/AuthContext";

function Home() {

  const { user, role } = useAuth();

  const [showTeacherModal, setShowTeacherModal] = useState(false);

  const [showStudentModal, setShowStudentModal] = useState(false);

  const navigate = useNavigate();

  // If already authenticated as the matching role, skip the login
  // modal entirely and go straight in - the modal should only ever
  // appear when there's no authenticated user for that role.
  const handleTeacherClick = () => {
    if (user && role === "teacher") {
      navigate("/teacher-courses");
    } else {
      setShowTeacherModal(true);
    }
  };

  const handleStudentClick = () => {
    if (user && role === "student") {
      navigate("/student-courses");
    } else {
      setShowStudentModal(true);
    }
  };

  return (
    <>
      <Header />

      <div className="min-h-[calc(100vh-96px)] bg-slate-50 flex items-center justify-center">

        <div className="w-full max-w-5xl px-8">

          <div className="bg-white rounded-[32px] shadow-lg p-12">

            <h1 className="text-5xl font-bold mb-3">
              Welcome to AdaptED AI
            </h1>

            <p className="text-gray-500 text-lg mb-12">
              An AI-powered adaptive learning platform designed to support personalised education and improve student learning outcomes.
            </p>


            <div className="grid md:grid-cols-2 gap-6 max-w-3xl">

              <div onClick={handleTeacherClick}>

                <div
                  className="
                    bg-slate-50
                    border
                    border-slate-200
                    rounded-3xl
                    p-8
                    hover:shadow-lg
                    hover:-translate-y-1
                    transition-all
                    cursor-pointer
                    h-64
                  "
                >

                  <div className="text-4xl mb-4">
                    👨‍🏫
                  </div>

                  <h3 className="text-2xl font-semibold mb-2">
                    Teacher
                  </h3>

                  <p className="text-gray-500">
                    Manage courses, upload learning materials, generate quizzes and monitor student performance.
                  </p>

                </div>

              </div>

              <div onClick={handleStudentClick}>

                <div
                  className="
                    bg-slate-50
                    border
                    border-slate-200
                    rounded-3xl
                    p-8
                    hover:shadow-lg
                    hover:-translate-y-1
                    transition-all
                    cursor-pointer
                    h-64
                  "
                >

                  <div className="text-4xl mb-4">
                    🎓
                  </div>

                  <h3 className="text-2xl font-semibold mb-2">
                    Student
                  </h3>

                  <p className="text-gray-500">
                    Access courses, complete quizzes, track progress and improve understanding through adaptive learning.
                  </p>

                </div>

              </div>

            </div>

          </div>

        </div>

      </div>

      {showTeacherModal && (

        <TeacherLoginModal
          onClose={() => setShowTeacherModal(false)}
          onSuccess={() => {
            setShowTeacherModal(false);
            navigate("/teacher-courses");
          }}
        />

      )}

      {showStudentModal && (

        <StudentLoginModal
          onClose={() => setShowStudentModal(false)}
          onSuccess={() => {
            setShowStudentModal(false);
            navigate("/student-courses");
          }}
        />

      )}

    </>
  );
}

export default Home;
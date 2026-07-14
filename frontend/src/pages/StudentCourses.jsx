import Header from "../components/Header";
import { Link } from "react-router-dom";

function StudentCourses() {
  return (
    <>
      <Header />

      <div className="min-h-[calc(100vh-96px)] bg-slate-50 flex items-center justify-center">

        <div className="w-full max-w-5xl px-8">

          <div className="bg-white rounded-[32px] shadow-lg p-12">

            <h1 className="text-5xl font-bold mb-3">
              Welcome, Student
            </h1>

            <p className="text-gray-500 text-lg mb-12">
              Access your courses, track your progress and improve your understanding through adaptive learning.
            </p>

            <div className="grid md:grid-cols-2 gap-8">

              <div>

                <h2 className="text-xl font-semibold mb-6">
                  Your Courses
                </h2>

                <Link to="/student-dashboard">

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
                      📚
                    </div>

                    <h3 className="text-2xl font-semibold mb-2">
                      Cryptography
                    </h3>

                    <p className="text-gray-500">
                      Adaptive learning using AI for cybersecurity education.
                    </p>

                  </div>

                </Link>

              </div>

              <div>

                <div className="h-[28px] mb-6"></div>

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
                  flex
                  flex-col
                  items-center
                  justify-center
                "
              >

                <div className="text-6xl mb-4">
                  +
                </div>

                <h3 className="text-2xl font-semibold">
                  Course Enroll
                </h3>

              </div>

              </div>

            </div>

          </div>

        </div>

      </div>
    </>
  );
}

export default StudentCourses;
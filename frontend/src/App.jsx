import { BrowserRouter, Routes, Route } from "react-router-dom";

import Home from "./pages/Home";
import TeacherCourses from "./pages/TeacherCourses";
import StudentCourses from "./pages/StudentCourses";
import TeacherDashboard from "./pages/TeacherDashboard";
import StudentDashboard from "./pages/StudentDashboard";
import QuestionBank from "./pages/QuestionBank";
import StudentQuiz from "./pages/StudentQuiz";
import StudentProgress from "./pages/StudentProgress";
import TeacherAnalytics from "./pages/TeacherAnalytics";
import Leaderboard from "./pages/Leaderboard";

import { AuthProvider } from "./context/AuthContext";
import ProtectedRoute from "./components/ProtectedRoute";


function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Home />} />

          <Route
            path="/teacher-courses"
            element={
              <ProtectedRoute role="teacher">
                <TeacherCourses />
              </ProtectedRoute>
            }
          />

          <Route
            path="/student-courses"
            element={
              <ProtectedRoute role="student">
                <StudentCourses />
              </ProtectedRoute>
            }
          />

          <Route
            path="/teacher-dashboard"
            element={
              <ProtectedRoute role="teacher">
                <TeacherDashboard />
              </ProtectedRoute>
            }
          />

          <Route
            path="/student-dashboard"
            element={
              <ProtectedRoute role="student">
                <StudentDashboard />
              </ProtectedRoute>
            }
          />

          <Route
            path="/question-bank"
            element={
              <ProtectedRoute role="teacher">
                <QuestionBank />
              </ProtectedRoute>
            }
          />

          <Route
            path="/student-quiz"
            element={
              <ProtectedRoute role="student">
                <StudentQuiz />
              </ProtectedRoute>
            }
          />

          <Route
            path="/student-progress"
            element={
              <ProtectedRoute role="student">
                <StudentProgress />
              </ProtectedRoute>
            }
          />

          <Route
            path="/teacher-analytics"
            element={
              <ProtectedRoute role="teacher">
                <TeacherAnalytics />
              </ProtectedRoute>
            }
          />

          <Route
            path="/leaderboard"
            element={
              <ProtectedRoute role="student">
                <Leaderboard />
              </ProtectedRoute>
            }
          />

        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
import { BrowserRouter, Routes, Route } from "react-router-dom";

import Home from "./pages/Home";
import TeacherCourses from "./pages/TeacherCourses";
import StudentCourses from "./pages/StudentCourses";
import TeacherDashboard from "./pages/TeacherDashboard";
import StudentDashboard from "./pages/StudentDashboard";
import QuestionBank from "./pages/QuestionBank";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />

        <Route
          path="/teacher-courses"
          element={<TeacherCourses />}
        />

        <Route
          path="/student-courses"
          element={<StudentCourses />}
        />

        <Route
          path="/teacher-dashboard"
          element={<TeacherDashboard />}
        />

        <Route
          path="/student-dashboard"
          element={<StudentDashboard />}
        />

        <Route
          path="/question-bank"
          element={<QuestionBank />}
        />

      </Routes>
    </BrowserRouter>
  );
}

export default App;
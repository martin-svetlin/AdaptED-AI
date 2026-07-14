import { Link, useNavigate, useLocation } from "react-router-dom";
import { useState, useRef, useEffect } from "react";
import { signOut } from "firebase/auth";
import { auth } from "../firebase";
import { useAuth } from "../context/AuthContext";

// A fixed parent-page map, rather than relying on browser history -
// this guarantees the Back button always goes to the same logical
// parent regardless of how the user actually arrived at a page (direct
// link, refresh, etc). Home has no parent, so it's simply absent here.
const PARENT_ROUTES = {
  "/teacher-courses": "/",
  "/student-courses": "/",
  "/teacher-dashboard": "/teacher-courses",
  "/student-dashboard": "/student-courses",
  "/question-bank": "/teacher-dashboard",
  "/student-quiz": "/student-dashboard",
  "/student-progress": "/student-dashboard",
  "/teacher-analytics": "/teacher-dashboard",
  "/leaderboard": "/student-dashboard"
};

function Header() {

  const { user, role } = useAuth();

  const navigate = useNavigate();

  const location = useLocation();

  const [showProfileMenu, setShowProfileMenu] = useState(false);

  const profileMenuRef = useRef(null);

  const parentRoute = PARENT_ROUTES[location.pathname];

  // Close the dropdown on any click outside it, like a normal site
  // profile menu.
  useEffect(() => {

    function handleClickOutside(event) {
      if (profileMenuRef.current && !profileMenuRef.current.contains(event.target)) {
        setShowProfileMenu(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);

    return () => document.removeEventListener("mousedown", handleClickOutside);

  }, []);

  // Usernames are converted into emails (e.g. "martin" ->
  // "martin@student.adapted.ai") at registration, so the part before
  // "@" is exactly the username - no extra Firestore read needed just
  // to show it in the header.
  const displayName = user?.email ? user.email.split("@")[0] : "";

  const roleLabel = role === "teacher" ? "Teacher" : role === "student" ? "Student" : "";

  const quickLink =
    role === "teacher"
      ? { to: "/teacher-analytics", label: "Analytics" }
      : role === "student"
      ? { to: "/student-progress", label: "My Progress" }
      : null;

  const handleBack = () => {
    if (parentRoute) navigate(parentRoute);
  };

  const handleLogout = async () => {
    setShowProfileMenu(false);
    await signOut(auth);
    navigate("/");
  };

  return (
    <header className="bg-slate-900 text-white shadow-md">

      <div className="h-27 w-full px-12 flex items-center justify-between">

        <button
          onClick={handleBack}
          disabled={!parentRoute}
          className={`
            text-lg
            font-medium
            transition-colors
            flex
            items-center
            gap-2

            ${parentRoute
              ? "hover:text-cyan-400"
              : "opacity-0 pointer-events-none"
            }
          `}
        >
          ← Back
        </button>

        <Link
  to="/"
  className="flex items-center gap-3 hover:opacity-80 transition-opacity"
>

  <span className="text-4xl">
    🎓
  </span>

  <h1 className="text-5xl font-bold">
    Adapt
    <span className="text-orange-400">
      ED
    </span>
    {" "}AI
  </h1>

</Link>

        <div className="flex items-center gap-4">

          <div className="relative" ref={profileMenuRef}>

            <button
              onClick={() => user && setShowProfileMenu(!showProfileMenu)}
              className="
                w-14
                h-14
                rounded-full
                bg-slate-100
                hover:bg-slate-200
                flex
                items-center
                justify-center
                transition-colors
              "
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
                className="w-6 h-6 text-slate-700"
              >
                <path d="M16 7a4 4 0 11-8 0 4 4 0 018 0z" />
                <path d="M4 21a8 8 0 0116 0" />
              </svg>
            </button>

            {showProfileMenu && user && (

              <div
                className="
                  absolute
                  right-0
                  mt-3
                  w-64
                  bg-white
                  text-slate-900
                  rounded-2xl
                  shadow-xl
                  border
                  border-slate-200
                  overflow-hidden
                  z-50
                "
              >

                <div className="px-5 py-4 border-b border-slate-100">
                  <p className="font-semibold truncate">{displayName}</p>
                  <p className="text-sm text-gray-500">{roleLabel}</p>
                </div>

                <div className="py-2">

                  {quickLink && (

                    <button
                      onClick={() => {
                        setShowProfileMenu(false);
                        navigate(quickLink.to);
                      }}
                      className="
                        w-full
                        text-left
                        px-5
                        py-3
                        text-sm
                        hover:bg-slate-50
                        transition-colors
                      "
                    >
                      {quickLink.label}
                    </button>

                  )}

                  <button
                    onClick={handleLogout}
                    className="
                      w-full
                      text-left
                      px-5
                      py-3
                      text-sm
                      text-red-600
                      hover:bg-slate-50
                      transition-colors
                    "
                  >
                    Logout
                  </button>

                </div>

              </div>

            )}

          </div>

        </div>

      </div>

    </header>
  );
}

export default Header;
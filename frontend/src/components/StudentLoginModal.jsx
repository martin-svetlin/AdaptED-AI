import { useState } from "react";
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword
} from "firebase/auth";
import { doc, setDoc, serverTimestamp } from "firebase/firestore";
import { auth, db } from "../firebase";

// Students never see or type an email address. Behind the scenes their
// username is converted into a Firebase Authentication email so we can
// reuse Firebase Auth for both roles without a custom auth system.
const STUDENT_EMAIL_DOMAIN = "@student.adapted.ai";

function StudentLoginModal({ onClose, onSuccess }) {

  const [mode, setMode] = useState("login"); // "login" | "register"

  const [successMessage, setSuccessMessage] = useState("");

  // Login form state
  const [loginUsername, setLoginUsername] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [loginError, setLoginError] = useState("");
  const [loggingIn, setLoggingIn] = useState(false);

  // Register form state
  const [regUsername, setRegUsername] = useState("");
  const [regPassword, setRegPassword] = useState("");
  const [regConfirmPassword, setRegConfirmPassword] = useState("");
  const [regError, setRegError] = useState("");
  const [registering, setRegistering] = useState(false);

  const switchToRegister = () => {
    setLoginError("");
    setSuccessMessage("");
    setMode("register");
  };

  const switchToLogin = () => {
    setRegError("");
    setMode("login");
  };

  const handleLogin = async (e) => {

    e.preventDefault();

    setLoginError("");
    setSuccessMessage("");
    setLoggingIn(true);

    const email =
      `${loginUsername.trim().toLowerCase()}${STUDENT_EMAIL_DOMAIN}`;

    try {

      await signInWithEmailAndPassword(auth, email, loginPassword);

      onSuccess();

    } catch (err) {

      if (err.code === "auth/network-request-failed") {
        setLoginError("Unable to connect.");
      } else {
        setLoginError("Invalid username or password.");
      }

    }

    setLoggingIn(false);

  };

  const handleRegister = async (e) => {

    e.preventDefault();

    setRegError("");

    if (regPassword !== regConfirmPassword) {
      setRegError("Passwords do not match.");
      return;
    }

    setRegistering(true);

      const displayName = regUsername.trim();

      const username = regUsername.trim();

      const email = `${username.toLowerCase()}${STUDENT_EMAIL_DOMAIN}`;

    try {

      const credential =
        await createUserWithEmailAndPassword(auth, email, regPassword);

        await setDoc(doc(db, "users", credential.user.uid), {
            username,
            displayName: username,
            role: "student",
            createdAt: serverTimestamp()
        });

      setRegUsername("");
      setRegPassword("");
      setRegConfirmPassword("");

      setSuccessMessage("Registration successful. Please log in.");

      setMode("login");

    } catch (err) {

      if (err.code === "auth/email-already-in-use") {
        setRegError("Username already exists.");
      } else if (err.code === "auth/network-request-failed") {
        setRegError("Unable to connect.");
      } else {
        setRegError("Unable to create account.");
      }

    }

    setRegistering(false);

  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">

      <div className="bg-white rounded-[32px] shadow-xl p-10 w-full max-w-md relative overflow-hidden">

        <button
          onClick={onClose}
          className="absolute top-6 right-6 text-2xl hover:text-red-500"
        >
          ✕
        </button>

        <div className="relative">

          {/* LOGIN FORM */}

          <div
            className={`
              transition-opacity
              duration-300

              ${mode === "login"
                ? "opacity-100"
                : "opacity-0 pointer-events-none absolute inset-0"
              }
            `}
          >

            <h2 className="text-3xl font-bold mb-8">
              Student Login
            </h2>

            <form onSubmit={handleLogin} className="space-y-5">

              <div>

                <label className="block text-sm text-gray-500 mb-2">
                  Username
                </label>

                <input
                  type="text"
                  value={loginUsername}
                  onChange={(e) => setLoginUsername(e.target.value)}
                  required
                  className="
                    w-full
                    border-2
                    border-slate-300
                    rounded-2xl
                    p-4
                    focus:outline-none
                    focus:border-slate-900
                  "
                />

              </div>

              <div>

                <label className="block text-sm text-gray-500 mb-2">
                  Password
                </label>

                <input
                  type="password"
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  required
                  className="
                    w-full
                    border-2
                    border-slate-300
                    rounded-2xl
                    p-4
                    focus:outline-none
                    focus:border-slate-900
                  "
                />

              </div>

              {successMessage && (
                <p className="text-green-600 text-sm">
                  {successMessage}
                </p>
              )}

              {loginError && (
                <p className="text-red-600 text-sm">
                  {loginError}
                </p>
              )}

              <button
                type="submit"
                disabled={loggingIn}
                className={`
                  w-full
                  px-8
                  py-4
                  rounded-2xl
                  text-white
                  transition-all

                  ${loggingIn
                    ? "bg-slate-400 cursor-not-allowed"
                    : "bg-slate-900 hover:bg-slate-800"
                  }
                `}
              >
                {loggingIn ? "Signing In..." : "Login"}
              </button>

              <p className="text-center text-sm text-gray-500">
                Don't have an account?{" "}
                <button
                  type="button"
                  onClick={switchToRegister}
                  className="text-slate-900 font-semibold hover:underline"
                >
                  Register
                </button>
              </p>

            </form>

          </div>

          {/* REGISTER FORM */}

          <div
            className={`
              transition-opacity
              duration-300

              ${mode === "register"
                ? "opacity-100"
                : "opacity-0 pointer-events-none absolute inset-0"
              }
            `}
          >

            <h2 className="text-3xl font-bold mb-8">
              Create Account
            </h2>

            <form onSubmit={handleRegister} className="space-y-5">

              <div>

                <label className="block text-sm text-gray-500 mb-2">
                  Username
                </label>

                <input
                  type="text"
                  value={regUsername}
                  onChange={(e) => setRegUsername(e.target.value)}
                  required
                  className="
                    w-full
                    border-2
                    border-slate-300
                    rounded-2xl
                    p-4
                    focus:outline-none
                    focus:border-slate-900
                  "
                />

              </div>

              <div>

                <label className="block text-sm text-gray-500 mb-2">
                  Password
                </label>

                <input
                  type="password"
                  value={regPassword}
                  onChange={(e) => setRegPassword(e.target.value)}
                  required
                  className="
                    w-full
                    border-2
                    border-slate-300
                    rounded-2xl
                    p-4
                    focus:outline-none
                    focus:border-slate-900
                  "
                />

              </div>

              <div>

                <label className="block text-sm text-gray-500 mb-2">
                  Confirm Password
                </label>

                <input
                  type="password"
                  value={regConfirmPassword}
                  onChange={(e) => setRegConfirmPassword(e.target.value)}
                  required
                  className="
                    w-full
                    border-2
                    border-slate-300
                    rounded-2xl
                    p-4
                    focus:outline-none
                    focus:border-slate-900
                  "
                />

              </div>

              {regError && (
                <p className="text-red-600 text-sm">
                  {regError}
                </p>
              )}

              <button
                type="submit"
                disabled={registering}
                className={`
                  w-full
                  px-8
                  py-4
                  rounded-2xl
                  text-white
                  transition-all

                  ${registering
                    ? "bg-slate-400 cursor-not-allowed"
                    : "bg-slate-900 hover:bg-slate-800"
                  }
                `}
              >
                {registering ? "Creating Account..." : "Register"}
              </button>

              <p className="text-center text-sm">
                <button
                  type="button"
                  onClick={switchToLogin}
                  className="text-slate-900 font-semibold hover:underline"
                >
                  ← Back to Login
                </button>
              </p>

            </form>

          </div>

        </div>

      </div>

    </div>
  );

}

export default StudentLoginModal;
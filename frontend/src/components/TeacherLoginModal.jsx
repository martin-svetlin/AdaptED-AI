import { useState } from "react";
import { signInWithEmailAndPassword } from "firebase/auth";
import { auth } from "../firebase";

function TeacherLoginModal({ onClose, onSuccess }) {

  const [email, setEmail] = useState("");

  const [password, setPassword] = useState("");

  const [error, setError] = useState("");

  const [submitting, setSubmitting] = useState(false);

  const handleLogin = async (e) => {

    e.preventDefault();

    setError("");

    setSubmitting(true);

    try {

      await signInWithEmailAndPassword(auth, email, password);

      onSuccess();

    } catch (err) {

      if (err.code === "auth/network-request-failed") {
        setError("Unable to connect.");
      } else {
        setError("Invalid email or password.");
      }

    }

    setSubmitting(false);

  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">

      <div className="bg-white rounded-[32px] shadow-xl p-10 w-full max-w-md relative">

        <button
          onClick={onClose}
          className="absolute top-6 right-6 text-2xl hover:text-red-500"
        >
          ✕
        </button>

        <h2 className="text-3xl font-bold mb-8">
          Teacher Login
        </h2>

        <form onSubmit={handleLogin} className="space-y-5">

          <div>

            <label className="block text-sm text-gray-500 mb-2">
              Email
            </label>

            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
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
              value={password}
              onChange={(e) => setPassword(e.target.value)}
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

          {error && (
            <p className="text-red-600 text-sm">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={submitting}
            className={`
              w-full
              px-8
              py-4
              rounded-2xl
              text-white
              transition-all

              ${submitting
                ? "bg-slate-400 cursor-not-allowed"
                : "bg-slate-900 hover:bg-slate-800"
              }
            `}
          >
            {submitting ? "Signing In..." : "Login"}
          </button>

        </form>

      </div>

    </div>
  );

}

export default TeacherLoginModal;
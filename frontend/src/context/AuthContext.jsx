import { createContext, useContext, useEffect, useState } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "../firebase";

const AuthContext = createContext(null);

// The only teacher account. Any other authenticated user is treated as
// a student. This keeps role resolution to a single rule, backed by
// Firebase Authentication as the source of truth - no separate
// Firestore read is needed just to know who someone is.
const ADMIN_EMAIL = "admin@adapted.ai";

export function AuthProvider({ children }) {

  const [user, setUser] = useState(null);

  const [loading, setLoading] = useState(true);

  useEffect(() => {

    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {

      setUser(firebaseUser);

      setLoading(false);

    });

    return unsubscribe;

  }, []);

  const role = user
    ? (user.email === ADMIN_EMAIL ? "teacher" : "student")
    : null;

  const value = { user, role, loading };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );

}

export function useAuth() {
  return useContext(AuthContext);
}
import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

// Wraps a route element and only renders it once we know the visitor is
// logged in and holds the required role. While Firebase is still
// resolving the auth state, a lightweight loading screen is shown
// instead of redirecting - otherwise a logged-in user would be briefly
// bounced to Home on every page refresh before auth catches up.
function ProtectedRoute({ role, children }) {

  const { user, role: userRole, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center">
        <p className="text-gray-500 text-lg">Loading...</p>
      </div>
    );
  }

  if (!user || userRole !== role) {
    return <Navigate to="/" replace />;
  }

  return children;

}

export default ProtectedRoute;
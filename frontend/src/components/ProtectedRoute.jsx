import { Navigate } from "react-router-dom";
import { useEffect } from "react";
import { getToken, startSessionTimer } from "../utils/sessionTimer";

export default function ProtectedRoute({ children }) {
  const token = getToken();

  useEffect(() => {
    startSessionTimer(() => {
      localStorage.removeItem("token");
      sessionStorage.removeItem("token");
      window.location.href = "/login";
    });
  }, []);

  if (!token) {
    return <Navigate to="/login" replace />;
  }

  return children;
}

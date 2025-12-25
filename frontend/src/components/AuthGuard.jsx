import { useEffect } from "react";
import { startSessionTimer } from "../utils/sessionTimer";

export default function AuthGuard({ children }) {
  useEffect(() => {
    startSessionTimer(() => {
      localStorage.removeItem("token");
      sessionStorage.removeItem("token");
      window.location.href = "/login";
    });
  }, []);

  return children;
}

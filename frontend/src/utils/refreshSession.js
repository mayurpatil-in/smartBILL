import api from "../api/axios";
import {
  startSessionTimer,
  clearSession
} from "./sessionTimer";

export async function refreshSession({ onWarning, onExpire }) {
  try {
    const res = await api.post("/auth/refresh");

    const newToken = res.data.access_token;

    // ✅ STORE NEW TOKEN
    if (localStorage.getItem("token")) {
      localStorage.setItem("token", newToken);
    } else {
      sessionStorage.setItem("token", newToken);
    }

    // ✅ RESTART SESSION TIMER
    startSessionTimer({
      warningBeforeMs: 6 * 60 * 1000,
      onWarning,
      onExpire
    });

    console.log("✅ Session extended");

    return true;
  } catch (err) {
    console.error("❌ Failed to refresh session", err);
    clearSession();
    window.location.replace("/login");
    return false;
  }
}

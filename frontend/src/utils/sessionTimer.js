import { API_URL } from "../api/axios";

let listeners = [];
let interval = null;

/**
 * 🔑 Get JWT token
 */
export function getToken() {
  return (
    localStorage.getItem("access_token") ||
    sessionStorage.getItem("access_token")
  );
}

/**
 * ⏱ Extract expiry from JWT
 */
export function getExpiry(token) {
  try {
    return JSON.parse(atob(token.split(".")[1])).exp * 1000;
  } catch {
    return 0;
  }
}

/**
 * ⏳ Remaining session time (ms)
 */
export function getRemainingTime() {
  const token = getToken();
  if (!token) return 0;
  return getExpiry(token) - Date.now();
}

/**
 * 🔔 Subscribe UI components (countdown, warnings)
 */
export function subscribe(cb) {
  listeners.push(cb);
  return () => {
    listeners = listeners.filter(l => l !== cb);
  };
}

/**
 * ▶ START / RESTART SESSION TIMER
 */
export function startTimer() {
  stopTimer();

  interval = setInterval(() => {
    const remaining = getRemainingTime();

    listeners.forEach(cb => cb(remaining));

    if (remaining <= 0) {
      stopTimer();
      clearSession();
      window.location.replace("/login");
    }
  }, 1000);
}

/**
 * ⏹ Stop timer
 */
export function stopTimer() {
  if (interval) {
    clearInterval(interval);
    interval = null;
  }
}

/**
 * 🚪 Clear auth completely
 */
export function clearSession() {
  stopTimer();
  localStorage.removeItem("access_token");
  sessionStorage.removeItem("access_token");
}

/**
 * 🔁 Refresh JWT + restart timer
 */
export async function refreshSession() {
  try {
    const baseURL = API_URL;
    
    const res = await fetch(
      `${baseURL}/auth/refresh`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${getToken()}`,
        },
      }
    );

    if (!res.ok) throw new Error("Refresh failed");

    const data = await res.json();

    // 🔐 Preserve remember-me behavior
    if (localStorage.getItem("access_token")) {
      localStorage.setItem("access_token", data.access_token);
    } else {
      sessionStorage.setItem("access_token", data.access_token);
    }

    startTimer(); // ✅ REQUIRED
  } catch {
    clearSession();
    window.location.replace("/login");
  }
}

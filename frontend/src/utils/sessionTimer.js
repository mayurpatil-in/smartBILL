// src/utils/sessionTimer.js
let listeners = [];
let interval = null;

export function getToken() {
  return localStorage.getItem("token") || sessionStorage.getItem("token");
}

export function getExpiry(token) {
  try {
    return JSON.parse(atob(token.split(".")[1])).exp * 1000;
  } catch {
    return 0;
  }
}

export function getRemainingTime() {
  const token = getToken();
  if (!token) return 0;
  return getExpiry(token) - Date.now();
}

// 🔔 Subscribe UI
export function subscribe(cb) {
  listeners.push(cb);
  return () => {
    listeners = listeners.filter(l => l !== cb);
  };
}

// 🔁 START / RESTART TIMER
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

export function stopTimer() {
  if (interval) clearInterval(interval);
}

export function clearSession() {
  stopTimer();
  localStorage.clear();
  sessionStorage.clear();
}

// 🔁 Refresh token + restart timer
export async function refreshSession() {
  const res = await fetch(
    `${import.meta.env.VITE_API_URL}/auth/refresh`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${getToken()}`
      }
    }
  );

  const data = await res.json();
  localStorage.setItem("token", data.access_token);

  startTimer(); // 🔥 THIS WAS MISSING
}

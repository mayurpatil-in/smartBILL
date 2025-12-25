// 🔐 Get token from storage
export function getToken() {
  return (
    localStorage.getItem("token") ||
    sessionStorage.getItem("token")
  );
}

// ⏳ Decode JWT expiry
export function getTokenExpiry(token) {
  try {
    const payload = JSON.parse(atob(token.split(".")[1]));
    return payload.exp * 1000; // convert to ms
  } catch {
    return null;
  }
}

// ⏱ Remaining time
export function getRemainingTime(token) {
  const expiry = getTokenExpiry(token);
  if (!expiry) return 0;
  return expiry - Date.now();
}

// ❌ CLEAR SESSION (🔥 THIS WAS MISSING)
export function clearSession() {
  localStorage.removeItem("token");
  sessionStorage.removeItem("token");
  localStorage.removeItem("remember");
}

// ⏰ Start auto logout timer
export function startSessionTimer(onExpire) {
  const token = getToken();
  if (!token) return;

  const remaining = getRemainingTime(token);

  if (remaining <= 0) {
    clearSession();
    onExpire();
    return;
  }

  setTimeout(() => {
    clearSession();
    onExpire();
  }, remaining);
}

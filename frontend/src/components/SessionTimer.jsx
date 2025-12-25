import { useEffect, useState } from "react";
import {
  getToken,
  getRemainingTime,
  clearSession,
} from "../utils/sessionTimer";

export default function SessionTimer() {
  const [timeLeft, setTimeLeft] = useState(0);

  useEffect(() => {
    const token = getToken();
    if (!token) return;

    setTimeLeft(getRemainingTime(token));

    const interval = setInterval(() => {
      const remaining = getRemainingTime(token);
      setTimeLeft(remaining);

      if (remaining <= 0) {
        clearSession();
        window.location.href = "/login";
      }
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  if (timeLeft <= 0) return null;

  return (
    <span className="text-xs text-gray-500 dark:text-gray-400">
      Session expires in{" "}
      <strong>{Math.ceil(timeLeft / 60000)} min</strong>
    </span>
  );
}

import { useEffect, useState } from "react";
import { Clock } from "lucide-react";
import { subscribe, startTimer } from "../utils/sessionTimer";

export default function SessionTimer() {
  const [ms, setMs] = useState(0);

  useEffect(() => {
    startTimer();
    return subscribe(setMs);
  }, []);

  if (ms <= 0) return null;

  const minutes = Math.floor(ms / 60000);
  const seconds = Math.floor((ms % 60000) / 1000);
  const isWarning = ms <= 6 * 60 * 1000;

  return (
    <div
      title="Session remaining time"
      className={`
        inline-flex items-center gap-2
        px-3 py-1.5 rounded-full
        text-xs font-medium tabular-nums
        border transition-all
        ${
          isWarning
            ? `
              bg-yellow-100 text-yellow-900 border-yellow-300
              dark:bg-yellow-900/40 dark:text-yellow-200 dark:border-yellow-700
              animate-pulse-soft
            `
            : `
              bg-gray-100 text-gray-600 border-gray-200
              dark:bg-gray-800 dark:text-gray-400 dark:border-gray-700
            `
        }
      `}
    >
      <Clock
        size={14}
        className={`
          ${isWarning ? "text-yellow-700 dark:text-yellow-300" : "opacity-70"}
        `}
      />

      <span className="whitespace-nowrap">
        Session&nbsp;
        <strong>
          {minutes}:{seconds.toString().padStart(2, "0")}
        </strong>
      </span>
    </div>
  );
}

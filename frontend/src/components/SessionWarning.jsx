import { useEffect, useState, useRef } from "react";
import { AlertTriangle, Clock } from "lucide-react";
import { refreshSession, subscribe, getToken } from "../utils/sessionTimer";

export default function SessionWarning() {
  const [show, setShow] = useState(false);
  const [sec, setSec] = useState(0);
  const [bottomOffset, setBottomOffset] = useState(96);

  const warnedRef = useRef(false);
  const dismissedRef = useRef(false);
  const tokenRef = useRef(getToken());

  // 🔹 Detect footer height dynamically
  useEffect(() => {
    const updateOffset = () => {
      const footer = document.getElementById("app-footer");
      if (footer) {
        setBottomOffset(footer.offsetHeight + 12);
      }
    };

    updateOffset();
    window.addEventListener("resize", updateOffset);
    return () => window.removeEventListener("resize", updateOffset);
  }, []);

  // 🔹 Subscribe to session timer
  useEffect(() => {
    return subscribe((ms) => {
      const token = getToken();

      // Reset when token changes
      if (token !== tokenRef.current) {
        tokenRef.current = token;
        warnedRef.current = false;
        dismissedRef.current = false;
      }

      if (ms <= 0) return;

      setSec(Math.floor(ms / 1000));

      if (
        ms <= 6 * 60 * 1000 &&
        !warnedRef.current &&
        !dismissedRef.current
      ) {
        warnedRef.current = true;
        setShow(true);
      }
    });
  }, []);

  if (!show) return null;

  const minutes = Math.floor(sec / 60);
  const seconds = sec % 60;
  const percent = Math.min((sec / (6 * 60)) * 100, 100);

  return (
    <div
      className="
        fixed z-50 animate-slide-up
        inset-x-3
        md:inset-x-auto md:right-6
      "
      style={{ bottom: bottomOffset }}
    >
      <div
        className="
          w-full md:w-80
          rounded-2xl overflow-hidden
          shadow-2xl
          border border-yellow-300 dark:border-yellow-600
          bg-white dark:bg-gray-900
        "
      >
        {/* Header */}
        <div className="flex items-center gap-3 px-5 py-4 bg-gradient-to-r from-yellow-400 to-orange-500 text-white">
          <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
            <AlertTriangle />
          </div>
          <div>
            <h3 className="font-semibold text-sm">
              Session Expiring Soon
            </h3>
            <p className="text-xs opacity-90">
              Security protection active
            </p>
          </div>
        </div>

        {/* Body */}
        <div className="px-5 py-4 text-sm text-gray-700 dark:text-gray-300">
          <div className="flex items-center gap-2 mb-3">
            <Clock size={16} />
            <strong className="text-orange-600 dark:text-orange-400">
              {minutes}:{seconds.toString().padStart(2, "0")}
            </strong>
          </div>

          {/* Progress */}
          <div className="h-2 w-full bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden mb-3">
            <div
              className="h-full bg-orange-500 transition-all"
              style={{ width: `${percent}%` }}
            />
          </div>

          <p className="text-xs text-gray-500 dark:text-gray-400">
            Extend your session to avoid automatic logout.
          </p>
        </div>

        {/* Actions */}
        <div className="px-5 py-4 flex gap-3 bg-gray-50 dark:bg-gray-800">
          <button
            onClick={async () => {
              await refreshSession();
              setShow(false);
            }}
            className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2 rounded-lg font-medium"
          >
            Extend Session
          </button>

          <button
            onClick={() => {
              dismissedRef.current = true;
              setShow(false);
            }}
            className="flex-1 bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 py-2 rounded-lg"
          >
            Dismiss
          </button>
        </div>
      </div>
    </div>
  );
}

import SessionTimer from "./SessionTimer";

export default function Footer() {
  return (
    <footer
      id="app-footer" // 👈 REQUIRED for popup positioning
      className="
        mt-auto w-full
        bg-white dark:bg-gray-800
        border-t border-gray-200 dark:border-gray-700
        px-6 py-4
        relative
      "
    >
      <div
        className="
          flex flex-col md:flex-row
          justify-between items-center
          gap-3 text-sm
        "
      >
        {/* Left */}
        <p className="text-gray-500 dark:text-gray-400 text-center md:text-left text-xs md:text-sm">
          © 2025-{new Date().getFullYear()}{" "}
          <a
            href="https://www.arcneuron.ai"
            target="_blank"
            rel="noopener noreferrer"
            className="
      font-semibold tracking-wide
      text-gray-800 dark:text-gray-200
      hover:text-blue-600 dark:hover:text-blue-400
      transition-colors
    "
          >
            ArcNeuron.ai
          </a>{" "}
          — Thought to Technology
        </p>

        {/* Right */}
        <div className="flex items-center gap-4 flex-wrap justify-center">
          <a
            href="https://www.mayurpatil.in"
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-500 hover:underline"
          >
            www.mayurpatil.in
          </a>

          <span className="text-gray-400">|</span>

          {/* ⏱ Session Timer */}
          <SessionTimer />

          <span className="text-gray-400">|</span>

          <span className="text-gray-500 dark:text-gray-400">v1.0.0</span>
        </div>
      </div>
    </footer>
  );
}

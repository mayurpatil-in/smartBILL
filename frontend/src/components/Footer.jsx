import SessionTimer from "./SessionTimer";

export default function Footer() {
  return (
    <footer
      id="app-footer" // 👈 REQUIRED for popup positioning
      className="
        mt-auto w-full
        bg-white/80 dark:bg-gray-800/80
        backdrop-blur-md
        border-t-2 border-gray-200 dark:border-gray-700
        px-6 py-5
        relative
      "
      style={{
        borderTopColor: "rgb(229, 231, 235)",
      }}
    >
      <div
        className="
          flex flex-col md:flex-row
          justify-between items-center
          gap-3 md:gap-4 text-sm
          max-w-7xl mx-auto
        "
      >
        {/* Left - Copyright (Centered on mobile, left-aligned on desktop) */}
        <div className="flex items-center gap-2 text-center md:text-left flex-wrap justify-center">
          <p className="text-gray-600 dark:text-gray-400 text-xs md:text-sm">
            © 2025-{new Date().getFullYear()}
          </p>
          <a
            href="https://www.arcneuron.ai"
            target="_blank"
            rel="noopener noreferrer"
            className="
              font-bold tracking-wide text-sm md:text-base
              bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600
              bg-clip-text text-transparent
              hover:from-blue-500 hover:via-purple-500 hover:to-pink-500
              transition-all duration-300
              relative
              group
            "
          >
            ArcNeuron.ai
            <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 group-hover:w-full transition-all duration-300"></span>
          </a>
          <span className="text-gray-400 dark:text-gray-500 text-xs md:text-sm">
            — Thought to Technology
          </span>
        </div>

        {/* Right - Links & Info (Single line, centered on mobile) */}
        <div className="flex items-center gap-2 md:gap-4 flex-wrap justify-center">
          {/* Website Link */}
          <a
            href="https://www.mayurpatil.in"
            target="_blank"
            rel="noopener noreferrer"
            className="
              text-xs md:text-sm font-medium
              bg-gradient-to-r from-blue-600 to-purple-600
              bg-clip-text text-transparent
              hover:from-blue-500 hover:to-purple-500
              transition-all duration-300
              relative group
            "
          >
            www.mayurpatil.in
            <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-gradient-to-r from-blue-600 to-purple-600 group-hover:w-full transition-all duration-300"></span>
          </a>

          {/* Separator */}
          <span className="text-gray-300 dark:text-gray-600 text-xs">|</span>

          {/* Session Timer */}
          <div className="px-2 md:px-3 py-1 rounded-lg bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 border border-blue-100 dark:border-blue-900/30">
            <SessionTimer />
          </div>

          {/* Separator */}
          <span className="text-gray-300 dark:text-gray-600 text-xs">|</span>

          {/* Version */}
          <div className="px-2 md:px-3 py-1 rounded-lg bg-gradient-to-r from-gray-50 to-blue-50 dark:from-gray-900 dark:to-blue-900/20 border border-gray-200 dark:border-gray-700">
            <span className="text-xs font-semibold bg-gradient-to-r from-gray-700 to-blue-600 dark:from-gray-300 dark:to-blue-400 bg-clip-text text-transparent">
              v1.0.0
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
}

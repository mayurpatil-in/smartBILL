export default function Footer() {
  return (
    <footer
      className="
        mt-auto w-full
        bg-white dark:bg-gray-800
        border-t border-gray-200 dark:border-gray-700
        px-6 py-4
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
        <p className="text-gray-500 dark:text-gray-400 text-center md:text-left">
          © {new Date().getFullYear()} SmartBill. All rights reserved.
        </p>

        {/* Right */}
        <div className="flex items-center gap-4">
          <a
            href="https://www.mayurpatil.in"
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-500 hover:underline"
          >
            mayurpatil.in
          </a>

          <span className="text-gray-400">|</span>

          <span className="text-gray-500 dark:text-gray-400">
            v1.0.0
          </span>
        </div>
      </div>
    </footer>
  );
}

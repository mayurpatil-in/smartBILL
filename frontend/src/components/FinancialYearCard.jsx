import { useAuth } from "../hooks/useAuth";

export default function FinancialYearCard({ fy, loading, onAddFY }) {
  const { user } = useAuth();

  if (loading) {
    return (
      <div
        className="
          rounded-2xl border border-gray-200 dark:border-gray-800
          p-6 bg-white dark:bg-gray-900
          animate-pulse
        "
      />
    );
  }

  if (!fy) {
    return (
      <div
        className="
          rounded-2xl border border-red-200 dark:border-red-800
          p-6 bg-red-50 dark:bg-red-950
        "
      >
        <p className="text-red-600 dark:text-red-400 font-medium text-sm">
          No Active Financial Year
        </p>

        <button
          onClick={onAddFY}
          className="
            mt-4 px-4 py-2 text-sm rounded-lg
            bg-blue-600 hover:bg-blue-700
            text-white transition
          "
        >
          + Add Financial Year
        </button>
      </div>
    );
  }

  const start = new Date(fy.start_date).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });

  const end = new Date(fy.end_date).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });

  return (
    <div
      className="
        rounded-2xl p-6 shadow-sm
        bg-white dark:bg-gray-900
        border border-gray-200 dark:border-gray-800
      "
    >
      {/* ================= HEADER ================= */}
      <div className="flex justify-between items-start">
        <h3 className="text-sm text-gray-500 dark:text-gray-400">
          Financial Year
        </h3>

        <span
          className="
            px-3 py-1 text-xs rounded-full font-medium
            bg-green-100 text-green-700
            dark:bg-green-900 dark:text-green-300
          "
        >
          Active
        </span>
      </div>

      {/* ================= YEAR ================= */}
      <p className="text-3xl font-bold mt-2 text-gray-900 dark:text-white">
        {new Date(fy.start_date).getFullYear()} –{" "}
        {new Date(fy.end_date).getFullYear()}
      </p>

      {/* ================= COMPANY ================= */}
      <p className="text-sm mt-1 text-gray-600 dark:text-gray-400">
        🏢 {user?.companyName || fy.company_name}
      </p>

      {/* ================= DATE RANGE ================= */}
      <p className="text-sm mt-1 text-gray-500 dark:text-gray-500">
        📅 {start} → {end}
      </p>

      {/* ================= STATUS + ACTION ================= */}
      <div className="mt-4 flex items-center gap-2">
        {!fy.is_locked ? (
          <span
            className="
              px-2 py-1 text-xs rounded
              bg-blue-100 text-blue-700
              dark:bg-blue-900 dark:text-blue-300
            "
          >
            Open
          </span>
        ) : (
          <span
            className="
              px-2 py-1 text-xs rounded
              bg-red-100 text-red-700
              dark:bg-red-900 dark:text-red-300
            "
          >
            Locked
          </span>
        )}

        {!fy.is_locked && (
          <button
            onClick={onAddFY}
            className="
              px-3 py-1 text-xs rounded
              border border-blue-500 dark:border-blue-400
              text-blue-600 dark:text-blue-400
              hover:bg-blue-50 dark:hover:bg-blue-950
              transition
            "
          >
            Change Year
          </button>
        )}
      </div>
    </div>
  );
}

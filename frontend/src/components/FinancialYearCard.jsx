import { useAuth } from "../hooks/useAuth";
import { Calendar, Building2, TrendingUp } from "lucide-react";

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

  const startYear = new Date(fy.start_date).getFullYear();
  const endYear = new Date(fy.end_date).getFullYear();

  // Calculate progress through the financial year
  const startDate = new Date(fy.start_date);
  const endDate = new Date(fy.end_date);
  const today = new Date();
  const totalDays = Math.ceil(
    (endDate.getTime() - startDate.getTime()) / (1000 * 3600 * 24),
  );
  const daysElapsed = Math.ceil(
    (today.getTime() - startDate.getTime()) / (1000 * 3600 * 24),
  );
  const progressPercentage = Math.max(
    0,
    Math.min(100, (daysElapsed / totalDays) * 100),
  );
  const daysRemaining = totalDays - daysElapsed;

  return (
    <div className="relative overflow-hidden rounded-3xl shadow-2xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 hover:shadow-3xl transition-all duration-500 group">
      {/* Premium Background Pattern */}
      <div className="absolute inset-0 bg-gradient-to-br from-blue-50/50 via-cyan-50/30 to-teal-50/50 dark:from-blue-950/20 dark:via-cyan-950/10 dark:to-teal-950/20"></div>
      <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-br from-blue-400/10 to-cyan-400/10 dark:from-blue-500/5 dark:to-cyan-500/5 rounded-full blur-3xl -mr-48 -mt-48 group-hover:scale-110 transition-transform duration-700"></div>

      <div className="relative z-10">
        {/* Header Section */}
        <div className="p-6 sm:p-8 pb-6 border-b border-gray-200/50 dark:border-gray-700/50">
          <div className="flex flex-col sm:flex-row items-start justify-between gap-4 mb-6">
            <div className="flex items-center gap-3 sm:gap-4">
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-br from-blue-500 to-cyan-600 rounded-2xl blur-lg opacity-50"></div>
                <div className="relative p-3 sm:p-4 bg-gradient-to-br from-blue-500 to-cyan-600 rounded-2xl shadow-xl">
                  <TrendingUp size={24} className="sm:w-7 sm:h-7 text-white" />
                </div>
              </div>
              <div>
                <h3 className="text-xl sm:text-2xl font-black bg-gradient-to-r from-gray-900 to-gray-700 dark:from-white dark:to-gray-300 bg-clip-text text-transparent">
                  Financial Year
                </h3>
                <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 mt-1 font-medium">
                  Active accounting period
                </p>
              </div>
            </div>

            <div className="px-4 sm:px-5 py-2 sm:py-2.5 rounded-2xl text-xs sm:text-sm font-black flex items-center gap-2 shadow-xl backdrop-blur-sm border-2 bg-gradient-to-r from-green-500 to-emerald-600 text-white border-green-300 dark:border-green-700 shadow-green-500/30">
              <span className="w-2 h-2 bg-white rounded-full animate-pulse"></span>
              <span>ACTIVE</span>
            </div>
          </div>

          {/* Year Display - Large */}
          <div className="text-center py-4">
            <div className="inline-flex flex-col items-center gap-1.5">
              <span className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest">
                Operating Period
              </span>
              <div className="text-5xl font-black tracking-tight bg-gradient-to-r from-blue-600 via-cyan-600 to-teal-600 dark:from-blue-400 dark:via-cyan-400 dark:to-teal-400 bg-clip-text text-transparent">
                {startYear} – {endYear}
              </div>
              <div className="flex items-center gap-2 text-[10px] text-gray-500 dark:text-gray-400 font-semibold">
                <span>
                  {daysRemaining > 0
                    ? `${daysRemaining} days remaining`
                    : "Period ended"}
                </span>
                <span className="text-gray-300 dark:text-gray-600">•</span>
                <span>{progressPercentage.toFixed(0)}% complete</span>
              </div>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="relative h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden shadow-inner">
            <div
              className="absolute inset-y-0 left-0 rounded-full transition-all duration-1000 ease-out bg-gradient-to-r from-blue-500 via-cyan-500 to-teal-500"
              style={{ width: `${progressPercentage}%` }}
            >
              <div className="absolute inset-0 bg-white/20 animate-pulse"></div>
            </div>
          </div>
        </div>

        {/* Details Grid */}
        <div className="p-6 pt-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {/* Start Date Card */}
            <div className="group/card relative overflow-hidden p-3 bg-gradient-to-br from-white to-blue-50/50 dark:from-gray-800 dark:to-blue-950/20 rounded-xl border-2 border-blue-200/50 dark:border-blue-800/30 hover:border-blue-300 dark:hover:border-blue-700 transition-all shadow-md hover:shadow-lg">
              <div className="absolute top-0 right-0 w-16 h-16 bg-blue-400/10 dark:bg-blue-500/5 rounded-full blur-xl -mr-8 -mt-8 group-hover/card:scale-150 transition-transform duration-500"></div>
              <div className="relative flex items-start gap-3">
                <div className="p-2 bg-gradient-to-br from-blue-500 to-cyan-600 rounded-lg shadow-md shadow-blue-500/30">
                  <Calendar size={16} className="text-white" />
                </div>
                <div className="flex-1">
                  <span className="text-[10px] font-black text-blue-600 dark:text-blue-400 uppercase tracking-widest block mb-1">
                    Start Date
                  </span>
                  <div className="text-sm font-bold text-gray-900 dark:text-white">
                    {start}
                  </div>
                </div>
              </div>
            </div>

            {/* End Date Card */}
            <div className="group/card relative overflow-hidden p-3 bg-gradient-to-br from-white to-cyan-50/50 dark:from-gray-800 dark:to-cyan-950/20 rounded-xl border-2 border-cyan-200/50 dark:border-cyan-800/30 hover:border-cyan-300 dark:hover:border-cyan-700 transition-all shadow-md hover:shadow-lg">
              <div className="absolute top-0 right-0 w-16 h-16 bg-cyan-400/10 dark:bg-cyan-500/5 rounded-full blur-xl -mr-8 -mt-8 group-hover/card:scale-150 transition-transform duration-500"></div>
              <div className="relative flex items-start gap-3">
                <div className="p-2 bg-gradient-to-br from-cyan-500 to-teal-600 rounded-lg shadow-md shadow-cyan-500/30">
                  <Calendar size={16} className="text-white" />
                </div>
                <div className="flex-1">
                  <span className="text-[10px] font-black text-cyan-600 dark:text-cyan-400 uppercase tracking-widest block mb-1">
                    End Date
                  </span>
                  <div className="text-sm font-bold text-gray-900 dark:text-white">
                    {end}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Status and Action */}
          <div className="mt-4 flex items-center gap-2">
            {!fy.is_locked ? (
              <>
                <span className="px-3 py-1.5 text-[10px] font-black rounded-lg bg-gradient-to-r from-blue-100 to-cyan-100 text-blue-700 dark:from-blue-900/30 dark:to-cyan-900/30 dark:text-blue-300 border-2 border-blue-200 dark:border-blue-800 shadow-sm">
                  OPEN
                </span>
                <button
                  onClick={onAddFY}
                  className="flex-1 px-3 sm:px-4 py-2 text-xs font-bold rounded-lg bg-gradient-to-r from-blue-500 to-cyan-600 text-white hover:from-blue-600 hover:to-cyan-700 shadow-md shadow-blue-500/30 hover:shadow-lg hover:shadow-blue-500/40 transition-all duration-300 flex items-center justify-center gap-1.5"
                >
                  <svg
                    className="w-3 h-3 sm:w-4 sm:h-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4"
                    />
                  </svg>
                  <span className="hidden xs:inline sm:inline">
                    Change Financial Year
                  </span>
                  <span className="xs:hidden sm:hidden">Change FY</span>
                </button>
              </>
            ) : (
              <div className="w-full p-4 bg-gradient-to-r from-red-50 to-rose-50 dark:from-red-950/30 dark:to-rose-950/30 border-2 border-red-200 dark:border-red-800 rounded-xl flex items-center gap-3">
                <div className="p-2 bg-red-100 dark:bg-red-900/30 rounded-lg">
                  <svg
                    className="w-5 h-5 text-red-600 dark:text-red-400"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z"
                      clipRule="evenodd"
                    />
                  </svg>
                </div>
                <div>
                  <p className="text-sm font-bold text-red-900 dark:text-red-200">
                    Financial Year Locked
                  </p>
                  <p className="text-xs text-red-700 dark:text-red-300 mt-0.5">
                    This period is closed and cannot be modified
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

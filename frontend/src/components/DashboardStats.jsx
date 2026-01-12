import React from "react";
import {
  TrendingUp,
  TrendingDown,
  IndianRupee,
  Wallet,
  ArrowUpRight,
  ArrowDownRight,
  Activity,
  Sparkles,
} from "lucide-react";

const formatCurrency = (amount) => {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(amount || 0);
};

const StatCard = ({ title, value, icon: Icon, color, trend, index }) => {
  const colorStyles = {
    green: {
      gradient: "from-emerald-500 via-green-500 to-teal-500",
      bg: "bg-emerald-50 dark:bg-emerald-900/20",
      text: "text-emerald-600 dark:text-emerald-400",
      border: "border-emerald-200 dark:border-emerald-800",
      glow: "group-hover:shadow-emerald-500/50",
    },
    orange: {
      gradient: "from-amber-500 via-orange-500 to-red-500",
      bg: "bg-orange-50 dark:bg-orange-900/20",
      text: "text-orange-600 dark:text-orange-400",
      border: "border-orange-200 dark:border-orange-800",
      glow: "group-hover:shadow-orange-500/50",
    },
    blue: {
      gradient: "from-blue-500 via-indigo-500 to-purple-500",
      bg: "bg-blue-50 dark:bg-blue-900/20",
      text: "text-blue-600 dark:text-blue-400",
      border: "border-blue-200 dark:border-blue-800",
      glow: "group-hover:shadow-blue-500/50",
    },
    purple: {
      gradient: "from-violet-500 via-purple-500 to-fuchsia-500",
      bg: "bg-purple-50 dark:bg-purple-900/20",
      text: "text-purple-600 dark:text-purple-400",
      border: "border-purple-200 dark:border-purple-800",
      glow: "group-hover:shadow-purple-500/50",
    },
  };

  const style = colorStyles[color] || colorStyles.blue;

  return (
    <div
      className={`group relative overflow-hidden rounded-2xl p-6 
        bg-white dark:bg-gray-800 
        border-2 ${style.border}
        shadow-lg hover:shadow-2xl ${style.glow}
        transition-all duration-300 ease-out
        hover:-translate-y-2 hover:scale-[1.02]
        animate-scale-in cursor-pointer`}
      style={{ animationDelay: `${index * 100}ms` }}
    >
      {/* Gradient Background Overlay */}
      <div
        className={`absolute inset-0 bg-gradient-to-br ${style.gradient} opacity-0 group-hover:opacity-5 transition-opacity duration-300`}
      />

      {/* Decorative Corner Accent */}
      <div
        className={`absolute -top-8 -right-8 w-24 h-24 bg-gradient-to-br ${style.gradient} opacity-10 rounded-full blur-2xl group-hover:opacity-20 transition-opacity duration-300`}
      />

      <div className="relative z-10">
        <div className="flex justify-between items-start mb-4">
          <div className="flex-1">
            <p className="text-sm font-semibold text-gray-500 dark:text-gray-400 mb-2 uppercase tracking-wider">
              {title}
            </p>
            <h3
              className={`text-3xl font-bold text-gray-900 dark:text-white tracking-tight tabular-nums animate-count-up`}
            >
              {formatCurrency(value)}
            </h3>
          </div>

          {/* Icon with Gradient Background */}
          <div
            className={`p-4 rounded-2xl bg-gradient-to-br ${style.gradient} 
              shadow-lg group-hover:shadow-xl group-hover:scale-110 
              transition-all duration-300`}
          >
            <Icon size={28} className="text-white" />
          </div>
        </div>

        {/* Trend Indicator */}
        {trend !== undefined && trend !== null && (
          <div className="flex items-center gap-2 mt-4 pt-4 border-t border-gray-100 dark:border-gray-700">
            {trend > 0 ? (
              <span className="flex items-center text-xs font-bold text-green-600 dark:text-green-400 bg-green-100 dark:bg-green-900/30 px-3 py-1.5 rounded-full">
                <ArrowUpRight size={14} className="mr-1" />+{trend}%
              </span>
            ) : trend < 0 ? (
              <span className="flex items-center text-xs font-bold text-red-600 dark:text-red-400 bg-red-100 dark:bg-red-900/30 px-3 py-1.5 rounded-full">
                <ArrowDownRight size={14} className="mr-1" />
                {trend}%
              </span>
            ) : (
              <span className="flex items-center text-xs font-bold text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-gray-700/30 px-3 py-1.5 rounded-full">
                <Activity size={14} className="mr-1" />
                0%
              </span>
            )}
            <span className="text-xs text-gray-500 dark:text-gray-400 font-medium">
              vs last period
            </span>
          </div>
        )}

        {/* Decorative Bottom Icon */}
        <div
          className={`absolute -bottom-6 -right-6 opacity-5 pointer-events-none`}
        >
          <Icon size={100} className={style.text} />
        </div>
      </div>
    </div>
  );
};

const LoadingSkeleton = ({ index }) => (
  <div
    className="h-40 bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-800 dark:to-gray-700 rounded-2xl relative overflow-hidden"
    style={{ animationDelay: `${index * 100}ms` }}
  >
    <div className="absolute inset-0 animate-shimmer" />
  </div>
);

export default function DashboardStats({ stats, loading }) {
  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[0, 1, 2, 3].map((i) => (
          <LoadingSkeleton key={i} index={i} />
        ))}
      </div>
    );
  }

  // Calculate trends (placeholder - you can implement real trend calculation)
  const calculateTrend = (current, previous) => {
    if (!previous || previous === 0) return 0;
    return Math.round(((current - previous) / previous) * 100);
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      <StatCard
        title="Total Revenue"
        value={stats?.revenue}
        icon={IndianRupee}
        color="green"
        trend={12} // Replace with real trend data
        index={0}
      />
      <StatCard
        title="Total Receivables"
        value={stats?.receivables}
        icon={Wallet}
        color="orange"
        trend={-5} // Replace with real trend data
        index={1}
      />
      <StatCard
        title="Total Expenses"
        value={stats?.expenses}
        icon={TrendingDown}
        color="blue"
        trend={8} // Replace with real trend data
        index={2}
      />
      <StatCard
        title="Net Income"
        value={stats?.net_income}
        icon={Activity}
        color="purple"
        trend={15} // Replace with real trend data
        index={3}
      />
    </div>
  );
}

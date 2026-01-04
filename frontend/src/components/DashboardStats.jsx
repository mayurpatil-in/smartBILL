import React from "react";
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  IndianRupee,
  Wallet,
  ArrowUpRight,
  ArrowDownRight,
  Activity,
} from "lucide-react";

const formatCurrency = (amount) => {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(amount || 0);
};

const StatCard = ({ title, value, icon: Icon, color, trend }) => {
  const colorStyles = {
    blue: "bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400 border-blue-100 dark:border-blue-800",
    green:
      "bg-green-50 text-green-600 dark:bg-green-900/20 dark:text-green-400 border-green-100 dark:border-green-800",
    orange:
      "bg-orange-50 text-orange-600 dark:bg-orange-900/20 dark:text-orange-400 border-orange-100 dark:border-orange-800",
    purple:
      "bg-purple-50 text-purple-600 dark:bg-purple-900/20 dark:text-purple-400 border-purple-100 dark:border-purple-800",
  };

  const bgStyle = colorStyles[color] || colorStyles.blue;

  return (
    <div
      className={`relative overflow-hidden rounded-2xl p-6 bg-white dark:bg-gray-800 shadow-sm border border-gray-100 dark:border-gray-700 hover:shadow-md transition-shadow duration-300`}
    >
      <div className="flex justify-between items-start">
        <div>
          <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">
            {title}
          </p>
          <h3 className="text-2xl font-bold text-gray-900 dark:text-white tracking-tight">
            {formatCurrency(value)}
          </h3>
        </div>
        <div className={`p-3 rounded-xl ${bgStyle}`}>
          <Icon size={24} />
        </div>
      </div>

      {/* Decorative background element */}
      <div
        className={`absolute -bottom-4 -right-4 opacity-5 pointer-events-none`}
      >
        <Icon size={80} />
      </div>

      {trend && (
        <div className="mt-4 flex items-center gap-2">
          {trend > 0 ? (
            <span className="flex items-center text-xs font-semibold text-green-600 bg-green-100 dark:bg-green-900/30 px-2 py-0.5 rounded-full">
              <ArrowUpRight size={14} className="mr-1" /> +{trend}%
            </span>
          ) : (
            <span className="flex items-center text-xs font-semibold text-red-600 bg-red-100 dark:bg-red-900/30 px-2 py-0.5 rounded-full">
              <ArrowDownRight size={14} className="mr-1" /> {trend}%
            </span>
          )}
          <span className="text-xs text-gray-400">vs last period</span>
        </div>
      )}
    </div>
  );
};

export default function DashboardStats({ stats, loading }) {
  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="h-32 bg-gray-100 dark:bg-gray-800 rounded-2xl animate-pulse"
          ></div>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      <StatCard
        title="Total Revenue"
        value={stats?.revenue}
        icon={IndianRupee}
        color="green"
        // trend={12} // Placeholder for real trend
      />
      <StatCard
        title="Total Receivables"
        value={stats?.receivables}
        icon={Wallet}
        color="orange"
      />
      <StatCard
        title="Total Expenses"
        value={stats?.expenses}
        icon={TrendingDown}
        color="blue"
      />
      <StatCard
        title="Net Income"
        value={stats?.net_income}
        icon={Activity}
        color="purple"
      />
    </div>
  );
}

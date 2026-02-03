import React from "react";
import {
  TrendingUp,
  TrendingDown,
  IndianRupee,
  AlertTriangle,
  Calendar,
} from "lucide-react";

const CashFlowProjection = ({ projectionData, loading }) => {
  if (loading) {
    return (
      <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl border-2 border-gray-200 dark:border-gray-700 shadow-lg">
        <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
          Cash Flow Projection
        </h3>
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-24 bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-900 dark:to-gray-800 rounded-xl relative overflow-hidden animate-pulse"
            />
          ))}
        </div>
      </div>
    );
  }

  if (!projectionData) {
    return null;
  }

  const periods = [
    { days: 30, data: projectionData.period_30_days, label: "30 Days" },
    { days: 60, data: projectionData.period_60_days, label: "60 Days" },
    { days: 90, data: projectionData.period_90_days, label: "90 Days" },
  ];

  const getStatusColor = (balance) => {
    if (balance < 0) return "text-red-600";
    if (balance < 100000) return "text-orange-600";
    return "text-green-600";
  };

  const getStatusIcon = (balance) => {
    if (balance < 0) return <TrendingDown className="text-red-600" size={20} />;
    return <TrendingUp className="text-green-600" size={20} />;
  };

  const hasNegativeProjection = periods.some(
    (p) => p.data.projected_balance < 0,
  );

  return (
    <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl border-2 border-gray-200 dark:border-gray-700 shadow-lg hover:shadow-xl transition-shadow duration-300">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
          <IndianRupee size={24} className="text-green-600" />
          Cash Flow Projection
        </h3>
        {projectionData.cash_runway_days && (
          <div className="text-sm text-gray-600 dark:text-gray-400 flex items-center gap-1">
            <Calendar size={16} />
            <span>
              Runway: <strong>{projectionData.cash_runway_days} days</strong>
            </span>
          </div>
        )}
      </div>

      {/* Current Cash */}
      <div className="mb-6 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-xl border-2 border-blue-200 dark:border-blue-800">
        <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">
          Current Cash Position
        </div>
        <div
          className={`text-3xl font-bold ${getStatusColor(projectionData.current_cash)}`}
        >
          ₹
          {projectionData.current_cash.toLocaleString("en-IN", {
            maximumFractionDigits: 2,
          })}
        </div>
      </div>

      {/* Warning Alert */}
      {hasNegativeProjection && (
        <div className="mb-4 p-4 bg-red-50 dark:bg-red-900/20 border-l-4 border-red-500 rounded-lg">
          <div className="flex items-start gap-3">
            <AlertTriangle
              className="text-red-600 flex-shrink-0 mt-0.5"
              size={20}
            />
            <div>
              <p className="text-sm font-semibold text-red-800 dark:text-red-200">
                Cash Flow Warning
              </p>
              <p className="text-xs text-red-700 dark:text-red-300 mt-1">
                Projected negative cash flow detected. Review upcoming expenses
                and accelerate collections.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Projection Timeline */}
      <div className="space-y-4">
        {periods.map((period, index) => {
          const isNegative = period.data.projected_balance < 0;

          return (
            <div
              key={period.days}
              className={`relative p-4 rounded-xl border-2 transition-all duration-300 hover:shadow-md
                ${
                  isNegative
                    ? "bg-red-50 dark:bg-red-900/20 border-red-300 dark:border-red-700"
                    : "bg-gray-50 dark:bg-gray-700/30 border-gray-200 dark:border-gray-700"
                }
                animate-slide-in-right`}
              style={{ animationDelay: `${index * 100}ms` }}
            >
              {/* Period Header */}
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold text-gray-700 dark:text-gray-300">
                    {period.label}
                  </span>
                  <span className="text-xs text-gray-500">
                    (
                    {new Date(period.data.period_end_date).toLocaleDateString()}
                    )
                  </span>
                </div>
                {getStatusIcon(period.data.projected_balance)}
              </div>

              {/* Metrics Grid */}
              <div className="grid grid-cols-3 gap-3 mb-3">
                <div>
                  <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">
                    Expected Income
                  </div>
                  <div className="text-sm font-bold text-green-600">
                    +₹
                    {period.data.expected_income.toLocaleString("en-IN", {
                      maximumFractionDigits: 2,
                    })}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">
                    Expected Expense
                  </div>
                  <div className="text-sm font-bold text-red-600">
                    -₹
                    {period.data.expected_expense.toLocaleString("en-IN", {
                      maximumFractionDigits: 2,
                    })}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">
                    Net Change
                  </div>
                  <div
                    className={`text-sm font-bold ${
                      period.data.expected_income -
                        period.data.expected_expense >=
                      0
                        ? "text-green-600"
                        : "text-red-600"
                    }`}
                  >
                    {period.data.expected_income -
                      period.data.expected_expense >=
                    0
                      ? "+"
                      : ""}
                    ₹
                    {(
                      period.data.expected_income - period.data.expected_expense
                    ).toLocaleString("en-IN", { maximumFractionDigits: 2 })}
                  </div>
                </div>
              </div>

              {/* Projected Balance */}
              <div className="pt-3 border-t-2 border-gray-200 dark:border-gray-600">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                    Projected Balance:
                  </span>
                  <span
                    className={`text-lg font-bold ${getStatusColor(period.data.projected_balance)}`}
                  >
                    ₹
                    {period.data.projected_balance.toLocaleString("en-IN", {
                      maximumFractionDigits: 2,
                    })}
                  </span>
                </div>
              </div>

              {/* Progress Bar */}
              <div className="mt-3">
                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${
                      isNegative
                        ? "bg-gradient-to-r from-red-500 to-red-600"
                        : "bg-gradient-to-r from-green-500 to-green-600"
                    }`}
                    style={{
                      width: `${Math.min((Math.abs(period.data.projected_balance) / Math.abs(projectionData.current_cash)) * 100, 100)}%`,
                    }}
                  />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Footer Note */}
      <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
        <p className="text-xs text-gray-600 dark:text-gray-400">
          <strong>Note:</strong> Projections are based on due invoices and
          historical expense averages. Actual results may vary based on payment
          timing and unexpected expenses.
        </p>
      </div>
    </div>
  );
};

export default CashFlowProjection;

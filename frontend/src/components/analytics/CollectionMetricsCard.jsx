import React from "react";
import { Target, TrendingUp, TrendingDown, Clock } from "lucide-react";

const CollectionMetricsCard = ({ metrics, loading }) => {
  if (loading) {
    return (
      <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl border-2 border-gray-200 dark:border-gray-700 shadow-lg">
        <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
          Collection Metrics
        </h3>
        <div className="grid grid-cols-2 gap-4">
          {[1, 2].map((i) => (
            <div
              key={i}
              className="h-32 bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-900 dark:to-gray-800 rounded-xl relative overflow-hidden animate-pulse"
            />
          ))}
        </div>
      </div>
    );
  }

  if (!metrics) {
    return null;
  }

  const dsoStatus =
    metrics.days_sales_outstanding <= metrics.target_dso ? "good" : "warning";
  const ceiStatus =
    metrics.collection_effectiveness_index >= metrics.target_cei
      ? "good"
      : "warning";

  const getProgressColor = (status) => {
    return status === "good"
      ? "from-green-500 to-emerald-600"
      : "from-orange-500 to-red-600";
  };

  const getIcon = (status) => {
    return status === "good" ? (
      <TrendingUp size={20} />
    ) : (
      <TrendingDown size={20} />
    );
  };

  return (
    <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl border-2 border-gray-200 dark:border-gray-700 shadow-lg hover:shadow-xl transition-shadow duration-300">
      <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
        <Target size={24} className="text-indigo-600" />
        Collection Metrics
      </h3>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Days Sales Outstanding (DSO) */}
        <div className="p-4 bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-xl border-2 border-blue-200 dark:border-blue-800">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">
              Days Sales Outstanding
            </span>
            <div
              className={
                dsoStatus === "good" ? "text-green-600" : "text-orange-600"
              }
            >
              {getIcon(dsoStatus)}
            </div>
          </div>

          <div className="flex items-baseline gap-2 mb-2">
            <span className="text-3xl font-bold text-gray-900 dark:text-white">
              {metrics.days_sales_outstanding}
            </span>
            <span className="text-sm text-gray-500">days</span>
          </div>

          <div className="mb-3">
            <div className="flex items-center justify-between text-xs text-gray-600 dark:text-gray-400 mb-1">
              <span>Target: {metrics.target_dso} days</span>
              <span>
                {dsoStatus === "good" ? (
                  <span className="text-green-600 font-semibold">
                    ✓ {metrics.target_dso - metrics.days_sales_outstanding}{" "}
                    under
                  </span>
                ) : (
                  <span className="text-orange-600 font-semibold">
                    ↑ {metrics.days_sales_outstanding - metrics.target_dso} over
                  </span>
                )}
              </span>
            </div>
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 overflow-hidden">
              <div
                className={`h-full bg-gradient-to-r ${getProgressColor(dsoStatus)} rounded-full transition-all duration-500`}
                style={{
                  width: `${Math.min((metrics.days_sales_outstanding / metrics.target_dso) * 100, 100)}%`,
                }}
              />
            </div>
          </div>

          <p className="text-xs text-gray-600 dark:text-gray-400">
            Average time to collect payment
          </p>
        </div>

        {/* Collection Effectiveness Index (CEI) */}
        <div className="p-4 bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 rounded-xl border-2 border-purple-200 dark:border-purple-800">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">
              Collection Effectiveness
            </span>
            <div
              className={
                ceiStatus === "good" ? "text-green-600" : "text-orange-600"
              }
            >
              {getIcon(ceiStatus)}
            </div>
          </div>

          <div className="flex items-baseline gap-2 mb-2">
            <span className="text-3xl font-bold text-gray-900 dark:text-white">
              {metrics.collection_effectiveness_index}
            </span>
            <span className="text-sm text-gray-500">%</span>
          </div>

          <div className="mb-3">
            <div className="flex items-center justify-between text-xs text-gray-600 dark:text-gray-400 mb-1">
              <span>Target: {metrics.target_cei}%</span>
              <span>
                {ceiStatus === "good" ? (
                  <span className="text-green-600 font-semibold">
                    ✓{" "}
                    {metrics.collection_effectiveness_index -
                      metrics.target_cei}{" "}
                    above
                  </span>
                ) : (
                  <span className="text-orange-600 font-semibold">
                    ↓{" "}
                    {metrics.target_cei -
                      metrics.collection_effectiveness_index}{" "}
                    below
                  </span>
                )}
              </span>
            </div>
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 overflow-hidden">
              <div
                className={`h-full bg-gradient-to-r ${getProgressColor(ceiStatus)} rounded-full transition-all duration-500`}
                style={{
                  width: `${Math.min(metrics.collection_effectiveness_index, 100)}%`,
                }}
              />
            </div>
          </div>

          <p className="text-xs text-gray-600 dark:text-gray-400">
            Percentage of receivables collected
          </p>
        </div>
      </div>

      {/* Average Payment Delay */}
      <div className="mt-4 p-4 bg-gray-50 dark:bg-gray-700/30 rounded-xl">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Clock size={18} className="text-gray-600 dark:text-gray-400" />
            <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">
              Average Payment Delay
            </span>
          </div>
          <div className="text-right">
            <span className="text-xl font-bold text-gray-900 dark:text-white">
              {metrics.avg_payment_delay_days}
            </span>
            <span className="text-sm text-gray-500 ml-1">days</span>
          </div>
        </div>
        <p className="text-xs text-gray-600 dark:text-gray-400 mt-2">
          Average delay beyond due date
        </p>
      </div>
    </div>
  );
};

export default CollectionMetricsCard;

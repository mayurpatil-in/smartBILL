import React from "react";
import { AlertTriangle, Clock, AlertCircle, X } from "lucide-react";
import { useNavigate } from "react-router-dom";

const OverdueInvoicesAlert = ({ overdueData, loading, onDismiss }) => {
  const navigate = useNavigate();

  if (loading) {
    return (
      <div className="bg-gradient-to-r from-orange-50 to-red-50 dark:from-orange-900/20 dark:to-red-900/20 border-l-4 border-orange-500 p-4 rounded-lg shadow-lg animate-pulse">
        <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-1/3 mb-2"></div>
        <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-2/3"></div>
      </div>
    );
  }

  if (!overdueData || overdueData.total_count === 0) {
    return null; // Don't show if no overdue invoices
  }

  const getSeverity = () => {
    if (overdueData.total_overdue > 500000) return "critical";
    if (overdueData.total_overdue > 100000) return "warning";
    return "info";
  };

  const severity = getSeverity();

  const severityConfig = {
    critical: {
      bgColor: "from-red-50 to-red-100 dark:from-red-900/30 dark:to-red-800/30",
      borderColor: "border-red-500",
      iconColor: "text-red-600",
      textColor: "text-red-800 dark:text-red-200",
      icon: AlertTriangle,
    },
    warning: {
      bgColor:
        "from-orange-50 to-orange-100 dark:from-orange-900/30 dark:to-orange-800/30",
      borderColor: "border-orange-500",
      iconColor: "text-orange-600",
      textColor: "text-orange-800 dark:text-orange-200",
      icon: AlertCircle,
    },
    info: {
      bgColor:
        "from-yellow-50 to-yellow-100 dark:from-yellow-900/30 dark:to-yellow-800/30",
      borderColor: "border-yellow-500",
      iconColor: "text-yellow-600",
      textColor: "text-yellow-800 dark:text-yellow-200",
      icon: Clock,
    },
  };

  const config = severityConfig[severity];
  const Icon = config.icon;

  // Get most critical bucket (90+ days)
  const criticalBucket = overdueData.aging_buckets.find(
    (b) => b.bucket === "90+ Days",
  );
  const hasCritical = criticalBucket && criticalBucket.count > 0;

  return (
    <div
      className={`relative bg-gradient-to-r ${config.bgColor} border-l-4 ${config.borderColor} p-5 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 animate-slide-in-down`}
    >
      {/* Dismiss Button */}
      {onDismiss && (
        <button
          onClick={onDismiss}
          className="absolute top-3 right-3 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors"
        >
          <X size={20} />
        </button>
      )}

      <div className="flex items-start gap-4">
        {/* Icon */}
        <div className={`flex-shrink-0 ${config.iconColor} animate-pulse`}>
          <Icon size={32} />
        </div>

        {/* Content */}
        <div className="flex-1">
          <div className="flex items-center justify-between mb-2">
            <h4 className={`text-lg font-bold ${config.textColor}`}>
              {hasCritical ? "🚨 Critical: " : "⚠️ "}
              Overdue Invoices Alert
            </h4>
          </div>

          <p className={`text-sm ${config.textColor} mb-3`}>
            You have <strong>{overdueData.total_count} invoices</strong> overdue
            totaling{" "}
            <strong className="text-lg">
              ₹{overdueData.total_overdue.toLocaleString()}
            </strong>
          </p>

          {/* Aging Breakdown */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-2 mb-3">
            {overdueData.aging_buckets.map(
              (bucket) =>
                bucket.count > 0 && (
                  <div
                    key={bucket.bucket}
                    className="bg-white/50 dark:bg-gray-800/50 rounded-lg p-2 text-center"
                  >
                    <div className="text-xs text-gray-600 dark:text-gray-400 mb-1">
                      {bucket.bucket}
                    </div>
                    <div className="font-bold text-sm text-gray-900 dark:text-white">
                      {bucket.count}
                    </div>
                    <div className="text-xs text-gray-500">
                      ₹{(bucket.amount / 1000).toFixed(0)}k
                    </div>
                  </div>
                ),
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => navigate("/invoices")}
              className={`px-4 py-2 bg-white dark:bg-gray-800 ${config.textColor} font-semibold rounded-lg shadow hover:shadow-md transition-all duration-200 text-sm flex items-center gap-2`}
            >
              <Clock size={16} />
              View Overdue Invoices
            </button>
            <button
              onClick={() => navigate("/payments")}
              className="px-4 py-2 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 font-semibold rounded-lg shadow hover:shadow-md transition-all duration-200 text-sm"
            >
              Record Payment
            </button>
          </div>

          {/* Critical Warning */}
          {hasCritical && (
            <div className="mt-3 p-3 bg-red-100 dark:bg-red-900/40 rounded-lg border border-red-300 dark:border-red-700">
              <p className="text-sm font-semibold text-red-800 dark:text-red-200">
                ⚠️ {criticalBucket.count} invoices are overdue by 90+ days (₹
                {criticalBucket.amount.toLocaleString()})
              </p>
              <p className="text-xs text-red-700 dark:text-red-300 mt-1">
                Immediate action required to avoid bad debt
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default OverdueInvoicesAlert;

import React from "react";
import { Calendar, CheckCircle2, AlertCircle, Clock } from "lucide-react";

export default function SubscriptionCard({ company, loading }) {
  if (loading) {
    return (
      <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 animate-pulse">
        <div className="h-6 w-1/3 bg-gray-200 dark:bg-gray-700 rounded mb-4"></div>
        <div className="space-y-3">
          <div className="h-4 w-full bg-gray-200 dark:bg-gray-700 rounded"></div>
          <div className="h-4 w-2/3 bg-gray-200 dark:bg-gray-700 rounded"></div>
        </div>
      </div>
    );
  }

  if (!company) return null;

  const startDate = new Date(company.subscription_start);
  const endDate = new Date(company.subscription_end);
  const today = new Date();

  // Calculate days remaining
  const timeDiff = endDate.getTime() - today.getTime();
  const daysRemaining = Math.ceil(timeDiff / (1000 * 3600 * 24));

  const isExpired = daysRemaining < 0;
  const isWarning = daysRemaining <= 7 && !isExpired;

  return (
    <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 h-full relative overflow-hidden">
      {/* Background Decorative Blob */}
      <div className="absolute top-0 right-0 -mt-4 -mr-4 w-24 h-24 bg-blue-500/10 rounded-full blur-2xl"></div>

      <div className="relative z-10">
        <div className="flex justify-between items-start mb-6">
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
              <Clock size={20} className="text-blue-500" />
              Subscription Details
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              Your current plan status and duration
            </p>
          </div>

          <div
            className={`px-3 py-1 rounded-full text-xs font-medium flex items-center gap-1.5 ${
              isExpired
                ? "bg-red-50 text-red-600 dark:bg-red-900/20 dark:text-red-400"
                : isWarning
                ? "bg-orange-50 text-orange-600 dark:bg-orange-900/20 dark:text-orange-400"
                : "bg-green-50 text-green-600 dark:bg-green-900/20 dark:text-green-400"
            }`}
          >
            {isExpired ? (
              <>
                <AlertCircle size={14} /> EXPIRED
              </>
            ) : (
              <>
                <CheckCircle2 size={14} /> ACTIVE
              </>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-xl border border-gray-100 dark:border-gray-700">
            <span className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider block mb-1">
              Start Date
            </span>
            <div className="flex items-center gap-2 text-gray-900 dark:text-gray-200 font-medium">
              <Calendar size={16} className="text-gray-400" />
              {startDate.toLocaleDateString("en-IN", {
                day: "numeric",
                month: "short",
                year: "numeric",
              })}
            </div>
          </div>

          <div className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-xl border border-gray-100 dark:border-gray-700">
            <span className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider block mb-1">
              End Date
            </span>
            <div className="flex items-center gap-2 text-gray-900 dark:text-gray-200 font-medium">
              <Calendar size={16} className="text-gray-400" />
              {endDate.toLocaleDateString("en-IN", {
                day: "numeric",
                month: "short",
                year: "numeric",
              })}
            </div>
          </div>

          <div className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-xl border border-gray-100 dark:border-gray-700">
            <span className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider block mb-1">
              Duration Left
            </span>
            <div
              className={`text-xl font-bold ${
                isExpired
                  ? "text-red-500"
                  : isWarning
                  ? "text-orange-500"
                  : "text-blue-600 dark:text-blue-400"
              }`}
            >
              {daysRemaining > 0 ? `${daysRemaining} Days` : "Overview"}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

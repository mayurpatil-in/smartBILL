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

  // Calculate total subscription days and progress
  const totalDays = Math.ceil(
    (endDate.getTime() - startDate.getTime()) / (1000 * 3600 * 24),
  );
  const daysElapsed = totalDays - daysRemaining;
  const progressPercentage = Math.max(
    0,
    Math.min(100, (daysElapsed / totalDays) * 100),
  );

  return (
    <div className="relative overflow-hidden rounded-3xl shadow-2xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 hover:shadow-3xl transition-all duration-500 group">
      {/* Premium Background Pattern */}
      <div className="absolute inset-0 bg-gradient-to-br from-indigo-50/50 via-purple-50/30 to-pink-50/50 dark:from-indigo-950/20 dark:via-purple-950/10 dark:to-pink-950/20"></div>
      <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-br from-indigo-400/10 to-purple-400/10 dark:from-indigo-500/5 dark:to-purple-500/5 rounded-full blur-3xl -mr-48 -mt-48 group-hover:scale-110 transition-transform duration-700"></div>

      <div className="relative z-10">
        {/* Header Section */}
        <div className="p-6 sm:p-8 pb-6 border-b border-gray-200/50 dark:border-gray-700/50">
          <div className="flex flex-col sm:flex-row items-start justify-between gap-4 mb-6">
            <div className="flex items-center gap-3 sm:gap-4">
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl blur-lg opacity-50"></div>
                <div className="relative p-3 sm:p-4 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl shadow-xl">
                  <Clock size={24} className="sm:w-7 sm:h-7 text-white" />
                </div>
              </div>
              <div>
                <h3 className="text-xl sm:text-2xl font-black bg-gradient-to-r from-gray-900 to-gray-700 dark:from-white dark:to-gray-300 bg-clip-text text-transparent">
                  Subscription Plan
                </h3>
                <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 mt-1 font-medium">
                  Active license management
                </p>
              </div>
            </div>

            <div
              className={`px-4 sm:px-5 py-2 sm:py-2.5 rounded-2xl text-xs sm:text-sm font-black flex items-center gap-2 shadow-xl backdrop-blur-sm border-2 ${
                isExpired
                  ? "bg-gradient-to-r from-red-500 to-rose-600 text-white border-red-300 dark:border-red-700 shadow-red-500/30"
                  : isWarning
                    ? "bg-gradient-to-r from-orange-500 to-amber-600 text-white border-orange-300 dark:border-orange-700 shadow-orange-500/30 animate-pulse"
                    : "bg-gradient-to-r from-green-500 to-emerald-600 text-white border-green-300 dark:border-green-700 shadow-green-500/30"
              }`}
            >
              {isExpired ? (
                <>
                  <AlertCircle size={16} className="sm:w-[18px] sm:h-[18px]" />
                  <span>EXPIRED</span>
                </>
              ) : (
                <>
                  <CheckCircle2 size={16} className="sm:w-[18px] sm:h-[18px]" />
                  <span>ACTIVE</span>
                </>
              )}
            </div>
          </div>

          {/* Days Remaining - Large Display */}
          <div className="text-center py-4">
            <div className="inline-flex flex-col items-center gap-1.5">
              <span className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest">
                {isExpired ? "Subscription Ended" : "Days Remaining"}
              </span>
              <div
                className={`text-5xl font-black tracking-tight ${
                  isExpired
                    ? "text-red-600 dark:text-red-400"
                    : isWarning
                      ? "text-orange-600 dark:text-orange-400"
                      : "bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 dark:from-indigo-400 dark:via-purple-400 dark:to-pink-400 bg-clip-text text-transparent"
                }`}
              >
                {daysRemaining > 0 ? daysRemaining : 0}
              </div>
              {!isExpired && (
                <div className="flex items-center gap-2 text-[10px] text-gray-500 dark:text-gray-400 font-semibold">
                  <span>out of {totalDays} days</span>
                  <span className="text-gray-300 dark:text-gray-600">•</span>
                  <span>{progressPercentage.toFixed(0)}% elapsed</span>
                </div>
              )}
            </div>
          </div>

          {/* Progress Bar */}
          <div className="relative h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden shadow-inner">
            <div
              className={`absolute inset-y-0 left-0 rounded-full transition-all duration-1000 ease-out ${
                isExpired
                  ? "bg-gradient-to-r from-red-500 to-rose-600"
                  : isWarning
                    ? "bg-gradient-to-r from-orange-500 to-amber-600"
                    : "bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500"
              }`}
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
                    {startDate.toLocaleDateString("en-IN", {
                      day: "2-digit",
                      month: "short",
                      year: "numeric",
                    })}
                  </div>
                </div>
              </div>
            </div>

            {/* End Date Card */}
            <div className="group/card relative overflow-hidden p-3 bg-gradient-to-br from-white to-indigo-50/50 dark:from-gray-800 dark:to-indigo-950/20 rounded-xl border-2 border-indigo-200/50 dark:border-indigo-800/30 hover:border-indigo-300 dark:hover:border-indigo-700 transition-all shadow-md hover:shadow-lg">
              <div className="absolute top-0 right-0 w-16 h-16 bg-indigo-400/10 dark:bg-indigo-500/5 rounded-full blur-xl -mr-8 -mt-8 group-hover/card:scale-150 transition-transform duration-500"></div>
              <div className="relative flex items-start gap-3">
                <div className="p-2 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg shadow-md shadow-indigo-500/30">
                  <Calendar size={16} className="text-white" />
                </div>
                <div className="flex-1">
                  <span className="text-[10px] font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-widest block mb-1">
                    End Date
                  </span>
                  <div className="text-sm font-bold text-gray-900 dark:text-white">
                    {endDate.toLocaleDateString("en-IN", {
                      day: "2-digit",
                      month: "short",
                      year: "numeric",
                    })}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Warning Message */}
          {isWarning && !isExpired && (
            <div className="mt-4 p-4 bg-gradient-to-r from-orange-50 to-amber-50 dark:from-orange-950/30 dark:to-amber-950/30 border-2 border-orange-200 dark:border-orange-800 rounded-xl flex items-start gap-3 animate-pulse">
              <AlertCircle
                size={20}
                className="text-orange-600 dark:text-orange-400 shrink-0 mt-0.5"
              />
              <div>
                <p className="text-sm font-bold text-orange-900 dark:text-orange-200">
                  Subscription Expiring Soon
                </p>
                <p className="text-xs text-orange-700 dark:text-orange-300 mt-1">
                  Your subscription will expire in {daysRemaining} days. Please
                  renew to continue using the service.
                </p>
              </div>
            </div>
          )}

          {isExpired && (
            <div className="mt-4 p-4 bg-gradient-to-r from-red-50 to-rose-50 dark:from-red-950/30 dark:to-rose-950/30 border-2 border-red-200 dark:border-red-800 rounded-xl flex items-start gap-3">
              <AlertCircle
                size={20}
                className="text-red-600 dark:text-red-400 shrink-0 mt-0.5"
              />
              <div>
                <p className="text-sm font-bold text-red-900 dark:text-red-200">
                  Subscription Expired
                </p>
                <p className="text-xs text-red-700 dark:text-red-300 mt-1">
                  Your subscription has expired. Please contact support to renew
                  your license.
                </p>
              </div>
            </div>
          )}

          {/* Plan Details Section */}
          {company.plan && (
            <div className="mt-6 pt-6 border-t border-gray-100 dark:border-gray-800">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h4 className="text-base font-bold text-gray-900 dark:text-white flex items-center gap-2">
                    <span className="bg-gradient-to-r from-indigo-500 to-purple-600 w-2 h-2 rounded-full"></span>
                    {company.plan.name} Plan
                  </h4>
                  <p className="text-sm text-gray-500 mt-0.5">
                    Includes up to {company.plan.max_users} users
                  </p>
                </div>
              </div>

              {company.plan.features && company.plan.features.length > 0 && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-4">
                  {company.plan.features.map((feature, idx) => (
                    <div key={idx} className="flex items-start gap-2">
                      <CheckCircle2
                        size={16}
                        className="text-indigo-500 mt-0.5 shrink-0"
                      />
                      <span className="text-sm text-gray-600 dark:text-gray-300">
                        {feature}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

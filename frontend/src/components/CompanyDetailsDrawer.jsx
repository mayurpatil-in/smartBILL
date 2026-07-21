import { useEffect, useState } from "react";
import { getCompanyDetails } from "../api/superAdmin";
import { X, Users, CreditCard, Clock, Activity, ShieldCheck, CheckCircle2 } from "lucide-react";

export default function CompanyDetailsDrawer({ companyId, onClose }) {
  const [details, setDetails] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (companyId) {
      loadDetails();
    }
  }, [companyId]);

  const loadDetails = async () => {
    try {
      setLoading(true);
      const data = await getCompanyDetails(companyId);
      setDetails(data);
    } catch (error) {
      console.error("Failed to fetch company details:", error);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return "N/A";
    
    // Ensure the backend's naive datetime is parsed as UTC
    const utcDateStr = dateStr.endsWith('Z') ? dateStr : `${dateStr}Z`;
    const date = new Date(utcDateStr);

    return date.toLocaleString("en-IN", {
      timeZone: "Asia/Kolkata",
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: true
    });
  };

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-gray-900/40 backdrop-blur-sm z-[60] transition-opacity"
        onClick={onClose}
      />
      
      {/* Drawer */}
      <div className="fixed inset-y-0 right-0 w-full max-w-md bg-white dark:bg-gray-900 shadow-2xl z-[70] transform transition-transform duration-300 flex flex-col border-l border-gray-200 dark:border-gray-800">
        
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900/50">
          <div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">Tenant Details</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Analytics and features usage</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors"
          >
            <X size={24} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="flex justify-center items-center h-full">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
            </div>
          ) : !details ? (
            <div className="text-center text-gray-500 py-10">Failed to load details.</div>
          ) : (
            <div className="space-y-8 animate-fade-in">
              
              {/* Tenant Header Info */}
              <div>
                <h3 className="text-2xl font-black text-gray-900 dark:text-white">{details.name}</h3>
                <div className="flex items-center gap-2 mt-2">
                  <span className={`px-2.5 py-1 text-xs font-bold uppercase tracking-wider rounded-lg ${
                    details.is_active 
                      ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" 
                      : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                  }`}>
                    {details.is_active ? "Active" : "Suspended"}
                  </span>
                  {details.plan_name && (
                    <span className="px-2.5 py-1 text-xs font-bold uppercase tracking-wider rounded-lg bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400">
                      {details.plan_name} Plan
                    </span>
                  )}
                </div>
              </div>

              {/* Grid Stats */}
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-gray-50 dark:bg-gray-800/50 rounded-2xl border border-gray-100 dark:border-gray-800">
                  <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400 mb-2">
                    <Users size={18} />
                    <span className="font-semibold text-sm">Users</span>
                  </div>
                  <div className="text-2xl font-black text-gray-900 dark:text-white">
                    {details.user_count} <span className="text-sm font-medium text-gray-500">/ {details.max_users || "∞"}</span>
                  </div>
                </div>

                <div className="p-4 bg-gray-50 dark:bg-gray-800/50 rounded-2xl border border-gray-100 dark:border-gray-800">
                  <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 mb-2">
                    <CreditCard size={18} />
                    <span className="font-semibold text-sm">Invoiced</span>
                  </div>
                  <div className="text-2xl font-black text-gray-900 dark:text-white">
                    ₹{details.total_invoice_volume.toLocaleString()}
                  </div>
                </div>
              </div>

              {/* Activity Info */}
              <div className="space-y-4">
                <h4 className="font-bold text-gray-900 dark:text-white border-b border-gray-200 dark:border-gray-800 pb-2">Activity</h4>
                
                <div className="flex items-start gap-4">
                  <div className="p-2 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-xl">
                    <Clock size={20} />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Last Login</p>
                    <p className="font-semibold text-gray-900 dark:text-white">{formatDate(details.last_login_date)}</p>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="p-2 bg-pink-50 dark:bg-pink-900/30 text-pink-600 dark:text-pink-400 rounded-xl">
                    <ShieldCheck size={20} />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Admin Email</p>
                    <p className="font-semibold text-gray-900 dark:text-white">{details.admin_email || "No Admin Found"}</p>
                  </div>
                </div>
              </div>

              {/* Features Info */}
              {details.feature_flags && details.feature_flags.length > 0 && (
                <div className="space-y-4">
                  <h4 className="font-bold text-gray-900 dark:text-white border-b border-gray-200 dark:border-gray-800 pb-2">Active Features</h4>
                  <div className="grid grid-cols-1 gap-3">
                    {details.feature_flags.map((feature, idx) => (
                      <div key={idx} className="flex items-center gap-3 bg-gray-50 dark:bg-gray-800/50 p-3 rounded-xl border border-gray-100 dark:border-gray-800">
                        <CheckCircle2 size={18} className="text-green-500" />
                        <span className="font-semibold text-sm text-gray-700 dark:text-gray-300">
                          {feature.replace(/_/g, " ")}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

            </div>
          )}
        </div>
      </div>
    </>
  );
}

import React from "react";
import {
  X,
  UserPlus,
  Edit,
  KeyRound,
  Clock,
  Power,
  Trash2,
  Building2,
  Activity,
  LogIn,
} from "lucide-react";

export default function ManageCompanyActions({
  company,
  onClose,
  onAddAdmin,
  onEdit,
  onResetPassword,
  onExtend,
  onToggleStatus,
  onDelete,
  onViewLogs,
  onImpersonate,
}) {
  if (!company) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden border border-gray-100 dark:border-gray-700">
        {/* Header */}
        <div className="px-6 py-5 bg-gradient-to-r from-gray-50 to-white dark:from-gray-700/50 dark:to-gray-800 border-b border-gray-100 dark:border-gray-700 flex justify-between items-start">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center text-blue-600 dark:text-blue-400">
              <Building2 size={24} />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                {company.name}
              </h2>
              <div className="flex items-center gap-2 mt-1">
                <span
                  className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                    company.is_active
                      ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                      : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                  }`}
                >
                  {company.is_active ? "Active" : "Inactive"}
                </span>
                <span className="text-sm text-gray-500 dark:text-gray-400">
                  • {company.email}
                </span>
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors bg-gray-100 dark:bg-gray-700/50 p-2 rounded-full"
          >
            <X size={20} />
          </button>
        </div>

        {/* Action Grid */}
        <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
          <ActionCard
            icon={UserPlus}
            title="Create Admin"
            desc="Add a new administrator account"
            color="indigo"
            onClick={onAddAdmin}
          />

          <ActionCard
            icon={Edit}
            title="Edit Details"
            desc="Update company name, email, etc."
            color="blue"
            onClick={onEdit}
          />

          <ActionCard
            icon={KeyRound}
            title="Reset Password"
            desc="Set a temporary password for admin"
            color="amber"
            onClick={onResetPassword}
          />

          <ActionCard
            icon={Clock}
            title="Extend Plan"
            desc="Add more time to subscription"
            color="emerald"
            onClick={onExtend}
          />

          <ActionCard
            icon={Power}
            title={company.is_active ? "Deactivate" : "Activate"}
            desc={
              company.is_active
                ? "Suspend access immediately"
                : "Restore access to account"
            }
            color={company.is_active ? "orange" : "green"}
            onClick={onToggleStatus}
          />

          <ActionCard
            icon={Trash2}
            title="Delete Company"
            desc="Permanently remove all data"
            color="red"
            isDanger={true}
            onClick={onDelete}
          />

          <ActionCard
            icon={LogIn}
            title="Impersonate Admin"
            desc="Log in as this tenant's admin"
            color="indigo"
            onClick={onImpersonate}
          />

          {/* VIEW AUDIT LOGS */}
          <ActionCard
            icon={Activity}
            title="View Audit Logs"
            desc="Track admin activities"
            color="purple"
            onClick={onViewLogs}
          />
        </div>

        {/* Footer info */}
        <div className="px-6 py-4 bg-gray-50 dark:bg-gray-900/30 text-center text-xs text-gray-500 border-t border-gray-100 dark:border-gray-700">
          Managing ID: {company.id}
        </div>
      </div>
    </div>
  );
}

function ActionCard({ icon: Icon, title, desc, color, onClick, isDanger }) {
  const colorStyles = {
    indigo:
      "bg-indigo-50 text-indigo-600 dark:bg-indigo-900/20 dark:text-indigo-400 group-hover:bg-indigo-100 dark:group-hover:bg-indigo-900/40",
    blue: "bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400 group-hover:bg-blue-100 dark:group-hover:bg-blue-900/40",
    amber:
      "bg-amber-50 text-amber-600 dark:bg-amber-900/20 dark:text-amber-400 group-hover:bg-amber-100 dark:group-hover:bg-amber-900/40",
    emerald:
      "bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20 dark:text-emerald-400 group-hover:bg-emerald-100 dark:group-hover:bg-emerald-900/40",
    green:
      "bg-green-50 text-green-600 dark:bg-green-900/20 dark:text-green-400 group-hover:bg-green-100 dark:group-hover:bg-green-900/40",
    orange:
      "bg-orange-50 text-orange-600 dark:bg-orange-900/20 dark:text-orange-400 group-hover:bg-orange-100 dark:group-hover:bg-orange-900/40",
    red: "bg-red-50 text-red-600 dark:bg-red-900/20 dark:text-red-400 group-hover:bg-red-100 dark:group-hover:bg-red-900/40",
  };

  return (
    <button
      onClick={onClick}
      className={`group flex items-start p-4 rounded-xl border border-gray-200 dark:border-gray-700 hover:border-${color}-200 dark:hover:border-${color}-900 transition-all duration-200 hover:shadow-lg hover:shadow-${color}-100 dark:hover:shadow-none text-left w-full bg-white dark:bg-gray-800 ${
        isDanger ? "hover:bg-red-50/30" : ""
      }`}
    >
      <div
        className={`p-3 rounded-lg mr-4 transition-colors ${colorStyles[color]}`}
      >
        <Icon size={24} strokeWidth={2} />
      </div>
      <div>
        <h3
          className={`font-semibold text-gray-900 dark:text-gray-100 group-hover:text-${color}-600 dark:group-hover:text-${color}-400 transition-colors`}
        >
          {title}
        </h3>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{desc}</p>
      </div>
    </button>
  );
}

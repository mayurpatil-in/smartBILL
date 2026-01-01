import { X, AlertTriangle, CheckCircle, Info } from "lucide-react";

export default function ConfirmDialog({
  open,
  title,
  message,
  onConfirm,
  onCancel,
  confirmLabel = "Confirm",
  type = "danger", // danger, success, info
}) {
  if (!open) return null;

  const styles = {
    danger: {
      headerBg:
        "bg-gradient-to-r from-red-50 to-orange-50 dark:from-gray-900 dark:to-gray-800",
      iconBg: "bg-gradient-to-br from-red-600 to-orange-600",
      icon: AlertTriangle,
      buttonBg:
        "bg-gradient-to-r from-red-600 to-orange-600 hover:from-red-700 hover:to-orange-700 shadow-red-600/30",
    },
    success: {
      headerBg:
        "bg-gradient-to-r from-green-50 to-emerald-50 dark:from-gray-900 dark:to-gray-800",
      iconBg: "bg-gradient-to-br from-green-600 to-emerald-600",
      icon: CheckCircle,
      buttonBg:
        "bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 shadow-green-600/30",
    },
    info: {
      headerBg:
        "bg-gradient-to-r from-blue-50 to-sky-50 dark:from-gray-900 dark:to-gray-800",
      iconBg: "bg-gradient-to-br from-blue-600 to-sky-600",
      icon: Info,
      buttonBg:
        "bg-gradient-to-r from-blue-600 to-sky-600 hover:from-blue-700 hover:to-sky-700 shadow-blue-600/30",
    },
  };

  const currentStyle = styles[type] || styles.danger;
  const Icon = currentStyle.icon;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
      <div className="bg-white dark:bg-gray-800 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden animate-scale-in">
        {/* Header */}
        <div
          className={`flex items-center justify-between p-6 border-b border-gray-100 dark:border-gray-700 ${currentStyle.headerBg}`}
        >
          <div className="flex items-center gap-3">
            <div
              className={`w-10 h-10 rounded-xl ${currentStyle.iconBg} flex items-center justify-center shadow-lg`}
            >
              <Icon size={20} className="text-white" />
            </div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">
              {title || "Confirm Action"}
            </h2>
          </div>
          <button
            onClick={onCancel}
            className="p-2 hover:bg-white/50 dark:hover:bg-gray-700 rounded-full transition-all"
          >
            <X size={20} className="text-gray-600 dark:text-gray-400" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          <p className="text-gray-700 dark:text-gray-300 text-base leading-relaxed">
            {message}
          </p>
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-3 p-6 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
          <button
            onClick={onCancel}
            className="px-6 py-2.5 rounded-xl text-gray-700 hover:bg-gray-200 dark:text-gray-300 dark:hover:bg-gray-700 font-semibold transition-all border border-gray-200 dark:border-gray-600"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className={`px-6 py-2.5 text-white rounded-xl font-semibold shadow-lg hover:shadow-xl transition-all ${currentStyle.buttonBg}`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

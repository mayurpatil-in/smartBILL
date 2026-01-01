import { useEffect, useState } from "react";
import { getAuditLogs } from "../api/superAdmin";
import {
  Activity,
  Loader2,
  User,
  X,
  Plus,
  Trash2,
  Edit,
  Info,
  Clock,
} from "lucide-react";
import toast from "react-hot-toast";

export default function CompanyAuditLogsModal({ company, onClose }) {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (company) {
      fetchLogs();
    }
  }, [company]);

  const fetchLogs = async () => {
    try {
      const data = await getAuditLogs(company.id);
      setLogs(data);
    } catch (error) {
      console.error(error);
      toast.error("Failed to load audit logs");
    } finally {
      setLoading(false);
    }
  };

  const getActionDetails = (action) => {
    if (action.includes("DELETE")) {
      return {
        style:
          "bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-300 border border-red-200 dark:border-red-800",
        icon: Trash2,
      };
    }
    if (action.includes("CREATE")) {
      return {
        style:
          "bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800",
        icon: Plus,
      };
    }
    if (action.includes("UPDATE")) {
      return {
        style:
          "bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-300 border border-blue-200 dark:border-blue-800",
        icon: Edit,
      };
    }
    return {
      style:
        "bg-gray-50 text-gray-700 dark:bg-gray-800 dark:text-gray-300 border border-gray-200 dark:border-gray-700",
      icon: Info,
    };
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm transition-all duration-300">
      <div
        className="
          bg-white dark:bg-gray-900 
          rounded-2xl shadow-2xl 
          w-full max-w-4xl max-h-[85vh] 
          flex flex-col 
          overflow-hidden 
          border border-gray-200 dark:border-gray-800
          animate-fade-inScale
        "
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100 dark:border-gray-800 bg-white/50 dark:bg-gray-900/50 backdrop-blur">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400 rounded-xl">
              <Activity size={24} />
            </div>
            <div>
              <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100">
                Audit Logs
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 flex items-center gap-2 mt-0.5">
                <span className="font-medium text-gray-700 dark:text-gray-300">
                  {company.name}
                </span>
                <span>•</span>
                <span>{logs.length} records found</span>
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="
              p-2 rounded-xl 
              text-gray-400 hover:text-gray-700 dark:text-gray-500 dark:hover:text-gray-200 
              hover:bg-gray-100 dark:hover:bg-gray-800 
              transition-colors duration-200
            "
          >
            <X size={22} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto bg-gray-50/50 dark:bg-black/20">
          {loading ? (
            <div className="h-64 flex flex-col items-center justify-center gap-3 text-gray-500">
              <Loader2 size={32} className="animate-spin text-purple-600" />
              <p className="text-sm font-medium">Loading history...</p>
            </div>
          ) : logs.length === 0 ? (
            <div className="h-64 flex flex-col items-center justify-center gap-4 text-gray-400">
              <div className="p-4 rounded-full bg-gray-100 dark:bg-gray-800">
                <Activity size={32} className="opacity-50" />
              </div>
              <p className="font-medium">No activity recorded yet.</p>
            </div>
          ) : (
            <div className="min-w-full inline-block align-middle">
              <div className="border-b border-gray-200 dark:border-gray-800">
                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-800">
                  <thead className="bg-gray-50 dark:bg-gray-900/50 sticky top-0 z-10 backdrop-blur-sm">
                    <tr>
                      <th
                        scope="col"
                        className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider"
                      >
                        Performed By
                      </th>
                      <th
                        scope="col"
                        className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider"
                      >
                        Action
                      </th>
                      <th
                        scope="col"
                        className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider"
                      >
                        Details
                      </th>
                      <th
                        scope="col"
                        className="px-6 py-4 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider"
                      >
                        Timestamp
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-100 dark:divide-gray-800">
                    {logs.map((log) => {
                      const { style, icon: ActionIcon } = getActionDetails(
                        log.action
                      );
                      return (
                        <tr
                          key={log.id}
                          className="hover:bg-gray-50 dark:hover:bg-gray-800/40 transition-colors duration-150"
                        >
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-gray-500">
                                <User size={14} />
                              </div>
                              <div>
                                <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
                                  {log.user_name}
                                </div>
                                <div className="text-xs text-gray-500 dark:text-gray-400">
                                  ID: {log.user_id}
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div
                              className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium ${style}`}
                            >
                              <ActionIcon size={12} />
                              {log.action}
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div
                              className="text-sm text-gray-600 dark:text-gray-300 max-w-sm font-mono truncate"
                              title={log.details}
                            >
                              {log.details || "-"}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right">
                            <div className="flex flex-col items-end gap-1">
                              <span className="text-sm font-medium text-gray-900 dark:text-gray-200">
                                {new Date(
                                  log.created_at.endsWith("Z")
                                    ? log.created_at
                                    : log.created_at + "Z"
                                ).toLocaleDateString(undefined, {
                                  month: "short",
                                  day: "numeric",
                                  year: "numeric",
                                })}
                              </span>
                              <div className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
                                <Clock size={10} />
                                {new Date(
                                  log.created_at.endsWith("Z")
                                    ? log.created_at
                                    : log.created_at + "Z"
                                ).toLocaleTimeString([], {
                                  hour: "2-digit",
                                  minute: "2-digit",
                                })}
                              </div>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

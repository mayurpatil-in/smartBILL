import { useEffect, useState } from "react";
import { getAuditLogs } from "../api/superAdmin";
import { Activity, Clock, User, Building2 } from "lucide-react";
import toast from "react-hot-toast";

export default function SuperAdminAuditLogs() {
  const [auditLogs, setAuditLogs] = useState([]);
  const [loadingLogs, setLoadingLogs] = useState(false);

  // 📜 Fetch Audit Logs
  const loadAuditLogs = async () => {
    try {
      setLoadingLogs(true);
      const data = await getAuditLogs();
      setAuditLogs(data);
    } catch {
      toast.error("Failed to load audit logs");
    } finally {
      setLoadingLogs(false);
    }
  };

  useEffect(() => {
    loadAuditLogs();
  }, []);

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-xl border-2 border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="p-6 border-b border-gray-200 dark:border-gray-700 bg-gradient-to-r from-purple-50 to-blue-50 dark:from-purple-950/30 dark:to-blue-950/20">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-gradient-to-br from-purple-600 to-blue-600 rounded-xl shadow-lg">
              <Activity size={20} className="text-white" />
            </div>
            <div>
              <h3 className="text-xl font-bold bg-gradient-to-r from-purple-900 to-blue-700 dark:from-white dark:to-gray-300 bg-clip-text text-transparent">
                System Audit Logs
              </h3>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                System-wide tracking of critical administrative and user actions
              </p>
            </div>
          </div>
        </div>
        <div className="overflow-x-auto min-h-[500px]">
          <table className="w-full text-left text-sm">
            <thead className="bg-gradient-to-r from-gray-100 to-gray-50 dark:from-gray-700 dark:to-gray-700/80 text-gray-600 dark:text-gray-300 uppercase tracking-wider text-xs font-bold sticky top-0 z-10 backdrop-blur-sm shadow-md">
              <tr>
                <th className="px-6 py-4">Timestamp</th>
                <th className="px-6 py-4">Action</th>
                <th className="px-6 py-4">User / Admin</th>
                <th className="px-6 py-4">Target Company</th>
                <th className="px-6 py-4">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
              {loadingLogs ? (
                <tr>
                  <td
                    colSpan="5"
                    className="px-6 py-12 text-center text-gray-500"
                  >
                    <div className="flex flex-col items-center gap-3">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
                      <span className="text-sm font-medium">
                        Loading logs...
                      </span>
                    </div>
                  </td>
                </tr>
              ) : auditLogs.length === 0 ? (
                <tr>
                  <td
                    colSpan="5"
                    className="px-6 py-12 text-center text-gray-500"
                  >
                    <div className="flex flex-col items-center gap-2">
                      <Activity
                        className="text-gray-300 dark:text-gray-600"
                        size={48}
                      />
                      <span className="text-sm font-medium">
                        No activity recorded yet
                      </span>
                    </div>
                  </td>
                </tr>
              ) : (
                auditLogs.map((log) => (
                  <tr
                    key={log.id}
                    className="group hover:bg-gradient-to-r hover:from-purple-50/50 hover:to-blue-50/30 dark:hover:from-purple-900/10 dark:hover:to-blue-900/5 transition-all duration-300"
                  >
                    <td className="px-6 py-5">
                      <div className="flex items-center gap-2">
                        <div className="p-1.5 bg-gray-100 dark:bg-gray-700 rounded-lg">
                          <Clock
                            size={14}
                            className="text-gray-500 dark:text-gray-400"
                          />
                        </div>
                        <span className="text-gray-600 dark:text-gray-300 font-medium text-xs">
                          {new Date(
                            log.created_at.endsWith("Z")
                              ? log.created_at
                              : log.created_at + "Z",
                          ).toLocaleString("en-IN", {
                            day: "2-digit",
                            month: "short",
                            year: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                            hour12: true,
                          })}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-5">
                      <span className="inline-flex items-center px-3 py-1.5 rounded-xl text-xs font-black bg-gradient-to-r from-purple-500 to-blue-600 text-white shadow-md uppercase tracking-wider">
                        {log.action}
                      </span>
                    </td>
                    <td className="px-6 py-5">
                      <div className="flex items-center gap-2">
                        <div className="p-1.5 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                          <User
                            size={14}
                            className="text-blue-600 dark:text-blue-400"
                          />
                        </div>
                        <span className="font-bold text-gray-900 dark:text-white">
                          {log.user_name}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-5">
                      <div className="flex items-center gap-2">
                        <div className="p-1.5 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
                          <Building2
                            size={14}
                            className="text-purple-600 dark:text-purple-400"
                          />
                        </div>
                        <span className="text-gray-700 dark:text-gray-300 font-medium">
                          {log.company_name || "-"}
                        </span>
                      </div>
                    </td>
                    <td
                      className="px-6 py-5 text-gray-600 dark:text-gray-400 max-w-xs truncate text-sm"
                      title={log.details}
                    >
                      {log.details}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

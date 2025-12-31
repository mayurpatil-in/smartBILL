import { useState, useEffect } from "react";
import { format } from "date-fns";
import {
  Calendar,
  Save,
  CheckCircle,
  XCircle,
  Clock,
  AlertCircle,
} from "lucide-react";
import {
  getEmployees,
  getDailyAttendance,
  markAttendance,
} from "../api/employees";
import toast from "react-hot-toast";

export default function EmployeeAttendance() {
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [employees, setEmployees] = useState([]);
  const [attendance, setAttendance] = useState({});
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadData();
  }, [date]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [emps, daily] = await Promise.all([
        getEmployees(),
        getDailyAttendance(date),
      ]);
      const activeEmps = emps.filter((emp) => emp.is_active);
      setEmployees(activeEmps);

      // Map daily records to state
      const attendanceMap = {};

      // Initialize with existing data or default PRESENT
      // Initialize with existing data or default PRESENT
      activeEmps.forEach((emp) => {
        const record = daily.find((d) => d.user_id === emp.id);
        attendanceMap[emp.id] = {
          status: record?.status || "present",
          notes: record?.notes || "",
          overtime_hours: record?.overtime_hours || "",
          bonus_amount: record?.bonus_amount || "",
        };
      });
      setAttendance(attendanceMap);
    } catch (err) {
      console.error(err);
      toast.error("Failed to load attendance data");
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = (userId, status) => {
    setAttendance((prev) => ({
      ...prev,
      [userId]: { ...prev[userId], status },
    }));
  };

  const handleChange = (userId, field, value) => {
    setAttendance((prev) => ({
      ...prev,
      [userId]: { ...prev[userId], [field]: value },
    }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const records = Object.entries(attendance).map(([userId, data]) => ({
        user_id: parseInt(userId),
        date: date,
        status: data.status,
        notes: data.notes,
        overtime_hours: parseFloat(data.overtime_hours) || 0,
        bonus_amount: parseFloat(data.bonus_amount) || 0,
      }));

      await markAttendance(records);
      toast.success("Attendance saved successfully");
    } catch (err) {
      toast.error("Failed to save attendance");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Date Selection Header */}
      <div className="bg-white dark:bg-gray-800 p-4 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 flex flex-col md:flex-row md:items-center justify-between gap-4 animate-fade-in">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-xl text-blue-600 dark:text-blue-400">
            <Calendar size={24} />
          </div>
          <div>
            <h3 className="font-semibold text-gray-900 dark:text-white">
              Daily Attendance
            </h3>
            <p className="text-sm text-gray-500">
              Mark attendance for {format(new Date(date), "MMMM d, yyyy")}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="px-4 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 outline-none focus:ring-2 focus:ring-blue-500/20"
          />
          <button
            onClick={handleSave}
            disabled={saving || loading}
            className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-medium transition-colors shadow-lg shadow-blue-600/20 disabled:opacity-50 flex items-center gap-2"
          >
            {saving ? (
              "Saving..."
            ) : (
              <>
                <Save size={18} /> Save Changes
              </>
            )}
          </button>
        </div>
      </div>

      {/* Attendance Grid */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden animate-fade-in-up">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-gray-900/50 border-b border-gray-100 dark:border-gray-700">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Employee
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider w-24">
                  OT (Hrs)
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider w-24">
                  Bonus (₹)
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Note
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
              {loading ? (
                <tr>
                  <td colSpan="5" className="text-center py-8 text-gray-500">
                    Loading employees...
                  </td>
                </tr>
              ) : employees.length === 0 ? (
                <tr>
                  <td colSpan="5" className="text-center py-8 text-gray-500">
                    No employees found
                  </td>
                </tr>
              ) : (
                employees.map((emp) => (
                  <tr
                    key={emp.id}
                    className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center text-white font-bold text-sm">
                          {emp.name.charAt(0)}
                        </div>
                        <div>
                          <p className="font-medium text-gray-900 dark:text-white">
                            {emp.name}
                          </p>
                          <p className="text-xs text-gray-500">
                            {emp.employee_profile?.designation || "N/A"}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex gap-2">
                        {[
                          {
                            id: "present",
                            label: "P",
                            color:
                              "bg-green-100 text-green-700 border-green-200 hover:bg-green-200",
                          },
                          {
                            id: "absent",
                            label: "A",
                            color:
                              "bg-red-100 text-red-700 border-red-200 hover:bg-red-200",
                          },
                          {
                            id: "half_day",
                            label: "HD",
                            color:
                              "bg-yellow-100 text-yellow-700 border-yellow-200 hover:bg-yellow-200",
                          },
                          {
                            id: "leave",
                            label: "L",
                            color:
                              "bg-blue-100 text-blue-700 border-blue-200 hover:bg-blue-200",
                          },
                        ].map((opt) => (
                          <button
                            key={opt.id}
                            onClick={() => handleStatusChange(emp.id, opt.id)}
                            className={`w-8 h-8 rounded-lg border font-medium text-xs flex items-center justify-center transition-all ${
                              attendance[emp.id]?.status === opt.id
                                ? opt.color.replace("hover:", "") +
                                  " ring-2 ring-offset-2 ring-blue-500/20 scale-105"
                                : "bg-white dark:bg-gray-800 text-gray-400 border-gray-200 dark:border-gray-700 hover:bg-gray-50"
                            }`}
                            title={opt.id}
                          >
                            {opt.label}
                          </button>
                        ))}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <input
                        type="number"
                        placeholder="0"
                        min="0"
                        step="0.5"
                        value={attendance[emp.id]?.overtime_hours || ""}
                        onChange={(e) =>
                          handleChange(emp.id, "overtime_hours", e.target.value)
                        }
                        className="w-20 px-2 py-1.5 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 focus:ring-2 focus:ring-blue-500/20 outline-none"
                      />
                    </td>
                    <td className="px-6 py-4">
                      <input
                        type="number"
                        placeholder="0"
                        min="0"
                        value={attendance[emp.id]?.bonus_amount || ""}
                        onChange={(e) =>
                          handleChange(emp.id, "bonus_amount", e.target.value)
                        }
                        className="w-20 px-2 py-1.5 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 focus:ring-2 focus:ring-blue-500/20 outline-none"
                      />
                    </td>
                    <td className="px-6 py-4">
                      <input
                        type="text"
                        placeholder="Add note..."
                        value={attendance[emp.id]?.notes || ""}
                        onChange={(e) =>
                          handleChange(emp.id, "notes", e.target.value)
                        }
                        className="w-full min-w-[150px] px-3 py-1.5 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 focus:ring-2 focus:ring-blue-500/20 outline-none"
                      />
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

import { useState, useEffect } from "react";
import { format } from "date-fns";
import {
  Calendar,
  Save,
  CheckCircle,
  XCircle,
  Clock,
  AlertCircle,
  PartyPopper,
} from "lucide-react";
import {
  getEmployees,
  getDailyAttendance,
  markAttendance,
  getHolidays,
} from "../api/employees";
import toast from "react-hot-toast";

export default function EmployeeAttendance() {
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [employees, setEmployees] = useState([]);
  const [attendance, setAttendance] = useState({});
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [isMarked, setIsMarked] = useState(false);
  const [holiday, setHoliday] = useState(null); // stores holiday name if today is holiday

  useEffect(() => {
    loadData();
  }, [date]);

  const loadData = async () => {
    setLoading(true);
    try {
      const allData = await Promise.all([
        getEmployees(),
        getDailyAttendance(date),
        getHolidays(),
      ]);
      const holidays = allData[2];
      const emps = allData[0];
      const daily = allData[1];

      const activeEmps = emps.filter((emp) => emp.is_active);
      setEmployees(activeEmps);

      // Check if selected date is holiday
      const foundHoliday = holidays.find((h) => h.date === date);
      setHoliday(foundHoliday ? foundHoliday.name : null);

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
      setIsMarked(daily.length > 0);
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
      setIsMarked(true);
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
      <div className="bg-white dark:bg-gray-800 p-4 sm:p-6 rounded-2xl shadow-xl border border-gray-200 dark:border-gray-700 flex flex-col md:flex-row md:items-center justify-between gap-4 animate-fade-in">
        <div className="flex items-center gap-3 sm:gap-4">
          <div className="p-3 sm:p-4 bg-gradient-to-br from-blue-500 to-cyan-600 rounded-xl text-white shadow-lg">
            <Calendar size={24} className="sm:w-7 sm:h-7" />
          </div>
          <div>
            <h3 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
              <span>Daily Attendance</span>
              {isMarked ? (
                <span className="px-2 sm:px-3 py-1 rounded-full text-[10px] sm:text-xs font-semibold bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 border border-green-200 dark:border-green-800 w-fit">
                  ✓ Saved
                </span>
              ) : (
                <span className="px-2 sm:px-3 py-1 rounded-full text-[10px] sm:text-xs font-semibold bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400 border border-orange-200 dark:border-orange-800 w-fit">
                  ⚠ Not Marked
                </span>
              )}
            </h3>
            <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 mt-1">
              Mark attendance for {format(new Date(date), "MMMM d, yyyy")}
            </p>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full md:w-auto">
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="flex-1 sm:flex-none px-3 sm:px-4 py-2 sm:py-2.5 rounded-xl border-2 border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium text-sm"
            name="attendance_date"
            id="attendance_date"
          />
          <button
            onClick={handleSave}
            disabled={saving || loading}
            className="group px-4 sm:px-6 py-2 sm:py-2.5 bg-gradient-to-r from-blue-600 to-cyan-700 hover:from-blue-700 hover:to-cyan-800 text-white rounded-xl font-semibold transition-all duration-300 shadow-lg shadow-blue-600/30 hover:shadow-xl hover:shadow-blue-600/40 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 hover:scale-105 text-sm w-full sm:w-auto"
          >
            {saving ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                Saving...
              </>
            ) : (
              <>
                <Save
                  size={16}
                  className="group-hover:rotate-12 transition-transform duration-300 sm:w-[18px] sm:h-[18px]"
                />
                Save Changes
              </>
            )}
          </button>
        </div>
      </div>

      {/* Holiday Banner */}
      {holiday && (
        <div className="bg-gradient-to-r from-pink-500 to-rose-500 text-white p-4 rounded-xl shadow-lg flex items-center gap-3 animate-pulse">
          <PartyPopper size={24} className="text-white" />
          <div>
            <h4 className="font-bold text-lg">Holiday: {holiday}</h4>
            <p className="text-white/90 text-sm">
              Attendance marking is optional. Employees with no attendance
              marked will be treated as Paid Leave.
            </p>
          </div>
        </div>
      )}

      {/* Attendance Grid */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-200 dark:border-gray-700 overflow-hidden animate-fade-in-up">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gradient-to-r from-gray-100 to-gray-50 dark:from-gray-700 dark:to-gray-700/80 text-gray-600 dark:text-gray-300 uppercase tracking-wider text-xs font-bold sticky top-0 z-10 backdrop-blur-sm shadow-md">
              <tr>
                <th className="px-6 py-4 text-left whitespace-nowrap">
                  Employee
                </th>
                <th className="px-6 py-4 text-left whitespace-nowrap">
                  Status
                </th>
                <th className="px-6 py-4 text-left whitespace-nowrap w-24">
                  OT (Hrs)
                </th>
                <th className="px-6 py-4 text-left whitespace-nowrap w-24">
                  Bonus (₹)
                </th>
                <th className="px-6 py-4 text-left whitespace-nowrap">Note</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700/50">
              {loading ? (
                <tr>
                  <td colSpan="5" className="text-center py-12 text-gray-500">
                    <div className="flex flex-col items-center gap-3">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                      <span className="text-sm font-medium">
                        Loading employees...
                      </span>
                    </div>
                  </td>
                </tr>
              ) : employees.length === 0 ? (
                <tr>
                  <td colSpan="5" className="text-center py-12 text-gray-500">
                    <div className="flex flex-col items-center gap-2">
                      <AlertCircle
                        className="text-gray-300 dark:text-gray-600"
                        size={48}
                      />
                      <span className="text-sm font-medium">
                        No active employees found
                      </span>
                      <span className="text-xs text-gray-400">
                        Add employees to mark attendance
                      </span>
                    </div>
                  </td>
                </tr>
              ) : (
                employees.map((emp, index) => (
                  <tr
                    key={emp.id}
                    className="group hover:bg-gradient-to-r hover:from-blue-50/50 hover:to-cyan-50/30 dark:hover:from-blue-900/10 dark:hover:to-cyan-900/10 transition-all duration-300 hover:shadow-[inset_4px_0_0_0_rgb(59,130,246)]"
                  >
                    <td className="px-6 py-5">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center text-white font-bold shadow-lg">
                          {emp.name.charAt(0)}
                        </div>
                        <div>
                          <p className="font-semibold text-gray-900 dark:text-white">
                            {emp.name}
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            {emp.employee_profile?.designation || "N/A"}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-5">
                      <div className="flex gap-2">
                        {[
                          {
                            id: "present",
                            label: "P",
                            icon: CheckCircle,
                            color:
                              "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 border-green-200 dark:border-green-800 hover:bg-green-200 dark:hover:bg-green-900/50",
                          },
                          {
                            id: "absent",
                            label: "A",
                            icon: XCircle,
                            color:
                              "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 border-red-200 dark:border-red-800 hover:bg-red-200 dark:hover:bg-red-900/50",
                          },
                          {
                            id: "half_day",
                            label: "HD",
                            icon: Clock,
                            color:
                              "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400 border-yellow-200 dark:border-yellow-800 hover:bg-yellow-200 dark:hover:bg-yellow-900/50",
                          },
                          {
                            id: "leave",
                            label: "L",
                            icon: Calendar,
                            color:
                              "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 border-blue-200 dark:border-blue-800 hover:bg-blue-200 dark:hover:bg-blue-900/50",
                          },
                        ].map((opt) => (
                          <button
                            key={opt.id}
                            onClick={() => handleStatusChange(emp.id, opt.id)}
                            className={`w-10 h-10 rounded-lg border-2 font-bold text-xs flex items-center justify-center transition-all duration-200 ${
                              attendance[emp.id]?.status === opt.id
                                ? opt.color +
                                  " ring-2 ring-offset-2 ring-blue-500/30 dark:ring-blue-500/20 scale-110 shadow-md"
                                : "bg-white dark:bg-gray-800 text-gray-400 dark:text-gray-500 border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700"
                            }`}
                            title={opt.id.replace("_", " ").toUpperCase()}
                          >
                            {opt.label}
                          </button>
                        ))}
                      </div>
                    </td>
                    <td className="px-6 py-5">
                      <input
                        type="number"
                        placeholder="0"
                        min="0"
                        step="0.5"
                        value={attendance[emp.id]?.overtime_hours || ""}
                        onChange={(e) =>
                          handleChange(emp.id, "overtime_hours", e.target.value)
                        }
                        className="w-20 px-3 py-2 text-sm font-medium rounded-lg border-2 border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all"
                        name={`overtime_hours_${emp.id}`}
                        id={`overtime_hours_${emp.id}`}
                      />
                    </td>
                    <td className="px-6 py-5">
                      <input
                        type="number"
                        placeholder="0"
                        min="0"
                        value={attendance[emp.id]?.bonus_amount || ""}
                        onChange={(e) =>
                          handleChange(emp.id, "bonus_amount", e.target.value)
                        }
                        className="w-20 px-3 py-2 text-sm font-medium rounded-lg border-2 border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all"
                        name={`bonus_amount_${emp.id}`}
                        id={`bonus_amount_${emp.id}`}
                      />
                    </td>
                    <td className="px-6 py-5">
                      <input
                        type="text"
                        placeholder="Add note..."
                        value={attendance[emp.id]?.notes || ""}
                        onChange={(e) =>
                          handleChange(emp.id, "notes", e.target.value)
                        }
                        className="w-full min-w-[150px] px-3 py-2 text-sm rounded-lg border-2 border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all"
                        name={`attendance_note_${emp.id}`}
                        id={`attendance_note_${emp.id}`}
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

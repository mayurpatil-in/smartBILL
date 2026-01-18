import { useState, useEffect } from "react";
import { format, getDaysInMonth, set } from "date-fns";
import { Download, Calendar, Filter } from "lucide-react";
import { getEmployees, getMonthlyAttendance } from "../api/employees";
import toast from "react-hot-toast";
import * as XLSX from "xlsx";

export default function MonthlyAttendanceReport() {
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [year, setYear] = useState(new Date().getFullYear());
  const [employees, setEmployees] = useState([]);
  const [attendanceData, setAttendanceData] = useState([]);
  const [holidays, setHolidays] = useState([]);
  const [offDays, setOffDays] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadData();
  }, [month, year]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [emps, attendance] = await Promise.all([
        getEmployees(),
        getMonthlyAttendance(month, year),
      ]);
      setEmployees(emps.filter((e) => e.is_active));
      setAttendanceData(attendance.records || []);
      setHolidays(attendance.holidays || []);
      setOffDays(attendance.off_days || []);
    } catch (err) {
      console.error(err);
      toast.error("Failed to load report data");
    } finally {
      setLoading(false);
    }
  };

  const daysInMonth = getDaysInMonth(new Date(year, month - 1));
  const daysArray = Array.from({ length: daysInMonth }, (_, i) => i + 1);

  const getStatus = (userId, day) => {
    const dateStr = `${year}-${String(month).padStart(2, "0")}-${String(
      day,
    ).padStart(2, "0")}`;
    const record = attendanceData.find(
      (a) => a.user_id === userId && a.date === dateStr,
    );
    if (record) return record.status;

    // Check Holiday
    if (holidays.some((h) => h.date === dateStr)) return "holiday";

    // Check Weekend/Off Day
    // Note: offDays from backend are 0=Mon, 6=Sun. JS getDay is 0=Sun.
    const jsDay = new Date(year, month - 1, day).getDay();
    const pythonDay = jsDay === 0 ? 6 : jsDay - 1;
    if (offDays.includes(pythonDay)) return "weekend";

    return "-";
  };

  const getStatusColor = (status) => {
    switch (status) {
      case "present":
        return "bg-green-100 text-green-700";
      case "absent":
        return "bg-red-100 text-red-700";
      case "half_day":
        return "bg-yellow-100 text-yellow-700";
      case "leave":
        return "bg-blue-100 text-blue-700";
      case "holiday":
        return "bg-pink-100 text-pink-700";
      case "weekend":
        return "bg-purple-100 text-purple-700";
      default:
        return "text-gray-400";
    }
  };

  const getStatusLabel = (status) => {
    switch (status) {
      case "present":
        return "P";
      case "absent":
        return "A";
      case "half_day":
        return "HD";
      case "leave":
        return "L";
      case "holiday":
        return "H";
      case "weekend":
        return "W";
      default:
        return "-";
    }
  };

  const calculateStats = (userId) => {
    const userRecords = attendanceData.filter((a) => a.user_id === userId);
    return {
      present: userRecords.filter((a) => a.status === "present").length,
      absent: userRecords.filter((a) => a.status === "absent").length,
      halfDay: userRecords.filter((a) => a.status === "half_day").length,
      leave: userRecords.filter((a) => a.status === "leave").length,
    };
  };

  const exportToExcel = () => {
    const data = employees.map((emp) => {
      const row = {
        Employee: emp.name,
        Designation: emp.employee_profile?.designation,
      };
      daysArray.forEach((day) => {
        row[`${day}`] = getStatusLabel(getStatus(emp.id, day));
      });
      const stats = calculateStats(emp.id);
      row["Total Present"] = stats.present;
      row["Total Absent"] = stats.absent;
      row["Total Half Days"] = stats.halfDay;
      row["Total Leaves"] = stats.leave;
      return row;
    });

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Attendance Report");
    XLSX.writeFile(wb, `Attendance_Report_${month}_${year}.xlsx`);
  };

  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-xl border border-gray-200 dark:border-gray-700 flex flex-col md:flex-row md:items-center justify-between gap-4 animate-fade-in">
        <div className="flex items-center gap-4">
          <div className="p-4 bg-gradient-to-br from-purple-500 to-violet-600 rounded-xl text-white shadow-lg">
            <Calendar size={28} />
          </div>
          <div>
            <h3 className="text-xl font-bold text-gray-900 dark:text-white">
              Monthly Attendance Report
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              View attendance summary for{" "}
              {new Date(0, month - 1).toLocaleString("default", {
                month: "long",
              })}{" "}
              {year}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">
              Month:
            </span>
            <select
              value={month}
              onChange={(e) => setMonth(parseInt(e.target.value))}
              className="px-4 py-2.5 rounded-xl border-2 border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 transition-all font-medium"
              name="report_month"
              id="report_month"
            >
              {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                <option key={m} value={m}>
                  {new Date(0, m - 1).toLocaleString("default", {
                    month: "long",
                  })}
                </option>
              ))}
            </select>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">
              Year:
            </span>
            <input
              type="number"
              value={year}
              onChange={(e) => setYear(parseInt(e.target.value))}
              className="w-24 px-4 py-2.5 rounded-xl border-2 border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 transition-all font-medium"
              name="report_year"
              id="report_year"
            />
          </div>
          <button
            onClick={exportToExcel}
            className="group px-5 py-2.5 bg-gradient-to-r from-green-600 to-emerald-700 hover:from-green-700 hover:to-emerald-800 text-white rounded-xl font-semibold transition-all duration-300 shadow-lg shadow-green-600/30 hover:shadow-xl hover:shadow-green-600/40 flex items-center gap-2 hover:scale-105"
          >
            <Download
              size={18}
              className="group-hover:-translate-y-0.5 transition-transform duration-300"
            />
            Export
          </button>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-200 dark:border-gray-700 overflow-hidden animate-fade-in-up">
        {loading ? (
          <div className="p-12 text-center text-gray-500">
            <div className="flex flex-col items-center gap-3">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
              <span className="text-sm font-medium">Loading report...</span>
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gradient-to-r from-gray-100 to-gray-50 dark:from-gray-700 dark:to-gray-700/80 text-gray-600 dark:text-gray-300 uppercase tracking-wider text-xs font-bold sticky top-0 z-20 backdrop-blur-sm shadow-md">
                <tr>
                  <th className="px-4 py-4 text-left sticky left-0 bg-gradient-to-r from-gray-100 to-gray-50 dark:from-gray-700 dark:to-gray-700/80 z-20 w-48 border-r-2 border-gray-200 dark:border-gray-600">
                    Employee
                  </th>
                  {daysArray.map((day) => (
                    <th
                      key={day}
                      className="px-1 py-4 text-center min-w-[36px]"
                    >
                      {day}
                    </th>
                  ))}
                  <th className="px-4 py-4 text-center bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 border-l-2 border-gray-200 dark:border-gray-600">
                    P
                  </th>
                  <th className="px-4 py-4 text-center bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400">
                    A
                  </th>
                  <th className="px-4 py-4 text-center bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400">
                    HD
                  </th>
                  <th className="px-4 py-4 text-center bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400">
                    L
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700/50">
                {employees.length === 0 ? (
                  <tr>
                    <td
                      colSpan={daysInMonth + 5}
                      className="p-12 text-center text-gray-500"
                    >
                      <div className="flex flex-col items-center gap-2">
                        <Filter
                          className="text-gray-300 dark:text-gray-600"
                          size={48}
                        />
                        <span className="text-sm font-medium">
                          No active employees found
                        </span>
                        <span className="text-xs text-gray-400">
                          Add employees to view attendance report
                        </span>
                      </div>
                    </td>
                  </tr>
                ) : (
                  employees.map((emp, index) => {
                    const stats = calculateStats(emp.id);
                    return (
                      <tr
                        key={emp.id}
                        className="group hover:bg-gradient-to-r hover:from-purple-50/50 hover:to-violet-50/30 dark:hover:from-purple-900/10 dark:hover:to-violet-900/10 transition-all duration-300"
                      >
                        <td className="px-4 py-4 font-semibold text-gray-900 dark:text-white sticky left-0 bg-white dark:bg-gray-800 group-hover:bg-purple-50/50 dark:group-hover:bg-purple-900/10 z-10 border-r-2 border-gray-100 dark:border-gray-700 transition-all duration-300">
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-violet-600 flex items-center justify-center text-white font-bold text-xs shadow-md">
                              {emp.name.charAt(0)}
                            </div>
                            <div>
                              <div>{emp.name}</div>
                              <div className="text-xs text-gray-500 dark:text-gray-400 font-normal">
                                {emp.employee_profile?.designation}
                              </div>
                            </div>
                          </div>
                        </td>
                        {daysArray.map((day) => {
                          const status = getStatus(emp.id, day);
                          return (
                            <td key={day} className="px-1 py-2 text-center">
                              <span
                                className={`inline-flex items-center justify-center w-7 h-7 rounded-lg text-xs font-bold shadow-sm transition-all duration-200 ${getStatusColor(
                                  status,
                                )} ${
                                  status !== "-"
                                    ? "ring-1 ring-offset-1 ring-gray-200 dark:ring-gray-600"
                                    : ""
                                }`}
                              >
                                {getStatusLabel(status)}
                              </span>
                            </td>
                          );
                        })}
                        <td className="px-3 py-4 text-center font-bold text-green-700 dark:text-green-400 bg-green-50/50 dark:bg-green-900/20 border-l-2 border-gray-100 dark:border-gray-700">
                          {stats.present}
                        </td>
                        <td className="px-3 py-4 text-center font-bold text-red-700 dark:text-red-400 bg-red-50/50 dark:bg-red-900/20">
                          {stats.absent}
                        </td>
                        <td className="px-3 py-4 text-center font-bold text-yellow-700 dark:text-yellow-400 bg-yellow-50/50 dark:bg-yellow-900/20">
                          {stats.halfDay}
                        </td>
                        <td className="px-3 py-4 text-center font-bold text-blue-700 dark:text-blue-400 bg-blue-50/50 dark:bg-blue-900/20">
                          {stats.leave}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

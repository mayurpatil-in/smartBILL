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
      setAttendanceData(attendance);
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
      day
    ).padStart(2, "0")}`;
    const record = attendanceData.find(
      (a) => a.user_id === userId && a.date === dateStr
    );
    return record ? record.status : "-";
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
      <div className="bg-white dark:bg-gray-800 p-4 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 flex flex-col md:flex-row md:items-center justify-between gap-4 animate-fade-in">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-purple-50 dark:bg-purple-900/20 rounded-xl text-purple-600 dark:text-purple-400">
            <Calendar size={24} />
          </div>
          <div>
            <h3 className="font-semibold text-gray-900 dark:text-white">
              Monthly Report
            </h3>
            <p className="text-sm text-gray-500">
              View attendance summary for the month
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Month:
            </span>
            <select
              value={month}
              onChange={(e) => setMonth(parseInt(e.target.value))}
              className="px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 outline-none focus:ring-2 focus:ring-blue-500/20"
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
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Year:
            </span>
            <input
              type="number"
              value={year}
              onChange={(e) => setYear(parseInt(e.target.value))}
              className="w-20 px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 outline-none focus:ring-2 focus:ring-blue-500/20"
            />
          </div>
          <button
            onClick={exportToExcel}
            className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-xl font-medium transition-colors shadow-lg shadow-green-600/20 flex items-center gap-2"
          >
            <Download size={18} /> Export
          </button>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden animate-fade-in-up">
        {loading ? (
          <div className="p-8 text-center text-gray-500">Loading report...</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 dark:bg-gray-900/50 border-b border-gray-100 dark:border-gray-700">
                <tr>
                  <th className="px-4 py-3 text-left font-semibold text-gray-900 dark:text-white sticky left-0 bg-gray-50 dark:bg-gray-900/90 z-10 w-48">
                    Employee
                  </th>
                  {daysArray.map((day) => (
                    <th
                      key={day}
                      className="px-1 py-3 text-center min-w-[32px] font-medium text-gray-500"
                    >
                      {day}
                    </th>
                  ))}
                  <th className="px-4 py-3 text-center font-semibold text-green-600 bg-green-50/50">
                    P
                  </th>
                  <th className="px-4 py-3 text-center font-semibold text-red-600 bg-red-50/50">
                    A
                  </th>
                  <th className="px-4 py-3 text-center font-semibold text-yellow-600 bg-yellow-50/50">
                    HD
                  </th>
                  <th className="px-4 py-3 text-center font-semibold text-blue-600 bg-blue-50/50">
                    L
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                {employees.length === 0 ? (
                  <tr>
                    <td
                      colSpan={daysInMonth + 5}
                      className="p-8 text-center text-gray-500"
                    >
                      No active employees found
                    </td>
                  </tr>
                ) : (
                  employees.map((emp) => {
                    const stats = calculateStats(emp.id);
                    return (
                      <tr
                        key={emp.id}
                        className="hover:bg-gray-50 dark:hover:bg-gray-700/50"
                      >
                        <td className="px-4 py-3 font-medium text-gray-900 dark:text-white sticky left-0 bg-white dark:bg-gray-800 z-10 border-r border-gray-100 dark:border-gray-700">
                          {emp.name}
                          <div className="text-xs text-gray-500 font-normal">
                            {emp.employee_profile?.designation}
                          </div>
                        </td>
                        {daysArray.map((day) => {
                          const status = getStatus(emp.id, day);
                          return (
                            <td key={day} className="px-1 py-1 text-center">
                              <span
                                className={`inline-flex items-center justify-center w-6 h-6 rounded text-xs font-bold ${getStatusColor(
                                  status
                                )}`}
                              >
                                {getStatusLabel(status)}
                              </span>
                            </td>
                          );
                        })}
                        <td className="px-2 py-3 text-center font-semibold text-green-600 bg-green-50/30">
                          {stats.present}
                        </td>
                        <td className="px-2 py-3 text-center font-semibold text-red-600 bg-red-50/30">
                          {stats.absent}
                        </td>
                        <td className="px-2 py-3 text-center font-semibold text-yellow-600 bg-yellow-50/30">
                          {stats.halfDay}
                        </td>
                        <td className="px-2 py-3 text-center font-semibold text-blue-600 bg-blue-50/30">
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

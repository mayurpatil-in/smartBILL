import { useState, useEffect } from "react";
import {
  Calendar,
  Download,
  User,
  Mail,
  Briefcase,
  CalendarDays,
  DollarSign,
  IndianRupee,
  ChevronLeft,
  ChevronRight,
  CheckCircle,
  XCircle,
  Clock,
  TrendingUp,
  LogOut,
  Award,
  Target,
  Coffee,
  PartyPopper,
} from "lucide-react";
import toast from "react-hot-toast";
import { useAuth } from "../../hooks/useAuth";
import {
  getMyProfile,
  getMyAttendance,
  getMySalarySlips,
  getMySalarySlipPdf,
} from "../../api/employeePortal";

export default function EmployeeDashboard() {
  const { logout } = useAuth();
  const [profile, setProfile] = useState(null);
  const [attendance, setAttendance] = useState(null);
  const [holidays, setHolidays] = useState([]);
  const [offDays, setOffDays] = useState([]);
  const [salarySlips, setSalarySlips] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    loadAttendance();
  }, [selectedMonth, selectedYear]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [profileData, salarySlipsData] = await Promise.all([
        getMyProfile(),
        getMySalarySlips(),
      ]);
      setProfile(profileData);
      setSalarySlips(salarySlipsData);
    } catch (error) {
      toast.error("Failed to load data");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const loadAttendance = async () => {
    try {
      const data = await getMyAttendance(selectedMonth, selectedYear);
      setAttendance(data);
      if (data.holidays) setHolidays(data.holidays);
      if (data.off_days) setOffDays(data.off_days);
    } catch (error) {
      console.error("Failed to load attendance:", error);
    }
  };

  const handlePreviousMonth = () => {
    if (selectedMonth === 1) {
      setSelectedMonth(12);
      setSelectedYear(selectedYear - 1);
    } else {
      setSelectedMonth(selectedMonth - 1);
    }
  };

  const handleNextMonth = () => {
    if (selectedMonth === 12) {
      setSelectedMonth(1);
      setSelectedYear(selectedYear + 1);
    } else {
      setSelectedMonth(selectedMonth + 1);
    }
  };

  const getMonthName = (month) => {
    return new Date(2000, month - 1, 1).toLocaleString("default", {
      month: "long",
    });
  };

  const renderCalendar = () => {
    if (!attendance) return null;

    const firstDay = new Date(selectedYear, selectedMonth - 1, 1).getDay();
    const daysInMonth = new Date(selectedYear, selectedMonth, 0).getDate();

    const days = [];
    const attendanceMap = {};
    const overtimeMap = {};

    // Create map of attendance by date
    if (attendance && attendance.records) {
      attendance.records.forEach((record) => {
        // Parse YYYY-MM-DD manually
        const [year, month, day] = record.date.split("-").map(Number);
        attendanceMap[day] = record.status;
        overtimeMap[day] =
          record.overtime_hours > 0 ? record.overtime_hours : null;
      });
    }

    // Create map of holidays by date
    const holidayMap = {};
    if (holidays) {
      holidays.forEach((h) => {
        const [year, month, day] = h.date.split("-").map(Number);
        holidayMap[day] = h.name;
      });
    }

    // Empty cells for days before month starts
    for (let i = 0; i < firstDay; i++) {
      days.push(<div key={`empty-${i}`} className="p-2"></div>);
    }

    // Days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      const status = attendanceMap[day];
      const holidayName = holidayMap[day];
      const overtime = overtimeMap[day];

      // Check if this day is a weekly off day (0=Mon, 6=Sun in Backend; JS: 0=Sun, 1=Mon)
      // Backend (Python): 0=Mon, 6=Sun
      // JS: 0=Sun, 1=Mon ... 6=Sat
      const jsDay = new Date(selectedYear, selectedMonth - 1, day).getDay();
      // Map JS day to Python day (0->6, 1->0, 2->1 ...)
      // JS: Sun(0), Mon(1), Tue(2)
      // Py: Sun(6), Mon(0), Tue(1)
      const pythonDay = jsDay === 0 ? 6 : jsDay - 1;
      const isOffDay = offDays.includes(pythonDay);

      let bgColor = "bg-gray-100 dark:bg-gray-700";
      let textColor = "text-gray-400";
      let icon = null;
      let title = "";

      // Normalize status to uppercase for comparison
      const statusUpper = status ? status.toUpperCase() : "";

      if (statusUpper === "PRESENT") {
        bgColor = "bg-green-100 dark:bg-green-900/30";
        textColor = "text-green-700 dark:text-green-400";
        icon = <CheckCircle size={16} />;
      } else if (statusUpper === "HALF_DAY" || statusUpper === "HALF DAY") {
        bgColor = "bg-yellow-100 dark:bg-yellow-900/30";
        textColor = "text-yellow-700 dark:text-yellow-400";
        icon = <Clock size={16} />;
      } else if (statusUpper === "ABSENT") {
        bgColor = "bg-red-100 dark:bg-red-900/30";
        textColor = "text-red-700 dark:text-red-400";
        icon = <XCircle size={16} />;
      } else if (statusUpper === "LEAVE") {
        bgColor = "bg-blue-100 dark:bg-blue-900/30";
        textColor = "text-blue-700 dark:text-blue-400";
        icon = <Coffee size={16} />;
      }

      // Holiday Override (Visually)
      if (holidayName) {
        if (statusUpper !== "PRESENT" && statusUpper !== "HALF_DAY") {
          bgColor = "bg-pink-100 dark:bg-pink-900/30";
          textColor = "text-pink-700 dark:text-pink-400";
          icon = <PartyPopper size={16} />;
          title = holidayName;
        }
      }

      // Weekly Off Override (Visually)
      if (isOffDay && !holidayName) {
        if (
          statusUpper !== "PRESENT" &&
          statusUpper !== "HALF_DAY" &&
          statusUpper !== "ABSENT"
        ) {
          // Only show as Weekend if not marked manually
          bgColor = "bg-purple-100 dark:bg-purple-900/30";
          textColor = "text-purple-700 dark:text-purple-400";
          icon = <Coffee size={16} />; // Reuse coffee for relaxing weekend
          title = "Weekly Off";
        }
      }

      const iconSize = window.innerWidth < 640 ? 12 : 16;

      days.push(
        <div
          key={day}
          title={title}
          className={`relative p-2 sm:p-3 rounded-lg ${bgColor} ${textColor} font-semibold flex flex-col items-center justify-center gap-0.5 sm:gap-1 transition-all hover:scale-105 min-h-[50px] sm:min-h-[80px] overflow-hidden`}
        >
          <span className="text-sm sm:text-lg">{day}</span>
          {icon}

          {/* Overtime Badge */}
          {overtime && (
            <div className="absolute top-0 right-0 bg-cyan-500 text-white text-[9px] sm:text-[10px] px-1 sm:px-1.5 py-0.5 rounded-bl-lg font-bold shadow-sm">
              +{overtime}h
            </div>
          )}
        </div>,
      );
    }

    return days;
  };

  const handleDownloadSlip = async (month, year) => {
    try {
      const blob = await getMySalarySlipPdf(month, year);
      // Create a blob with the correct PDF MIME type
      const pdfBlob = new Blob([blob], { type: "application/pdf" });
      const url = window.URL.createObjectURL(pdfBlob);

      // Open in new tab
      window.open(url, "_blank");

      // Note: We can't revokeURL immediately if opening in new tab,
      // but browsers handle cleanup eventually
      setTimeout(() => window.URL.revokeObjectURL(url), 60000);
    } catch (error) {
      console.error("Failed to load salary slip:", error);
      toast.error("Failed to load salary slip");
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="relative">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-gray-200 dark:border-gray-700"></div>
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-t-blue-600 border-r-transparent border-b-transparent border-l-transparent absolute top-0"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50/30 to-indigo-50/50 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800 p-4 sm:p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Premium Header with Animated Gradient */}
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-blue-600 via-indigo-600 to-purple-700 p-6 sm:p-8 shadow-2xl">
          {/* Animated Background Pattern */}
          <div className="absolute inset-0 opacity-10">
            <div
              className="absolute inset-0 animate-pulse"
              style={{
                backgroundImage: `radial-gradient(circle at 2px 2px, white 1px, transparent 0)`,
                backgroundSize: "40px 40px",
              }}
            ></div>
          </div>

          {/* Floating Orbs */}
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl animate-pulse"></div>
          <div className="absolute bottom-0 left-0 w-48 h-48 bg-purple-400/10 rounded-full blur-3xl animate-pulse delay-700"></div>

          <div className="relative">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-6">
              <div className="flex items-center gap-4">
                <div className="relative group">
                  <div className="absolute inset-0 bg-white/30 rounded-full blur-xl group-hover:blur-2xl transition-all"></div>
                  <div className="relative w-16 h-16 md:w-20 md:h-20 rounded-full bg-gradient-to-br from-white/30 to-white/10 backdrop-blur-sm flex items-center justify-center text-white text-2xl md:text-3xl font-bold shrink-0 border-2 border-white/20 shadow-xl">
                    {profile?.name?.charAt(0).toUpperCase()}
                  </div>
                </div>
                <div>
                  <h1 className="text-2xl md:text-4xl font-bold text-white tracking-tight break-words flex items-center gap-2">
                    Welcome back, {profile?.name?.split(" ")[0]}
                    <Award
                      className="text-yellow-300 animate-pulse"
                      size={28}
                    />
                  </h1>
                  <p className="text-blue-100 text-base md:text-lg font-medium mt-1">
                    Employee Portal Dashboard
                  </p>
                </div>
              </div>
              <button
                onClick={logout}
                className="flex items-center justify-center gap-2 px-6 py-3 bg-white/20 hover:bg-white/30 backdrop-blur-md text-white rounded-xl transition-all w-full md:w-auto mt-2 md:mt-0 border border-white/20 hover:border-white/40 shadow-lg hover:shadow-xl transform hover:scale-105 duration-200"
              >
                <LogOut size={20} />
                <span className="font-semibold">Logout</span>
              </button>
            </div>

            {/* Enhanced Info Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-8">
              <div className="group bg-white/15 hover:bg-white/20 backdrop-blur-md rounded-2xl p-5 border border-white/20 hover:border-white/30 transition-all duration-300 transform hover:scale-105 hover:shadow-2xl">
                <div className="flex items-center gap-3 mb-3">
                  <div className="p-2.5 bg-white/20 rounded-xl group-hover:bg-white/30 transition-all">
                    <Mail size={20} className="text-white" />
                  </div>
                  <span className="text-sm font-bold text-white/90 uppercase tracking-wider">
                    Email Address
                  </span>
                </div>
                <p className="text-white text-lg font-semibold truncate">
                  {profile?.email || "N/A"}
                </p>
              </div>

              <div className="group bg-white/15 hover:bg-white/20 backdrop-blur-md rounded-2xl p-5 border border-white/20 hover:border-white/30 transition-all duration-300 transform hover:scale-105 hover:shadow-2xl">
                <div className="flex items-center gap-3 mb-3">
                  <div className="p-2.5 bg-white/20 rounded-xl group-hover:bg-white/30 transition-all">
                    <Briefcase size={20} className="text-white" />
                  </div>
                  <span className="text-sm font-bold text-white/90 uppercase tracking-wider">
                    Employee ID
                  </span>
                </div>
                <p className="text-white text-lg font-semibold">
                  EMP-
                  {String(
                    profile?.employee_profile?.company_employee_id ||
                      profile?.id,
                  ).padStart(3, "0")}
                </p>
              </div>

              <div className="group bg-white/15 hover:bg-white/20 backdrop-blur-md rounded-2xl p-5 border border-white/20 hover:border-white/30 transition-all duration-300 transform hover:scale-105 hover:shadow-2xl">
                <div className="flex items-center gap-3 mb-3">
                  <div className="p-2.5 bg-white/20 rounded-xl group-hover:bg-white/30 transition-all">
                    <Target size={20} className="text-white" />
                  </div>
                  <span className="text-sm font-bold text-white/90 uppercase tracking-wider">
                    Designation
                  </span>
                </div>
                <p className="text-white text-lg font-semibold">
                  {profile?.employee_profile?.designation || "Employee"}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Attendance Calendar with Enhanced Design */}
        <div className="bg-white dark:bg-gray-800 rounded-3xl border border-gray-200 dark:border-gray-700 shadow-xl overflow-hidden hover:shadow-2xl transition-shadow duration-300">
          <div className="bg-gradient-to-r from-blue-50 via-indigo-50 to-purple-50 dark:from-blue-900/20 dark:via-indigo-900/20 dark:to-purple-900/20 p-4 sm:p-6 border-b border-blue-100 dark:border-blue-900/30">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-3 w-full sm:w-auto">
                <div className="p-3 bg-gradient-to-br from-blue-500 via-indigo-600 to-purple-600 rounded-2xl shrink-0 shadow-lg">
                  <Calendar className="text-white" size={24} />
                </div>
                <div>
                  <h2 className="text-xl sm:text-2xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                    My Attendance
                  </h2>
                  <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400 font-medium">
                    Track your monthly presence
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-between w-full sm:w-auto bg-white dark:bg-gray-700/50 p-2 rounded-2xl shadow-md border border-gray-200 dark:border-gray-600">
                <button
                  onClick={handlePreviousMonth}
                  className="p-2.5 hover:bg-blue-100 dark:hover:bg-blue-900/30 rounded-xl transition-all transform hover:scale-110 active:scale-95"
                >
                  <ChevronLeft
                    size={20}
                    className="text-gray-700 dark:text-gray-300"
                  />
                </button>
                <div className="text-center min-w-[120px] sm:min-w-[150px] px-3">
                  <div className="text-lg sm:text-xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                    {getMonthName(selectedMonth)} {selectedYear}
                  </div>
                </div>
                <button
                  onClick={handleNextMonth}
                  className="p-2.5 hover:bg-blue-100 dark:hover:bg-blue-900/30 rounded-xl transition-all transform hover:scale-110 active:scale-95"
                >
                  <ChevronRight
                    size={20}
                    className="text-gray-700 dark:text-gray-300"
                  />
                </button>
              </div>
            </div>
          </div>

          <div className="p-6">
            {/* Calendar Grid */}
            <div className="grid grid-cols-7 gap-2 mb-4">
              {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
                <div
                  key={day}
                  className="text-center font-bold text-gray-600 dark:text-gray-400 text-sm uppercase tracking-wide py-2"
                >
                  {day}
                </div>
              ))}
              {renderCalendar()}
            </div>

            {/* Legend & Summary */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6 pt-6 border-t-2 border-gray-200 dark:border-gray-700">
              {/* Legend */}
              <div>
                <h3 className="font-bold text-gray-900 dark:text-white mb-3 uppercase tracking-wide text-sm">
                  Legend
                </h3>
                <div className="flex flex-wrap gap-4">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 bg-green-100 dark:bg-green-900/30 rounded-lg flex items-center justify-center">
                      <CheckCircle
                        size={14}
                        className="text-green-700 dark:text-green-400"
                      />
                    </div>
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      Present
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 bg-yellow-100 dark:bg-yellow-900/30 rounded-lg flex items-center justify-center">
                      <Clock
                        size={14}
                        className="text-yellow-700 dark:text-yellow-400"
                      />
                    </div>
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      Half Day
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 bg-red-100 dark:bg-red-900/30 rounded-lg flex items-center justify-center">
                      <XCircle
                        size={14}
                        className="text-red-700 dark:text-red-400"
                      />
                    </div>
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      Absent
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center">
                      <Coffee
                        size={14}
                        className="text-blue-700 dark:text-blue-400"
                      />
                    </div>
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      Leave
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 bg-pink-100 dark:bg-pink-900/30 rounded-lg flex items-center justify-center">
                      <PartyPopper
                        size={14}
                        className="text-pink-700 dark:text-pink-400"
                      />
                    </div>
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      Holiday
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 bg-purple-100 dark:bg-purple-900/30 rounded-lg flex items-center justify-center">
                      <Coffee
                        size={14}
                        className="text-purple-700 dark:text-purple-400"
                      />
                    </div>
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      Weekend
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 bg-gray-100 dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600"></div>
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      Not Marked
                    </span>
                  </div>
                </div>
              </div>

              {/* Summary */}
              {attendance?.summary && (
                <div>
                  <h3 className="font-bold text-gray-900 dark:text-white mb-3 uppercase tracking-wide text-sm">
                    Summary
                  </h3>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-3 border-2 border-green-200 dark:border-green-800">
                      <div className="text-2xl font-bold text-green-700 dark:text-green-400">
                        {attendance.summary.present_days}
                      </div>
                      <div className="text-xs text-green-600 dark:text-green-500 font-semibold">
                        Present Days
                      </div>
                    </div>
                    <div className="bg-red-50 dark:bg-red-900/20 rounded-lg p-3 border-2 border-red-200 dark:border-red-800">
                      <div className="text-2xl font-bold text-red-700 dark:text-red-400">
                        {attendance.summary.absent_days}
                      </div>
                      <div className="text-xs text-red-600 dark:text-red-500 font-semibold">
                        Absent Days
                      </div>
                    </div>
                    <div className="bg-yellow-50 dark:bg-yellow-900/20 rounded-lg p-3 border-2 border-yellow-200 dark:border-yellow-800">
                      <div className="text-2xl font-bold text-yellow-700 dark:text-yellow-400">
                        {attendance.summary.half_days}
                      </div>
                      <div className="text-xs text-yellow-600 dark:text-yellow-500 font-semibold">
                        Half Days
                      </div>
                    </div>
                    <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-3 border-2 border-blue-200 dark:border-blue-800">
                      <div className="text-2xl font-bold text-blue-700 dark:text-blue-400">
                        {attendance.summary.leave_days || 0}
                      </div>
                      <div className="text-xs text-blue-600 dark:text-blue-500 font-semibold">
                        Leaves
                      </div>
                    </div>
                    <div className="bg-pink-50 dark:bg-pink-900/20 rounded-lg p-3 border-2 border-pink-200 dark:border-pink-800">
                      <div className="text-2xl font-bold text-pink-700 dark:text-pink-400">
                        {attendance.summary.holidays_count || 0}
                      </div>
                      <div className="text-xs text-pink-600 dark:text-pink-500 font-semibold">
                        Holidays
                      </div>
                    </div>
                    <div className="bg-cyan-50 dark:bg-cyan-900/20 rounded-lg p-3 border-2 border-cyan-200 dark:border-cyan-800">
                      <div className="text-2xl font-bold text-cyan-700 dark:text-cyan-400">
                        {attendance.summary.total_overtime_hours.toFixed(1)}h
                      </div>
                      <div className="text-xs text-cyan-600 dark:text-cyan-500 font-semibold">
                        Overtime
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Salary Slips with Premium Design */}
        <div className="bg-white dark:bg-gray-800 rounded-3xl border border-gray-200 dark:border-gray-700 shadow-xl overflow-hidden hover:shadow-2xl transition-shadow duration-300">
          <div className="bg-gradient-to-r from-green-50 via-emerald-50 to-teal-50 dark:from-green-900/20 dark:via-emerald-900/20 dark:to-teal-900/20 p-4 sm:p-6 border-b border-green-100 dark:border-green-900/30">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-gradient-to-br from-green-500 via-emerald-600 to-teal-600 rounded-2xl shadow-lg">
                <IndianRupee className="text-white" size={24} />
              </div>
              <div>
                <h2 className="text-xl sm:text-2xl font-bold bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent">
                  My Salary Slips
                </h2>
                <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400 font-medium">
                  Download your payment history
                </p>
              </div>
            </div>
          </div>

          <div className="p-4 sm:p-6">
            {salarySlips.length === 0 ? (
              <div className="text-center py-16">
                <div className="inline-flex p-6 bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-700 dark:to-gray-800 rounded-3xl mb-6">
                  <IndianRupee
                    className="text-gray-400 dark:text-gray-500"
                    size={64}
                  />
                </div>
                <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-3">
                  No Salary Slips Yet
                </h3>
                <p className="text-gray-600 dark:text-gray-400 text-lg">
                  Your salary slips will appear here once processed
                </p>
              </div>
            ) : (
              <div className="grid gap-4">
                {salarySlips.map((slip, index) => (
                  <div
                    key={index}
                    className="group relative flex flex-col sm:flex-row items-start sm:items-center justify-between p-5 sm:p-6 bg-gradient-to-br from-white to-gray-50 dark:from-gray-800 dark:to-gray-900 rounded-2xl border-2 border-gray-200 dark:border-gray-700 hover:border-green-400 dark:hover:border-green-600 transition-all duration-300 shadow-md hover:shadow-xl transform hover:scale-[1.02] gap-4"
                  >
                    {/* Decorative Gradient Bar */}
                    <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-gradient-to-b from-green-500 via-emerald-500 to-teal-500 rounded-l-2xl opacity-0 group-hover:opacity-100 transition-opacity"></div>

                    <div className="flex items-center gap-4 w-full sm:w-auto">
                      <div className="relative">
                        <div className="absolute inset-0 bg-gradient-to-br from-green-400 to-emerald-500 rounded-2xl blur-lg opacity-50 group-hover:opacity-75 transition-opacity"></div>
                        <div className="relative p-4 bg-gradient-to-br from-green-500 via-emerald-600 to-teal-600 rounded-2xl shrink-0 shadow-lg">
                          <CalendarDays className="text-white" size={28} />
                        </div>
                      </div>
                      <div>
                        <div className="font-bold text-gray-900 dark:text-white text-xl mb-1">
                          {slip.month_name} {slip.year}
                        </div>
                        <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                          <Clock size={14} />
                          <span>
                            Paid on:{" "}
                            {new Date(slip.payment_date).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between sm:justify-end gap-4 sm:gap-6 w-full sm:w-auto pt-4 sm:pt-0 border-t sm:border-0 border-gray-200 dark:border-gray-700">
                      <div className="text-left sm:text-right">
                        <div className="text-3xl font-bold bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent whitespace-nowrap mb-1">
                          ₹{slip.amount.toLocaleString()}
                        </div>
                        <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 rounded-full text-xs font-bold uppercase tracking-wider">
                          <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></div>
                          {slip.payment_method}
                        </div>
                      </div>
                      <button
                        onClick={() =>
                          handleDownloadSlip(slip.month, slip.year)
                        }
                        className="flex items-center gap-2 px-5 py-3 bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 hover:from-blue-700 hover:via-indigo-700 hover:to-purple-700 text-white rounded-xl transition-all shadow-lg hover:shadow-2xl cursor-pointer shrink-0 transform hover:scale-105 active:scale-95 font-semibold"
                      >
                        <Download size={20} />
                        <span className="hidden sm:inline">Download</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

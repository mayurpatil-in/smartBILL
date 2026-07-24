import { useState, useEffect } from "react";
import {
  Calendar,
  Download,
  User,
  Mail,
  Briefcase,
  CalendarDays,
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
  KeyRound,
  Shield,
  Phone,
  CreditCard,
  LayoutDashboard,
  FileText,
  Lock,
  QrCode,
  ExternalLink,
} from "lucide-react";
import toast from "react-hot-toast";
import { useAuth } from "../../hooks/useAuth";
import {
  getMyProfile,
  getMyAttendance,
  getMySalarySlips,
  getMySalarySlipPdf,
} from "../../api/employeePortal";
import ChangePasswordModal from "../../components/ChangePasswordModal";
import { formatDateDDMMYYYY } from "../../utils/dateUtils";

export default function EmployeeDashboard() {
  const { logout } = useAuth();
  const [profile, setProfile] = useState(null);
  const [attendance, setAttendance] = useState(null);
  const [holidays, setHolidays] = useState([]);
  const [offDays, setOffDays] = useState([]);
  const [salarySlips, setSalarySlips] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedMonth, setSelectedMonth] = useState(
    new Date().getMonth() + 1
  );
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

  // UI state
  const [activeTab, setActiveTab] = useState("overview");
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);

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
    } fontally: {
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

  const handleDownloadSlip = async (month, year) => {
    try {
      const blob = await getMySalarySlipPdf(month, year);
      const pdfBlob = new Blob([blob], { type: "text/html" });
      const url = window.URL.createObjectURL(pdfBlob);
      window.open(url, "_blank");
      setTimeout(() => window.URL.revokeObjectURL(url), 60000);
    } catch (error) {
      console.error("Failed to load salary slip:", error);
      toast.error("Failed to load salary slip");
    }
  };

  const handleDownloadAttendance = () => {
    try {
      window.print();
      toast.success("Opening print dialog...");
    } catch (error) {
      console.error("Failed to download attendance:", error);
      toast.error("Failed to download attendance report");
    }
  };

  const renderCalendar = () => {
    if (!attendance) return null;

    const firstDay = new Date(selectedYear, selectedMonth - 1, 1).getDay();
    const daysInMonth = new Date(selectedYear, selectedMonth, 0).getDate();

    const days = [];
    const attendanceMap = {};
    const overtimeMap = {};

    if (attendance && attendance.records) {
      attendance.records.forEach((record) => {
        const [year, month, day] = record.date.split("-").map(Number);
        attendanceMap[day] = record.status;
        overtimeMap[day] =
          record.overtime_hours > 0 ? record.overtime_hours : null;
      });
    }

    const holidayMap = {};
    if (holidays) {
      holidays.forEach((h) => {
        const [year, month, day] = h.date.split("-").map(Number);
        holidayMap[day] = h.name;
      });
    }

    for (let i = 0; i < firstDay; i++) {
      days.push(<div key={`empty-${i}`} className="p-2"></div>);
    }

    for (let day = 1; day <= daysInMonth; day++) {
      const status = attendanceMap[day];
      const holidayName = holidayMap[day];
      const overtime = overtimeMap[day];

      const jsDay = new Date(selectedYear, selectedMonth - 1, day).getDay();
      const pythonDay = jsDay === 0 ? 6 : jsDay - 1;
      const isOffDay = offDays.includes(pythonDay);

      let bgColor = "bg-gray-100 dark:bg-gray-700";
      let textColor = "text-gray-400";
      let icon = null;
      let title = "";

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

      if (holidayName) {
        if (statusUpper !== "PRESENT" && statusUpper !== "HALF_DAY") {
          bgColor = "bg-pink-100 dark:bg-pink-900/30";
          textColor = "text-pink-700 dark:text-pink-400";
          icon = <PartyPopper size={16} />;
          title = holidayName;
        }
      }

      if (isOffDay && !holidayName) {
        if (
          statusUpper !== "PRESENT" &&
          statusUpper !== "HALF_DAY" &&
          statusUpper !== "ABSENT"
        ) {
          bgColor = "bg-purple-100 dark:bg-purple-900/30";
          textColor = "text-purple-700 dark:text-purple-400";
          icon = <Coffee size={16} />;
          title = "Weekly Off";
        }
      }

      days.push(
        <div
          key={day}
          title={title}
          className={`relative p-2 sm:p-3 rounded-lg ${bgColor} ${textColor} font-semibold flex flex-col items-center justify-center gap-0.5 sm:gap-1 transition-all hover:scale-105 min-h-[50px] sm:min-h-[80px] overflow-hidden`}
        >
          <span className="text-sm sm:text-lg">{day}</span>
          {icon}

          {overtime && (
            <div className="absolute top-0 right-0 bg-cyan-500 text-white text-[9px] sm:text-[10px] px-1 sm:px-1.5 py-0.5 rounded-bl-lg font-bold shadow-sm">
              +{overtime}h
            </div>
          )}
        </div>
      );
    }

    return days;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50 dark:bg-gray-900">
        <div className="relative">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-gray-200 dark:border-gray-700"></div>
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-t-blue-600 border-r-transparent border-b-transparent border-l-transparent absolute top-0"></div>
        </div>
      </div>
    );
  }

  const employeeCode = `EMP-${String(
    profile?.employee_profile?.company_employee_id || profile?.id
  ).padStart(3, "0")}`;

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50/30 to-indigo-50/50 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800 p-4 sm:p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Premium Header Banner */}
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-blue-600 via-indigo-600 to-purple-700 p-6 sm:p-8 shadow-2xl">
          <div className="absolute inset-0 opacity-10">
            <div
              className="absolute inset-0 animate-pulse"
              style={{
                backgroundImage: `radial-gradient(circle at 2px 2px, white 1px, transparent 0)`,
                backgroundSize: "40px 40px",
              }}
            ></div>
          </div>

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
                  <p className="text-blue-100 text-sm md:text-base font-medium mt-1 flex items-center gap-2">
                    <span>Employee Portal</span>
                    <span className="opacity-50">•</span>
                    <span className="bg-white/20 px-2.5 py-0.5 rounded-full text-xs font-semibold">
                      {employeeCode}
                    </span>
                  </p>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center gap-3">
                <button
                  onClick={() => setIsPasswordModalOpen(true)}
                  className="flex items-center gap-2 px-4 py-2.5 bg-white/20 hover:bg-white/30 backdrop-blur-md text-white rounded-xl transition-all border border-white/20 hover:border-white/40 shadow-lg font-medium text-sm transform hover:scale-105 active:scale-95"
                >
                  <KeyRound size={18} />
                  <span>Change Password</span>
                </button>
                <button
                  onClick={logout}
                  className="flex items-center gap-2 px-5 py-2.5 bg-red-500/80 hover:bg-red-600 backdrop-blur-md text-white rounded-xl transition-all border border-white/20 shadow-lg font-semibold text-sm transform hover:scale-105 active:scale-95"
                >
                  <LogOut size={18} />
                  <span>Logout</span>
                </button>
              </div>
            </div>

            {/* Quick Info Bar */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-6 pt-6 border-t border-white/15">
              <div className="flex items-center gap-3 text-white/90">
                <div className="p-2 bg-white/10 rounded-lg">
                  <Mail size={16} />
                </div>
                <div className="truncate text-xs sm:text-sm">
                  <span className="block text-white/60 text-[10px] uppercase font-bold">
                    Email
                  </span>
                  <span className="font-semibold">{profile?.email || "N/A"}</span>
                </div>
              </div>

              <div className="flex items-center gap-3 text-white/90">
                <div className="p-2 bg-white/10 rounded-lg">
                  <Briefcase size={16} />
                </div>
                <div className="truncate text-xs sm:text-sm">
                  <span className="block text-white/60 text-[10px] uppercase font-bold">
                    Designation
                  </span>
                  <span className="font-semibold">
                    {profile?.employee_profile?.designation || "Employee"}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-3 text-white/90">
                <div className="p-2 bg-white/10 rounded-lg">
                  <Shield size={16} />
                </div>
                <div className="truncate text-xs sm:text-sm">
                  <span className="block text-white/60 text-[10px] uppercase font-bold">
                    Account Status
                  </span>
                  <span className="inline-flex items-center gap-1 font-semibold text-green-300">
                    <span className="w-1.5 h-1.5 bg-green-400 rounded-full animate-ping"></span>
                    Active Employee
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Tabbed Navigation Bar */}
        <div className="flex items-center gap-2 p-1.5 bg-white dark:bg-gray-800/80 backdrop-blur-md rounded-2xl border border-gray-200 dark:border-gray-700 shadow-md overflow-x-auto">
          <button
            onClick={() => setActiveTab("overview")}
            className={`flex items-center gap-2 px-5 py-3 rounded-xl font-bold text-sm transition-all whitespace-nowrap ${
              activeTab === "overview"
                ? "bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg shadow-blue-500/20"
                : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-700/50"
            }`}
          >
            <LayoutDashboard size={18} />
            <span>Overview</span>
          </button>

          <button
            onClick={() => setActiveTab("attendance")}
            className={`flex items-center gap-2 px-5 py-3 rounded-xl font-bold text-sm transition-all whitespace-nowrap ${
              activeTab === "attendance"
                ? "bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg shadow-blue-500/20"
                : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-700/50"
            }`}
          >
            <Calendar size={18} />
            <span>Attendance Calendar</span>
          </button>

          <button
            onClick={() => setActiveTab("salary")}
            className={`flex items-center gap-2 px-5 py-3 rounded-xl font-bold text-sm transition-all whitespace-nowrap ${
              activeTab === "salary"
                ? "bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg shadow-blue-500/20"
                : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-700/50"
            }`}
          >
            <IndianRupee size={18} />
            <span>Salary Slips</span>
            {salarySlips.length > 0 && (
              <span
                className={`ml-1.5 text-xs px-2 py-0.5 rounded-full font-extrabold ${
                  activeTab === "salary"
                    ? "bg-white/30 text-white"
                    : "bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300"
                }`}
              >
                {salarySlips.length}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab("profile")}
            className={`flex items-center gap-2 px-5 py-3 rounded-xl font-bold text-sm transition-all whitespace-nowrap ${
              activeTab === "profile"
                ? "bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg shadow-blue-500/20"
                : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-700/50"
            }`}
          >
            <User size={18} />
            <span>Profile & Security</span>
          </button>
        </div>

        {/* TAB CONTENT: OVERVIEW */}
        {activeTab === "overview" && (
          <div className="space-y-6">
            {/* Quick Metrics */}
            {attendance?.summary && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="group bg-gradient-to-br from-green-500 to-emerald-600 rounded-2xl p-5 shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:scale-105 border border-green-400/20">
                  <div className="flex items-center justify-between mb-3">
                    <div className="p-2.5 bg-white/20 rounded-xl">
                      <CheckCircle size={24} className="text-white" />
                    </div>
                    <TrendingUp size={20} className="text-white/60" />
                  </div>
                  <div className="text-3xl font-bold text-white mb-1">
                    {attendance.summary.present_days}
                  </div>
                  <div className="text-sm text-white/80 font-semibold uppercase tracking-wide">
                    Days Present
                  </div>
                </div>

                <div className="group bg-gradient-to-br from-cyan-500 to-blue-600 rounded-2xl p-5 shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:scale-105 border border-cyan-400/20">
                  <div className="flex items-center justify-between mb-3">
                    <div className="p-2.5 bg-white/20 rounded-xl">
                      <Clock size={24} className="text-white" />
                    </div>
                    <TrendingUp size={20} className="text-white/60" />
                  </div>
                  <div className="text-3xl font-bold text-white mb-1">
                    {attendance.summary.total_overtime_hours.toFixed(1)}h
                  </div>
                  <div className="text-sm text-white/80 font-semibold uppercase tracking-wide">
                    Overtime
                  </div>
                </div>

                <div className="group bg-gradient-to-br from-purple-500 to-indigo-600 rounded-2xl p-5 shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:scale-105 border border-purple-400/20">
                  <div className="flex items-center justify-between mb-3">
                    <div className="p-2.5 bg-white/20 rounded-xl">
                      <Target size={24} className="text-white" />
                    </div>
                    <Award size={20} className="text-white/60" />
                  </div>
                  <div className="text-3xl font-bold text-white mb-1">
                    {(() => {
                      const totalDays =
                        attendance.summary.present_days +
                        attendance.summary.half_days * 0.5 +
                        attendance.summary.absent_days;
                      const effectiveDays =
                        attendance.summary.present_days +
                        attendance.summary.half_days * 0.5;
                      return totalDays > 0
                        ? ((effectiveDays / totalDays) * 100).toFixed(0)
                        : 0;
                    })()}
                    %
                  </div>
                  <div className="text-sm text-white/80 font-semibold uppercase tracking-wide">
                    Attendance Rate
                  </div>
                </div>

                <div className="group bg-gradient-to-br from-orange-500 to-red-600 rounded-2xl p-5 shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:scale-105 border border-orange-400/20">
                  <div className="flex items-center justify-between mb-3">
                    <div className="p-2.5 bg-white/20 rounded-xl">
                      <Coffee size={24} className="text-white" />
                    </div>
                    <Calendar size={20} className="text-white/60" />
                  </div>
                  <div className="text-3xl font-bold text-white mb-1">
                    {(attendance.summary.leave_days || 0) +
                      attendance.summary.absent_days}
                  </div>
                  <div className="text-sm text-white/80 font-semibold uppercase tracking-wide">
                    Leaves / Absent
                  </div>
                </div>
              </div>
            )}

            {/* Quick Security & Digital ID Callout Card */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-gradient-to-r from-slate-900 to-indigo-950 text-white rounded-3xl p-6 shadow-xl border border-indigo-500/20 relative overflow-hidden flex flex-col justify-between">
                <div className="relative z-10">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="p-2.5 bg-indigo-500/20 rounded-xl border border-indigo-400/30">
                      <Lock className="text-indigo-400" size={24} />
                    </div>
                    <h3 className="text-lg font-bold">Security Settings</h3>
                  </div>
                  <p className="text-gray-300 text-sm mb-4">
                    Keep your account secure by updating your login password
                    periodically.
                  </p>
                </div>
                <button
                  onClick={() => setIsPasswordModalOpen(true)}
                  className="relative z-10 w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-xl transition-all shadow-md"
                >
                  <KeyRound size={18} />
                  <span>Update Password Now</span>
                </button>
              </div>

              <div className="bg-gradient-to-r from-blue-900 to-cyan-950 text-white rounded-3xl p-6 shadow-xl border border-cyan-500/20 relative overflow-hidden flex flex-col justify-between">
                <div className="relative z-10">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="p-2.5 bg-cyan-500/20 rounded-xl border border-cyan-400/30">
                      <QrCode className="text-cyan-400" size={24} />
                    </div>
                    <h3 className="text-lg font-bold">Digital ID Verification</h3>
                  </div>
                  <p className="text-gray-300 text-sm mb-4">
                    View your verified employee profile credentials and digital
                    badge.
                  </p>
                </div>
                <button
                  onClick={() => setActiveTab("profile")}
                  className="relative z-10 w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-cyan-600 hover:bg-cyan-500 text-white font-semibold rounded-xl transition-all shadow-md"
                >
                  <User size={18} />
                  <span>View Profile & ID Card</span>
                </button>
              </div>
            </div>

            {/* Recent Activity Timeline */}
            <div className="bg-white dark:bg-gray-800 rounded-3xl border border-gray-200 dark:border-gray-700 shadow-xl overflow-hidden">
              <div className="bg-gradient-to-r from-indigo-50 via-purple-50 to-pink-50 dark:from-indigo-900/20 dark:via-purple-900/20 dark:to-pink-900/20 p-4 sm:p-6 border-b border-indigo-100 dark:border-indigo-900/30">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-gradient-to-br from-indigo-500 via-purple-600 to-pink-600 rounded-2xl shadow-lg">
                    <Clock className="text-white" size={24} />
                  </div>
                  <div>
                    <h2 className="text-xl sm:text-2xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                      Recent Activity
                    </h2>
                    <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400 font-medium">
                      Your latest attendance logs and payouts
                    </p>
                  </div>
                </div>
              </div>

              <div className="p-4 sm:p-6">
                <div className="space-y-4">
                  {(() => {
                    const activities = [];

                    if (attendance?.records) {
                      const recentAttendance = [...attendance.records]
                        .sort((a, b) => new Date(b.date) - new Date(a.date))
                        .slice(0, 5);

                      recentAttendance.forEach((record) => {
                        activities.push({
                          type: "attendance",
                          date: record.date,
                          status: record.status,
                          overtime: record.overtime_hours,
                        });
                      });
                    }

                    if (salarySlips?.length > 0) {
                      const recentSlips = [...salarySlips].slice(0, 3);
                      recentSlips.forEach((slip) => {
                        activities.push({
                          type: "salary",
                          date: slip.payment_date,
                          month: slip.month_name,
                          year: slip.year,
                          amount: slip.amount,
                        });
                      });
                    }

                    activities.sort(
                      (a, b) => new Date(b.date) - new Date(a.date)
                    );
                    const topActivities = activities.slice(0, 8);

                    if (topActivities.length === 0) {
                      return (
                        <div className="text-center py-12">
                          <div className="inline-flex p-6 bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-700 dark:to-gray-800 rounded-3xl mb-4">
                            <Clock
                              className="text-gray-400 dark:text-gray-500"
                              size={48}
                            />
                          </div>
                          <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
                            No Recent Activity
                          </h3>
                          <p className="text-gray-600 dark:text-gray-400">
                            Your recent activities will appear here
                          </p>
                        </div>
                      );
                    }

                    return topActivities.map((activity, index) => {
                      if (activity.type === "attendance") {
                        const statusUpper =
                          activity.status?.toUpperCase() || "";
                        let bgColor = "bg-gray-100 dark:bg-gray-700";
                        let textColor = "text-gray-700 dark:text-gray-300";
                        let icon = <CheckCircle size={20} />;
                        let statusText = activity.status;

                        if (statusUpper === "PRESENT") {
                          bgColor = "bg-green-100 dark:bg-green-900/30";
                          textColor = "text-green-700 dark:text-green-400";
                          icon = <CheckCircle size={20} />;
                          statusText = "Present";
                        } else if (
                          statusUpper === "HALF_DAY" ||
                          statusUpper === "HALF DAY"
                        ) {
                          bgColor = "bg-yellow-100 dark:bg-yellow-900/30";
                          textColor = "text-yellow-700 dark:text-yellow-400";
                          icon = <Clock size={20} />;
                          statusText = "Half Day";
                        } else if (statusUpper === "ABSENT") {
                          bgColor = "bg-red-100 dark:bg-red-900/30";
                          textColor = "text-red-700 dark:text-red-400";
                          icon = <XCircle size={20} />;
                          statusText = "Absent";
                        } else if (statusUpper === "LEAVE") {
                          bgColor = "bg-blue-100 dark:bg-blue-900/30";
                          textColor = "text-blue-700 dark:text-blue-400";
                          icon = <Coffee size={20} />;
                          statusText = "Leave";
                        }

                        return (
                          <div
                            key={`attendance-${index}`}
                            className="flex items-center gap-4 p-4 bg-gradient-to-r from-gray-50 to-white dark:from-gray-800 dark:to-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 hover:shadow-md transition-all"
                          >
                            <div
                              className={`p-3 rounded-xl ${bgColor} ${textColor} shrink-0`}
                            >
                              {icon}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="font-semibold text-gray-900 dark:text-white">
                                Attendance: {statusText}
                              </div>
                              <div className="text-sm text-gray-600 dark:text-gray-400">
                                {new Date(activity.date).toLocaleDateString(
                                  "en-US",
                                  {
                                    weekday: "short",
                                    year: "numeric",
                                    month: "short",
                                    day: "numeric",
                                  }
                                )}
                                {activity.overtime > 0 && (
                                  <span className="ml-2 text-cyan-600 dark:text-cyan-400 font-semibold">
                                    +{activity.overtime}h OT
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      } else {
                        return (
                          <div
                            key={`salary-${index}`}
                            className="flex items-center gap-4 p-4 bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 rounded-xl border border-green-200 dark:border-green-800 hover:shadow-md transition-all"
                          >
                            <div className="p-3 rounded-xl bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 shrink-0">
                              <IndianRupee size={20} />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="font-semibold text-gray-900 dark:text-white">
                                Salary Paid: ₹{activity.amount.toLocaleString()}
                              </div>
                              <div className="text-sm text-gray-600 dark:text-gray-400">
                                {activity.month} {activity.year} •{" "}
                                {new Date(activity.date).toLocaleDateString()}
                              </div>
                            </div>
                          </div>
                        );
                      }
                    });
                  })()}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB CONTENT: ATTENDANCE CALENDAR */}
        {activeTab === "attendance" && (
          <div className="bg-white dark:bg-gray-800 rounded-3xl border border-gray-200 dark:border-gray-700 shadow-xl overflow-hidden">
            <div className="bg-gradient-to-r from-blue-50 via-indigo-50 to-purple-50 dark:from-blue-900/20 dark:via-indigo-900/20 dark:to-purple-900/20 p-4 sm:p-6 border-b border-blue-100 dark:border-blue-900/30">
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-3 w-full sm:w-auto">
                  <div className="p-3 bg-gradient-to-br from-blue-500 via-indigo-600 to-purple-600 rounded-2xl shrink-0 shadow-lg">
                    <Calendar className="text-white" size={24} />
                  </div>
                  <div>
                    <h2 className="text-xl sm:text-2xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                      My Attendance Calendar
                    </h2>
                    <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400 font-medium">
                      Monthly attendance record & presence log
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3 w-full sm:w-auto">
                  <button
                    onClick={handleDownloadAttendance}
                    className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white rounded-xl transition-all shadow-lg hover:shadow-xl font-semibold text-sm transform hover:scale-105 active:scale-95"
                    title="Download Attendance Report"
                  >
                    <Download size={18} />
                    <span className="hidden sm:inline">Print / Save PDF</span>
                  </button>

                  <div className="flex items-center justify-between flex-1 sm:flex-initial bg-white dark:bg-gray-700/50 p-2 rounded-2xl shadow-md border border-gray-200 dark:border-gray-600">
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
            </div>

            <div className="p-6">
              <div className="grid grid-cols-7 gap-2 mb-4">
                {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map(
                  (day) => (
                    <div
                      key={day}
                      className="text-center font-bold text-gray-600 dark:text-gray-400 text-sm uppercase tracking-wide py-2"
                    >
                      {day}
                    </div>
                  )
                )}
                {renderCalendar()}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6 pt-6 border-t-2 border-gray-200 dark:border-gray-700">
                <div>
                  <h3 className="font-bold text-gray-900 dark:text-white mb-3 uppercase tracking-wide text-sm">
                    Status Legend
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
                  </div>
                </div>

                {attendance?.summary && (
                  <div>
                    <h3 className="font-bold text-gray-900 dark:text-white mb-3 uppercase tracking-wide text-sm">
                      Monthly Totals
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
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* TAB CONTENT: SALARY SLIPS */}
        {activeTab === "salary" && (
          <div className="bg-white dark:bg-gray-800 rounded-3xl border border-gray-200 dark:border-gray-700 shadow-xl overflow-hidden">
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
                    Download official monthly pay statements & breakdown
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
                    No Salary Slips Available
                  </h3>
                  <p className="text-gray-600 dark:text-gray-400 text-lg">
                    Your salary slips will appear here once processed by HR/Admin
                  </p>
                </div>
              ) : (
                <div className="grid gap-4">
                  {salarySlips.map((slip, index) => (
                    <div
                      key={index}
                      className="group relative flex flex-col sm:flex-row items-start sm:items-center justify-between p-5 sm:p-6 bg-gradient-to-br from-white to-gray-50 dark:from-gray-800 dark:to-gray-900 rounded-2xl border-2 border-gray-200 dark:border-gray-700 hover:border-green-400 dark:hover:border-green-600 transition-all duration-300 shadow-md hover:shadow-xl transform hover:scale-[1.01] gap-4"
                    >
                      <div className="flex items-center gap-4 w-full sm:w-auto">
                        <div className="relative">
                          <div className="p-4 bg-gradient-to-br from-green-500 via-emerald-600 to-teal-600 rounded-2xl shrink-0 shadow-lg">
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
                          className="flex items-center gap-2 px-5 py-3 bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 hover:from-blue-700 hover:via-indigo-700 hover:to-purple-700 text-white rounded-xl transition-all shadow-lg hover:shadow-2xl cursor-pointer shrink-0 transform hover:scale-105 active:scale-95 font-semibold text-sm"
                        >
                          <Download size={18} />
                          <span>Download PDF</span>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB CONTENT: PROFILE & SECURITY */}
        {activeTab === "profile" && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left Column: Digital ID Badge */}
            <div className="bg-gradient-to-br from-blue-600 via-indigo-700 to-purple-800 rounded-3xl p-6 text-white shadow-2xl relative overflow-hidden flex flex-col justify-between min-h-[420px]">
              <div className="absolute top-0 right-0 w-48 h-48 bg-white/10 rounded-full blur-2xl"></div>

              <div>
                <div className="flex items-center justify-between mb-6 border-b border-white/20 pb-4">
                  <div className="flex items-center gap-2">
                    <Shield className="text-yellow-300" size={24} />
                    <span className="font-bold text-lg uppercase tracking-wider">
                      Employee ID Card
                    </span>
                  </div>
                  <span className="px-2.5 py-1 bg-green-500/30 border border-green-400/40 text-green-300 text-xs font-bold rounded-full uppercase">
                    Verified
                  </span>
                </div>

                <div className="flex flex-col items-center text-center my-6">
                  <div className="relative mb-4">
                    <div className="w-24 h-24 rounded-full bg-white/20 backdrop-blur-md border-4 border-white/30 flex items-center justify-center text-white text-4xl font-bold shadow-xl">
                      {profile?.name?.charAt(0).toUpperCase()}
                    </div>
                  </div>
                  <h3 className="text-2xl font-bold text-white mb-1">
                    {profile?.name}
                  </h3>
                  <p className="text-blue-200 text-sm font-semibold mb-2">
                    {profile?.employee_profile?.designation || "Employee"}
                  </p>
                  <div className="bg-white/15 px-3 py-1 rounded-lg text-xs font-mono font-bold tracking-widest border border-white/20">
                    ID: {employeeCode}
                  </div>
                </div>
              </div>

              <div className="bg-white/10 backdrop-blur-md p-4 rounded-2xl border border-white/15 text-xs space-y-2">
                <div className="flex justify-between items-center text-white/80">
                  <span>Joined Date:</span>
                  <span className="font-semibold text-white">
                    {formatDateDDMMYYYY(profile?.employee_profile?.joining_date)}
                  </span>
                </div>
                <div className="flex justify-between items-center text-white/80">
                  <span>Salary Type:</span>
                  <span className="font-semibold text-white uppercase">
                    {profile?.employee_profile?.salary_type || "MONTHLY"}
                  </span>
                </div>
              </div>
            </div>

            {/* Right Column: Detailed Info & Security Panel */}
            <div className="lg:col-span-2 space-y-6">
              {/* Security Panel */}
              <div className="bg-white dark:bg-gray-800 rounded-3xl p-6 border border-gray-200 dark:border-gray-700 shadow-xl">
                <div className="flex items-center justify-between mb-6 pb-4 border-b border-gray-100 dark:border-gray-700">
                  <div className="flex items-center gap-3">
                    <div className="p-3 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-2xl">
                      <Lock size={22} />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                        Account Security
                      </h3>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        Manage your password and security options
                      </p>
                    </div>
                  </div>

                  <button
                    onClick={() => setIsPasswordModalOpen(true)}
                    className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-semibold rounded-xl text-sm transition-all shadow-md transform hover:scale-105 active:scale-95"
                  >
                    <KeyRound size={18} />
                    <span>Change Password</span>
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                  <div className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-2xl border border-gray-100 dark:border-gray-600">
                    <span className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-1">
                      Login Email
                    </span>
                    <span className="font-semibold text-gray-900 dark:text-white">
                      {profile?.email}
                    </span>
                  </div>
                  <div className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-2xl border border-gray-100 dark:border-gray-600">
                    <span className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-1">
                      Password Last Changed
                    </span>
                    <span className="font-semibold text-gray-900 dark:text-white">
                      Protected
                    </span>
                  </div>
                </div>
              </div>

              {/* Personal Details Card */}
              <div className="bg-white dark:bg-gray-800 rounded-3xl p-6 border border-gray-200 dark:border-gray-700 shadow-xl space-y-6">
                <h3 className="text-lg font-bold text-gray-900 dark:text-white pb-3 border-b border-gray-100 dark:border-gray-700 flex items-center gap-2">
                  <User className="text-blue-600" size={20} />
                  <span>Personal & Bank Information</span>
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="p-4 bg-gray-50 dark:bg-gray-700/40 rounded-2xl">
                    <span className="block text-xs text-gray-500 dark:text-gray-400 font-bold uppercase mb-1">
                      Full Name
                    </span>
                    <span className="font-semibold text-gray-900 dark:text-white text-base">
                      {profile?.name}
                    </span>
                  </div>

                  <div className="p-4 bg-gray-50 dark:bg-gray-700/40 rounded-2xl">
                    <span className="block text-xs text-gray-500 dark:text-gray-400 font-bold uppercase mb-1">
                      Phone Number
                    </span>
                    <span className="font-semibold text-gray-900 dark:text-white text-base">
                      {profile?.employee_profile?.phone || "N/A"}
                    </span>
                  </div>

                  <div className="p-4 bg-gray-50 dark:bg-gray-700/40 rounded-2xl">
                    <span className="block text-xs text-gray-500 dark:text-gray-400 font-bold uppercase mb-1">
                      Bank Name
                    </span>
                    <span className="font-semibold text-gray-900 dark:text-white text-base">
                      {profile?.employee_profile?.bank_name || "N/A"}
                    </span>
                  </div>

                  <div className="p-4 bg-gray-50 dark:bg-gray-700/40 rounded-2xl">
                    <span className="block text-xs text-gray-500 dark:text-gray-400 font-bold uppercase mb-1">
                      Account Number
                    </span>
                    <span className="font-semibold text-gray-900 dark:text-white text-base">
                      {profile?.employee_profile?.account_number || "N/A"}
                    </span>
                  </div>

                  <div className="p-4 bg-gray-50 dark:bg-gray-700/40 rounded-2xl">
                    <span className="block text-xs text-gray-500 dark:text-gray-400 font-bold uppercase mb-1">
                      IFSC Code
                    </span>
                    <span className="font-semibold text-gray-900 dark:text-white text-base">
                      {profile?.employee_profile?.ifsc_code || "N/A"}
                    </span>
                  </div>

                  <div className="p-4 bg-gray-50 dark:bg-gray-700/40 rounded-2xl">
                    <span className="block text-xs text-gray-500 dark:text-gray-400 font-bold uppercase mb-1">
                      UPI ID
                    </span>
                    <span className="font-semibold text-gray-900 dark:text-white text-base">
                      {profile?.employee_profile?.upi_id || "N/A"}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Change Password Modal */}
      <ChangePasswordModal
        isOpen={isPasswordModalOpen}
        onClose={() => setIsPasswordModalOpen(false)}
      />
    </div>
  );
}

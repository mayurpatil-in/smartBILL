import { useState, useEffect } from "react";
import {
  Users,
  Plus,
  Search,
  Filter,
  Briefcase,
  IndianRupee,
  Calendar,
  MoreVertical,
  Edit,
  Trash2,
  Phone,
  Mail,
  UserCheck,
  Power,
  FileText,
  Download,
  History,
  CreditCard,
  TrendingUp,
  Building2,
  Coffee,
  PartyPopper,
  Settings,
} from "lucide-react";
import toast from "react-hot-toast";

import { API_URL } from "../api/axios";
import AddEmployeeModal from "../components/AddEmployeeModal";
import ConfirmDialog from "../components/ConfirmDialog";
import EmployeeAttendance from "../components/EmployeeAttendance";
import MonthlyAttendanceReport from "../components/MonthlyAttendanceReport";
import SalaryAdvanceModal from "../components/SalaryAdvanceModal";
import PdfPreviewModal from "../components/PdfPreviewModal";
import CompanyHolidays from "../components/CompanyHolidays";
import CompanyOffDays from "../components/CompanyOffDays";
import { generateSalarySlip } from "../utils/pdfGenerator";
import {
  getEmployees,
  deleteEmployee,
  updateEmployee,
  getEmployeeSalary,
  payEmployeeSalary,
  getEmployeeIDCard,
} from "../api/employees";
import { getExpenses, deleteExpense } from "../api/expenses";

function StatCard({ label, value, icon: Icon, color }) {
  const colors = {
    blue: {
      bg: "bg-gradient-to-br from-blue-50 to-cyan-100 dark:from-blue-900/30 dark:to-cyan-800/20",
      iconBg: "bg-gradient-to-br from-blue-500 to-cyan-600",
      text: "text-blue-600 dark:text-blue-400",
      shadow: "shadow-blue-500/20 dark:shadow-blue-500/10",
      hoverShadow: "hover:shadow-blue-500/30 dark:hover:shadow-blue-500/20",
    },
    green: {
      bg: "bg-gradient-to-br from-green-50 to-emerald-100 dark:from-green-900/30 dark:to-emerald-800/20",
      iconBg: "bg-gradient-to-br from-green-500 to-emerald-600",
      text: "text-green-600 dark:text-green-400",
      shadow: "shadow-green-500/20 dark:shadow-green-500/10",
      hoverShadow: "hover:shadow-green-500/30 dark:hover:shadow-green-500/20",
    },
    purple: {
      bg: "bg-gradient-to-br from-purple-50 to-violet-100 dark:from-purple-900/30 dark:to-violet-800/20",
      iconBg: "bg-gradient-to-br from-purple-500 to-violet-600",
      text: "text-purple-600 dark:text-purple-400",
      shadow: "shadow-purple-500/20 dark:shadow-purple-500/10",
      hoverShadow: "hover:shadow-purple-500/30 dark:hover:shadow-purple-500/20",
    },
  };

  const colorScheme = colors[color] || colors.blue;

  return (
    <div
      className={`group relative ${colorScheme.bg} p-4 sm:p-6 rounded-2xl shadow-lg ${colorScheme.shadow} ${colorScheme.hoverShadow} border border-gray-200 dark:border-gray-700 transition-all duration-300 hover:scale-105 hover:-translate-y-1 overflow-hidden`}
    >
      <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 dark:bg-black/10 rounded-full -mr-16 -mt-16 group-hover:scale-150 transition-transform duration-500"></div>

      <div className="relative flex items-center gap-3 sm:gap-4">
        <div
          className={`p-3 sm:p-4 rounded-xl ${colorScheme.iconBg} shadow-lg group-hover:scale-110 group-hover:rotate-6 transition-all duration-300`}
        >
          <Icon size={24} className="text-white sm:w-7 sm:h-7" />
        </div>
        <div className="flex-1">
          <h3
            className={`text-xl sm:text-2xl font-bold ${colorScheme.text} tabular-nums group-hover:scale-105 transition-transform duration-300 origin-left`}
          >
            {value}
          </h3>
          <p className="text-[10px] sm:text-xs text-gray-500 dark:text-gray-500 font-semibold uppercase tracking-wider mt-1">
            {label}
          </p>
        </div>
      </div>
    </div>
  );
}

export default function Employees() {
  const [activeTab, setActiveTab] = useState("list"); // list, attendance, payroll
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState(null);

  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [employeeToDelete, setEmployeeToDelete] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  // Preview State
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [pdfPreviewUrl, setPdfPreviewUrl] = useState(null);
  const [pdfTitle, setPdfTitle] = useState("");

  useEffect(() => {
    loadEmployees();
  }, [activeTab]); // Reload when tab changes just in case

  const loadEmployees = async () => {
    setLoading(true);
    try {
      const data = await getEmployees();
      setEmployees(data);
    } catch (err) {
      console.error(err);
      toast.error("Failed to load employees");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = (employee) => {
    setEmployeeToDelete(employee);
    setDeleteModalOpen(true);
  };

  const confirmDelete = async () => {
    if (!employeeToDelete) return;
    setDeleteLoading(true);
    try {
      await deleteEmployee(employeeToDelete.id);
      setEmployees(employees.filter((e) => e.id !== employeeToDelete.id));
      toast.success("Employee deleted");
      setDeleteModalOpen(false);
      setEmployeeToDelete(null);
    } catch (err) {
      toast.error("Failed to delete employee");
    } finally {
      setDeleteLoading(false);
    }
  };

  const handleStatusToggle = async (e, employee) => {
    e.stopPropagation();
    try {
      await updateEmployee(employee.id, { is_active: !employee.is_active });
      setEmployees(
        employees.map((e) =>
          e.id === employee.id ? { ...e, is_active: !employee.is_active } : e,
        ),
      );
      toast.success(
        `Employee marked as ${!employee.is_active ? "Active" : "Inactive"}`,
      );
    } catch (err) {
      console.error(err);
      toast.error("Failed to update status");
    }
  };

  const handleDownloadIDCard = async (emp) => {
    setIsPreviewOpen(true);
    setPdfPreviewUrl(null);
    setPdfTitle(`ID Card - ${emp.name}`);

    try {
      const url = await getEmployeeIDCard(emp.id);
      setPdfPreviewUrl(url);
    } catch (e) {
      setIsPreviewOpen(false);
      toast.error("Failed to generate ID Card");
    }
  };

  const filteredEmployees = employees.filter(
    (emp) =>
      emp.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      emp.email.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-gray-900 to-gray-600 dark:from-white dark:to-gray-300 bg-clip-text text-transparent">
            Employee Management
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1 text-sm sm:text-base">
            Manage your team, attendance, and payroll
          </p>
        </div>
        <button
          onClick={() => {
            setSelectedEmployee(null);
            setIsAddModalOpen(true);
          }}
          className="group flex items-center justify-center gap-2 px-4 sm:px-6 py-2.5 sm:py-3 bg-gradient-to-r from-blue-600 to-cyan-700 hover:from-blue-700 hover:to-cyan-800 text-white rounded-xl font-semibold transition-all duration-300 shadow-lg shadow-blue-600/30 hover:shadow-xl hover:shadow-blue-600/40 hover:scale-105 text-sm sm:text-base w-full md:w-auto"
        >
          <Plus
            size={18}
            className="group-hover:rotate-90 transition-transform duration-300 sm:w-5 sm:h-5"
          />
          Add Employee
        </button>
      </div>

      {/* Tabs */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-200 dark:border-gray-700 p-2 overflow-x-auto">
        <div className="flex gap-2 min-w-max">
          {[
            { id: "list", label: "All Employees", icon: Users },
            { id: "attendance", label: "Attendance", icon: Calendar },
            { id: "report", label: "Report", icon: FileText },
            { id: "payroll", label: "Payroll", icon: IndianRupee },
            { id: "history", label: "History", icon: History },
            { id: "holidays", label: "Holidays", icon: PartyPopper },
            { id: "weekends", label: "Weekends", icon: Coffee },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`group relative flex items-center gap-2.5 px-6 py-3 rounded-xl font-semibold transition-all duration-300 ${
                  isActive
                    ? "bg-gradient-to-r from-blue-600 to-cyan-700 text-white shadow-lg shadow-blue-600/30"
                    : "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-gray-900 dark:hover:text-white"
                }`}
              >
                <div
                  className={`p-1.5 rounded-lg transition-all duration-300 ${
                    isActive
                      ? "bg-white/20 backdrop-blur-md"
                      : "bg-gray-100 dark:bg-gray-700 group-hover:bg-gray-200 dark:group-hover:bg-gray-600"
                  }`}
                >
                  <Icon
                    size={18}
                    className={
                      isActive
                        ? "text-white"
                        : "text-gray-600 dark:text-gray-400 group-hover:text-gray-900 dark:group-hover:text-white"
                    }
                  />
                </div>
                <span className="whitespace-nowrap">{tab.label}</span>
                {isActive && (
                  <div className="absolute bottom-0 left-0 right-0 h-1 bg-white/30 rounded-full"></div>
                )}
              </button>
            );
          })}
        </div>
      </div>
      {activeTab === "list" && (
        <div className="space-y-6">
          {/* Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <StatCard
              label="Total Employees"
              value={employees.length}
              icon={Users}
              color="blue"
            />
            <StatCard
              label="Active"
              value={employees.filter((e) => e.is_active).length}
              icon={UserCheck}
              color="green"
            />
            <StatCard
              label="Monthly Payroll"
              value={`₹${employees
                .reduce((acc, curr) => {
                  const salary =
                    parseFloat(curr.employee_profile?.base_salary) || 0;
                  const type = curr.employee_profile?.salary_type;
                  // If daily, estimated monthly = daily * 26 days
                  return acc + (type === "daily" ? salary * 26 : salary);
                }, 0)
                .toLocaleString("en-IN")}`}
              icon={IndianRupee}
              color="purple"
            />
          </div>

          {/* List Content */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
            <div className="p-4 border-b border-gray-100 dark:border-gray-700 flex gap-4">
              <div className="relative flex-1 max-w-md">
                <Search
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                  size={18}
                />
                <input
                  type="text"
                  name="employee_search"
                  id="employee_search"
                  placeholder="Search employees..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 focus:ring-2 focus:ring-blue-500/20 outline-none"
                />
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gradient-to-r from-gray-100 to-gray-50 dark:from-gray-700 dark:to-gray-700/80 text-gray-600 dark:text-gray-300 uppercase tracking-wider text-xs font-bold sticky top-0 z-10 backdrop-blur-sm shadow-md">
                  <tr>
                    <th className="px-6 py-4 text-left whitespace-nowrap">
                      Name
                    </th>
                    <th className="px-6 py-4 text-left whitespace-nowrap">
                      Designation
                    </th>
                    <th className="px-6 py-4 text-left whitespace-nowrap">
                      Contact
                    </th>
                    <th className="px-6 py-4 text-left whitespace-nowrap">
                      Status
                    </th>
                    <th className="px-6 py-4 whitespace-nowrap">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-700/50">
                  {loading ? (
                    <tr>
                      <td
                        colSpan="5"
                        className="px-6 py-12 text-center text-gray-500"
                      >
                        <div className="flex flex-col items-center gap-3">
                          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                          <span className="text-sm font-medium">
                            Loading employees...
                          </span>
                        </div>
                      </td>
                    </tr>
                  ) : filteredEmployees.length === 0 ? (
                    <tr>
                      <td
                        colSpan="5"
                        className="px-6 py-12 text-center text-gray-500"
                      >
                        <div className="flex flex-col items-center gap-2">
                          <Users
                            className="text-gray-300 dark:text-gray-600"
                            size={48}
                          />
                          <span className="text-sm font-medium">
                            No employees found
                          </span>
                          <span className="text-xs text-gray-400">
                            Add your first employee to get started
                          </span>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    filteredEmployees.map((emp, index) => (
                      <tr
                        key={emp.id}
                        className="group hover:bg-gradient-to-r hover:from-blue-50/50 hover:to-cyan-50/30 dark:hover:from-blue-900/10 dark:hover:to-cyan-900/10 transition-all duration-300 hover:shadow-[inset_4px_0_0_0_rgb(59,130,246)]"
                      >
                        <td className="px-6 py-5">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-bold shadow-lg">
                              {emp.name.charAt(0)}
                            </div>
                            <div>
                              <p className="font-semibold text-gray-900 dark:text-white">
                                {emp.name}
                                <span className="ml-2 text-xs text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full dark:bg-blue-900/30 dark:text-blue-400">
                                  #
                                  {emp.employee_profile?.company_employee_id ||
                                    emp.id}
                                </span>
                              </p>
                              <p className="text-xs text-gray-500 dark:text-gray-400">
                                {emp.email}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-5">
                          <div className="flex items-center gap-2">
                            <div className="p-1.5 bg-amber-50 dark:bg-amber-900/30 rounded-md">
                              <Briefcase
                                size={14}
                                className="text-amber-600 dark:text-amber-400"
                              />
                            </div>
                            <span className="text-gray-700 dark:text-gray-300 font-medium">
                              {emp.employee_profile?.designation || "N/A"}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-5">
                          <div className="space-y-1.5">
                            <div className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-400">
                              <div className="p-1 bg-green-50 dark:bg-green-900/30 rounded">
                                <Phone
                                  size={12}
                                  className="text-green-600 dark:text-green-400"
                                />
                              </div>
                              {emp.employee_profile?.phone || "N/A"}
                            </div>
                            <div className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-400">
                              <div className="p-1 bg-blue-50 dark:bg-blue-900/30 rounded">
                                <Mail
                                  size={12}
                                  className="text-blue-600 dark:text-blue-400"
                                />
                              </div>
                              {emp.email}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-5">
                          <span
                            className={`px-3 py-1.5 rounded-full text-xs font-semibold ${
                              emp.is_active
                                ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 border border-green-200 dark:border-green-800"
                                : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 border border-red-200 dark:border-red-800"
                            }`}
                          >
                            {emp.is_active ? "Active" : "Inactive"}
                          </span>
                        </td>
                        <td className="px-6 py-5">
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => handleDownloadIDCard(emp)}
                              className="p-2 rounded-lg bg-purple-50 hover:bg-purple-100 dark:bg-purple-900/30 dark:hover:bg-purple-900/50 text-purple-600 dark:text-purple-400 transition-all duration-200 hover:scale-110 shadow-sm hover:shadow-md"
                              title="Download ID Card"
                            >
                              <CreditCard size={16} />
                            </button>
                            <button
                              onClick={() => {
                                setSelectedEmployee(emp);
                                setIsAddModalOpen(true);
                              }}
                              className="p-2 rounded-lg bg-green-50 hover:bg-green-100 dark:bg-green-900/30 dark:hover:bg-green-900/50 text-green-600 dark:text-green-400 transition-all duration-200 hover:scale-110 shadow-sm hover:shadow-md"
                              title="Edit Employee"
                            >
                              <Edit size={16} />
                            </button>
                            <button
                              onClick={(e) => handleStatusToggle(e, emp)}
                              className={`p-2 rounded-lg transition-all duration-200 hover:scale-110 shadow-sm hover:shadow-md ${
                                emp.is_active
                                  ? "bg-orange-50 hover:bg-orange-100 dark:bg-orange-900/30 dark:hover:bg-orange-900/50 text-orange-600 dark:text-orange-400"
                                  : "bg-gray-50 hover:bg-gray-100 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-600 dark:text-gray-400"
                              }`}
                              title={emp.is_active ? "Deactivate" : "Activate"}
                            >
                              <Power size={16} />
                            </button>
                            <button
                              onClick={() => handleDelete(emp)}
                              className="p-2 rounded-lg bg-red-50 hover:bg-red-100 dark:bg-red-900/30 dark:hover:bg-red-900/50 text-red-600 dark:text-red-400 transition-all duration-200 hover:scale-110 shadow-sm hover:shadow-md"
                              title="Delete Employee"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {activeTab === "attendance" && <EmployeeAttendance />}

      {activeTab === "report" && <MonthlyAttendanceReport />}

      {activeTab === "payroll" && <PayrollView employees={employees} />}

      {activeTab === "history" && <SalaryHistory />}

      {activeTab === "holidays" && <CompanyHolidays />}
      {activeTab === "weekends" && <CompanyOffDays />}

      <AddEmployeeModal
        open={isAddModalOpen}
        employee={selectedEmployee}
        onClose={() => setIsAddModalOpen(false)}
        onSuccess={loadEmployees}
      />

      <ConfirmDialog
        open={deleteModalOpen}
        onCancel={() => setDeleteModalOpen(false)}
        onConfirm={confirmDelete}
        title="Delete Employee"
        message={`Are you sure you want to delete ${employeeToDelete?.name}? This action cannot be undone.`}
      />

      {/* PDF Preview Modal */}
      <PdfPreviewModal
        isOpen={isPreviewOpen}
        onClose={() => {
          setIsPreviewOpen(false);
          if (pdfPreviewUrl) window.URL.revokeObjectURL(pdfPreviewUrl);
          setPdfPreviewUrl(null);
        }}
        pdfUrl={pdfPreviewUrl}
        title={pdfTitle}
        fileName={pdfTitle + ".pdf"}
      />
    </div>
  );
}

// Sub-component for Payroll (simplistic view)
function PayrollView({ employees }) {
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [year, setYear] = useState(new Date().getFullYear());
  const [salaries, setSalaries] = useState({});
  const [loading, setLoading] = useState(false);

  const [selectedEmpForAdvance, setSelectedEmpForAdvance] = useState(null);

  // Pay Salary State
  const [payModalOpen, setPayModalOpen] = useState(false);
  const [selectedEmpForPay, setSelectedEmpForPay] = useState(null);

  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [pdfPreviewUrl, setPdfPreviewUrl] = useState(null);
  const [pdfTitle, setPdfTitle] = useState("");

  const handlePayClick = (emp) => {
    setSelectedEmpForPay(emp);
    setPayModalOpen(true);
  };

  const handlePreviewSlip = async (slip, emp) => {
    setIsPreviewOpen(true);
    setPdfPreviewUrl(null); // Clear previous URL to show loader
    setPdfTitle(`Salary Slip - ${emp.name}`);

    // Allow UI to update before fetch
    const result = await generateSalarySlip(slip, emp);
    if (result) {
      setPdfPreviewUrl(result.url);
    } else {
      setIsPreviewOpen(false); // Close if failure
    }
  };

  useEffect(() => {
    if (employees.length > 0) calculateAll();
  }, [employees, month, year]);

  const calculateAll = async () => {
    setLoading(true);
    const map = {};
    try {
      const activeEmployees = employees.filter((e) => e.is_active);
      await Promise.all(
        activeEmployees.map(async (emp) => {
          const data = await getEmployeeSalary(emp.id, month, year);
          map[emp.id] = data;
        }),
      );
      setSalaries(map);
    } catch (e) {
      toast.error("Failed to calculate payroll");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-gray-800 p-4 sm:p-6 rounded-2xl shadow-xl border border-gray-200 dark:border-gray-700 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3 sm:gap-4">
          <div className="p-3 sm:p-4 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-xl text-white shadow-lg">
            <IndianRupee size={24} className="sm:w-7 sm:h-7" />
          </div>
          <div>
            <h3 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white">
              Payroll Management
            </h3>
            <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 mt-1">
              Calculate and manage salaries for{" "}
              {new Date(0, month - 1).toLocaleString("default", {
                month: "long",
              })}{" "}
              {year}
            </p>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row flex-wrap items-stretch sm:items-center gap-3 w-full md:w-auto">
          <div className="flex items-center gap-2 flex-1 sm:flex-none">
            <span className="text-xs sm:text-sm font-semibold text-gray-700 dark:text-gray-300 whitespace-nowrap">
              Month:
            </span>
            <select
              name="payroll_month"
              id="payroll_month"
              value={month}
              onChange={(e) => setMonth(parseInt(e.target.value))}
              className="flex-1 sm:flex-none px-3 sm:px-4 py-2 sm:py-2.5 rounded-xl border-2 border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all font-medium text-sm"
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
          <div className="flex items-center gap-2 flex-1 sm:flex-none">
            <span className="text-xs sm:text-sm font-semibold text-gray-700 dark:text-gray-300 whitespace-nowrap">
              Year:
            </span>
            <input
              type="number"
              name="payroll_year"
              id="payroll_year"
              value={year}
              onChange={(e) => setYear(parseInt(e.target.value))}
              className="flex-1 sm:flex-none sm:w-24 px-3 sm:px-4 py-2 sm:py-2.5 rounded-xl border-2 border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all font-medium text-sm"
            />
          </div>
          <button
            onClick={calculateAll}
            className="group px-4 sm:px-5 py-2 sm:py-2.5 bg-gradient-to-r from-blue-600 to-cyan-700 hover:from-blue-700 hover:to-cyan-800 text-white rounded-xl font-semibold transition-all duration-300 shadow-lg shadow-blue-600/30 hover:shadow-xl hover:shadow-blue-600/40 flex items-center justify-center gap-2 hover:scale-105 text-sm w-full sm:w-auto"
          >
            <Calendar
              size={16}
              className="group-hover:rotate-12 transition-transform duration-300 sm:w-[18px] sm:h-[18px]"
            />
            Refresh
          </button>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gradient-to-r from-gray-100 to-gray-50 dark:from-gray-700 dark:to-gray-700/80 text-gray-600 dark:text-gray-300 uppercase tracking-wider text-xs font-bold sticky top-0 z-10 backdrop-blur-sm shadow-md">
              <tr>
                <th className="px-6 py-4 text-left whitespace-nowrap">
                  Employee
                </th>
                <th className="px-6 py-4 text-left whitespace-nowrap">
                  Base Salary
                </th>
                <th className="px-6 py-4 text-left whitespace-nowrap">
                  Attendance
                </th>
                <th className="px-6 py-4 text-left whitespace-nowrap">
                  OT + Bonus
                </th>
                <th className="px-6 py-4 text-left whitespace-nowrap">
                  Advances
                </th>
                <th className="px-6 py-4 text-left whitespace-nowrap">
                  TDS / Tax
                </th>
                <th className="px-6 py-4 text-left whitespace-nowrap">
                  Prof. Tax
                </th>
                <th className="px-6 py-4 text-left whitespace-nowrap">
                  Net Pay
                </th>
                <th className="px-6 py-4 whitespace-nowrap">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700/50">
              {loading ? (
                <tr>
                  <td colSpan="7" className="py-12 text-center text-gray-500">
                    <div className="flex flex-col items-center gap-3">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600"></div>
                      <span className="text-sm font-medium">
                        Calculating payroll...
                      </span>
                    </div>
                  </td>
                </tr>
              ) : (
                employees
                  .filter((emp) => emp.is_active)
                  .map((emp, index) => {
                    const slip = salaries[emp.id];
                    return (
                      <tr
                        key={emp.id}
                        className="group hover:bg-gradient-to-r hover:from-emerald-50/50 hover:to-teal-50/30 dark:hover:from-emerald-900/10 dark:hover:to-teal-900/10 transition-all duration-300 hover:shadow-[inset_4px_0_0_0_rgb(16,185,129)]"
                      >
                        <td className="px-6 py-5">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-white font-bold shadow-lg">
                              {emp.name.charAt(0)}
                            </div>
                            <div>
                              <p className="font-semibold text-gray-900 dark:text-white">
                                {emp.name}
                              </p>
                              <p className="text-xs text-gray-500 dark:text-gray-400">
                                {emp.employee_profile?.designation}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-5">
                          <div className="flex items-center gap-2">
                            <div className="p-1.5 bg-blue-50 dark:bg-blue-900/30 rounded-md">
                              <IndianRupee
                                size={14}
                                className="text-blue-600 dark:text-blue-400"
                              />
                            </div>
                            <div>
                              <p className="font-semibold text-gray-900 dark:text-white">
                                ₹{emp.employee_profile?.base_salary}
                              </p>
                              <p className="text-xs text-gray-500 dark:text-gray-400 capitalize">
                                {emp.employee_profile?.salary_type}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-5">
                          <div className="flex items-center gap-2">
                            <div className="p-1.5 bg-purple-50 dark:bg-purple-900/30 rounded-md">
                              <Calendar
                                size={14}
                                className="text-purple-600 dark:text-purple-400"
                              />
                            </div>
                            <span className="font-medium text-gray-700 dark:text-gray-300">
                              {slip?.present_days || 0} /{" "}
                              {slip?.total_days || 30} Days
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-5">
                          {slip ? (
                            <div className="flex flex-col gap-1">
                              <div className="flex items-center gap-1.5 text-xs">
                                <span className="px-2 py-0.5 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 rounded-md font-semibold">
                                  OT: ₹{slip.total_overtime_pay}
                                </span>
                              </div>
                              <div className="flex items-center gap-1.5 text-xs">
                                <span className="px-2 py-0.5 bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 rounded-md font-semibold">
                                  Bonus: ₹{slip.total_bonus}
                                </span>
                              </div>
                            </div>
                          ) : (
                            <span className="text-gray-400">-</span>
                          )}
                        </td>
                        <td className="px-6 py-5">
                          <div className="flex items-center gap-2">
                            <span className="px-2.5 py-1 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 rounded-lg font-semibold text-sm">
                              {slip ? `-₹${slip.total_advances_deducted}` : "-"}
                            </span>
                            <button
                              onClick={() => setSelectedEmpForAdvance(emp)}
                              className="px-2.5 py-1 bg-blue-50 hover:bg-blue-100 dark:bg-blue-900/30 dark:hover:bg-blue-900/50 text-blue-600 dark:text-blue-400 rounded-lg text-xs font-semibold transition-all duration-200 hover:scale-105"
                            >
                              Manage
                            </button>
                          </div>
                        </td>
                        <td className="px-6 py-5">
                          <span className="px-2.5 py-1 bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400 rounded-lg font-semibold text-sm">
                            {slip ? `-₹${slip.tax_deduction}` : "-"}
                          </span>
                        </td>
                        <td className="px-6 py-5">
                          <span className="px-2.5 py-1 bg-pink-100 dark:bg-pink-900/30 text-pink-700 dark:text-pink-400 rounded-lg font-semibold text-sm">
                            {slip
                              ? `-₹${slip.professional_tax_deduction}`
                              : "-"}
                          </span>
                        </td>
                        <td className="px-6 py-5">
                          <div className="flex items-center gap-2">
                            <div className="p-1.5 bg-emerald-50 dark:bg-emerald-900/30 rounded-md">
                              <IndianRupee
                                size={16}
                                className="text-emerald-600 dark:text-emerald-400"
                              />
                            </div>
                            <span className="font-bold text-gray-900 dark:text-white text-lg">
                              {slip ? `₹${slip.final_payable}` : "-"}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-5">
                          <div className="flex items-center gap-2">
                            {slip?.is_paid ? (
                              <span className="px-3 py-1.5 bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 text-xs font-bold rounded-lg border border-green-200 dark:border-green-800 shadow-sm flex items-center gap-1.5">
                                <UserCheck size={14} /> Paid
                              </span>
                            ) : (
                              <button
                                onClick={() => handlePayClick(emp)}
                                className="group px-3 py-1.5 bg-gradient-to-r from-green-600 to-emerald-700 hover:from-green-700 hover:to-emerald-800 text-white text-xs font-semibold rounded-lg transition-all duration-200 shadow-md hover:shadow-lg flex items-center gap-1.5 hover:scale-105"
                                title="Pay Salary & Create Expense"
                              >
                                <IndianRupee
                                  size={14}
                                  className="group-hover:rotate-12 transition-transform duration-200"
                                />{" "}
                                Pay
                              </button>
                            )}

                            <button
                              onClick={() =>
                                slip && handlePreviewSlip(slip, emp)
                              }
                              disabled={!slip}
                              className="p-2 rounded-lg bg-blue-50 hover:bg-blue-100 dark:bg-blue-900/30 dark:hover:bg-blue-900/50 text-blue-600 dark:text-blue-400 transition-all duration-200 hover:scale-110 shadow-sm hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
                              title="Preview Slip"
                            >
                              <FileText size={18} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
              )}
            </tbody>
          </table>
        </div>
      </div>

      <SalaryAdvanceModal
        isOpen={!!selectedEmpForAdvance}
        onClose={() => {
          setSelectedEmpForAdvance(null);
          calculateAll(); // Refresh payroll to reflect new advances
        }}
        employee={selectedEmpForAdvance}
      />

      {/* Pay Salary Modal */}
      {payModalOpen && selectedEmpForPay && (
        <PaySalaryModal
          isOpen={payModalOpen}
          onClose={() => {
            setPayModalOpen(false);
            setSelectedEmpForPay(null);
          }}
          employee={selectedEmpForPay}
          amount={salaries[selectedEmpForPay.id]?.final_payable || 0}
          month={month}
          year={year}
          onSuccess={() => {
            toast.success("Salary Paid & Expense Created");
            setPayModalOpen(false);
            setSelectedEmpForPay(null);
          }}
        />
      )}

      {/* PDF Preview Modal */}
      <PdfPreviewModal
        isOpen={isPreviewOpen}
        onClose={() => {
          setIsPreviewOpen(false);
          if (pdfPreviewUrl) window.URL.revokeObjectURL(pdfPreviewUrl);
          setPdfPreviewUrl(null);
        }}
        pdfUrl={pdfPreviewUrl}
        title={pdfTitle}
        fileName={pdfTitle + ".pdf"}
      />
    </div>
  );
}

function PaySalaryModal({
  isOpen,
  onClose,
  employee,
  amount,
  month,
  year,
  onSuccess,
}) {
  const [paymentMethod, setPaymentMethod] = useState("Cash");
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await payEmployeeSalary(employee.id, month, year, paymentMethod);
      onSuccess();
    } catch (error) {
      console.error(error);
      const detail = error.response?.data?.detail;
      const msg =
        typeof detail === "string"
          ? detail
          : Array.isArray(detail)
            ? detail.map((d) => d.msg).join(", ")
            : "Failed to pay salary";
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-scale-in border border-gray-100 dark:border-gray-700">
        <div className="p-6 border-b border-gray-100 dark:border-gray-700">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <IndianRupee className="text-green-600" /> Pay Salary
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Confirm payment for {employee.name}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-xl border border-blue-100 dark:border-blue-800">
            <div className="flex justify-between items-center mb-1">
              <span className="text-sm text-gray-600 dark:text-gray-400">
                Net Payable Amount
              </span>
              <span className="text-lg font-bold text-gray-900 dark:text-white">
                ₹{amount}
              </span>
            </div>
            <div className="text-xs text-gray-500">
              For{" "}
              {new Date(0, month - 1).toLocaleString("default", {
                month: "long",
              })}{" "}
              {year}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Payment Method
            </label>
            <select
              value={paymentMethod}
              onChange={(e) => setPaymentMethod(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all"
            >
              <option value="Cash">Cash</option>
              <option value="Online">Online / UPI</option>
              <option value="Cheque">Cheque</option>
              <option value="Bank Transfer">Bank Transfer</option>
            </select>
          </div>

          <div className="pt-2 flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2.5 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-xl font-medium transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || amount <= 0}
              className="flex-1 px-4 py-2.5 bg-green-600 hover:bg-green-700 text-white rounded-xl font-medium transition-all shadow-lg shadow-green-600/20 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? "Processing..." : "Confirm Payment"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function SalaryHistory() {
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [deleteId, setDeleteId] = useState(null);

  useEffect(() => {
    fetchHistory();
  }, []);

  const fetchHistory = async () => {
    try {
      setLoading(true);
      const data = await getExpenses({ category: "Salary" });
      setExpenses(data);
    } catch (error) {
      console.error(error);
      toast.error("Failed to load salary history");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    try {
      await deleteExpense(deleteId);
      toast.success("Salary entry deleted");
      setExpenses(expenses.filter((e) => e.id !== deleteId));
      setDeleteId(null);
    } catch (error) {
      console.error(error);
      toast.error("Failed to delete entry");
    }
  };

  if (loading) {
    return (
      <div className="p-8 text-center text-gray-500">Loading history...</div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
      <div className="p-6 border-b border-gray-100 dark:border-gray-700">
        <h2 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
          <History size={20} className="text-blue-600" /> Salary History
        </h2>
      </div>

      {expenses.length === 0 ? (
        <div className="p-12 text-center text-gray-500">
          <div className="flex justify-center mb-4">
            <div className="p-4 bg-gray-50 dark:bg-gray-900 rounded-full">
              <IndianRupee size={32} className="text-gray-300" />
            </div>
          </div>
          <p>No salary records found</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-gray-900/50 border-b border-gray-100 dark:border-gray-700">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Date
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Description
                </th>
                <th className="px-6 py-4 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Amount
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Method
                </th>
                <th className="px-6 py-4 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
              {expenses.map((expense) => (
                <tr
                  key={expense.id}
                  className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                >
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-400">
                    {new Date(expense.date).toLocaleDateString("en-IN")}
                  </td>
                  <td className="px-6 py-4 text-sm font-medium text-gray-900 dark:text-white">
                    {expense.description}
                  </td>
                  <td className="px-6 py-4 text-right text-sm font-bold text-gray-900 dark:text-white">
                    ₹{expense.amount}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-400">
                    <span className="px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded text-xs">
                      {expense.payment_method}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button
                      onClick={() => setDeleteId(expense.id)}
                      className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      title="Delete Entry"
                    >
                      <Trash2 size={16} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <ConfirmDialog
        open={!!deleteId}
        onCancel={() => setDeleteId(null)}
        onConfirm={handleDelete}
        title="Delete Salary Entry"
        message="Are you sure you want to delete this salary record? This will revert the 'Paid' status in the payroll view."
      />
    </div>
  );
}

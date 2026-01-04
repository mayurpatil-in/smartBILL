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
} from "lucide-react";
import toast from "react-hot-toast";

import { API_URL } from "../api/axios";
import AddEmployeeModal from "../components/AddEmployeeModal";
import ConfirmDialog from "../components/ConfirmDialog";
import EmployeeAttendance from "../components/EmployeeAttendance";
import MonthlyAttendanceReport from "../components/MonthlyAttendanceReport";
import SalaryAdvanceModal from "../components/SalaryAdvanceModal";
import PdfPreviewModal from "../components/PdfPreviewModal";
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
    blue: "bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400",
    green:
      "bg-green-50 text-green-600 dark:bg-green-900/20 dark:text-green-400",
    purple:
      "bg-purple-50 text-purple-600 dark:bg-purple-900/20 dark:text-purple-400",
  };

  return (
    <div className="bg-white dark:bg-gray-800 p-5 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 flex items-center gap-4">
      <div className={`p-3 rounded-xl ${colors[color] || colors.blue}`}>
        <Icon size={22} />
      </div>
      <div>
        <h3 className="text-2xl font-bold text-gray-900 dark:text-white">
          {value}
        </h3>
        <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">
          {label}
        </p>
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
          e.id === employee.id ? { ...e, is_active: !employee.is_active } : e
        )
      );
      toast.success(
        `Employee marked as ${!employee.is_active ? "Active" : "Inactive"}`
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
      emp.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Employee Management
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            Manage your team, attendance, and payroll
          </p>
        </div>
        <button
          onClick={() => {
            setSelectedEmployee(null);
            setIsAddModalOpen(true);
          }}
          className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-medium transition-all shadow-lg shadow-blue-600/20 active:scale-95"
        >
          <Plus size={18} /> Add Employee
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-gray-200 dark:border-gray-700 overflow-x-auto pb-1 no-scrollbar">
        {[
          { id: "list", label: "All Employees", icon: Users },
          { id: "attendance", label: "Attendance", icon: Calendar },
          { id: "report", label: "Report", icon: FileText },
          { id: "payroll", label: "Payroll", icon: IndianRupee },
          { id: "history", label: "History", icon: History },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === tab.id
                ? "border-blue-600 text-blue-600 dark:text-blue-400"
                : "border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
            }`}
          >
            <tab.icon size={16} />
            {tab.label}
          </button>
        ))}
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
                <thead className="bg-gray-50 dark:bg-gray-900/50 border-b border-gray-100 dark:border-gray-700">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      Name
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      Designation
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      Contact
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-4 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                  {loading ? (
                    <tr>
                      <td
                        colSpan="5"
                        className="px-6 py-8 text-center text-gray-500"
                      >
                        Loading...
                      </td>
                    </tr>
                  ) : filteredEmployees.length === 0 ? (
                    <tr>
                      <td
                        colSpan="5"
                        className="px-6 py-8 text-center text-gray-500"
                      >
                        No employees found
                      </td>
                    </tr>
                  ) : (
                    filteredEmployees.map((emp) => (
                      <tr
                        key={emp.id}
                        className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                      >
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-bold">
                              {emp.name.charAt(0)}
                            </div>
                            <div>
                              <p className="font-semibold text-gray-900 dark:text-white">
                                {emp.name}
                              </p>
                              <p className="text-xs text-gray-500">
                                {emp.email}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2 text-gray-600 dark:text-gray-300">
                            <Briefcase size={14} className="text-gray-400" />
                            <span>
                              {emp.employee_profile?.designation || "N/A"}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-400">
                              <Phone size={12} />{" "}
                              {emp.employee_profile?.phone || "N/A"}
                            </div>
                            <div className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-400">
                              <Mail size={12} /> {emp.email}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span
                            className={`px-2.5 py-1 rounded-full text-xs font-medium ${
                              emp.is_active
                                ? "bg-green-50 text-green-700 border border-green-100"
                                : "bg-red-50 text-red-700 border border-red-100"
                            }`}
                          >
                            {emp.is_active ? "Active" : "Inactive"}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => handleDownloadIDCard(emp)}
                              className="p-1.5 text-gray-400 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition-colors"
                              title="Download ID Card"
                            >
                              <CreditCard size={16} />
                            </button>
                            <button
                              onClick={() => {
                                setSelectedEmployee(emp);
                                setIsAddModalOpen(true);
                              }}
                              className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                            >
                              <Edit size={16} />
                            </button>
                            <button
                              onClick={(e) => handleStatusToggle(e, emp)}
                              className={`p-1.5 rounded-lg transition-colors ${
                                emp.is_active
                                  ? "text-green-600 hover:bg-green-50"
                                  : "text-gray-400 hover:text-green-600 hover:bg-gray-50"
                              }`}
                              title={emp.is_active ? "Deactivate" : "Activate"}
                            >
                              <Power size={16} />
                            </button>

                            <button
                              onClick={() => handleDelete(emp)}
                              className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
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
        })
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
      <div className="bg-white dark:bg-gray-800 p-4 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 flex flex-col md:flex-row md:items-center gap-4">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">Month:</span>
          <select
            name="payroll_month"
            id="payroll_month"
            value={month}
            onChange={(e) => setMonth(parseInt(e.target.value))}
            className="border rounded-lg px-2 py-1 bg-white dark:bg-gray-900 dark:border-gray-700"
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
          <span className="text-sm font-medium">Year:</span>
          <input
            type="number"
            name="payroll_year"
            id="payroll_year"
            value={year}
            onChange={(e) => setYear(parseInt(e.target.value))}
            className="border rounded-lg px-2 py-1 w-20 bg-white dark:bg-gray-900 dark:border-gray-700"
          />
        </div>
        <button
          onClick={calculateAll}
          className="ml-auto px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 transition-colors"
        >
          Refresh
        </button>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-gray-900/50 border-b border-gray-100 dark:border-gray-700">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Employee
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Base Salary
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Attendance
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  OT + Bonus
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Advances
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Net Pay
                </th>
                <th className="px-6 py-4 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
              {loading ? (
                <tr>
                  <td colSpan="7" className="py-8 text-center text-gray-500">
                    Calculating...
                  </td>
                </tr>
              ) : (
                employees
                  .filter((emp) => emp.is_active)
                  .map((emp) => {
                    const slip = salaries[emp.id];
                    return (
                      <tr
                        key={emp.id}
                        className="hover:bg-gray-50 dark:hover:bg-gray-700/50"
                      >
                        <td className="px-6 py-4 font-medium text-gray-900 dark:text-white">
                          {emp.name}
                          <div className="text-xs text-gray-500 font-normal">
                            {emp.employee_profile?.designation}
                          </div>
                        </td>
                        <td className="px-6 py-4 text-gray-600 dark:text-gray-300">
                          ₹{emp.employee_profile?.base_salary}
                          <div className="text-xs text-gray-400 capitalize">
                            {emp.employee_profile?.salary_type}
                          </div>
                        </td>
                        <td className="px-6 py-4 text-gray-600 dark:text-gray-300">
                          {slip?.present_days || 0} / {slip?.total_days || 30}{" "}
                          Days
                        </td>
                        <td className="px-6 py-4 text-green-600">
                          {slip ? (
                            <div className="flex flex-col text-xs">
                              <span>OT: ₹{slip.total_overtime_pay}</span>
                              <span>Bonus: ₹{slip.total_bonus}</span>
                            </div>
                          ) : (
                            "-"
                          )}
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <span className="text-red-600">
                              {slip ? `-₹${slip.total_advances_deducted}` : "-"}
                            </span>
                            <button
                              onClick={() => setSelectedEmpForAdvance(emp)}
                              className="text-xs text-blue-600 hover:underline"
                            >
                              Manage
                            </button>
                          </div>
                        </td>
                        <td className="px-6 py-4 font-bold text-gray-900 dark:text-white text-lg">
                          {slip ? `₹${slip.final_payable}` : "-"}
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            {slip?.is_paid ? (
                              <span className="px-3 py-1 bg-green-100 text-green-700 text-xs font-semibold rounded-lg border border-green-200 shadow-sm flex items-center gap-1 cursor-default">
                                <UserCheck size={12} /> Paid
                              </span>
                            ) : (
                              <button
                                onClick={() => handlePayClick(emp)}
                                className="px-3 py-1 bg-green-600 text-white text-xs rounded-lg hover:bg-green-700 transition-colors shadow-sm flex items-center gap-1"
                                title="Pay Salary & Create Expense"
                              >
                                <IndianRupee size={12} /> Pay
                              </button>
                            )}

                            <button
                              onClick={() =>
                                slip && handlePreviewSlip(slip, emp)
                              }
                              disabled={!slip}
                              className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors disabled:opacity-50"
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
      toast.error(error.response?.data?.detail || "Failed to pay salary");
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

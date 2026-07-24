import { useState, useEffect } from "react";
import {
  X,
  User,
  Mail,
  Phone,
  Briefcase,
  Calendar,
  CreditCard,
  Building,
  IndianRupee,
  Shield,
  Download,
  Edit,
  Power,
  PlusCircle,
  Clock,
  CheckCircle,
  XCircle,
} from "lucide-react";
import toast from "react-hot-toast";
import { formatDateDDMMYYYY } from "../utils/dateUtils";
import { getSalaryAdvances } from "../api/employees";

export default function EmployeeDetailsDrawer({
  employee,
  isOpen,
  onClose,
  onEdit,
  onStatusToggle,
  onDownloadIDCard,
  onOpenAdvanceModal,
}) {
  const [advances, setAdvances] = useState([]);
  const [loadingAdvances, setLoadingAdvances] = useState(false);
  const [activeTab, setActiveTab] = useState("overview");

  useEffect(() => {
    if (isOpen && employee?.id) {
      fetchAdvances();
    }
  }, [isOpen, employee]);

  const fetchAdvances = async () => {
    try {
      setLoadingAdvances(true);
      const data = await getSalaryAdvances(employee.id);
      setAdvances(data || []);
    } catch (error) {
      console.error("Failed to load advances:", error);
    } finally {
      setLoadingAdvances(false);
    }
  };

  if (!isOpen || !employee) return null;

  const profile = employee.employee_profile || {};
  const employeeCode = `EMP-${String(profile.company_employee_id || employee.id).padStart(3, "0")}`;

  // Calculate total outstanding advance
  const totalAdvancesPending = advances
    .filter((a) => !a.is_deducted)
    .reduce((sum, a) => sum + parseFloat(a.amount || 0), 0);

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-black/50 backdrop-blur-sm animate-fade-in flex justify-end">
      <div className="relative w-full max-w-lg bg-white dark:bg-gray-800 shadow-2xl h-full flex flex-col border-l border-gray-200 dark:border-gray-700 animate-slide-left">
        {/* Header */}
        <div className="relative bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 p-6 text-white shrink-0">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-all"
          >
            <X size={20} />
          </button>

          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-white/20 backdrop-blur-md border-2 border-white/30 flex items-center justify-center text-white text-2xl font-bold shadow-xl shrink-0">
              {employee.name?.charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0 flex-1">
              <h2 className="text-xl font-bold text-white truncate">
                {employee.name}
              </h2>
              <p className="text-blue-100 text-xs mt-0.5">
                {profile.designation || "Employee"} •{" "}
                <span className="font-mono">{employeeCode}</span>
              </p>
              <div className="flex items-center gap-2 mt-2">
                <span
                  className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold ${
                    employee.is_active
                      ? "bg-green-500/30 text-green-200 border border-green-400/40"
                      : "bg-red-500/30 text-red-200 border border-red-400/40"
                  }`}
                >
                  <span
                    className={`w-1.5 h-1.5 rounded-full ${
                      employee.is_active ? "bg-green-400" : "bg-red-400"
                    }`}
                  ></span>
                  {employee.is_active ? "Active Employee" : "Inactive"}
                </span>

                <span className="bg-white/20 text-white text-xs px-2.5 py-0.5 rounded-full font-semibold uppercase">
                  {profile.salary_type || "MONTHLY"}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 shrink-0">
          <button
            onClick={() => setActiveTab("overview")}
            className={`flex-1 py-3 text-xs font-bold uppercase tracking-wider text-center border-b-2 transition-all ${
              activeTab === "overview"
                ? "border-blue-600 text-blue-600 dark:text-blue-400 bg-white dark:bg-gray-800"
                : "border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
            }`}
          >
            Overview
          </button>
          <button
            onClick={() => setActiveTab("bank")}
            className={`flex-1 py-3 text-xs font-bold uppercase tracking-wider text-center border-b-2 transition-all ${
              activeTab === "bank"
                ? "border-blue-600 text-blue-600 dark:text-blue-400 bg-white dark:bg-gray-800"
                : "border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
            }`}
          >
            Bank & Pay
          </button>
          <button
            onClick={() => setActiveTab("advances")}
            className={`flex-1 py-3 text-xs font-bold uppercase tracking-wider text-center border-b-2 transition-all ${
              activeTab === "advances"
                ? "border-blue-600 text-blue-600 dark:text-blue-400 bg-white dark:bg-gray-800"
                : "border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
            }`}
          >
            Advances ({advances.length})
          </button>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* OVERVIEW TAB */}
          {activeTab === "overview" && (
            <div className="space-y-4">
              <div className="bg-gray-50 dark:bg-gray-700/40 p-4 rounded-2xl border border-gray-100 dark:border-gray-700 space-y-3">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-xl">
                    <Mail size={18} />
                  </div>
                  <div>
                    <span className="block text-[10px] font-bold text-gray-400 uppercase">
                      Email Address
                    </span>
                    <span className="text-sm font-semibold text-gray-900 dark:text-white">
                      {employee.email || "N/A"}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="p-2 bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 rounded-xl">
                    <Phone size={18} />
                  </div>
                  <div>
                    <span className="block text-[10px] font-bold text-gray-400 uppercase">
                      Phone Number
                    </span>
                    <span className="text-sm font-semibold text-gray-900 dark:text-white">
                      {profile.phone || "N/A"}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="p-2 bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 rounded-xl">
                    <Calendar size={18} />
                  </div>
                  <div>
                    <span className="block text-[10px] font-bold text-gray-400 uppercase">
                      Date of Joining
                    </span>
                    <span className="text-sm font-semibold text-gray-900 dark:text-white">
                      {formatDateDDMMYYYY(profile.joining_date)}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="p-2 bg-cyan-100 dark:bg-cyan-900/30 text-cyan-600 dark:text-cyan-400 rounded-xl">
                    <Briefcase size={18} />
                  </div>
                  <div>
                    <span className="block text-[10px] font-bold text-gray-400 uppercase">
                      Designation
                    </span>
                    <span className="text-sm font-semibold text-gray-900 dark:text-white">
                      {profile.designation || "Employee"}
                    </span>
                  </div>
                </div>
              </div>

              {/* Outstanding Advance Highlight Card */}
              {totalAdvancesPending > 0 && (
                <div className="bg-gradient-to-r from-orange-500 to-amber-600 text-white p-4 rounded-2xl shadow-lg flex items-center justify-between">
                  <div>
                    <span className="block text-xs font-bold text-orange-100 uppercase">
                      Outstanding Advance
                    </span>
                    <span className="text-2xl font-extrabold tabular-nums">
                      ₹{totalAdvancesPending.toLocaleString()}
                    </span>
                  </div>
                  <button
                    onClick={() => setActiveTab("advances")}
                    className="px-3 py-1.5 bg-white/20 hover:bg-white/30 text-white rounded-xl text-xs font-bold transition-all"
                  >
                    View Details
                  </button>
                </div>
              )}
            </div>
          )}

          {/* BANK & PAY TAB */}
          {activeTab === "bank" && (
            <div className="space-y-4">
              <div className="bg-gradient-to-br from-gray-900 to-slate-800 text-white p-5 rounded-2xl shadow-lg space-y-4">
                <div className="flex justify-between items-center border-b border-gray-700 pb-3">
                  <span className="text-xs text-gray-400 font-bold uppercase">
                    Salary Configuration
                  </span>
                  <span className="px-2 py-0.5 bg-blue-500/20 text-blue-300 rounded text-xs font-bold uppercase">
                    {profile.salary_type || "MONTHLY"}
                  </span>
                </div>
                <div>
                  <span className="block text-xs text-gray-400">Base Salary</span>
                  <span className="text-3xl font-extrabold text-white">
                    ₹{parseFloat(profile.base_salary || 0).toLocaleString()}
                    <span className="text-xs font-normal text-gray-400 ml-1">
                      / {profile.salary_type === "daily" ? "day" : "month"}
                    </span>
                  </span>
                </div>
              </div>

              <div className="bg-gray-50 dark:bg-gray-700/40 p-4 rounded-2xl border border-gray-100 dark:border-gray-700 space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-2">
                  Bank Account Details
                </h4>

                <div className="flex items-center gap-3">
                  <div className="p-2 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-xl">
                    <Building size={18} />
                  </div>
                  <div>
                    <span className="block text-[10px] font-bold text-gray-400 uppercase">
                      Bank Name
                    </span>
                    <span className="text-sm font-semibold text-gray-900 dark:text-white">
                      {profile.bank_name || "N/A"}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-xl">
                    <CreditCard size={18} />
                  </div>
                  <div>
                    <span className="block text-[10px] font-bold text-gray-400 uppercase">
                      Account Number
                    </span>
                    <span className="text-sm font-mono font-semibold text-gray-900 dark:text-white">
                      {profile.account_number || "N/A"}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="p-2 bg-teal-100 dark:bg-teal-900/30 text-teal-600 dark:text-teal-400 rounded-xl">
                    <Shield size={18} />
                  </div>
                  <div>
                    <span className="block text-[10px] font-bold text-gray-400 uppercase">
                      IFSC Code
                    </span>
                    <span className="text-sm font-mono font-semibold text-gray-900 dark:text-white">
                      {profile.ifsc_code || "N/A"}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="p-2 bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 rounded-xl">
                    <IndianRupee size={18} />
                  </div>
                  <div>
                    <span className="block text-[10px] font-bold text-gray-400 uppercase">
                      UPI ID
                    </span>
                    <span className="text-sm font-mono font-semibold text-gray-900 dark:text-white">
                      {profile.upi_id || "N/A"}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ADVANCES TAB */}
          {activeTab === "advances" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                  Salary Advances Log
                </h4>
                <button
                  onClick={() => onOpenAdvanceModal(employee)}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-all shadow-md"
                >
                  <PlusCircle size={14} />
                  <span>Give Advance</span>
                </button>
              </div>

              {loadingAdvances ? (
                <div className="text-center py-8 text-sm text-gray-500">
                  Loading advances...
                </div>
              ) : advances.length === 0 ? (
                <div className="text-center py-10 bg-gray-50 dark:bg-gray-700/30 rounded-2xl border border-dashed border-gray-200 dark:border-gray-700">
                  <IndianRupee size={36} className="mx-auto text-gray-300 mb-2" />
                  <p className="text-sm font-bold text-gray-700 dark:text-gray-300">
                    No Advances Recorded
                  </p>
                  <p className="text-xs text-gray-500">
                    No salary advances have been issued to this employee.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {advances.map((adv) => (
                    <div
                      key={adv.id}
                      className="flex items-center justify-between p-3.5 bg-gray-50 dark:bg-gray-700/50 rounded-xl border border-gray-200 dark:border-gray-700"
                    >
                      <div>
                        <div className="font-bold text-gray-900 dark:text-white text-sm">
                          ₹{parseFloat(adv.amount).toLocaleString()}
                        </div>
                        <div className="text-xs text-gray-500">
                          {formatDateDDMMYYYY(adv.date)}{" "}
                          {adv.reason && `• ${adv.reason}`}
                        </div>
                      </div>
                      <span
                        className={`px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase ${
                          adv.is_deducted
                            ? "bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-300"
                            : "bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 border border-amber-300 dark:border-amber-700"
                        }`}
                      >
                        {adv.is_deducted ? "Settled" : "Pending"}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer Quick Actions */}
        <div className="p-4 bg-gray-50 dark:bg-gray-800/90 border-t border-gray-200 dark:border-gray-700 shrink-0 grid grid-cols-3 gap-2">
          <button
            onClick={() => onDownloadIDCard(employee)}
            className="flex items-center justify-center gap-1.5 px-3 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold text-xs transition-all shadow-md"
          >
            <Download size={15} />
            <span>ID Card</span>
          </button>

          <button
            onClick={() => {
              onClose();
              onEdit(employee);
            }}
            className="flex items-center justify-center gap-1.5 px-3 py-2.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl font-semibold text-xs transition-all shadow-md"
          >
            <Edit size={15} />
            <span>Edit</span>
          </button>

          <button
            onClick={(e) => onStatusToggle(e, employee)}
            className={`flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl font-semibold text-xs transition-all shadow-md text-white ${
              employee.is_active
                ? "bg-red-600 hover:bg-red-700"
                : "bg-green-600 hover:bg-green-700"
            }`}
          >
            <Power size={15} />
            <span>{employee.is_active ? "Deactivate" : "Activate"}</span>
          </button>
        </div>
      </div>
    </div>
  );
}

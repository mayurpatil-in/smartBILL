import { useEffect, useState, useRef } from "react";
import {
  getCompanies,
  createCompany,
  createCompanyAdmin,
  extendSubscription,
  toggleCompanyStatus,
  updateCompany,
  resetCompanyPassword,
  deleteCompany,
  getAuditLogs,
} from "../api/superAdmin";
import {
  Building2,
  Calendar,
  MoreVertical,
  Plus,
  Search,
  CheckCircle,
  XCircle,
  UserPlus,
  Clock,
  Power,
  Edit,
  KeyRound,
  FileText,
  Activity,
  Lock,
  Mail,
  User,
  Trash2,
  Settings,
} from "lucide-react";
import toast from "react-hot-toast";
import ConfirmDialog from "../components/ConfirmDialog";
import ManageCompanyActions from "../components/ManageCompanyActions";
import CompanyAuditLogsModal from "../components/CompanyAuditLogsModal";
import ModalWrapper from "../components/ModalWrapper";

export default function SuperAdminDashboard() {
  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(true);

  // Modals state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showAdminModal, setShowAdminModal] = useState(false);
  const [showExtendModal, setShowExtendModal] = useState(false);
  const [showUpdateModal, setShowUpdateModal] = useState(false);
  const [showResetModal, setShowResetModal] = useState(false);
  const [showManageModal, setShowManageModal] = useState(false);
  const [showAuditModal, setShowAuditModal] = useState(false);

  // Confirmation State
  const [confirmDialog, setConfirmDialog] = useState({
    open: false,
    title: "",
    message: "",
    onConfirm: null,
    type: "danger", // danger, success, info
    confirmLabel: "Confirm",
  });
  const [selectedCompany, setSelectedCompany] = useState(null);

  // Tabs & Audit Logs
  const [activeTab, setActiveTab] = useState("companies");
  const [auditLogs, setAuditLogs] = useState([]);
  const [loadingLogs, setLoadingLogs] = useState(false);

  // 🔄 Fetch Companies
  const loadCompanies = async () => {
    try {
      setLoading(true);
      const data = await getCompanies();
      setCompanies(data);
    } catch {
      toast.error("Failed to load companies");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCompanies();
  }, []);

  // ➕ Create Company Handler
  const handleCreate = async (data) => {
    try {
      await createCompany(data);
      toast.success("Company created successfully");
      setShowCreateModal(false);
      loadCompanies();
    } catch (err) {
      toast.error(err.response?.data?.detail || "Failed to create company");
    }
  };

  // 👤 Create Admin Handler
  const handleCreateAdmin = async (data) => {
    try {
      await createCompanyAdmin(selectedCompany.id, data);
      toast.success("Company admin created successfully");
      setShowAdminModal(false);
    } catch (err) {
      toast.error(err.response?.data?.detail || "Failed to create admin");
    }
  };

  // ⏳ Extend Subscription Handler
  const handleExtend = async (newDate) => {
    try {
      await extendSubscription(selectedCompany.id, newDate);
      toast.success("Subscription extended successfully");
      setShowExtendModal(false);
      loadCompanies();
    } catch (err) {
      toast.error(
        err.response?.data?.detail || "Failed to extend subscription"
      );
    }
  };

  // 🔌 Toggle Status Handler
  const handleToggleStatus = (company) => {
    setConfirmDialog({
      open: true,
      title: `${company.is_active ? "Deactivate" : "Activate"} Company`,
      message: `Are you sure you want to ${
        company.is_active ? "deactivate" : "activate"
      } ${company.name}? This will ${
        company.is_active ? "revoke" : "grant"
      } access immediately.`,
      type: company.is_active ? "danger" : "success",
      confirmLabel: company.is_active ? "Deactivate" : "Activate",
      onConfirm: async () => {
        try {
          await toggleCompanyStatus(company.id);
          toast.success(
            `Company ${
              company.is_active ? "deactivated" : "activated"
            } successfully`
          );
          loadCompanies();
          setConfirmDialog({ ...confirmDialog, open: false });
        } catch (err) {
          toast.error(err.response?.data?.detail || "Failed to update status");
        }
      },
    });
  };

  // ✏️ Update Company Handler
  const handleUpdate = async (updatedData) => {
    try {
      await updateCompany(selectedCompany.id, updatedData);
      toast.success("Company updated successfully");
      setShowUpdateModal(false);
      loadCompanies();
    } catch (err) {
      toast.error(err.response?.data?.detail || "Failed to update company");
    }
  };

  // 🗑️ Delete Company Handler
  const handleDelete = (company) => {
    setConfirmDialog({
      open: true,
      title: "Delete Company",
      message: `Are you sure you want to delete ${company.name}? This action cannot be undone.`,
      type: "danger",
      confirmLabel: "Delete Company",
      onConfirm: async () => {
        try {
          await deleteCompany(company.id);
          toast.success("Company deleted successfully");
          loadCompanies();
          setConfirmDialog({ ...confirmDialog, open: false });
        } catch (err) {
          // Show the specific error from backend (Safe Delete Check)
          toast.error(err.response?.data?.detail || "Failed to delete company");
          setConfirmDialog({ ...confirmDialog, open: false });
        }
      },
    });
  };

  // 🔑 Reset Password Handler
  const handleResetPassword = async (data) => {
    try {
      await resetCompanyPassword(selectedCompany.id, data);
      toast.success("Password reset successfully");
      setShowResetModal(false);
    } catch (err) {
      toast.error(err.response?.data?.detail || "Failed to reset password");
    }
  };

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

  // Switch Tab Handler
  const handleTabChange = (tab) => {
    setActiveTab(tab);
    if (tab === "audit") {
      loadAuditLogs();
    }
  };

  return (
    <div className="space-y-6">
      {/* 👑 HEADER */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white dark:bg-gray-800 p-4 md:p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Super Admin Portal
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Manage tenants, subscriptions, and system health
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setActiveTab("companies")}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
              activeTab === "companies"
                ? "bg-blue-600 text-white shadow-lg shadow-blue-600/20"
                : "text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700"
            }`}
          >
            Companies
          </button>
          <button
            onClick={() => handleTabChange("audit")}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-all flex items-center gap-2 ${
              activeTab === "audit"
                ? "bg-blue-600 text-white shadow-lg shadow-blue-600/20"
                : "text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700"
            }`}
          >
            <Activity size={16} /> Audit Logs
          </button>
        </div>
        {activeTab === "companies" && (
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-xl font-medium transition-all shadow-lg shadow-blue-600/20"
          >
            <Plus size={20} />
            Add Company
          </button>
        )}
      </div>

      {activeTab === "companies" && (
        <>
          {/* 📊 STATS */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Stat
              label="Total Companies"
              value={companies.length}
              icon={Building2}
              color="blue"
            />
            <Stat
              label="Active Tenants"
              value={companies.filter((c) => c.is_active).length}
              icon={CheckCircle}
              color="green"
            />
            <Stat
              label="Expiring Soon (30 Days)"
              value={
                companies.filter((c) => {
                  if (!c.is_active) return false;
                  const end = new Date(c.subscription_end);
                  const today = new Date();
                  const warningDate = new Date();
                  warningDate.setDate(today.getDate() + 30);
                  return end > today && end <= warningDate;
                }).length
              }
              icon={Calendar}
              color="orange"
            />
            <Stat
              label="Inactive"
              value={companies.filter((c) => !c.is_active).length}
              icon={XCircle}
              color="red"
            />
          </div>

          {/* 📋 TABLE */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
            <div className="p-4 border-b border-gray-100 dark:border-gray-700 flex items-center gap-3">
              <Search className="text-gray-400" size={20} />
              <input
                type="text"
                placeholder="Search companies..."
                className="flex-1 bg-transparent border-none focus:ring-0 text-sm"
              />
            </div>

            <div className="overflow-x-auto min-h-[400px]">
              <table className="w-full text-left text-sm">
                <thead className="bg-gray-50 dark:bg-gray-700/50 text-gray-500 uppercase tracking-wider font-semibold">
                  <tr>
                    <th className="px-6 py-4 whitespace-nowrap">
                      Company Name
                    </th>
                    <th className="px-6 py-4 whitespace-nowrap">Email</th>
                    <th className="px-6 py-4 whitespace-nowrap">Status</th>
                    <th className="px-6 py-4 whitespace-nowrap">
                      Subscription End
                    </th>
                    <th className="px-6 py-4 text-right whitespace-nowrap">
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
                        Loading companies...
                      </td>
                    </tr>
                  ) : companies.length === 0 ? (
                    <tr>
                      <td
                        colSpan="5"
                        className="px-6 py-8 text-center text-gray-500"
                      >
                        No companies found. Create one to get started.
                      </td>
                    </tr>
                  ) : (
                    companies.map((company) => (
                      <CompanyRow
                        key={company.id}
                        company={company}
                        onManage={(c) => {
                          setSelectedCompany(c);
                          setShowManageModal(true);
                        }}
                      />
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {activeTab === "audit" && (
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
          <div className="p-4 border-b border-gray-100 dark:border-gray-700">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white">
              Recent Admin Activity
            </h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-gray-50 dark:bg-gray-700/50 text-gray-500 uppercase tracking-wider font-semibold">
                <tr>
                  <th className="px-6 py-4">Timestamp</th>
                  <th className="px-6 py-4">Action</th>
                  <th className="px-6 py-4">Admin</th>
                  <th className="px-6 py-4">Target Company</th>
                  <th className="px-6 py-4">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                {loadingLogs ? (
                  <tr>
                    <td
                      colSpan="5"
                      className="px-6 py-8 text-center text-gray-500"
                    >
                      Loading logs...
                    </td>
                  </tr>
                ) : auditLogs.length === 0 ? (
                  <tr>
                    <td
                      colSpan="5"
                      className="px-6 py-8 text-center text-gray-500"
                    >
                      No activity recorded yet
                    </td>
                  </tr>
                ) : (
                  auditLogs.map((log) => (
                    <tr
                      key={log.id}
                      className="hover:bg-gray-50 dark:hover:bg-gray-700/50"
                    >
                      <td className="px-6 py-4 text-gray-500 whitespace-nowrap">
                        {new Date(
                          log.created_at.endsWith("Z")
                            ? log.created_at
                            : log.created_at + "Z"
                        ).toLocaleString("en-IN", {
                          day: "2-digit",
                          month: "short",
                          year: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                          hour12: true,
                        })}
                      </td>
                      <td className="px-6 py-4">
                        <span className="px-2 py-1 rounded text-xs font-bold bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300">
                          {log.action}
                        </span>
                      </td>
                      <td className="px-6 py-4 font-medium text-gray-900 dark:text-white">
                        {log.user_name}
                      </td>
                      <td className="px-6 py-4 text-gray-500">
                        {log.company_name || "-"}
                      </td>
                      <td
                        className="px-6 py-4 text-gray-600 dark:text-gray-400 max-w-xs truncate"
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
      )}

      {/* MODALS */}
      {showCreateModal && (
        <CreateCompanyModal
          onClose={() => setShowCreateModal(false)}
          onSave={handleCreate}
        />
      )}

      {showAdminModal && selectedCompany && (
        <CreateAdminModal
          company={selectedCompany}
          onClose={() => setShowAdminModal(false)}
          onSave={handleCreateAdmin}
        />
      )}

      {showExtendModal && selectedCompany && (
        <ExtendSubscriptionModal
          company={selectedCompany}
          onClose={() => setShowExtendModal(false)}
          onSave={handleExtend}
        />
      )}

      {showUpdateModal && selectedCompany && (
        <UpdateCompanyModal
          company={selectedCompany}
          onClose={() => setShowUpdateModal(false)}
          onSave={handleUpdate}
        />
      )}

      {showResetModal && selectedCompany && (
        <ResetPasswordModal
          company={selectedCompany}
          onClose={() => setShowResetModal(false)}
          onSave={handleResetPassword}
        />
      )}

      {showManageModal && selectedCompany && (
        <ManageCompanyActions
          company={selectedCompany}
          onClose={() => setShowManageModal(false)}
          onAddAdmin={() => {
            setShowManageModal(false);
            setShowAdminModal(true);
          }}
          onEdit={() => {
            setShowManageModal(false);
            setShowUpdateModal(true);
          }}
          onResetPassword={() => {
            setShowManageModal(false);
            setShowResetModal(true);
          }}
          onExtend={() => {
            setShowManageModal(false);
            setShowExtendModal(true);
          }}
          onToggleStatus={() => {
            setShowManageModal(false);
            handleToggleStatus(selectedCompany);
          }}
          onDelete={() => {
            setShowManageModal(false);
            setConfirmDialog({
              open: true,
              title: "Delete Company?",
              message: `Area you sure you want to delete ${selectedCompany.name}? This action cannot be undone.`, // Corrected typo in message if desired, but keeping minimal changes
              type: "danger",
              confirmLabel: "Delete",
              onConfirm: () => handleDelete(selectedCompany.id),
            });
          }}
          onViewLogs={() => {
            setShowManageModal(false);
            setShowAuditModal(true);
          }}
        />
      )}

      {showAuditModal && (
        <CompanyAuditLogsModal
          company={selectedCompany}
          onClose={() => setShowAuditModal(false)}
        />
      )}

      <ConfirmDialog
        open={confirmDialog.open}
        title={confirmDialog.title}
        message={confirmDialog.message}
        onConfirm={confirmDialog.onConfirm}
        onCancel={() => setConfirmDialog({ ...confirmDialog, open: false })}
        type={confirmDialog.type}
        confirmLabel={confirmDialog.confirmLabel}
      />
    </div>
  );
}

// -----------------------------------------
// ROW COMPONENT (With Dropdown)
// -----------------------------------------
// -----------------------------------------
// ROW COMPONENT (With Manage Button)
// -----------------------------------------
function CompanyRow({ company, onManage }) {
  return (
    <tr className="group hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
      <td className="px-6 py-4 font-medium text-gray-900 dark:text-gray-100 whitespace-nowrap">
        {company.name}
      </td>
      <td className="px-6 py-4 text-gray-500 whitespace-nowrap">
        {company.email}
      </td>
      <td className="px-6 py-4 whitespace-nowrap">
        <span
          className={`px-2.5 py-1 rounded-full text-xs font-medium ${
            company.is_active
              ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
              : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
          }`}
        >
          {company.is_active ? "Active" : "Inactive"}
        </span>
      </td>
      <td className="px-6 py-4 whitespace-nowrap">
        {(() => {
          const end = new Date(company.subscription_end);
          const today = new Date();
          const diffTime = end - today;
          const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

          let colorClass = "text-gray-500";
          if (diffDays < 0) {
            colorClass = "text-red-600 font-semibold"; // ❌ Expired
          } else if (diffDays <= 7) {
            colorClass = "text-amber-600 font-semibold"; // ⚠️ Very urgent
          } else if (diffDays <= 30) {
            colorClass = "text-yellow-600 font-medium"; // ⏳ Upcoming
          }

          return <span className={colorClass}>{end.toLocaleDateString()}</span>;
        })()}
      </td>
      <td className="px-6 py-4 text-right whitespace-nowrap">
        <button
          onClick={() => onManage(company)}
          className="text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 p-2 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-all flex items-center gap-2 ml-auto"
        >
          <span className="text-sm font-medium hidden group-hover:block transition-all">
            Manage
          </span>
          <Settings size={18} />
        </button>
      </td>
    </tr>
  );
}

// -----------------------------------------
// STAT COMPONENT
// -----------------------------------------
function Stat({ label, value, icon: Icon, color }) {
  const colors = {
    blue: "bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400",
    green:
      "bg-green-50 text-green-600 dark:bg-green-900/20 dark:text-green-400",
    orange:
      "bg-orange-50 text-orange-600 dark:bg-orange-900/20 dark:text-orange-400",
    red: "bg-red-50 text-red-600 dark:bg-red-900/20 dark:text-red-400",
  };

  return (
    <div className="bg-white dark:bg-gray-800 p-5 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 flex items-center gap-4">
      <div className={`p-3 rounded-xl ${colors[color]}`}>
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

// -----------------------------------------
// CREATE COMPANY MODAL
// -----------------------------------------
function CreateCompanyModal({ onClose, onSave }) {
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    website: "",
    gst_number: "",
    limit: 5,
    plan_days: 365,
  });

  const handleSubmit = (e) => {
    e.preventDefault();

    const today = new Date();
    const endDate = new Date(today);
    endDate.setDate(today.getDate() + form.plan_days);

    onSave({
      ...form,
      subscription_start: today.toISOString().split("T")[0],
      subscription_end: endDate.toISOString().split("T")[0],
    });
  };

  const PlanCard = ({ title, days, price, selected, onClick }) => (
    <div
      onClick={onClick}
      className={`relative p-4 rounded-xl border-2 cursor-pointer transition-all duration-200 ${
        selected
          ? "border-blue-600 bg-blue-50 dark:bg-blue-900/20"
          : "border-gray-100 hover:border-blue-200 dark:border-gray-700 dark:hover:border-blue-700 bg-white dark:bg-gray-800"
      }`}
    >
      <div className="flex justify-between items-start mb-2">
        <span
          className={`font-semibold ${
            selected
              ? "text-blue-700 dark:text-blue-300"
              : "text-gray-900 dark:text-white"
          }`}
        >
          {title}
        </span>
        {selected && <CheckCircle size={18} className="text-blue-600" />}
      </div>
      <div className="text-sm text-gray-500 mb-2">{days} Days Validity</div>
      <div
        className={`text-lg font-bold ${
          selected
            ? "text-blue-700 dark:text-blue-300"
            : "text-gray-900 dark:text-white"
        }`}
      >
        {price}
      </div>
    </div>
  );

  return (
    <ModalWrapper onClose={onClose} title="Register New Tenant">
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic Info Section */}
        <div className="space-y-4">
          <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
            Company Details
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Company Name"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              icon={Building2}
              placeholder="Acme Corp"
            />
            <Input
              label="GST Number"
              value={form.gst_number}
              onChange={(e) => setForm({ ...form, gst_number: e.target.value })}
              icon={FileText}
              placeholder="OPTIONAL"
              required={false}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Official Email"
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              icon={UserPlus}
              placeholder="admin@acme.com"
            />
            <Input
              label="Phone Number"
              type="tel"
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
              icon={MoreVertical} // Start using a phone icon if available, ensuring imports
              placeholder="+91 98765 43210"
            />
          </div>
        </div>

        {/* Plan Selection Section */}
        <div className="space-y-4">
          <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
            Subscription Plan
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <PlanCard
              title="Quarterly"
              days={90}
              price="₹2,999"
              selected={form.plan_days === 90}
              onClick={() => setForm({ ...form, plan_days: 90 })}
            />
            <PlanCard
              title="Annual"
              days={365}
              price="₹9,999"
              selected={form.plan_days === 365}
              onClick={() => setForm({ ...form, plan_days: 365 })}
            />
            <PlanCard
              title="Power Saver"
              days={730}
              price="₹18,999"
              selected={form.plan_days === 730}
              onClick={() => setForm({ ...form, plan_days: 730 })}
            />
            <PlanCard
              title="Lifetime"
              days={3650}
              price="∞"
              selected={form.plan_days === 3650}
              onClick={() => setForm({ ...form, plan_days: 3650 })}
            />
          </div>
        </div>

        <ModalActions onClose={onClose} submitLabel="Create Tenant Account" />
      </form>
    </ModalWrapper>
  );
}

// -----------------------------------------
// CREATE ADMIN MODAL
// -----------------------------------------
function CreateAdminModal({ company, onClose, onSave }) {
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(form);
  };

  return (
    <ModalWrapper onClose={onClose} title={`Add Admin for ${company.name}`}>
      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-xl flex items-start gap-3">
          <div className="bg-blue-100 dark:bg-blue-800 p-2 rounded-lg text-blue-600 dark:text-blue-300">
            <Building2 size={20} />
          </div>
          <div>
            <h4 className="font-semibold text-blue-900 dark:text-blue-100">
              {company.name}
            </h4>
            <p className="text-xs text-blue-700 dark:text-blue-300">
              Assigning new admin to this tenant
            </p>
          </div>
        </div>

        <div className="space-y-4">
          <Input
            label="Admin Name"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            icon={User}
            placeholder="John Doe"
          />
          <Input
            label="Admin Email"
            type="email"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            icon={Mail}
            placeholder="john@company.com"
          />
          <Input
            label="Secure Password"
            type="password"
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
            icon={Lock}
            placeholder="••••••••"
          />
        </div>

        <ModalActions onClose={onClose} submitLabel="Create Admin User" />
      </form>
    </ModalWrapper>
  );
}

// -----------------------------------------
// EXTEND SUBSCRIPTION MODAL
// -----------------------------------------
function ExtendSubscriptionModal({ company, onClose, onSave }) {
  const [days, setDays] = useState(365);

  // Calculate new date
  const currentEnd = new Date(company.subscription_end);
  const newDate = new Date(currentEnd);
  newDate.setDate(newDate.getDate() + days);

  const handleSubmit = (e) => {
    e.preventDefault();
    // Return YYYY-MM-DD
    onSave(newDate.toISOString().split("T")[0]);
  };

  return (
    <ModalWrapper
      onClose={onClose}
      title={`Extend Subscription: ${company.name}`}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1 dark:text-gray-200">
            Extend By
          </label>
          <select
            className="w-full px-4 py-2 rounded-lg border bg-gray-50 dark:bg-gray-900 dark:border-gray-700 focus:ring-2 focus:ring-blue-500 outline-none transition dark:text-white"
            value={days}
            onChange={(e) => setDays(Number(e.target.value))}
          >
            <option value={30}>30 Days (1 Month)</option>
            <option value={90}>90 Days (3 Months)</option>
            <option value={180}>180 Days (6 Months)</option>
            <option value={365}>365 Days (1 Year)</option>
            <option value={730}>2 Years</option>
          </select>
        </div>

        <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
          <p className="text-sm text-blue-800 dark:text-blue-300">
            Current End:{" "}
            <span className="font-semibold">
              {currentEnd.toLocaleDateString()}
            </span>
          </p>
          <p className="text-sm text-blue-800 dark:text-blue-300">
            New End:{" "}
            <span className="font-semibold">
              {newDate.toLocaleDateString()}
            </span>
          </p>
        </div>

        <ModalActions onClose={onClose} submitLabel="Extend Plan" />
      </form>
    </ModalWrapper>
  );
}

// -----------------------------------------
// UPDATE COMPANY MODAL
// -----------------------------------------
function UpdateCompanyModal({ company, onClose, onSave }) {
  const [form, setForm] = useState({
    name: company.name,
    email: company.email || "",
    phone: company.phone || "",
    gst_number: company.gst_number || "",
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(form);
  };

  return (
    <ModalWrapper onClose={onClose} title="Edit Company Details">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input
            label="Company Name"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            icon={Building2}
          />
          <Input
            label="GST Number"
            value={form.gst_number}
            onChange={(e) => setForm({ ...form, gst_number: e.target.value })}
            icon={FileText}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input
            label="Official Email"
            type="email"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            icon={UserPlus}
          />
          <Input
            label="Phone Number"
            type="tel"
            value={form.phone}
            onChange={(e) => setForm({ ...form, phone: e.target.value })}
            icon={MoreVertical}
          />
        </div>

        <ModalActions onClose={onClose} submitLabel="Save Changes" />
      </form>
    </ModalWrapper>
  );
}

// -----------------------------------------
// RESET PASSWORD MODAL
// -----------------------------------------
function ResetPasswordModal({ company, onClose, onSave }) {
  const [form, setForm] = useState({
    email: company.email || "",
    new_password: "",
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(form);
  };

  return (
    <ModalWrapper onClose={onClose} title="Reset Admin Password">
      <div className="mb-4 p-3 bg-yellow-50 dark:bg-yellow-900/20 text-yellow-800 dark:text-yellow-300 rounded-lg text-sm border border-yellow-200 dark:border-yellow-800">
        This will forcibly reset the password for the admin with the provided
        email.
      </div>
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          label="Admin Email"
          type="email"
          value={form.email}
          onChange={(e) => setForm({ ...form, email: e.target.value })}
        />
        <Input
          label="New Password"
          type="text"
          value={form.new_password}
          onChange={(e) => setForm({ ...form, new_password: e.target.value })}
        />
        <ModalActions onClose={onClose} submitLabel="Reset Password" />
      </form>
    </ModalWrapper>
  );
}

// -----------------------------------------
// UI HELPERS
// -----------------------------------------

function Input({
  label,
  type = "text",
  value,
  onChange,
  icon: Icon,
  placeholder,
  required = true,
}) {
  return (
    <div>
      <label className="block text-sm font-medium mb-1 dark:text-gray-200">
        {label}
      </label>
      <div className="relative">
        {Icon && (
          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
            <Icon size={18} />
          </div>
        )}
        <input
          required={required}
          type={type}
          placeholder={placeholder}
          className={`w-full ${
            Icon ? "pl-10" : "px-4"
          } pr-4 py-2 rounded-lg border bg-gray-50 dark:bg-gray-900 dark:border-gray-700 focus:ring-2 focus:ring-blue-500 outline-none transition dark:text-white`}
          value={value}
          onChange={onChange}
        />
      </div>
    </div>
  );
}

function ModalActions({ onClose, submitLabel }) {
  return (
    <div className="flex gap-3 justify-end mt-6">
      <button
        type="button"
        onClick={onClose}
        className="px-5 py-2 rounded-lg text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700 font-medium transition"
      >
        Cancel
      </button>
      <button
        type="submit"
        className="px-5 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-medium shadow-lg shadow-blue-600/20 transition"
      >
        {submitLabel}
      </button>
    </div>
  );
}

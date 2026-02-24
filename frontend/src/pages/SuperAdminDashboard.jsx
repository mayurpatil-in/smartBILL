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
        err.response?.data?.detail || "Failed to extend subscription",
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
            } successfully`,
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

  return (
    <div className="space-y-6 animate-fade-in">
      {/* 👑 HEADER */}
      <div className="relative overflow-hidden flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-gradient-to-br from-purple-50 via-blue-50 to-cyan-50 dark:from-purple-950/30 dark:via-blue-950/20 dark:to-cyan-950/20 p-6 md:p-8 rounded-3xl shadow-xl border-2 border-purple-200 dark:border-purple-800">
        {/* Decorative Background */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-br from-purple-400/10 to-cyan-400/10 dark:from-purple-500/5 dark:to-cyan-500/5 rounded-full blur-3xl -mr-48 -mt-48"></div>

        <div className="relative z-10">
          <h1 className="text-3xl font-black bg-gradient-to-r from-purple-600 via-blue-600 to-cyan-600 dark:from-purple-400 dark:via-blue-400 dark:to-cyan-400 bg-clip-text text-transparent">
            Super Admin Portal
          </h1>
          <p className="text-sm text-gray-600 dark:text-gray-300 mt-1 font-medium">
            Manage tenants, subscriptions, and system health
          </p>
        </div>
        <div className="relative z-10 flex gap-3 p-1">
          <button
            onClick={() => setShowCreateModal(true)}
            className="relative z-10 flex items-center gap-2 bg-gradient-to-r from-green-600 to-emerald-700 hover:from-green-700 hover:to-emerald-800 text-white px-6 py-3 rounded-xl font-bold transition-all duration-300 shadow-lg shadow-green-600/30 hover:shadow-xl hover:shadow-green-600/40 hover:scale-105"
          >
            <Plus
              size={20}
              className="group-hover:rotate-90 transition-transform duration-300"
            />
            Add Company
          </button>
        </div>
      </div>

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
                <th className="px-6 py-4 whitespace-nowrap">Company Name</th>
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
    <tr className="group hover:bg-gradient-to-r hover:from-purple-50/50 hover:to-blue-50/30 dark:hover:from-purple-900/10 dark:hover:to-blue-900/5 transition-all duration-300">
      <td className="px-6 py-5">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-gradient-to-br from-purple-500 to-blue-600 rounded-xl shadow-md group-hover:scale-110 transition-transform duration-300">
            <Building2 size={18} className="text-white" />
          </div>
          <span className="font-bold text-gray-900 dark:text-gray-100">
            {company.name}
          </span>
        </div>
      </td>
      <td className="px-6 py-5 text-gray-600 dark:text-gray-300 font-medium">
        {company.email}
      </td>
      <td className="px-6 py-5 whitespace-nowrap">
        <span
          className={`inline-flex items-center px-3 py-1.5 rounded-xl text-xs font-black shadow-md uppercase tracking-wider ${
            company.is_active
              ? "bg-gradient-to-r from-green-500 to-emerald-600 text-white"
              : "bg-gradient-to-r from-red-500 to-rose-600 text-white"
          }`}
        >
          {company.is_active ? "ACTIVE" : "INACTIVE"}
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
      <td className="px-6 py-5 text-right whitespace-nowrap">
        <button
          onClick={() => onManage(company)}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold bg-gradient-to-r from-purple-500 to-blue-600 hover:from-purple-600 hover:to-blue-700 text-white shadow-md hover:shadow-lg hover:scale-110 transition-all duration-200"
        >
          <Settings size={16} />
          <span>Manage</span>
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
    blue: {
      bg: "bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/30 dark:to-blue-800/20",
      iconBg: "bg-gradient-to-br from-blue-500 to-blue-600",
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
    orange: {
      bg: "bg-gradient-to-br from-orange-50 to-amber-100 dark:from-orange-900/30 dark:to-amber-800/20",
      iconBg: "bg-gradient-to-br from-orange-500 to-amber-600",
      text: "text-orange-600 dark:text-orange-400",
      shadow: "shadow-orange-500/20 dark:shadow-orange-500/10",
      hoverShadow: "hover:shadow-orange-500/30 dark:hover:shadow-orange-500/20",
    },
    red: {
      bg: "bg-gradient-to-br from-red-50 to-rose-100 dark:from-red-900/30 dark:to-rose-800/20",
      iconBg: "bg-gradient-to-br from-red-500 to-rose-600",
      text: "text-red-600 dark:text-red-400",
      shadow: "shadow-red-500/20 dark:shadow-red-500/10",
      hoverShadow: "hover:shadow-red-500/30 dark:hover:shadow-red-500/20",
    },
  };

  const colorScheme = colors[color];

  return (
    <div
      className={`group relative ${colorScheme.bg} p-6 rounded-2xl shadow-lg ${colorScheme.shadow} ${colorScheme.hoverShadow} border border-gray-200 dark:border-gray-700 transition-all duration-300 hover:scale-105 hover:-translate-y-1 overflow-hidden`}
    >
      <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 dark:bg-black/10 rounded-full -mr-16 -mt-16 group-hover:scale-150 transition-transform duration-500"></div>

      <div className="relative flex items-center gap-4">
        <div
          className={`p-4 rounded-xl ${colorScheme.iconBg} shadow-lg group-hover:scale-110 group-hover:rotate-6 transition-all duration-300`}
        >
          <Icon size={28} className="text-white" />
        </div>
        <div className="flex-1">
          <h3
            className={`text-3xl font-bold ${colorScheme.text} tabular-nums group-hover:scale-105 transition-transform duration-300 origin-left`}
          >
            {value}
          </h3>
          <p className="text-xs text-gray-600 dark:text-gray-400 font-semibold uppercase tracking-wider mt-1">
            {label}
          </p>
        </div>
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

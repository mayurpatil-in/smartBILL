import { useEffect, useState, useRef } from "react";
import {
  getCompanies,
  createCompany,
  createCompanyAdmin,
  extendSubscription,
  toggleCompanyStatus,
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
} from "lucide-react";
import toast from "react-hot-toast";

export default function SuperAdminDashboard() {
  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(true);

  // Modals state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showAdminModal, setShowAdminModal] = useState(false);
  const [showExtendModal, setShowExtendModal] = useState(false);
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
        err.response?.data?.detail || "Failed to extend subscription"
      );
    }
  };

  // 🔌 Toggle Status Handler
  const handleToggleStatus = async (company) => {
    // eslint-disable-next-line no-restricted-globals
    if (
      !confirm(
        `Are you sure you want to ${
          company.is_active ? "deactivate" : "activate"
        } ${company.name}?`
      )
    )
      return;

    try {
      await toggleCompanyStatus(company.id);
      toast.success(
        `Company ${
          company.is_active ? "deactivated" : "activated"
        } successfully`
      );
      loadCompanies();
    } catch (err) {
      toast.error(err.response?.data?.detail || "Failed to update status");
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
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-xl font-medium transition-all shadow-lg shadow-blue-600/20"
        >
          <Plus size={20} />
          Add Company
        </button>
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
                    onAddAdmin={() => {
                      setSelectedCompany(company);
                      setShowAdminModal(true);
                    }}
                    onExtend={() => {
                      setSelectedCompany(company);
                      setShowExtendModal(true);
                    }}
                    onToggleStatus={() => handleToggleStatus(company)}
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
    </div>
  );
}

// -----------------------------------------
// ROW COMPONENT (With Dropdown)
// -----------------------------------------
function CompanyRow({ company, onAddAdmin, onExtend, onToggleStatus }) {
  const [showMenu, setShowMenu] = useState(false);
  const menuRef = useRef(null);

  // Close menu on outside click
  useEffect(() => {
    function handleClickOutside(event) {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setShowMenu(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

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
      <td className="px-6 py-4 text-right relative whitespace-nowrap">
        <button
          onClick={() => setShowMenu(!showMenu)}
          className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 p-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition"
        >
          <MoreVertical size={18} />
        </button>

        {/* DROPDOWN MENU */}
        {showMenu && (
          <div
            ref={menuRef}
            className="absolute right-8 top-8 w-48 bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-100 dark:border-gray-700 z-10 animate-fade-in origin-top-right overflow-hidden"
          >
            <button
              onClick={() => {
                setShowMenu(false);
                onAddAdmin();
              }}
              className="w-full text-left px-4 py-3 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center gap-2"
            >
              <UserPlus size={16} />
              Create Admin
            </button>
            <button
              onClick={() => {
                setShowMenu(false);
                onExtend();
              }}
              className="w-full text-left px-4 py-3 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center gap-2"
            >
              <Clock size={16} />
              Extend Plan
            </button>

            <hr className="border-gray-100 dark:border-gray-700" />

            <button
              onClick={() => {
                setShowMenu(false);
                onToggleStatus();
              }}
              className={`w-full text-left px-4 py-3 text-sm hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center gap-2 ${
                company.is_active
                  ? "text-red-600 dark:text-red-400"
                  : "text-green-600 dark:text-green-400"
              }`}
            >
              <Power size={16} />
              {company.is_active ? "Deactivate" : "Activate"}
            </button>
          </div>
        )}
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

  return (
    <ModalWrapper onClose={onClose} title="Register New Company">
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          label="Company Name"
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
        />
        <div className="grid grid-cols-2 gap-4">
          <Input
            label="Email"
            type="email"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
          />
          <Input
            label="Phone"
            type="tel"
            value={form.phone}
            onChange={(e) => setForm({ ...form, phone: e.target.value })}
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1 dark:text-gray-200">
            Subscription Plan (Days)
          </label>
          <select
            className="w-full px-4 py-2 rounded-lg border bg-gray-50 dark:bg-gray-900 dark:border-gray-700 focus:ring-2 focus:ring-blue-500 outline-none transition dark:text-white"
            value={form.plan_days}
            onChange={(e) =>
              setForm({ ...form, plan_days: Number(e.target.value) })
            }
          >
            <option value={30}>Monthly (30 Days)</option>
            <option value={90}>Quarterly (90 Days)</option>
            <option value={365}>Yearly (365 Days)</option>
            <option value={1825}>5 Years (Lifetime Deal)</option>
          </select>
        </div>
        <ModalActions onClose={onClose} submitLabel="Create Tenant" />
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
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          label="Admin Name"
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
        />
        <Input
          label="Admin Email"
          type="email"
          value={form.email}
          onChange={(e) => setForm({ ...form, email: e.target.value })}
        />
        <Input
          label="Password"
          type="password"
          value={form.password}
          onChange={(e) => setForm({ ...form, password: e.target.value })}
        />
        <ModalActions onClose={onClose} submitLabel="Create Admin" />
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
// UI HELPERS
// -----------------------------------------
function ModalWrapper({ onClose, title, children }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-fade-in">
      <div className="bg-white dark:bg-gray-800 w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden animate-scale-in">
        <div className="p-6 border-b border-gray-100 dark:border-gray-700">
          <h2 className="text-xl font-bold dark:text-white">{title}</h2>
        </div>
        <div className="p-6">{children}</div>
      </div>
    </div>
  );
}

function Input({ label, type = "text", value, onChange }) {
  return (
    <div>
      <label className="block text-sm font-medium mb-1 dark:text-gray-200">
        {label}
      </label>
      <input
        required
        type={type}
        className="w-full px-4 py-2 rounded-lg border bg-gray-50 dark:bg-gray-900 dark:border-gray-700 focus:ring-2 focus:ring-blue-500 outline-none transition dark:text-white"
        value={value}
        onChange={onChange}
      />
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

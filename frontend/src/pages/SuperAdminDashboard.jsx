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
  getSaaSAnalytics,
  getPlans,
  createPlan,
  updatePlan,
  getMaintenanceStatus,
  setMaintenanceStatus,
  impersonateTenant,
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
  TrendingUp,
  Users,
  DollarSign,
  BarChart,
  Package,
  Layers,
  AlertTriangle,
} from "lucide-react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  AreaChart,
  Area,
} from "recharts";
import toast from "react-hot-toast";
import ConfirmDialog from "../components/ConfirmDialog";
import ManageCompanyActions from "../components/ManageCompanyActions";
import CompanyAuditLogsModal from "../components/CompanyAuditLogsModal";
import ModalWrapper from "../components/ModalWrapper";

export default function SuperAdminDashboard() {
  const [companies, setCompanies] = useState([]);
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [analytics, setAnalytics] = useState(null);
  const [activeTab, setActiveTab] = useState("companies"); // 'companies' | 'plans'

  // Modals state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showAdminModal, setShowAdminModal] = useState(false);
  const [showExtendModal, setShowExtendModal] = useState(false);
  const [showUpdateModal, setShowUpdateModal] = useState(false);
  const [showResetModal, setShowResetModal] = useState(false);
  const [showManageModal, setShowManageModal] = useState(false);
  const [showAuditModal, setShowAuditModal] = useState(false);
  const [showCreatePlanModal, setShowCreatePlanModal] = useState(false);
  const [showUpdatePlanModal, setShowUpdatePlanModal] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState(null);

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

  // Maintenance Settings
  const [isMaintenance, setIsMaintenance] = useState(false);
  const [togglingMaintenance, setTogglingMaintenance] = useState(false);

  // 🔄 Fetch Companies & Analytics
  const loadCompanies = async () => {
    try {
      setLoading(true);
      const [compData, analyticsData, plansData] = await Promise.all([
        getCompanies(),
        getSaaSAnalytics(),
        getPlans(),
      ]);
      setCompanies(compData);
      setAnalytics(analyticsData);
      setPlans(plansData);
      try {
        const maintenanceData = await getMaintenanceStatus();
        setIsMaintenance(maintenanceData.is_maintenance);
      } catch (err) {
        console.warn("Maintenance status fetch failed:", err);
      }
      try {
        const maintenanceData = await getMaintenanceStatus();
        setIsMaintenance(maintenanceData.is_maintenance);
      } catch (err) {
        console.warn("Maintenance status fetch failed:", err);
      }
    } catch {
      toast.error("Failed to load dashboard data");
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

  // 📝 Subscription Plans Handlers
  const handleCreatePlan = async (data) => {
    try {
      await createPlan(data);
      toast.success("Plan created successfully");
      setShowCreatePlanModal(false);
      loadCompanies();
    } catch (err) {
      toast.error(err.response?.data?.detail || "Failed to create plan");
    }
  };

  const handleUpdatePlan = async (data) => {
    try {
      await updatePlan(selectedPlan.id, data);
      toast.success("Plan updated successfully");
      setShowUpdatePlanModal(false);
      loadCompanies();
    } catch (err) {
      toast.error(err.response?.data?.detail || "Failed to update plan");
    }
  };

  const handleToggleMaintenance = async () => {
    setConfirmDialog({
      open: true,
      title: isMaintenance
        ? "Disable Maintenance Mode?"
        : "Enable Maintenance Mode?",
      message: isMaintenance
        ? "This will allow all tenants to log in and use the application again."
        : "WARNING: This will block all tenant users from accessing the application until disabled. Use only during critical updates.",
      type: isMaintenance ? "info" : "danger",
      confirmLabel: isMaintenance
        ? "Disable Maintenance"
        : "Enable Maintenance",
      onConfirm: async () => {
        try {
          setTogglingMaintenance(true);
          const newState = !isMaintenance;
          const res = await setMaintenanceStatus(newState);
          setIsMaintenance(res.is_maintenance);
          toast.success(
            res.is_maintenance
              ? "Maintenance Mode ENABLED"
              : "Maintenance Mode DISABLED",
          );
          setConfirmDialog({ ...confirmDialog, open: false });
        } catch (error) {
          toast.error("Failed to toggle maintenance mode");
        } finally {
          setTogglingMaintenance(false);
        }
      },
    });
  };

  const handleImpersonate = async (company) => {
    setConfirmDialog({
      open: true,
      title: `Impersonate ${company.name}?`,
      message:
        "You will be logged in as the admin for this tenant. A return banner will allow you to revert to Super Admin.",
      type: "info",
      confirmLabel: "Login As Tenant",
      onConfirm: async () => {
        try {
          const res = await impersonateTenant(company.id);
          // Store current token
          const currentToken =
            localStorage.getItem("access_token") ||
            sessionStorage.getItem("access_token");
          localStorage.setItem("super_admin_token", currentToken);

          // Overwrite token and redirect
          localStorage.setItem("access_token", res.access_token);
          window.location.replace("/");
        } catch (error) {
          toast.error(
            error.response?.data?.detail || "Failed to impersonate tenant",
          );
          setConfirmDialog({ ...confirmDialog, open: false });
        }
      },
    });
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
          {activeTab === "companies" ? (
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
          ) : (
            <button
              onClick={() => setShowCreatePlanModal(true)}
              className="relative z-10 flex items-center gap-2 bg-gradient-to-r from-blue-600 to-indigo-700 hover:from-blue-700 hover:to-indigo-800 text-white px-6 py-3 rounded-xl font-bold transition-all duration-300 shadow-lg shadow-blue-600/30 hover:shadow-xl hover:shadow-blue-600/40 hover:scale-105"
            >
              <Plus
                size={20}
                className="group-hover:rotate-90 transition-transform duration-300"
              />
              Add Plan
            </button>
          )}
        </div>
      </div>

      {/* Maintenance Mode Banner */}
      <div
        className={`p-5 rounded-2xl border-2 shadow-sm transition-all flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 ${
          isMaintenance
            ? "bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800"
            : "bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700"
        }`}
      >
        <div className="flex items-center gap-4">
          <div
            className={`p-3 rounded-xl ${isMaintenance ? "bg-red-100 dark:bg-red-900/50" : "bg-gray-100 dark:bg-gray-700"}`}
          >
            <AlertTriangle
              size={24}
              className={
                isMaintenance
                  ? "text-red-600 dark:text-red-400"
                  : "text-gray-400"
              }
            />
          </div>
          <div>
            <h3
              className={`text-lg font-bold ${isMaintenance ? "text-red-700 dark:text-red-400" : "text-gray-700 dark:text-gray-300"}`}
            >
              System Maintenance Mode
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
              {isMaintenance
                ? "Maintenance is ACTIVE. All tenant users are blocked from logging in or using APIs."
                : "Normal operation. System is accessible to all active tenants."}
            </p>
          </div>
        </div>

        <button
          onClick={handleToggleMaintenance}
          disabled={togglingMaintenance}
          className={`px-6 py-2.5 rounded-xl font-bold text-sm transition-all focus:ring-4 whitespace-nowrap ${
            isMaintenance
              ? "bg-red-600 hover:bg-red-700 text-white focus:ring-red-200"
              : "bg-gray-100 hover:bg-gray-200 text-gray-700 dark:bg-gray-700 dark:hover:bg-gray-600 dark:text-gray-200"
          }`}
        >
          {togglingMaintenance
            ? "Processing..."
            : isMaintenance
              ? "Disable Maintenance"
              : "Enable Maintenance"}
        </button>
      </div>

      {/* 🧭 TABS */}
      <div className="flex space-x-2 border-b border-gray-200 dark:border-gray-800 pb-1">
        <button
          onClick={() => setActiveTab("companies")}
          className={`flex items-center gap-2 px-6 py-3 rounded-t-xl font-bold transition-all ${
            activeTab === "companies"
              ? "bg-white dark:bg-gray-800 text-purple-600 dark:text-purple-400 border-t-2 border-l-2 border-r-2 border-purple-200 dark:border-purple-800 border-b-0 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]"
              : "text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800/50"
          }`}
        >
          <Building2 size={18} />
          Companies & Tenants
        </button>
        <button
          onClick={() => setActiveTab("plans")}
          className={`flex items-center gap-2 px-6 py-3 rounded-t-xl font-bold transition-all ${
            activeTab === "plans"
              ? "bg-white dark:bg-gray-800 text-blue-600 dark:text-blue-400 border-t-2 border-l-2 border-r-2 border-blue-200 dark:border-blue-800 border-b-0 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]"
              : "text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800/50"
          }`}
        >
          <Layers size={18} />
          Subscription Plans
        </button>
      </div>

      {activeTab === "companies" ? (
        <>
          {/* 📊 PLATFORM ANALYTICS */}
          {analytics && (
            <div className="space-y-6">
              {/* TOP STATS */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <Stat
                  label="Total MRR (Est.)"
                  value={`₹${(analytics.summary.total_mrr || 0).toLocaleString("en-IN")}`}
                  icon={DollarSign}
                  color="green"
                />
                <Stat
                  label="Active Tenants"
                  value={`${analytics.summary.active_companies} / ${analytics.summary.total_companies}`}
                  icon={Building2}
                  color="blue"
                />
                <Stat
                  label="Total Users"
                  value={analytics.summary.total_users || 0}
                  icon={Users}
                  color="orange"
                />
                <Stat
                  label="Avg. Revenue/User"
                  value={
                    analytics.summary.total_users > 0
                      ? `₹${Math.round(analytics.summary.total_mrr / analytics.summary.total_users).toLocaleString("en-IN")}`
                      : "₹0"
                  }
                  icon={TrendingUp}
                  color="purple"
                />
              </div>

              {/* CHARTS & USAGE ROW */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Growth Chart */}
                <div className="lg:col-span-2 bg-white dark:bg-gray-800 rounded-3xl p-6 shadow-xl border border-gray-100 dark:border-gray-700">
                  <div className="flex items-center justify-between mb-6">
                    <div>
                      <h3 className="text-xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
                        Tenant Growth (6 Months)
                      </h3>
                      <p className="text-sm text-gray-500">
                        New tenants acquired over the last six months
                      </p>
                    </div>
                    <div className="p-3 bg-purple-50 dark:bg-purple-900/30 rounded-xl">
                      <BarChart
                        className="text-purple-600 dark:text-purple-400"
                        size={24}
                      />
                    </div>
                  </div>
                  <div className="h-72 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={analytics.growth_trends}>
                        <defs>
                          <linearGradient
                            id="colorGrowth"
                            x1="0"
                            y1="0"
                            x2="0"
                            y2="1"
                          >
                            <stop
                              offset="5%"
                              stopColor="#8b5cf6"
                              stopOpacity={0.4}
                            />
                            <stop
                              offset="95%"
                              stopColor="#8b5cf6"
                              stopOpacity={0}
                            />
                          </linearGradient>
                        </defs>
                        <CartesianGrid
                          strokeDasharray="3 3"
                          vertical={false}
                          stroke="#e5e7eb"
                          className="dark:stroke-gray-700"
                        />
                        <XAxis
                          dataKey="month"
                          axisLine={false}
                          tickLine={false}
                          tick={{ fill: "#6b7280", fontSize: 12 }}
                          dy={10}
                        />
                        <YAxis
                          axisLine={false}
                          tickLine={false}
                          tick={{ fill: "#6b7280", fontSize: 12 }}
                          dx={-10}
                        />
                        <RechartsTooltip
                          contentStyle={{
                            borderRadius: "12px",
                            border: "none",
                            boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.1)",
                          }}
                        />
                        <Area
                          type="monotone"
                          dataKey="new_companies"
                          stroke="#8b5cf6"
                          strokeWidth={3}
                          fillOpacity={1}
                          fill="url(#colorGrowth)"
                          name="New Tenants"
                          animationDuration={1500}
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Top Usage Leaders */}
                <div className="bg-white dark:bg-gray-800 rounded-3xl p-6 shadow-xl border border-gray-100 dark:border-gray-700 overflow-hidden flex flex-col">
                  <div className="flex items-center justify-between mb-6">
                    <div>
                      <h3 className="text-xl font-bold bg-gradient-to-r from-blue-600 to-cyan-600 bg-clip-text text-transparent">
                        Top Platforms
                      </h3>
                      <p className="text-sm text-gray-500">
                        Most active tenants by volume
                      </p>
                    </div>
                    <div className="p-3 bg-blue-50 dark:bg-blue-900/30 rounded-xl">
                      <Activity
                        className="text-blue-600 dark:text-blue-400"
                        size={24}
                      />
                    </div>
                  </div>

                  <div className="flex-1 overflow-y-auto pr-2 space-y-4">
                    {analytics.usage_metrics &&
                    analytics.usage_metrics.length > 0 ? (
                      analytics.usage_metrics.map((metric, idx) => (
                        <div
                          key={idx}
                          className="flex items-center gap-4 p-3 rounded-2xl hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                        >
                          <div
                            className={`w-10 h-10 min-w-10 rounded-full flex items-center justify-center font-black shadow-sm ${
                              idx === 0
                                ? "bg-amber-100 text-amber-600"
                                : idx === 1
                                  ? "bg-gray-100 text-gray-600"
                                  : idx === 2
                                    ? "bg-orange-100 text-orange-600"
                                    : "bg-blue-50 text-blue-600"
                            }`}
                          >
                            #{idx + 1}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-bold text-gray-900 dark:text-white truncate">
                              {metric.company_name}
                            </p>
                            <p className="text-xs text-gray-500 font-medium">
                              {metric.invoice_count.toLocaleString()} invoices
                            </p>
                          </div>
                          <div className="w-16 h-2 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-gradient-to-r from-blue-500 to-cyan-500 rounded-full"
                              style={{
                                width: `${Math.max(10, (metric.invoice_count / (analytics.usage_metrics[0]?.invoice_count || 1)) * 100)}%`,
                              }}
                            ></div>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="flex flex-col items-center justify-center h-full text-center p-4">
                        <Activity
                          className="text-gray-300 dark:text-gray-600 mb-2"
                          size={32}
                        />
                        <p className="text-sm text-gray-500 font-medium">
                          No usage data yet
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

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
      ) : (
        /* 📦 PLANS VIEW */
        <div className="bg-white dark:bg-gray-800 rounded-3xl p-6 md:p-8 shadow-xl border border-gray-100 dark:border-gray-700">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                Active Subscription Plans
              </h2>
              <p className="text-sm text-gray-500">
                Manage the pricing tiers available for your tenants
              </p>
            </div>
            <div className="bg-blue-50 dark:bg-blue-900/30 p-3 rounded-2xl">
              <Package className="text-blue-600 dark:text-blue-400" size={28} />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {loading ? (
              <p className="text-gray-500">Loading plans...</p>
            ) : plans.length === 0 ? (
              <p className="text-gray-500">No plans configured yet.</p>
            ) : (
              plans.map((plan) => (
                <div
                  key={plan.id}
                  className={`flex flex-col border-2 rounded-2xl p-6 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl ${plan.is_active ? "border-gray-200 dark:border-gray-700 hover:border-blue-400 dark:hover:border-blue-500 bg-white dark:bg-gray-800" : "border-gray-200 bg-gray-50 hover:border-gray-300 dark:bg-gray-800/50 dark:border-gray-700/50 opacity-75"}`}
                >
                  <div className="flex justify-between items-start mb-4">
                    <h3 className="text-xl font-black text-gray-900 dark:text-white uppercase tracking-wide">
                      {plan.name}
                    </h3>
                    {!plan.is_active && (
                      <span className="text-xs bg-red-100 text-red-600 px-2 py-1 rounded-md font-bold uppercase tracking-wider">
                        Inactive
                      </span>
                    )}
                  </div>
                  <div className="mb-4">
                    <span className="text-3xl font-black bg-gradient-to-r from-blue-600 to-cyan-600 bg-clip-text text-transparent">
                      ₹{plan.price.toLocaleString("en-IN")}
                    </span>
                    <span className="text-sm text-gray-500 ml-2 font-medium">
                      / {plan.duration_days} Days
                    </span>
                  </div>

                  <div className="flex-1 space-y-3 mb-6">
                    <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
                      <Users size={16} className="text-blue-500" />
                      <span className="font-medium">
                        Up to {plan.max_users} Users
                      </span>
                    </div>
                    {plan.features?.map((feat, i) => (
                      <div
                        key={i}
                        className="flex items-start gap-2 text-sm text-gray-600 dark:text-gray-300"
                      >
                        <CheckCircle
                          size={16}
                          className="text-green-500 mt-0.5 min-w-[16px]"
                        />
                        <span>{feat}</span>
                      </div>
                    ))}
                  </div>

                  <button
                    onClick={() => {
                      setSelectedPlan(plan);
                      setShowUpdatePlanModal(true);
                    }}
                    className="w-full py-2.5 rounded-xl border-2 border-gray-200 dark:border-gray-700 hover:border-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 text-gray-700 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 font-bold transition-all"
                  >
                    Edit Plan Breakdown
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* MODALS */}
      {showCreatePlanModal && (
        <CreatePlanModal
          onClose={() => setShowCreatePlanModal(false)}
          onSave={handleCreatePlan}
        />
      )}

      {showUpdatePlanModal && selectedPlan && (
        <UpdatePlanModal
          plan={selectedPlan}
          onClose={() => setShowUpdatePlanModal(false)}
          onSave={handleUpdatePlan}
        />
      )}

      {showCreateModal && (
        <CreateCompanyModal
          plans={plans}
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
          plans={plans}
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
          onImpersonate={() => {
            setShowManageModal(false);
            handleImpersonate(selectedCompany);
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
    purple: {
      bg: "bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/30 dark:to-purple-800/20",
      iconBg: "bg-gradient-to-br from-purple-500 to-purple-600",
      text: "text-purple-600 dark:text-purple-400",
      shadow: "shadow-purple-500/20 dark:shadow-purple-500/10",
      hoverShadow: "hover:shadow-purple-500/30 dark:hover:shadow-purple-500/20",
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
function CreateCompanyModal({ plans, onClose, onSave }) {
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    website: "",
    gst_number: "",
    limit: 5,
    plan_id: "",
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave({
      ...form,
      plan_id: form.plan_id ? parseInt(form.plan_id) : null,
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
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-60 overflow-y-auto pr-2">
            {plans &&
              plans
                .filter((p) => p.is_active)
                .map((plan) => (
                  <PlanCard
                    key={plan.id}
                    title={plan.name}
                    days={plan.duration_days}
                    price={`₹${plan.price.toLocaleString("en-IN")}`}
                    selected={form.plan_id === plan.id}
                    onClick={() => setForm({ ...form, plan_id: plan.id })}
                  />
                ))}
            {(!plans || plans.filter((p) => p.is_active).length === 0) && (
              <p className="text-sm text-gray-500 col-span-2">
                No active subscription plans available. Tenants will be created
                without a specific plan.
              </p>
            )}
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
function ExtendSubscriptionModal({ company, plans, onClose, onSave }) {
  const [extensionType, setExtensionType] = useState("plan"); // 'plan' or 'custom'
  const [planId, setPlanId] = useState("");
  const [customDays, setCustomDays] = useState(365);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (extensionType === "plan" && planId) {
      onSave({ plan_id: parseInt(planId) });
    } else {
      const currentEnd = new Date(company.subscription_end);
      const newDate = new Date(currentEnd);
      newDate.setDate(newDate.getDate() + customDays);
      onSave({ new_end: newDate.toISOString().split("T")[0] });
    }
  };

  return (
    <ModalWrapper
      onClose={onClose}
      title={`Extend Subscription: ${company.name}`}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="flex gap-4 mb-4">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="radio"
              name="extType"
              checked={extensionType === "plan"}
              onChange={() => setExtensionType("plan")}
              className="text-blue-600"
            />
            <span className="text-sm dark:text-gray-300">Choose Plan</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="radio"
              name="extType"
              checked={extensionType === "custom"}
              onChange={() => setExtensionType("custom")}
              className="text-blue-600"
            />
            <span className="text-sm dark:text-gray-300">Custom Days</span>
          </label>
        </div>

        {extensionType === "plan" ? (
          <div>
            <label className="block text-sm font-medium mb-1 dark:text-gray-200">
              Select Plan
            </label>
            <select
              className="w-full px-4 py-2 rounded-lg border bg-gray-50 dark:bg-gray-900 dark:border-gray-700 focus:ring-2 focus:ring-blue-500 outline-none transition dark:text-white"
              value={planId}
              required
              onChange={(e) => setPlanId(e.target.value)}
            >
              <option value="" disabled>
                -- Select a Plan --
              </option>
              {plans &&
                plans
                  .filter((p) => p.is_active)
                  .map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} - ₹{p.price.toLocaleString("en-IN")} (
                      {p.duration_days} days)
                    </option>
                  ))}
            </select>
          </div>
        ) : (
          <div>
            <label className="block text-sm font-medium mb-1 dark:text-gray-200">
              Extend By
            </label>
            <select
              className="w-full px-4 py-2 rounded-lg border bg-gray-50 dark:bg-gray-900 dark:border-gray-700 focus:ring-2 focus:ring-blue-500 outline-none transition dark:text-white"
              value={customDays}
              onChange={(e) => setCustomDays(Number(e.target.value))}
            >
              <option value={30}>30 Days (1 Month)</option>
              <option value={90}>90 Days (3 Months)</option>
              <option value={180}>180 Days (6 Months)</option>
              <option value={365}>365 Days (1 Year)</option>
              <option value={730}>2 Years</option>
            </select>

            <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg mt-4">
              <p className="text-sm text-blue-800 dark:text-blue-300">
                Current End:{" "}
                <span className="font-semibold">
                  {new Date(company.subscription_end).toLocaleDateString()}
                </span>
              </p>
              <p className="text-sm text-blue-800 dark:text-blue-300">
                New End:{" "}
                <span className="font-semibold">
                  {(() => {
                    const currentEnd = new Date(company.subscription_end);
                    const newDate = new Date(currentEnd);
                    newDate.setDate(newDate.getDate() + customDays);
                    return newDate.toLocaleDateString();
                  })()}
                </span>
              </p>
            </div>
          </div>
        )}

        <ModalActions onClose={onClose} submitLabel="Extend Subscription" />
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
// CREATE PLAN MODAL
// -----------------------------------------
function CreatePlanModal({ onClose, onSave }) {
  const [form, setForm] = useState({
    name: "",
    price: 0,
    duration_days: 30,
    max_users: 5,
    features: "",
    is_active: true,
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    const payload = {
      ...form,
      price: parseFloat(form.price),
      duration_days: parseInt(form.duration_days),
      max_users: parseInt(form.max_users),
      features: form.features
        .split(",")
        .map((f) => f.trim())
        .filter(Boolean),
    };
    onSave(payload);
  };

  return (
    <ModalWrapper onClose={onClose} title="Create Subscription Plan">
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          label="Plan Name"
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
          placeholder="Professional"
          icon={Package}
        />

        <div className="grid grid-cols-2 gap-4">
          <Input
            label="Price (₹)"
            type="number"
            value={form.price}
            onChange={(e) => setForm({ ...form, price: e.target.value })}
            placeholder="999"
            icon={DollarSign}
          />
          <Input
            label="Duration (Days)"
            type="number"
            value={form.duration_days}
            onChange={(e) =>
              setForm({ ...form, duration_days: e.target.value })
            }
            placeholder="365"
            icon={Calendar}
          />
        </div>

        <Input
          label="Max Users"
          type="number"
          value={form.max_users}
          onChange={(e) => setForm({ ...form, max_users: e.target.value })}
          placeholder="10"
          icon={Users}
        />

        <div>
          <label className="block text-sm font-medium mb-1 dark:text-gray-200">
            Features (Comma Separated)
          </label>
          <textarea
            className="w-full px-4 py-2 rounded-lg border bg-gray-50 dark:bg-gray-900 dark:border-gray-700 outline-none focus:ring-2 focus:ring-blue-500 dark:text-white"
            rows="3"
            placeholder="Unlimited Invoices, Priority Support..."
            value={form.features}
            onChange={(e) => setForm({ ...form, features: e.target.value })}
          ></textarea>
        </div>

        <label className="flex items-center gap-2 cursor-pointer mt-2">
          <input
            type="checkbox"
            checked={form.is_active}
            onChange={(e) => setForm({ ...form, is_active: e.target.checked })}
            className="w-5 h-5 rounded text-blue-600 focus:ring-blue-500"
          />
          <span className="text-sm font-medium dark:text-gray-200">
            Plan is Active
          </span>
        </label>

        <ModalActions onClose={onClose} submitLabel="Create Plan" />
      </form>
    </ModalWrapper>
  );
}

// -----------------------------------------
// UPDATE PLAN MODAL
// -----------------------------------------
function UpdatePlanModal({ plan, onClose, onSave }) {
  const [form, setForm] = useState({
    name: plan.name,
    price: plan.price.toString(),
    duration_days: plan.duration_days.toString(),
    max_users: plan.max_users.toString(),
    features: (plan.features || []).join(", "),
    is_active: plan.is_active,
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    const payload = {
      name: form.name,
      price: parseFloat(form.price),
      duration_days: parseInt(form.duration_days),
      max_users: parseInt(form.max_users),
      features: form.features
        .split(",")
        .map((f) => f.trim())
        .filter(Boolean),
      is_active: form.is_active,
    };
    onSave(payload);
  };

  return (
    <ModalWrapper onClose={onClose} title="Edit Subscription Plan">
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          label="Plan Name"
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
          icon={Package}
        />

        <div className="grid grid-cols-2 gap-4">
          <Input
            label="Price (₹)"
            type="number"
            value={form.price}
            onChange={(e) => setForm({ ...form, price: e.target.value })}
            icon={DollarSign}
          />
          <Input
            label="Duration (Days)"
            type="number"
            value={form.duration_days}
            onChange={(e) =>
              setForm({ ...form, duration_days: e.target.value })
            }
            icon={Calendar}
          />
        </div>

        <Input
          label="Max Users"
          type="number"
          value={form.max_users}
          onChange={(e) => setForm({ ...form, max_users: e.target.value })}
          icon={Users}
        />

        <div>
          <label className="block text-sm font-medium mb-1 dark:text-gray-200">
            Features (Comma Separated)
          </label>
          <textarea
            className="w-full px-4 py-2 rounded-lg border bg-gray-50 dark:bg-gray-900 dark:border-gray-700 outline-none focus:ring-2 focus:ring-blue-500 dark:text-white"
            rows="3"
            value={form.features}
            onChange={(e) => setForm({ ...form, features: e.target.value })}
          ></textarea>
        </div>

        <label className="flex items-center gap-2 cursor-pointer mt-2">
          <input
            type="checkbox"
            checked={form.is_active}
            onChange={(e) => setForm({ ...form, is_active: e.target.checked })}
            className="w-5 h-5 rounded text-blue-600 focus:ring-blue-500"
          />
          <span className="text-sm font-medium dark:text-gray-200">
            Plan is Active
          </span>
        </label>

        <ModalActions onClose={onClose} submitLabel="Save Changes" />
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

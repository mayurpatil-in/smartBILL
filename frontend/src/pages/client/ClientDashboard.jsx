import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Link } from "react-router-dom";
import { useClientAuth } from "../../context/ClientAuthContext";
import {
  TrendingUp,
  Clock,
  FileText,
  RefreshCw,
  Download,
  Calendar,
  AlertCircle,
  CheckCircle,
  ChevronDown,
  Truck,
  Wallet,
  Zap,
  ArrowRight,
  Sun,
  Sunset,
  Moon,
  Copy,
  Check,
} from "lucide-react";
import toast from "react-hot-toast";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";

export default function ClientDashboard() {
  const { client } = useClientAuth();
  const { t } = useTranslation();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [financialYears, setFinancialYears] = useState([]);
  const [selectedFinancialYear, setSelectedFinancialYear] = useState("");
  const [showFYDropdown, setShowFYDropdown] = useState(false);
  const [downloadingId, setDownloadingId] = useState(null);
  const [companyInfo, setCompanyInfo] = useState(null);
  const [showRemittanceModal, setShowRemittanceModal] = useState(false);
  const [fetchingCompany, setFetchingCompany] = useState(false);
  const [copiedPayee, setCopiedPayee] = useState(false);

  const handleCopyCompanyInfo = () => {
    if (!companyInfo) return;
    const textToCopy = `Vendor: ${companyInfo.name}\n` +
      (companyInfo.gst_number ? `GSTIN: ${companyInfo.gst_number}\n` : "") +
      (companyInfo.phone ? `Phone: ${companyInfo.phone}\n` : "") +
      (companyInfo.email ? `Email: ${companyInfo.email}\n` : "") +
      (companyInfo.address ? `Address: ${companyInfo.address}` : "");

    navigator.clipboard.writeText(textToCopy);
    setCopiedPayee(true);
    toast.success("Vendor details copied to clipboard!");
    setTimeout(() => setCopiedPayee(false), 2500);
  };

  const fetchCompanyInfo = async () => {
    if (companyInfo) {
      setShowRemittanceModal(true);
      return;
    }
    setFetchingCompany(true);
    try {
      const token = localStorage.getItem("client_token");
      const res = await fetch(`${import.meta.env.VITE_API_URL}/client/company-info`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setCompanyInfo(data);
        setShowRemittanceModal(true);
      }
    } catch (err) {
      toast.error("Could not fetch company payment info");
    } finally {
      setFetchingCompany(false);
    }
  };

  // Time-based greeting
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return { text: "Good Morning", icon: Sun, color: "text-amber-400" };
    if (hour < 18) return { text: "Good Afternoon", icon: Sunset, color: "text-orange-400" };
    return { text: "Good Evening", icon: Moon, color: "text-indigo-300" };
  };
  const greeting = getGreeting();
  const GreetingIcon = greeting.icon;

  const clientName = client?.partyName || client?.username || stats?.party_name || "Client";
  const initials = clientName.split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 2);

  const handleDownload = async (invoiceId, invoiceNumber) => {
    setDownloadingId(invoiceId);
    try {
      const token = localStorage.getItem("client_token");
      const res = await fetch(
        `${import.meta.env.VITE_API_URL}/client/invoices/${invoiceId}/download`,
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || "Download failed");
      }

      const html = await res.text();
      const blob = new Blob([html], { type: "text/html" });
      const blobUrl = URL.createObjectURL(blob);
      const printWindow = window.open(blobUrl, "_blank");
      if (!printWindow) {
        toast.error("Popup blocked - please allow popups for this site");
        return;
      }
      printWindow.focus();
      setTimeout(() => {
        printWindow.print();
        URL.revokeObjectURL(blobUrl);
      }, 500);
      toast.success("Invoice opened — select 'Save as PDF' to download.", { duration: 5000 });
    } catch (err) {
      toast.error(err.message);
    } finally {
      setDownloadingId(null);
    }
  };

  const fetchStats = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("client_token");
      let url = `${import.meta.env.VITE_API_URL}/client/dashboard`;

      // Add financial year parameter if selected
      if (selectedFinancialYear) {
        url += `?financial_year_id=${selectedFinancialYear}`;
      }

      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Failed to fetch dashboard");
      const data = await res.json();
      setStats(data);
    } catch (err) {
      console.error(err);
      toast.error("Could not load dashboard data");
    } finally {
      setLoading(false);
    }
  };

  const fetchFinancialYears = async () => {
    try {
      const token = localStorage.getItem("client_token");
      const res = await fetch(
        `${import.meta.env.VITE_API_URL}/client/financial-years`,
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );
      if (!res.ok) throw new Error("Failed to fetch financial years");
      const data = await res.json();
      setFinancialYears(data);

      // Set default to active financial year
      const activeFY = data.find((fy) => fy.is_active);
      if (activeFY) {
        setSelectedFinancialYear(activeFY.id);
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchFinancialYears();
  }, []);

  useEffect(() => {
    if (selectedFinancialYear !== null) {
      fetchStats();
    }
  }, [selectedFinancialYear]);

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-24 bg-gray-200 dark:bg-gray-700 rounded-xl"></div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-32 bg-gray-200 dark:bg-gray-700 rounded-xl"
            ></div>
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="h-80 bg-gray-200 dark:bg-gray-700 rounded-xl"></div>
          <div className="h-80 bg-gray-200 dark:bg-gray-700 rounded-xl"></div>
        </div>
      </div>
    );
  }

  if (!stats) return null;

  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.1 }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 300, damping: 24 } }
  };

  return (
    <motion.div 
      className="space-y-8"
      variants={containerVariants}
      initial="hidden"
      animate="show"
    >
      {/* Hero Section — animated gradient banner */}
      <motion.div variants={itemVariants} className="relative rounded-2xl overflow-hidden text-white shadow-2xl">
        {/* Background gradient */}
        <div
          className="absolute inset-0"
          style={{
            background: "linear-gradient(135deg, #1e1b4b 0%, #312e81 30%, #4f46e5 65%, #7c3aed 100%)",
            backgroundSize: "400% 400%",
            animation: "gradientShift 8s ease infinite",
          }}
        />
        {/* Decorative circles */}
        <div className="absolute -top-12 -right-12 w-64 h-64 bg-white/5 rounded-full blur-2xl" />
        <div className="absolute -bottom-8 -left-8 w-48 h-48 bg-purple-400/10 rounded-full blur-2xl" />
        <div className="absolute top-1/2 right-1/4 w-32 h-32 bg-indigo-300/5 rounded-full blur-xl" />

        <div className="relative z-10 p-5 sm:p-7 md:p-8">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-5">
            {/* Greeting */}
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-white/10 backdrop-blur-sm border border-white/20 flex items-center justify-center text-xl font-bold text-white shadow-xl flex-shrink-0">
                {initials}
              </div>
              <div>
                <div className="flex items-center gap-2 mb-0.5">
                  <GreetingIcon className={`w-4 h-4 ${greeting.color}`} />
                  <span className={`text-sm font-medium ${greeting.color}`}>{greeting.text}</span>
                </div>
                <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-white leading-tight">
                  {clientName}!
                </h1>
                <p className="text-indigo-200 text-sm mt-0.5">{t("client_dashboard.overview", "Here's your account overview")}</p>
              </div>
            </div>

            {/* Controls */}
            <div className="flex items-center gap-2 w-full md:w-auto">
              <div className="relative flex-1 md:flex-none">
                <button
                  onClick={() => setShowFYDropdown(!showFYDropdown)}
                  className="flex items-center justify-center gap-2 px-3 sm:px-4 py-2.5 bg-white/10 hover:bg-white/20 rounded-xl transition-all duration-200 backdrop-blur-sm border border-white/20 w-full md:w-auto text-sm font-medium"
                >
                  <Calendar size={16} />
                  <span className="truncate">
                    {selectedFinancialYear
                      ? financialYears.find((fy) => fy.id === selectedFinancialYear)?.year_name
                      : t("client_dashboard.all_years", "All Years")}
                  </span>
                  <ChevronDown size={14} />
                </button>
                {showFYDropdown && (
                  <div className="absolute right-0 mt-2 w-48 bg-gray-900 rounded-xl shadow-2xl border border-white/10 py-2 z-50">
                    <button onClick={() => { setSelectedFinancialYear(""); setShowFYDropdown(false); }}
                      className={`w-full text-left px-4 py-2.5 text-sm transition-colors ${
                        selectedFinancialYear === ""
                          ? "bg-indigo-600/30 text-indigo-300 font-medium"
                          : "text-gray-300 hover:bg-white/5"
                      }`}>
                      {t("client_dashboard.all_years", "All Years")}
                    </button>
                    {financialYears.map((fy) => (
                      <button key={fy.id}
                        onClick={() => { setSelectedFinancialYear(fy.id); setShowFYDropdown(false); }}
                        className={`w-full text-left px-4 py-2.5 text-sm transition-colors ${
                          selectedFinancialYear === fy.id
                            ? "bg-indigo-600/30 text-indigo-300 font-medium"
                            : "text-gray-300 hover:bg-white/5"
                        }`}>
                        {fy.year_name}
                        {fy.is_active && (
                          <span className="ml-2 text-xs bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded-full">Active</span>
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <button onClick={fetchStats}
                className="p-2.5 hover:bg-white/20 rounded-xl transition-all duration-200 hover:scale-105 border border-white/10"
                aria-label="Refresh data">
                <RefreshCw className="w-4 h-4 sm:w-5 sm:h-5" />
              </button>
            </div>
          </div>

          {/* Quick action chips */}
          <div className="flex flex-wrap gap-2 mt-5">
            {[
              { to: "/portal/invoices", label: t("client_dashboard.view_invoices", "View Invoices"), icon: FileText },
              { to: "/portal/challans", label: t("client_dashboard.track_challans", "Track Challans"), icon: Truck },
              { to: "/portal/ledger", label: t("client_dashboard.my_statement", "My Statement"), icon: Wallet },
            ].map(({ to, label, icon: Icon }) => (
              <Link key={to} to={to}
                className="flex items-center gap-2 px-3 py-1.5 bg-white/10 hover:bg-white/20 border border-white/15 rounded-lg text-sm font-medium text-white transition-all hover:scale-105 hover:shadow-lg">
                <Icon className="w-3.5 h-3.5" />
                {label}
                <ArrowRight className="w-3 h-3 opacity-60" />
              </Link>
            ))}
          </div>
        </div>

        <style>{`
          @keyframes gradientShift {
            0% { background-position: 0% 50%; }
            50% { background-position: 100% 50%; }
            100% { background-position: 0% 50%; }
          }
        `}</style>
      </motion.div>

      {/* Stats Cards */}
      <motion.div variants={itemVariants} className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Outstanding Balance */}
        <div className="group bg-white dark:bg-gray-800 rounded-2xl p-4 sm:p-6 shadow-lg border border-gray-100 dark:border-gray-700 hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
          <div className="flex items-center justify-between mb-3 sm:mb-4">
            <div className="p-2 sm:p-3 bg-gradient-to-br from-rose-500 to-pink-600 rounded-xl shadow-lg">
              <TrendingUp className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
            </div>
            <span className="text-[10px] sm:text-xs font-bold bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400 px-2 sm:px-3 py-1 rounded-full">
              DUE
            </span>
          </div>
          <p className="text-xs sm:text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">
            {t("client_dashboard.total_outstanding", "Total Outstanding")}
          </p>
          <div className="flex items-baseline justify-between flex-wrap gap-2">
            <h3 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">
              ₹{stats.total_outstanding.toLocaleString("en-IN")}
            </h3>
            <button
              onClick={fetchCompanyInfo}
              disabled={fetchingCompany}
              className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-lg shadow-sm transition-all hover:scale-105 flex items-center gap-1.5"
            >
              {fetchingCompany ? (
                <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <Zap size={14} />
              )}
              Remittance Info
            </button>
          </div>
        </div>

        {/* Last Payment */}
        <div className="group bg-white dark:bg-gray-800 rounded-2xl p-4 sm:p-6 shadow-lg border border-gray-100 dark:border-gray-700 hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
          <div className="flex items-center justify-between mb-3 sm:mb-4">
            <div className="p-2 sm:p-3 bg-gradient-to-br from-emerald-500 to-green-600 rounded-xl shadow-lg">
              <CheckCircle className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
            </div>
            <Calendar className="w-4 h-4 sm:w-5 sm:h-5 text-gray-400" />
          </div>
          <p className="text-xs sm:text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">
            {t("client_dashboard.last_payment", "Last Payment")}
          </p>
          <h3 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white mb-2">
            ₹{stats.last_payment_amount.toLocaleString("en-IN")}
          </h3>
          <p className="text-xs text-gray-400">
            {stats.last_payment_date
              ? new Date(stats.last_payment_date).toLocaleDateString("en-IN")
              : t("client_dashboard.no_payments_yet", "No payments yet")}
          </p>
        </div>

        {/* Open Invoices */}
        <div className="group bg-white dark:bg-gray-800 rounded-2xl p-4 sm:p-6 shadow-lg border border-gray-100 dark:border-gray-700 hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
          <div className="flex items-center justify-between mb-3 sm:mb-4">
            <div className="p-2 sm:p-3 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl shadow-lg">
              <FileText className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
            </div>
            <AlertCircle className="w-4 h-4 sm:w-5 sm:h-5 text-amber-500" />
          </div>
          <p className="text-xs sm:text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">
            {t("client_dashboard.open_invoices", "Open Invoices")}
          </p>
          <h3 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white mb-2">
            {stats.open_invoices_count}
          </h3>
          <Link
            to="/portal/invoices"
            className="text-xs text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 font-medium inline-flex items-center group-hover:translate-x-1 transition-transform"
          >
            {t("client_dashboard.view_all", "View All →")}
          </Link>
        </div>
      </motion.div>

      {/* Charts & Recent Activity */}
      <motion.div variants={itemVariants} className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Monthly Spending Chart */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-lg border border-gray-100 dark:border-gray-700">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white">
              {t("client_dashboard.monthly_spending", "Monthly Spending Trend")}
            </h3>
            <div className="flex items-center gap-2 text-xs text-gray-500">
              <div className="w-3 h-3 bg-gradient-to-r from-blue-500 to-indigo-600 rounded"></div>
              <span>{t("client_dashboard.amount", "Amount (₹)")}</span>
            </div>
          </div>
          <div className="w-full h-[300px] min-h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stats.monthly_stats}>
                <defs>
                  <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.8} />
                    <stop offset="95%" stopColor="#6366F1" stopOpacity={0.6} />
                  </linearGradient>
                </defs>
                <CartesianGrid
                  strokeDasharray="3 3"
                  vertical={false}
                  stroke="#E5E7EB"
                />
                <XAxis
                  dataKey="name"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: "#6B7280", fontSize: 12 }}
                  dy={10}
                />
                <YAxis hide />
                <Tooltip
                  cursor={{ fill: "transparent" }}
                  contentStyle={{
                    backgroundColor: "#1F2937",
                    borderRadius: "12px",
                    border: "none",
                    color: "#fff",
                    boxShadow: "0 10px 25px rgba(0,0,0,0.2)",
                  }}
                  itemStyle={{ color: "#fff" }}
                  formatter={(value) => `₹${value.toLocaleString("en-IN")}`}
                />
                <Bar
                  dataKey="total"
                  fill="url(#colorTotal)"
                  radius={[8, 8, 0, 0]}
                  barSize={40}
                  animationDuration={1000}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Recent Invoices */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-lg border border-gray-100 dark:border-gray-700">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white">
              {t("client_dashboard.recent_invoices", "Recent Invoices")}
            </h3>
            <Link
              to="/portal/invoices"
              className="text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 font-medium transition-colors"
            >
              {t("client_dashboard.view_all_link", "View All")}
            </Link>
          </div>

          <div className="space-y-3">
            {stats.recent_invoices && stats.recent_invoices.length > 0 ? (
              stats.recent_invoices.map((inv) => (
                <div
                  key={inv.id}
                  className="group flex items-center justify-between p-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 rounded-xl transition-all duration-200 border border-gray-100 dark:border-gray-700/50 hover:shadow-md"
                >
                  <div className="flex items-center gap-4 flex-1">
                    <div className="p-2.5 bg-blue-50 dark:bg-blue-900/20 rounded-lg group-hover:scale-110 transition-transform">
                      <FileText
                        size={20}
                        className="text-blue-600 dark:text-blue-400"
                      />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-gray-900 dark:text-white">
                        {inv.invoice_number}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {new Date(inv.invoice_date).toLocaleDateString(
                          "en-IN",
                          {
                            day: "numeric",
                            month: "short",
                            year: "numeric",
                          },
                        )}
                      </p>
                    </div>
                  </div>
                  <div className="text-right flex items-center gap-3">
                    <div>
                      <p className="text-sm font-bold text-gray-900 dark:text-white">
                        ₹{inv.grand_total.toLocaleString("en-IN")}
                      </p>
                      <span
                        className={`text-[10px] uppercase font-bold px-2.5 py-1 rounded-full ${
                          inv.status === "PAID"
                            ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
                            : inv.status === "OVERDUE"
                              ? "bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400"
                              : "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
                        }`}
                      >
                        {inv.status}
                      </span>
                    </div>
                    <button
                      onClick={() => handleDownload(inv.id, inv.invoice_number)}
                      disabled={downloadingId === inv.id}
                      className="opacity-0 group-hover:opacity-100 p-2 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-all disabled:opacity-50"
                      aria-label="Download invoice"
                    >
                      {downloadingId === inv.id ? (
                        <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                      ) : (
                        <Download
                          size={16}
                          className="text-blue-600 dark:text-blue-400"
                        />
                      )}
                    </button>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-12">
                <FileText className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
                <p className="text-gray-500 dark:text-gray-400 text-sm">
                  No recent invoices
                </p>
              </div>
            )}
          </div>
        </div>
      </motion.div>

      {/* Remittance Payment Info Modal */}
      {showRemittanceModal &&
        companyInfo &&
        createPortal(
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
            <div className="bg-white dark:bg-gray-800 rounded-3xl max-w-md w-full p-6 shadow-2xl border border-gray-200 dark:border-gray-700 relative overflow-hidden">
              <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600" />
              <button
                onClick={() => setShowRemittanceModal(false)}
                className="absolute top-4 right-4 p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              >
                <AlertCircle size={20} className="hidden" />
                <span className="font-bold text-lg">✕</span>
              </button>

              <div className="flex items-center gap-3 mb-4">
                <div className="p-3 bg-indigo-100 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400 rounded-2xl">
                  <Zap size={24} />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-gray-900 dark:text-white">Payment Remittance Info</h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Remit payments to vendor account</p>
                </div>
              </div>

              <div className="space-y-4 my-6">
                <div className="p-4 bg-gray-50 dark:bg-gray-900/60 rounded-2xl border border-gray-100 dark:border-gray-700/60 space-y-3">
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-gray-500 dark:text-gray-400">Vendor / Payee</span>
                    <span className="font-bold text-gray-900 dark:text-white text-right">{companyInfo.name}</span>
                  </div>
                  {companyInfo.gst_number && (
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-gray-500 dark:text-gray-400">GSTIN</span>
                      <span className="font-mono text-gray-800 dark:text-gray-200">{companyInfo.gst_number}</span>
                    </div>
                  )}
                  {companyInfo.phone && (
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-gray-500 dark:text-gray-400">Phone</span>
                      <span className="text-gray-800 dark:text-gray-200">{companyInfo.phone}</span>
                    </div>
                  )}
                  {companyInfo.email && (
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-gray-500 dark:text-gray-400">Email</span>
                      <span className="text-gray-800 dark:text-gray-200">{companyInfo.email}</span>
                    </div>
                  )}
                  {companyInfo.address && (
                    <div className="flex justify-between items-start text-xs pt-1 border-t border-gray-200 dark:border-gray-700">
                      <span className="text-gray-500 dark:text-gray-400">Address</span>
                      <span className="text-gray-800 dark:text-gray-200 text-right max-w-[200px]">{companyInfo.address}</span>
                    </div>
                  )}
                </div>

                <div className="p-4 bg-indigo-50 dark:bg-indigo-950/40 rounded-2xl border border-indigo-100 dark:border-indigo-900/50">
                  <h4 className="text-xs font-bold text-indigo-900 dark:text-indigo-300 uppercase tracking-wider mb-2">Remittance Instructions</h4>
                  <p className="text-xs text-indigo-700 dark:text-indigo-300 leading-relaxed">
                    Please transfer funds via NEFT / RTGS / UPI to the vendor's bank account or phone contact above, referencing your Party Name and Invoice Number in the transaction remarks.
                  </p>
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={handleCopyCompanyInfo}
                  className="flex-1 py-2.5 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-800 dark:text-gray-200 text-xs font-semibold rounded-xl transition-colors flex items-center justify-center gap-1.5"
                >
                  {copiedPayee ? (
                    <>
                      <Check size={16} className="text-emerald-600" />
                      Copied!
                    </>
                  ) : (
                    <>
                      <Copy size={16} />
                      Copy Details
                    </>
                  )}
                </button>
                <button
                  onClick={() => setShowRemittanceModal(false)}
                  className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-xl transition-colors shadow-md"
                >
                  Close
                </button>
              </div>
            </div>
          </div>,
          document.body,
        )}
    </motion.div>
  );
}

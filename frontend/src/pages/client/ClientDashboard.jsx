import { useEffect, useState } from "react";
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

export default function ClientDashboard() {
  const { client } = useClientAuth();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [financialYears, setFinancialYears] = useState([]);
  const [selectedFinancialYear, setSelectedFinancialYear] = useState(""); // "" means all years
  const [showFYDropdown, setShowFYDropdown] = useState(false);
  const [downloadingId, setDownloadingId] = useState(null);

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
        const err = await res.json();
        throw new Error(err.detail || "Download failed");
      }

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `Invoice-${invoiceNumber}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
      toast.success("Invoice downloaded successfully!");
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

  return (
    <div className="space-y-8">
      {/* Hero Section */}
      <div className="bg-gradient-to-br from-blue-600 to-indigo-700 rounded-2xl p-4 sm:p-6 md:p-8 text-white shadow-xl">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="flex-1">
            <h1 className="text-xl sm:text-2xl md:text-3xl font-bold mb-1 sm:mb-2">
              Welcome back, {stats.party_name}!
            </h1>
            <p className="text-blue-100 text-sm sm:text-base md:text-lg">
              Here's your account overview
            </p>
          </div>
          <div className="flex items-center gap-2 w-full md:w-auto">
            {/* Financial Year Dropdown */}
            <div className="relative flex-1 md:flex-none">
              <button
                onClick={() => setShowFYDropdown(!showFYDropdown)}
                className="flex items-center justify-center gap-2 px-3 sm:px-4 py-2 sm:py-2.5 bg-white/10 hover:bg-white/20 rounded-xl transition-all duration-200 backdrop-blur-sm border border-white/20 w-full md:w-auto text-sm"
              >
                <Calendar size={16} className="sm:w-[18px] sm:h-[18px]" />
                <span className="font-medium truncate">
                  {selectedFinancialYear
                    ? financialYears.find(
                        (fy) => fy.id === selectedFinancialYear,
                      )?.year_name
                    : "All Years"}
                </span>
                <ChevronDown size={14} className="sm:w-4 sm:h-4" />
              </button>

              {showFYDropdown && (
                <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-gray-200 dark:border-gray-700 py-2 z-50">
                  <button
                    onClick={() => {
                      setSelectedFinancialYear("");
                      setShowFYDropdown(false);
                    }}
                    className={`w-full text-left px-4 py-2 text-sm transition-colors ${
                      selectedFinancialYear === ""
                        ? "bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 font-medium"
                        : "text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
                    }`}
                  >
                    All Years
                  </button>
                  {financialYears.map((fy) => (
                    <button
                      key={fy.id}
                      onClick={() => {
                        setSelectedFinancialYear(fy.id);
                        setShowFYDropdown(false);
                      }}
                      className={`w-full text-left px-4 py-2 text-sm transition-colors ${
                        selectedFinancialYear === fy.id
                          ? "bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 font-medium"
                          : "text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
                      }`}
                    >
                      {fy.year_name}
                      {fy.is_active && (
                        <span className="ml-2 text-xs bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 px-2 py-0.5 rounded-full">
                          Active
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <button
              onClick={fetchStats}
              className="p-2 sm:p-3 hover:bg-white/20 rounded-xl transition-all duration-200 hover:scale-105"
              aria-label="Refresh data"
            >
              <RefreshCw className="w-4 h-4 sm:w-5 sm:h-5" />
            </button>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
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
            Total Outstanding
          </p>
          <h3 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">
            ₹{stats.total_outstanding.toLocaleString("en-IN")}
          </h3>
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
            Last Payment
          </p>
          <h3 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white mb-2">
            ₹{stats.last_payment_amount.toLocaleString("en-IN")}
          </h3>
          <p className="text-xs text-gray-400">
            {stats.last_payment_date
              ? new Date(stats.last_payment_date).toLocaleDateString("en-IN")
              : "No payments yet"}
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
            Open Invoices
          </p>
          <h3 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white mb-2">
            {stats.open_invoices_count}
          </h3>
          <Link
            to="/portal/invoices"
            className="text-xs text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 font-medium inline-flex items-center group-hover:translate-x-1 transition-transform"
          >
            View All →
          </Link>
        </div>
      </div>

      {/* Charts & Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Monthly Spending Chart */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-lg border border-gray-100 dark:border-gray-700">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white">
              Monthly Spending Trend
            </h3>
            <div className="flex items-center gap-2 text-xs text-gray-500">
              <div className="w-3 h-3 bg-gradient-to-r from-blue-500 to-indigo-600 rounded"></div>
              <span>Amount (₹)</span>
            </div>
          </div>
          <div className="w-full">
            <ResponsiveContainer width="100%" aspect={2.5} minHeight={256}>
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
              Recent Invoices
            </h3>
            <Link
              to="/portal/invoices"
              className="text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 font-medium transition-colors"
            >
              View All
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
      </div>
    </div>
  );
}

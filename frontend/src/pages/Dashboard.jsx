import { useEffect, useState, useCallback, useRef } from "react";
import { useAuth } from "../hooks/useAuth";
import { usePermissions } from "../hooks/usePermissions";
import DashboardStats from "../components/DashboardStats";
import { getActiveFinancialYear } from "../api/financialYear";
import { getDashboardStats } from "../api/reports";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  PieChart,
  Pie,
  Cell,
  Legend,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import {
  ArrowRight,
  Calendar,
  FileText,
  PieChart as PieChartIcon,
  Plus,
  Users,
  Package,
  TrendingUp,
  Sparkles,
  Zap,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { API_URL } from "../api/axios";

export default function Dashboard() {
  const { user, isCompanyAdmin } = useAuth();
  const { hasPermission } = usePermissions();
  const navigate = useNavigate();

  // Financial Year State
  const [activeFY, setActiveFY] = useState(null);

  // Stats State
  const [stats, setStats] = useState(null);
  const [statsLoading, setStatsLoading] = useState(true);

  // Resize Observer for Chart
  const [chartWidth, setChartWidth] = useState(0);
  const resizeObserver = useRef(null);

  const onChartContainerRefChange = useCallback((node) => {
    if (node !== null) {
      setChartWidth(node.getBoundingClientRect().width);

      resizeObserver.current = new ResizeObserver((entries) => {
        for (const entry of entries) {
          setChartWidth(entry.contentRect.width);
        }
      });
      resizeObserver.current.observe(node);
    } else {
      if (resizeObserver.current) resizeObserver.current.disconnect();
    }
  }, []);

  // 🔄 Load Data
  const loadData = async () => {
    try {
      setStatsLoading(true);

      // 1. Get Active FY (Just for Context in Header)
      const fy = await getActiveFinancialYear();
      setActiveFY(fy);

      // 2. Load Stats
      if (fy) {
        try {
          const dashboardData = await getDashboardStats();
          setStats(dashboardData);
        } catch (err) {
          console.error("Failed to load dashboard stats", err);
        }
      }
    } catch (error) {
      console.error("Dashboard Load Error:", error);
    } finally {
      setStatsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Quick Actions Configuration
  const quickActions = [
    {
      label: "New Invoice",
      icon: FileText,
      path: "/invoices",
      gradient: "from-blue-500 to-indigo-600",
      bgColor: "bg-blue-50 dark:bg-blue-900/20",
    },
    {
      label: "Add Party",
      icon: Users,
      path: "/parties",
      gradient: "from-emerald-500 to-teal-600",
      bgColor: "bg-emerald-50 dark:bg-emerald-900/20",
    },
    {
      label: "Manage Items",
      icon: Package,
      path: "/items",
      gradient: "from-purple-500 to-pink-600",
      bgColor: "bg-purple-50 dark:bg-purple-900/20",
    },
    {
      label: "View Reports",
      icon: TrendingUp,
      path: "/reports",
      gradient: "from-orange-500 to-red-600",
      bgColor: "bg-orange-50 dark:bg-orange-900/20",
    },
  ];

  return (
    <div className="space-y-8 animate-fade-in-up">
      {/* 👑 ENHANCED HEADER */}
      <div
        className="relative flex flex-col gap-4 md:flex-row md:items-center md:justify-between
                bg-gradient-to-br from-blue-600 via-indigo-600 to-purple-700 animate-gradient
                p-8 md:p-10
                rounded-3xl
                shadow-2xl shadow-blue-900/30
                text-white overflow-hidden"
      >
        {/* Animated Background Decorations */}
        <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none animate-float">
          <Calendar size={140} />
        </div>
        <div className="absolute bottom-0 left-0 p-8 opacity-5 pointer-events-none">
          <Sparkles size={100} />
        </div>

        {/* Gradient Orbs */}
        <div className="absolute -top-20 -right-20 w-64 h-64 bg-purple-500 rounded-full blur-3xl opacity-30 animate-pulse" />
        <div
          className="absolute -bottom-20 -left-20 w-64 h-64 bg-blue-500 rounded-full blur-3xl opacity-30 animate-pulse"
          style={{ animationDelay: "1s" }}
        />

        {/* LEFT: Title + Context */}
        <div className="relative z-10 flex items-center gap-6">
          {user?.companyLogo && (
            <div className="w-24 h-24 rounded-2xl bg-white/20 backdrop-blur-md border-2 border-white/40 p-2.5 shadow-2xl flex-shrink-0 flex items-center justify-center hover:scale-105 transition-transform duration-300">
              <img
                src={`${API_URL}${user.companyLogo}`}
                alt="Company Logo"
                className="w-full h-full object-contain rounded-xl"
              />
            </div>
          )}
          <div>
            <h1 className="text-4xl font-bold tracking-tight text-white mb-2 flex items-center gap-3">
              Welcome back, {user?.name || "Admin"}
              <span className="animate-float inline-block">👋</span>
            </h1>
            <p className="text-blue-100 text-lg font-medium opacity-90 flex items-center gap-2">
              <Zap size={18} className="text-yellow-300" />
              Here's what's happening in{" "}
              <span className="font-bold underline decoration-blue-300 underline-offset-4">
                {user?.companyName}
              </span>{" "}
              today.
            </p>
          </div>
        </div>

        {/* RIGHT: Active FY Badge */}
        {activeFY && (
          <button
            onClick={() => navigate("/settings")}
            className="group relative z-10 glass-card px-5 py-3 rounded-xl text-sm font-semibold flex items-center gap-3 shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-300 cursor-pointer border-2 border-white/30"
            title="Manage Financial Years"
          >
            <Calendar
              size={20}
              className="text-blue-200 group-hover:text-white transition-colors"
            />
            <span className="text-blue-100 group-hover:text-white transition-colors">
              FY:{" "}
              <span className="font-bold text-white">
                {new Date(activeFY.start_date).getFullYear()}-
                {new Date(activeFY.end_date).getFullYear().toString().slice(-2)}
              </span>
            </span>
          </button>
        )}
      </div>

      {/* STATS CARDS */}
      {(isCompanyAdmin || hasPermission("dashboard.view")) && (
        <div className="">
          <DashboardStats stats={stats} loading={statsLoading} />
        </div>
      )}

      {/* QUICK ACTIONS */}
      {(isCompanyAdmin || hasPermission("dashboard.view")) && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {quickActions.map((action, index) => (
            <button
              key={action.label}
              onClick={() => navigate(action.path)}
              className={`group relative overflow-hidden rounded-2xl p-6 
                ${action.bgColor}
                border-2 border-gray-200 dark:border-gray-700
                hover:border-transparent
                shadow-md hover:shadow-2xl
                transition-all duration-300 ease-out
                hover:-translate-y-2 hover:scale-105
                animate-scale-in`}
              style={{ animationDelay: `${index * 100}ms` }}
            >
              {/* Gradient Overlay on Hover */}
              <div
                className={`absolute inset-0 bg-gradient-to-br ${action.gradient} opacity-0 group-hover:opacity-100 transition-opacity duration-300`}
              />

              <div className="relative z-10 flex flex-col items-center gap-3 text-center">
                <div
                  className={`p-3 rounded-xl bg-gradient-to-br ${action.gradient} shadow-lg group-hover:scale-110 transition-transform duration-300`}
                >
                  <action.icon size={24} className="text-white" />
                </div>
                <span className="text-sm font-bold text-gray-700 dark:text-gray-300 group-hover:text-white transition-colors duration-300">
                  {action.label}
                </span>
              </div>
            </button>
          ))}
        </div>
      )}

      {/* MIDDLE ROW: Charts & Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* SALES CHART */}
        {(isCompanyAdmin || hasPermission("dashboard.view")) && (
          <div className="lg:col-span-2 bg-white dark:bg-gray-800 p-6 rounded-2xl border-2 border-gray-200 dark:border-gray-700 shadow-lg hover:shadow-xl transition-shadow duration-300 min-w-0">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h3 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                  <TrendingUp size={24} className="text-blue-600" />
                  Cash Flow Analysis
                </h3>
                <p className="text-sm text-gray-500 mt-1">
                  Income vs Expenses over time
                </p>
              </div>
            </div>

            <div className="h-[320px] w-full relative">
              {statsLoading ? (
                <div className="h-full w-full bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-900 dark:to-gray-800 rounded-xl relative overflow-hidden">
                  <div className="absolute inset-0 animate-shimmer" />
                </div>
              ) : (
                <div ref={onChartContainerRefChange} className="h-full w-full">
                  {chartWidth > 0 && (
                    <AreaChart
                      width={chartWidth}
                      height={320}
                      data={stats?.monthly_cashflow || []}
                      margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
                    >
                      <defs>
                        <linearGradient
                          id="colorIncome"
                          x1="0"
                          y1="0"
                          x2="0"
                          y2="1"
                        >
                          <stop
                            offset="5%"
                            stopColor="#10b981"
                            stopOpacity={0.4}
                          />
                          <stop
                            offset="95%"
                            stopColor="#10b981"
                            stopOpacity={0.05}
                          />
                        </linearGradient>
                        <linearGradient
                          id="colorExpense"
                          x1="0"
                          y1="0"
                          x2="0"
                          y2="1"
                        >
                          <stop
                            offset="5%"
                            stopColor="#ef4444"
                            stopOpacity={0.4}
                          />
                          <stop
                            offset="95%"
                            stopColor="#ef4444"
                            stopOpacity={0.05}
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
                        tick={{
                          fill: "#9ca3af",
                          fontSize: 12,
                          fontWeight: 500,
                        }}
                        dy={10}
                      />
                      <YAxis
                        axisLine={false}
                        tickLine={false}
                        tick={{
                          fill: "#9ca3af",
                          fontSize: 12,
                          fontWeight: 500,
                        }}
                        tickFormatter={(val) => `₹${val / 1000}k`}
                      />
                      <Tooltip
                        contentStyle={{
                          borderRadius: "12px",
                          border: "none",
                          boxShadow: "0 10px 15px -3px rgb(0 0 0 / 0.1)",
                          backgroundColor: "white",
                          padding: "12px",
                        }}
                        formatter={(val, name) => [
                          `₹${val.toLocaleString()}`,
                          name === "income" ? "Income" : "Expense",
                        ]}
                      />
                      <Legend
                        iconType="circle"
                        wrapperStyle={{ paddingTop: "20px", fontWeight: 600 }}
                      />
                      <Area
                        type="monotone"
                        dataKey="income"
                        stroke="#10b981"
                        strokeWidth={3}
                        fillOpacity={1}
                        fill="url(#colorIncome)"
                        name="income"
                      />
                      <Area
                        type="monotone"
                        dataKey="expense"
                        stroke="#ef4444"
                        strokeWidth={3}
                        fillOpacity={1}
                        fill="url(#colorExpense)"
                        name="expense"
                      />
                    </AreaChart>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* EXPENSE BREAKDOWN */}
        {(isCompanyAdmin || hasPermission("dashboard.view")) && (
          <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl border-2 border-gray-200 dark:border-gray-700 shadow-lg hover:shadow-xl transition-shadow duration-300 flex flex-col items-center justify-center relative">
            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2 self-start w-full flex items-center justify-between">
              <span className="flex items-center gap-2">
                <PieChartIcon size={24} className="text-purple-600" />
                Expense Breakdown
              </span>
            </h3>

            <div className="w-full h-[320px] flex items-center justify-center">
              {statsLoading ? (
                <div className="w-52 h-52 rounded-full bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-900 dark:to-gray-800 relative overflow-hidden">
                  <div className="absolute inset-0 animate-shimmer" />
                </div>
              ) : stats?.expense_breakdown?.length > 0 ? (
                <PieChart width={320} height={320}>
                  <Pie
                    data={stats.expense_breakdown}
                    cx="50%"
                    cy="50%"
                    innerRadius={70}
                    outerRadius={95}
                    paddingAngle={5}
                    dataKey="amount"
                    nameKey="category"
                  >
                    {stats.expense_breakdown.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={
                          [
                            "#3b82f6",
                            "#10b981",
                            "#f59e0b",
                            "#ef4444",
                            "#8b5cf6",
                          ][index % 5]
                        }
                      />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(val) => `₹${val.toLocaleString()}`}
                    contentStyle={{
                      borderRadius: "12px",
                      border: "none",
                      boxShadow: "0 10px 15px -3px rgb(0 0 0 / 0.1)",
                      padding: "12px",
                    }}
                  />
                  <Legend
                    iconType="circle"
                    wrapperStyle={{ fontWeight: 600 }}
                  />
                </PieChart>
              ) : (
                <div className="text-gray-400 text-sm flex flex-col items-center gap-2">
                  <PieChartIcon size={48} className="opacity-20" />
                  <span>No expense data</span>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* RECENT INVOICES / ACTIVITY */}
      {(isCompanyAdmin || hasPermission("dashboard.view")) && (
        <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl border-2 border-gray-200 dark:border-gray-700 shadow-lg hover:shadow-xl transition-shadow duration-300 flex flex-col">
          <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <FileText size={24} className="text-indigo-600" />
            Recent Invoices
          </h3>

          <div className="flex-1 overflow-y-auto space-y-3 pr-2 max-h-[320px] custom-scrollbar">
            {statsLoading ? (
              [1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="h-20 bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-900 dark:to-gray-800 rounded-xl relative overflow-hidden"
                >
                  <div className="absolute inset-0 animate-shimmer" />
                </div>
              ))
            ) : stats?.recent_activity?.length > 0 ? (
              stats.recent_activity.map((inv, index) => (
                <div
                  key={inv.id}
                  className="group flex items-center justify-between p-4 rounded-xl 
                    bg-gray-50 dark:bg-gray-700/30
                    hover:bg-gradient-to-r hover:from-blue-50 hover:to-indigo-50
                    dark:hover:from-blue-900/20 dark:hover:to-indigo-900/20
                    border-2 border-transparent hover:border-blue-200 dark:hover:border-blue-800
                    transition-all duration-300 cursor-pointer
                    hover:shadow-lg hover:-translate-y-1
                    animate-slide-in-left"
                  style={{ animationDelay: `${index * 50}ms` }}
                  onClick={() => navigate(`/invoices`)}
                >
                  <div className="flex items-center gap-4">
                    <div
                      className={`h-12 w-12 rounded-xl flex items-center justify-center shadow-md ${
                        inv.status === "PAID"
                          ? "bg-gradient-to-br from-green-500 to-emerald-600"
                          : "bg-gradient-to-br from-blue-500 to-indigo-600"
                      }`}
                    >
                      <FileText size={20} className="text-white" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-gray-900 dark:text-white">
                        {inv.party_name}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">
                        {inv.invoice_number}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-gray-900 dark:text-white tabular-nums">
                      ₹{inv.amount.toLocaleString()}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {new Date(inv.date).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center text-gray-500 py-12 flex flex-col items-center gap-3">
                <FileText size={48} className="opacity-20" />
                <p>No recent activity</p>
              </div>
            )}
          </div>

          <button
            onClick={() => navigate("/invoices")}
            className="mt-6 w-full py-3 flex items-center justify-center gap-2 
              text-sm font-bold text-white
              bg-gradient-to-r from-blue-600 to-indigo-600
              hover:from-blue-700 hover:to-indigo-700
              rounded-xl shadow-lg hover:shadow-xl
              transition-all duration-300
              hover:scale-[1.02]"
          >
            View All Invoices <ArrowRight size={18} />
          </button>
        </div>
      )}
    </div>
  );
}

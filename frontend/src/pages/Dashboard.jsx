import { useEffect, useState, useCallback, useRef } from "react";
import { useAuth } from "../hooks/useAuth";
import DashboardStats from "../components/DashboardStats";
import { getActiveFinancialYear } from "../api/financialYear";
import { getDashboardStats } from "../api/reports";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts";
import { ArrowRight, Calendar, FileText } from "lucide-react";
import { useNavigate } from "react-router-dom";

export default function Dashboard() {
  const { user } = useAuth();
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

  return (
    <div className="space-y-8 animate-fade-in-up">
      {/* 👑 MANAGER HEADER */}
      <div
        className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between
                bg-gradient-to-r from-blue-600 to-indigo-700
                p-6 md:p-8
                rounded-3xl
                shadow-lg shadow-blue-900/20
                text-white relative overflow-hidden"
      >
        <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none">
          <Calendar size={120} />
        </div>

        {/* LEFT: Title + Context */}
        <div className="relative z-10">
          <h1 className="text-3xl font-bold tracking-tight text-white mb-2">
            Welcome back, {user?.name || "Admin"} 👋
          </h1>
          <p className="text-blue-100 text-lg font-medium opacity-90">
            Here's what's happening in{" "}
            <span className="font-bold underline decoration-blue-300 underline-offset-4">
              {user?.companyName}
            </span>{" "}
            today.
          </p>
        </div>

        {/* RIGHT: Active FY Badge */}
        {activeFY && (
          <button
            onClick={() => navigate("/settings")}
            className="group relative z-10 bg-white/10 backdrop-blur-md border border-white/20 px-4 py-2 rounded-xl text-sm font-medium flex items-center gap-2 shadow-sm hover:bg-white/20 transition-all cursor-pointer"
            title="Manage Financial Years"
          >
            <Calendar
              size={16}
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
      <div className="">
        <DashboardStats stats={stats} loading={statsLoading} />
      </div>

      {/* MIDDLE ROW: Charts & Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* SALES CHART */}
        <div className="lg:col-span-2 bg-white dark:bg-gray-800 p-6 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm min-w-0">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                Sales Overview
              </h3>
              <p className="text-sm text-gray-500">
                Monthly revenue performance
              </p>
            </div>
          </div>

          <div className="h-[300px] w-full relative">
            {statsLoading ? (
              <div className="h-full w-full bg-gray-50 dark:bg-gray-900 animate-pulse rounded-xl"></div>
            ) : (
              <div ref={onChartContainerRefChange} className="h-full w-full">
                {chartWidth > 0 && (
                  <AreaChart
                    width={chartWidth}
                    height={300}
                    data={stats?.sales_trend || []}
                    margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
                  >
                    <defs>
                      <linearGradient
                        id="colorSales"
                        x1="0"
                        y1="0"
                        x2="0"
                        y2="1"
                      >
                        <stop
                          offset="5%"
                          stopColor="#2563eb"
                          stopOpacity={0.3}
                        />
                        <stop
                          offset="95%"
                          stopColor="#2563eb"
                          stopOpacity={0}
                        />
                      </linearGradient>
                    </defs>
                    <CartesianGrid
                      strokeDasharray="3 3"
                      vertical={false}
                      stroke="#f3f4f6"
                    />
                    <XAxis
                      dataKey="name"
                      axisLine={false}
                      tickLine={false}
                      tick={{ fill: "#9ca3af", fontSize: 12 }}
                      dy={10}
                    />
                    <YAxis
                      axisLine={false}
                      tickLine={false}
                      tick={{ fill: "#9ca3af", fontSize: 12 }}
                      tickFormatter={(val) => `₹${val / 1000}k`}
                    />
                    <Tooltip
                      contentStyle={{
                        borderRadius: "12px",
                        border: "none",
                        boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
                      }}
                      itemStyle={{ color: "#2563eb", fontWeight: 600 }}
                      formatter={(val) => [
                        `₹${val.toLocaleString()}`,
                        "Revenue",
                      ]}
                    />
                    <Area
                      type="monotone"
                      dataKey="sales"
                      stroke="#2563eb"
                      strokeWidth={3}
                      fillOpacity={1}
                      fill="url(#colorSales)"
                    />
                  </AreaChart>
                )}
              </div>
            )}
          </div>
        </div>

        {/* RECENT INVOICES / ACTIVITY */}
        <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm flex flex-col">
          <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">
            Recent Invoices
          </h3>

          <div className="flex-1 overflow-y-auto space-y-4 pr-2 max-h-[300px] custom-scrollbar">
            {statsLoading ? (
              [1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="h-16 bg-gray-50 rounded-xl animate-pulse"
                />
              ))
            ) : stats?.recent_activity?.length > 0 ? (
              stats.recent_activity.map((inv) => (
                <div
                  key={inv.id}
                  className="group flex items-center justify-between p-3 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors border border-transparent hover:border-gray-100 cursor-pointer"
                  onClick={() => navigate(`/invoices`)}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`h-10 w-10 rounded-full flex items-center justify-center ${
                        inv.status === "PAID"
                          ? "bg-green-100 text-green-600"
                          : "bg-blue-100 text-blue-600"
                      }`}
                    >
                      <FileText size={18} />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-gray-900 dark:text-white">
                        {inv.party_name}
                      </p>
                      <p className="text-xs text-gray-500">
                        {inv.invoice_number}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-gray-900 dark:text-white">
                      ₹{inv.amount.toLocaleString()}
                    </p>
                    <p className="text-xs text-gray-500">
                      {new Date(inv.date).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-center text-gray-500 py-8">
                No recent activity
              </p>
            )}
          </div>

          <button
            onClick={() => navigate("/invoices")}
            className="mt-4 w-full py-2.5 flex items-center justify-center gap-2 text-sm font-medium text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-xl transition-all"
          >
            View All Invoices <ArrowRight size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}

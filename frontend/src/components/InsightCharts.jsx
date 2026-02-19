import React from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ScatterChart,
  Scatter,
  ZAxis,
  ReferenceLine,
  Legend,
  AreaChart,
  Area,
} from "recharts";
import { TrendingUp, Package, AlertOctagon, ArrowUpRight } from "lucide-react";

const COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6"];

// ─── SALES FORECAST CHART ─────────────────────────────────────────────────────
export function SalesForecastChart({ data }) {
  if (!data || data.length === 0)
    return <EmptyChart title="No Forecast Data" />;

  return (
    <div className="bg-white dark:bg-gray-800 p-4 sm:p-6 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-md h-full flex flex-col">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4 sm:mb-6 shrink-0 gap-2">
        <div>
          <h3 className="text-base sm:text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <TrendingUp size={18} className="text-blue-600" />
            Sales Forecast
          </h3>
          <p className="text-xs sm:text-sm text-gray-500 mt-0.5 sm:mt-1">
            Actual vs Predicted (7 days)
          </p>
        </div>
        <div className="flex items-center gap-3 sm:gap-4 text-[10px] sm:text-xs font-medium self-start sm:self-auto">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-blue-500"></span>{" "}
            Actual
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-0.5 border-t-2 border-dashed border-indigo-500"></span>{" "}
            Forecast
          </div>
        </div>
      </div>

      <div className="flex-1 w-full min-h-[180px]">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart
            data={data}
            margin={{ top: 10, right: 20, left: 0, bottom: 10 }}
          >
            <defs>
              <linearGradient id="colorActual" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.05} />
              </linearGradient>
            </defs>
            <CartesianGrid
              strokeDasharray="3 3"
              vertical={false}
              stroke="#e5e7eb"
              className="dark:stroke-gray-700"
            />
            <XAxis
              dataKey="date"
              tickFormatter={(d) =>
                new Date(d).toLocaleDateString("en-IN", {
                  day: "numeric",
                  month: "short",
                })
              }
              axisLine={false}
              tickLine={false}
              tick={{ fill: "#9ca3af", fontSize: 11 }}
              dy={10}
              interval="preserveStartEnd"
              minTickGap={30}
            />
            <YAxis
              axisLine={false}
              tickLine={false}
              tick={{ fill: "#9ca3af", fontSize: 11 }}
              tickFormatter={(val) =>
                val >= 1000 ? `₹${(val / 1000).toFixed(1)}k` : `₹${val}`
              }
              width={50}
            />
            <Tooltip
              content={({ active, payload, label }) => {
                if (active && payload && payload.length) {
                  const actual = payload.find((p) => p.dataKey === "actual");
                  const forecast = payload.find(
                    (p) => p.dataKey === "forecast",
                  );
                  return (
                    <div className="bg-white dark:bg-gray-800 p-3 rounded-xl shadow-xl border border-gray-100 dark:border-gray-700 text-xs z-50">
                      <p className="font-semibold mb-2 text-gray-500">
                        {new Date(label).toLocaleDateString("en-IN", {
                          weekday: "short",
                          day: "numeric",
                          month: "long",
                        })}
                      </p>
                      {actual && actual.value !== null && (
                        <div className="flex items-center justify-between gap-4 mb-1">
                          <span className="text-blue-500 font-medium">
                            Actual:
                          </span>
                          <span className="font-bold">
                            ₹{actual.value.toLocaleString()}
                          </span>
                        </div>
                      )}
                      {forecast && forecast.value !== null && (
                        <div className="flex items-center justify-between gap-4">
                          <span className="text-indigo-500 font-medium">
                            Forecast:
                          </span>
                          <span className="font-bold">
                            ₹{forecast.value.toLocaleString()}
                          </span>
                        </div>
                      )}
                    </div>
                  );
                }
                return null;
              }}
            />
            <Area
              type="monotone"
              dataKey="actual"
              stroke="#3b82f6"
              strokeWidth={2}
              fillOpacity={1}
              fill="url(#colorActual)"
              connectNulls
              activeDot={{ r: 6, strokeWidth: 0 }}
            />
            <Line
              type="monotone"
              dataKey="forecast"
              stroke="#6366f1"
              strokeWidth={2}
              strokeDasharray="5 5"
              dot={false}
              connectNulls
              activeDot={{ r: 6, strokeWidth: 0 }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

// ─── STOCK BURN-DOWN CHART ────────────────────────────────────────────────────
export function StockDepletionChart({ data }) {
  if (!data || data.length === 0)
    return (
      <EmptyChart
        title="No Stock Risks"
        sub="No items are at immediate risk of stockout."
      />
    );

  // Flatten data for Recharts
  const timeline = [];
  const today = new Date();

  for (let i = 0; i < 15; i++) {
    const date = new Date(today);
    date.setDate(today.getDate() + i);
    const dateStr = date.toISOString().split("T")[0];

    const entry = { date: dateStr, displayDate: date };

    data.forEach((item) => {
      const point = item.data.find((d) => d.date.startsWith(dateStr));
      if (point) {
        entry[item.item_name] = point.stock;
      }
    });
    timeline.push(entry);
  }

  return (
    <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-md h-full flex flex-col">
      <div className="mb-6 shrink-0">
        <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
          <Package size={20} className="text-orange-500" />
          Stock Burn-Down
        </h3>
        <p className="text-sm text-gray-500 mt-1">
          Projected stock depletion for at-risk items
        </p>
      </div>

      <div className="flex-1 w-full min-h-[180px]">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart
            data={timeline}
            margin={{ top: 10, right: 30, left: 10, bottom: 20 }}
          >
            <CartesianGrid
              strokeDasharray="3 3"
              vertical={false}
              stroke="#e5e7eb"
              className="dark:stroke-gray-700"
            />
            <XAxis
              dataKey="displayDate"
              tickFormatter={(d) =>
                d.toLocaleDateString("en-IN", {
                  day: "numeric",
                  month: "short",
                })
              }
              axisLine={false}
              tickLine={false}
              tick={{ fill: "#9ca3af", fontSize: 11 }}
              dy={10}
              interval="preserveStartEnd"
            />
            <YAxis
              axisLine={false}
              tickLine={false}
              tick={{ fill: "#9ca3af", fontSize: 11 }}
              width={30}
            />
            <Tooltip
              contentStyle={{
                borderRadius: "12px",
                border: "none",
                boxShadow: "0 10px 15px -3px rgb(0 0 0 / 0.1)",
                fontSize: "12px",
                backgroundColor: "rgba(255, 255, 255, 0.95)",
              }}
              labelFormatter={(d) =>
                d.toLocaleDateString("en-IN", {
                  day: "numeric",
                  month: "short",
                })
              }
            />
            <Legend
              verticalAlign="top"
              height={36}
              iconType="circle"
              iconSize={8}
              wrapperStyle={{ fontSize: "11px", opacity: 0.8 }}
            />
            {data.map((item, index) => (
              <Line
                key={item.item_name}
                type="linear"
                dataKey={item.item_name}
                stroke={COLORS[index % COLORS.length]}
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 6 }}
                connectNulls
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

// ─── CUSTOMER RISK MATRIX (SCATTER) ───────────────────────────────────────────
export function CustomerRiskScatter({ anomalies }) {
  // Filter out only dormant customers
  const data = anomalies
    .filter(
      (a) =>
        a.type === "DORMANT_CUSTOMER" &&
        a.metadata &&
        a.metadata.total_spent > 0,
    )
    .map((a) => ({
      x: a.metadata.days_since, // Inactivity Days
      y: a.metadata.total_spent, // Value
      z: 1, // Bubble size
      name: a.title
        .replace("Dormant Customer: ", "")
        .replace("Risk: High Value Customer Dormant (", "")
        .replace(")", ""),
      severity: a.severity,
    }));

  if (!data || data.length === 0)
    return (
      <EmptyChart
        title="No Customer Risks"
        sub="No high-value customers are currently dormant."
      />
    );

  return (
    <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-md h-full flex flex-col">
      <div className="mb-6 shrink-0">
        <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
          <AlertOctagon size={20} className="text-rose-500" />
          Customer Value Risk Matrix
        </h3>
        <p className="text-sm text-gray-500 mt-1">
          Top Right = High Value + High Inactivity (Critical Attention)
        </p>
      </div>

      <div className="flex-1 w-full min-h-[180px]">
        <ResponsiveContainer width="100%" height="100%">
          <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 0 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis
              type="number"
              dataKey="x"
              name="Days Inactive"
              unit=" days"
              label={{
                value: "Days Inactive",
                position: "insideBottom",
                offset: -10,
                fontSize: 11,
                fill: "#9ca3af",
              }}
              tick={{ fill: "#9ca3af", fontSize: 11 }}
            />
            <YAxis
              type="number"
              dataKey="y"
              name="Total Spent"
              unit="₹"
              tickFormatter={(val) =>
                val >= 1000 ? `₹${(val / 1000).toFixed(0)}k` : `₹${val}`
              }
              tick={{ fill: "#9ca3af", fontSize: 11 }}
              width={50}
            />
            <ZAxis type="number" dataKey="z" range={[60, 400]} />
            <Tooltip
              cursor={{ strokeDasharray: "3 3" }}
              content={({ active, payload }) => {
                if (active && payload && payload.length) {
                  const d = payload[0].payload;
                  return (
                    <div className="bg-white dark:bg-gray-800 p-3 rounded-xl shadow-xl border border-gray-100 dark:border-gray-700 text-xs z-50">
                      <p className="font-bold text-gray-900 dark:text-white mb-2">
                        {d.name}
                      </p>
                      <div className="space-y-1">
                        <p className="text-gray-500">
                          Value:{" "}
                          <span className="font-semibold text-gray-800 dark:text-gray-200">
                            ₹{d.y.toLocaleString()}
                          </span>
                        </p>
                        <p className="text-gray-500">
                          Inactive:{" "}
                          <span className="font-semibold text-gray-800 dark:text-gray-200">
                            {d.x} days
                          </span>
                        </p>
                      </div>
                    </div>
                  );
                }
                return null;
              }}
            />
            <ReferenceLine x={60} stroke="#ef4444" strokeDasharray="3 3" />
            <Scatter name="Customers" data={data} fill="#8884d8">
              {data.map((entry, index) => (
                <cell
                  key={`cell-${index}`}
                  fill={entry.y > 100000 ? "#ef4444" : "#f59e0b"}
                />
              ))}
            </Scatter>
          </ScatterChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

function EmptyChart({
  title = "No Data",
  sub = "Not enough data to generate forecast",
}) {
  return (
    <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-md h-full flex flex-col items-center justify-center text-center opacity-70 min-h-[300px]">
      <div className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-full mb-3">
        <ArrowUpRight size={24} className="text-gray-400" />
      </div>
      <p className="font-bold text-gray-600 dark:text-gray-400">{title}</p>
      <p className="text-xs text-gray-400 dark:text-gray-500 mt-1 max-w-[200px]">
        {sub}
      </p>
    </div>
  );
}

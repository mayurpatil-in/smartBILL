import React from "react";
import { Package, TrendingUp, ArrowRight } from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import { useNavigate } from "react-router-dom";

const ProductPerformanceChart = ({ products, loading }) => {
  const navigate = useNavigate();

  if (loading) {
    return (
      <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl border-2 border-gray-200 dark:border-gray-700 shadow-lg">
        <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
          Top Products
        </h3>
        <div className="h-[320px] bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-900 dark:to-gray-800 rounded-xl relative overflow-hidden animate-pulse" />
      </div>
    );
  }

  if (!products || products.length === 0) {
    return (
      <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl border-2 border-gray-200 dark:border-gray-700 shadow-lg">
        <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
          <Package size={24} className="text-purple-600" />
          Top Products
        </h3>
        <div className="text-center text-gray-500 py-12 flex flex-col items-center gap-2">
          <Package size={48} className="opacity-20" />
          <span>No product data available</span>
        </div>
      </div>
    );
  }

  const colors = [
    "#3b82f6",
    "#8b5cf6",
    "#ec4899",
    "#f59e0b",
    "#10b981",
    "#06b6d4",
    "#6366f1",
    "#f97316",
    "#14b8a6",
    "#a855f7",
  ];

  return (
    <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl border-2 border-gray-200 dark:border-gray-700 shadow-lg hover:shadow-xl transition-shadow duration-300">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
          <Package size={24} className="text-purple-600" />
          Top Products
        </h3>
        <button
          onClick={() => navigate("/items")}
          className="text-sm text-purple-600 hover:text-purple-700 font-semibold flex items-center gap-1"
        >
          View All <ArrowRight size={16} />
        </button>
      </div>

      {/* Chart */}
      <div className="h-[320px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={products}
            layout="vertical"
            margin={{ top: 5, right: 30, left: 100, bottom: 5 }}
          >
            <XAxis
              type="number"
              tickFormatter={(value) => `₹${(value / 1000).toFixed(0)}k`}
            />
            <YAxis
              dataKey="item_name"
              type="category"
              width={90}
              tick={{ fontSize: 12 }}
            />
            <Tooltip
              formatter={(value, name) => {
                if (name === "total_revenue")
                  return [`₹${value.toLocaleString()}`, "Revenue"];
                return [value, name];
              }}
              contentStyle={{
                borderRadius: "12px",
                border: "none",
                boxShadow: "0 10px 15px -3px rgb(0 0 0 / 0.1)",
                backgroundColor: "white",
                padding: "12px",
              }}
            />
            <Bar dataKey="total_revenue" radius={[0, 8, 8, 0]}>
              {products.map((entry, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={colors[index % colors.length]}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Product List */}
      <div className="mt-4 space-y-2 max-h-[200px] overflow-y-auto custom-scrollbar">
        {products.map((product, index) => (
          <div
            key={product.item_id}
            className="flex items-center justify-between p-3 rounded-lg bg-gray-50 dark:bg-gray-700/30 hover:bg-gray-100 dark:hover:bg-gray-700/50 transition-colors cursor-pointer"
            onClick={() => navigate("/items")}
          >
            <div className="flex items-center gap-3">
              <div
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: colors[index % colors.length] }}
              />
              <div>
                <p className="text-sm font-semibold text-gray-900 dark:text-white">
                  {product.item_name}
                </p>
                <p className="text-xs text-gray-500">
                  {product.total_quantity_sold.toLocaleString()} units • Avg: ₹
                  {product.avg_selling_price.toLocaleString()}
                </p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-sm font-bold text-gray-900 dark:text-white">
                ₹{product.total_revenue.toLocaleString()}
              </p>
              <p className="text-xs text-gray-500">
                {product.revenue_percentage.toFixed(1)}%
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ProductPerformanceChart;

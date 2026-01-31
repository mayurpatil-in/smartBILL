import React from "react";
import { Users, TrendingUp, Calendar, ArrowRight } from "lucide-react";
import { useNavigate } from "react-router-dom";

const TopCustomersWidget = ({ customers, loading }) => {
  const navigate = useNavigate();

  if (loading) {
    return (
      <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl border-2 border-gray-200 dark:border-gray-700 shadow-lg">
        <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
          <Users size={24} className="text-blue-600" />
          Top Customers
        </h3>
        <div className="space-y-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <div
              key={i}
              className="h-16 bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-900 dark:to-gray-800 rounded-xl relative overflow-hidden animate-pulse"
            />
          ))}
        </div>
      </div>
    );
  }

  if (!customers || customers.length === 0) {
    return (
      <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl border-2 border-gray-200 dark:border-gray-700 shadow-lg">
        <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
          <Users size={24} className="text-blue-600" />
          Top Customers
        </h3>
        <div className="text-center text-gray-500 py-12 flex flex-col items-center gap-2">
          <Users size={48} className="opacity-20" />
          <span>No customer data available</span>
        </div>
      </div>
    );
  }

  const getMedalEmoji = (index) => {
    if (index === 0) return "🥇";
    if (index === 1) return "🥈";
    if (index === 2) return "🥉";
    return `${index + 1}.`;
  };

  return (
    <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl border-2 border-gray-200 dark:border-gray-700 shadow-lg hover:shadow-xl transition-shadow duration-300">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
          <Users size={24} className="text-blue-600" />
          Top Customers
        </h3>
        <button
          onClick={() => navigate("/parties")}
          className="text-sm text-blue-600 hover:text-blue-700 font-semibold flex items-center gap-1"
        >
          View All <ArrowRight size={16} />
        </button>
      </div>

      <div className="space-y-3 max-h-[400px] overflow-y-auto custom-scrollbar pr-2">
        {customers.map((customer, index) => (
          <div
            key={customer.party_id}
            className="group relative overflow-hidden rounded-xl p-4 
              bg-gradient-to-r from-gray-50 to-white
              dark:from-gray-700/30 dark:to-gray-800/30
              hover:from-blue-50 hover:to-indigo-50
              dark:hover:from-blue-900/20 dark:hover:to-indigo-900/20
              border-2 border-transparent hover:border-blue-200 dark:hover:border-blue-800
              transition-all duration-300 cursor-pointer
              hover:shadow-lg hover:-translate-y-1
              animate-slide-in-left"
            style={{ animationDelay: `${index * 50}ms` }}
            onClick={() => navigate(`/parties`)}
          >
            {/* Rank Badge */}
            <div className="absolute top-2 right-2 flex items-center gap-2">
              <span className="text-xs font-semibold text-gray-500 dark:text-gray-400">
                {customer.revenue_percentage.toFixed(1)}%
              </span>
            </div>

            <div className="flex items-start gap-4">
              {/* Medal/Rank */}
              <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-bold text-lg shadow-lg">
                {index < 3 ? (
                  <span className="text-2xl">{getMedalEmoji(index)}</span>
                ) : (
                  <span>{index + 1}</span>
                )}
              </div>

              {/* Customer Info */}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-gray-900 dark:text-white truncate">
                  {customer.party_name}
                </p>
                <div className="flex items-center gap-3 mt-1 text-xs text-gray-500 dark:text-gray-400">
                  <span className="flex items-center gap-1">
                    <TrendingUp size={12} />
                    {customer.invoice_count} invoices
                  </span>
                  {customer.last_invoice_date && (
                    <span className="flex items-center gap-1">
                      <Calendar size={12} />
                      {new Date(
                        customer.last_invoice_date,
                      ).toLocaleDateString()}
                    </span>
                  )}
                </div>

                {/* Revenue Bar */}
                <div className="mt-2">
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="font-bold text-gray-900 dark:text-white">
                      ₹{customer.total_revenue.toLocaleString()}
                    </span>
                    <span className="text-gray-500">
                      Avg: ₹{customer.avg_invoice_value.toLocaleString()}
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-blue-500 to-indigo-600 rounded-full transition-all duration-500"
                      style={{
                        width: `${Math.min(customer.revenue_percentage, 100)}%`,
                      }}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Summary Footer */}
      {customers.length > 0 && (
        <div className="mt-4 pt-4 border-t-2 border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-600 dark:text-gray-400">
              Top {customers.length} customers contribute
            </span>
            <span className="font-bold text-blue-600">
              {customers
                .reduce((sum, c) => sum + c.revenue_percentage, 0)
                .toFixed(1)}
              %
            </span>
          </div>
        </div>
      )}
    </div>
  );
};

export default TopCustomersWidget;

import React from "react";
import { Activity, X, CheckCircle, ArrowRight } from "lucide-react";

const ReceivablesModal = ({
  isOpen,
  onClose,
  data,
  loading,
  onViewStatement,
  totalReceivable,
}) => {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-in fade-in duration-200"
      style={{ backgroundColor: "rgba(0,0,0,0.6)" }}
    >
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[85vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-t-2xl">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/20 rounded-xl">
              <Activity size={20} />
            </div>
            <div>
              <h2 className="font-bold text-lg leading-tight">
                Outstanding Receivables
              </h2>
              <p className="text-white/70 text-xs">
                Total:{" "}
                {totalReceivable >= 100000
                  ? `₹${(totalReceivable / 100000).toFixed(2)}L`
                  : `₹${Number(totalReceivable || 0).toLocaleString("en-IN")}`}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/20 rounded-xl transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-auto p-0">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 gap-3">
              <div className="w-10 h-10 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin" />
              <p className="text-gray-500 font-medium">
                Loading receivables...
              </p>
            </div>
          ) : data.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 gap-3">
              <CheckCircle size={48} className="text-green-500 mb-2" />
              <p className="text-gray-600 dark:text-gray-300 font-medium">
                All clear!
              </p>
              <p className="text-sm text-gray-500">
                No outstanding payments found.
              </p>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-gray-50 dark:bg-gray-800 text-gray-600 dark:text-gray-300 uppercase text-xs font-bold sticky top-0">
                <tr>
                  <th className="px-6 py-3 text-left">Party Name</th>
                  <th className="px-6 py-3 text-right">Pending Amount</th>
                  <th className="px-6 py-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700/50">
                {data.map((item, i) => (
                  <tr
                    key={i}
                    className="hover:bg-blue-50/40 dark:hover:bg-blue-900/10 transition-colors"
                  >
                    <td className="px-6 py-4 font-medium text-gray-900 dark:text-white">
                      {item.party_name}
                    </td>
                    <td className="px-6 py-4 text-right font-bold text-gray-800 dark:text-gray-200">
                      ₹
                      {Number(item.amount).toLocaleString("en-IN", {
                        minimumFractionDigits: 2,
                      })}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={() => {
                          onViewStatement(item.party_id, item.party_name);
                        }}
                        className="text-xs font-semibold text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 flex items-center justify-end gap-1 ml-auto"
                      >
                        View Statement <ArrowRight size={14} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
};

export default ReceivablesModal;

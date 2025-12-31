import { useState, useEffect } from "react";
import { X, Plus, Trash2, Calendar, DollarSign } from "lucide-react";
import { format } from "date-fns";
import toast from "react-hot-toast";
import { createSalaryAdvance, getSalaryAdvances } from "../api/employees";

export default function SalaryAdvanceModal({ isOpen, onClose, employee }) {
  const [advances, setAdvances] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);

  // Form State
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen && employee) {
      loadAdvances();
    }
  }, [isOpen, employee]);

  const loadAdvances = async () => {
    setLoading(true);
    try {
      const data = await getSalaryAdvances(employee.id);
      setAdvances(data);
    } catch (err) {
      toast.error("Failed to load advances");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!amount || !date) return;

    setSubmitting(true);
    try {
      await createSalaryAdvance({
        user_id: employee.id,
        amount: parseFloat(amount),
        date: date,
        reason: reason,
        is_deducted: false,
      });
      toast.success("Advance recorded successfully");
      setShowAddForm(false);
      setAmount("");
      setReason("");
      loadAdvances(); // Reload list
    } catch (err) {
      toast.error("Failed to record advance");
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
      <div className="bg-white dark:bg-gray-800 rounded-2xl w-full max-w-2xl shadow-xl border border-gray-100 dark:border-gray-700 flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-100 dark:border-gray-700">
          <div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">
              Salary Advances
            </h2>
            <p className="text-sm text-gray-500">
              Manage advances for {employee?.name}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Add Form Toggle */}
          {!showAddForm ? (
            <button
              onClick={() => setShowAddForm(true)}
              className="w-full py-3 border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-xl text-gray-500 hover:border-blue-500 hover:text-blue-500 transition-colors flex items-center justify-center gap-2 font-medium"
            >
              <Plus size={20} /> Record New Advance
            </button>
          ) : (
            <form
              onSubmit={handleSubmit}
              className="bg-gray-50 dark:bg-gray-900/50 p-4 rounded-xl space-y-4 animate-fade-in"
            >
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Amount (₹)
                  </label>
                  <div className="relative">
                    <DollarSign
                      size={16}
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                    />
                    <input
                      type="number"
                      required
                      min="1"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      className="w-full pl-9 pr-4 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500/20 outline-none"
                      placeholder="0.00"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Date
                  </label>
                  <div className="relative">
                    <Calendar
                      size={16}
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                    />
                    <input
                      type="date"
                      required
                      value={date}
                      onChange={(e) => setDate(e.target.value)}
                      className="w-full pl-9 pr-4 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500/20 outline-none"
                    />
                  </div>
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Reason (Optional)
                </label>
                <input
                  type="text"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  className="w-full px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500/20 outline-none"
                  placeholder="e.g. Personal emergency"
                />
              </div>
              <div className="flex gap-2 justify-end">
                <button
                  type="button"
                  onClick={() => setShowAddForm(false)}
                  className="px-4 py-2 text-sm text-gray-500 hover:text-gray-700 font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
                >
                  {submitting ? "Saving..." : "Save Advance"}
                </button>
              </div>
            </form>
          )}

          {/* List of Advances */}
          <div>
            <h3 className="font-semibold text-gray-900 dark:text-white mb-3">
              History
            </h3>
            {loading ? (
              <div className="text-center py-8 text-gray-500">Loading...</div>
            ) : advances.length === 0 ? (
              <div className="text-center py-8 text-gray-500 bg-gray-50 dark:bg-gray-800/50 rounded-xl border border-dashed border-gray-200 dark:border-gray-700">
                No advances found
              </div>
            ) : (
              <div className="space-y-3">
                {advances.map((adv) => (
                  <div
                    key={adv.id}
                    className="flex items-center justify-between p-4 bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-xl shadow-sm"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-gray-900 dark:text-white">
                          ₹{adv.amount}
                        </span>
                        <span
                          className={`text-xs px-2 py-0.5 rounded-full ${
                            adv.is_deducted
                              ? "bg-green-100 text-green-700"
                              : "bg-yellow-100 text-yellow-700"
                          }`}
                        >
                          {adv.is_deducted ? "Deducted" : "Pending"}
                        </span>
                      </div>
                      <p className="text-sm text-gray-500 mt-1">
                        {format(new Date(adv.date), "MMM d, yyyy")} •{" "}
                        {adv.reason || "No reason provided"}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

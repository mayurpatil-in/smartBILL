import { useState, useEffect } from "react";
import { X, Plus, Trash2, Calendar, IndianRupee, AlertCircle, CheckCircle2 } from "lucide-react";
import toast from "react-hot-toast";
import { createSalaryAdvance, getSalaryAdvances, deleteSalaryAdvance } from "../api/employees";
import { formatDateDDMMYYYY } from "../utils/dateUtils";

export default function SalaryAdvanceModal({ isOpen, onClose, employee }) {
  const [advances, setAdvances] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);

  // Form State
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState(null);

  useEffect(() => {
    if (isOpen && employee) {
      loadAdvances();
    }
  }, [isOpen, employee]);

  const loadAdvances = async () => {
    setLoading(true);
    try {
      const data = await getSalaryAdvances(employee.id);
      setAdvances(data || []);
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
      toast.success("Salary advance recorded successfully");
      setShowAddForm(false);
      setAmount("");
      setReason("");
      loadAdvances();
    } catch (err) {
      toast.error("Failed to record advance");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteAdvance = async (advId) => {
    if (!window.confirm("Are you sure you want to delete this salary advance record?")) return;
    try {
      setDeletingId(advId);
      await deleteSalaryAdvance(advId);
      toast.success("Advance deleted successfully");
      setAdvances(advances.filter((a) => a.id !== advId));
    } catch (err) {
      toast.error("Failed to delete advance");
    } finally {
      setDeletingId(null);
    }
  };

  if (!isOpen) return null;

  // Summaries
  const totalPending = advances
    .filter((a) => !a.is_deducted)
    .reduce((sum, a) => sum + parseFloat(a.amount || 0), 0);

  const totalDeducted = advances
    .filter((a) => a.is_deducted)
    .reduce((sum, a) => sum + parseFloat(a.amount || 0), 0);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
      <div className="bg-white dark:bg-gray-800 rounded-3xl w-full max-w-2xl shadow-2xl border border-gray-100 dark:border-gray-700 flex flex-col max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="relative bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 p-6 text-white shrink-0">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-all"
          >
            <X size={20} />
          </button>
          <div className="flex items-center gap-3">
            <div className="p-3 bg-white/20 backdrop-blur-md rounded-2xl">
              <IndianRupee size={26} className="text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">
                Salary Advances
              </h2>
              <p className="text-blue-100 text-xs mt-0.5">
                Manage advances for <span className="font-semibold">{employee?.name}</span>
              </p>
            </div>
          </div>
        </div>

        {/* Summary Metric Header Banner */}
        <div className="grid grid-cols-2 gap-4 p-4 bg-gray-50 dark:bg-gray-900/60 border-b border-gray-100 dark:border-gray-700 shrink-0">
          <div className="bg-amber-500/10 dark:bg-amber-900/20 p-3.5 rounded-2xl border border-amber-200 dark:border-amber-800/40 flex items-center justify-between">
            <div>
              <span className="block text-[10px] font-bold text-amber-700 dark:text-amber-400 uppercase">
                Pending Advance
              </span>
              <span className="text-xl font-extrabold text-amber-700 dark:text-amber-300 tabular-nums">
                ₹{totalPending.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
              </span>
            </div>
            <AlertCircle size={24} className="text-amber-500 opacity-80" />
          </div>

          <div className="bg-green-500/10 dark:bg-green-900/20 p-3.5 rounded-2xl border border-green-200 dark:border-green-800/40 flex items-center justify-between">
            <div>
              <span className="block text-[10px] font-bold text-green-700 dark:text-green-400 uppercase">
                Settled / Deducted
              </span>
              <span className="text-xl font-extrabold text-green-700 dark:text-green-300 tabular-nums">
                ₹{totalDeducted.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
              </span>
            </div>
            <CheckCircle2 size={24} className="text-green-500 opacity-80" />
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Add Form Toggle */}
          {!showAddForm ? (
            <button
              onClick={() => setShowAddForm(true)}
              className="w-full py-3.5 border-2 border-dashed border-gray-200 dark:border-gray-700 hover:border-blue-500 dark:hover:border-blue-500 rounded-2xl text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-all flex items-center justify-center gap-2 font-bold text-sm bg-gray-50/50 dark:bg-gray-800/50"
            >
              <Plus size={18} /> Record New Advance
            </button>
          ) : (
            <form
              onSubmit={handleSubmit}
              className="bg-gradient-to-br from-gray-50 to-blue-50/30 dark:from-gray-900/60 dark:to-blue-900/20 p-5 rounded-2xl border border-blue-100 dark:border-blue-900/30 space-y-4 animate-fade-in"
            >
              <h4 className="text-xs font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400">
                Record New Salary Advance
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-600 dark:text-gray-300 mb-1 uppercase">
                    Amount (₹)
                  </label>
                  <div className="relative">
                    <IndianRupee
                      size={16}
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                    />
                    <input
                      type="number"
                      required
                      min="1"
                      step="0.01"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500/20 outline-none text-sm font-semibold"
                      placeholder="0.00"
                      name="advance_amount"
                      id="advance_amount"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-600 dark:text-gray-300 mb-1 uppercase">
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
                      className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500/20 outline-none text-sm font-semibold"
                      name="advance_date"
                      id="advance_date"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-600 dark:text-gray-300 mb-1 uppercase">
                  Reason / Remarks (Optional)
                </label>
                <input
                  type="text"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500/20 outline-none text-sm font-medium"
                  placeholder="e.g. Personal emergency, Festival advance"
                  name="advance_reason"
                  id="advance_reason"
                />
              </div>

              <div className="flex gap-2 justify-end pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddForm(false)}
                  className="px-4 py-2 text-sm text-gray-500 hover:text-gray-700 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-bold transition-all shadow-md disabled:opacity-50"
                >
                  {submitting ? "Saving..." : "Save Advance"}
                </button>
              </div>
            </form>
          )}

          {/* History List */}
          <div>
            <h3 className="font-bold text-xs uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-3">
              Advance History
            </h3>
            {loading ? (
              <div className="text-center py-8 text-sm text-gray-500">Loading...</div>
            ) : advances.length === 0 ? (
              <div className="text-center py-10 text-gray-500 bg-gray-50 dark:bg-gray-800/40 rounded-2xl border border-dashed border-gray-200 dark:border-gray-700">
                <IndianRupee size={36} className="mx-auto text-gray-300 mb-2" />
                <p className="text-sm font-bold text-gray-700 dark:text-gray-300">
                  No Advances Found
                </p>
                <p className="text-xs text-gray-400">
                  Click "Record New Advance" to add an advance for this employee.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {advances.map((adv) => (
                  <div
                    key={adv.id}
                    className="flex items-center justify-between p-4 bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700/80 rounded-2xl shadow-sm hover:shadow-md transition-all"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-extrabold text-gray-900 dark:text-white text-base tabular-nums">
                          ₹{parseFloat(adv.amount).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                        </span>
                        <span
                          className={`text-[10px] px-2.5 py-0.5 rounded-full font-extrabold uppercase ${
                            adv.is_deducted
                              ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 border border-green-200 dark:border-green-800"
                              : "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 border border-amber-200 dark:border-amber-800"
                          }`}
                        >
                          {adv.is_deducted ? "Deducted" : "Pending"}
                        </span>
                      </div>
                      <p className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1.5">
                        <Calendar size={13} className="text-gray-400" />
                        <span>{formatDateDDMMYYYY(adv.date)}</span>
                        <span>•</span>
                        <span className="italic font-medium text-gray-600 dark:text-gray-300 truncate">
                          {adv.reason || "No reason provided"}
                        </span>
                      </p>
                    </div>

                    <button
                      onClick={() => handleDeleteAdvance(adv.id)}
                      disabled={deletingId === adv.id}
                      className="p-2 text-gray-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl transition-all ml-3 shrink-0"
                      title="Delete Advance"
                    >
                      <Trash2 size={16} />
                    </button>
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

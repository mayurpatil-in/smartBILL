import { useEffect, useState } from "react";
import { useAuth } from "../hooks/useAuth";
import {
  X,
  Plus,
  Check,
  Trash2,
  Calendar,
  Building2,
  TrendingUp,
} from "lucide-react";
import toast from "react-hot-toast";

export default function AddFinancialYear({
  open,
  onClose,
  onSave,
  companyName,
  activeFY,
  allFY = [],
  onSelectFY,
  onDeleteFY,
}) {
  const { user } = useAuth();
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) {
      setStartDate("");
      setEndDate("");
      setLoading(false);
    }
  }, [open]);

  if (!open) return null;

  /* ================= VALIDATION ================= */
  const handleSave = async () => {
    if (!startDate || !endDate) {
      toast.error("Start date and end date are required");
      return;
    }

    if (new Date(endDate) <= new Date(startDate)) {
      toast.error("End date must be after start date");
      return;
    }

    const duplicate = allFY.some(
      (fy) => fy.start_date === startDate && fy.end_date === endDate
    );

    if (duplicate) {
      toast.error("This financial year already exists");
      return;
    }

    try {
      setLoading(true);
      await onSave(startDate, endDate);
      toast.success("Financial year added successfully");
    } catch {
      toast.error("Failed to add financial year");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="w-full max-w-2xl max-h-[90vh] flex flex-col rounded-3xl overflow-hidden shadow-2xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700">
        {/* ================= HEADER ================= */}
        <div className="relative overflow-hidden px-8 py-6 bg-gradient-to-br from-blue-50 via-cyan-50 to-teal-50 dark:from-blue-950/30 dark:via-cyan-950/20 dark:to-teal-950/20 border-b border-gray-200 dark:border-gray-700">
          {/* Decorative Background */}
          <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-blue-400/10 to-cyan-400/10 dark:from-blue-500/5 dark:to-cyan-500/5 rounded-full blur-3xl -mr-32 -mt-32"></div>

          <div className="relative flex justify-between items-start">
            <div className="flex items-center gap-4">
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-br from-blue-500 to-cyan-600 rounded-xl blur-md opacity-50"></div>
                <div className="relative p-3 bg-gradient-to-br from-blue-500 to-cyan-600 rounded-xl shadow-lg">
                  <TrendingUp size={24} className="text-white" />
                </div>
              </div>
              <div>
                <h2 className="text-2xl font-black bg-gradient-to-r from-gray-900 to-gray-700 dark:from-white dark:to-gray-300 bg-clip-text text-transparent">
                  Financial Years
                </h2>
                <div className="flex items-center gap-2 mt-1">
                  <Building2
                    size={14}
                    className="text-gray-500 dark:text-gray-400"
                  />
                  <p className="text-sm text-gray-600 dark:text-gray-400 font-medium">
                    {user?.companyName || companyName || "—"}
                  </p>
                </div>
              </div>
            </div>

            <button
              onClick={onClose}
              className="p-2 rounded-xl hover:bg-white/50 dark:hover:bg-gray-800/50 transition-all duration-200 group"
            >
              <X className="w-5 h-5 text-gray-600 dark:text-gray-300 group-hover:text-gray-900 dark:group-hover:text-white transition-colors" />
            </button>
          </div>
        </div>

        {/* ================= SCROLLABLE CONTENT ================= */}
        <div className="flex-1 overflow-y-auto">
          {/* ================= ACTIVE FY ================= */}
          <div className="px-8 py-6">
            <div className="relative overflow-hidden p-5 bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-950/20 dark:to-emerald-950/20 rounded-2xl border-2 border-green-200 dark:border-green-800 shadow-md">
              <div className="absolute top-0 right-0 w-24 h-24 bg-green-400/10 dark:bg-green-500/5 rounded-full blur-2xl -mr-12 -mt-12"></div>

              <div className="relative flex items-start gap-4">
                <div className="p-3 bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl shadow-lg shadow-green-500/30">
                  <Calendar size={20} className="text-white" />
                </div>
                <div className="flex-1">
                  <span className="text-xs font-black text-green-600 dark:text-green-400 uppercase tracking-widest block mb-2">
                    Active Financial Year
                  </span>
                  {activeFY ? (
                    <div className="text-lg font-bold text-gray-900 dark:text-white">
                      {activeFY.start_date} → {activeFY.end_date}
                    </div>
                  ) : (
                    <p className="text-sm text-red-500 font-semibold">
                      No active financial year
                    </p>
                  )}
                </div>
                {activeFY && (
                  <span className="px-3 py-1.5 rounded-xl text-xs font-black bg-gradient-to-r from-green-500 to-emerald-600 text-white shadow-lg">
                    ACTIVE
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* ================= ADD FY ================= */}
          <div className="px-8 py-6 bg-gray-50/50 dark:bg-gray-800/30">
            <div className="flex items-center gap-2 mb-4">
              <Plus size={18} className="text-blue-600 dark:text-blue-400" />
              <h3 className="text-sm font-black text-gray-800 dark:text-gray-200 uppercase tracking-wider">
                Add New Financial Year
              </h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-gray-600 dark:text-gray-400 mb-2 uppercase tracking-wider">
                  Start Date
                </label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full rounded-xl px-4 py-3 text-sm font-medium
                  bg-white dark:bg-gray-800
                  border-2 border-gray-200 dark:border-gray-700
                  text-gray-900 dark:text-white
                  focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none
                  transition-all duration-200"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-600 dark:text-gray-400 mb-2 uppercase tracking-wider">
                  End Date
                </label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full rounded-xl px-4 py-3 text-sm font-medium
                  bg-white dark:bg-gray-800
                  border-2 border-gray-200 dark:border-gray-700
                  text-gray-900 dark:text-white
                  focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none
                  transition-all duration-200"
                />
              </div>
            </div>

            <button
              onClick={handleSave}
              disabled={loading}
              className="mt-4 w-full inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl text-sm font-bold
              bg-gradient-to-r from-blue-500 to-cyan-600 text-white
              hover:from-blue-600 hover:to-cyan-700
              shadow-lg shadow-blue-500/30 hover:shadow-xl hover:shadow-blue-500/40
              disabled:opacity-50 disabled:cursor-not-allowed
              transition-all duration-300"
            >
              <Plus size={18} />
              {loading ? "Adding..." : "Add Financial Year"}
            </button>
          </div>

          {/* ================= FY LIST ================= */}
          <div className="px-8 py-6">
            <h3 className="text-sm font-black text-gray-800 dark:text-gray-200 mb-4 uppercase tracking-wider">
              All Financial Years
            </h3>

            {allFY.length === 0 ? (
              <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-8">
                No financial years found
              </p>
            ) : (
              <div className="space-y-3 max-h-64 overflow-y-auto pr-2">
                {allFY.map((fy) => {
                  const isActive = activeFY?.id === fy.id;

                  return (
                    <div
                      key={fy.id}
                      className={`group relative overflow-hidden p-4 rounded-xl border-2 transition-all duration-200 ${
                        isActive
                          ? "bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-950/20 dark:to-emerald-950/20 border-green-300 dark:border-green-700 shadow-md"
                          : fy.is_locked
                          ? "bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-800/50 border-gray-300 dark:border-gray-600"
                          : "bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-600 hover:shadow-md"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <Calendar
                            size={16}
                            className={
                              isActive
                                ? "text-green-600 dark:text-green-400"
                                : "text-gray-500 dark:text-gray-400"
                            }
                          />
                          <span className="text-sm font-bold text-gray-800 dark:text-gray-200">
                            {fy.start_date} → {fy.end_date}
                          </span>
                        </div>

                        <div className="flex items-center gap-2">
                          {!isActive && !fy.is_locked && (
                            <button
                              onClick={() => onSelectFY(fy)}
                              className="p-2 rounded-lg bg-green-100 dark:bg-green-900/30 hover:bg-green-200 dark:hover:bg-green-800
                              text-green-600 dark:text-green-400 transition-all duration-200 hover:scale-110"
                              title="Set as Active"
                            >
                              <Check size={16} />
                            </button>
                          )}

                          {!fy.is_locked && (
                            <button
                              onClick={() => onDeleteFY(fy)}
                              className="p-2 rounded-lg bg-red-100 dark:bg-red-900/30 hover:bg-red-200 dark:hover:bg-red-800
                              text-red-600 dark:text-red-400 transition-all duration-200 hover:scale-110"
                              title="Delete"
                            >
                              <Trash2 size={16} />
                            </button>
                          )}

                          {isActive && (
                            <span className="px-3 py-1.5 rounded-lg text-xs font-black bg-gradient-to-r from-green-500 to-emerald-600 text-white shadow-md">
                              ACTIVE
                            </span>
                          )}

                          {fy.is_locked && (
                            <span className="px-3 py-1.5 rounded-lg text-xs font-black bg-gradient-to-r from-gray-400 to-gray-500 text-white shadow-md">
                              LOCKED
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Close scrollable content */}
        </div>

        {/* ================= FOOTER ================= */}
        <div className="px-8 py-5 flex justify-end bg-gray-50 dark:bg-gray-800/50 border-t border-gray-200 dark:border-gray-700">
          <button
            onClick={onClose}
            className="px-6 py-2.5 rounded-xl text-sm font-bold
              border-2 border-gray-300 dark:border-gray-600
              text-gray-700 dark:text-gray-300
              hover:bg-gray-100 dark:hover:bg-gray-700
              transition-all duration-200"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

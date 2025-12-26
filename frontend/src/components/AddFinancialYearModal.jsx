import { useEffect, useState } from "react";
import { X, Plus, Check, Trash2 } from "lucide-react";
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
      (fy) =>
        fy.start_date === startDate &&
        fy.end_date === endDate
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-xl rounded-2xl overflow-hidden shadow-2xl
        bg-white dark:bg-gray-900
        border border-gray-200 dark:border-gray-800">

        {/* ================= HEADER ================= */}
        <div className="flex justify-between items-center px-6 py-4
          bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
          <div>
            <p className="text-xs text-gray-500 dark:text-gray-400">Company</p>
            <p className="font-semibold text-gray-900 dark:text-white">
              {companyName || "—"}
            </p>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition"
          >
            <X className="w-5 h-5 text-gray-600 dark:text-gray-300" />
          </button>
        </div>

        {/* ================= ACTIVE FY ================= */}
        <div className="px-6 py-4">
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">
            Active Financial Year
          </p>

          {activeFY ? (
            <p className="font-medium text-gray-900 dark:text-white">
              {activeFY.start_date} → {activeFY.end_date}
            </p>
          ) : (
            <p className="text-sm text-red-500">
              No active financial year
            </p>
          )}
        </div>

        <div className="border-t border-gray-200 dark:border-gray-800" />

        {/* ================= ADD FY ================= */}
        <div className="px-6 py-5">
          <p className="text-sm font-semibold text-gray-800 dark:text-gray-200 mb-3">
            Add New Financial Year
          </p>

          <div className="grid grid-cols-2 gap-4">
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full rounded-lg px-3 py-2 text-sm
                bg-white dark:bg-gray-800
                border border-gray-300 dark:border-gray-700
                text-gray-900 dark:text-white
                focus:ring-2 focus:ring-blue-500 outline-none"
            />

            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full rounded-lg px-3 py-2 text-sm
                bg-white dark:bg-gray-800
                border border-gray-300 dark:border-gray-700
                text-gray-900 dark:text-white
                focus:ring-2 focus:ring-blue-500 outline-none"
            />
          </div>

          <button
            onClick={handleSave}
            disabled={loading}
            className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm
              bg-blue-600 hover:bg-blue-700 text-white
              disabled:opacity-50 disabled:cursor-not-allowed transition"
          >
            <Plus size={16} />
            {loading ? "Saving..." : "Add Financial Year"}
          </button>
        </div>

        <div className="border-t border-gray-200 dark:border-gray-800" />

        {/* ================= FY LIST ================= */}
        <div className="px-6 py-4 max-h-60 overflow-y-auto">
          <p className="text-sm font-semibold text-gray-800 dark:text-gray-200 mb-3">
            All Financial Years
          </p>

          {allFY.length === 0 ? (
            <p className="text-sm text-gray-500 dark:text-gray-400">
              No financial years found
            </p>
          ) : (
            <div className="space-y-2">
              {allFY.map((fy) => {
                const isActive = activeFY?.id === fy.id;

                return (
                  <div
                    key={fy.id}
                    className="flex items-center justify-between rounded-lg px-3 py-2
                      bg-gray-50 dark:bg-gray-800
                      border border-gray-200 dark:border-gray-700"
                  >
                    <span className="text-sm text-gray-800 dark:text-gray-200">
                      {fy.start_date} → {fy.end_date}
                    </span>

                    <div className="flex items-center gap-2">
                      {!isActive && !fy.is_locked && (
                        <button
                          onClick={() => onSelectFY(fy)}
                          className="p-1 rounded hover:bg-green-200 dark:hover:bg-green-800
                            text-green-600 dark:text-green-400"
                        >
                          <Check size={16} />
                        </button>
                      )}

                      {!fy.is_locked && (
                        <button
                          onClick={() => onDeleteFY(fy)}
                          className="p-1 rounded hover:bg-red-200 dark:hover:bg-red-800
                            text-red-600 dark:text-red-400"
                        >
                          <Trash2 size={16} />
                        </button>
                      )}

                      {isActive && (
                        <span className="text-xs px-2 py-1 rounded bg-green-200 dark:bg-green-800
                          text-green-800 dark:text-green-200">
                          Active
                        </span>
                      )}

                      {fy.is_locked && (
                        <span className="text-xs px-2 py-1 rounded bg-gray-300 dark:bg-gray-700
                          text-gray-700 dark:text-gray-300">
                          Locked
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* ================= FOOTER ================= */}
        <div className="px-6 py-4 flex justify-end bg-gray-50 dark:bg-gray-800">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg text-sm
              border border-gray-300 dark:border-gray-600
              text-gray-700 dark:text-gray-300
              hover:bg-gray-200 dark:hover:bg-gray-700 transition"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

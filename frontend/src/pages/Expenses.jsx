import { useEffect, useState, useRef } from "react";
import {
  Plus,
  Search,
  Wallet,
  Calendar,
  MoreVertical,
  Printer,
  Edit,
  Trash2,
  Repeat,
  CheckCircle,
  FileText,
  X,
  ChevronDown,
} from "lucide-react";
import toast from "react-hot-toast";
import { useReactToPrint } from "react-to-print";
import {
  getExpenses,
  getExpenseStats,
  createExpense,
  updateExpense,
  deleteExpense,
  postRecurringExpense,
} from "../api/expenses";
import { getParties } from "../api/parties";
import ConfirmDialog from "../components/ConfirmDialog";
import ChequePrintModal from "../components/ChequePrintModal";

export default function Expenses() {
  const [activeTab, setActiveTab] = useState("all"); // 'all' or 'recurring'
  const [expenses, setExpenses] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  // Modal State
  const [showModal, setShowModal] = useState(false);
  const [editingExpense, setEditingExpense] = useState(null);

  // Confirm Dialog State
  const [confirmDialog, setConfirmDialog] = useState({
    open: false,
    id: null,
  });

  // Cheque Print State
  const [printExpense, setPrintExpense] = useState(null);

  // Load Data
  const loadData = async () => {
    try {
      setLoading(true);
      const isRecurring = activeTab === "recurring";
      const [data, statsData] = await Promise.all([
        getExpenses({ isRecurring }),
        getExpenseStats(),
      ]);
      setExpenses(data);
      if (!isRecurring) setStats(statsData); // Only update stats on main tab
    } catch (err) {
      console.error("Failed to load expenses", err);
      toast.error("Failed to load data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [activeTab]);

  // Handlers
  const handleDelete = (id) => {
    setConfirmDialog({ open: true, id });
  };

  const executeDelete = async () => {
    if (!confirmDialog.id) return;
    try {
      await deleteExpense(confirmDialog.id);
      toast.success("Deleted successfully");
      loadData();
    } catch (e) {
      toast.error("Delete failed");
    } finally {
      setConfirmDialog({ open: false, id: null });
    }
  };

  const handlePostRecurring = async (id) => {
    try {
      await postRecurringExpense(id);
      toast.success("Expense posted for today!");
      // Optionally switch tab or just notify
    } catch (e) {
      toast.error("Posting failed");
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Print Modal */}
      {printExpense && (
        <ChequePrintModal
          expense={printExpense}
          onClose={() => setPrintExpense(null)}
        />
      )}

      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Expense Tracker
          </h1>
          <p className="text-sm text-gray-500">
            Manage operational costs, bills, and cheques
          </p>
        </div>
        <button
          onClick={() => {
            setEditingExpense(null);
            setShowModal(true);
          }}
          className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white px-5 py-2.5 rounded-xl font-medium shadow-lg shadow-red-600/20 transition-all"
        >
          <Plus size={20} />
          Add Expense
        </button>
      </div>

      {/* Stats (Only visible on All Expenses tab) */}
      {activeTab === "all" && stats && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <StatCard
            label="Total Expenses"
            value={`₹${Number(stats.total_amount).toLocaleString("en-IN")}`}
            icon={Wallet}
            color="red"
          />
          <StatCard
            label="This Month"
            value={`₹${Number(stats.this_month_amount).toLocaleString(
              "en-IN"
            )}`}
            icon={Calendar}
            color="blue"
          />
          <StatCard
            label="Total Count"
            value={stats.count}
            icon={FileText}
            color="orange"
          />
        </div>
      )}

      {/* Tabs */}
      <div className="border-b border-gray-200 dark:border-gray-700">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab("all")}
            className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === "all"
                ? "border-red-500 text-red-600 dark:text-red-400"
                : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
            }`}
          >
            All Expenses
          </button>
          <button
            onClick={() => setActiveTab("recurring")}
            className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === "recurring"
                ? "border-blue-500 text-blue-600 dark:text-blue-400"
                : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
            }`}
          >
            Recurring Templates
          </button>
        </nav>
      </div>

      {/* Content */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
        {activeTab === "all" ? (
          <ExpensesList
            expenses={expenses}
            loading={loading}
            onEdit={(ex) => {
              setEditingExpense(ex);
              setShowModal(true);
            }}
            onDelete={(ex) => handleDelete(ex.id)}
            onPrint={(ex) => setPrintExpense(ex)}
          />
        ) : (
          <RecurringList
            expenses={expenses}
            loading={loading}
            onEdit={(ex) => {
              setEditingExpense(ex);
              setShowModal(true);
            }}
            onDelete={(ex) => handleDelete(ex.id)}
            onPost={(ex) => handlePostRecurring(ex.id)}
          />
        )}
      </div>

      {showModal && (
        <AddExpenseModal
          open={showModal}
          expense={editingExpense}
          onClose={() => setShowModal(false)}
          onSuccess={() => {
            setShowModal(false);
            loadData();
          }}
          defaultRecurring={activeTab === "recurring"}
          existingCategories={[
            ...new Set(expenses.map((e) => e.category).filter(Boolean)),
          ]}
        />
      )}

      <ConfirmDialog
        open={confirmDialog.open}
        type="danger"
        title="Delete Expense?"
        message="This action cannot be undone. Are you sure you want to permanently delete this record?"
        confirmLabel="Delete Forever"
        onClose={() => setConfirmDialog({ ...confirmDialog, open: false })}
        onCancel={() => setConfirmDialog({ ...confirmDialog, open: false })}
        onConfirm={executeDelete}
      />
    </div>
  );
}

// --- Sub Components ---

function StatCard({ label, value, icon: Icon, color }) {
  const colors = {
    red: "bg-red-50 text-red-600 dark:bg-red-900/20 dark:text-red-400",
    blue: "bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400",
    orange:
      "bg-orange-50 text-orange-600 dark:bg-orange-900/20 dark:text-orange-400",
  };
  return (
    <div className="bg-white dark:bg-gray-800 p-5 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 flex items-center gap-4">
      <div className={`p-3 rounded-xl ${colors[color]}`}>
        <Icon size={22} />
      </div>
      <div>
        <h3 className="text-2xl font-bold text-gray-900 dark:text-white">
          {value}
        </h3>
        <p className="text-xs text-gray-500 uppercase font-bold tracking-wide">
          {label}
        </p>
      </div>
    </div>
  );
}

function ExpensesList({ expenses, loading, onEdit, onDelete, onPrint }) {
  if (loading)
    return <div className="p-8 text-center text-gray-500">Loading...</div>;
  if (expenses.length === 0)
    return (
      <div className="p-8 text-center text-gray-500">No expenses found.</div>
    );

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-sm">
        <thead className="bg-gray-50 dark:bg-gray-700/50 text-gray-500 uppercase tracking-wider font-semibold">
          <tr>
            <th className="px-6 py-4">Date</th>
            <th className="px-6 py-4">Category</th>
            <th className="px-6 py-4">Payee / Details</th>
            <th className="px-6 py-4">Mode</th>
            <th className="px-6 py-4 text-right">Amount</th>
            <th className="px-6 py-4 text-right">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
          {expenses.map((ex) => (
            <tr
              key={ex.id}
              className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
            >
              <td className="px-6 py-4 text-gray-500">
                {new Date(ex.date).toLocaleDateString()}
              </td>
              <td className="px-6 py-4 font-medium text-gray-900 dark:text-white">
                {ex.category}
                {ex.is_recurring && (
                  <span className="ml-2 text-xs bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full">
                    Auto
                  </span>
                )}
              </td>
              <td className="px-6 py-4">
                <div className="text-gray-900 dark:text-white font-medium">
                  {ex.party_name || ex.payee_name || "—"}
                </div>
                <div className="text-xs text-gray-500 truncate max-w-[200px]">
                  {ex.description}
                </div>
              </td>
              <td className="px-6 py-4">
                <span
                  className={`px-2 py-1 rounded text-xs font-semibold ${
                    ex.payment_method === "Cheque"
                      ? "bg-purple-100 text-purple-700"
                      : ex.payment_method === "Cash"
                      ? "bg-green-100 text-green-700"
                      : "bg-gray-100 text-gray-700"
                  }`}
                >
                  {ex.payment_method}
                </span>
                {ex.payment_method === "Cheque" && ex.cheque_no && (
                  <div className="text-xs text-gray-400 mt-1">
                    No: {ex.cheque_no}
                  </div>
                )}
              </td>
              <td className="px-6 py-4 text-right font-bold text-gray-900 dark:text-white">
                ₹{Number(ex.amount).toLocaleString("en-IN")}
              </td>
              <td className="px-6 py-4 text-right flex justify-end gap-2">
                {ex.payment_method === "Cheque" && (
                  <button
                    onClick={() => onPrint(ex)}
                    className="p-2 text-gray-400 hover:text-purple-600 transition"
                    title="Print Cheque"
                  >
                    <Printer size={16} />
                  </button>
                )}
                <button
                  onClick={() => onEdit(ex)}
                  className="p-2 text-gray-400 hover:text-blue-600 transition"
                >
                  <Edit size={16} />
                </button>
                <button
                  onClick={() => onDelete(ex)}
                  className="p-2 text-gray-400 hover:text-red-600 transition"
                >
                  <Trash2 size={16} />
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function RecurringList({ expenses, loading, onEdit, onDelete, onPost }) {
  if (loading)
    return (
      <div className="p-8 text-center text-gray-500">Loading templates...</div>
    );

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-6">
      {expenses.map((ex) => (
        <div
          key={ex.id}
          className="border border-gray-200 dark:border-gray-700 rounded-xl p-5 hover:shadow-md transition-shadow relative bg-white dark:bg-gray-800"
        >
          <div className="absolute top-4 right-4 flex gap-2">
            <button
              onClick={() => onEdit(ex)}
              className="text-gray-400 hover:text-blue-600"
            >
              <Edit size={16} />
            </button>
            <button
              onClick={() => onDelete(ex)}
              className="text-gray-400 hover:text-red-600"
            >
              <Trash2 size={16} />
            </button>
          </div>

          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
              <Repeat size={20} />
            </div>
            <div>
              <h3 className="font-bold text-gray-900 dark:text-white">
                {ex.category}
              </h3>
              <p className="text-xs text-gray-500">{ex.recurring_frequency}</p>
            </div>
          </div>

          <div className="space-y-2 mb-4">
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Amount:</span>
              <span className="font-bold">
                ₹{Number(ex.amount).toLocaleString("en-IN")}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Next Due:</span>
              <span className="font-medium text-orange-600">
                {new Date(ex.next_due_date || new Date()).toLocaleDateString()}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Payee:</span>
              <span className="font-medium truncate max-w-[120px]">
                {ex.party_name || "—"}
              </span>
            </div>
          </div>

          <button
            onClick={() => onPost(ex)}
            className="w-full py-2 flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors"
          >
            <CheckCircle size={16} /> Post for Today
          </button>
        </div>
      ))}
    </div>
  );
}

// --- MODAL COMPONENT ---
function AddExpenseModal({
  open,
  expense,
  onClose,
  onSuccess,
  defaultRecurring,
  existingCategories = [],
}) {
  if (!open) return null;

  const [formData, setFormData] = useState({
    date: new Date().toISOString().split("T")[0],
    category: "Rent",
    description: "",
    amount: "",
    payment_method: "Cash",
    party_id: "",
    is_recurring: defaultRecurring || false,
    recurring_frequency: "Monthly",
    cheque_no: "",
    cheque_date: new Date().toISOString().split("T")[0],
    payee_name: "",
    bank_name: "",
  });

  const [parties, setParties] = useState([]);
  const [showCategorySuggestions, setShowCategorySuggestions] = useState(false);
  const [showPaymentDropdown, setShowPaymentDropdown] = useState(false);

  const categoryInputRef = useRef(null);
  const paymentModeInputRef = useRef(null);

  // Close suggestions when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      // Category Dropdown
      if (
        categoryInputRef.current &&
        !categoryInputRef.current.contains(event.target)
      ) {
        setShowCategorySuggestions(false);
      }

      // Payment Mode Dropdown
      if (
        paymentModeInputRef.current &&
        !paymentModeInputRef.current.contains(event.target)
      ) {
        setShowPaymentDropdown(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  useEffect(() => {
    // Load Vendors
    getParties().then((data) => setParties(data));

    if (expense) {
      setFormData({
        ...expense,
        party_id: expense.party_id || "",
        // Ensure dates are formatted for input type='date'
        date: expense.date ? expense.date.split("T")[0] : "",
        cheque_date: expense.cheque_date
          ? expense.cheque_date.split("T")[0]
          : "",
      });
    }
  }, [expense, open]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      // Sanitize Payload
      const payload = {
        ...formData,
        amount: Number(formData.amount),
        party_id: formData.party_id ? Number(formData.party_id) : undefined,
        // Clear cheque details if not Cheque
        cheque_no:
          formData.payment_method === "Cheque" ? formData.cheque_no : undefined,
        cheque_date:
          formData.payment_method === "Cheque" && formData.cheque_date
            ? formData.cheque_date
            : undefined,
        bank_name:
          formData.payment_method === "Cheque" ? formData.bank_name : undefined,
        payee_name:
          formData.payment_method === "Cheque"
            ? formData.payee_name
            : undefined,
        // Clear recurring details if not Recurring
        recurring_frequency: formData.is_recurring
          ? formData.recurring_frequency
          : undefined,
      };

      // Ensure empty strings become undefined for optional text fields
      if (!payload.cheque_no) payload.cheque_no = undefined;
      if (!payload.bank_name) payload.bank_name = undefined;
      if (!payload.payee_name) payload.payee_name = undefined;

      // Add next_due_date if recurring
      if (payload.is_recurring && !payload.next_due_date) {
        // Default to 1 month from now if missing
        const d = new Date(payload.date);
        d.setMonth(d.getMonth() + 1);
        payload.next_due_date = d.toISOString().split("T")[0];
      }

      console.log("Submitting Payload:", payload);

      if (expense) {
        await updateExpense(expense.id, payload);
        toast.success("Updated successfully");
      } else {
        await createExpense(payload);
        toast.success("Created successfully");
      }
      onSuccess();
    } catch (err) {
      console.error("Expense Submit Error:", err);
      // Fallback: If detail is missing or complex, show everything
      if (err.response && err.response.data) {
        const d = err.response.data;
        const msg = d.detail
          ? typeof d.detail === "string"
            ? d.detail
            : JSON.stringify(d.detail)
          : JSON.stringify(d);
        toast.error("Error: " + msg);
      } else {
        toast.error("Operation failed: " + err.message);
      }
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-fade-in">
      <div className="bg-white dark:bg-gray-800 rounded-3xl w-full max-w-3xl shadow-2xl overflow-hidden max-h-[90vh] overflow-y-auto flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-gray-900 to-gray-800 dark:from-gray-800 dark:to-black px-8 py-6 flex justify-between items-center text-white shrink-0">
          <div>
            <h2 className="text-2xl font-bold tracking-tight">
              {expense ? "Edit Expense" : "New Expense"}
            </h2>
            <p className="text-gray-400 text-sm mt-1">
              {expense
                ? "Update the details of this transaction"
                : "Record a new transaction for your business"}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-white/60 hover:text-white hover:bg-white/10 p-2 rounded-full transition-all"
          >
            <X size={24} />
          </button>
        </div>

        <form
          onSubmit={handleSubmit}
          className="p-8 space-y-8 overflow-y-auto custom-scrollbar"
        >
          {/* Main Details Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
            {/* Amount - Hero Input */}
            <div className="col-span-1 md:col-span-2 space-y-2">
              <label className="text-sm font-semibold uppercase text-gray-500 tracking-wider">
                Total Amount
              </label>
              <div className="relative group">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 text-xl font-bold group-focus-within:text-blue-600 transition-colors">
                  ₹
                </span>
                <input
                  type="number"
                  required
                  min="0"
                  placeholder="0.00"
                  className="w-full pl-10 pr-4 py-4 text-3xl font-bold bg-gray-50 dark:bg-gray-900 border-2 border-transparent focus:border-blue-500 rounded-2xl outline-none transition-all placeholder:text-gray-300 dark:text-white"
                  value={formData.amount}
                  onChange={(e) =>
                    setFormData({ ...formData, amount: e.target.value })
                  }
                />
              </div>
            </div>

            {/* Date */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Transaction Date
              </label>
              <div className="relative">
                <Calendar
                  size={18}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                />
                <input
                  type="date"
                  required
                  className="w-full pl-10 pr-4 py-3 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                  value={formData.date}
                  onChange={(e) =>
                    setFormData({ ...formData, date: e.target.value })
                  }
                />
              </div>
            </div>

            {/* Payment Mode */}
            <div className="space-y-2 relative" ref={paymentModeInputRef}>
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Payment Mode
              </label>
              <div
                className="relative cursor-pointer"
                onClick={() => setShowPaymentDropdown(!showPaymentDropdown)}
              >
                <Wallet
                  size={18}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                />
                <div className="w-full pl-10 pr-4 py-3 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-transparent transition-all flex items-center justify-between select-none">
                  <span className="text-gray-900 dark:text-white font-medium">
                    {formData.payment_method}
                  </span>
                  <ChevronDown
                    size={18}
                    className={`text-gray-400 transition-transform duration-200 ${
                      showPaymentDropdown ? "rotate-180" : ""
                    }`}
                  />
                </div>

                {showPaymentDropdown && (
                  <div className="absolute z-20 w-full mt-1 bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-xl shadow-lg overflow-hidden animate-fade-in-up">
                    {["Cash", "Online", "Cheque"].map((mode) => (
                      <div
                        key={mode}
                        className={`px-4 py-3 cursor-pointer text-sm font-medium flex items-center justify-between transition-colors ${
                          formData.payment_method === mode
                            ? "bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400"
                            : "text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700"
                        }`}
                        onClick={(e) => {
                          e.stopPropagation();
                          setFormData({ ...formData, payment_method: mode });
                          setShowPaymentDropdown(false);
                        }}
                      >
                        {mode}
                        {formData.payment_method === mode && (
                          <CheckCircle size={14} />
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Category */}
            <div className="space-y-2 relative" ref={categoryInputRef}>
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Category
              </label>
              <input
                type="text"
                placeholder="e.g. Rent, Travel..."
                className="w-full px-4 py-3 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all dark:text-white"
                value={formData.category}
                onFocus={() => setShowCategorySuggestions(true)}
                onChange={(e) =>
                  setFormData({ ...formData, category: e.target.value })
                }
              />
              {showCategorySuggestions && (
                <div className="absolute z-10 w-full mt-1 bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-xl shadow-lg max-h-48 overflow-y-auto custom-scrollbar overflow-hidden">
                  {Array.from(
                    new Set([
                      "Rent",
                      "Salary",
                      "Electricity",
                      "Travel",
                      "Office Supplies",
                      ...existingCategories,
                    ])
                  )
                    .filter((cat) =>
                      cat
                        .toLowerCase()
                        .includes(formData.category.toLowerCase())
                    )
                    .sort()
                    .map((cat) => (
                      <div
                        key={cat}
                        className="px-4 py-2 hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer text-sm text-gray-700 dark:text-gray-200"
                        onClick={() => {
                          setFormData({ ...formData, category: cat });
                          setShowCategorySuggestions(false);
                        }}
                      >
                        {cat}
                      </div>
                    ))}
                  {formData.category &&
                    !Array.from(
                      new Set([
                        "Rent",
                        "Salary",
                        "Electricity",
                        "Travel",
                        "Office Supplies",
                        ...existingCategories,
                      ])
                    ).some(
                      (c) => c.toLowerCase() === formData.category.toLowerCase()
                    ) && (
                      <div className="px-4 py-2 text-xs text-gray-400 italic border-t border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50">
                        Create new: "{formData.category}"
                      </div>
                    )}
                </div>
              )}
            </div>

            {/* Vendor Select */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Paid To (Optional)
              </label>
              <select
                className="w-full px-4 py-3 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                value={formData.party_id}
                onChange={(e) => {
                  const pid = e.target.value;
                  const p = parties.find((party) => party.id === Number(pid));
                  setFormData({
                    ...formData,
                    party_id: pid,
                    payee_name: p ? p.name : formData.payee_name,
                  });
                }}
              >
                <option value="">-- Select Vendor --</option>
                {parties.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* CHEQUE FIELDS (Conditional) */}
          {formData.payment_method === "Cheque" && (
            <div className="animate-fade-in bg-purple-50 dark:bg-purple-900/10 p-6 rounded-2xl border border-purple-100 dark:border-purple-900/30 space-y-4">
              <h3 className="flex items-center gap-2 text-sm font-bold text-purple-700 dark:text-purple-300 uppercase tracking-wide">
                <Printer size={16} /> Cheque Details
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-medium text-gray-500">
                    Cheque Number
                  </label>
                  <input
                    placeholder="e.g. 000123"
                    className="w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-sm focus:border-purple-500 outline-none dark:text-white"
                    value={formData.cheque_no}
                    onChange={(e) =>
                      setFormData({ ...formData, cheque_no: e.target.value })
                    }
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-gray-500">
                    Cheque Date
                  </label>
                  <input
                    type="date"
                    className="w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-sm focus:border-purple-500 outline-none dark:text-white"
                    value={formData.cheque_date}
                    onChange={(e) =>
                      setFormData({ ...formData, cheque_date: e.target.value })
                    }
                  />
                </div>
                <div className="col-span-1 md:col-span-2 space-y-1">
                  <label className="text-xs font-medium text-gray-500">
                    Payee Name (On Cheque)
                  </label>
                  <input
                    placeholder="Name as per bank records"
                    className="w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-sm focus:border-purple-500 outline-none font-medium dark:text-white"
                    value={formData.payee_name}
                    onChange={(e) =>
                      setFormData({ ...formData, payee_name: e.target.value })
                    }
                  />
                </div>
              </div>
            </div>
          )}

          {/* Description */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Description / Notes
            </label>
            <textarea
              placeholder="Add any additional details here..."
              className="w-full px-4 py-3 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all h-24 resize-none"
              value={formData.description}
              onChange={(e) =>
                setFormData({ ...formData, description: e.target.value })
              }
            />
          </div>

          {/* RECURRING TOGGLE */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gray-50 dark:bg-gray-700/30 p-5 rounded-2xl border border-dashed border-gray-200 dark:border-gray-600">
            <div className="flex items-center gap-3">
              <div
                className={`w-12 h-6 rounded-full p-1 cursor-pointer transition-colors ${
                  formData.is_recurring ? "bg-blue-600" : "bg-gray-300"
                }`}
                onClick={() =>
                  setFormData({
                    ...formData,
                    is_recurring: !formData.is_recurring,
                  })
                }
              >
                <div
                  className={`bg-white w-4 h-4 rounded-full shadow-sm transform transition-transform ${
                    formData.is_recurring ? "translate-x-6" : "translate-x-0"
                  }`}
                />
              </div>
              <label className="font-medium text-gray-900 dark:text-white cursor-pointer select-none">
                Make this a Recurring Expense?
              </label>
            </div>

            {formData.is_recurring && (
              <div className="flex items-center gap-2 animate-fade-in-up">
                <span className="text-sm text-gray-500">Repeat every:</span>
                <select
                  className="bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 text-sm font-semibold rounded-lg px-3 py-2 outline-none focus:border-blue-500 dark:text-white"
                  value={formData.recurring_frequency}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      recurring_frequency: e.target.value,
                    })
                  }
                >
                  <option value="Monthly">Monthly</option>
                  <option value="Weekly">Weekly</option>
                  <option value="Yearly">Yearly</option>
                </select>
              </div>
            )}
          </div>
        </form>

        {/* Footer Actions */}
        <div className="p-6 border-t border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 flex justify-end gap-3 shrink-0">
          <button
            onClick={onClose}
            className="px-6 py-3 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-xl font-medium transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            className="px-8 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-xl font-bold tracking-wide shadow-lg shadow-blue-500/30 transform active:scale-[0.98] transition-all"
          >
            {expense ? "Save Changes" : "Create Expense"}
          </button>
        </div>
      </div>
    </div>
  );
}

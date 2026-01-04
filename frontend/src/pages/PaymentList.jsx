import { useState, useEffect } from "react";
import {
  Plus,
  Search,
  Filter,
  Trash2,
  Edit,
  X,
  User,
  Calendar,
  IndianRupee,
  CreditCard,
  FileText,
  CheckCircle,
  Briefcase,
  Calculator,
} from "lucide-react";
import ConfirmDialog from "../components/ConfirmDialog";
import toast from "react-hot-toast";
import {
  getPayments,
  createPayment,
  updatePayment,
  deletePayment,
} from "../api/payments";
import { getParties } from "../api/parties";
import { getPendingInvoices } from "../api/invoices";

export default function PaymentList() {
  const [payments, setPayments] = useState([]);
  const [parties, setParties] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);

  // Filters
  const [filters, setFilters] = useState({
    party_id: "",
    payment_type: "",
    start_date: "",
    end_date: "",
  });

  // Form State
  const [editId, setEditId] = useState(null);
  const [pendingInvoices, setPendingInvoices] = useState([]);
  const [allocations, setAllocations] = useState({}); // { invoice_id: amount }

  const [formData, setFormData] = useState({
    party_id: "",
    payment_date: new Date().toISOString().split("T")[0],
    amount: "",
    payment_type: "RECEIVED",
    payment_mode: "CASH",
    reference_number: "",
    notes: "",
  });

  useEffect(() => {
    fetchData();
  }, [filters]);

  // Fetch pending invoices when Party changes in Form
  useEffect(() => {
    if (
      showModal &&
      formData.party_id &&
      formData.payment_type === "RECEIVED"
    ) {
      let extraInvoices = [];
      if (editId) {
        const currentPayment = payments.find((p) => p.id === editId);
        if (currentPayment?.allocations) {
          extraInvoices = currentPayment.allocations
            .map((a) => a.invoice)
            .filter(Boolean);
        }
      }
      loadPendingInvoices(formData.party_id, extraInvoices);
    } else {
      setPendingInvoices([]);
      // Only clear allocations if NOT in generic edit/view transition (handled by handleEdit)
      // But strictly, if party changes, clear allocations.
      // If modal closes, clear allocations.
      if (!showModal) setAllocations({});
    }
  }, [formData.party_id, showModal, formData.payment_type, editId]);

  const loadPendingInvoices = async (partyId, extraInvoices = []) => {
    try {
      const res = await getPendingInvoices(partyId);

      // Merge unique
      const all = [...extraInvoices, ...res];
      const unique = [];
      const seen = new Set();

      all.forEach((inv) => {
        if (!seen.has(inv.id)) {
          seen.add(inv.id);
          unique.push(inv);
        }
      });

      unique.sort(
        (a, b) => new Date(a.invoice_date) - new Date(b.invoice_date)
      );
      setPendingInvoices(unique);
    } catch (err) {
      console.error("Failed to load invoices");
    }
  };

  const handleAutoAllocate = () => {
    let remaining = parseFloat(formData.amount) || 0;
    const newAllocations = {};

    // Allocate to oldest first
    pendingInvoices.forEach((inv) => {
      if (remaining <= 0) return;

      const due =
        parseFloat(inv.grand_total) - parseFloat(inv.paid_amount || 0);
      const allocate = Math.min(remaining, due);

      if (allocate > 0) {
        newAllocations[inv.id] = allocate;
        remaining -= allocate;
      }
    });
    setAllocations(newAllocations);
  };

  const toggleAllocation = (invId, due) => {
    setAllocations((prev) => {
      const newAlloc = { ...prev };
      if (newAlloc[invId]) {
        delete newAlloc[invId];
      } else {
        newAlloc[invId] = due;
      }

      // Calculate new total amount based on allocations
      const totalAllocated = Object.values(newAlloc).reduce(
        (sum, amount) => sum + (parseFloat(amount) || 0),
        0
      );
      setFormData((prevData) => ({
        ...prevData,
        amount: totalAllocated,
      }));

      return newAlloc;
    });
  };

  const fetchData = async () => {
    try {
      setLoading(true);
      const [paymentsData, partiesData] = await Promise.all([
        getPayments(filters),
        getParties(),
      ]);
      setPayments(paymentsData);
      setParties(partiesData);
    } catch (error) {
      console.error(error);
      toast.error("Failed to load data");
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = () => {
    setEditId(null);
    setAllocations({});
    setFormData({
      party_id: "",
      payment_date: new Date().toISOString().split("T")[0],
      amount: "",
      payment_type: "RECEIVED",
      payment_mode: "CASH",
      reference_number: "",
      notes: "",
    });
    setShowModal(true);
  };

  const handleEdit = (payment) => {
    setEditId(payment.id);

    // Set Allocations
    const newAlloc = {};
    if (payment.allocations) {
      payment.allocations.forEach((a) => {
        newAlloc[a.invoice_id] = a.amount;
      });
    }
    setAllocations(newAlloc);

    setFormData({
      party_id: payment.party_id,
      payment_date: payment.payment_date,
      amount: payment.amount,
      payment_type: payment.payment_type,
      payment_mode: payment.payment_mode,
      reference_number: payment.reference_number || "",
      notes: payment.notes || "",
    });
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editId) {
        await updatePayment(editId, formData);
        toast.success("Payment updated");
      } else {
        // Format allocations for API
        const finalData = {
          ...formData,
          allocations: Object.entries(allocations).map(([id, amount]) => ({
            invoice_id: parseInt(id),
            amount: parseFloat(amount),
          })),
        };
        await createPayment(finalData);
        toast.success("Payment recorded");
      }
      setShowModal(false);
      fetchData();
    } catch (error) {
      console.error(error);
      toast.error("Operation failed");
    }
  };

  /* Delete Confirmation State */
  const [deleteId, setDeleteId] = useState(null);

  const handleDelete = (id) => {
    setDeleteId(id);
  };

  const confirmDelete = async () => {
    if (!deleteId) return;
    try {
      await deletePayment(deleteId);
      toast.success("Payment deleted");
      fetchData();
    } catch (error) {
      toast.error("Failed to delete");
    } finally {
      setDeleteId(null);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Payments
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Track Inward and Outward Payments
          </p>
        </div>
        <button
          onClick={handleCreate}
          className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg flex items-center gap-2 transition-colors shadow-sm"
        >
          <Plus size={20} /> Record Payment
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 flex flex-wrap gap-4 items-end">
        <div>
          <label
            htmlFor="filter_party_id"
            className="block text-xs font-medium mb-1 text-gray-500"
          >
            Party
          </label>
          <select
            name="filter_party_id"
            id="filter_party_id"
            value={filters.party_id}
            onChange={(e) =>
              setFilters({ ...filters, party_id: e.target.value })
            }
            className="px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-sm"
          >
            <option value="">All Parties</option>
            {parties.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label
            htmlFor="filter_payment_type"
            className="block text-xs font-medium mb-1 text-gray-500"
          >
            Type
          </label>
          <select
            name="filter_payment_type"
            id="filter_payment_type"
            value={filters.payment_type}
            onChange={(e) =>
              setFilters({ ...filters, payment_type: e.target.value })
            }
            className="px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-sm"
          >
            <option value="">All Types</option>
            <option value="RECEIVED">Received (In)</option>
            <option value="PAID">Paid (Out)</option>
          </select>
        </div>
        {/* Date Filter could go here */}
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-gray-50 dark:bg-gray-900 text-xs font-semibold uppercase text-gray-500 dark:text-gray-400 border-b border-gray-100 dark:border-gray-700">
              <th className="px-6 py-4">Date</th>
              <th className="px-6 py-4">Party</th>
              <th className="px-6 py-4">Mode / Ref</th>
              <th className="px-6 py-4">Type</th>
              <th className="px-6 py-4 text-right">Amount</th>
              <th className="px-6 py-4 text-center">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
            {payments.length === 0 ? (
              <tr>
                <td colSpan="6" className="px-6 py-8 text-center text-gray-500">
                  No payments found.
                </td>
              </tr>
            ) : (
              payments.map((payment) => (
                <tr
                  key={payment.id}
                  className="hover:bg-gray-50/50 dark:hover:bg-gray-700/50 transition-colors"
                >
                  <td className="px-6 py-4 text-sm text-gray-900 dark:text-gray-200">
                    {new Date(payment.payment_date).toLocaleDateString("en-IN")}
                  </td>
                  <td className="px-6 py-4 text-sm font-medium text-gray-900 dark:text-white">
                    {payment.party?.name}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400">
                    <span className="font-semibold text-xs bg-gray-100 dark:bg-gray-700 px-2 py-0.5 rounded">
                      {payment.payment_mode}
                    </span>
                    {payment.reference_number && (
                      <div className="text-xs mt-1">
                        Ref: {payment.reference_number}
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4 text-sm">
                    <span
                      className={`px-2 py-1 rounded-full text-xs font-bold ${
                        payment.payment_type === "RECEIVED"
                          ? "bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-400"
                          : "bg-red-100 text-red-700 dark:bg-red-900/20 dark:text-red-400"
                      }`}
                    >
                      {payment.payment_type}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-right font-bold text-gray-900 dark:text-white">
                    ₹
                    {Number(payment.amount).toLocaleString("en-IN", {
                      minimumFractionDigits: 2,
                    })}
                  </td>
                  <td className="px-6 py-4 text-center">
                    <div className="flex items-center justify-center gap-2">
                      <button
                        onClick={() => handleEdit(payment)}
                        className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg text-blue-600"
                      >
                        <Edit size={16} />
                      </button>
                      <button
                        onClick={() => handleDelete(payment.id)}
                        className="p-1.5 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg text-red-600"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Delete Confirmation Modal */}
      <ConfirmDialog
        open={!!deleteId}
        onCancel={() => setDeleteId(null)}
        onConfirm={confirmDelete}
        title="Confirm Delete"
        message="Are you sure you want to delete this payment? This action cannot be undone and will revert any invoice settlements."
        confirmLabel="Delete Payment"
        type="danger"
      />

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-5xl border border-gray-200 dark:border-gray-700 animate-scale-in overflow-hidden flex flex-col max-h-[90vh]">
            {/* Header */}
            <div className="p-6 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center bg-gray-50/50 dark:bg-gray-800/50">
              <div>
                <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                  {editId ? (
                    <Edit size={20} className="text-purple-500" />
                  ) : (
                    <Plus size={20} className="text-purple-500" />
                  )}
                  {editId ? "Edit Payment" : "Record New Payment"}
                </h2>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  {editId
                    ? "Update payment details and allocations"
                    : "Enter payment details and allocate to invoices"}
                </p>
              </div>
              <button
                onClick={() => setShowModal(false)}
                className="p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-full transition-colors text-gray-500 hover:text-gray-700 dark:text-gray-400"
              >
                <X size={20} />
              </button>
            </div>

            <form
              onSubmit={handleSubmit}
              className="flex-1 overflow-hidden flex flex-col md:flex-row"
            >
              {/* Left Column: Input Fields */}
              <div className="w-full md:w-5/12 p-6 overflow-y-auto border-r border-gray-100 dark:border-gray-700 space-y-5">
                {/* Party */}
                <div>
                  <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5 uppercase tracking-wide">
                    Party Name
                  </label>
                  <div className="relative group">
                    <User
                      className="absolute left-3 top-2.5 text-gray-400 group-focus-within:text-purple-500 transition-colors"
                      size={18}
                    />
                    <select
                      required
                      name="payment_party_id"
                      id="payment_party_id"
                      value={formData.party_id}
                      onChange={(e) =>
                        setFormData({ ...formData, party_id: e.target.value })
                      }
                      className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 outline-none transition-all appearance-none"
                    >
                      <option value="">Select Party</option>
                      {parties.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  {/* Date */}
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5 uppercase tracking-wide">
                      Date
                    </label>
                    <div className="relative group">
                      <Calendar
                        className="absolute left-3 top-2.5 text-gray-400 group-focus-within:text-purple-500 transition-colors"
                        size={18}
                      />
                      <input
                        type="date"
                        required
                        name="payment_date"
                        id="payment_date"
                        value={formData.payment_date}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            payment_date: e.target.value,
                          })
                        }
                        className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 outline-none transition-all"
                      />
                    </div>
                  </div>
                  {/* Amount */}
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5 uppercase tracking-wide">
                      Amount
                    </label>
                    <div className="relative group">
                      <IndianRupee
                        className="absolute left-3 top-2.5 text-gray-400 group-focus-within:text-green-500 transition-colors"
                        size={18}
                      />
                      <input
                        type="number"
                        step="0.01"
                        required
                        name="payment_amount"
                        id="payment_amount"
                        value={formData.amount}
                        onChange={(e) =>
                          setFormData({ ...formData, amount: e.target.value })
                        }
                        className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-sm font-bold text-gray-900 dark:text-white focus:ring-2 focus:ring-green-500/20 focus:border-green-500 outline-none transition-all placeholder-gray-300"
                        placeholder="0.00"
                      />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  {/* Type */}
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5 uppercase tracking-wide">
                      Type
                    </label>
                    <div className="relative">
                      <select
                        name="payment_type"
                        id="payment_type"
                        value={formData.payment_type}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            payment_type: e.target.value,
                          })
                        }
                        className="w-full px-4 py-2.5 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 outline-none transition-all font-medium"
                      >
                        <option value="RECEIVED">Received (In)</option>
                        <option value="PAID">Paid (Out)</option>
                      </select>
                    </div>
                  </div>
                  {/* Mode */}
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5 uppercase tracking-wide">
                      Mode
                    </label>
                    <div className="relative group">
                      <CreditCard
                        className="absolute left-3 top-2.5 text-gray-400 group-focus-within:text-purple-500 transition-colors"
                        size={18}
                      />
                      <select
                        name="payment_mode"
                        id="payment_mode"
                        value={formData.payment_mode}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            payment_mode: e.target.value,
                          })
                        }
                        className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 outline-none transition-all appearance-none"
                      >
                        <option value="CASH">Cash</option>
                        <option value="BANK_TRANSFER">Bank Transfer</option>
                        <option value="CHEQUE">Cheque</option>
                        <option value="UPI">UPI</option>
                        <option value="OTHER">Other</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* Reference & Notes */}
                <div>
                  <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5 uppercase tracking-wide">
                    Reference / Notes
                  </label>
                  <div className="space-y-3">
                    <div className="relative group">
                      <FileText
                        className="absolute left-3 top-2.5 text-gray-400 group-focus-within:text-purple-500 transition-colors"
                        size={18}
                      />
                      <input
                        type="text"
                        name="payment_reference"
                        id="payment_reference"
                        value={formData.reference_number}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            reference_number: e.target.value,
                          })
                        }
                        className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 outline-none transition-all"
                        placeholder="Cheque No / Transaction ID"
                      />
                    </div>
                    <textarea
                      rows="3"
                      name="payment_notes"
                      id="payment_notes"
                      value={formData.notes}
                      onChange={(e) =>
                        setFormData({ ...formData, notes: e.target.value })
                      }
                      className="w-full px-4 py-2.5 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 outline-none transition-all resize-none"
                      placeholder="Add any additional notes here..."
                    />
                  </div>
                </div>
              </div>

              {/* Right Column: Settlement Section */}
              <div className="w-full md:w-7/12 bg-gray-50 dark:bg-gray-900/50 flex flex-col min-h-0 overflow-hidden">
                {formData.payment_type === "RECEIVED" ? (
                  <>
                    <div className="p-4 border-b border-gray-200 dark:border-gray-700 shadow-sm bg-white dark:bg-gray-900 z-10">
                      <div className="flex justify-between items-center mb-3">
                        <h3 className="tex-sm font-bold text-gray-800 dark:text-white flex items-center gap-2">
                          <Briefcase size={16} className="text-purple-600" />
                          Settle Invoices
                        </h3>
                        <button
                          type="button"
                          onClick={handleAutoAllocate}
                          className="flex items-center gap-1 text-xs bg-blue-50 text-blue-600 px-3 py-1.5 rounded-lg hover:bg-blue-100 dark:bg-blue-900/20 dark:text-blue-400 font-medium transition-colors border border-blue-100 dark:border-blue-800"
                        >
                          <Calculator size={14} /> Auto Allocate
                        </button>
                      </div>

                      {/* Summary Cards */}
                      <div className="flex gap-4">
                        <div className="bg-purple-50 dark:bg-purple-900/20 p-3 rounded-xl border border-purple-100 dark:border-purple-800 flex-1">
                          <div className="text-xs text-purple-600 dark:text-purple-400 font-medium">
                            Total Balance Due
                          </div>
                          <div className="text-lg font-bold text-gray-900 dark:text-white">
                            ₹
                            {pendingInvoices
                              .reduce(
                                (acc, inv) =>
                                  acc +
                                  (parseFloat(inv.grand_total) -
                                    parseFloat(inv.paid_amount || 0)),
                                0
                              )
                              .toLocaleString()}
                          </div>
                        </div>

                        <div className="bg-green-50 dark:bg-green-900/20 p-3 rounded-xl border border-green-100 dark:border-green-800 flex-1">
                          <div className="text-xs text-green-600 dark:text-green-400 font-medium">
                            Allocated Amount
                          </div>
                          <div className="text-lg font-bold text-green-700 dark:text-green-400">
                            ₹
                            {(
                              parseFloat(formData.amount) || 0
                            ).toLocaleString()}
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="flex-1 overflow-y-auto p-4 space-y-3 min-h-0">
                      {pendingInvoices.length > 0 ? (
                        pendingInvoices.map((inv) => {
                          const due =
                            parseFloat(inv.grand_total) -
                            parseFloat(inv.paid_amount || 0);
                          const isAllocated = !!allocations[inv.id];

                          return (
                            <div
                              key={inv.id}
                              onClick={() => toggleAllocation(inv.id, due)}
                              className={`group cursor-pointer relative flex items-center gap-4 p-4 rounded-xl border transition-all duration-200 ${
                                isAllocated
                                  ? "bg-white dark:bg-gray-800 border-green-500 ring-1 ring-green-500 shadow-sm"
                                  : "bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 hover:border-purple-300 dark:hover:border-gray-500 hover:shadow-md"
                              }`}
                            >
                              <div
                                className={`w-5 h-5 rounded border flex items-center justify-center transition-colors ${
                                  isAllocated
                                    ? "bg-green-500 border-green-500 text-white"
                                    : "border-gray-300 dark:border-gray-500 group-hover:border-purple-400"
                                }`}
                              >
                                {isAllocated && <CheckCircle size={14} />}
                              </div>

                              <div className="flex-1">
                                <div className="flex justify-between items-start">
                                  <div>
                                    <div className="text-sm font-bold text-gray-900 dark:text-white flex items-center gap-2">
                                      {inv.invoice_number}
                                      <span className="text-[10px] px-1.5 py-0.5 bg-gray-100 dark:bg-gray-700 rounded text-gray-500">
                                        {inv.invoice_date}
                                      </span>
                                    </div>
                                    <div className="text-xs text-gray-500 mt-1">
                                      Total: ₹{inv.grand_total}
                                    </div>
                                  </div>
                                  <div className="text-right">
                                    <div className="text-sm font-bold text-red-600">
                                      ₹{due.toLocaleString()}
                                    </div>
                                    <div className="text-[10px] text-gray-400 uppercase font-medium">
                                      Due Amount
                                    </div>
                                  </div>
                                </div>
                              </div>

                              {isAllocated && (
                                <div
                                  className="absolute right-4 top-10 md:static md:block"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  <div className="flex items-center gap-2 bg-gray-50 dark:bg-gray-900 p-1 rounded-lg border border-gray-200 dark:border-gray-700">
                                    <span className="text-xs text-gray-400 pl-2">
                                      ₹
                                    </span>
                                    <input
                                      type="number"
                                      value={allocations[inv.id] || ""}
                                      onChange={(e) => {
                                        const newAmount = e.target.value;
                                        setAllocations((prev) => {
                                          const updated = {
                                            ...prev,
                                            [inv.id]: newAmount,
                                          };
                                          const totalAllocated = Object.values(
                                            updated
                                          ).reduce(
                                            (sum, amount) =>
                                              sum + (parseFloat(amount) || 0),
                                            0
                                          );
                                          setFormData((prevData) => ({
                                            ...prevData,
                                            amount: totalAllocated,
                                          }));
                                          return updated;
                                        });
                                      }}
                                      className="w-20 bg-transparent text-sm font-bold text-gray-900 dark:text-white outline-none"
                                    />
                                  </div>
                                </div>
                              )}
                            </div>
                          );
                        })
                      ) : (
                        <div className="flex flex-col items-center justify-center h-full text-center p-8">
                          <div className="w-16 h-16 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mb-4">
                            <FileText
                              size={32}
                              className="text-gray-300 dark:text-gray-600"
                            />
                          </div>
                          <p className="text-gray-500 dark:text-gray-400 font-medium">
                            No pending invoices found
                          </p>
                          <p className="text-xs text-gray-400 mt-1">
                            Select a Party to fetch invoices
                          </p>
                        </div>
                      )}
                    </div>
                  </>
                ) : (
                  <div className="flex flex-col items-center justify-center h-full text-center p-8">
                    <div className="w-16 h-16 bg-orange-50 dark:bg-orange-900/20 rounded-full flex items-center justify-center mb-4">
                      <CreditCard size={32} className="text-orange-400" />
                    </div>
                    <p className="text-gray-600 dark:text-gray-400 font-medium">
                      Outward Payment
                    </p>
                    <p className="text-sm text-gray-400 mt-2 max-w-xs">
                      Invoice settlement is only available for Received (Inward)
                      payments.
                    </p>
                  </div>
                )}

                {/* Footer Action */}
                <div className="p-4 border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 shrink-0 z-10">
                  <button
                    type="submit"
                    className="w-full py-3.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-bold rounded-xl shadow-lg shadow-purple-500/20 active:scale-[0.99] transition-all flex items-center justify-center gap-2"
                  >
                    <CheckCircle size={20} />
                    {editId ? "Update Payment" : "Save Payment Record"}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

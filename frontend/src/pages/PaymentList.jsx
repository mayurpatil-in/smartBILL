import { useState, useEffect } from "react";
import { Plus, Search, Filter, Trash2, Edit, X } from "lucide-react";
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
      loadPendingInvoices(formData.party_id);
    } else {
      setPendingInvoices([]);
      setAllocations({});
    }
  }, [formData.party_id, showModal, formData.payment_type]);

  const loadPendingInvoices = async (partyId) => {
    try {
      const res = await getPendingInvoices(partyId);
      setPendingInvoices(res);
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
        // Auto-fill full due amount if enough funds, else remaining funds?
        // For simplicity, fill full due, user can edit.
        newAlloc[invId] = due;
      }
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

  const handleDelete = async (id) => {
    if (window.confirm("Are you sure?")) {
      try {
        await deletePayment(id);
        toast.success("Payment deleted");
        fetchData();
      } catch (error) {
        toast.error("Failed to delete");
      }
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

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl w-full max-w-4xl border border-gray-200 dark:border-gray-700 animate-scale-in">
            <div className="p-6 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center">
              <h2 className="text-lg font-bold text-gray-900 dark:text-white">
                {editId ? "Edit Payment" : "Record Payment"}
              </h2>
              <button
                onClick={() => setShowModal(false)}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors"
              >
                <X size={20} className="text-gray-500" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Left Column: Payment Details */}
                <div className="space-y-4">
                  {/* Party Select */}
                  <div>
                    <label
                      htmlFor="payment_party_id"
                      className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300"
                    >
                      Party
                    </label>
                    <select
                      required
                      name="payment_party_id"
                      id="payment_party_id"
                      value={formData.party_id}
                      onChange={(e) =>
                        setFormData({ ...formData, party_id: e.target.value })
                      }
                      className="w-full px-4 py-2 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-sm focus:ring-2 focus:ring-purple-500 outline-none"
                    >
                      <option value="">Select Party</option>
                      {parties.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label
                        htmlFor="payment_date"
                        className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300"
                      >
                        Date
                      </label>
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
                        className="w-full px-4 py-2 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-sm outline-none"
                      />
                    </div>
                    <div>
                      <label
                        htmlFor="payment_amount"
                        className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300"
                      >
                        Amount
                      </label>
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
                        className="w-full px-4 py-2 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-sm outline-none font-bold"
                        placeholder="0.00"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label
                        htmlFor="payment_type"
                        className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300"
                      >
                        Type
                      </label>
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
                        className="w-full px-4 py-2 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-sm outline-none"
                      >
                        <option value="RECEIVED">Received (In)</option>
                        <option value="PAID">Paid (Out)</option>
                      </select>
                    </div>
                    <div>
                      <label
                        htmlFor="payment_mode"
                        className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300"
                      >
                        Mode
                      </label>
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
                        className="w-full px-4 py-2 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-sm outline-none"
                      >
                        <option value="CASH">Cash</option>
                        <option value="BANK_TRANSFER">Bank Transfer</option>
                        <option value="CHEQUE">Cheque</option>
                        <option value="UPI">UPI</option>
                        <option value="OTHER">Other</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label
                      htmlFor="payment_reference"
                      className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300"
                    >
                      Reference / Notes
                    </label>
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
                      className="w-full px-4 py-2 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-sm outline-none mb-2"
                      placeholder="Cheque No / Transaction ID"
                    />
                    <textarea
                      rows="2"
                      name="payment_notes"
                      id="payment_notes"
                      value={formData.notes}
                      onChange={(e) =>
                        setFormData({ ...formData, notes: e.target.value })
                      }
                      className="w-full px-4 py-2 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-sm outline-none"
                      placeholder="Additional notes..."
                    />
                  </div>
                </div>

                {/* Right Column: Settlement Section */}
                <div className="space-y-4">
                  {formData.payment_type === "RECEIVED" ? (
                    pendingInvoices.length > 0 ? (
                      <div className="bg-gray-50 dark:bg-gray-900 p-4 rounded-xl border border-gray-200 dark:border-gray-700 h-full flex flex-col">
                        <div className="flex justify-between items-center mb-3">
                          <h3 className="text-sm font-bold text-gray-700 dark:text-gray-300">
                            Settle Invoices
                          </h3>
                          <button
                            type="button"
                            onClick={handleAutoAllocate}
                            className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded hover:bg-blue-200"
                          >
                            Auto Allocate
                          </button>
                        </div>
                        <div className="overflow-y-auto space-y-2 flex-1 max-h-[400px]">
                          {pendingInvoices.map((inv) => {
                            const due =
                              parseFloat(inv.grand_total) -
                              parseFloat(inv.paid_amount || 0);
                            const isAllocated = !!allocations[inv.id];

                            return (
                              <div
                                key={inv.id}
                                className={`flex items-center gap-3 p-2 rounded-lg border ${
                                  isAllocated
                                    ? "border-green-500 bg-green-50 dark:bg-green-900/10"
                                    : "border-gray-200 dark:border-gray-700"
                                }`}
                              >
                                <input
                                  type="checkbox"
                                  checked={isAllocated}
                                  onChange={() => toggleAllocation(inv.id, due)}
                                  className="w-4 h-4 text-purple-600 rounded"
                                />
                                <div className="flex-1">
                                  <div className="flex justify-between text-xs">
                                    <span className="font-medium text-gray-900 dark:text-white">
                                      {inv.invoice_number}
                                    </span>
                                    <span className="text-gray-500">
                                      {inv.invoice_date}
                                    </span>
                                  </div>
                                  <div className="flex justify-between text-xs mt-1">
                                    <span className="text-gray-500">
                                      Total: ₹{inv.grand_total}
                                    </span>
                                    <span className="font-bold text-red-600">
                                      Due: ₹{due}
                                    </span>
                                  </div>
                                </div>
                                {isAllocated && (
                                  <input
                                    type="number"
                                    value={allocations[inv.id] || ""}
                                    onChange={(e) =>
                                      setAllocations({
                                        ...allocations,
                                        [inv.id]: e.target.value,
                                      })
                                    }
                                    className="w-20 px-2 py-1 text-right text-xs border rounded bg-white dark:bg-gray-800"
                                    onClick={(e) => e.stopPropagation()}
                                    name={`allocation_${inv.id}`}
                                    id={`allocation_${inv.id}`}
                                  />
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center justify-center h-full text-gray-400 text-sm border border-dashed border-gray-300 dark:border-gray-700 rounded-xl p-8">
                        No pending invoices
                      </div>
                    )
                  ) : (
                    <div className="flex items-center justify-center h-full text-gray-400 text-sm border border-dashed border-gray-300 dark:border-gray-700 rounded-xl p-8">
                      Settlement only for Received
                    </div>
                  )}
                </div>
              </div>

              <div className="mt-6">
                <button
                  type="submit"
                  className="w-full py-3 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-xl shadow-lg transition-all"
                >
                  {editId ? "Update Payment" : "Save Payment"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

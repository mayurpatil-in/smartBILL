import { useState, useEffect, Fragment } from "react";
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
  Building2,
  TrendingUp,
  Wallet,
  ChevronLeft,
  ChevronRight,
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
import { formatDate } from "../utils/dateUtils";

export default function PaymentList() {
  const [payments, setPayments] = useState([]);
  const [parties, setParties] = useState([]);
  const [loading, setLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [paymentsPerPage] = useState(10);
  const [searchTerm, setSearchTerm] = useState("");
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
        (a, b) => new Date(a.invoice_date) - new Date(b.invoice_date),
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
        0,
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
      setPayments(paymentsData.sort((a, b) => b.id - a.id));
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

  // Calculate stats
  const totalPayments = payments.length;
  const totalAmount = payments.reduce(
    (sum, p) => sum + Number(p.amount || 0),
    0,
  );
  const thisMonthAmount = payments
    .filter((p) => {
      const paymentDate = new Date(p.payment_date);
      const now = new Date();
      return (
        paymentDate.getMonth() === now.getMonth() &&
        paymentDate.getFullYear() === now.getFullYear()
      );
    })
    .reduce((sum, p) => sum + Number(p.amount || 0), 0);

  // Apply search filter
  const filteredPayments = payments.filter((payment) => {
    const matchesSearch =
      payment.party?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      payment.reference_number
        ?.toLowerCase()
        .includes(searchTerm.toLowerCase());
    return matchesSearch;
  });

  // Pagination
  const totalPages = Math.ceil(filteredPayments.length / paymentsPerPage);
  const startIndex = (currentPage - 1) * paymentsPerPage;
  const endIndex = startIndex + paymentsPerPage;
  const paginatedPayments = filteredPayments.slice(startIndex, endIndex);

  useEffect(() => {
    setCurrentPage(1);
  }, [filters, searchTerm]);

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-gray-900 to-gray-600 dark:from-white dark:to-gray-300 bg-clip-text text-transparent">
            Payments
          </h1>
          <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 mt-1">
            Track inward and outward payments
          </p>
        </div>
        <button
          onClick={handleCreate}
          className="group flex items-center justify-center gap-2 bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-700 hover:to-teal-800 text-white px-4 sm:px-6 py-2.5 sm:py-3 rounded-xl font-semibold transition-all duration-300 shadow-lg shadow-emerald-600/30 hover:shadow-xl hover:shadow-emerald-600/40 hover:scale-105 text-sm sm:text-base w-full md:w-auto"
        >
          <Plus
            size={18}
            className="group-hover:rotate-90 transition-transform duration-300 sm:w-5 sm:h-5"
          />
          Record Payment
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <StatCard
          label="Total Payments"
          value={totalPayments}
          icon={Wallet}
          color="blue"
        />
        <StatCard
          label="Total Amount"
          value={`₹${totalAmount.toLocaleString()}`}
          icon={IndianRupee}
          color="green"
        />
        <StatCard
          label="This Month"
          value={`₹${thisMonthAmount.toLocaleString()}`}
          icon={TrendingUp}
          color="purple"
        />
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-gray-800 p-5 rounded-2xl shadow-xl border border-gray-200 dark:border-gray-700">
        <div className="flex flex-col sm:flex-row items-center gap-3">
          {/* Search Bar */}
          <div className="relative group flex-1 w-full">
            <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/10 to-teal-500/10 rounded-xl opacity-0 group-focus-within:opacity-100 transition-opacity duration-300"></div>
            <div className="relative flex items-center gap-3 bg-white dark:bg-gray-900/80 rounded-xl px-5 py-3 border-2 border-gray-200 dark:border-gray-700 focus-within:border-emerald-500 dark:focus-within:border-emerald-500 transition-all duration-300 shadow-sm hover:shadow-md">
              <Search
                className="text-gray-400 group-focus-within:text-emerald-500 transition-colors duration-300"
                size={20}
              />
              <label htmlFor="payment_search" className="sr-only">
                Search Payments
              </label>
              <input
                type="text"
                name="payment_search"
                id="payment_search"
                placeholder="Search by party name or reference..."
                className="flex-1 bg-transparent border-none focus:ring-0 text-sm text-gray-900 dark:text-white placeholder-gray-400 outline-none"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
              {searchTerm && (
                <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/30 px-2 py-1 rounded-md">
                  {filteredPayments.length} found
                </span>
              )}
            </div>
          </div>

          {/* Filter Dropdowns */}
          <div className="w-full sm:w-48">
            <label htmlFor="filter_party_id" className="sr-only">
              Filter by Party
            </label>
            <select
              name="filter_party_id"
              id="filter_party_id"
              value={filters.party_id}
              onChange={(e) =>
                setFilters({ ...filters, party_id: e.target.value })
              }
              className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm font-medium text-gray-900 dark:text-white focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 outline-none transition-all hover:border-gray-300 dark:hover:border-gray-600"
            >
              <option value="">All Parties</option>
              {parties.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>
          <div className="w-full sm:w-48">
            <label htmlFor="filter_payment_type" className="sr-only">
              Filter by Payment Type
            </label>
            <select
              name="filter_payment_type"
              id="filter_payment_type"
              value={filters.payment_type}
              onChange={(e) =>
                setFilters({ ...filters, payment_type: e.target.value })
              }
              className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm font-medium text-gray-900 dark:text-white focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 outline-none transition-all hover:border-gray-300 dark:hover:border-gray-600"
            >
              <option value="">All Types</option>
              <option value="RECEIVED">Received (In)</option>
              <option value="PAID">Paid (Out)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-200 dark:border-gray-700 overflow-hidden backdrop-blur-sm">
        <div className="overflow-x-auto max-h-[calc(100vh-520px)] overflow-y-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-gradient-to-r from-gray-100 to-gray-50 dark:from-gray-700 dark:to-gray-700/80 text-gray-600 dark:text-gray-300 uppercase tracking-wider text-xs font-bold sticky top-0 z-10 backdrop-blur-sm shadow-md">
              <tr>
                <th className="px-6 py-4 whitespace-nowrap">Date</th>
                <th className="px-6 py-4 whitespace-nowrap">Party</th>
                <th className="px-6 py-4 whitespace-nowrap">Mode / Ref</th>
                <th className="px-6 py-4 whitespace-nowrap">Type</th>
                <th className="px-6 py-4 whitespace-nowrap text-right">
                  Amount
                </th>
                <th className="px-6 py-4 whitespace-nowrap">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700/50">
              {loading ? (
                <tr>
                  <td
                    colSpan="6"
                    className="px-6 py-12 text-center text-gray-500"
                  >
                    <div className="flex flex-col items-center gap-3">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600"></div>
                      <span className="text-sm font-medium">
                        Loading payments...
                      </span>
                    </div>
                  </td>
                </tr>
              ) : paginatedPayments.length === 0 ? (
                <tr>
                  <td
                    colSpan="6"
                    className="px-6 py-12 text-center text-gray-500"
                  >
                    <div className="flex flex-col items-center gap-2">
                      <Wallet
                        className="text-gray-300 dark:text-gray-600"
                        size={48}
                      />
                      <span className="text-sm font-medium">
                        No payments found.
                      </span>
                      <span className="text-xs text-gray-400">
                        Try adjusting your filters
                      </span>
                    </div>
                  </td>
                </tr>
              ) : (
                paginatedPayments.map((payment, index) => (
                  <tr
                    key={payment.id}
                    className="group hover:bg-gradient-to-r hover:from-emerald-50/50 hover:to-teal-50/30 dark:hover:from-emerald-900/10 dark:hover:to-teal-900/10 transition-all duration-300 hover:shadow-[inset_4px_0_0_0_rgb(16,185,129)]"
                    style={{
                      animation: `fadeInUp 0.4s ease-out ${index * 0.05}s both`,
                    }}
                  >
                    <td className="px-6 py-5">
                      <div className="flex items-center gap-2">
                        <div className="p-1.5 bg-blue-50 dark:bg-blue-900/30 rounded-md">
                          <Calendar
                            size={14}
                            className="text-blue-600 dark:text-blue-400"
                          />
                        </div>
                        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                          {formatDate(payment.payment_date)}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-5">
                      <div className="flex items-center gap-2">
                        <div className="p-1.5 bg-purple-50 dark:bg-purple-900/30 rounded-md">
                          <Building2
                            size={14}
                            className="text-purple-600 dark:text-purple-400"
                          />
                        </div>
                        <span className="font-semibold text-gray-900 dark:text-white">
                          {payment.party?.name}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-5">
                      <div className="flex items-center gap-2">
                        <div className="p-1.5 bg-amber-50 dark:bg-amber-900/30 rounded-md">
                          <CreditCard
                            size={14}
                            className="text-amber-600 dark:text-amber-400"
                          />
                        </div>
                        <div>
                          <span className="font-semibold text-xs bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded">
                            {payment.payment_mode}
                          </span>
                          {payment.reference_number && (
                            <div className="text-xs mt-1 text-gray-500 dark:text-gray-400">
                              Ref: {payment.reference_number}
                            </div>
                          )}
                        </div>
                      </div>
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
                    <td className="px-6 py-5 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <IndianRupee
                          size={14}
                          className="text-gray-500 dark:text-gray-400"
                        />
                        <span className="font-bold text-lg text-gray-900 dark:text-white">
                          {Number(payment.amount).toLocaleString("en-IN", {
                            minimumFractionDigits: 2,
                          })}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-5">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleEdit(payment)}
                          className="p-2 rounded-lg bg-green-50 hover:bg-green-100 dark:bg-green-900/30 dark:hover:bg-green-900/50 text-green-600 dark:text-green-400 transition-all duration-200 hover:scale-110 shadow-sm hover:shadow-md"
                          title="Edit Payment"
                        >
                          <Edit size={16} />
                        </button>
                        <button
                          onClick={() => handleDelete(payment.id)}
                          className="p-2 rounded-lg bg-red-50 hover:bg-red-100 dark:bg-red-900/30 dark:hover:bg-red-900/50 text-red-600 dark:text-red-400 transition-all duration-200 hover:scale-110 shadow-sm hover:shadow-md"
                          title="Delete Payment"
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

        {/* Pagination */}
        {payments.length > 0 && (
          <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 flex flex-col sm:flex-row items-center justify-between gap-4 bg-gradient-to-r from-gray-50 to-white dark:from-gray-800/50 dark:to-gray-800">
            <div className="flex items-center gap-4">
              <span className="text-sm text-gray-600 dark:text-gray-400">
                Showing{" "}
                <span className="font-bold text-emerald-600 dark:text-emerald-400">
                  {startIndex + 1}
                </span>{" "}
                to{" "}
                <span className="font-bold text-emerald-600 dark:text-emerald-400">
                  {Math.min(endIndex, payments.length)}
                </span>{" "}
                of{" "}
                <span className="font-bold text-gray-900 dark:text-white">
                  {payments.length}
                </span>{" "}
                payments
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setCurrentPage(currentPage - 1)}
                disabled={currentPage === 1}
                className="p-2.5 rounded-lg border-2 border-gray-200 dark:border-gray-700 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 hover:border-emerald-300 dark:hover:border-emerald-700 disabled:opacity-40 disabled:cursor-not-allowed transition-all duration-200"
              >
                <ChevronLeft
                  size={18}
                  className="text-gray-600 dark:text-gray-400"
                />
              </button>
              <div className="flex items-center gap-1">
                {Array.from({ length: totalPages }, (_, i) => i + 1)
                  .filter((page) => {
                    if (totalPages <= 7) return true;
                    if (page === 1 || page === totalPages) return true;
                    if (page >= currentPage - 1 && page <= currentPage + 1)
                      return true;
                    return false;
                  })
                  .map((page, index, array) => (
                    <Fragment key={page}>
                      {index > 0 && array[index - 1] !== page - 1 && (
                        <span
                          key={`ellipsis-${page}`}
                          className="px-2 text-gray-400 font-bold"
                        >
                          ...
                        </span>
                      )}
                      <button
                        key={page}
                        onClick={() => setCurrentPage(page)}
                        className={`min-w-[40px] h-10 px-3 rounded-lg font-bold text-sm transition-all duration-200 ${
                          currentPage === page
                            ? "bg-gradient-to-r from-emerald-600 to-teal-700 text-white shadow-lg shadow-emerald-500/40 scale-110"
                            : "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 hover:scale-105"
                        }`}
                      >
                        {page}
                      </button>
                    </Fragment>
                  ))}
              </div>
              <button
                onClick={() => setCurrentPage(currentPage + 1)}
                disabled={currentPage === totalPages}
                className="p-2.5 rounded-lg border-2 border-gray-200 dark:border-gray-700 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 hover:border-emerald-300 dark:hover:border-emerald-700 disabled:opacity-40 disabled:cursor-not-allowed transition-all duration-200"
              >
                <ChevronRight
                  size={18}
                  className="text-gray-600 dark:text-gray-400"
                />
              </button>
            </div>
          </div>
        )}
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
            <div className="relative p-4 sm:p-6 border-b border-gray-200 dark:border-gray-700 bg-gradient-to-r from-emerald-600 to-teal-700 overflow-hidden">
              {/* Background decoration */}
              <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -mr-32 -mt-32 hidden sm:block"></div>
              <div className="absolute bottom-0 left-0 w-48 h-48 bg-black/10 rounded-full -ml-24 -mb-24 hidden sm:block"></div>

              <div className="relative flex justify-between items-start sm:items-center gap-3">
                <div className="flex-1 min-w-0">
                  <h2 className="text-lg sm:text-xl md:text-2xl font-bold text-white flex items-center gap-2 sm:gap-3">
                    {editId ? (
                      <div className="p-1.5 sm:p-2 bg-white/20 rounded-lg backdrop-blur-sm flex-shrink-0">
                        <Edit size={20} className="text-white sm:w-6 sm:h-6" />
                      </div>
                    ) : (
                      <div className="p-1.5 sm:p-2 bg-white/20 rounded-lg backdrop-blur-sm flex-shrink-0">
                        <Plus size={20} className="text-white sm:w-6 sm:h-6" />
                      </div>
                    )}
                    <span className="truncate">
                      {editId ? "Edit Payment" : "Record New Payment"}
                    </span>
                  </h2>
                  <p className="text-xs sm:text-sm text-emerald-50 mt-1 sm:mt-2 ml-8 sm:ml-14">
                    {editId
                      ? "Update payment details and allocations"
                      : "Enter payment details and allocate to invoices"}
                  </p>
                </div>
                <button
                  onClick={() => setShowModal(false)}
                  className="p-1.5 sm:p-2 hover:bg-white/20 rounded-lg sm:rounded-xl transition-all duration-200 text-white hover:scale-110 backdrop-blur-sm flex-shrink-0"
                >
                  <X size={20} className="sm:w-6 sm:h-6" />
                </button>
              </div>
            </div>

            <form
              onSubmit={handleSubmit}
              className="flex-1 overflow-hidden flex flex-col md:flex-row"
            >
              {/* Left Column: Input Fields */}
              <div className="w-full md:w-5/12 p-6 overflow-y-auto border-r border-gray-100 dark:border-gray-700 space-y-5">
                {/* Party */}
                <div>
                  <label
                    htmlFor="payment_party_id"
                    className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5 uppercase tracking-wide"
                  >
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
                    <label
                      htmlFor="payment_date"
                      className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5 uppercase tracking-wide"
                    >
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
                    <label
                      htmlFor="payment_amount"
                      className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5 uppercase tracking-wide"
                    >
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
                    <label
                      htmlFor="payment_type"
                      className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5 uppercase tracking-wide"
                    >
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
                    <label
                      htmlFor="payment_mode"
                      className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5 uppercase tracking-wide"
                    >
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
                  <div className="space-y-3">
                    <div>
                      <label
                        htmlFor="payment_reference"
                        className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5 uppercase tracking-wide"
                      >
                        Reference Number
                      </label>
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
                    </div>
                    <div>
                      <label
                        htmlFor="payment_notes"
                        className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5 uppercase tracking-wide"
                      >
                        Notes
                      </label>
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
                                0,
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
                                            updated,
                                          ).reduce(
                                            (sum, amount) =>
                                              sum + (parseFloat(amount) || 0),
                                            0,
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

function StatCard({ label, value, icon: Icon, color }) {
  const colors = {
    blue: {
      bg: "bg-gradient-to-br from-blue-50 to-cyan-100 dark:from-blue-900/30 dark:to-cyan-800/20",
      iconBg: "bg-gradient-to-br from-blue-500 to-cyan-600",
      text: "text-blue-600 dark:text-blue-400",
      shadow: "shadow-blue-500/20 dark:shadow-blue-500/10",
      hoverShadow: "hover:shadow-blue-500/30 dark:hover:shadow-blue-500/20",
    },
    green: {
      bg: "bg-gradient-to-br from-green-50 to-emerald-100 dark:from-green-900/30 dark:to-emerald-800/20",
      iconBg: "bg-gradient-to-br from-green-500 to-emerald-600",
      text: "text-green-600 dark:text-green-400",
      shadow: "shadow-green-500/20 dark:shadow-green-500/10",
      hoverShadow: "hover:shadow-green-500/30 dark:hover:shadow-green-500/20",
    },
    purple: {
      bg: "bg-gradient-to-br from-purple-50 to-indigo-100 dark:from-purple-900/30 dark:to-indigo-800/20",
      iconBg: "bg-gradient-to-br from-purple-500 to-indigo-600",
      text: "text-purple-600 dark:text-purple-400",
      shadow: "shadow-purple-500/20 dark:shadow-purple-500/10",
      hoverShadow: "hover:shadow-purple-500/30 dark:hover:shadow-purple-500/20",
    },
  };

  const colorScheme = colors[color];

  return (
    <div
      className={`group relative ${colorScheme.bg} p-4 sm:p-6 rounded-2xl shadow-lg ${colorScheme.shadow} ${colorScheme.hoverShadow} border border-gray-200 dark:border-gray-700 transition-all duration-300 hover:scale-105 hover:-translate-y-1 overflow-hidden`}
    >
      <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 dark:bg-black/10 rounded-full -mr-16 -mt-16 group-hover:scale-150 transition-transform duration-500"></div>

      <div className="relative flex items-center gap-3 sm:gap-4">
        <div
          className={`p-3 sm:p-4 rounded-xl ${colorScheme.iconBg} shadow-lg group-hover:scale-110 group-hover:rotate-6 transition-all duration-300`}
        >
          <Icon size={24} className="text-white sm:w-7 sm:h-7" />
        </div>
        <div className="flex-1">
          <h3
            className={`text-xl sm:text-2xl font-bold ${colorScheme.text} tabular-nums group-hover:scale-105 transition-transform duration-300 origin-left`}
          >
            {value}
          </h3>
          <p className="text-[10px] sm:text-xs text-gray-500 dark:text-gray-500 font-semibold uppercase tracking-wider mt-1">
            {label}
          </p>
        </div>
      </div>
    </div>
  );
}

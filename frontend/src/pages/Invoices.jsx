import { useEffect, useState, Fragment } from "react";
import { useNavigate } from "react-router-dom";
import {
  Plus,
  Search,
  FileText,
  Printer,
  Edit,
  Trash2,
  BarChart3,
  TrendingUp,
  AlertCircle,
  CheckCircle,
  Calendar,
  Building2,
  Package,
  IndianRupee,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import toast from "react-hot-toast";
import api from "../api/axios";
import { getInvoices, deleteInvoice, getInvoiceStats } from "../api/invoices";
import { getParties } from "../api/parties";
import PdfPreviewModal from "../components/PdfPreviewModal";
import ConfirmDialog from "../components/ConfirmDialog";
import PermissionGuard from "../components/PermissionGuard";

export default function Invoices() {
  const navigate = useNavigate();
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [partyFilter, setPartyFilter] = useState("ALL");
  const [parties, setParties] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [invoicesPerPage] = useState(10);
  const [stats, setStats] = useState({
    total: { count: 0, amount: 0 },
    paid: { count: 0, amount: 0 },
    pending: { count: 0, amount: 0 },
  });

  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [selectedDeleteId, setSelectedDeleteId] = useState(null);

  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [previewTitle, setPreviewTitle] = useState("");

  useEffect(() => {
    fetchInvoices();
  }, []);

  const fetchInvoices = async () => {
    try {
      setLoading(true);
      const [invoicesData, statsData, partiesData] = await Promise.all([
        getInvoices(),
        getInvoiceStats(),
        getParties(),
      ]);
      setInvoices(invoicesData.sort((a, b) => b.id - a.id));
      setStats(statsData);
      setParties((partiesData || []).filter((p) => p.is_active));
    } catch (error) {
      console.error("Failed to fetch invoices", error);
      toast.error("Failed to load invoices");
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = async (invoiceId) => {
    try {
      const loadToast = toast.loading("Generating PDF...");

      const response = await api.get(`/invoice/${invoiceId}/print`, {
        responseType: "blob",
      });
      toast.dismiss(loadToast);

      const blob = new Blob([response.data], { type: "application/pdf" });

      if (blob.size < 100) {
        toast.error("Generated PDF is empty");
        return;
      }

      const url = window.URL.createObjectURL(blob);

      setPreviewUrl(url);
      setPreviewTitle(`Invoice #${invoiceId}`);
      setPreviewOpen(true);
    } catch (error) {
      console.error("Failed to generate PDF", error);
      toast.dismiss();
      toast.error("Failed to generate PDF");
    }
  };

  const handleDelete = (id) => {
    setSelectedDeleteId(id);
    setDeleteConfirmOpen(true);
  };

  const confirmDelete = async () => {
    if (!selectedDeleteId) return;
    try {
      await deleteInvoice(selectedDeleteId);
      toast.success("Invoice deleted successfully");
      fetchInvoices();
    } catch (error) {
      console.error(error);
      const msg = error.response?.data?.detail || "Failed to delete invoice";
      toast.error(msg);
    } finally {
      setDeleteConfirmOpen(false);
      setSelectedDeleteId(null);
    }
  };

  const filteredInvoices = invoices.filter((inv) => {
    const matchesSearch =
      inv.invoice_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      inv.party?.name?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = statusFilter === "ALL" || inv.status === statusFilter;

    const matchesParty =
      partyFilter === "ALL" || Number(inv.party_id) === Number(partyFilter);

    return matchesSearch && matchesStatus && matchesParty;
  });

  // Calculate dynamic stats based on filtered invoices
  const filteredStats = {
    total: {
      count: filteredInvoices.length,
      amount: filteredInvoices.reduce(
        (sum, inv) => sum + Number(inv.grand_total || 0),
        0
      ),
    },
    paid: {
      count: filteredInvoices.filter((inv) => inv.status === "PAID").length,
      amount: filteredInvoices
        .filter((inv) => inv.status === "PAID")
        .reduce((sum, inv) => sum + Number(inv.grand_total || 0), 0),
    },
    pending: {
      count: filteredInvoices.filter(
        (inv) => inv.status === "OPEN" || inv.status === "PARTIAL"
      ).length,
      amount: filteredInvoices
        .filter((inv) => inv.status === "OPEN" || inv.status === "PARTIAL")
        .reduce((sum, inv) => sum + Number(inv.grand_total || 0), 0),
    },
  };

  // Pagination
  const totalPages = Math.ceil(filteredInvoices.length / invoicesPerPage);
  const startIndex = (currentPage - 1) * invoicesPerPage;
  const endIndex = startIndex + invoicesPerPage;
  const paginatedInvoices = filteredInvoices.slice(startIndex, endIndex);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, statusFilter, partyFilter]);

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-gray-900 to-gray-600 dark:from-white dark:to-gray-300 bg-clip-text text-transparent">
            Invoices
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Manage and track all tax invoices
          </p>
        </div>
        <PermissionGuard permission="invoices.create">
          <button
            onClick={() => navigate("/invoices/new")}
            className="group flex items-center gap-2 bg-gradient-to-r from-indigo-600 to-purple-700 hover:from-indigo-700 hover:to-purple-800 text-white px-6 py-3 rounded-xl font-semibold transition-all duration-300 shadow-lg shadow-indigo-600/30 hover:shadow-xl hover:shadow-indigo-600/40 hover:scale-105"
          >
            <Plus
              size={20}
              className="group-hover:rotate-90 transition-transform duration-300"
            />
            Create Invoice
          </button>
        </PermissionGuard>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <StatCard
          label="Total Invoiced"
          value={`₹${filteredStats.total.amount.toLocaleString()}`}
          subValue={`${filteredStats.total.count} invoices`}
          icon={BarChart3}
          color="purple"
        />
        <StatCard
          label="Paid Amount"
          value={`₹${filteredStats.paid.amount.toLocaleString()}`}
          subValue={`${filteredStats.paid.count} invoices`}
          icon={CheckCircle}
          color="green"
        />
        <StatCard
          label="Pending Amount"
          value={`₹${filteredStats.pending.amount.toLocaleString()}`}
          subValue={`${filteredStats.pending.count} invoices`}
          icon={AlertCircle}
          color="orange"
        />
      </div>

      {/* Content */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-200 dark:border-gray-700 overflow-hidden backdrop-blur-sm">
        {/* Search and Filters */}
        <div className="p-5 border-b border-gray-200 dark:border-gray-700 bg-gradient-to-r from-gray-50 to-white dark:from-gray-800 dark:to-gray-800/50">
          <div className="flex flex-col sm:flex-row items-center gap-3">
            <div className="relative group flex-1 w-full">
              <div className="absolute inset-0 bg-gradient-to-r from-indigo-500/10 to-purple-500/10 rounded-xl opacity-0 group-focus-within:opacity-100 transition-opacity duration-300"></div>
              <div className="relative flex items-center gap-3 bg-white dark:bg-gray-900/80 rounded-xl px-5 py-3 border-2 border-gray-200 dark:border-gray-700 focus-within:border-indigo-500 dark:focus-within:border-indigo-500 transition-all duration-300 shadow-sm hover:shadow-md">
                <Search
                  className="text-gray-400 group-focus-within:text-indigo-500 transition-colors duration-300"
                  size={20}
                />
                <input
                  type="text"
                  name="invoice_search"
                  id="invoice_search"
                  placeholder="Search by invoice number or party..."
                  className="flex-1 bg-transparent border-none focus:ring-0 text-sm text-gray-900 dark:text-white placeholder-gray-400 outline-none"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
                {searchTerm && (
                  <span className="text-xs font-medium text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/30 px-2 py-1 rounded-md">
                    {filteredInvoices.length} found
                  </span>
                )}
              </div>
            </div>

            <div className="w-full sm:w-48">
              <select
                name="party_filter"
                id="party_filter"
                value={partyFilter}
                onChange={(e) => setPartyFilter(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm font-medium text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 outline-none transition-all hover:border-gray-300 dark:hover:border-gray-600"
              >
                <option value="ALL">All Parties</option>
                {parties.map((party) => (
                  <option key={party.id} value={party.id}>
                    {party.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="w-full sm:w-48">
              <select
                name="status_filter"
                id="status_filter"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm font-medium text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 outline-none transition-all hover:border-gray-300 dark:hover:border-gray-600"
              >
                <option value="ALL">All Status</option>
                <option value="OPEN">Open</option>
                <option value="PARTIAL">Partial</option>
                <option value="PAID">Paid</option>
              </select>
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto max-h-[calc(100vh-420px)] overflow-y-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-gradient-to-r from-gray-100 to-gray-50 dark:from-gray-700 dark:to-gray-700/80 text-gray-600 dark:text-gray-300 uppercase tracking-wider text-xs font-bold sticky top-0 z-10 backdrop-blur-sm shadow-md">
              <tr>
                <th className="px-6 py-4 whitespace-nowrap">Invoice No</th>
                <th className="px-6 py-4 whitespace-nowrap">Date</th>
                <th className="px-6 py-4 whitespace-nowrap">Party</th>
                <th className="px-6 py-4 whitespace-nowrap">Items</th>
                <th className="px-6 py-4 whitespace-nowrap text-right">
                  Amount
                </th>
                <th className="px-6 py-4 whitespace-nowrap">Status</th>
                <th className="px-6 py-4 whitespace-nowrap">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700/50">
              {loading ? (
                <tr>
                  <td
                    colSpan="7"
                    className="px-6 py-12 text-center text-gray-500"
                  >
                    <div className="flex flex-col items-center gap-3">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
                      <span className="text-sm font-medium">
                        Loading invoices...
                      </span>
                    </div>
                  </td>
                </tr>
              ) : paginatedInvoices.length > 0 ? (
                paginatedInvoices.map((inv, index) => (
                  <tr
                    key={inv.id}
                    className="group hover:bg-gradient-to-r hover:from-indigo-50/50 hover:to-purple-50/30 dark:hover:from-indigo-900/10 dark:hover:to-purple-900/10 transition-all duration-300 hover:shadow-[inset_4px_0_0_0_rgb(99,102,241)]"
                    style={{
                      animation: `fadeInUp 0.4s ease-out ${index * 0.05}s both`,
                    }}
                  >
                    <td className="px-6 py-5">
                      <div className="flex items-center gap-2">
                        <div className="p-1.5 bg-indigo-50 dark:bg-indigo-900/30 rounded-md">
                          <FileText
                            size={16}
                            className="text-indigo-600 dark:text-indigo-400"
                          />
                        </div>
                        <span className="font-bold text-gray-900 dark:text-white text-base group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors duration-200">
                          {inv.invoice_number}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-5">
                      <div className="flex items-center gap-2">
                        <div className="p-1.5 bg-blue-50 dark:bg-blue-900/30 rounded-md">
                          <Calendar
                            size={14}
                            className="text-blue-600 dark:text-blue-400"
                          />
                        </div>
                        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                          {new Date(inv.invoice_date).toLocaleDateString()}
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
                          {inv.party?.name}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-5">
                      <div className="flex items-center gap-2">
                        <div className="p-1.5 bg-amber-50 dark:bg-amber-900/30 rounded-md">
                          <Package
                            size={14}
                            className="text-amber-600 dark:text-amber-400"
                          />
                        </div>
                        <span
                          className="text-sm font-medium text-gray-700 dark:text-gray-300 max-w-xs truncate"
                          title={Array.from(
                            new Set(inv.items?.map((i) => i.item?.name))
                          ).join(", ")}
                        >
                          {Array.from(
                            new Set(inv.items?.map((i) => i.item?.name))
                          ).join(", ")}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-5 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <IndianRupee
                          size={14}
                          className="text-gray-500 dark:text-gray-400"
                        />
                        <span className="font-bold text-lg text-gray-900 dark:text-white">
                          {Number(inv.grand_total).toLocaleString()}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-5">
                      <span
                        className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold shadow-sm ${
                          inv.status === "PAID"
                            ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                            : inv.status === "PARTIAL"
                            ? "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400"
                            : inv.status === "OPEN"
                            ? "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"
                            : "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400"
                        }`}
                      >
                        <span
                          className={`w-2 h-2 rounded-full animate-pulse ${
                            inv.status === "PAID"
                              ? "bg-green-500 shadow-lg shadow-green-500/50"
                              : inv.status === "PARTIAL"
                              ? "bg-orange-500 shadow-lg shadow-orange-500/50"
                              : inv.status === "OPEN"
                              ? "bg-blue-500 shadow-lg shadow-blue-500/50"
                              : "bg-gray-500 shadow-lg shadow-gray-500/50"
                          }`}
                        ></span>
                        {inv.status || "DRAFT"}
                      </span>
                    </td>
                    <td className="px-6 py-5">
                      <div className="flex items-center gap-2">
                        <PermissionGuard permission="invoices.edit">
                          <button
                            onClick={() => navigate(`/invoices/${inv.id}/edit`)}
                            className="p-2 rounded-lg bg-green-50 hover:bg-green-100 dark:bg-green-900/30 dark:hover:bg-green-900/50 text-green-600 dark:text-green-400 transition-all duration-200 hover:scale-110 shadow-sm hover:shadow-md"
                            title="Edit Invoice"
                          >
                            <Edit size={16} />
                          </button>
                        </PermissionGuard>
                        <button
                          onClick={() => handlePrint(inv.id)}
                          className="p-2 rounded-lg bg-purple-50 hover:bg-purple-100 dark:bg-purple-900/30 dark:hover:bg-purple-900/50 text-purple-600 dark:text-purple-400 transition-all duration-200 hover:scale-110 shadow-sm hover:shadow-md"
                          title="Print PDF"
                        >
                          <Printer size={16} />
                        </button>
                        <PermissionGuard permission="invoices.delete">
                          <button
                            onClick={() => handleDelete(inv.id)}
                            className="p-2 rounded-lg bg-red-50 hover:bg-red-100 dark:bg-red-900/30 dark:hover:bg-red-900/50 text-red-600 dark:text-red-400 transition-all duration-200 hover:scale-110 shadow-sm hover:shadow-md"
                            title="Delete Invoice"
                          >
                            <Trash2 size={16} />
                          </button>
                        </PermissionGuard>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td
                    colSpan="7"
                    className="px-6 py-12 text-center text-gray-500"
                  >
                    <div className="flex flex-col items-center gap-2">
                      <FileText
                        className="text-gray-300 dark:text-gray-600"
                        size={48}
                      />
                      <span className="text-sm font-medium">
                        No invoices found.
                      </span>
                      <span className="text-xs text-gray-400">
                        Try adjusting your search or filters
                      </span>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {filteredInvoices.length > 0 && (
          <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 flex flex-col sm:flex-row items-center justify-between gap-4 bg-gradient-to-r from-gray-50 to-white dark:from-gray-800/50 dark:to-gray-800">
            <div className="flex items-center gap-4">
              <span className="text-sm text-gray-600 dark:text-gray-400">
                Showing{" "}
                <span className="font-bold text-indigo-600 dark:text-indigo-400">
                  {startIndex + 1}
                </span>{" "}
                to{" "}
                <span className="font-bold text-indigo-600 dark:text-indigo-400">
                  {Math.min(endIndex, filteredInvoices.length)}
                </span>{" "}
                of{" "}
                <span className="font-bold text-gray-900 dark:text-white">
                  {filteredInvoices.length}
                </span>{" "}
                invoices
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setCurrentPage(currentPage - 1)}
                disabled={currentPage === 1}
                className="p-2.5 rounded-lg border-2 border-gray-200 dark:border-gray-700 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 hover:border-indigo-300 dark:hover:border-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed transition-all duration-200"
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
                            ? "bg-gradient-to-r from-indigo-600 to-purple-700 text-white shadow-lg shadow-indigo-500/40 scale-110"
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
                className="p-2.5 rounded-lg border-2 border-gray-200 dark:border-gray-700 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 hover:border-indigo-300 dark:hover:border-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed transition-all duration-200"
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

      {previewOpen && (
        <PdfPreviewModal
          isOpen={previewOpen}
          onClose={() => setPreviewOpen(false)}
          pdfUrl={previewUrl}
          title={previewTitle || "Invoice Preview"}
        />
      )}

      <ConfirmDialog
        open={deleteConfirmOpen}
        title="Delete Invoice"
        message="Are you sure you want to delete this invoice? This action cannot be undone and will restore the items to your stock."
        confirmLabel="Delete Invoice"
        type="danger"
        onConfirm={confirmDelete}
        onCancel={() => setDeleteConfirmOpen(false)}
      />
    </div>
  );
}

function StatCard({ label, value, subValue, icon: Icon, color }) {
  const colors = {
    purple: {
      bg: "bg-gradient-to-br from-purple-50 to-indigo-100 dark:from-purple-900/30 dark:to-indigo-800/20",
      iconBg: "bg-gradient-to-br from-purple-500 to-indigo-600",
      text: "text-purple-600 dark:text-purple-400",
      shadow: "shadow-purple-500/20 dark:shadow-purple-500/10",
      hoverShadow: "hover:shadow-purple-500/30 dark:hover:shadow-purple-500/20",
    },
    green: {
      bg: "bg-gradient-to-br from-green-50 to-emerald-100 dark:from-green-900/30 dark:to-emerald-800/20",
      iconBg: "bg-gradient-to-br from-green-500 to-emerald-600",
      text: "text-green-600 dark:text-green-400",
      shadow: "shadow-green-500/20 dark:shadow-green-500/10",
      hoverShadow: "hover:shadow-green-500/30 dark:hover:shadow-green-500/20",
    },
    orange: {
      bg: "bg-gradient-to-br from-orange-50 to-amber-100 dark:from-orange-900/30 dark:to-amber-800/20",
      iconBg: "bg-gradient-to-br from-orange-500 to-amber-600",
      text: "text-orange-600 dark:text-orange-400",
      shadow: "shadow-orange-500/20 dark:shadow-orange-500/10",
      hoverShadow: "hover:shadow-orange-500/30 dark:hover:shadow-orange-500/20",
    },
  };

  const colorScheme = colors[color];

  return (
    <div
      className={`group relative ${colorScheme.bg} p-6 rounded-2xl shadow-lg ${colorScheme.shadow} ${colorScheme.hoverShadow} border border-gray-200 dark:border-gray-700 transition-all duration-300 hover:scale-105 hover:-translate-y-1 overflow-hidden`}
    >
      <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 dark:bg-black/10 rounded-full -mr-16 -mt-16 group-hover:scale-150 transition-transform duration-500"></div>

      <div className="relative flex items-center gap-4">
        <div
          className={`p-4 rounded-xl ${colorScheme.iconBg} shadow-lg group-hover:scale-110 group-hover:rotate-6 transition-all duration-300`}
        >
          <Icon size={28} className="text-white" />
        </div>
        <div className="flex-1">
          <h3
            className={`text-2xl font-bold ${colorScheme.text} tabular-nums group-hover:scale-105 transition-transform duration-300 origin-left`}
          >
            {value}
          </h3>
          <p className="text-xs text-gray-600 dark:text-gray-400 font-semibold mt-1">
            {subValue}
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-500 font-semibold uppercase tracking-wider mt-0.5">
            {label}
          </p>
        </div>
      </div>
    </div>
  );
}

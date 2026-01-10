import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Plus,
  Search,
  FileText,
  Printer,
  Eye,
  Trash2,
  BarChart3,
  TrendingUp,
  AlertCircle,
  CheckCircle,
} from "lucide-react";
import toast from "react-hot-toast";
import api from "../api/axios";
import { getInvoices, deleteInvoice, getInvoiceStats } from "../api/invoices";
import { getParties } from "../api/parties";
import PdfPreviewModal from "../components/PdfPreviewModal";
import ConfirmDialog from "../components/ConfirmDialog";

export default function Invoices() {
  const navigate = useNavigate();
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [partyFilter, setPartyFilter] = useState("ALL");
  const [parties, setParties] = useState([]);
  const [items, setItems] = useState([]);
  const [stats, setStats] = useState({
    total: { count: 0, amount: 0 },
    paid: { count: 0, amount: 0 },
    pending: { count: 0, amount: 0 },
  });

  // Confirm Dialog State
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [selectedDeleteId, setSelectedDeleteId] = useState(null);

  // PDF Preview State
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [previewTitle, setPreviewTitle] = useState("");

  useEffect(() => {
    fetchInvoices();
  }, []);

  const fetchInvoices = async () => {
    try {
      setLoading(true);
      setLoading(true);
      const [invoicesData, statsData, partiesData] = await Promise.all([
        getInvoices(),
        getInvoiceStats(),
        getParties(),
      ]);
      setInvoices(invoicesData);
      setStats(statsData);
      setParties(partiesData.filter((p) => p.is_active));
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

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Invoices
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Manage and view all tax invoices
          </p>
        </div>
        <button
          onClick={() => navigate("/invoices/new")}
          className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-semibold transition-colors shadow-lg shadow-purple-600/20"
        >
          <Plus size={20} />
          Create Invoice
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
              Total Invoiced
            </p>
            <h3 className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
              ₹{(stats.total.amount || 0).toLocaleString()}
            </h3>
            <p className="text-xs text-gray-400 mt-1">
              {stats.total.count} invoices
            </p>
          </div>
          <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900/30 rounded-xl flex items-center justify-center text-purple-600 dark:text-purple-400">
            <BarChart3 size={24} />
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
              Paid Amount
            </p>
            <h3 className="text-2xl font-bold text-green-600 dark:text-green-400 mt-1">
              ₹{(stats.paid.amount || 0).toLocaleString()}
            </h3>
            <p className="text-xs text-gray-400 mt-1">
              {stats.paid.count} invoices
            </p>
          </div>
          <div className="w-12 h-12 bg-green-100 dark:bg-green-900/30 rounded-xl flex items-center justify-center text-green-600 dark:text-green-400">
            <CheckCircle size={24} />
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
              Pending Amount
            </p>
            <h3 className="text-2xl font-bold text-orange-600 dark:text-orange-400 mt-1">
              ₹{(stats.pending.amount || 0).toLocaleString()}
            </h3>
            <p className="text-xs text-gray-400 mt-1">
              {stats.pending.count} invoices
            </p>
          </div>
          <div className="w-12 h-12 bg-orange-100 dark:bg-orange-900/30 rounded-xl flex items-center justify-center text-orange-600 dark:text-orange-400">
            <AlertCircle size={24} />
          </div>
        </div>
      </div>

      {/* Search & Filters */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="relative w-full max-w-md">
          <Search
            className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
            size={20}
          />
          <input
            type="text"
            placeholder="Search invoices..."
            name="invoice_search"
            id="invoice_search"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500 outline-none"
          />
        </div>
        <div className="flex flex-col sm:flex-row gap-4">
          {/* Party Filter */}
          <select
            value={partyFilter}
            onChange={(e) => setPartyFilter(e.target.value)}
            className="px-4 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500 outline-none cursor-pointer min-w-[150px]"
          >
            <option value="ALL">All Parties</option>
            {parties.map((party) => (
              <option key={party.id} value={party.id}>
                {party.name}
              </option>
            ))}
          </select>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-4 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500 outline-none cursor-pointer"
          >
            <option value="ALL">All Status</option>
            <option value="OPEN">Open</option>
            <option value="PARTIAL">Partial</option>
            <option value="PAID">Paid</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-gray-900 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
              <tr>
                <th className="px-6 py-3">Invoice No</th>
                <th className="px-6 py-3">Date</th>
                <th className="px-6 py-3">Party</th>
                <th className="px-6 py-3">Items</th>
                <th className="px-6 py-3 text-right">Amount</th>
                <th className="px-6 py-3 text-center">Status</th>
                <th className="px-6 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
              {loading ? (
                <tr>
                  <td colSpan="7" className="text-center py-8 text-gray-500">
                    Loading...
                  </td>
                </tr>
              ) : filteredInvoices.length > 0 ? (
                filteredInvoices.map((inv) => (
                  <tr
                    key={inv.id}
                    className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                  >
                    <td className="px-6 py-4 text-sm font-medium text-purple-600 dark:text-purple-400">
                      {inv.invoice_number}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-300">
                      {new Date(inv.invoice_date).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900 dark:text-white font-medium">
                      {inv.party?.name}
                    </td>
                    <td
                      className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400 max-w-xs truncate"
                      title={inv.items?.map((i) => i.item?.name).join(", ")}
                    >
                      {Array.from(
                        new Set(inv.items?.map((i) => i.item?.name))
                      ).join(", ")}
                    </td>
                    <td className="px-6 py-4 text-sm text-right font-bold text-gray-900 dark:text-white">
                      ₹{inv.grand_total}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span
                        className={`px-2 py-1 rounded-full text-xs font-semibold ${
                          inv.status === "PAID"
                            ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                            : inv.status === "PARTIAL"
                            ? "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400"
                            : inv.status === "OPEN"
                            ? "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"
                            : "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400"
                        }`}
                      >
                        {inv.status || "DRAFT"}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => navigate(`/invoices/${inv.id}/edit`)}
                          className="p-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          title="Edit Invoice"
                        >
                          <FileText size={18} />
                        </button>
                        <button
                          onClick={() => handlePrint(inv.id)}
                          className="p-2 text-gray-600 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition-colors"
                          title="Print PDF"
                        >
                          <Printer size={18} />
                        </button>
                        <button
                          onClick={() => handleDelete(inv.id)}
                          className="p-2 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          title="Delete Invoice"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="7" className="text-center py-8 text-gray-500">
                    No invoices found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* PDF Modal */}
      {previewOpen && (
        <PdfPreviewModal
          isOpen={previewOpen}
          onClose={() => setPreviewOpen(false)}
          pdfUrl={previewUrl}
          title={previewTitle || "Invoice Preview"}
        />
      )}
      {/* Confirm Dialog */}
      <ConfirmDialog
        open={deleteConfirmOpen}
        title="Delete Invoice"
        message="Are you sure you want to delete this invoice? This action cannot be undone and will restore the items to your stock."
        confirmLabel="Delete Invoice"
        onConfirm={confirmDelete}
        onCancel={() => setDeleteConfirmOpen(false)}
      />
    </div>
  );
}

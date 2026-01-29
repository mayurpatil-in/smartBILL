import { useEffect, useState } from "react";
import { useClientAuth } from "../../context/ClientAuthContext";
import {
  Download,
  Search,
  FileText,
  Filter,
  Calendar,
  IndianRupee,
  X,
  Clock,
} from "lucide-react";
import toast from "react-hot-toast";

export default function ClientInvoices() {
  const { client } = useClientAuth();
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [showFilters, setShowFilters] = useState(false);

  const fetchInvoices = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("client_token");
      const res = await fetch(
        `${import.meta.env.VITE_API_URL}/client/invoices`,
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );
      if (!res.ok) throw new Error("Failed to fetch invoices");
      const data = await res.json();
      setInvoices(data);
    } catch (err) {
      console.error(err);
      toast.error("Could not load invoices");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInvoices();
  }, []);

  const handleDownload = async (invoiceId, invoiceNumber) => {
    try {
      const token = localStorage.getItem("client_token");
      const res = await fetch(
        `${import.meta.env.VITE_API_URL}/client/invoices/${invoiceId}/download`,
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.detail || "Download failed");
      }

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `Invoice-${invoiceNumber}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
      toast.success("Download started");
    } catch (err) {
      toast.error(err.message);
    }
  };

  const filteredInvoices = invoices.filter((inv) => {
    const matchesSearch =
      inv.invoice_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      String(inv.grand_total).includes(searchTerm);

    const matchesStatus = statusFilter === "ALL" || inv.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  const stats = {
    total: invoices.length,
    paid: invoices.filter((inv) => inv.status === "PAID").length,
    pending: invoices.filter(
      (inv) => inv.status !== "PAID" && inv.status !== "CANCELLED",
    ).length,
    overdue: invoices.filter((inv) => inv.status === "OVERDUE").length,
  };

  return (
    <div className="space-y-6">
      {/* Header with Stats */}
      <div className="bg-gradient-to-br from-blue-600 to-indigo-700 rounded-2xl p-8 text-white shadow-xl">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold mb-2">My Invoices</h1>
            <p className="text-blue-100">Track and download your invoices</p>
          </div>
          <div className="hidden md:block p-4 bg-white/10 backdrop-blur-sm rounded-xl">
            <FileText className="w-8 h-8" />
          </div>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 hover:bg-white/20 transition-all duration-200 group">
            <div className="flex items-center gap-2 mb-2">
              <div className="p-1.5 bg-white/20 rounded-lg">
                <FileText className="w-4 h-4" />
              </div>
              <p className="text-blue-100 text-sm font-medium">Total</p>
            </div>
            <p className="text-3xl font-bold group-hover:scale-110 transition-transform">
              {stats.total}
            </p>
          </div>
          <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 hover:bg-white/20 transition-all duration-200 group">
            <div className="flex items-center gap-2 mb-2">
              <div className="p-1.5 bg-emerald-500/30 rounded-lg">
                <svg
                  className="w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5 13l4 4L19 7"
                  />
                </svg>
              </div>
              <p className="text-blue-100 text-sm font-medium">Paid</p>
            </div>
            <p className="text-3xl font-bold group-hover:scale-110 transition-transform">
              {stats.paid}
            </p>
          </div>
          <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 hover:bg-white/20 transition-all duration-200 group">
            <div className="flex items-center gap-2 mb-2">
              <div className="p-1.5 bg-amber-500/30 rounded-lg">
                <Clock className="w-4 h-4" />
              </div>
              <p className="text-blue-100 text-sm font-medium">Pending</p>
            </div>
            <p className="text-3xl font-bold group-hover:scale-110 transition-transform">
              {stats.pending}
            </p>
          </div>
          <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 hover:bg-white/20 transition-all duration-200 group">
            <div className="flex items-center gap-2 mb-2">
              <div className="p-1.5 bg-rose-500/30 rounded-lg">
                <svg
                  className="w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              </div>
              <p className="text-blue-100 text-sm font-medium">Overdue</p>
            </div>
            <p className="text-3xl font-bold text-rose-200 group-hover:scale-110 transition-transform">
              {stats.overdue}
            </p>
          </div>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-lg border border-gray-100 dark:border-gray-700">
        <div className="flex flex-col md:flex-row gap-4">
          {/* Search Bar */}
          <div className="relative flex-1">
            <Search
              className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"
              size={20}
            />
            <input
              type="text"
              placeholder="Search by invoice number or amount..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-12 pr-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
            />
          </div>

          {/* Filter Button */}
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`flex items-center gap-2 px-6 py-3 rounded-xl font-medium transition-all ${
              showFilters || statusFilter !== "ALL"
                ? "bg-blue-600 text-white shadow-lg"
                : "bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600"
            }`}
          >
            <Filter size={20} />
            Filters
            {statusFilter !== "ALL" && (
              <span className="bg-white/20 px-2 py-0.5 rounded-full text-xs">
                1
              </span>
            )}
          </button>
        </div>

        {/* Filter Options */}
        {showFilters && (
          <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Filter by Status
              </p>
              {statusFilter !== "ALL" && (
                <button
                  onClick={() => setStatusFilter("ALL")}
                  className="text-xs text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 font-medium flex items-center gap-1 transition-colors"
                >
                  <X size={14} />
                  Clear Filter
                </button>
              )}
            </div>
            <div className="flex flex-wrap gap-2">
              {["ALL", "PAID", "PENDING", "OVERDUE", "DRAFT"].map((status) => (
                <button
                  key={status}
                  onClick={() => setStatusFilter(status)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                    statusFilter === status
                      ? "bg-blue-600 text-white shadow-md scale-105"
                      : "bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600"
                  }`}
                >
                  {status}
                  {statusFilter === status && (
                    <span className="ml-1.5 inline-block w-1.5 h-1.5 bg-white rounded-full animate-pulse"></span>
                  )}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Invoices List */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-100 dark:border-gray-700 overflow-hidden">
        {loading ? (
          <div className="p-12 space-y-4">
            {[1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className="animate-pulse flex items-center gap-4 p-4 bg-gray-100 dark:bg-gray-700 rounded-xl"
              >
                <div className="w-12 h-12 bg-gray-200 dark:bg-gray-600 rounded-lg"></div>
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-gray-200 dark:bg-gray-600 rounded w-1/4"></div>
                  <div className="h-3 bg-gray-200 dark:bg-gray-600 rounded w-1/6"></div>
                </div>
                <div className="h-8 w-24 bg-gray-200 dark:bg-gray-600 rounded"></div>
              </div>
            ))}
          </div>
        ) : filteredInvoices.length === 0 ? (
          <div className="text-center py-16">
            <FileText className="w-16 h-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              No invoices found
            </h3>
            <p className="text-gray-500 dark:text-gray-400">
              {searchTerm || statusFilter !== "ALL"
                ? "Try adjusting your search or filters"
                : "You don't have any invoices yet"}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100 dark:divide-gray-700">
            {filteredInvoices.map((inv) => (
              <div
                key={inv.id}
                className="group p-6 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-all duration-200"
              >
                <div className="flex items-center justify-between gap-4">
                  {/* Invoice Info */}
                  <div className="flex items-center gap-4 flex-1">
                    <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-xl group-hover:scale-110 transition-transform">
                      <FileText
                        size={24}
                        className="text-blue-600 dark:text-blue-400"
                      />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-1">
                        <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                          {inv.invoice_number}
                        </h3>
                        <span
                          className={`text-xs uppercase font-bold px-3 py-1 rounded-full ${
                            inv.status === "PAID"
                              ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
                              : inv.status === "OVERDUE"
                                ? "bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400"
                                : "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
                          }`}
                        >
                          {inv.status}
                        </span>
                      </div>
                      <div className="flex items-center gap-4 text-sm text-gray-500 dark:text-gray-400">
                        <span className="flex items-center gap-1">
                          <Calendar size={14} />
                          {new Date(inv.invoice_date).toLocaleDateString(
                            "en-IN",
                            {
                              day: "numeric",
                              month: "short",
                              year: "numeric",
                            },
                          )}
                        </span>
                        <span className="flex items-center gap-1">
                          <IndianRupee size={14} />₹
                          {inv.grand_total.toLocaleString("en-IN")}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Amount and Action */}
                  <div className="flex items-center gap-4">
                    <div className="text-right hidden md:block">
                      <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">
                        Amount
                      </p>
                      <p className="text-2xl font-bold text-gray-900 dark:text-white">
                        ₹{inv.grand_total.toLocaleString("en-IN")}
                      </p>
                    </div>
                    <button
                      onClick={() => handleDownload(inv.id, inv.invoice_number)}
                      className="p-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl transition-all duration-200 hover:scale-105 shadow-lg hover:shadow-xl"
                      aria-label="Download invoice"
                    >
                      <Download size={20} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Results Count */}
      {!loading && filteredInvoices.length > 0 && (
        <div className="text-center text-sm text-gray-500 dark:text-gray-400">
          Showing {filteredInvoices.length} of {invoices.length} invoices
        </div>
      )}
    </div>
  );
}

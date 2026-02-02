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
  ChevronDown,
} from "lucide-react";
import toast from "react-hot-toast";

export default function ClientInvoices() {
  const { client } = useClientAuth();
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [showFilters, setShowFilters] = useState(false);
  const [downloadingId, setDownloadingId] = useState(null);
  const [financialYears, setFinancialYears] = useState([]);
  const [selectedFinancialYear, setSelectedFinancialYear] = useState("");
  const [showFYDropdown, setShowFYDropdown] = useState(false);

  const fetchInvoices = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("client_token");
      let url = `${import.meta.env.VITE_API_URL}/client/invoices`;

      // Add financial year parameter if selected
      if (selectedFinancialYear) {
        url += `?financial_year_id=${selectedFinancialYear}`;
      }

      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
      });
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

  const fetchFinancialYears = async () => {
    try {
      const token = localStorage.getItem("client_token");
      const res = await fetch(
        `${import.meta.env.VITE_API_URL}/client/financial-years`,
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );
      if (!res.ok) throw new Error("Failed to fetch financial years");
      const data = await res.json();
      setFinancialYears(data);

      // Set default to active financial year
      const activeFY = data.find((fy) => fy.is_active);
      if (activeFY) {
        setSelectedFinancialYear(activeFY.id);
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchFinancialYears();
  }, []);

  useEffect(() => {
    if (selectedFinancialYear !== null) {
      fetchInvoices();
    }
  }, [selectedFinancialYear]);

  const handleDownload = async (invoiceId, invoiceNumber) => {
    setDownloadingId(invoiceId);
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
      toast.success("Invoice downloaded successfully!");
    } catch (err) {
      toast.error(err.message);
    } finally {
      setDownloadingId(null);
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
      <div className="bg-gradient-to-br from-blue-600 to-indigo-700 rounded-2xl p-4 sm:p-6 md:p-8 text-white shadow-xl">
        <div className="flex items-center justify-between mb-4 sm:mb-6">
          <div>
            <h1 className="text-xl sm:text-2xl md:text-3xl font-bold mb-1 sm:mb-2">
              My Invoices
            </h1>
            <p className="text-blue-100 text-sm sm:text-base">
              Track and download your invoices
            </p>
          </div>
          <div className="hidden md:block p-4 bg-white/10 backdrop-blur-sm rounded-xl">
            <FileText className="w-8 h-8" />
          </div>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
          <div className="bg-white/10 backdrop-blur-sm rounded-xl p-3 sm:p-4 hover:bg-white/20 transition-all duration-200 group">
            <div className="flex items-center gap-2 mb-1 sm:mb-2">
              <div className="p-1 sm:p-1.5 bg-white/20 rounded-lg">
                <FileText className="w-3 h-3 sm:w-4 sm:h-4" />
              </div>
              <p className="text-blue-100 text-xs sm:text-sm font-medium">
                Total
              </p>
            </div>
            <p className="text-2xl sm:text-3xl font-bold">{stats.total}</p>
          </div>
          <div className="bg-white/10 backdrop-blur-sm rounded-xl p-3 sm:p-4 hover:bg-white/20 transition-all duration-200 group">
            <div className="flex items-center gap-2 mb-1 sm:mb-2">
              <div className="p-1 sm:p-1.5 bg-emerald-500/30 rounded-lg">
                <svg
                  className="w-3 h-3 sm:w-4 sm:h-4"
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
              <p className="text-blue-100 text-xs sm:text-sm font-medium">
                Paid
              </p>
            </div>
            <p className="text-2xl sm:text-3xl font-bold">{stats.paid}</p>
          </div>
          <div className="bg-white/10 backdrop-blur-sm rounded-xl p-3 sm:p-4 hover:bg-white/20 transition-all duration-200 group">
            <div className="flex items-center gap-2 mb-1 sm:mb-2">
              <div className="p-1 sm:p-1.5 bg-amber-500/30 rounded-lg">
                <Clock className="w-3 h-3 sm:w-4 sm:h-4" />
              </div>
              <p className="text-blue-100 text-xs sm:text-sm font-medium">
                Pending
              </p>
            </div>
            <p className="text-2xl sm:text-3xl font-bold">{stats.pending}</p>
          </div>
          <div className="bg-white/10 backdrop-blur-sm rounded-xl p-3 sm:p-4 hover:bg-white/20 transition-all duration-200 group">
            <div className="flex items-center gap-2 mb-1 sm:mb-2">
              <div className="p-1 sm:p-1.5 bg-rose-500/30 rounded-lg">
                <svg
                  className="w-3 h-3 sm:w-4 sm:h-4"
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
              <p className="text-blue-100 text-xs sm:text-sm font-medium">
                Overdue
              </p>
            </div>
            <p className="text-2xl sm:text-3xl font-bold text-rose-200">
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
              id="invoice-search"
              name="invoice-search"
              type="text"
              autoComplete="off"
              placeholder="Search by invoice number or amount..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-12 pr-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
            />
          </div>

          {/* Filter Button */}
          <div className="flex items-center gap-2 w-full sm:w-auto">
            {/* Financial Year Dropdown */}
            <div className="relative flex-1 sm:flex-none">
              <button
                onClick={() => setShowFYDropdown(!showFYDropdown)}
                className={`flex items-center justify-center gap-2 px-3 sm:px-4 py-3 rounded-xl font-medium transition-all w-full text-sm ${
                  selectedFinancialYear
                    ? "bg-blue-600 text-white shadow-lg"
                    : "bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600"
                }`}
              >
                <Calendar size={18} className="sm:w-5 sm:h-5" />
                <span className="hidden sm:inline truncate">
                  {selectedFinancialYear
                    ? financialYears.find(
                        (fy) => fy.id === selectedFinancialYear,
                      )?.year_name
                    : "All Years"}
                </span>
                <ChevronDown size={14} className="sm:w-4 sm:h-4" />
              </button>

              {showFYDropdown && (
                <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-gray-200 dark:border-gray-700 py-2 z-50">
                  <button
                    onClick={() => {
                      setSelectedFinancialYear("");
                      setShowFYDropdown(false);
                    }}
                    className={`w-full text-left px-4 py-2 text-sm transition-colors ${
                      selectedFinancialYear === ""
                        ? "bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 font-medium"
                        : "text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
                    }`}
                  >
                    All Years
                  </button>
                  {financialYears.map((fy) => (
                    <button
                      key={fy.id}
                      onClick={() => {
                        setSelectedFinancialYear(fy.id);
                        setShowFYDropdown(false);
                      }}
                      className={`w-full text-left px-4 py-2 text-sm transition-colors ${
                        selectedFinancialYear === fy.id
                          ? "bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 font-medium"
                          : "text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
                      }`}
                    >
                      {fy.year_name}
                      {fy.is_active && (
                        <span className="ml-2 text-xs bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 px-2 py-0.5 rounded-full">
                          Active
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>

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
              {["ALL", "PAID", "OPEN", "PENDING", "OVERDUE", "DRAFT"].map(
                (status) => (
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
                ),
              )}
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
          <div className="grid grid-cols-1 gap-4">
            {filteredInvoices.map((inv, index) => (
              <div
                key={inv.id}
                className="group bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-600 transition-all duration-300 overflow-hidden hover:shadow-xl"
                style={{ animationDelay: `${index * 50}ms` }}
              >
                <div className="p-6">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    {/* Left Section - Invoice Info */}
                    <div className="flex items-start md:items-center gap-4 flex-1">
                      {/* Icon */}
                      <div className="p-3 bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-xl border border-blue-100 dark:border-blue-800 group-hover:scale-110 transition-transform">
                        <FileText
                          size={24}
                          className="text-blue-600 dark:text-blue-400"
                        />
                      </div>

                      {/* Invoice Details */}
                      <div className="flex-1 min-w-0">
                        {/* Invoice Number & Status */}
                        <div className="flex flex-wrap items-center gap-2 mb-2">
                          <h3 className="text-lg md:text-xl font-bold text-gray-900 dark:text-white">
                            {inv.invoice_number}
                          </h3>
                          <span
                            className={`inline-flex items-center gap-1 text-xs uppercase font-bold px-3 py-1.5 rounded-full shadow-sm ${
                              inv.status === "PAID"
                                ? "bg-gradient-to-r from-emerald-500 to-green-600 text-white"
                                : inv.status === "OVERDUE"
                                  ? "bg-gradient-to-r from-rose-500 to-red-600 text-white"
                                  : inv.status === "OPEN"
                                    ? "bg-gradient-to-r from-blue-500 to-indigo-600 text-white"
                                    : "bg-gradient-to-r from-amber-500 to-orange-600 text-white"
                            }`}
                          >
                            {inv.status === "PAID" && (
                              <svg
                                className="w-3 h-3"
                                fill="currentColor"
                                viewBox="0 0 20 20"
                              >
                                <path
                                  fillRule="evenodd"
                                  d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                                  clipRule="evenodd"
                                />
                              </svg>
                            )}
                            {inv.status}
                          </span>
                        </div>

                        {/* Date & Amount Info */}
                        <div className="flex flex-wrap items-center gap-4 text-sm">
                          <span className="flex items-center gap-1.5 text-gray-600 dark:text-gray-400">
                            <Calendar size={16} className="text-gray-400" />
                            <span className="font-medium">
                              {new Date(inv.invoice_date).toLocaleDateString(
                                "en-IN",
                                {
                                  day: "numeric",
                                  month: "short",
                                  year: "numeric",
                                },
                              )}
                            </span>
                          </span>
                          <span className="flex items-center gap-1.5 text-gray-600 dark:text-gray-400">
                            <IndianRupee size={16} className="text-gray-400" />
                            <span className="font-semibold text-gray-900 dark:text-white">
                              ₹{inv.grand_total.toLocaleString("en-IN")}
                            </span>
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Right Section - Amount & Action */}
                    <div className="flex items-center justify-between md:justify-end gap-4 mt-4 md:mt-0">
                      {/* Amount Display - Desktop */}
                      <div className="hidden lg:block text-right">
                        <p className="text-xs text-gray-500 dark:text-gray-400 mb-1 uppercase tracking-wide">
                          Total Amount
                        </p>
                        <p className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                          ₹{inv.grand_total.toLocaleString("en-IN")}
                        </p>
                      </div>

                      {/* Download Button */}
                      <button
                        onClick={() =>
                          handleDownload(inv.id, inv.invoice_number)
                        }
                        disabled={downloadingId === inv.id}
                        className={`flex items-center gap-2 px-4 md:px-6 py-3 text-white rounded-xl font-medium transition-all duration-200 shadow-lg relative overflow-hidden ${
                          downloadingId === inv.id
                            ? "bg-blue-500 cursor-wait"
                            : "bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 hover:scale-105 hover:shadow-xl"
                        }`}
                        aria-label="Download invoice"
                      >
                        {downloadingId === inv.id ? (
                          <>
                            <svg
                              className="animate-spin h-5 w-5"
                              viewBox="0 0 24 24"
                              fill="none"
                            >
                              <circle
                                className="opacity-25"
                                cx="12"
                                cy="12"
                                r="10"
                                stroke="currentColor"
                                strokeWidth="4"
                              />
                              <path
                                className="opacity-75"
                                fill="currentColor"
                                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                              />
                            </svg>
                            <span className="hidden sm:inline">
                              Downloading...
                            </span>
                          </>
                        ) : (
                          <>
                            <Download
                              size={20}
                              className="animate-bounce-subtle"
                            />
                            <span className="hidden sm:inline">Download</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Bottom Border Accent */}
                <div
                  className={`h-1 ${
                    inv.status === "PAID"
                      ? "bg-gradient-to-r from-emerald-500 to-green-600"
                      : inv.status === "OVERDUE"
                        ? "bg-gradient-to-r from-rose-500 to-red-600"
                        : inv.status === "OPEN"
                          ? "bg-gradient-to-r from-blue-500 to-indigo-600"
                          : "bg-gradient-to-r from-amber-500 to-orange-600"
                  }`}
                />
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

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
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
import { motion } from "framer-motion";
import { exportToCSV } from "../../utils/csvExport";

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
  const [selectedInvoiceId, setSelectedInvoiceId] = useState(null);
  const [invoiceDetails, setInvoiceDetails] = useState(null);
  const [loadingDetails, setLoadingDetails] = useState(false);

  const fetchInvoiceDetails = async (invoiceId) => {
    setSelectedInvoiceId(invoiceId);
    setLoadingDetails(true);
    try {
      const token = localStorage.getItem("client_token");
      const res = await fetch(`${import.meta.env.VITE_API_URL}/client/invoices/${invoiceId}/details`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Failed to load invoice details");
      const data = await res.json();
      setInvoiceDetails(data);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setLoadingDetails(false);
    }
  };

  const handlePrintInvoice = async (invoiceId) => {
    try {
      const token = localStorage.getItem("client_token");
      const res = await fetch(`${import.meta.env.VITE_API_URL}/client/invoices/${invoiceId}/download`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Could not print invoice");
      const htmlText = await res.text();
      const printWindow = window.open("", "_blank");
      if (printWindow) {
        printWindow.document.write(htmlText);
        printWindow.document.close();
        printWindow.focus();
        setTimeout(() => printWindow.print(), 500);
      }
    } catch (err) {
      toast.error(err.message);
    }
  };

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

  // Close modal on ESC key press
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape" && selectedInvoiceId) {
        setSelectedInvoiceId(null);
        setInvoiceDetails(null);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [selectedInvoiceId]);

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
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || "Download failed");
      }

      const html = await res.text();
      const blob = new Blob([html], { type: "text/html" });
      const blobUrl = URL.createObjectURL(blob);
      const printWindow = window.open(blobUrl, "_blank");
      if (!printWindow) {
        toast.error("Popup blocked - please allow popups for this site");
        return;
      }
      printWindow.focus();
      setTimeout(() => {
        printWindow.print();
        URL.revokeObjectURL(blobUrl);
      }, 500);
      toast.success("Invoice opened — select 'Save as PDF' to download.", { duration: 5000 });
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

  const handleExportCSV = () => {
    if (!filteredInvoices.length) {
      toast.error("No invoices to export.");
      return;
    }
    // Prepare data for export
    const exportData = filteredInvoices.map(inv => ({
      "Invoice Number": inv.invoice_number,
      "Date": new Date(inv.invoice_date).toLocaleDateString("en-IN"),
      "Due Date": inv.due_date ? new Date(inv.due_date).toLocaleDateString("en-IN") : "N/A",
      "Status": inv.status,
      "Total Amount": inv.grand_total,
      "Total IGST": inv.total_igst,
      "Total CGST": inv.total_cgst,
      "Total SGST": inv.total_sgst,
    }));
    exportToCSV(exportData, `Invoices_Export_${new Date().toISOString().split('T')[0]}`);
    toast.success("Invoices exported to CSV!");
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    show: { opacity: 1, transition: { staggerChildren: 0.1 } }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 300, damping: 24 } }
  };

  return (
    <motion.div 
      className="space-y-6"
      variants={containerVariants}
      initial="hidden"
      animate="show"
    >
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
          <div className="grid grid-cols-2 sm:flex items-center gap-2 w-full md:w-auto">
            {/* Financial Year Dropdown */}
            <div className="relative col-span-2 sm:col-span-1 flex-1 sm:flex-none">
              <button
                onClick={() => setShowFYDropdown(!showFYDropdown)}
                className={`flex items-center justify-center gap-2 px-3 sm:px-4 py-3 rounded-xl font-medium transition-all w-full text-sm ${
                  selectedFinancialYear
                    ? "bg-blue-600 text-white shadow-lg"
                    : "bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600"
                }`}
              >
                <Calendar size={18} className="sm:w-5 sm:h-5" />
                <span className="truncate">
                  {selectedFinancialYear
                    ? financialYears.find(
                        (fy) => fy.id === selectedFinancialYear,
                      )?.year_name
                    : "All Years"}
                </span>
                <ChevronDown size={14} className="sm:w-4 sm:h-4" />
              </button>

              {showFYDropdown && (
                <div className="absolute right-0 mt-2 w-full sm:w-48 bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-gray-200 dark:border-gray-700 py-2 z-50">
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
              className={`flex items-center justify-center gap-1.5 sm:gap-2 px-2 sm:px-6 py-3 rounded-xl font-medium transition-all text-xs sm:text-sm ${
                showFilters || statusFilter !== "ALL"
                  ? "bg-blue-600 text-white shadow-lg"
                  : "bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600"
              }`}
            >
              <Filter size={18} className="sm:w-5 sm:h-5" />
              <span className="whitespace-nowrap">Filters</span>
              {statusFilter !== "ALL" && (
                <span className="bg-white/20 px-1.5 py-0.5 rounded-full text-[10px] sm:text-xs">
                  1
                </span>
              )}
            </button>
            <button
              onClick={handleExportCSV}
              className="flex items-center justify-center gap-1.5 sm:gap-2 px-2 sm:px-6 py-3 rounded-xl font-medium transition-all bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-200 dark:hover:bg-emerald-800/40 text-xs sm:text-sm"
            >
              <Download size={18} className="sm:w-5 sm:h-5" />
              <span className="whitespace-nowrap">Export CSV</span>
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
                )
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
          <div className="text-center py-20 bg-gray-50/50 dark:bg-gray-800/50 rounded-2xl">
            <div className="w-24 h-24 mx-auto mb-6 bg-gradient-to-br from-blue-100 to-indigo-100 dark:from-blue-900/30 dark:to-indigo-900/30 rounded-full flex items-center justify-center">
              <FileText className="w-10 h-10 text-blue-600 dark:text-blue-400" />
            </div>
            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
              No invoices found
            </h3>
            <p className="text-gray-500 dark:text-gray-400 max-w-sm mx-auto">
              {searchTerm || statusFilter !== "ALL"
                ? "Try adjusting your search or filters to find what you're looking for."
                : "You don't have any invoices yet. When invoices are generated, they will appear here."}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100 dark:divide-gray-700">
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
                    <div className="flex items-center justify-between md:justify-end gap-3 mt-4 md:mt-0 flex-wrap">
                      {/* Amount Display - Desktop */}
                      <div className="hidden lg:block text-right pr-2">
                        <p className="text-xs text-gray-500 dark:text-gray-400 mb-1 uppercase tracking-wide">
                          Total Amount
                        </p>
                        <p className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                          ₹{inv.grand_total.toLocaleString("en-IN")}
                        </p>
                      </div>

                      {/* View Details Button */}
                      <button
                        onClick={() => fetchInvoiceDetails(inv.id)}
                        className="px-3.5 py-2.5 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-800 dark:text-gray-200 text-xs font-semibold rounded-xl transition-all flex items-center gap-1.5"
                      >
                        <FileText size={14} className="text-indigo-600 dark:text-indigo-400" />
                        Details
                      </button>

                      {/* Download Button */}
                      <button
                        onClick={() =>
                          handleDownload(inv.id, inv.invoice_number)
                        }
                        disabled={downloadingId === inv.id}
                        className={`flex items-center gap-1.5 px-4 py-2.5 text-white rounded-xl text-xs font-semibold transition-all duration-200 shadow-md relative overflow-hidden ${
                          downloadingId === inv.id
                            ? "bg-blue-500 cursor-wait"
                            : "bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 hover:scale-105"
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

      {/* Invoice Details Modal (Portal to document.body) */}
      {selectedInvoiceId &&
        createPortal(
          <div
            onClick={(e) => {
              if (e.target === e.currentTarget) {
                setSelectedInvoiceId(null);
                setInvoiceDetails(null);
              }
            }}
            className="fixed inset-0 z-50 overflow-y-auto bg-black/70 backdrop-blur-md p-3 sm:p-6 flex items-start justify-center animate-fadeIn"
          >
            <div className="relative w-full max-w-2xl bg-white dark:bg-gray-800 rounded-2xl sm:rounded-3xl shadow-2xl border border-gray-200 dark:border-gray-700 flex flex-col my-auto max-h-[88vh] overflow-hidden">
              {/* Sticky Header */}
              <div className="sticky top-0 z-20 shrink-0 p-4 sm:p-5 bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 text-white flex items-center justify-between shadow-md">
                <div className="pr-4 min-w-0">
                  <h2 className="text-base sm:text-lg md:text-xl font-bold truncate">
                    {loadingDetails ? "Loading Invoice..." : `Invoice Details - ${invoiceDetails?.invoice_number || ""}`}
                  </h2>
                  <p className="text-xs text-blue-100 mt-0.5">Itemized statement breakdown</p>
                </div>
                <button
                  onClick={() => {
                    setSelectedInvoiceId(null);
                    setInvoiceDetails(null);
                  }}
                  className="p-2 rounded-xl bg-white/10 hover:bg-white/25 text-white transition-all flex items-center justify-center border border-white/20 flex-shrink-0"
                  aria-label="Close modal"
                >
                  <X className="w-5 h-5 text-white" />
                </button>
              </div>

              {/* Scrollable Content Body */}
              <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5">
                {loadingDetails || !invoiceDetails ? (
                  <div className="space-y-4 animate-pulse p-4">
                    <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-1/3"></div>
                    <div className="h-20 bg-gray-200 dark:bg-gray-700 rounded-xl"></div>
                    <div className="h-40 bg-gray-200 dark:bg-gray-700 rounded-xl"></div>
                  </div>
                ) : (
                  <>
                    {/* Status & Overview Bar */}
                    <div className="p-3.5 sm:p-4 bg-gray-50 dark:bg-gray-900/60 rounded-2xl border border-gray-100 dark:border-gray-700 flex flex-wrap justify-between items-center gap-3">
                      <div>
                        <span className="text-[11px] text-gray-500 dark:text-gray-400 block mb-0.5">Invoice Date</span>
                        <span className="font-semibold text-gray-900 dark:text-white text-xs sm:text-sm">
                          {new Date(invoiceDetails.invoice_date).toLocaleDateString("en-IN", {
                            day: "numeric",
                            month: "short",
                            year: "numeric",
                          })}
                        </span>
                      </div>
                      {invoiceDetails.due_date && (
                        <div>
                          <span className="text-[11px] text-gray-500 dark:text-gray-400 block mb-0.5">Due Date</span>
                          <span className="font-semibold text-gray-900 dark:text-white text-xs sm:text-sm">
                            {new Date(invoiceDetails.due_date).toLocaleDateString("en-IN", {
                              day: "numeric",
                              month: "short",
                              year: "numeric",
                            })}
                          </span>
                        </div>
                      )}
                      <div>
                        <span className="text-[11px] text-gray-500 dark:text-gray-400 block mb-0.5">Status</span>
                        <span
                          className={`text-xs uppercase font-bold px-3 py-1 rounded-full ${
                            invoiceDetails.status === "PAID"
                              ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
                              : invoiceDetails.status === "OVERDUE"
                                ? "bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400"
                                : "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"
                          }`}
                        >
                          {invoiceDetails.status}
                        </span>
                      </div>
                    </div>

                    {/* Vendor Company Info */}
                    {invoiceDetails.company && (
                      <div className="p-3.5 sm:p-4 bg-blue-50/50 dark:bg-blue-900/10 rounded-2xl border border-blue-100 dark:border-blue-900/30">
                        <h4 className="text-[10px] font-bold text-blue-900 dark:text-blue-300 uppercase tracking-wider mb-1">Billed By</h4>
                        <p className="font-bold text-xs sm:text-sm text-gray-900 dark:text-white">{invoiceDetails.company.name}</p>
                        {invoiceDetails.company.gst_number && (
                          <p className="text-xs text-gray-600 dark:text-gray-400 mt-0.5 font-mono">GSTIN: {invoiceDetails.company.gst_number}</p>
                        )}
                        {invoiceDetails.company.address && (
                          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{invoiceDetails.company.address}</p>
                        )}
                      </div>
                    )}

                    {/* Itemized Table */}
                    <div>
                      <h4 className="text-xs sm:text-sm font-bold text-gray-900 dark:text-white mb-2.5">Itemized Particulars</h4>
                      <div className="border border-gray-200 dark:border-gray-700 rounded-2xl overflow-x-auto shadow-sm">
                        <table className="w-full text-left text-xs min-w-[320px]">
                          <thead className="bg-gray-50 dark:bg-gray-900/70 text-gray-500 dark:text-gray-400 uppercase font-semibold border-b border-gray-200 dark:border-gray-700 text-[10px]">
                            <tr>
                              <th className="p-2.5 sm:p-3">Item Particulars</th>
                              <th className="p-2.5 sm:p-3 text-right">Qty</th>
                              <th className="p-2.5 sm:p-3 text-right">Rate</th>
                              <th className="p-2.5 sm:p-3 text-right">GST %</th>
                              <th className="p-2.5 sm:p-3 text-right">Amount</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                            {invoiceDetails.items?.map((it) => (
                              <tr key={it.id} className="hover:bg-gray-50/50 dark:hover:bg-gray-700/30">
                                <td className="p-2.5 sm:p-3">
                                  <span className="font-bold text-gray-900 dark:text-white block text-xs">{it.item_name}</span>
                                  {it.hsn_code && <span className="text-[10px] text-gray-400">HSN: {it.hsn_code}</span>}
                                </td>
                                <td className="p-2.5 sm:p-3 text-right font-medium whitespace-nowrap">{it.quantity} {it.unit}</td>
                                <td className="p-2.5 sm:p-3 text-right font-medium whitespace-nowrap">₹{it.rate.toLocaleString("en-IN")}</td>
                                <td className="p-2.5 sm:p-3 text-right text-gray-500 whitespace-nowrap">{it.gst_rate}%</td>
                                <td className="p-2.5 sm:p-3 text-right font-bold text-gray-900 dark:text-white whitespace-nowrap">₹{it.amount.toLocaleString("en-IN")}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>

                    {/* Totals Breakdown */}
                    <div className="bg-gray-50 dark:bg-gray-900/60 p-3.5 sm:p-4 rounded-2xl border border-gray-100 dark:border-gray-700 space-y-2 text-xs">
                      <div className="flex justify-between text-gray-600 dark:text-gray-400">
                        <span>Subtotal (Taxable)</span>
                        <span className="font-semibold">₹{invoiceDetails.subtotal.toLocaleString("en-IN")}</span>
                      </div>
                      <div className="flex justify-between text-gray-600 dark:text-gray-400">
                        <span>Total Tax (GST)</span>
                        <span className="font-semibold">₹{invoiceDetails.gst_amount.toLocaleString("en-IN")}</span>
                      </div>
                      {invoiceDetails.discount_amount > 0 && (
                        <div className="flex justify-between text-emerald-600">
                          <span>Discount</span>
                          <span className="font-semibold">-₹{invoiceDetails.discount_amount.toLocaleString("en-IN")}</span>
                        </div>
                      )}
                      {invoiceDetails.round_off !== 0 && (
                        <div className="flex justify-between text-gray-500">
                          <span>Round Off</span>
                          <span>₹{invoiceDetails.round_off.toFixed(2)}</span>
                        </div>
                      )}
                      <div className="flex justify-between text-xs sm:text-sm font-bold text-gray-900 dark:text-white pt-2 border-t border-gray-200 dark:border-gray-700">
                        <span>Grand Total</span>
                        <span className="text-blue-600 dark:text-blue-400">₹{invoiceDetails.grand_total.toLocaleString("en-IN")}</span>
                      </div>
                    </div>
                  </>
                )}
              </div>

              {/* Sticky Footer Actions */}
              {invoiceDetails && (
                <div className="sticky bottom-0 z-20 shrink-0 p-3.5 sm:p-4 border-t border-gray-200 dark:border-gray-700 flex flex-col sm:flex-row gap-2.5 bg-gray-50 dark:bg-gray-900">
                  <button
                    onClick={() => handlePrintInvoice(invoiceDetails.id)}
                    className="flex-1 py-2.5 px-4 bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-800 dark:text-gray-200 text-xs font-semibold rounded-xl transition-colors flex items-center justify-center gap-1.5"
                  >
                    <FileText size={16} />
                    Print View
                  </button>
                  <button
                    onClick={() => handleDownload(invoiceDetails.id, invoiceDetails.invoice_number)}
                    className="flex-1 py-2.5 px-4 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-xl transition-colors shadow-md flex items-center justify-center gap-1.5"
                  >
                    <Download size={16} />
                    Download PDF
                  </button>
                </div>
              )}
            </div>
          </div>,
          document.body,
        )}
    </motion.div>
  );
}

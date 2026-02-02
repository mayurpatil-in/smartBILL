import { useState, useEffect } from "react";
import {
  format,
  subMonths,
  startOfMonth,
  endOfMonth,
  startOfYear,
  endOfYear,
} from "date-fns";
import {
  Calendar,
  Download,
  FileText,
  Wallet,
  TrendingUp,
  TrendingDown,
  Printer,
  RefreshCw,
  Filter,
  ChevronDown,
} from "lucide-react";
import toast from "react-hot-toast";

export default function ClientLedger() {
  const [loading, setLoading] = useState(true);
  const [ledgerData, setLedgerData] = useState({
    items: [],
    opening_balance: 0,
    closing_balance: 0,
  });
  const [dateRange, setDateRange] = useState({
    start: "",
    end: "",
  });
  const [activePreset, setActivePreset] = useState("");
  const [financialYears, setFinancialYears] = useState([]);
  const [selectedFinancialYear, setSelectedFinancialYear] = useState("");
  const [showFYDropdown, setShowFYDropdown] = useState(false);

  const fetchLedger = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("client_token");
      let url = `${import.meta.env.VITE_API_URL}/client/ledger`;

      const params = new URLSearchParams();
      if (dateRange.start) params.append("start_date", dateRange.start);
      if (dateRange.end) params.append("end_date", dateRange.end);
      if (selectedFinancialYear)
        params.append("financial_year_id", selectedFinancialYear);

      if (params.toString()) url += `?${params.toString()}`;

      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) throw new Error("Failed to load ledger");

      const data = await res.json();
      setLedgerData(data);
    } catch (err) {
      console.error(err);
      toast.error("Could not load ledger");
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
      fetchLedger();
    }
  }, [selectedFinancialYear]);

  // Date Preset Functions
  const applyDatePreset = (preset) => {
    const today = new Date();
    let start, end;

    switch (preset) {
      case "thisMonth":
        start = startOfMonth(today);
        end = endOfMonth(today);
        break;
      case "lastMonth":
        start = startOfMonth(subMonths(today, 1));
        end = endOfMonth(subMonths(today, 1));
        break;
      case "last3Months":
        start = startOfMonth(subMonths(today, 2));
        end = endOfMonth(today);
        break;
      case "thisYear":
        start = startOfYear(today);
        end = endOfYear(today);
        break;
      case "all":
        start = null;
        end = null;
        break;
      default:
        return;
    }

    setDateRange({
      start: start ? format(start, "yyyy-MM-dd") : "",
      end: end ? format(end, "yyyy-MM-dd") : "",
    });
    setActivePreset(preset);
  };

  // Calculate period statistics
  const periodStats = {
    totalInvoiced: ledgerData.items
      .filter((item) => item.type === "INVOICE")
      .reduce((sum, item) => sum + item.debit, 0),
    totalPaid: ledgerData.items
      .filter((item) => item.type === "PAYMENT")
      .reduce((sum, item) => sum + item.credit, 0),
    transactionCount: ledgerData.items.length,
    netChange: ledgerData.closing_balance - ledgerData.opening_balance,
  };

  // Export to CSV
  const exportToCSV = () => {
    const headers = [
      "Date",
      "Type",
      "Reference",
      "Description",
      "Debit",
      "Credit",
      "Balance",
    ];
    const rows = ledgerData.items.map((item) => [
      format(new Date(item.date), "dd/MM/yyyy"),
      item.type,
      item.ref_number,
      item.description,
      item.debit || 0,
      item.credit || 0,
      item.balance,
    ]);

    const csvContent = [
      headers.join(","),
      ...rows.map((row) => row.join(",")),
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `Statement_${format(new Date(), "yyyy-MM-dd")}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
    toast.success("Statement exported successfully");
  };

  // Print functionality
  const handlePrint = () => {
    window.print();
    toast.success("Opening print dialog...");
  };

  return (
    <div className="space-y-6">
      {/* Print-only Header */}
      <div className="hidden print:block mb-8">
        <div className="text-center border-b-2 border-gray-800 pb-4 mb-4">
          <h1 className="text-2xl font-bold text-gray-900">
            STATEMENT OF ACCOUNT
          </h1>
          <p className="text-sm text-gray-600 mt-1">
            {dateRange.start && dateRange.end
              ? `Period: ${format(new Date(dateRange.start), "dd MMM yyyy")} to ${format(new Date(dateRange.end), "dd MMM yyyy")}`
              : "All Transactions"}
          </p>
          <p className="text-xs text-gray-500 mt-1">
            Generated on: {format(new Date(), "dd MMM yyyy, hh:mm a")}
          </p>
        </div>
        <div className="grid grid-cols-2 gap-4 mb-4 text-sm">
          <div>
            <p className="font-semibold text-gray-700">Opening Balance:</p>
            <p className="text-lg font-bold">
              ₹{ledgerData.opening_balance.toLocaleString("en-IN")}
            </p>
          </div>
          <div className="text-right">
            <p className="font-semibold text-gray-700">Closing Balance:</p>
            <p className="text-lg font-bold">
              ₹{ledgerData.closing_balance.toLocaleString("en-IN")}
            </p>
          </div>
        </div>
      </div>

      {/* Header */}
      <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-800 dark:text-white flex items-center gap-2">
            <Wallet className="text-blue-600 w-5 h-5 sm:w-6 sm:h-6" />
            Statement of Account
          </h1>
          <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 mt-1">
            View your complete transaction history
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2 print:hidden w-full md:w-auto">
          <button
            onClick={fetchLedger}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
            title="Refresh"
          >
            <RefreshCw size={18} className="text-gray-600 dark:text-gray-400" />
          </button>
          <button
            onClick={exportToCSV}
            className="flex items-center gap-2 px-3 md:px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition-colors text-sm font-medium flex-1 md:flex-initial justify-center"
          >
            <Download size={16} />
            <span className="hidden sm:inline">Export CSV</span>
            <span className="sm:hidden">Export</span>
          </button>
          <button
            onClick={handlePrint}
            className="flex items-center gap-2 px-3 md:px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-colors text-sm font-medium flex-1 md:flex-initial justify-center"
          >
            <Printer size={16} />
            <span className="hidden sm:inline">Print</span>
          </button>
        </div>
      </div>

      {/* Date Presets */}
      <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-200 dark:border-gray-700 print:hidden">
        <div className="flex items-center gap-2 mb-3">
          <Filter size={16} className="text-gray-500" />
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
            Quick Filters
          </span>
        </div>
        <div className="flex flex-wrap gap-2">
          {[
            { id: "all", label: "All Time" },
            { id: "thisMonth", label: "This Month" },
            { id: "lastMonth", label: "Last Month" },
            { id: "last3Months", label: "Last 3 Months" },
            { id: "thisYear", label: "This Year" },
          ].map((preset) => (
            <button
              key={preset.id}
              onClick={() => {
                applyDatePreset(preset.id);
                fetchLedger();
              }}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                activePreset === preset.id
                  ? "bg-blue-600 text-white shadow-md"
                  : "bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600"
              }`}
            >
              {preset.label}
            </button>
          ))}

          {/* Financial Year Dropdown */}
          <div className="relative w-full sm:w-auto sm:ml-auto">
            <button
              onClick={() => setShowFYDropdown(!showFYDropdown)}
              className={`flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all w-full sm:w-auto ${
                selectedFinancialYear
                  ? "bg-blue-600 text-white shadow-md"
                  : "bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600"
              }`}
            >
              <Calendar size={16} />
              <span className="truncate">
                {selectedFinancialYear
                  ? financialYears.find((fy) => fy.id === selectedFinancialYear)
                      ?.year_name
                  : "All Years"}
              </span>
              <ChevronDown size={14} />
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
        </div>

        {/* Custom Date Range */}
        <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-2 mb-3">
            <Calendar size={16} className="text-gray-500" />
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Custom Range:
            </span>
          </div>
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
            <input
              id="date-range-start"
              name="date-range-start"
              type="date"
              autoComplete="off"
              className="px-3 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-900 outline-none focus:ring-2 focus:ring-blue-500 flex-1"
              value={dateRange.start}
              onChange={(e) => {
                setDateRange({ ...dateRange, start: e.target.value });
                setActivePreset("");
              }}
            />
            <span className="text-gray-400 text-center sm:inline hidden">
              to
            </span>
            <input
              id="date-range-end"
              name="date-range-end"
              type="date"
              autoComplete="off"
              className="px-3 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-900 outline-none focus:ring-2 focus:ring-blue-500 flex-1"
              value={dateRange.end}
              onChange={(e) => {
                setDateRange({ ...dateRange, end: e.target.value });
                setActivePreset("");
              }}
            />
            <button
              onClick={fetchLedger}
              className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors font-medium whitespace-nowrap"
            >
              Apply
            </button>
          </div>
        </div>
      </div>

      {/* Enhanced Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-gradient-to-br from-gray-800 to-gray-900 text-white p-4 sm:p-6 rounded-2xl shadow-lg">
          <div className="flex items-center justify-between mb-2">
            <p className="text-gray-400 text-xs sm:text-sm">Opening Balance</p>
            <Wallet size={18} className="text-gray-400 sm:w-5 sm:h-5" />
          </div>
          <p className="text-2xl sm:text-3xl font-bold">
            ₹{ledgerData.opening_balance.toLocaleString("en-IN")}
          </p>
        </div>

        <div className="bg-gradient-to-br from-rose-600 to-red-700 text-white p-4 sm:p-6 rounded-2xl shadow-lg">
          <div className="flex items-center justify-between mb-2">
            <p className="text-white/80 text-xs sm:text-sm">Total Invoiced</p>
            <TrendingUp size={18} className="text-white/80 sm:w-5 sm:h-5" />
          </div>
          <p className="text-2xl sm:text-3xl font-bold">
            ₹{periodStats.totalInvoiced.toLocaleString("en-IN")}
          </p>
          <p className="text-xs text-white/60 mt-1">
            {ledgerData.items.filter((i) => i.type === "INVOICE").length}{" "}
            invoices
          </p>
        </div>

        <div className="bg-gradient-to-br from-emerald-600 to-green-700 text-white p-4 sm:p-6 rounded-2xl shadow-lg">
          <div className="flex items-center justify-between mb-2">
            <p className="text-white/80 text-xs sm:text-sm">Total Paid</p>
            <TrendingDown size={18} className="text-white/80 sm:w-5 sm:h-5" />
          </div>
          <p className="text-2xl sm:text-3xl font-bold">
            ₹{periodStats.totalPaid.toLocaleString("en-IN")}
          </p>
          <p className="text-xs text-white/60 mt-1">
            {ledgerData.items.filter((i) => i.type === "PAYMENT").length}{" "}
            payments
          </p>
        </div>

        <div
          className={`p-4 sm:p-6 rounded-2xl shadow-lg text-white ${
            ledgerData.closing_balance > 0
              ? "bg-gradient-to-br from-amber-600 to-orange-700"
              : "bg-gradient-to-br from-blue-600 to-indigo-700"
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <p className="text-white/80 text-xs sm:text-sm">Closing Balance</p>
            <FileText size={18} className="text-white/80 sm:w-5 sm:h-5" />
          </div>
          <p className="text-2xl sm:text-3xl font-bold">
            ₹{ledgerData.closing_balance.toLocaleString("en-IN")}
          </p>
          <p className="text-xs text-white/60 mt-1">
            {periodStats.transactionCount} transactions
          </p>
        </div>
      </div>

      {/* Ledger Table */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-100 dark:border-gray-700 overflow-hidden">
        {loading ? (
          <div className="p-12 space-y-4">
            {[1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className="animate-pulse flex items-center gap-4 p-4 bg-gray-100 dark:bg-gray-700 rounded-xl"
              >
                <div className="w-24 h-4 bg-gray-200 dark:bg-gray-600 rounded"></div>
                <div className="flex-1 h-4 bg-gray-200 dark:bg-gray-600 rounded"></div>
                <div className="w-24 h-4 bg-gray-200 dark:bg-gray-600 rounded"></div>
              </div>
            ))}
          </div>
        ) : ledgerData.items.length === 0 ? (
          <div className="p-12 text-center">
            <FileText className="w-16 h-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              No transactions found
            </h3>
            <p className="text-gray-500 dark:text-gray-400 text-sm">
              {dateRange.start || dateRange.end
                ? "Try adjusting your date range or use a preset filter"
                : "No transactions available for this account"}
            </p>
          </div>
        ) : (
          <>
            {/* Desktop Table View */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-gray-50 dark:bg-gray-700/50 text-xs uppercase text-gray-500 dark:text-gray-400 border-b border-gray-100 dark:border-gray-700">
                    <th className="p-4 font-semibold">Date</th>
                    <th className="p-4 font-semibold">Description</th>
                    <th className="p-4 font-semibold text-right text-rose-600 dark:text-rose-400">
                      Debit (Inv)
                    </th>
                    <th className="p-4 font-semibold text-right text-emerald-600 dark:text-emerald-400">
                      Credit (Pay)
                    </th>
                    <th className="p-4 font-semibold text-right bg-blue-50 dark:bg-blue-900/20">
                      Balance
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                  {ledgerData.items.map((item, idx) => (
                    <tr
                      key={idx}
                      className="hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors"
                    >
                      <td className="p-4 text-sm text-gray-600 dark:text-gray-300 whitespace-nowrap">
                        {format(new Date(item.date), "dd MMM yyyy")}
                      </td>
                      <td className="p-4">
                        <div className="flex flex-col">
                          <span className="font-medium text-gray-800 dark:text-white text-sm">
                            {item.type === "INVOICE"
                              ? `Invoice #${item.ref_number}`
                              : `Payment: ${item.ref_number}`}
                          </span>
                          <span className="text-xs text-gray-500">
                            {item.description}
                          </span>
                        </div>
                      </td>
                      <td className="p-4 text-right font-medium text-rose-600 dark:text-rose-400 whitespace-nowrap">
                        {item.debit > 0
                          ? `₹${item.debit.toLocaleString("en-IN")}`
                          : "-"}
                      </td>
                      <td className="p-4 text-right font-medium text-emerald-600 dark:text-emerald-400 whitespace-nowrap">
                        {item.credit > 0
                          ? `₹${item.credit.toLocaleString("en-IN")}`
                          : "-"}
                      </td>
                      <td className="p-4 text-right font-bold text-gray-800 dark:text-white whitespace-nowrap bg-blue-50/50 dark:bg-blue-900/10">
                        ₹{item.balance.toLocaleString("en-IN")}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile Card View */}
            <div className="md:hidden divide-y divide-gray-100 dark:divide-gray-700">
              {ledgerData.items.map((item, idx) => (
                <div
                  key={idx}
                  className="p-4 hover:bg-gray-50 dark:hover:bg-gray-700/30"
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1">
                      <p className="font-medium text-gray-800 dark:text-white text-sm">
                        {item.type === "INVOICE"
                          ? `Invoice #${item.ref_number}`
                          : `Payment: ${item.ref_number}`}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        {format(new Date(item.date), "dd MMM yyyy")}
                      </p>
                    </div>
                    <span
                      className={`text-xs px-2 py-1 rounded-full font-medium ${
                        item.type === "INVOICE"
                          ? "bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400"
                          : "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
                      }`}
                    >
                      {item.type}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 mb-3">
                    {item.description}
                  </p>
                  <div className="grid grid-cols-3 gap-2 text-sm">
                    <div>
                      <p className="text-xs text-gray-500">Debit</p>
                      <p className="font-medium text-rose-600 dark:text-rose-400">
                        {item.debit > 0
                          ? `₹${item.debit.toLocaleString("en-IN")}`
                          : "-"}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Credit</p>
                      <p className="font-medium text-emerald-600 dark:text-emerald-400">
                        {item.credit > 0
                          ? `₹${item.credit.toLocaleString("en-IN")}`
                          : "-"}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Balance</p>
                      <p className="font-bold text-gray-800 dark:text-white">
                        ₹{item.balance.toLocaleString("en-IN")}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Print-only styles */}
      <style>{`
        @media print {
          @page {
            size: A4;
            margin: 1cm;
          }
          
          body {
            print-color-adjust: exact;
            -webkit-print-color-adjust: exact;
          }
          
          .print\\:hidden {
            display: none !important;
          }
          
          /* Ensure table is visible */
          table {
            page-break-inside: auto;
          }
          
          tr {
            page-break-inside: avoid;
            page-break-after: auto;
          }
          
          thead {
            display: table-header-group;
          }
          
          /* Remove shadows and borders for print */
          .shadow-lg,
          .shadow-md,
          .shadow-sm {
            box-shadow: none !important;
          }
          
          /* Ensure text is black for print */
          .dark\\:text-white,
          .dark\\:text-gray-300,
          .text-gray-800 {
            color: #000 !important;
          }
          
          /* Keep color coding for amounts */
          .text-rose-600,
          .dark\\:text-rose-400 {
            color: #dc2626 !important;
          }
          
          .text-emerald-600,
          .dark\\:text-emerald-400 {
            color: #059669 !important;
          }
          
          /* Background colors for print */
          .bg-gray-50,
          .dark\\:bg-gray-700\\/50 {
            background-color: #f9fafb !important;
          }
          
          .bg-blue-50\\/50,
          .dark\\:bg-blue-900\\/10 {
            background-color: #eff6ff !important;
          }
        }
      `}</style>
    </div>
  );
}

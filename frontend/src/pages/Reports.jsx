import { useState, useEffect, useMemo, Fragment } from "react";
import { useSearchParams } from "react-router-dom";
import {
  FileText,
  Search,
  Filter,
  Download,
  AlertCircle,
  CheckCircle,
  Clock,
  ArrowRight,
  ClipboardList,
  Printer,
  ChevronLeft,
  ChevronRight,
  Package,
  Boxes,
  ReceiptIndianRupee,
  IndianRupee,
} from "lucide-react";
import toast from "react-hot-toast";
import * as XLSX from "xlsx";
import {
  getJobWorkReport,
  getStockLedgerPDF,
  getPartyStatement,
  getPartyStatementPDF,
  getStockLedger,
  recalculateStock,
  getGSTReport,
  getGSTReportPDF,
  getTrueStockLedgerPDF,
  getJobWorkStockSummary,
  getJobWorkStockSummaryPDF,
  getGRNReport,
  getGRNReportPDF,
} from "../api/reports";
import { getParties } from "../api/parties";
import { getItems } from "../api/items";
import PdfPreviewModal from "../components/PdfPreviewModal";
import {
  getFinancialYearStartDate,
  getFinancialYearEndDate,
} from "../utils/dateUtils";

export default function Reports() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pdfLoading, setPdfLoading] = useState(false);
  const [previewDoc, setPreviewDoc] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState("all"); // all, pending, completed

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);

  // URL Params
  const [searchParams] = useSearchParams();

  // Tab State
  const [activeTab, setActiveTab] = useState(
    searchParams.get("tab") || "jobwork",
  ); // jobwork, ledger, statement, stock
  const [selectedJobWorkParty, setSelectedJobWorkParty] = useState("");
  const [selectedJobWorkItem, setSelectedJobWorkItem] = useState("");
  const [selectedStatementPartyId, setSelectedStatementPartyId] = useState(
    searchParams.get("party_id") || "",
  );

  // Statement State
  const [parties, setParties] = useState([]);
  const [statementData, setStatementData] = useState([]);
  const [statementLoading, setStatementLoading] = useState(false);

  // Stock Ledger State
  const [items, setItems] = useState([]);
  const [selectedItem, setSelectedItem] = useState("");
  const [selectedStockParty, setSelectedStockParty] = useState("");
  const [stockLedgerData, setStockLedgerData] = useState([]);
  const [stockLedgerSummary, setStockLedgerSummary] = useState(null);
  const [stockLedgerLoading, setStockLedgerLoading] = useState(false);

  // GST Report State
  const [gstData, setGstData] = useState([]);
  const [gstLoading, setGstLoading] = useState(false);
  const [selectedGSTParty, setSelectedGSTParty] = useState("");

  // Job Work Stock Summary State
  const [jobWorkStockLoading, setJobWorkStockLoading] = useState(false);
  const [jobWorkStockData, setJobWorkStockData] = useState([]);

  // GRN Report State
  const [grnData, setGrnData] = useState([]);
  const [grnLoading, setGrnLoading] = useState(false);
  const [selectedGRNParty, setSelectedGRNParty] = useState("");

  const [dateRange, setDateRange] = useState(() => {
    const today = new Date();
    const year = today.getFullYear();
    const month = today.getMonth();

    // If navigating from AI Insights with a party_id, show full FY
    if (searchParams.get("party_id")) {
      return {
        start_date: getFinancialYearStartDate(),
        end_date: getFinancialYearEndDate(),
      };
    }

    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);

    // Format as YYYY-MM-DD using local time to avoid timezone issues
    const formatDate = (date) => {
      const y = date.getFullYear();
      const m = String(date.getMonth() + 1).padStart(2, "0");
      const d = String(date.getDate()).padStart(2, "0");
      return `${y}-${m}-${d}`;
    };

    return {
      start_date: formatDate(firstDay),
      end_date: formatDate(lastDay),
    };
  });

  useEffect(() => {
    fetchReport();
    loadParties();
    loadItems();
  }, []);

  // Re-trigger statement fetch once parties are loaded (for deep-link from AI Insights)
  useEffect(() => {
    if (
      activeTab === "statement" &&
      selectedStatementPartyId &&
      parties.length > 0
    ) {
      fetchStatement();
    }
  }, [parties]);

  useEffect(() => {
    if (activeTab === "statement" && selectedStatementPartyId) {
      fetchStatement();
    }
    if (activeTab === "stock" && selectedItem) {
      fetchStockLedger();
    }
    if (activeTab === "ledger") {
      fetchJobWorkStockSummary();
    }
    if (activeTab === "gst") {
      fetchGSTReport();
    }
    if (activeTab === "grn") {
      fetchGRNReport();
    }
  }, [
    activeTab,
    selectedStatementPartyId,
    selectedItem,
    selectedStockParty,
    selectedStockParty,
    selectedGRNParty,
    dateRange,
  ]);

  // ... (keeping loadParties, loadItems, etc.)

  // REMOVE ledgerData useMemo block entirely as we now fetch it from API

  // Update exportToExcel to use filteredData (which is for Job Work Register) or maybe add new export for Stock?
  // Current exportToExcel is for Job Work List. Keep as is.

  const finalStockData = useMemo(() => {
    if (!selectedJobWorkParty) return jobWorkStockData;
    return jobWorkStockData.filter(
      (i) => i.party_name === selectedJobWorkParty,
    );
  }, [jobWorkStockData, selectedJobWorkParty]);

  const loadParties = async () => {
    try {
      const res = await getParties();
      setParties(res);
    } catch (err) {
      console.error("Failed to load parties");
    }
  };

  const loadItems = async () => {
    try {
      const res = await getItems();
      setItems(res);
    } catch (err) {
      console.error("Failed to load items");
    }
  };

  const fetchReport = async () => {
    try {
      setLoading(true);
      const res = await getJobWorkReport();
      setData(res);
    } catch (err) {
      toast.error("Failed to load report data");
    } finally {
      setLoading(false);
    }
  };

  const fetchJobWorkStockSummary = async () => {
    try {
      setJobWorkStockLoading(true);
      const res = await getJobWorkStockSummary({
        start_date: dateRange.start_date,
        end_date: dateRange.end_date,
      });
      setJobWorkStockData(res);
    } catch (err) {
      toast.error("Failed to load stock summary");
    } finally {
      setJobWorkStockLoading(false);
    }
  };

  const handlePrintJobWorkStock = async () => {
    try {
      setPdfLoading(true);
      const loadingToast = toast.loading("Generating Stock Summary PDF...");

      const blob = await getJobWorkStockSummaryPDF({
        start_date: dateRange.start_date,
        end_date: dateRange.end_date,
      });

      const url = window.URL.createObjectURL(
        new Blob([blob], { type: "application/pdf" }),
      );

      setPreviewDoc({
        url: url,
        title: `Job_Work_Stock_Summary`,
      });

      toast.dismiss(loadingToast);
    } catch (error) {
      console.error(error);
      toast.dismiss();
      toast.error("Failed to generate PDF");
    } finally {
      setPdfLoading(false);
    }
  };

  const fetchStatement = async () => {
    if (!selectedStatementPartyId) return;
    try {
      setStatementLoading(true);
      const res = await getPartyStatement({
        party_id: selectedStatementPartyId,
        start_date: dateRange.start_date,
        end_date: dateRange.end_date,
      });
      setStatementData(res);
    } catch (err) {
      toast.error("Failed to load statement");
    } finally {
      setStatementLoading(false);
    }
  };

  const fetchStockLedger = async () => {
    if (!selectedItem) return;
    try {
      setStockLedgerLoading(true);
      const res = await getStockLedger({
        item_id: selectedItem,
        party_id: selectedStockParty || undefined,
        start_date: dateRange.start_date,
        end_date: dateRange.end_date,
      });
      // Handle new response format with summary and transactions
      if (res.summary && res.transactions) {
        setStockLedgerSummary(res.summary);
        setStockLedgerData(res.transactions);
      } else {
        // Fallback for old format (just array)
        setStockLedgerData(res);
        setStockLedgerSummary(null);
      }
    } catch (err) {
      toast.error("Failed to load stock ledger");
    } finally {
      setStockLedgerLoading(false);
    }
  };

  const fetchGSTReport = async () => {
    try {
      setGstLoading(true);
      const res = await getGSTReport({
        start_date: dateRange.start_date,
        end_date: dateRange.end_date,
        type: "gstr1",
      });
      setGstData(res);
    } catch (err) {
      toast.error("Failed to load GST report");
    } finally {
      setGstLoading(false);
    }
  };

  const fetchGRNReport = async () => {
    try {
      setGrnLoading(true);
      const res = await getGRNReport({
        start_date: dateRange.start_date,
        end_date: dateRange.end_date,
        party_id: selectedGRNParty || undefined,
      });
      setGrnData(res);
    } catch (err) {
      toast.error("Failed to load GRN report");
    } finally {
      setGrnLoading(false);
    }
  };

  const handlePrintGRNReport = async () => {
    try {
      setPdfLoading(true);
      const loadingToast = toast.loading("Generating GRN Report PDF...");

      const blob = await getGRNReportPDF({
        start_date: dateRange.start_date,
        end_date: dateRange.end_date,
        party_id: selectedGRNParty || undefined,
      });

      const url = window.URL.createObjectURL(
        new Blob([blob], { type: "application/pdf" }),
      );

      setPreviewDoc({
        url: url,
        title: selectedGRNParty
          ? `GRN_Report_${selectedGRNParty}_${dateRange.start_date}`
          : `GRN_Report_${dateRange.start_date}`,
      });

      toast.dismiss(loadingToast);
    } catch (error) {
      console.error(error);
      toast.dismiss();
      toast.error("Failed to generate PDF");
    } finally {
      setPdfLoading(false);
    }
  };

  const exportGSTReport = () => {
    const exportData = gstData.map((item) => ({
      Date: item.date,
      "Invoice No": item.invoice_number,
      "Party Name": item.party_name,
      GSTIN: item.gstin,
      "Taxable Value": item.taxable_value,
      SGST: item.sgst,
      CGST: item.cgst,
      IGST: item.igst,
      "Total Amount": item.total_amount,
    }));

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "GSTR-1 Sales");
    XLSX.writeFile(wb, "GSTR1_Report.xlsx");
  };

  const handlePrintGSTReport = async () => {
    try {
      setPdfLoading(true);
      const loadingToast = toast.loading("Generating GST Report PDF...");

      const blob = await getGSTReportPDF({
        start_date: dateRange.start_date,
        end_date: dateRange.end_date,
        type: "gstr1",
        party_name: selectedGSTParty,
      });

      const url = window.URL.createObjectURL(
        new Blob([blob], { type: "application/pdf" }),
      );

      setPreviewDoc({
        url: url,
        title: selectedGSTParty
          ? `GST_Report_GSTR1_${selectedGSTParty}_${dateRange.start_date}`
          : `GST_Report_GSTR1_${dateRange.start_date}`,
      });

      toast.dismiss(loadingToast);
    } catch (error) {
      console.error(error);
      toast.dismiss();
      toast.error("Failed to generate PDF");
    } finally {
      setPdfLoading(false);
    }
  };

  const handlePrintStatement = async () => {
    if (!selectedStatementPartyId) return;
    try {
      setPdfLoading(true);
      const loadingToast = toast.loading("Generating Statement PDF...");

      const blob = await getPartyStatementPDF({
        party_id: selectedStatementPartyId,
        start_date: dateRange.start_date,
        end_date: dateRange.end_date,
      });

      const url = window.URL.createObjectURL(
        new Blob([blob], { type: "application/pdf" }),
      );

      setPreviewDoc({
        url: url,
        title: `Statement_${selectedStatementPartyId}`,
      });

      toast.dismiss(loadingToast);
    } catch (error) {
      console.error(error);
      toast.dismiss();
      toast.error("Failed to generate PDF");
    } finally {
      setPdfLoading(false);
    }
  };

  const handlePrintJobWorkPDF = async () => {
    try {
      setPdfLoading(true);
      const loadingToast = toast.loading("Generating Job Work PDF...");

      let partyId = null;
      if (selectedJobWorkParty) {
        // Find party_id from data
        const partyRecord = data.find(
          (p) => p.party_name === selectedJobWorkParty,
        );
        if (partyRecord) {
          partyId = partyRecord.party_id;
        }
      }

      const blob = await getStockLedgerPDF(
        partyId,
        dateRange.start_date,
        dateRange.end_date,
      );

      // Create blob URL for preview
      const url = window.URL.createObjectURL(
        new Blob([blob], { type: "application/pdf" }),
      );

      setPreviewDoc({
        url: url,
        title: `Job_Work_${selectedJobWorkParty || "All"}`,
      });

      toast.dismiss(loadingToast);
    } catch (error) {
      console.error(error);
      toast.dismiss();
      toast.error("Failed to generate PDF");
    } finally {
      setPdfLoading(false);
    }
  };

  const handlePrintStockLedger = async () => {
    if (!selectedItem) {
      toast.error("Please select an item first");
      return;
    }
    try {
      setPdfLoading(true);
      const loadingToast = toast.loading("Generating Stock Ledger PDF...");

      const blob = await getTrueStockLedgerPDF({
        item_id: selectedItem,
        party_id: selectedStockParty,
        start_date: dateRange.start_date,
        end_date: dateRange.end_date,
      });

      const url = window.URL.createObjectURL(
        new Blob([blob], { type: "application/pdf" }),
      );

      setPreviewDoc({
        url: url,
        title: `Stock_Ledger_${selectedItem}`,
      });

      toast.dismiss(loadingToast);
    } catch (error) {
      console.error(error);
      toast.dismiss();
      toast.error("Failed to generate PDF");
    } finally {
      setPdfLoading(false);
    }
  };

  const handleRecalculateStock = async () => {
    if (
      !confirm(
        "Are you sure? This will wipe and rebuild the entire Stock Ledger from original documents. Use this only to fix data discrepancies.",
      )
    )
      return;
    try {
      const loadingToast = toast.loading("Recalculating Stock...");
      await recalculateStock();
      toast.success("Stock Ledger has been successfully rebuilt!");
      toast.dismiss(loadingToast);
      // Refresh if an item is selected
      if (activeTab === "stock" && selectedItem) {
        fetchStockLedger();
      }
    } catch (error) {
      console.error(error);
      toast.dismiss();
      toast.error("Failed to recalculate stock");
    }
  };

  // --- JOB WORK FILTERING ---
  const filteredData = data.filter((item) => {
    const matchesSearch =
      item.party_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.item_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.challan_number.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus =
      filterStatus === "all" || item.status.toLowerCase() === filterStatus;

    const matchesParty =
      !selectedJobWorkParty || item.party_name === selectedJobWorkParty;

    const matchesItem =
      !selectedJobWorkItem || item.item_name === selectedJobWorkItem;

    return matchesSearch && matchesStatus && matchesParty && matchesItem;
  });

  // Pagination Logic
  const totalPages = Math.ceil(filteredData.length / itemsPerPage);
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = filteredData.slice(indexOfFirstItem, indexOfLastItem);

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, filterStatus, selectedJobWorkParty, selectedJobWorkItem]);

  const stats = {
    totalJobs: data.length,
    pendingJobs: data.filter((i) => i.status === "Pending").length,
    completedJobs: data.filter((i) => i.status === "Completed").length,
    totalPendingQty: data.reduce((sum, item) => sum + item.pending_qty, 0),
  };

  // --- LEDGER AGGREGATION ---
  const availableParties = [...new Set(data.map((i) => i.party_name))];

  // Filter items based on selected party
  const availableItems = [
    ...new Set(
      data
        .filter(
          (i) => !selectedJobWorkParty || i.party_name === selectedJobWorkParty,
        )
        .map((i) => i.item_name),
    ),
  ];

  /* --- LEDGER AGGREGATION (Fixed for Date-Wise Opening) --- */
  const ledgerData = useMemo(() => {
    // 1. We need ALL data that matches the Party filter (ignore date filter for raw fetching)
    // The `data` prop contains everything.

    // Parse Dates once
    const startDate = new Date(dateRange.start_date);
    startDate.setHours(0, 0, 0, 0);

    const endDate = new Date(dateRange.end_date);
    endDate.setHours(23, 59, 59, 999);

    const rawMap = data
      .filter((i) => {
        // Only filter by Party here. Time filtering happens inside reduce.
        return !selectedJobWorkParty || i.party_name === selectedJobWorkParty;
      })
      .reduce((acc, row) => {
        const key = `${row.party_name}-${row.item_name}`;
        if (!acc[key]) {
          acc[key] = {
            party: row.party_name,
            item: row.item_name,
            opening: 0,
            in: 0,
            out: 0,
            balance: 0,
          };
        }

        const rowDate = new Date(row.date);

        // Logic:
        // 1. Before Start Date -> Add to Opening Balance & Total Balance
        // 2. In Range -> Add to In/Out & Total Balance
        // 3. After End Date -> Ignore

        if (rowDate < startDate) {
          // Past transaction: It contributes to Opening Stock with its PENDING quantity.
          // If a job came in Jan 3 and is still pending, on Jan 4 it is Opening Stock.
          // Wait, if it was Completed on Jan 3, pending is 0. So it adds 0. Correct.
          // Note: date-wise filtering assumes we are tracking movements.
          // "Job Work" report is a list of Jobs.
          // If a Job started Jan 1 (In 100) and ended Jan 2 (Out 100), Pending is 0.
          // On Jan 4, Opening is 0. Correct.
          // If Job started Jan 3 (In 100), Out 0. Pending 100.
          // On Jan 4, Opening is 100. Correct.
          // What if Job started Jan 3 (In 100), Out 50 on Jan 3. Pending 50.
          // "row" represents the Job (Challan Item). It has one date (Challan Date).
          // It doesn't have split dates for In vs Out.
          // The assumption here is "Out" happens roughly same time or we track net pending.
          // The row has "pending_qty". This is the CURRENT pending quantity as of NOW.
          // CRITICAL FLAW: "pending_qty" is static based on DB state, not historical state.
          // However, for this Report (Job Work Register), users usually want "What is pending from old jobs?"
          // So, "Opening Balance" = Sum of Pending Qty of all jobs created BEFORE Start Date.
          // "Inward" = Sum of In Qty of jobs created DURING Date Range.
          // "Outward" = Sum of Out Qty of jobs created DURING Date Range.
          // "Balance" = Total Pending.

          // Issue: If a Job was created Jan 3, and Outward happened Jan 5.
          // The row date is Jan 3.
          // If Select Jan 4-Jan 6.
          // Row is BEFORE start date.
          // It adds to Opening.
          // But Outward happened in range!
          // Since we only have "Challan Date", we cannot split the In/Out timeline accurately without a full transaction ledger.
          // BUT, for "Job Work Stock" summary, the user usually wants:
          // Opening = Pending Jobs from before.
          // Inward = New Jobs coming in.
          // Outward = Deliveries made against *these new jobs* OR *total deliveries in period*?
          // Since "row" aggregates "out_qty" (total delivered), we can't see WHEN delivery happened.
          // LIMITATION: We can only attribute "Outward" to the Challan Date with this dataset.
          // UnFixable accurately without fetching `StockTransaction` or `DeliveryChallan` separately.
          // However, strictly answering user request:
          // "Select Date 4-1-2026 show opening 50" (from Jan 3 job).
          // My proposed logic below does exactly this based on available data.

          acc[key].opening += row.pending_qty;
          acc[key].balance += row.pending_qty;
        } else if (rowDate <= endDate) {
          // It's in the current period.
          acc[key].in += row.in_qty;
          acc[key].out += row.out_qty;
          acc[key].balance += row.pending_qty;
        }

        return acc;
      }, {});

    return Object.values(rawMap).filter(
      (r) => r.opening !== 0 || r.in !== 0 || r.out !== 0,
    );
  }, [data, selectedJobWorkParty, dateRange]);

  const exportToExcel = () => {
    const exportData = filteredData.map((item) => ({
      Date: item.date,
      "Party Name": item.party_name,
      "Challan No": item.challan_number,
      Item: item.item_name,
      Process: item.process_name,
      "Inward Qty": item.in_qty,
      "Outward Qty": item.out_qty,
      "Balance Qty": item.pending_qty,
      Status: item.status,
    }));

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Job Work Report");
    XLSX.writeFile(wb, "Job_Work_Report.xlsx");
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <span className="p-2 bg-gradient-to-br from-purple-600 to-indigo-600 rounded-xl text-white shadow-lg shadow-purple-600/20">
              <FileText size={24} />
            </span>
            Reports Center
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            Comprehensive business insights and material tracking
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-200 dark:border-gray-700 p-2 overflow-x-auto">
        <div className="flex gap-2 min-w-max">
          {[
            { id: "jobwork", label: "Job Work Register", icon: ClipboardList },
            { id: "ledger", label: "Job Work Stock", icon: Package },
            { id: "stock", label: "Stock Ledger", icon: Boxes },
            {
              id: "statement",
              label: "Financial Statement",
              icon: ReceiptIndianRupee,
            },
            { id: "gst", label: "GST Report", icon: IndianRupee },
            { id: "grn", label: "GRN Report", icon: FileText },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`group relative flex items-center gap-2.5 px-6 py-3 rounded-xl font-semibold transition-all duration-300 ${
                  isActive
                    ? "bg-gradient-to-r from-blue-600 to-cyan-700 text-white shadow-lg shadow-blue-600/30"
                    : "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-gray-900 dark:hover:text-white"
                }`}
              >
                <div
                  className={`p-1.5 rounded-lg transition-all duration-300 ${
                    isActive
                      ? "bg-white/20 backdrop-blur-md"
                      : "bg-gray-100 dark:bg-gray-700 group-hover:bg-gray-200 dark:group-hover:bg-gray-600"
                  }`}
                >
                  <Icon
                    size={18}
                    className={
                      isActive
                        ? "text-white"
                        : "text-gray-600 dark:text-gray-400 group-hover:text-gray-900 dark:group-hover:text-white"
                    }
                  />
                </div>
                <span className="whitespace-nowrap">{tab.label}</span>
                {isActive && (
                  <div className="absolute bottom-0 left-0 right-0 h-1 bg-white/30 rounded-full"></div>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {activeTab === "jobwork" && (
        <>
          {/* Stats Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="group relative bg-gradient-to-br from-blue-50 to-cyan-100 dark:from-blue-900/30 dark:to-cyan-800/20 p-6 rounded-2xl shadow-lg shadow-blue-500/20 dark:shadow-blue-500/10 hover:shadow-blue-500/30 dark:hover:shadow-blue-500/20 border border-gray-200 dark:border-gray-700 transition-all duration-300 hover:scale-105 hover:-translate-y-1 overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 dark:bg-black/10 rounded-full -mr-16 -mt-16 group-hover:scale-150 transition-transform duration-500"></div>
              <div className="relative flex items-center gap-4">
                <div className="p-4 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-600 shadow-lg group-hover:scale-110 group-hover:rotate-6 transition-all duration-300">
                  <ClipboardList size={28} className="text-white" />
                </div>
                <div className="flex-1">
                  <h3 className="text-2xl font-bold text-blue-600 dark:text-blue-400 tabular-nums group-hover:scale-105 transition-transform duration-300 origin-left">
                    {stats.totalJobs}
                  </h3>
                  <p className="text-xs text-gray-500 dark:text-gray-500 font-semibold uppercase tracking-wider mt-1">
                    Total Jobs
                  </p>
                </div>
              </div>
            </div>

            <div className="group relative bg-gradient-to-br from-orange-50 to-amber-100 dark:from-orange-900/30 dark:to-amber-800/20 p-6 rounded-2xl shadow-lg shadow-orange-500/20 dark:shadow-orange-500/10 hover:shadow-orange-500/30 dark:hover:shadow-orange-500/20 border border-gray-200 dark:border-gray-700 transition-all duration-300 hover:scale-105 hover:-translate-y-1 overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 dark:bg-black/10 rounded-full -mr-16 -mt-16 group-hover:scale-150 transition-transform duration-500"></div>
              <div className="relative flex items-center gap-4">
                <div className="p-4 rounded-xl bg-gradient-to-br from-orange-500 to-amber-600 shadow-lg group-hover:scale-110 group-hover:rotate-6 transition-all duration-300">
                  <Clock size={28} className="text-white" />
                </div>
                <div className="flex-1">
                  <h3 className="text-2xl font-bold text-orange-600 dark:text-orange-400 tabular-nums group-hover:scale-105 transition-transform duration-300 origin-left">
                    {stats.pendingJobs}
                  </h3>
                  <p className="text-xs text-gray-500 dark:text-gray-500 font-semibold uppercase tracking-wider mt-1">
                    Pending Jobs
                  </p>
                </div>
              </div>
            </div>

            <div className="group relative bg-gradient-to-br from-green-50 to-emerald-100 dark:from-green-900/30 dark:to-emerald-800/20 p-6 rounded-2xl shadow-lg shadow-green-500/20 dark:shadow-green-500/10 hover:shadow-green-500/30 dark:hover:shadow-green-500/20 border border-gray-200 dark:border-gray-700 transition-all duration-300 hover:scale-105 hover:-translate-y-1 overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 dark:bg-black/10 rounded-full -mr-16 -mt-16 group-hover:scale-150 transition-transform duration-500"></div>
              <div className="relative flex items-center gap-4">
                <div className="p-4 rounded-xl bg-gradient-to-br from-green-500 to-emerald-600 shadow-lg group-hover:scale-110 group-hover:rotate-6 transition-all duration-300">
                  <CheckCircle size={28} className="text-white" />
                </div>
                <div className="flex-1">
                  <h3 className="text-2xl font-bold text-green-600 dark:text-green-400 tabular-nums group-hover:scale-105 transition-transform duration-300 origin-left">
                    {stats.completedJobs}
                  </h3>
                  <p className="text-xs text-gray-500 dark:text-gray-500 font-semibold uppercase tracking-wider mt-1">
                    Completed
                  </p>
                </div>
              </div>
            </div>

            <div className="group relative bg-gradient-to-br from-purple-50 to-violet-100 dark:from-purple-900/30 dark:to-violet-800/20 p-6 rounded-2xl shadow-lg shadow-purple-500/20 dark:shadow-purple-500/10 hover:shadow-purple-500/30 dark:hover:shadow-purple-500/20 border border-gray-200 dark:border-gray-700 transition-all duration-300 hover:scale-105 hover:-translate-y-1 overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 dark:bg-black/10 rounded-full -mr-16 -mt-16 group-hover:scale-150 transition-transform duration-500"></div>
              <div className="relative flex items-center gap-4">
                <div className="p-4 rounded-xl bg-gradient-to-br from-purple-500 to-violet-600 shadow-lg group-hover:scale-110 group-hover:rotate-6 transition-all duration-300">
                  <AlertCircle size={28} className="text-white" />
                </div>
                <div className="flex-1">
                  <h3 className="text-2xl font-bold text-purple-600 dark:text-purple-400 tabular-nums group-hover:scale-105 transition-transform duration-300 origin-left">
                    {stats.totalPendingQty}
                  </h3>
                  <p className="text-xs text-gray-500 dark:text-gray-500 font-semibold uppercase tracking-wider mt-1">
                    Pending Qty
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Filters */}
          <div className="bg-white dark:bg-gray-800 p-4 rounded-2xl shadow-xl border border-gray-200 dark:border-gray-700">
            <div className="flex flex-col xl:flex-row gap-4 items-start xl:items-center justify-between">
              {/* Left Side: Search and Dropdowns */}
              <div className="flex flex-col md:flex-row flex-wrap gap-4 w-full xl:w-auto items-center">
                <div className="relative w-full md:w-64">
                  <Search
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                    size={18}
                  />
                  <input
                    type="text"
                    name="report_search"
                    id="report_search"
                    placeholder="Search..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl border-2 border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 outline-none transition-all dark:text-white"
                  />
                </div>

                <select
                  value={selectedJobWorkParty}
                  onChange={(e) => {
                    setSelectedJobWorkParty(e.target.value);
                    // Clear item selection when party changes
                    if (e.target.value !== selectedJobWorkParty) {
                      setSelectedJobWorkItem("");
                    }
                  }}
                  className="px-4 py-2.5 rounded-xl border-2 border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 transition-all font-medium w-full md:w-48"
                  name="job_work_party_filter"
                  id="job_work_party_filter"
                >
                  <option value="">All Parties</option>
                  {availableParties.map((party) => (
                    <option key={party} value={party}>
                      {party}
                    </option>
                  ))}
                </select>

                <select
                  value={selectedJobWorkItem}
                  onChange={(e) => setSelectedJobWorkItem(e.target.value)}
                  className="px-4 py-2.5 rounded-xl border-2 border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 transition-all font-medium w-full md:w-48"
                  name="job_work_item_filter"
                  id="job_work_item_filter"
                >
                  <option value="">All Items</option>
                  {availableItems.map((item) => (
                    <option key={item} value={item}>
                      {item}
                    </option>
                  ))}
                </select>

                {(selectedJobWorkParty || selectedJobWorkItem) && (
                  <button
                    onClick={() => {
                      setSelectedJobWorkParty("");
                      setSelectedJobWorkItem("");
                    }}
                    className="w-full md:w-auto px-3 py-2 text-sm font-medium text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-700 rounded-xl transition-all whitespace-nowrap"
                  >
                    Clear Filter
                  </button>
                )}
              </div>

              {/* Right Side: Status and Export */}
              <div className="flex flex-col sm:flex-row items-center gap-3 w-full xl:w-auto justify-end">
                <div className="flex flex-wrap items-center gap-2 bg-gray-50 dark:bg-gray-900 p-1 rounded-xl border-2 border-gray-200 dark:border-gray-700 w-full sm:w-auto">
                  {["all", "pending", "completed"].map((status) => (
                    <button
                      key={status}
                      onClick={() => setFilterStatus(status)}
                      className={`flex-1 px-4 py-1.5 rounded-lg text-sm font-semibold transition-all capitalize whitespace-nowrap ${
                        filterStatus === status
                          ? "bg-white dark:bg-gray-800 text-purple-600 dark:text-purple-400 shadow-md"
                          : "text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
                      }`}
                    >
                      {status}
                    </button>
                  ))}
                </div>
                <button
                  onClick={exportToExcel}
                  className="w-full sm:w-auto group flex items-center justify-center gap-2 px-5 py-2.5 bg-gradient-to-r from-green-600 to-emerald-700 hover:from-green-700 hover:to-emerald-800 text-white rounded-xl font-semibold shadow-lg shadow-green-600/30 hover:shadow-xl hover:shadow-green-600/40 transition-all duration-300 whitespace-nowrap hover:scale-105"
                >
                  <Download
                    size={18}
                    className="group-hover:-translate-y-0.5 transition-transform duration-300"
                  />
                  Export
                </button>
              </div>
            </div>
          </div>

          {/* Table */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gradient-to-r from-gray-100 to-gray-50 dark:from-gray-700 dark:to-gray-700/80 text-gray-600 dark:text-gray-300 uppercase tracking-wider text-xs font-bold sticky top-0 z-10 backdrop-blur-sm shadow-md">
                  <tr>
                    <th className="px-6 py-4 text-left whitespace-nowrap">
                      Date
                    </th>
                    <th className="px-6 py-4 text-left whitespace-nowrap">
                      Party & Challan
                    </th>
                    <th className="px-6 py-4 text-left whitespace-nowrap">
                      Item Details
                    </th>
                    <th className="px-6 py-4 text-right whitespace-nowrap">
                      Inward
                    </th>
                    <th className="px-6 py-4 text-right whitespace-nowrap">
                      Outward
                    </th>
                    <th className="px-6 py-4 text-right whitespace-nowrap">
                      Balance
                    </th>
                    <th className="px-6 py-4 text-center whitespace-nowrap">
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-700/50">
                  {loading ? (
                    <tr>
                      <td colSpan="7" className="px-6 py-12 text-center">
                        <div className="flex flex-col items-center justify-center gap-3">
                          <div className="w-8 h-8 border-2 border-purple-600 border-t-transparent rounded-full animate-spin"></div>
                          <p className="text-gray-500 font-medium">
                            Loading Report...
                          </p>
                        </div>
                      </td>
                    </tr>
                  ) : currentItems.length === 0 ? (
                    <tr>
                      <td colSpan="7" className="px-6 py-12 text-center">
                        <div className="flex flex-col items-center justify-center gap-3">
                          <div className="w-12 h-12 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center">
                            <FileText className="text-gray-400" size={24} />
                          </div>
                          <p className="text-gray-500 font-medium">
                            No records found
                          </p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    currentItems.map((row, index) => (
                      <tr
                        key={row.id}
                        className="group hover:bg-gradient-to-r hover:from-purple-50/50 hover:to-violet-50/30 dark:hover:from-purple-900/10 dark:hover:to-violet-900/10 transition-all duration-300 hover:shadow-[inset_4px_0_0_0_rgb(147,51,234)]"
                      >
                        <td className="px-6 py-5 text-sm text-gray-500 dark:text-gray-400 whitespace-nowrap font-medium">
                          {row.date}
                        </td>
                        <td className="px-6 py-5">
                          <p className="font-semibold text-gray-900 dark:text-white">
                            {row.party_name}
                          </p>
                          <p className="text-xs text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-900/30 px-2 py-0.5 rounded-md inline-block mt-1 font-semibold">
                            {row.challan_number}
                          </p>
                        </td>
                        <td className="px-6 py-5">
                          <p className="font-semibold text-gray-800 dark:text-gray-200">
                            {row.item_name}
                          </p>
                          <span className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1 mt-0.5">
                            <ArrowRight size={12} /> {row.process_name}
                          </span>
                        </td>
                        <td className="px-6 py-5 text-right">
                          <span className="font-semibold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30 px-3 py-1.5 rounded-lg">
                            {row.in_qty}
                          </span>
                        </td>
                        <td className="px-6 py-5 text-right">
                          <span className="font-semibold text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/30 px-3 py-1.5 rounded-lg">
                            {row.out_qty}
                          </span>
                        </td>
                        <td className="px-6 py-5 text-right">
                          <span
                            className={`font-bold px-3 py-1.5 rounded-lg ${
                              row.pending_qty > 0
                                ? "text-orange-600 dark:text-orange-400 bg-orange-50 dark:bg-orange-900/30"
                                : "text-gray-400"
                            }`}
                          >
                            {row.pending_qty}
                          </span>
                        </td>
                        <td className="px-6 py-5 text-center">
                          {row.status === "Completed" ? (
                            <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 border border-green-200 dark:border-green-800">
                              <CheckCircle size={14} />
                              Completed
                            </div>
                          ) : (
                            <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400 border border-orange-200 dark:border-orange-800">
                              <Clock size={14} />
                              Pending
                            </div>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls */}
            {filteredData.length > itemsPerPage && (
              <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 flex items-center justify-between bg-gray-50 dark:bg-gray-900/50">
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  Showing {indexOfFirstItem + 1} to{" "}
                  {Math.min(indexOfLastItem, filteredData.length)} of{" "}
                  {filteredData.length} entries
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() =>
                      setCurrentPage((prev) => Math.max(prev - 1, 1))
                    }
                    disabled={currentPage === 1}
                    className="p-2 rounded-lg border-2 border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                  >
                    <ChevronLeft size={18} />
                  </button>

                  {Array.from({ length: totalPages }, (_, i) => i + 1).map(
                    (page) => {
                      // Show first page, last page, current page, and pages around current
                      if (
                        page === 1 ||
                        page === totalPages ||
                        (page >= currentPage - 1 && page <= currentPage + 1)
                      ) {
                        return (
                          <button
                            key={page}
                            onClick={() => setCurrentPage(page)}
                            className={`min-w-[40px] h-10 rounded-lg font-semibold transition-all duration-200 ${
                              currentPage === page
                                ? "bg-gradient-to-r from-purple-600 to-violet-700 text-white shadow-lg shadow-purple-600/30"
                                : "border-2 border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-700"
                            }`}
                          >
                            {page}
                          </button>
                        );
                      } else if (
                        page === currentPage - 2 ||
                        page === currentPage + 2
                      ) {
                        return (
                          <span key={page} className="px-2">
                            ...
                          </span>
                        );
                      }
                      return null;
                    },
                  )}

                  <button
                    onClick={() =>
                      setCurrentPage((prev) => Math.min(prev + 1, totalPages))
                    }
                    disabled={currentPage === totalPages}
                    className="p-2 rounded-lg border-2 border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                  >
                    <ChevronRight size={18} />
                  </button>
                </div>
              </div>
            )}
          </div>
        </>
      )}

      {activeTab === "statement" && (
        /* Financial Statement */
        <div className="space-y-6">
          <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-xl border border-gray-200 dark:border-gray-700">
            <div className="flex flex-col md:flex-row flex-wrap gap-4 items-end">
              <div className="w-full md:w-auto">
                <label
                  htmlFor="statement_party_id"
                  className="block text-sm font-semibold mb-2 text-gray-700 dark:text-gray-300"
                >
                  Select Party
                </label>
                <select
                  name="statement_party_id"
                  id="statement_party_id"
                  value={selectedStatementPartyId}
                  onChange={(e) => setSelectedStatementPartyId(e.target.value)}
                  className="w-full md:w-64 px-4 py-2.5 rounded-xl border-2 border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium"
                >
                  <option value="">-- Select Party --</option>
                  {parties.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="w-full md:w-auto">
                <label
                  htmlFor="statement_start_date"
                  className="block text-sm font-semibold mb-2 text-gray-700 dark:text-gray-300"
                >
                  Start Date
                </label>
                <input
                  type="date"
                  name="statement_start_date"
                  id="statement_start_date"
                  value={dateRange.start_date}
                  min={getFinancialYearStartDate()}
                  max={getFinancialYearEndDate()}
                  onChange={(e) =>
                    setDateRange({ ...dateRange, start_date: e.target.value })
                  }
                  className="w-full md:w-auto px-4 py-2.5 rounded-xl border-2 border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium"
                />
              </div>

              <div className="w-full md:w-auto">
                <label
                  htmlFor="statement_end_date"
                  className="block text-sm font-semibold mb-2 text-gray-700 dark:text-gray-300"
                >
                  End Date
                </label>
                <input
                  type="date"
                  name="statement_end_date"
                  id="statement_end_date"
                  value={dateRange.end_date}
                  min={getFinancialYearStartDate()}
                  max={getFinancialYearEndDate()}
                  onChange={(e) =>
                    setDateRange({ ...dateRange, end_date: e.target.value })
                  }
                  className="w-full md:w-auto px-4 py-2.5 rounded-xl border-2 border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium"
                />
              </div>
              {selectedStatementPartyId && (
                <button
                  onClick={handlePrintStatement}
                  disabled={pdfLoading}
                  className="w-full md:w-auto mt-4 md:mt-0 flex items-center justify-center gap-2 px-6 py-2.5 bg-gradient-to-r from-blue-600 to-cyan-700 hover:from-blue-700 hover:to-cyan-800 text-white rounded-xl font-semibold shadow-lg shadow-blue-600/30 hover:shadow-xl hover:shadow-blue-600/40 transition-all duration-300 hover:scale-105"
                >
                  <Printer size={20} />
                  {pdfLoading ? "Generating..." : "Print Statement"}
                </button>
              )}
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-gradient-to-r from-gray-100 to-gray-50 dark:from-gray-700 dark:to-gray-700/80 text-gray-600 dark:text-gray-300 uppercase tracking-wider text-xs font-bold sticky top-0 z-10 backdrop-blur-sm shadow-md">
                  <tr>
                    <th className="px-6 py-4 whitespace-nowrap">Date</th>
                    <th className="px-6 py-4 whitespace-nowrap">Ref</th>
                    <th className="px-6 py-4 whitespace-nowrap">Description</th>
                    <th className="px-6 py-4 text-right whitespace-nowrap">
                      Debit
                    </th>
                    <th className="px-6 py-4 text-right whitespace-nowrap">
                      Credit
                    </th>
                    <th className="px-6 py-4 text-right whitespace-nowrap">
                      Balance
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-700/50">
                  {statementLoading ? (
                    <tr>
                      <td colSpan="6" className="px-6 py-12 text-center">
                        <div className="flex flex-col items-center justify-center gap-3">
                          <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                          <p className="text-gray-500 font-medium">
                            Loading Statement...
                          </p>
                        </div>
                      </td>
                    </tr>
                  ) : statementData.length === 0 ? (
                    <tr>
                      <td colSpan="6" className="px-6 py-12 text-center">
                        <div className="flex flex-col items-center justify-center gap-3">
                          <div className="w-12 h-12 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center">
                            <FileText className="text-gray-400" size={24} />
                          </div>
                          <p className="text-gray-500 font-medium">
                            No transactions found
                          </p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    statementData.map((row, i) => (
                      <tr
                        key={i}
                        className="group hover:bg-gradient-to-r hover:from-blue-50/50 hover:to-cyan-50/30 dark:hover:from-blue-900/10 dark:hover:to-cyan-900/10 transition-all duration-300 hover:shadow-[inset_4px_0_0_0_rgb(59,130,246)]"
                      >
                        <td className="px-6 py-5 text-gray-600 dark:text-gray-400 font-medium">
                          {row.date}
                        </td>
                        <td className="px-6 py-5 font-mono text-xs text-gray-500 dark:text-gray-500 bg-gray-50 dark:bg-gray-800/50">
                          {row.ref}
                        </td>
                        <td className="px-6 py-5 text-gray-700 dark:text-gray-300">
                          {row.description}
                        </td>
                        <td className="px-6 py-5 text-right">
                          {row.debit ? (
                            <span className="font-semibold text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/30 px-3 py-1.5 rounded-lg">
                              ₹{row.debit.toFixed(2)}
                            </span>
                          ) : (
                            <span className="text-gray-400">-</span>
                          )}
                        </td>
                        <td className="px-6 py-5 text-right">
                          {row.credit ? (
                            <span className="font-semibold text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/30 px-3 py-1.5 rounded-lg">
                              ₹{row.credit.toFixed(2)}
                            </span>
                          ) : (
                            <span className="text-gray-400">-</span>
                          )}
                        </td>
                        <td className="px-6 py-5 text-right">
                          <span className="font-bold text-gray-900 dark:text-white bg-gray-100 dark:bg-gray-700 px-3 py-1.5 rounded-lg">
                            ₹{row.balance.toFixed(2)}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {activeTab === "ledger" && (
        /* Job Work Stock View */
        <div className="space-y-6">
          <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-xl border border-gray-200 dark:border-gray-700">
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-end gap-4">
              <div className="w-full lg:w-auto">
                <label
                  htmlFor="jobwork_ledger_party"
                  className="block text-sm font-semibold mb-2 text-gray-700 dark:text-gray-300"
                >
                  Select Party for Ledger
                </label>
                <select
                  name="jobwork_ledger_party"
                  id="jobwork_ledger_party"
                  value={selectedJobWorkParty}
                  onChange={(e) => setSelectedJobWorkParty(e.target.value)}
                  className="w-full lg:w-96 px-4 py-2.5 rounded-xl border-2 border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all font-medium"
                >
                  <option value="">All Parties</option>
                  {availableParties.map((p) => (
                    <option key={p} value={p}>
                      {p}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex flex-col sm:flex-row gap-4 w-full lg:w-auto">
                <div>
                  <label
                    htmlFor="jobwork_start_date"
                    className="block text-sm font-semibold mb-2 text-gray-700 dark:text-gray-300"
                  >
                    Start Date
                  </label>
                  <input
                    type="date"
                    name="jobwork_start_date"
                    id="jobwork_start_date"
                    value={dateRange.start_date}
                    min={getFinancialYearStartDate()}
                    max={getFinancialYearEndDate()}
                    onChange={(e) =>
                      setDateRange({ ...dateRange, start_date: e.target.value })
                    }
                    className="w-full sm:w-40 px-4 py-2.5 rounded-xl border-2 border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all"
                  />
                </div>
                <div>
                  <label
                    htmlFor="jobwork_end_date"
                    className="block text-sm font-semibold mb-2 text-gray-700 dark:text-gray-300"
                  >
                    End Date
                  </label>
                  <input
                    type="date"
                    name="jobwork_end_date"
                    id="jobwork_end_date"
                    value={dateRange.end_date}
                    min={getFinancialYearStartDate()}
                    max={getFinancialYearEndDate()}
                    onChange={(e) =>
                      setDateRange({ ...dateRange, end_date: e.target.value })
                    }
                    className="w-full sm:w-40 px-4 py-2.5 rounded-xl border-2 border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all"
                  />
                </div>
                <button
                  onClick={handlePrintJobWorkStock}
                  disabled={pdfLoading || finalStockData.length === 0}
                  className="group flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-blue-600 to-cyan-700 hover:from-blue-700 hover:to-cyan-800 text-white rounded-xl font-semibold shadow-lg shadow-blue-600/30 hover:shadow-xl hover:shadow-blue-600/40 transition-all duration-300 whitespace-nowrap hover:scale-105 mt-auto disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Printer
                    size={18}
                    className="group-hover:rotate-12 transition-transform duration-300"
                  />
                  {pdfLoading ? "Generating..." : "Print Summary"}
                </button>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
            <div className="p-6 border-b border-gray-200 dark:border-gray-700 bg-gradient-to-r from-gray-50 to-white dark:from-gray-800 dark:to-gray-800 flex justify-between items-center">
              <h3 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                <div className="p-2 bg-gradient-to-br from-blue-500 to-cyan-600 rounded-lg text-white shadow-lg">
                  <ClipboardList size={20} />
                </div>
                {selectedJobWorkParty
                  ? `${selectedJobWorkParty} - Stock Summary`
                  : "All Parties Stock Summary"}
              </h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gradient-to-r from-gray-100 to-gray-50 dark:from-gray-700 dark:to-gray-700/80 text-gray-600 dark:text-gray-300 uppercase tracking-wider text-xs font-bold sticky top-0 z-10 backdrop-blur-sm shadow-md">
                  <tr>
                    <th className="px-6 py-4 text-left whitespace-nowrap">
                      Party Name
                    </th>
                    <th className="px-6 py-4 text-left whitespace-nowrap">
                      Item Name
                    </th>
                    <th className="px-6 py-4 text-right whitespace-nowrap">
                      Opening Balance
                    </th>
                    <th className="px-6 py-4 text-right whitespace-nowrap">
                      Total Inward
                    </th>
                    <th className="px-6 py-4 text-right whitespace-nowrap">
                      Total Outward
                    </th>
                    <th className="px-6 py-4 text-right whitespace-nowrap">
                      Closing Balance
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-700/50">
                  {jobWorkStockLoading ? (
                    <tr>
                      <td colSpan="6" className="px-6 py-12 text-center">
                        <div className="flex flex-col items-center justify-center gap-3">
                          <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                          <p className="text-gray-500 font-medium">
                            Loading Stock Summary...
                          </p>
                        </div>
                      </td>
                    </tr>
                  ) : finalStockData.length === 0 ? (
                    <tr>
                      <td colSpan="6" className="px-6 py-12 text-center">
                        <div className="flex flex-col items-center justify-center gap-3">
                          <div className="w-12 h-12 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center">
                            <FileText className="text-gray-400" size={24} />
                          </div>
                          <p className="text-gray-500 font-medium">
                            No stock records found for this period
                          </p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    finalStockData.map((row, i) => (
                      <tr
                        key={i}
                        className="group hover:bg-gradient-to-r hover:from-blue-50/50 hover:to-cyan-50/30 dark:hover:from-blue-900/10 dark:hover:to-cyan-900/10 transition-all duration-300 hover:shadow-[inset_4px_0_0_0_rgb(59,130,246)]"
                      >
                        <td className="px-6 py-5 text-gray-700 dark:text-gray-300 font-medium">
                          {row.party_name}
                        </td>
                        <td className="px-6 py-5 text-gray-600 dark:text-gray-400">
                          {row.item_name}
                        </td>
                        <td className="px-6 py-5 text-right font-mono text-gray-600 dark:text-gray-400">
                          {row.opening.toFixed(2)}
                        </td>
                        <td className="px-6 py-5 text-right font-mono text-blue-600 dark:text-blue-400">
                          {row.inward.toFixed(2)}
                        </td>
                        <td className="px-6 py-5 text-right font-mono text-green-600 dark:text-green-400">
                          {row.outward.toFixed(2)}
                        </td>
                        <td className="px-6 py-5 text-right">
                          <span
                            className={`font-bold font-mono px-3 py-1.5 rounded-lg ${
                              row.closing > 0
                                ? "text-orange-600 dark:text-orange-400 bg-orange-50 dark:bg-orange-900/30"
                                : "text-gray-400 bg-gray-100 dark:bg-gray-700"
                            }`}
                          >
                            {row.closing.toFixed(2)}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {activeTab === "stock" && (
        <div className="space-y-6">
          <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-xl border border-gray-200 dark:border-gray-700">
            <div className="flex flex-col md:flex-row flex-wrap gap-4 items-end">
              <div className="w-full md:w-auto">
                <label
                  htmlFor="stock_ledger_party"
                  className="block text-sm font-semibold mb-2 text-gray-700 dark:text-gray-300"
                >
                  Select Party (Optional)
                </label>
                <select
                  name="stock_ledger_party"
                  id="stock_ledger_party"
                  value={selectedStockParty}
                  onChange={(e) => setSelectedStockParty(e.target.value)}
                  className="w-full md:w-64 px-4 py-2.5 rounded-xl border-2 border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium"
                >
                  <option value="">-- All Parties --</option>
                  {parties.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="w-full md:w-auto">
                <label
                  htmlFor="stock_ledger_item"
                  className="block text-sm font-semibold mb-2 text-gray-700 dark:text-gray-300"
                >
                  Select Item
                </label>
                <select
                  name="stock_ledger_item"
                  id="stock_ledger_item"
                  value={selectedItem}
                  onChange={(e) => setSelectedItem(e.target.value)}
                  className="w-full md:w-64 px-4 py-2.5 rounded-xl border-2 border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium"
                >
                  <option value="">-- Select Item --</option>
                  {items
                    .filter((i) =>
                      selectedStockParty
                        ? i.party_id === parseInt(selectedStockParty) ||
                          !i.party_id
                        : true,
                    )
                    .map((i) => (
                      <option key={i.id} value={i.id}>
                        {i.name}
                      </option>
                    ))}
                </select>
              </div>

              <div className="w-full md:w-auto">
                <label
                  htmlFor="stock_start_date"
                  className="block text-sm font-semibold mb-2 text-gray-700 dark:text-gray-300"
                >
                  Start Date
                </label>
                <input
                  type="date"
                  name="stock_start_date"
                  id="stock_start_date"
                  value={dateRange.start_date}
                  min={getFinancialYearStartDate()}
                  max={getFinancialYearEndDate()}
                  onChange={(e) =>
                    setDateRange({ ...dateRange, start_date: e.target.value })
                  }
                  className="w-full md:w-auto px-4 py-2.5 rounded-xl border-2 border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium"
                />
              </div>

              <div className="w-full md:w-auto">
                <label
                  htmlFor="stock_end_date"
                  className="block text-sm font-semibold mb-2 text-gray-700 dark:text-gray-300"
                >
                  End Date
                </label>
                <input
                  type="date"
                  name="stock_end_date"
                  id="stock_end_date"
                  value={dateRange.end_date}
                  min={getFinancialYearStartDate()}
                  max={getFinancialYearEndDate()}
                  onChange={(e) =>
                    setDateRange({ ...dateRange, end_date: e.target.value })
                  }
                  className="w-full md:w-auto px-4 py-2.5 rounded-xl border-2 border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium"
                />
              </div>

              {selectedItem && (
                <button
                  onClick={handlePrintStockLedger}
                  disabled={pdfLoading}
                  className="w-full md:w-auto mt-4 md:mt-0 flex items-center justify-center gap-2 px-6 py-2.5 bg-gradient-to-r from-blue-600 to-cyan-700 hover:from-blue-700 hover:to-cyan-800 text-white rounded-xl font-semibold shadow-lg shadow-blue-600/30 hover:shadow-xl hover:shadow-blue-600/40 transition-all duration-300 hover:scale-105"
                >
                  <Printer size={20} />
                  {pdfLoading ? "Generating..." : "Print Ledger"}
                </button>
              )}
            </div>
          </div>

          {/* Summary Stat Cards */}
          {stockLedgerSummary && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
              {/* Opening Balance Card */}
              <div className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 p-6 rounded-2xl border-2 border-blue-200 dark:border-blue-700 shadow-lg hover:shadow-xl transition-all duration-300">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-semibold text-blue-700 dark:text-blue-300 uppercase tracking-wide">
                    Opening Balance
                  </h3>
                  <div className="w-10 h-10 bg-blue-500 dark:bg-blue-600 rounded-full flex items-center justify-center">
                    <span className="text-white font-bold text-lg">📦</span>
                  </div>
                </div>
                <p className="text-3xl font-bold text-blue-900 dark:text-blue-100">
                  {stockLedgerSummary.opening_balance.toFixed(0)}
                </p>
                <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">
                  units
                </p>
              </div>

              {/* Inward Quantity Card */}
              <div className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20 p-6 rounded-2xl border-2 border-green-200 dark:border-green-700 shadow-lg hover:shadow-xl transition-all duration-300">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-semibold text-green-700 dark:text-green-300 uppercase tracking-wide">
                    Inward Qty
                  </h3>
                  <div className="w-10 h-10 bg-green-500 dark:bg-green-600 rounded-full flex items-center justify-center">
                    <span className="text-white font-bold text-lg">📥</span>
                  </div>
                </div>
                <p className="text-3xl font-bold text-green-900 dark:text-green-100">
                  {stockLedgerSummary.total_inward.toFixed(0)}
                </p>
                <p className="text-xs text-green-600 dark:text-green-400 mt-1">
                  units received
                </p>
              </div>

              {/* Outward Quantity Card */}
              <div className="bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-900/20 dark:to-orange-800/20 p-6 rounded-2xl border-2 border-orange-200 dark:border-orange-700 shadow-lg hover:shadow-xl transition-all duration-300">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-semibold text-orange-700 dark:text-orange-300 uppercase tracking-wide">
                    Outward Qty
                  </h3>
                  <div className="w-10 h-10 bg-orange-500 dark:bg-orange-600 rounded-full flex items-center justify-center">
                    <span className="text-white font-bold text-lg">📤</span>
                  </div>
                </div>
                <p className="text-3xl font-bold text-orange-900 dark:text-orange-100">
                  {stockLedgerSummary.total_outward.toFixed(0)}
                </p>
                <p className="text-xs text-orange-600 dark:text-orange-400 mt-1">
                  units dispatched
                </p>
              </div>

              {/* Closing Balance Card */}
              <div className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-800/20 p-6 rounded-2xl border-2 border-purple-200 dark:border-purple-700 shadow-lg hover:shadow-xl transition-all duration-300">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-semibold text-purple-700 dark:text-purple-300 uppercase tracking-wide">
                    Closing Balance
                  </h3>
                  <div className="w-10 h-10 bg-purple-500 dark:bg-purple-600 rounded-full flex items-center justify-center">
                    <span className="text-white font-bold text-lg">✅</span>
                  </div>
                </div>
                <p className="text-3xl font-bold text-purple-900 dark:text-purple-100">
                  {stockLedgerSummary.closing_balance.toFixed(0)}
                </p>
                <p className="text-xs text-purple-600 dark:text-purple-400 mt-1">
                  units in stock
                </p>
              </div>
            </div>
          )}

          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-gradient-to-r from-gray-100 to-gray-50 dark:from-gray-700 dark:to-gray-700/80 text-gray-600 dark:text-gray-300 uppercase tracking-wider text-xs font-bold sticky top-0 z-10 backdrop-blur-sm shadow-md">
                  <tr>
                    <th className="px-6 py-4 whitespace-nowrap">Date</th>
                    <th className="px-6 py-4 whitespace-nowrap">Type</th>
                    <th className="px-6 py-4 whitespace-nowrap">Ref</th>
                    <th className="px-6 py-4 whitespace-nowrap">Description</th>
                    <th className="px-6 py-4 whitespace-nowrap">Party</th>
                    <th className="px-6 py-4 text-right whitespace-nowrap">
                      In Qty
                    </th>
                    <th className="px-6 py-4 text-right whitespace-nowrap">
                      Out Qty
                    </th>
                    <th className="px-6 py-4 text-right whitespace-nowrap">
                      Balance
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-700/50">
                  {stockLedgerLoading ? (
                    <tr>
                      <td colSpan="8" className="px-6 py-12 text-center">
                        <div className="flex flex-col items-center justify-center gap-3">
                          <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                          <p className="text-gray-500 font-medium">
                            Loading Stock Ledger...
                          </p>
                        </div>
                      </td>
                    </tr>
                  ) : stockLedgerData.length === 0 ? (
                    <tr>
                      <td colSpan="8" className="px-6 py-12 text-center">
                        <div className="flex flex-col items-center justify-center gap-3">
                          <div className="w-12 h-12 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center">
                            <FileText className="text-gray-400" size={24} />
                          </div>
                          <p className="text-gray-500 font-medium">
                            No records found
                          </p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    stockLedgerData.map((row, i) => (
                      <tr
                        key={i}
                        className="group hover:bg-gradient-to-r hover:from-blue-50/50 hover:to-cyan-50/30 dark:hover:from-blue-900/10 dark:hover:to-cyan-900/10 transition-all duration-300 hover:shadow-[inset_4px_0_0_0_rgb(59,130,246)]"
                      >
                        <td className="px-6 py-5 text-gray-600 dark:text-gray-400 font-medium">
                          {row.date}
                        </td>
                        <td className="px-6 py-5">
                          <span
                            className={`inline-flex items-center px-3 py-1.5 rounded-lg text-xs font-bold border ${
                              row.type === "IN"
                                ? "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 border-blue-200 dark:border-blue-800"
                                : row.type === "OUT"
                                  ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 border-green-200 dark:border-green-800"
                                  : "bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-600"
                            }`}
                          >
                            {row.type}
                          </span>
                        </td>
                        <td className="px-6 py-5 font-mono text-xs text-gray-500 dark:text-gray-500 bg-gray-50 dark:bg-gray-800/50">
                          {row.ref}
                        </td>
                        <td className="px-6 py-5 text-gray-700 dark:text-gray-300">
                          {row.description}
                        </td>
                        <td className="px-6 py-5 text-sm text-gray-600 dark:text-gray-400 font-medium">
                          {row.party_name || "-"}
                        </td>
                        <td className="px-6 py-5 text-right">
                          {row.in_qty ? (
                            <span className="font-semibold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30 px-3 py-1.5 rounded-lg">
                              {row.in_qty}
                            </span>
                          ) : (
                            <span className="text-gray-400">-</span>
                          )}
                        </td>
                        <td className="px-6 py-5 text-right">
                          {row.out_qty ? (
                            <span className="font-semibold text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/30 px-3 py-1.5 rounded-lg">
                              {row.out_qty}
                            </span>
                          ) : (
                            <span className="text-gray-400">-</span>
                          )}
                        </td>
                        <td className="px-6 py-5 text-right">
                          <span className="font-bold text-gray-900 dark:text-white bg-gray-100 dark:bg-gray-700 px-3 py-1.5 rounded-lg">
                            {row.balance}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {activeTab === "gst" && (
        <div className="space-y-6">
          <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-xl border border-gray-200 dark:border-gray-700">
            <div className="flex flex-col xl:flex-row flex-wrap gap-4 items-end justify-between">
              <div className="flex flex-col md:flex-row flex-wrap gap-4 items-end w-full xl:w-auto">
                <div className="w-full md:w-auto">
                  <label
                    htmlFor="gst_party"
                    className="block text-sm font-semibold mb-2 text-gray-700 dark:text-gray-300"
                  >
                    Select Party (Optional)
                  </label>
                  <select
                    name="gst_party"
                    id="gst_party"
                    value={selectedGSTParty}
                    onChange={(e) => setSelectedGSTParty(e.target.value)}
                    className="w-full md:w-64 px-4 py-2.5 rounded-xl border-2 border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium"
                  >
                    <option value="">-- All Parties --</option>
                    {parties.map((p) => (
                      <option key={p.id} value={p.name}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="w-full md:w-auto">
                  <label
                    htmlFor="gst_start_date"
                    className="block text-sm font-semibold mb-2 text-gray-700 dark:text-gray-300"
                  >
                    Start Date
                  </label>
                  <input
                    type="date"
                    name="gst_start_date"
                    id="gst_start_date"
                    value={dateRange.start_date}
                    min={getFinancialYearStartDate()}
                    max={getFinancialYearEndDate()}
                    onChange={(e) =>
                      setDateRange({ ...dateRange, start_date: e.target.value })
                    }
                    className="w-full md:w-auto px-4 py-2.5 rounded-xl border-2 border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium"
                  />
                </div>
                <div className="w-full md:w-auto">
                  <label
                    htmlFor="gst_end_date"
                    className="block text-sm font-semibold mb-2 text-gray-700 dark:text-gray-300"
                  >
                    End Date
                  </label>
                  <input
                    type="date"
                    name="gst_end_date"
                    id="gst_end_date"
                    value={dateRange.end_date}
                    min={getFinancialYearStartDate()}
                    max={getFinancialYearEndDate()}
                    onChange={(e) =>
                      setDateRange({ ...dateRange, end_date: e.target.value })
                    }
                    className="w-full md:w-auto px-4 py-2.5 rounded-xl border-2 border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium"
                  />
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-3 w-full xl:w-auto">
                <button
                  onClick={exportGSTReport}
                  className="w-full sm:w-auto group flex items-center justify-center gap-2 px-5 py-2.5 bg-gradient-to-r from-green-600 to-emerald-700 hover:from-green-700 hover:to-emerald-800 text-white rounded-xl font-semibold shadow-lg shadow-green-600/30 hover:shadow-xl hover:shadow-green-600/40 transition-all duration-300 whitespace-nowrap hover:scale-105"
                >
                  <Download
                    size={18}
                    className="group-hover:-translate-y-0.5 transition-transform duration-300"
                  />
                  Export GSTR-1
                </button>
                <button
                  onClick={handlePrintGSTReport}
                  disabled={pdfLoading}
                  className="w-full sm:w-auto group flex items-center justify-center gap-2 px-5 py-2.5 bg-gradient-to-r from-blue-600 to-cyan-700 hover:from-blue-700 hover:to-cyan-800 text-white rounded-xl font-semibold shadow-lg shadow-blue-600/30 hover:shadow-xl hover:shadow-blue-600/40 transition-all duration-300 whitespace-nowrap hover:scale-105"
                >
                  <Printer
                    size={18}
                    className="group-hover:rotate-12 transition-transform duration-300"
                  />
                  {pdfLoading ? "Generating..." : "Print PDF"}
                </button>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="group relative bg-gradient-to-br from-emerald-50 to-teal-100 dark:from-emerald-900/30 dark:to-teal-800/20 p-6 rounded-2xl shadow-lg shadow-emerald-500/20 dark:shadow-emerald-500/10 hover:shadow-emerald-500/30 dark:hover:shadow-emerald-500/20 border border-gray-200 dark:border-gray-700 transition-all duration-300 hover:scale-105 hover:-translate-y-1 overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 dark:bg-black/10 rounded-full -mr-16 -mt-16 group-hover:scale-150 transition-transform duration-500"></div>
              <div className="relative">
                <p className="text-sm text-emerald-600 dark:text-emerald-400 font-semibold uppercase tracking-wider">
                  Total Taxable Value
                </p>
                <h3 className="text-3xl font-bold text-gray-900 dark:text-white mt-2 tabular-nums">
                  ₹
                  {gstData
                    .filter(
                      (item) =>
                        !selectedGSTParty ||
                        item.party_name === selectedGSTParty,
                    )
                    .reduce((sum, item) => sum + item.taxable_value, 0)
                    .toLocaleString()}
                </h3>
              </div>
            </div>
            <div className="group relative bg-gradient-to-br from-amber-50 to-orange-100 dark:from-amber-900/30 dark:to-orange-800/20 p-6 rounded-2xl shadow-lg shadow-amber-500/20 dark:shadow-amber-500/10 hover:shadow-amber-500/30 dark:hover:shadow-amber-500/20 border border-gray-200 dark:border-gray-700 transition-all duration-300 hover:scale-105 hover:-translate-y-1 overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 dark:bg-black/10 rounded-full -mr-16 -mt-16 group-hover:scale-150 transition-transform duration-500"></div>
              <div className="relative">
                <p className="text-sm text-amber-600 dark:text-amber-400 font-semibold uppercase tracking-wider">
                  Total Tax (IGST+CGST+SGST)
                </p>
                <h3 className="text-3xl font-bold text-gray-900 dark:text-white mt-2 tabular-nums">
                  ₹
                  {gstData
                    .filter(
                      (item) =>
                        !selectedGSTParty ||
                        item.party_name === selectedGSTParty,
                    )
                    .reduce(
                      (sum, item) => sum + item.igst + item.cgst + item.sgst,
                      0,
                    )
                    .toLocaleString()}
                </h3>
              </div>
            </div>
            <div className="group relative bg-gradient-to-br from-indigo-50 to-purple-100 dark:from-indigo-900/30 dark:to-purple-800/20 p-6 rounded-2xl shadow-lg shadow-indigo-500/20 dark:shadow-indigo-500/10 hover:shadow-indigo-500/30 dark:hover:shadow-indigo-500/20 border border-gray-200 dark:border-gray-700 transition-all duration-300 hover:scale-105 hover:-translate-y-1 overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 dark:bg-black/10 rounded-full -mr-16 -mt-16 group-hover:scale-150 transition-transform duration-500"></div>
              <div className="relative">
                <p className="text-sm text-indigo-600 dark:text-indigo-400 font-semibold uppercase tracking-wider">
                  Invoice Count
                </p>
                <h3 className="text-3xl font-bold text-gray-900 dark:text-white mt-2 tabular-nums">
                  {
                    gstData.filter(
                      (item) =>
                        !selectedGSTParty ||
                        item.party_name === selectedGSTParty,
                    ).length
                  }
                </h3>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-gradient-to-r from-gray-100 to-gray-50 dark:from-gray-700 dark:to-gray-700/80 text-gray-600 dark:text-gray-300 uppercase tracking-wider text-xs font-bold sticky top-0 z-10 backdrop-blur-sm shadow-md">
                  <tr>
                    <th className="px-6 py-4 whitespace-nowrap">Date</th>
                    <th className="px-6 py-4 whitespace-nowrap">Invoice No</th>
                    <th className="px-6 py-4 whitespace-nowrap">Party Name</th>
                    <th className="px-6 py-4 whitespace-nowrap">GSTIN</th>
                    <th className="px-6 py-4 text-right whitespace-nowrap">
                      Taxable
                    </th>
                    <th className="px-6 py-4 text-right whitespace-nowrap">
                      SGST
                    </th>
                    <th className="px-6 py-4 text-right whitespace-nowrap">
                      CGST
                    </th>
                    <th className="px-6 py-4 text-right whitespace-nowrap">
                      IGST
                    </th>
                    <th className="px-6 py-4 text-right whitespace-nowrap">
                      Total
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-700/50">
                  {gstLoading ? (
                    <tr>
                      <td colSpan="9" className="px-6 py-12 text-center">
                        <div className="flex flex-col items-center justify-center gap-3">
                          <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                          <p className="text-gray-500 font-medium">
                            Loading GST Data...
                          </p>
                        </div>
                      </td>
                    </tr>
                  ) : gstData.filter(
                      (item) =>
                        !selectedGSTParty ||
                        item.party_name === selectedGSTParty,
                    ).length === 0 ? (
                    <tr>
                      <td colSpan="9" className="px-6 py-12 text-center">
                        <div className="flex flex-col items-center justify-center gap-3">
                          <div className="w-12 h-12 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center">
                            <FileText className="text-gray-400" size={24} />
                          </div>
                          <p className="text-gray-500 font-medium">
                            No records found
                          </p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    gstData
                      .filter(
                        (item) =>
                          !selectedGSTParty ||
                          item.party_name === selectedGSTParty,
                      )
                      .map((row) => (
                        <tr
                          key={row.id}
                          className="group hover:bg-gradient-to-r hover:from-purple-50/50 hover:to-violet-50/30 dark:hover:from-purple-900/10 dark:hover:to-violet-900/10 transition-all duration-300 hover:shadow-[inset_4px_0_0_0_rgb(147,51,234)]"
                        >
                          <td className="px-6 py-5 text-gray-600 dark:text-gray-400 font-medium">
                            {row.date}
                          </td>
                          <td className="px-6 py-5">
                            <span className="font-semibold text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-900/30 px-3 py-1.5 rounded-lg">
                              {row.invoice_number}
                            </span>
                          </td>
                          <td className="px-6 py-5 text-gray-900 dark:text-gray-100 font-semibold">
                            {row.party_name}
                          </td>
                          <td className="px-6 py-5 text-gray-500 dark:text-gray-500 font-mono text-xs">
                            {row.gstin}
                          </td>
                          <td className="px-6 py-5 text-right">
                            <span className="font-semibold text-gray-900 dark:text-white bg-gray-100 dark:bg-gray-700 px-3 py-1.5 rounded-lg">
                              {row.taxable_value.toFixed(2)}
                            </span>
                          </td>
                          <td className="px-6 py-5 text-right">
                            <span className="text-gray-600 dark:text-gray-400 font-medium">
                              {row.sgst.toFixed(2)}
                            </span>
                          </td>
                          <td className="px-6 py-5 text-right">
                            <span className="text-gray-600 dark:text-gray-400 font-medium">
                              {row.cgst.toFixed(2)}
                            </span>
                          </td>
                          <td className="px-6 py-5 text-right">
                            <span className="text-gray-600 dark:text-gray-400 font-medium">
                              {row.igst.toFixed(2)}
                            </span>
                          </td>
                          <td className="px-6 py-5 text-right">
                            <span className="font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30 px-3 py-1.5 rounded-lg">
                              {row.total_amount.toFixed(2)}
                            </span>
                          </td>
                        </tr>
                      ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
      {activeTab === "grn" && (
        <div className="space-y-6">
          <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-xl border border-gray-200 dark:border-gray-700">
            <div className="flex flex-col md:flex-row flex-wrap gap-4 items-end">
              <div className="w-full md:w-auto">
                <label
                  htmlFor="grn_party_id"
                  className="block text-sm font-semibold mb-2 text-gray-700 dark:text-gray-300"
                >
                  Select Party
                </label>
                <select
                  name="grn_party_id"
                  id="grn_party_id"
                  value={selectedGRNParty}
                  onChange={(e) => setSelectedGRNParty(e.target.value)}
                  className="w-full md:w-64 px-4 py-2.5 rounded-xl border-2 border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 transition-all font-medium"
                >
                  <option value="">-- All Parties --</option>
                  {parties.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="w-full md:w-auto">
                <label
                  htmlFor="grn_start_date"
                  className="block text-sm font-semibold mb-2 text-gray-700 dark:text-gray-300"
                >
                  Start Date
                </label>
                <input
                  type="date"
                  name="grn_start_date"
                  id="grn_start_date"
                  value={dateRange.start_date}
                  min={getFinancialYearStartDate()}
                  max={getFinancialYearEndDate()}
                  onChange={(e) =>
                    setDateRange({ ...dateRange, start_date: e.target.value })
                  }
                  className="w-full md:w-auto px-4 py-2.5 rounded-xl border-2 border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 transition-all font-medium"
                />
              </div>

              <div className="w-full md:w-auto">
                <label
                  htmlFor="grn_end_date"
                  className="block text-sm font-semibold mb-2 text-gray-700 dark:text-gray-300"
                >
                  End Date
                </label>
                <input
                  type="date"
                  name="grn_end_date"
                  id="grn_end_date"
                  value={dateRange.end_date}
                  min={getFinancialYearStartDate()}
                  max={getFinancialYearEndDate()}
                  onChange={(e) =>
                    setDateRange({ ...dateRange, end_date: e.target.value })
                  }
                  className="w-full md:w-auto px-4 py-2.5 rounded-xl border-2 border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 transition-all font-medium"
                />
              </div>

              <div className="flex-1"></div>

              <button
                onClick={fetchGRNReport}
                className="w-full md:w-auto mt-4 md:mt-0 flex items-center justify-center gap-2 px-6 py-2.5 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 rounded-xl font-semibold transition-all duration-300"
              >
                <Filter size={20} />
                Filter
              </button>

              <button
                onClick={handlePrintGRNReport}
                disabled={
                  pdfLoading || grnData.length === 0 || !selectedGRNParty
                }
                className="w-full md:w-auto mt-4 md:mt-0 flex items-center justify-center gap-2 px-6 py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white rounded-xl font-semibold shadow-lg shadow-purple-600/30 hover:shadow-xl hover:shadow-purple-600/40 transition-all duration-300 hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Printer size={20} />
                {pdfLoading ? "Generating..." : "Print GRN Report"}
              </button>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-gradient-to-r from-gray-100 to-gray-50 dark:from-gray-700 dark:to-gray-700/80 text-gray-600 dark:text-gray-300 uppercase tracking-wider text-xs font-bold sticky top-0 z-10 backdrop-blur-sm shadow-md">
                  <tr>
                    <th className="px-6 py-4 whitespace-nowrap">Date</th>
                    <th className="px-6 py-4 whitespace-nowrap">Invoice No</th>
                    <th className="px-6 py-4 whitespace-nowrap">Party Name</th>
                    <th className="px-6 py-4 whitespace-nowrap">Challan No</th>
                    <th className="px-6 py-4 whitespace-nowrap">GRN No</th>
                    <th className="px-6 py-4 whitespace-nowrap">Item</th>
                    <th className="px-6 py-4 text-right whitespace-nowrap">
                      Qty
                    </th>
                    <th className="px-6 py-4 text-right whitespace-nowrap">
                      Rate
                    </th>
                    <th className="px-6 py-4 text-right whitespace-nowrap">
                      Amount
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-700/50">
                  {grnLoading ? (
                    <tr>
                      <td colSpan="8" className="px-6 py-12 text-center">
                        <div className="flex flex-col items-center justify-center gap-3">
                          <div className="w-8 h-8 border-2 border-purple-600 border-t-transparent rounded-full animate-spin"></div>
                          <p className="text-gray-500 font-medium">
                            Loading GRN Data...
                          </p>
                        </div>
                      </td>
                    </tr>
                  ) : grnData.length === 0 ? (
                    <tr>
                      <td colSpan="8" className="px-6 py-12 text-center">
                        <div className="flex flex-col items-center justify-center gap-3">
                          <div className="w-12 h-12 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center">
                            <FileText className="text-gray-400" size={24} />
                          </div>
                          <p className="text-gray-500 font-medium">
                            No GRN records found
                          </p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    grnData.map((row) => (
                      <tr
                        key={row.id}
                        className="group hover:bg-gradient-to-r hover:from-purple-50/50 hover:to-indigo-50/30 dark:hover:from-purple-900/10 dark:hover:to-indigo-900/10 transition-all duration-300 hover:shadow-[inset_4px_0_0_0_rgb(147,51,234)]"
                      >
                        <td className="px-6 py-5 text-gray-600 dark:text-gray-400 font-medium">
                          {row.invoice_date}
                        </td>
                        <td className="px-6 py-5">
                          <span className="font-semibold text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-900/30 px-3 py-1.5 rounded-lg">
                            {row.invoice_number}
                          </span>
                        </td>
                        <td className="px-6 py-5 text-gray-900 dark:text-gray-100 font-semibold">
                          {row.party_name}
                        </td>
                        <td className="px-6 py-5 text-gray-700 dark:text-gray-300 font-mono">
                          {row.challan_no || "-"}
                        </td>
                        <td className="px-6 py-5 text-gray-700 dark:text-gray-300 font-mono">
                          {row.grn_no || "-"}
                        </td>
                        <td className="px-6 py-5 text-gray-700 dark:text-gray-300">
                          {row.item_name}
                        </td>
                        <td className="px-6 py-5 text-right font-medium text-gray-900 dark:text-white">
                          {Math.round(row.quantity)}
                        </td>
                        <td className="px-6 py-5 text-right text-gray-600 dark:text-gray-400">
                          {row.rate.toFixed(2)}
                        </td>
                        <td className="px-6 py-5 text-right">
                          <span className="font-bold text-gray-900 dark:text-white bg-gray-100 dark:bg-gray-700 px-3 py-1.5 rounded-lg">
                            {row.amount.toLocaleString("en-IN", {
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 2,
                            })}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* PDF Preview Modal */}
      <PdfPreviewModal
        isOpen={!!previewDoc}
        onClose={() => setPreviewDoc(null)}
        pdfUrl={previewDoc?.url}
        title={previewDoc?.title}
        fileName={`${previewDoc?.title}.pdf`}
      />
    </div>
  );
}

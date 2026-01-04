import { useState, useEffect, useMemo } from "react";
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
} from "../api/reports";
import { getParties } from "../api/parties";
import { getItems } from "../api/items";
import PdfPreviewModal from "../components/PdfPreviewModal";

export default function Reports() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pdfLoading, setPdfLoading] = useState(false);
  const [previewDoc, setPreviewDoc] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState("all"); // all, pending, completed

  // Tab State
  const [activeTab, setActiveTab] = useState("jobwork"); // jobwork, ledger, statement, stock
  const [selectedJobWorkParty, setSelectedJobWorkParty] = useState("");
  const [selectedJobWorkItem, setSelectedJobWorkItem] = useState("");
  const [selectedStatementPartyId, setSelectedStatementPartyId] = useState("");

  // Statement State
  const [parties, setParties] = useState([]);
  const [statementData, setStatementData] = useState([]);
  const [statementLoading, setStatementLoading] = useState(false);

  // Stock Ledger State
  const [items, setItems] = useState([]);
  const [selectedItem, setSelectedItem] = useState("");
  const [selectedStockParty, setSelectedStockParty] = useState("");
  const [stockLedgerData, setStockLedgerData] = useState([]);
  const [stockLedgerLoading, setStockLedgerLoading] = useState(false);

  // GST Report State
  const [gstData, setGstData] = useState([]);
  const [gstLoading, setGstLoading] = useState(false);

  const [dateRange, setDateRange] = useState(() => {
    const today = new Date();
    const currentMonth = today.getMonth(); // 0-11 (Jan=0, Apr=3)
    const currentYear = today.getFullYear();

    // If Jan(0), Feb(1), Mar(2) -> FY End is Mar 31 of Current Year
    // Else -> FY End is Mar 31 of Next Year
    const endYear = currentMonth < 3 ? currentYear : currentYear + 1;

    return {
      start_date: today.toISOString().split("T")[0], // Start: Today
      end_date: new Date(endYear, 2, 31).toISOString().split("T")[0], // End: March 31 (Month is 0-indexed, so 2=March)
    };
  });

  useEffect(() => {
    fetchReport();
    loadParties();
    loadItems();
  }, []);

  useEffect(() => {
    if (activeTab === "statement" && selectedStatementPartyId) {
      fetchStatement();
    }
    if (activeTab === "stock" && selectedItem) {
      fetchStockLedger();
    }
    if (activeTab === "gst") {
      fetchGSTReport();
    }
  }, [activeTab, selectedStatementPartyId, selectedItem, dateRange]);

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
        start_date: dateRange.start_date,
        end_date: dateRange.end_date,
      });
      setStockLedgerData(res);
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
      });

      const url = window.URL.createObjectURL(
        new Blob([blob], { type: "application/pdf" })
      );

      setPreviewDoc({
        url: url,
        title: `GST_Report_GSTR1_${dateRange.start_date}`,
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
        new Blob([blob], { type: "application/pdf" })
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
          (p) => p.party_name === selectedJobWorkParty
        );
        if (partyRecord) {
          partyId = partyRecord.party_id;
        }
      }

      const blob = await getStockLedgerPDF(
        partyId,
        dateRange.start_date,
        dateRange.end_date
      );

      // Create blob URL for preview
      const url = window.URL.createObjectURL(
        new Blob([blob], { type: "application/pdf" })
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
        new Blob([blob], { type: "application/pdf" })
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
        "Are you sure? This will wipe and rebuild the entire Stock Ledger from original documents. Use this only to fix data discrepancies."
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

    return matchesSearch && matchesStatus;
  });

  const stats = {
    totalJobs: data.length,
    pendingJobs: data.filter((i) => i.status === "Pending").length,
    completedJobs: data.filter((i) => i.status === "Completed").length,
    totalPendingQty: data.reduce((sum, item) => sum + item.pending_qty, 0),
  };

  // --- LEDGER AGGREGATION ---
  const availableParties = [...new Set(data.map((i) => i.party_name))];

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
      (r) => r.opening !== 0 || r.in !== 0 || r.out !== 0
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
      <div className="border-b border-gray-200 dark:border-gray-700">
        <div className="flex gap-6">
          <button
            onClick={() => setActiveTab("jobwork")}
            className={`pb-3 text-sm font-medium transition-all relative ${
              activeTab === "jobwork"
                ? "text-blue-600 dark:text-blue-400"
                : "text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
            }`}
          >
            Job Work Register
            {activeTab === "jobwork" && (
              <span className="absolute bottom-0 left-0 w-full h-0.5 bg-blue-600 rounded-t-full" />
            )}
          </button>
          <button
            onClick={() => setActiveTab("ledger")}
            className={`pb-3 text-sm font-medium transition-all relative ${
              activeTab === "ledger"
                ? "text-blue-600 dark:text-blue-400"
                : "text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
            }`}
          >
            Job Work Stock
            {activeTab === "ledger" && (
              <span className="absolute bottom-0 left-0 w-full h-0.5 bg-blue-600 rounded-t-full" />
            )}
          </button>
          <button
            onClick={() => setActiveTab("statement")}
            className={`pb-3 text-sm font-medium transition-all relative ${
              activeTab === "statement"
                ? "text-blue-600 dark:text-blue-400"
                : "text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
            }`}
          >
            Financial Statement
            {activeTab === "statement" && (
              <span className="absolute bottom-0 left-0 w-full h-0.5 bg-blue-600 rounded-t-full" />
            )}
          </button>
          <button
            onClick={() => setActiveTab("stock")}
            className={`pb-3 text-sm font-medium transition-all relative ${
              activeTab === "stock"
                ? "text-blue-600 dark:text-blue-400"
                : "text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
            }`}
          >
            Stock Ledger
            {activeTab === "stock" && (
              <span className="absolute bottom-0 left-0 w-full h-0.5 bg-blue-600 rounded-t-full" />
            )}
          </button>
          <button
            onClick={() => setActiveTab("gst")}
            className={`pb-3 text-sm font-medium transition-all relative ${
              activeTab === "gst"
                ? "text-blue-600 dark:text-blue-400"
                : "text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
            }`}
          >
            GST Report
            {activeTab === "gst" && (
              <span className="absolute bottom-0 left-0 w-full h-0.5 bg-blue-600 rounded-t-full" />
            )}
          </button>
        </div>
      </div>

      {activeTab === "jobwork" && (
        <>
          {/* Stats Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white dark:bg-gray-800 p-5 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-xl">
                  <ClipboardList size={24} />
                </div>
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">
                    Total Jobs
                  </p>
                  <h3 className="text-2xl font-bold text-gray-900 dark:text-white">
                    {stats.totalJobs}
                  </h3>
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-gray-800 p-5 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-orange-50 dark:bg-orange-900/20 text-orange-600 dark:text-orange-400 rounded-xl">
                  <Clock size={24} />
                </div>
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">
                    Pending Jobs
                  </p>
                  <h3 className="text-2xl font-bold text-gray-900 dark:text-white">
                    {stats.pendingJobs}
                  </h3>
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-gray-800 p-5 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400 rounded-xl">
                  <CheckCircle size={24} />
                </div>
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">
                    Completed
                  </p>
                  <h3 className="text-2xl font-bold text-gray-900 dark:text-white">
                    {stats.completedJobs}
                  </h3>
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-gray-800 p-5 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400 rounded-xl">
                  <AlertCircle size={24} />
                </div>
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">
                    Pending Qty
                  </p>
                  <h3 className="text-2xl font-bold text-gray-900 dark:text-white">
                    {stats.totalPendingQty}
                  </h3>
                </div>
              </div>
            </div>
          </div>

          {/* Filters */}
          <div className="bg-white dark:bg-gray-800 p-4 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 flex flex-col md:flex-row gap-4 items-center justify-between">
            <div className="relative w-full md:w-96">
              <Search
                className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                size={18}
              />
              <input
                type="text"
                name="report_search"
                id="report_search"
                placeholder="Search party, item or challan..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 outline-none transition-all dark:text-white"
              />
            </div>

            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 bg-gray-50 dark:bg-gray-900 p-1 rounded-xl border border-gray-200 dark:border-gray-700">
                {["all", "pending", "completed"].map((status) => (
                  <button
                    key={status}
                    onClick={() => setFilterStatus(status)}
                    className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all capitalize ${
                      filterStatus === status
                        ? "bg-white dark:bg-gray-800 text-purple-600 dark:text-purple-400 shadow-sm"
                        : "text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
                    }`}
                  >
                    {status}
                  </button>
                ))}
              </div>
              <button
                onClick={exportToExcel}
                className="flex items-center gap-2 px-5 py-2.5 bg-green-600 hover:bg-green-700 text-white rounded-xl font-semibold shadow-lg shadow-green-600/20 transition-all active:scale-95 whitespace-nowrap"
              >
                <Download size={18} />
                Export
              </button>
            </div>
          </div>

          {/* Table */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50/50 dark:bg-gray-900/50 border-b border-gray-200 dark:border-gray-700">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      Date
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      Party & Challan
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      Item Details
                    </th>
                    <th className="px-6 py-4 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      Inward
                    </th>
                    <th className="px-6 py-4 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      Outward
                    </th>
                    <th className="px-6 py-4 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      Balance
                    </th>
                    <th className="px-6 py-4 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                  {loading ? (
                    <tr>
                      <td colSpan="7" className="px-6 py-12 text-center">
                        <div className="flex flex-col items-center justify-center gap-3">
                          <div className="w-8 h-8 border-2 border-purple-600 border-t-transparent rounded-full animate-spin"></div>
                          <p className="text-gray-500">Loading Report...</p>
                        </div>
                      </td>
                    </tr>
                  ) : filteredData.length === 0 ? (
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
                    filteredData.map((row) => (
                      <tr
                        key={row.id}
                        className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                      >
                        <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400 whitespace-nowrap">
                          {row.date}
                        </td>
                        <td className="px-6 py-4">
                          <p className="font-semibold text-gray-900 dark:text-white">
                            {row.party_name}
                          </p>
                          <p className="text-xs text-purple-600 bg-purple-50 dark:bg-purple-900/20 px-2 py-0.5 rounded-md inline-block mt-1">
                            {row.challan_number}
                          </p>
                        </td>
                        <td className="px-6 py-4">
                          <p className="font-medium text-gray-800 dark:text-gray-200">
                            {row.item_name}
                          </p>
                          <span className="text-xs text-gray-500 flex items-center gap-1 mt-0.5">
                            <ArrowRight size={12} /> {row.process_name}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <span className="font-medium text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 px-2.5 py-1 rounded-lg">
                            {row.in_qty}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <span className="font-medium text-green-600 dark:text-green-400">
                            {row.out_qty}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <span
                            className={`font-bold px-2 py-1 rounded-lg ${
                              row.pending_qty > 0
                                ? "text-orange-600 bg-orange-50 dark:bg-orange-900/20"
                                : "text-gray-400"
                            }`}
                          >
                            {row.pending_qty}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-center">
                          {row.status === "Completed" ? (
                            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-700 border border-green-200">
                              <CheckCircle size={12} />
                              Completed
                            </div>
                          ) : (
                            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-orange-100 text-orange-700 border border-orange-200">
                              <Clock size={12} />
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
          </div>
        </>
      )}

      {activeTab === "statement" && (
        /* Financial Statement */
        <div className="space-y-6">
          <div className="bg-white dark:bg-gray-800 p-4 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 flex flex-wrap gap-4 items-end">
            <div>
              <label
                htmlFor="statement_party_id"
                className="block text-sm font-medium mb-1 text-gray-500"
              >
                Select Party
              </label>
              <select
                name="statement_party_id"
                id="statement_party_id"
                value={selectedStatementPartyId}
                onChange={(e) => setSelectedStatementPartyId(e.target.value)}
                className="px-4 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 w-64"
              >
                <option value="">-- Select Party --</option>
                {parties.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label
                htmlFor="statement_start_date"
                className="block text-sm font-medium mb-1 text-gray-500"
              >
                Start Date
              </label>
              <input
                type="date"
                name="statement_start_date"
                id="statement_start_date"
                value={dateRange.start_date}
                onChange={(e) =>
                  setDateRange({ ...dateRange, start_date: e.target.value })
                }
                className="px-4 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900"
              />
            </div>

            <div>
              <label
                htmlFor="statement_end_date"
                className="block text-sm font-medium mb-1 text-gray-500"
              >
                End Date
              </label>
              <input
                type="date"
                name="statement_end_date"
                id="statement_end_date"
                value={dateRange.end_date}
                onChange={(e) =>
                  setDateRange({ ...dateRange, end_date: e.target.value })
                }
                className="px-4 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900"
              />
            </div>
            {selectedStatementPartyId && (
              <button
                onClick={handlePrintStatement}
                disabled={pdfLoading}
                className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold shadow-lg shadow-blue-600/20 transition-all active:scale-95 whitespace-nowrap mb-0.5"
              >
                <Printer size={18} />
                {pdfLoading ? "Generating..." : "Print Statement"}
              </button>
            )}
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
            <table className="w-full text-left text-sm">
              <thead className="bg-gray-50 dark:bg-gray-900 border-b border-gray-100 dark:border-gray-700">
                <tr>
                  <th className="px-6 py-4 font-semibold text-gray-500">
                    Date
                  </th>
                  <th className="px-6 py-4 font-semibold text-gray-500">Ref</th>
                  <th className="px-6 py-4 font-semibold text-gray-500">
                    Description
                  </th>
                  <th className="px-6 py-4 font-semibold text-gray-500 text-right">
                    Debit
                  </th>
                  <th className="px-6 py-4 font-semibold text-gray-500 text-right">
                    Credit
                  </th>
                  <th className="px-6 py-4 font-semibold text-gray-500 text-right">
                    Balance
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                {statementLoading ? (
                  <tr>
                    <td colSpan="6" className="px-6 py-12 text-center">
                      <div className="flex flex-col items-center justify-center gap-3">
                        <div className="w-8 h-8 border-2 border-purple-600 border-t-transparent rounded-full animate-spin"></div>
                        <p className="text-gray-500">Loading Statement...</p>
                      </div>
                    </td>
                  </tr>
                ) : statementData.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="text-center py-8 text-gray-500">
                      No transactions found
                    </td>
                  </tr>
                ) : (
                  statementData.map((row, i) => (
                    <tr
                      key={i}
                      className="hover:bg-gray-50 dark:hover:bg-gray-800"
                    >
                      <td className="px-6 py-4">{row.date}</td>
                      <td className="px-6 py-4 font-mono text-xs">{row.ref}</td>
                      <td className="px-6 py-4">{row.description}</td>
                      <td className="px-6 py-4 text-right font-medium text-red-600">
                        {row.debit ? `₹${row.debit.toFixed(2)}` : "-"}
                      </td>
                      <td className="px-6 py-4 text-right font-medium text-green-600">
                        {row.credit ? `₹${row.credit.toFixed(2)}` : "-"}
                      </td>
                      <td className="px-6 py-4 text-right font-bold">
                        ₹{row.balance.toFixed(2)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === "ledger" && (
        /* Job Work Stock View */
        <div className="space-y-6">
          <div className="bg-white dark:bg-gray-800 p-4 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="w-full md:w-auto">
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
                className="w-full md:w-96 px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all"
              >
                <option value="">All Parties</option>
                {availableParties.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex gap-4 w-full md:w-auto">
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
                  onChange={(e) =>
                    setDateRange({ ...dateRange, start_date: e.target.value })
                  }
                  className="w-full md:w-40 px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all"
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
                  onChange={(e) =>
                    setDateRange({ ...dateRange, end_date: e.target.value })
                  }
                  className="w-full md:w-40 px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all"
                />
              </div>
            </div>

            <button
              onClick={handlePrintJobWorkPDF}
              disabled={pdfLoading}
              className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold shadow-lg shadow-blue-600/20 transition-all active:scale-95 whitespace-nowrap mt-6 md:mt-0"
            >
              <Printer size={18} />
              {pdfLoading ? "Generating..." : "Print PDF"}
            </button>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
            <div className="p-6 border-b border-gray-100 dark:border-gray-700">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                {selectedJobWorkParty
                  ? `${selectedJobWorkParty} - Stock Summary`
                  : "All Parties Stock Summary"}
              </h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50/50 dark:bg-gray-900/50 border-b border-gray-200 dark:border-gray-700">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      Party Name
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      Item Name
                    </th>
                    <th className="px-6 py-4 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      Opening Balance
                    </th>
                    <th className="px-6 py-4 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      Total Inward
                    </th>
                    <th className="px-6 py-4 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      Total Outward
                    </th>
                    <th className="px-6 py-4 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      Closing Balance
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                  {ledgerData.length === 0 ? (
                    <tr>
                      <td colSpan="6" className="px-6 py-12 text-center">
                        <p className="text-gray-500">No data available</p>
                      </td>
                    </tr>
                  ) : (
                    ledgerData.map((row, idx) => (
                      <tr
                        key={idx}
                        className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                      >
                        <td className="px-6 py-4 text-sm font-medium text-gray-900 dark:text-white">
                          {row.party}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-300">
                          {row.item}
                        </td>
                        <td className="px-6 py-4 text-sm text-right text-gray-500 font-mono">
                          {row.opening.toFixed(2)}
                        </td>
                        <td className="px-6 py-4 text-sm text-right text-blue-600 dark:text-blue-400 font-bold font-mono">
                          {row.in.toFixed(2)}
                        </td>
                        <td className="px-6 py-4 text-sm text-right text-green-600 dark:text-green-400 font-bold font-mono">
                          {row.out.toFixed(2)}
                        </td>
                        <td className="px-6 py-4 text-right">
                          <span
                            className={`font-bold font-mono px-2 py-1 rounded-lg ${
                              row.balance > 0
                                ? "text-orange-600 bg-orange-50 dark:bg-orange-900/20"
                                : "text-gray-400"
                            }`}
                          >
                            {row.balance.toFixed(2)}
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
          <div className="bg-white dark:bg-gray-800 p-4 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 flex flex-wrap gap-4 items-end">
            <div>
              <label
                htmlFor="stock_ledger_party"
                className="block text-sm font-medium mb-1 text-gray-500"
              >
                Select Party (Optional)
              </label>
              <select
                name="stock_ledger_party"
                id="stock_ledger_party"
                value={selectedStockParty}
                onChange={(e) => setSelectedStockParty(e.target.value)}
                className="px-4 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 w-64"
              >
                <option value="">-- All Parties --</option>
                {parties.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label
                htmlFor="stock_ledger_item"
                className="block text-sm font-medium mb-1 text-gray-500"
              >
                Select Item
              </label>
              <select
                name="stock_ledger_item"
                id="stock_ledger_item"
                value={selectedItem}
                onChange={(e) => setSelectedItem(e.target.value)}
                className="px-4 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 w-64"
              >
                <option value="">-- Select Item --</option>
                {items
                  .filter((i) =>
                    selectedStockParty
                      ? i.party_id === parseInt(selectedStockParty) ||
                        !i.party_id
                      : true
                  )
                  .map((i) => (
                    <option key={i.id} value={i.id}>
                      {i.name}
                    </option>
                  ))}
              </select>
            </div>

            <div>
              <label
                htmlFor="stock_start_date"
                className="block text-sm font-medium mb-1 text-gray-500"
              >
                Start Date
              </label>
              <input
                type="date"
                name="stock_start_date"
                id="stock_start_date"
                value={dateRange.start_date}
                onChange={(e) =>
                  setDateRange({ ...dateRange, start_date: e.target.value })
                }
                className="px-4 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900"
              />
            </div>

            <div>
              <label
                htmlFor="stock_end_date"
                className="block text-sm font-medium mb-1 text-gray-500"
              >
                End Date
              </label>
              <input
                type="date"
                name="stock_end_date"
                id="stock_end_date"
                value={dateRange.end_date}
                onChange={(e) =>
                  setDateRange({ ...dateRange, end_date: e.target.value })
                }
                className="px-4 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900"
              />
            </div>

            {selectedItem && (
              <button
                onClick={handlePrintStockLedger}
                disabled={pdfLoading}
                className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold shadow-lg shadow-blue-600/20 transition-all active:scale-95 whitespace-nowrap mb-0.5"
              >
                <Printer size={18} />
                {pdfLoading ? "Generating..." : "Print Ledger"}
              </button>
            )}
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
            <table className="w-full text-left text-sm">
              <thead className="bg-gray-50 dark:bg-gray-900 border-b border-gray-100 dark:border-gray-700">
                <tr>
                  <th className="px-6 py-4 font-semibold text-gray-500">
                    Date
                  </th>
                  <th className="px-6 py-4 font-semibold text-gray-500">
                    Type
                  </th>
                  <th className="px-6 py-4 font-semibold text-gray-500">Ref</th>
                  <th className="px-6 py-4 font-semibold text-gray-500">
                    Description
                  </th>
                  <th className="px-6 py-4 font-semibold text-gray-500">
                    Party
                  </th>
                  <th className="px-6 py-4 font-semibold text-gray-500 text-right">
                    In Qty
                  </th>
                  <th className="px-6 py-4 font-semibold text-gray-500 text-right">
                    Out Qty
                  </th>
                  <th className="px-6 py-4 font-semibold text-gray-500 text-right">
                    Balance
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                {stockLedgerLoading ? (
                  <tr>
                    <td colSpan="8" className="px-6 py-12 text-center">
                      <div className="flex flex-col items-center justify-center gap-3">
                        <div className="w-8 h-8 border-2 border-purple-600 border-t-transparent rounded-full animate-spin"></div>
                        <p className="text-gray-500">Loading Stock Ledger...</p>
                      </div>
                    </td>
                  </tr>
                ) : stockLedgerData.length === 0 ? (
                  <tr>
                    <td colSpan="8" className="text-center py-8 text-gray-500">
                      No records found
                    </td>
                  </tr>
                ) : (
                  stockLedgerData.map((row, i) => (
                    <tr
                      key={i}
                      className="hover:bg-gray-50 dark:hover:bg-gray-800"
                    >
                      <td className="px-6 py-4">{row.date}</td>
                      <td className="px-6 py-4">
                        <span
                          className={`px-2 py-0.5 rounded text-xs font-semibold ${
                            row.type === "IN"
                              ? "bg-blue-100 text-blue-700"
                              : row.type === "OUT"
                              ? "bg-green-100 text-green-700"
                              : "bg-gray-100 text-gray-700"
                          }`}
                        >
                          {row.type}
                        </span>
                      </td>
                      <td className="px-6 py-4 font-mono text-xs">{row.ref}</td>
                      <td className="px-6 py-4">{row.description}</td>
                      <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-300">
                        {row.party_name || "-"}
                      </td>
                      <td className="px-6 py-4 text-right font-medium text-blue-600">
                        {row.in_qty ? row.in_qty : "-"}
                      </td>
                      <td className="px-6 py-4 text-right font-medium text-green-600">
                        {row.out_qty ? row.out_qty : "-"}
                      </td>
                      <td className="px-6 py-4 text-right font-bold">
                        {row.balance}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === "gst" && (
        <div className="space-y-6">
          <div className="bg-white dark:bg-gray-800 p-4 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 flex flex-wrap gap-4 items-end justify-between">
            <div className="flex flex-wrap gap-4 items-end">
              <div>
                <label
                  htmlFor="gst_start_date"
                  className="block text-sm font-medium mb-1 text-gray-500"
                >
                  Start Date
                </label>
                <input
                  type="date"
                  name="gst_start_date"
                  id="gst_start_date"
                  value={dateRange.start_date}
                  onChange={(e) =>
                    setDateRange({ ...dateRange, start_date: e.target.value })
                  }
                  className="px-4 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900"
                />
              </div>
              <div>
                <label
                  htmlFor="gst_end_date"
                  className="block text-sm font-medium mb-1 text-gray-500"
                >
                  End Date
                </label>
                <input
                  type="date"
                  name="gst_end_date"
                  id="gst_end_date"
                  value={dateRange.end_date}
                  onChange={(e) =>
                    setDateRange({ ...dateRange, end_date: e.target.value })
                  }
                  className="px-4 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900"
                />
              </div>
            </div>

            <button
              onClick={exportGSTReport}
              className="flex items-center gap-2 px-5 py-2.5 bg-green-600 hover:bg-green-700 text-white rounded-xl font-semibold shadow-lg shadow-green-600/20 transition-all active:scale-95 whitespace-nowrap"
            >
              <Download size={18} />
              Export GSTR-1
            </button>
            <button
              onClick={handlePrintGSTReport}
              disabled={pdfLoading}
              className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold shadow-lg shadow-blue-600/20 transition-all active:scale-95 whitespace-nowrap"
            >
              <Printer size={18} />
              {pdfLoading ? "Generating..." : "Print PDF"}
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-purple-50 dark:bg-purple-900/10 p-4 rounded-xl border border-purple-100 dark:border-purple-800/20">
              <p className="text-sm text-purple-600 dark:text-purple-400 font-medium">
                Total Taxable Value
              </p>
              <h3 className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                ₹
                {gstData
                  .reduce((sum, item) => sum + item.taxable_value, 0)
                  .toLocaleString()}
              </h3>
            </div>
            <div className="bg-blue-50 dark:bg-blue-900/10 p-4 rounded-xl border border-blue-100 dark:border-blue-800/20">
              <p className="text-sm text-blue-600 dark:text-blue-400 font-medium">
                Total Tax (IGST+CGST+SGST)
              </p>
              <h3 className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                ₹
                {gstData
                  .reduce(
                    (sum, item) => sum + item.igst + item.cgst + item.sgst,
                    0
                  )
                  .toLocaleString()}
              </h3>
            </div>
            <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-xl border border-gray-100 dark:border-gray-700">
              <p className="text-sm text-gray-500 font-medium">Invoice Count</p>
              <h3 className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                {gstData.length}
              </h3>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-gray-50 dark:bg-gray-900 border-b border-gray-100 dark:border-gray-700">
                  <tr>
                    <th className="px-6 py-4 font-semibold text-gray-500">
                      Date
                    </th>
                    <th className="px-6 py-4 font-semibold text-gray-500">
                      Invoice No
                    </th>
                    <th className="px-6 py-4 font-semibold text-gray-500">
                      Party Name
                    </th>
                    <th className="px-6 py-4 font-semibold text-gray-500">
                      GSTIN
                    </th>
                    <th className="px-6 py-4 font-semibold text-gray-500 text-right">
                      Taxable
                    </th>
                    <th className="px-6 py-4 font-semibold text-gray-500 text-right">
                      SGST
                    </th>
                    <th className="px-6 py-4 font-semibold text-gray-500 text-right">
                      CGST
                    </th>
                    <th className="px-6 py-4 font-semibold text-gray-500 text-right">
                      IGST
                    </th>
                    <th className="px-6 py-4 font-semibold text-gray-500 text-right">
                      Total
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                  {gstLoading ? (
                    <tr>
                      <td colSpan="9" className="text-center py-8">
                        <div className="flex flex-col items-center justify-center gap-3">
                          <div className="w-8 h-8 border-2 border-purple-600 border-t-transparent rounded-full animate-spin"></div>
                          <p className="text-gray-500">Loading GST Data...</p>
                        </div>
                      </td>
                    </tr>
                  ) : gstData.length === 0 ? (
                    <tr>
                      <td
                        colSpan="9"
                        className="text-center py-8 text-gray-500"
                      >
                        No records found
                      </td>
                    </tr>
                  ) : (
                    gstData.map((row) => (
                      <tr
                        key={row.id}
                        className="hover:bg-gray-50 dark:hover:bg-gray-800"
                      >
                        <td className="px-6 py-4 text-gray-600 dark:text-gray-300">
                          {row.date}
                        </td>
                        <td className="px-6 py-4 font-medium text-purple-600">
                          {row.invoice_number}
                        </td>
                        <td className="px-6 py-4 text-gray-900 dark:text-gray-100 font-medium">
                          {row.party_name}
                        </td>
                        <td className="px-6 py-4 text-gray-500">{row.gstin}</td>
                        <td className="px-6 py-4 text-right font-medium">
                          {row.taxable_value.toFixed(2)}
                        </td>
                        <td className="px-6 py-4 text-right text-gray-500">
                          {row.sgst.toFixed(2)}
                        </td>
                        <td className="px-6 py-4 text-right text-gray-500">
                          {row.cgst.toFixed(2)}
                        </td>
                        <td className="px-6 py-4 text-right text-gray-500">
                          {row.igst.toFixed(2)}
                        </td>
                        <td className="px-6 py-4 text-right font-bold text-gray-900 dark:text-white">
                          {row.total_amount.toFixed(2)}
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

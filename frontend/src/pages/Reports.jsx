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
import { getJobWorkReport, getStockLedgerPDF } from "../api/reports";
import PdfPreviewModal from "../components/PdfPreviewModal";

export default function Reports() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pdfLoading, setPdfLoading] = useState(false);
  const [previewDoc, setPreviewDoc] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState("all"); // all, pending, completed

  // Tab State
  const [activeTab, setActiveTab] = useState("jobwork"); // jobwork, ledger
  const [selectedParty, setSelectedParty] = useState("");

  useEffect(() => {
    fetchReport();
  }, []);

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

  const handlePrintPDF = async () => {
    try {
      setPdfLoading(true);
      const loadingToast = toast.loading("Generating PDF...");

      let partyId = null;
      if (selectedParty) {
        // Find party_id from data
        const partyRecord = data.find((p) => p.party_name === selectedParty);
        if (partyRecord) {
          partyId = partyRecord.party_id;
        }
      }

      const blob = await getStockLedgerPDF(partyId);

      // Create blob URL for preview
      const url = window.URL.createObjectURL(
        new Blob([blob], { type: "application/pdf" })
      );

      setPreviewDoc({
        url: url,
        title: `Stock_Ledger_${selectedParty || "All"}`,
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

  const ledgerData = useMemo(() => {
    const rawMap = data
      .filter((i) => !selectedParty || i.party_name === selectedParty)
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

        if (row.is_opening_balance) {
          // Backlog items contribute to Opening Balance
          acc[key].opening += row.pending_qty;
          acc[key].balance += row.pending_qty;
        } else {
          // Current FY items contribute to In/Out
          acc[key].in += row.in_qty;
          acc[key].out += row.out_qty;
          acc[key].balance += row.pending_qty;
        }

        return acc;
      }, {});
    return Object.values(rawMap);
  }, [data, selectedParty]);

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
            Party Stock Ledger
            {activeTab === "ledger" && (
              <span className="absolute bottom-0 left-0 w-full h-0.5 bg-blue-600 rounded-t-full" />
            )}
          </button>
        </div>
      </div>

      {activeTab === "jobwork" ? (
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
      ) : (
        /* Stock Ledger View */
        <div className="space-y-6">
          <div className="bg-white dark:bg-gray-800 p-4 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="w-full md:w-auto">
              <label className="block text-sm font-semibold mb-2 text-gray-700 dark:text-gray-300">
                Select Party for Ledger
              </label>
              <select
                value={selectedParty}
                onChange={(e) => setSelectedParty(e.target.value)}
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

            <button
              onClick={handlePrintPDF}
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
                {selectedParty
                  ? `${selectedParty} - Stock Summary`
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

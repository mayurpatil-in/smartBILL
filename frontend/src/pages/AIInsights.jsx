import { useState, useEffect, useCallback } from "react";
import {
  Sparkles,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  Brain,
  ArrowRight,
  CheckCircle,
  Zap,
  Package,
  DollarSign,
  IndianRupee,
  Users,
  Clock,
  RefreshCw,
  Activity,
  ShieldAlert,
  X,
  FileText,
} from "lucide-react";
import {
  getDailyBriefing,
  getAnomalies,
  getPredictions,
  getStockProjections,
  getSalesForecast,
  getOutstandingReceivables,
} from "../api/aiInsights";
import { getPartyStatement } from "../api/reports";
import { getActiveFinancialYear } from "../api/financialYear";
import {
  getFinancialYearStartDate,
  getFinancialYearEndDate,
  formatDate,
} from "../utils/dateUtils";
import {
  SalesForecastChart,
  StockDepletionChart,
  CustomerRiskScatter,
} from "../components/InsightCharts";
import ReceivablesModal from "../components/ReceivablesModal";

export default function AIInsights() {
  const [briefing, setBriefing] = useState(null);
  const [anomalies, setAnomalies] = useState([]);
  const [predictions, setPredictions] = useState([]);
  const [stockProjections, setStockProjections] = useState([]);
  const [salesForecast, setSalesForecast] = useState([]);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [lastUpdated, setLastUpdated] = useState(null);
  const [activeFY, setActiveFY] = useState(null);

  // Statement modal state
  const [statementModal, setStatementModal] = useState(null); // { partyId, partyName }
  const [statementData, setStatementData] = useState([]);
  const [statementLoading, setStatementLoading] = useState(false);

  // Low Stock modal state
  const [lowStockModal, setLowStockModal] = useState(false);

  // Receivables modal state
  const [receivablesModal, setReceivablesModal] = useState(false);
  const [receivablesData, setReceivablesData] = useState([]);
  const [receivablesLoading, setReceivablesLoading] = useState(false);

  useEffect(() => {
    if (receivablesModal) {
      setReceivablesLoading(true);
      getOutstandingReceivables()
        .then((data) => setReceivablesData(data || []))
        .catch((err) => console.error("Failed to fetch receivables", err))
        .finally(() => setReceivablesLoading(false));
    }
  }, [receivablesModal]);

  const fetchData = async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    try {
      const [
        briefingData,
        anomaliesData,
        predictionsData,
        stockData,
        salesData,
        fyData,
      ] = await Promise.all([
        getDailyBriefing(),
        getAnomalies(),
        getPredictions(),
        getStockProjections(),
        getSalesForecast(),
        getActiveFinancialYear(),
      ]);
      setBriefing(briefingData);
      setAnomalies(anomaliesData || []);
      setPredictions(predictionsData || []);
      setStockProjections(stockData || []);
      setSalesForecast(salesData || []);
      setActiveFY(fyData);
      setLastUpdated(new Date());
    } catch (error) {
      console.error("Failed to load AI insights", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const openStatement = useCallback(
    async (partyId, partyName) => {
      setStatementModal({ partyId, partyName });
      setStatementData([]);
      setStatementLoading(true);
      try {
        const data = await getPartyStatement({
          party_id: partyId,
          start_date: activeFY
            ? activeFY.start_date
            : getFinancialYearStartDate(),
          end_date: activeFY ? activeFY.end_date : getFinancialYearEndDate(),
        });
        setStatementData(data || []);
      } catch (err) {
        console.error("Failed to load statement", err);
      } finally {
        setStatementLoading(false);
      }
    },
    [activeFY],
  );

  const closeStatement = () => {
    setStatementModal(null);
    setStatementData([]);
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <div className="relative">
          <div
            className="w-20 h-20 rounded-full border-4 border-violet-200 dark:border-violet-900 animate-spin"
            style={{ borderTopColor: "#7c3aed" }}
          />
          <div className="absolute inset-0 flex items-center justify-center">
            <Brain size={28} className="text-violet-600" />
          </div>
        </div>
        <p className="text-gray-500 dark:text-gray-400 font-medium animate-pulse">
          Analysing your business data…
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-8 pb-12">
        {/* ── HERO HEADER ── */}
        <div
          className="relative overflow-hidden rounded-3xl p-8 shadow-2xl text-white"
          style={{
            background:
              "linear-gradient(135deg, #4f46e5 0%, #7c3aed 40%, #a21caf 80%, #be185d 100%)",
          }}
        >
          <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none animate-float hidden md:block">
            <Brain size={140} />
          </div>
          <div
            className="absolute bottom-0 left-1/3 w-48 h-48 rounded-full opacity-10"
            style={{
              background: "radial-gradient(circle, #fff 0%, transparent 70%)",
            }}
          />

          <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-6">
            <div>
              <div className="flex items-center gap-3 mb-3">
                <div className="p-3 bg-white/20 backdrop-blur-md rounded-2xl ring-1 ring-white/30">
                  <Sparkles className="text-yellow-300" size={28} />
                </div>
                <div>
                  <h1 className="text-3xl font-extrabold tracking-tight">
                    AI Insights
                  </h1>
                  <p className="text-white/60 text-sm font-medium">
                    Powered by ArcNeuron.ai intelligence
                  </p>
                </div>
              </div>
              <p className="text-white/80 text-base max-w-xl leading-relaxed">
                {briefing?.greeting}&nbsp;{briefing?.summary}
              </p>
            </div>

            <div className="flex flex-col items-end gap-2 shrink-0">
              <button
                onClick={() => fetchData(true)}
                disabled={refreshing}
                className="flex items-center gap-2 px-4 py-2 bg-white/20 hover:bg-white/30 backdrop-blur-md rounded-xl text-sm font-semibold transition-all ring-1 ring-white/30 disabled:opacity-60"
              >
                <RefreshCw
                  size={15}
                  className={refreshing ? "animate-spin" : ""}
                />
                Refresh
              </button>
              {lastUpdated && (
                <span className="text-white/50 text-xs flex items-center gap-1">
                  <Clock size={11} />
                  Updated {lastUpdated.toLocaleTimeString()}
                </span>
              )}

              {/* ── RECEIVABLES MODAL ── */}
            </div>
          </div>
        </div>

        {/* ── KPI STRIP ── */}
        {briefing?.metrics && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
            <KpiCard
              label="Today's Sales"
              value={`₹${Number(briefing.metrics.sales_today || 0).toLocaleString("en-IN")}`}
              sub={
                briefing.metrics.sales_change > 0
                  ? `+₹${Number(briefing.metrics.sales_change).toLocaleString("en-IN")} vs yesterday`
                  : briefing.metrics.sales_change < 0
                    ? `₹${Number(briefing.metrics.sales_change).toLocaleString("en-IN")} vs yesterday`
                    : "No sales yesterday"
              }
              trend={
                briefing.metrics.sales_change > 0
                  ? "up"
                  : briefing.metrics.sales_change < 0
                    ? "down"
                    : "neutral"
              }
              icon={IndianRupee}
              gradient="from-emerald-500 to-teal-500"
              bg="bg-emerald-50 dark:bg-emerald-900/20"
              iconColor="text-emerald-600 dark:text-emerald-400"
            />

            <KpiCard
              label="Low Stock Items"
              value={briefing.metrics.low_stock_items || 0}
              sub="Items with ≤ 5 units"
              trend={briefing.metrics.low_stock_items > 0 ? "warn" : "good"}
              icon={Package}
              gradient="from-orange-500 to-red-500"
              bg="bg-orange-50 dark:bg-orange-900/20"
              iconColor="text-orange-600 dark:text-orange-400"
              onClick={() =>
                briefing.metrics.low_stock_items > 0 && setLowStockModal(true)
              }
            />
            <KpiCard
              label="Pending Receivable"
              value={
                briefing.metrics.total_receivable >= 100000
                  ? `₹${(briefing.metrics.total_receivable / 100000).toFixed(2)}L`
                  : `₹${Number(briefing.metrics.total_receivable || 0).toLocaleString("en-IN")}`
              }
              sub="Total outstanding balance"
              trend="neutral"
              icon={Activity}
              gradient="from-blue-500 to-indigo-500"
              bg="bg-blue-50 dark:bg-blue-900/20"
              iconColor="text-blue-600 dark:text-blue-400"
              onClick={() =>
                briefing.metrics.total_receivable > 0 &&
                setReceivablesModal(true)
              }
            />
          </div>
        )}

        {/* ── RECEIVABLES MODAL ── */}

        {/* ── PREDICTIVE CHARTS ROW 1 ── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 h-[300px] lg:h-[400px]">
            <SalesForecastChart data={salesForecast} />
          </div>
          <div className="h-[300px] lg:h-[400px]">
            <StockDepletionChart data={stockProjections} />
          </div>
        </div>

        {/* ── PREDICTIVE CHARTS ROW 2 ── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* ANOMALIES – Full width now */}
          <div>
            <SectionCard
              title="Detected Anomalies"
              icon={ShieldAlert}
              iconClass="text-rose-500"
              badge={
                anomalies.length > 0
                  ? {
                      label: `${anomalies.length} Issue${anomalies.length > 1 ? "s" : ""}`,
                      color:
                        "bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300",
                    }
                  : {
                      label: "All Clear",
                      color:
                        "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300",
                    }
              }
            >
              {anomalies.length === 0 ? (
                <EmptyState
                  icon={CheckCircle}
                  iconClass="text-emerald-500"
                  title="Everything looks healthy!"
                  sub="No anomalies detected in your business data."
                />
              ) : (
                <div className="divide-y divide-gray-100 dark:divide-gray-700/50">
                  {anomalies.map((item, i) => (
                    <AnomalyRow
                      key={i}
                      item={item}
                      onViewStatement={openStatement}
                    />
                  ))}
                </div>
              )}
            </SectionCard>
          </div>

          {/* PREDICTIONS LIST – Moved here */}
          <div className="h-[300px] lg:h-[400px]">
            <SectionCard
              title="Smart Predictions"
              icon={Brain}
              iconClass="text-indigo-500"
              sub="Based on 30-day sales velocity"
              badge={
                predictions.length > 0
                  ? {
                      label: `${predictions.length} Alert${predictions.length > 1 ? "s" : ""}`,
                      color:
                        "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300",
                    }
                  : null
              }
            >
              {predictions.length === 0 ? (
                <EmptyState
                  icon={Zap}
                  iconClass="text-indigo-400"
                  title="No stockout risks"
                  sub="All tracked items have sufficient stock."
                />
              ) : (
                <div className="space-y-3 p-4 overflow-y-auto max-h-[230px] lg:max-h-[310px] custom-scrollbar">
                  {predictions.map((pred, i) => (
                    <PredictionCard key={i} pred={pred} />
                  ))}
                </div>
              )}

              {/* ── RECEIVABLES MODAL ── */}
            </SectionCard>
          </div>
        </div>

        {/* ── MAIN GRID (Anomalies) ── */}
        <div className="grid grid-cols-1 gap-6">
          <div className="h-[300px] lg:h-[400px]">
            <CustomerRiskScatter anomalies={anomalies} />
          </div>
        </div>

        {/* ── SUMMARY FOOTER ── */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <SummaryPill
            icon={Users}
            label="Dormant Customers"
            value={
              anomalies.filter((a) => a.type === "DORMANT_CUSTOMER").length
            }
            color="text-amber-600 bg-amber-50 dark:bg-amber-900/20 dark:text-amber-400"
          />
          <SummaryPill
            icon={AlertTriangle}
            label="High Debt Parties"
            value={anomalies.filter((a) => a.type === "HIGH_DEBT").length}
            color="text-rose-600 bg-rose-50 dark:bg-rose-900/20 dark:text-rose-400"
          />
          <SummaryPill
            icon={Package}
            label="Stockout Risks"
            value={predictions.length}
            color="text-indigo-600 bg-indigo-50 dark:bg-indigo-900/20 dark:text-indigo-400"
          />
          <SummaryPill
            icon={Activity}
            label="Total Issues"
            value={anomalies.length + predictions.length}
            color="text-violet-600 bg-violet-50 dark:bg-violet-900/20 dark:text-violet-400"
          />
        </div>
      </div>

      {/* ── STATEMENT MODAL ── */}
      {statementModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ backgroundColor: "rgba(0,0,0,0.6)" }}
        >
          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-4xl max-h-[85vh] flex flex-col overflow-hidden">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-t-2xl">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-white/20 rounded-xl">
                  <FileText size={20} />
                </div>
                <div>
                  <h2 className="font-bold text-lg leading-tight">
                    {statementModal.partyName}
                  </h2>
                  <p className="text-white/70 text-xs">
                    Financial Statement ·{" "}
                    {activeFY
                      ? `${formatDate(activeFY.start_date)} to ${formatDate(activeFY.end_date)}`
                      : `${getFinancialYearStartDate()} to ${getFinancialYearEndDate()}`}
                  </p>
                </div>
              </div>
              <button
                onClick={closeStatement}
                className="p-2 hover:bg-white/20 rounded-xl transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="flex-1 overflow-auto">
              {statementLoading ? (
                <div className="flex flex-col items-center justify-center py-20 gap-3">
                  <div className="w-10 h-10 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin" />
                  <p className="text-gray-500 font-medium">
                    Loading statement…
                  </p>
                </div>
              ) : statementData.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 gap-3">
                  <div className="p-4 bg-gray-100 dark:bg-gray-800 rounded-2xl">
                    <FileText size={32} className="text-gray-400" />
                  </div>
                  <p className="font-semibold text-gray-600 dark:text-gray-300">
                    No transactions found
                  </p>
                  <p className="text-sm text-gray-400">
                    No records for this party in the current financial year.
                  </p>
                </div>
              ) : (
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 dark:bg-gray-800 text-gray-600 dark:text-gray-300 uppercase text-xs font-bold sticky top-0">
                    <tr>
                      <th className="px-5 py-3 text-left">Date</th>
                      <th className="px-5 py-3 text-left">Ref</th>
                      <th className="px-5 py-3 text-left">Description</th>
                      <th className="px-5 py-3 text-right">Debit (₹)</th>
                      <th className="px-5 py-3 text-right">Credit (₹)</th>
                      <th className="px-5 py-3 text-right">Balance (₹)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-gray-700/50">
                    {statementData.map((row, i) => (
                      <tr
                        key={i}
                        className="hover:bg-blue-50/40 dark:hover:bg-blue-900/10 transition-colors"
                      >
                        <td className="px-5 py-3 text-gray-600 dark:text-gray-400 whitespace-nowrap">
                          {formatDate(row.date)}
                        </td>
                        <td className="px-5 py-3 font-mono text-xs text-gray-500 dark:text-gray-500">
                          {row.ref}
                        </td>
                        <td className="px-5 py-3 text-gray-700 dark:text-gray-300">
                          {row.description}
                        </td>
                        <td className="px-5 py-3 text-right">
                          {row.debit ? (
                            <span className="font-semibold text-red-600 dark:text-red-400">
                              {Number(row.debit).toLocaleString("en-IN", {
                                minimumFractionDigits: 2,
                              })}
                            </span>
                          ) : (
                            <span className="text-gray-300">—</span>
                          )}
                        </td>
                        <td className="px-5 py-3 text-right">
                          {row.credit ? (
                            <span className="font-semibold text-green-600 dark:text-green-400">
                              {Number(row.credit).toLocaleString("en-IN", {
                                minimumFractionDigits: 2,
                              })}
                            </span>
                          ) : (
                            <span className="text-gray-300">—</span>
                          )}
                        </td>
                        <td className="px-5 py-3 text-right">
                          <span
                            className={`font-bold ${Number(row.balance) > 0 ? "text-red-600 dark:text-red-400" : "text-green-600 dark:text-green-400"}`}
                          >
                            {Number(row.balance).toLocaleString("en-IN", {
                              minimumFractionDigits: 2,
                            })}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            {/* Modal Footer */}
            {statementData.length > 0 && (
              <div className="px-6 py-3 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 flex items-center justify-between text-sm">
                <span className="text-gray-500">
                  {statementData.length} transaction
                  {statementData.length !== 1 ? "s" : ""}
                </span>
                <span className="font-bold text-gray-800 dark:text-white">
                  Closing Balance: ₹
                  {Number(
                    statementData[statementData.length - 1]?.balance || 0,
                  ).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                </span>
              </div>
            )}

            {/* ── LOW STOCK MODAL ── */}
            {lowStockModal && (
              <div
                className="fixed inset-0 z-50 flex items-center justify-center p-4"
                style={{ backgroundColor: "rgba(0,0,0,0.6)" }}
              >
                <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[85vh] flex flex-col overflow-hidden animate-fade-in-up">
                  {/* Header */}
                  <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700 bg-gradient-to-r from-orange-500 to-red-500 text-white rounded-t-2xl">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-white/20 rounded-xl">
                        <Package size={20} />
                      </div>
                      <div>
                        <h2 className="font-bold text-lg leading-tight">
                          Low Stock Items
                        </h2>
                        <p className="text-white/70 text-xs">
                          Items with ≤ 5 units
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => setLowStockModal(false)}
                      className="p-2 hover:bg-white/20 rounded-xl transition-colors"
                    >
                      <X size={20} />
                    </button>
                  </div>
                  {/* Body */}
                  <div className="flex-1 overflow-auto p-0">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-50 dark:bg-gray-800 text-gray-600 dark:text-gray-300 uppercase text-xs font-bold sticky top-0">
                        <tr>
                          <th className="px-6 py-3 text-left">Item Name</th>
                          <th className="px-6 py-3 text-right">
                            Current Stock
                          </th>
                          <th className="px-6 py-3 text-right">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100 dark:divide-gray-700/50">
                        {briefing?.metrics?.low_stock_details?.map(
                          (item, i) => (
                            <tr
                              key={i}
                              className="hover:bg-orange-50/40 dark:hover:bg-orange-900/10 transition-colors"
                            >
                              <td className="px-6 py-4 font-medium text-gray-900 dark:text-white">
                                {item.name}
                              </td>
                              <td className="px-6 py-4 text-right font-bold text-gray-800 dark:text-gray-200">
                                {item.current_stock}
                              </td>
                              <td className="px-6 py-4 text-right">
                                <span
                                  className={`text-[10px] font-extrabold uppercase tracking-wider px-2 py-1 rounded-full ${item.current_stock <= 0 ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300" : "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300"}`}
                                >
                                  {item.current_stock <= 0
                                    ? "Out of Stock"
                                    : "Low Stock"}
                                </span>
                              </td>
                            </tr>
                          ),
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── LOW STOCK MODAL ── */}
      {lowStockModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ backgroundColor: "rgba(0,0,0,0.6)" }}
        >
          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[85vh] flex flex-col overflow-hidden animate-fade-in-up">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700 bg-gradient-to-r from-orange-500 to-red-500 text-white rounded-t-2xl">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-white/20 rounded-xl">
                  <Package size={20} />
                </div>
                <div>
                  <h2 className="font-bold text-lg leading-tight">
                    Low Stock Items
                  </h2>
                  <p className="text-white/70 text-xs">Items with ≤ 5 units</p>
                </div>
              </div>
              <button
                onClick={() => setLowStockModal(false)}
                className="p-2 hover:bg-white/20 rounded-xl transition-colors"
              >
                <X size={20} />
              </button>
            </div>
            {/* Body */}
            <div className="flex-1 overflow-auto p-0">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 dark:bg-gray-800 text-gray-600 dark:text-gray-300 uppercase text-xs font-bold sticky top-0">
                  <tr>
                    <th className="px-6 py-3 text-left">Item Name</th>
                    <th className="px-6 py-3 text-right">Current Stock</th>
                    <th className="px-6 py-3 text-right">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-700/50">
                  {briefing?.metrics?.low_stock_details?.map((item, i) => (
                    <tr
                      key={i}
                      className="hover:bg-orange-50/40 dark:hover:bg-orange-900/10 transition-colors"
                    >
                      <td className="px-6 py-4 font-medium text-gray-900 dark:text-white">
                        {item.name}
                      </td>
                      <td className="px-6 py-4 text-right font-bold text-gray-800 dark:text-gray-200">
                        {item.current_stock}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <span
                          className={`text-[10px] font-extrabold uppercase tracking-wider px-2 py-1 rounded-full ${item.current_stock <= 0 ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300" : "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300"}`}
                        >
                          {item.current_stock <= 0
                            ? "Out of Stock"
                            : "Low Stock"}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      <ReceivablesModal
        isOpen={receivablesModal}
        onClose={() => setReceivablesModal(false)}
        data={receivablesData}
        loading={receivablesLoading}
        onViewStatement={(id, name) => {
          setReceivablesModal(false);
          openStatement(id, name);
        }}
        totalReceivable={briefing?.metrics?.total_receivable || 0}
      />
    </>
  );
}

/* ─────────────────────────────────────────────
   SUB-COMPONENTS
───────────────────────────────────────────── */

function KpiCard({
  label,
  value,
  sub,
  trend,
  icon: Icon,
  gradient,
  bg,
  iconColor,
  onClick,
}) {
  return (
    <div
      onClick={onClick}
      className={`relative overflow-hidden bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-md hover:shadow-xl transition-all duration-300 group p-6 ${onClick ? "cursor-pointer hover:scale-[1.02]" : ""}`}
    >
      <div
        className={`absolute top-0 left-0 right-0 h-1 bg-gradient-to-r ${gradient} opacity-80`}
      />
      <div className="flex items-start justify-between mb-4">
        <div className={`p-3 rounded-xl ${bg}`}>
          <Icon size={22} className={iconColor} />
        </div>
        {trend === "up" && (
          <span className="flex items-center gap-1 text-xs font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-900/30 px-2 py-1 rounded-full">
            <TrendingUp size={12} /> Up
          </span>
        )}

        {trend === "down" && (
          <span className="flex items-center gap-1 text-xs font-bold text-red-500 bg-red-50 dark:bg-red-900/30 px-2 py-1 rounded-full">
            <TrendingDown size={12} /> Down
          </span>
        )}

        {trend === "warn" && (
          <span className="flex items-center gap-1 text-xs font-bold text-orange-600 bg-orange-50 dark:bg-orange-900/30 px-2 py-1 rounded-full">
            <AlertTriangle size={12} /> Alert
          </span>
        )}

        {trend === "good" && (
          <span className="flex items-center gap-1 text-xs font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-900/30 px-2 py-1 rounded-full">
            <CheckCircle size={12} /> Good
          </span>
        )}
      </div>
      <p className="text-3xl font-extrabold text-gray-900 dark:text-white tracking-tight">
        {value}
      </p>
      <p className="text-sm font-semibold text-gray-500 dark:text-gray-400 mt-0.5">
        {label}
      </p>
      <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">{sub}</p>
    </div>
  );
}

function SectionCard({ title, icon: Icon, iconClass, sub, badge, children }) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-md overflow-hidden h-full flex flex-col">
      <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-gray-700 bg-gray-50/60 dark:bg-gray-800/60">
        <div className="flex items-center gap-2.5">
          <Icon size={20} className={iconClass} />
          <div>
            <h2 className="font-bold text-gray-900 dark:text-white text-base leading-tight">
              {title}
            </h2>
            {sub && (
              <p className="text-xs text-gray-400 dark:text-gray-500">{sub}</p>
            )}
          </div>
        </div>
        {badge && (
          <span
            className={`text-xs font-bold px-3 py-1 rounded-full ${badge.color}`}
          >
            {badge.label}
          </span>
        )}
      </div>
      <div className="flex-1">{children}</div>
    </div>
  );
}

function AnomalyRow({ item, onViewStatement }) {
  const isHigh = item.severity === "high";
  return (
    <div className="px-6 py-5 hover:bg-gray-50 dark:hover:bg-gray-700/20 transition-colors">
      <div className="flex items-start gap-4">
        <div
          className={`mt-1 flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center ${isHigh ? "bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400" : "bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400"}`}
        >
          <AlertTriangle size={18} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <h3 className="font-bold text-gray-900 dark:text-white text-sm leading-snug">
              {item.title}
            </h3>
            <span
              className={`text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-full ${isHigh ? "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300" : "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300"}`}
            >
              {item.severity}
            </span>
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed">
            {item.description}
          </p>

          {(item.type === "HIGH_DEBT" || item.type === "DORMANT_CUSTOMER") &&
            item.metadata?.party_id && (
              <button
                onClick={() =>
                  onViewStatement(
                    item.metadata.party_id,
                    item.title.replace(
                      /^(High Outstanding|Dormant Customer): /,
                      "",
                    ),
                  )
                }
                className={`mt-3 inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors ${
                  item.type === "HIGH_DEBT"
                    ? "text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30 hover:bg-blue-100 dark:hover:bg-blue-900/50"
                    : "text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/30 hover:bg-amber-100"
                }`}
              >
                View Statement <ArrowRight size={13} />
              </button>
            )}
        </div>
      </div>
    </div>
  );
}

function PredictionCard({ pred }) {
  const urgency =
    pred.days_remaining <= 2
      ? "critical"
      : pred.days_remaining <= 4
        ? "high"
        : "medium";
  const barWidth = Math.max(8, Math.min(100, 100 - pred.days_remaining * 14));
  const urgencyStyles = {
    critical: {
      bar: "bg-red-500",
      badge: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300",
      border: "border-red-200 dark:border-red-800",
    },
    high: {
      bar: "bg-orange-500",
      badge:
        "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300",
      border: "border-orange-200 dark:border-orange-800",
    },
    medium: {
      bar: "bg-amber-400",
      badge:
        "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300",
      border: "border-amber-200 dark:border-amber-800",
    },
  };
  const s = urgencyStyles[urgency];
  return (
    <div
      className={`rounded-xl border p-4 bg-gray-50 dark:bg-gray-700/30 ${s.border} transition-all hover:shadow-md`}
    >
      <div className="flex items-center justify-between mb-2">
        <span
          className={`text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-full ${s.badge}`}
        >
          Stockout Risk
        </span>
        <span className="text-xs font-bold text-gray-600 dark:text-gray-300 font-mono">
          {pred.days_remaining}d left
        </span>
      </div>
      <h4 className="font-bold text-gray-900 dark:text-white text-sm mb-0.5 truncate">
        {pred.item_name}
      </h4>
      <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
        Stock:{" "}
        <span className="font-semibold text-gray-700 dark:text-gray-200">
          {pred.current_stock} units
        </span>
        &nbsp;·&nbsp; Avg:{" "}
        <span className="font-semibold text-gray-700 dark:text-gray-200">
          {pred.avg_daily_sales}/day
        </span>
      </p>
      <div className="w-full bg-gray-200 dark:bg-gray-600 rounded-full h-1.5 overflow-hidden">
        <div
          className={`h-1.5 rounded-full transition-all duration-700 ${s.bar}`}
          style={{ width: `${barWidth}%` }}
        />
      </div>
      <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-1.5 text-right">
        Est. out by{" "}
        <span className="font-semibold">
          {new Date(pred.predicted_date).toLocaleDateString("en-IN", {
            day: "numeric",
            month: "short",
          })}
        </span>
      </p>
    </div>
  );
}

function EmptyState({ icon: Icon, iconClass, title, sub }) {
  return (
    <div className="flex flex-col items-center justify-center py-14 px-6 text-center gap-3">
      <div className="p-4 rounded-2xl bg-gray-100 dark:bg-gray-700/50">
        <Icon size={32} className={iconClass} />
      </div>
      <p className="font-bold text-gray-700 dark:text-gray-200 text-sm">
        {title}
      </p>
      <p className="text-xs text-gray-400 dark:text-gray-500 max-w-xs">{sub}</p>
    </div>
  );
}

function SummaryPill({ icon: Icon, label, value, color }) {
  return (
    <div
      className={`flex items-center gap-3 rounded-2xl px-5 py-4 ${color} border border-current/10`}
    >
      <Icon size={20} className="shrink-0 opacity-80" />
      <div>
        <p className="text-2xl font-extrabold leading-none">{value}</p>
        <p className="text-xs font-semibold opacity-70 mt-0.5">{label}</p>
      </div>
    </div>
  );
}

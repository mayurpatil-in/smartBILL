import { useEffect, useState } from "react";
import { useClientAuth } from "../../context/ClientAuthContext";
import {
  Package,
  Truck,
  ChevronDown,
  Download,
  Printer,
  Loader2,
  Calendar,
  Search,
  X,
  CheckCircle,
  Clock,
  AlertCircle,
  XCircle,
  Eye,
  RefreshCw,
} from "lucide-react";
import toast from "react-hot-toast";

const STATUS_CONFIG = {
  open: { label: "Open", color: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400", icon: Clock },
  partial: { label: "Partial", color: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400", icon: AlertCircle },
  completed: { label: "Completed", color: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400", icon: CheckCircle },
  cancelled: { label: "Cancelled", color: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400", icon: XCircle },
  draft: { label: "Draft", color: "bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300", icon: Clock },
  sent: { label: "Sent", color: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400", icon: Truck },
  delivered: { label: "Delivered", color: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400", icon: CheckCircle },
};

function StatusBadge({ status }) {
  const config = STATUS_CONFIG[status?.toLowerCase()] || STATUS_CONFIG.draft;
  const Icon = config.icon;
  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold ${config.color}`}>
      <Icon className="w-3 h-3" />
      {config.label}
    </span>
  );
}

function ProgressBar({ percent, qty_ordered, qty_delivered }) {
  const pct = Math.min(percent, 100);
  const color = pct >= 100 ? "bg-green-500" : pct >= 50 ? "bg-blue-500" : "bg-yellow-500";
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400">
        <span>{qty_delivered} / {qty_ordered}</span>
        <span className="font-semibold">{pct}%</span>
      </div>
      <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
        <div className={`h-full rounded-full transition-all duration-500 ${color}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

function FYDropdown({ financialYears, selected, onSelect }) {
  const [open, setOpen] = useState(false);
  const label = selected ? financialYears.find((fy) => fy.id === selected)?.year_name || "Selected" : "All Years";
  return (
    <div className="relative">
      <button onClick={() => setOpen(!open)} className="flex items-center gap-2 px-4 py-2 text-sm font-medium bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-sm hover:border-blue-400 dark:hover:border-blue-500 transition-all">
        <Calendar className="w-4 h-4 text-blue-600" />
        <span className="text-gray-700 dark:text-gray-300">{label}</span>
        <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <div className="absolute left-0 top-full mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-xl z-20 min-w-[160px] overflow-hidden">
          <button onClick={() => { onSelect(""); setOpen(false); }} className="w-full text-left px-4 py-2.5 text-sm hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300">All Years</button>
          {financialYears.map((fy) => (
            <button key={fy.id} onClick={() => { onSelect(fy.id); setOpen(false); }} className={`w-full text-left px-4 py-2.5 text-sm hover:bg-gray-50 dark:hover:bg-gray-700 ${selected === fy.id ? "text-blue-600 font-semibold" : "text-gray-700 dark:text-gray-300"}`}>
              {fy.year_name} {fy.is_active && <span className="text-xs text-green-500">? Active</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function PartyChallanCard({ challan, handlePrintPC, printingPcId }) {
  const [expanded, setExpanded] = useState(false);
  const totalOrdered = challan.items.reduce((s, i) => s + i.quantity_ordered, 0);
  const totalDelivered = challan.items.reduce((s, i) => s + i.quantity_delivered, 0);
  const overallPct = totalOrdered > 0 ? Math.round(totalDelivered / totalOrdered * 100) : 0;

  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm hover:shadow-md transition-all duration-200 overflow-hidden">
      <div className="flex items-center justify-between p-5 cursor-pointer" onClick={() => setExpanded(!expanded)}>
        <div className="flex items-center gap-4">
          <div className="p-2.5 bg-gradient-to-br from-violet-500 to-purple-600 rounded-xl shadow-sm">
            <Package className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-bold text-gray-900 dark:text-white text-base">{challan.challan_number}</h3>
              <StatusBadge status={challan.status} />
            </div>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
              {new Date(challan.challan_date).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
              {challan.working_days ? ` · ${challan.working_days} days` : ""}
              {challan.delivery_challans_list && challan.delivery_challans_list.length > 0 && (
                <span className="ml-1">
                  {challan.delivery_challans_list.map((dc) => (
                    <span key={dc.challan_number} className="ml-1 inline-flex items-center px-1.5 py-0.5 bg-teal-100 dark:bg-teal-900/30 text-teal-700 dark:text-teal-400 text-xs font-semibold rounded">
                      {dc.challan_number}
                    </span>
                  ))}
                </span>
              )}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-right hidden sm:block">
            <p className="text-xs text-gray-400 dark:text-gray-500">Dispatches</p>
            <p className="text-sm font-semibold text-gray-700 dark:text-gray-200">{challan.delivery_challan_count}</p>
          </div>
          <div className={`p-2 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-500 transition-transform duration-200 ${expanded ? "rotate-180" : ""}`}>
            <ChevronDown className="w-4 h-4" />
          </div>
        </div>
      </div>

      {!expanded && challan.items.length > 0 && (
        <div className="px-5 pb-4">
          <ProgressBar percent={overallPct} qty_ordered={totalOrdered} qty_delivered={totalDelivered} />
        </div>
      )}

      {expanded && (
        <div className="border-t border-gray-100 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-900/30">
          <div className="flex justify-end p-3 border-b border-gray-100 dark:border-gray-700 bg-white/50 dark:bg-gray-800/50">
            <button
              onClick={() => handlePrintPC(challan.id)}
              disabled={printingPcId === challan.id}
              className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-violet-600 hover:bg-violet-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg shadow-sm transition-all"
            >
              {printingPcId === challan.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
              Download Report
            </button>
          </div>
          {challan.notes && (
            <div className="px-5 py-3 bg-blue-50 dark:bg-blue-900/20 border-b border-blue-100 dark:border-blue-800/30">
              <p className="text-xs text-blue-700 dark:text-blue-300"><span className="font-semibold">Note:</span> {challan.notes}</p>
            </div>
          )}
          <div className="p-5 space-y-4">
            
            {challan.delivery_challans_list && challan.delivery_challans_list.length > 0 && (
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500 mb-3">
                  Delivery Challans ({challan.delivery_challans_list.length})
                </p>
                <div className="flex flex-wrap gap-2 mb-4">
                  {challan.delivery_challans_list.map((dc) => {
                    const dcStatus = dc.status?.toLowerCase();
                    const dcColors = {
                      draft:     "bg-gray-100 text-gray-700 dark:bg-gray-700/60 dark:text-gray-300 border-gray-200 dark:border-gray-600",
                      sent:      "bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 border-blue-200 dark:border-blue-800",
                      delivered: "bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-400 border-green-200 dark:border-green-800",
                    };
                    const dcColorClass = dcColors[dcStatus] || dcColors.draft;
                    return (
                      <div key={dc.challan_number} className={"flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-semibold " + dcColorClass}>
                        <span>{dc.challan_number}</span>
                        {dc.client_status === "discrepancy" && <AlertCircle className="w-3.5 h-3.5 text-red-500 fill-red-100" title="Issue Reported" />}
                        {dc.client_status === "resolved" && <CheckCircle className="w-3.5 h-3.5 text-gray-500 fill-gray-100" title="Issue Resolved" />}
                        <span className="opacity-60">·</span>
                        <span className="capitalize opacity-80">{dc.status}</span>
                        <span className="opacity-40">·</span>
                        <span className="font-normal opacity-70">
                          {new Date(dc.challan_date).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
            <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">Item-wise Progress</p>
            {challan.items.map((item) => (
              <div key={item.id} className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <p className="font-semibold text-gray-900 dark:text-white text-sm">{item.item_name}</p>
                    {item.process_name && <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Process: {item.process_name}</p>}
                  </div>
                  <span className="text-xs font-bold text-gray-700 dark:text-gray-200 bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded-lg">{item.progress_percent}%</span>
                </div>
                <ProgressBar percent={item.progress_percent} qty_ordered={item.quantity_ordered} qty_delivered={item.quantity_delivered} />
              </div>
            ))}
            {challan.items.length === 0 && <p className="text-sm text-gray-400 italic text-center py-4">No items in this challan</p>}
          </div>
        </div>
      )}
    </div>
  );
}

function DeliveryChallanCard({ challan, onPrint, printingId, onUpdateStatus }) {
  const [expanded, setExpanded] = useState(false);
  const isPrinting = printingId === challan.id;

  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm hover:shadow-md transition-all duration-200 overflow-hidden">
      <div className="flex items-center justify-between p-5">
        <div className="flex items-center gap-4 cursor-pointer flex-1" onClick={() => setExpanded(!expanded)}>
          <div className="p-2.5 bg-gradient-to-br from-teal-500 to-cyan-600 rounded-xl shadow-sm">
            <Truck className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-bold text-gray-900 dark:text-white text-base">{challan.challan_number}</h3>
              <StatusBadge status={challan.status} />
              {challan.client_status === "resolved" && (
                <span className="flex items-center gap-1 text-[10px] uppercase font-bold tracking-wider text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600 px-2 py-0.5 rounded-full shadow-sm">
                  <CheckCircle className="w-3 h-3" /> Issue Resolved
                </span>
              )}
              {challan.client_status === "discrepancy" && (
                <span className="flex items-center gap-1 text-[10px] uppercase font-bold tracking-wider text-red-600 bg-red-100 border border-red-200 px-2 py-0.5 rounded-full shadow-sm">
                  <AlertCircle className="w-3 h-3" /> Issue Reported
                </span>
              )}
            </div>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
              {new Date(challan.challan_date).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
              {challan.vehicle_number ? ` · ${challan.vehicle_number}` : ""}
              {challan.party_challan_numbers && challan.party_challan_numbers.length > 0 && 
  challan.party_challan_numbers.map((n) => (
    <span key={n} className={"ml-1 inline-flex items-center px-1.5 py-0.5 bg-violet-100 dark:bg-violet-900/30 text-violet-700 dark:text-violet-400 text-xs font-semibold rounded"}>{n}</span>
  ))}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => onPrint(challan.id)} disabled={isPrinting} className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-blue-700 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 hover:bg-blue-100 dark:hover:bg-blue-800/30 rounded-xl border border-blue-200 dark:border-blue-800 transition-all disabled:opacity-60" title="Download PDF">
            {isPrinting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
            <span className="hidden sm:inline">PDF</span>
          </button>
          <button onClick={() => setExpanded(!expanded)} className={`p-2 rounded-xl bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 transition-transform duration-200 ${expanded ? "rotate-180" : ""}`}>
            <ChevronDown className="w-4 h-4" />
          </button>
        </div>
      </div>

      {expanded && (
        <div className="border-t border-gray-100 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-900/30">

          {challan.notes && (
            <div className="px-5 py-3 bg-teal-50 dark:bg-teal-900/20 border-b border-teal-100 dark:border-teal-800/30">
              <p className="text-xs text-teal-700 dark:text-teal-300"><span className="font-semibold">Note:</span> {challan.notes}</p>
            </div>
          )}
          <div className="p-5 space-y-3">
            <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">Item Quality Breakdown</p>
            {challan.items.length === 0 ? (
              <p className="text-sm text-gray-400 italic text-center py-4">No items recorded</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase border-b border-gray-100 dark:border-gray-700">
                      <th className="text-left pb-2">Item</th>
                      <th className="text-left pb-2">Process</th>
                      <th className="text-right pb-2">Qty</th>
                      <th className="text-right pb-2 text-green-600">OK</th>
                      <th className="text-right pb-2 text-red-500">Rej.</th>
                      <th className="text-right pb-2 text-orange-500">Rework</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50 dark:divide-gray-700/50">
                    {challan.items.map((item) => (
                      <tr key={item.id}>
                        <td className="py-2.5 pr-2 font-medium text-gray-800 dark:text-gray-200">{item.item_name}</td>
                        <td className="py-2.5 pr-2 text-gray-500 dark:text-gray-400 text-xs">{item.process_name || ""}</td>
                        <td className="py-2.5 text-right text-gray-700 dark:text-gray-300 font-medium">{item.quantity}</td>
                        <td className="py-2.5 text-right font-semibold text-green-600">{item.ok_qty}</td>
                        <td className="py-2.5 text-right font-semibold text-red-500">{item.cr_qty > 0 ? item.cr_qty : ""}</td>
                        <td className="py-2.5 text-right font-semibold text-orange-500">{item.mr_qty > 0 ? item.mr_qty : ""}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

            {/* Client Acknowledgment / Issue Section */}
            <div className="mx-5 mb-5 pt-4 border-t border-gray-100 dark:border-gray-700">
              <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500 mb-3">Delivery Status</p>
              {challan.client_status === "accepted" ? (
                <div className="flex items-center gap-2 text-green-600 bg-green-50 dark:bg-green-900/20 px-4 py-3 rounded-xl border border-green-100 dark:border-green-800">
                  <CheckCircle className="w-5 h-5" />
                  <span className="font-semibold">Receipt Acknowledged</span>
                </div>
              ) : challan.client_status === "discrepancy" ? (
                <div className="bg-red-50 dark:bg-red-900/20 px-4 py-3 rounded-xl border border-red-100 dark:border-red-800">
                  <div className="flex items-center gap-2 text-red-600 dark:text-red-400 mb-1">
                    <AlertCircle className="w-5 h-5" />
                    <span className="font-semibold">Issue Reported</span>
                  </div>
                  {challan.client_notes && (
                    <p className="text-sm text-red-700 dark:text-red-300 mt-1 pl-7">{challan.client_notes}</p>
                  )}
                </div>
              ) : challan.client_status === "resolved" ? (
                <div className="bg-gray-50 dark:bg-gray-800/50 px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-gray-700 dark:text-gray-300">
                      <CheckCircle className="w-5 h-5" />
                      <span className="font-semibold">Issue Resolved by Admin</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <button onClick={() => onUpdateStatus(challan.id, "accepted")} className="px-3 py-1.5 text-xs font-semibold text-white bg-green-600 hover:bg-green-700 rounded-lg shadow-sm transition-all">Acknowledge</button>
                      <button onClick={() => onUpdateStatus(challan.id, "report_issue_flow")} className="px-3 py-1.5 text-xs font-semibold text-gray-600 dark:text-gray-400 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-600 rounded-lg transition-all">Report Again</button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex flex-wrap items-center gap-3">
                  <button onClick={() => onUpdateStatus(challan.id, "accepted")} className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white text-sm font-semibold rounded-xl transition-all shadow-sm">
                    <CheckCircle className="w-4 h-4" /> Acknowledge Receipt
                  </button>
                  <button onClick={() => onUpdateStatus(challan.id, "report_issue_flow")} className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-gray-800 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 border border-red-200 dark:border-red-800 text-sm font-semibold rounded-xl transition-all shadow-sm">
                    <AlertCircle className="w-4 h-4" /> Report Issue
                  </button>
                </div>
              )}
            </div>

        </div>
      )}
    </div>
  );
}

function EmptyState({ icon: Icon, title, description, color = "blue" }) {
  const gradients = { violet: "from-violet-400 to-purple-500", teal: "from-teal-400 to-cyan-500", blue: "from-blue-400 to-indigo-500" };
  return (
    <div className="flex flex-col items-center justify-center py-20 gap-4 text-center">
      <div className={`p-5 bg-gradient-to-br ${gradients[color]} rounded-2xl shadow-lg opacity-30`}>
        <Icon className="w-10 h-10 text-white" />
      </div>
      <div>
        <p className="text-lg font-semibold text-gray-600 dark:text-gray-300">{title}</p>
        <p className="text-sm text-gray-400 dark:text-gray-500 mt-1 max-w-xs">{description}</p>
      </div>
    </div>
  );
}

export default function ClientChallans() {
  const { client } = useClientAuth();
  const [activeTab, setActiveTab] = useState("party");
  const [partyChallans, setPartyChallans] = useState([]);
  const [deliveryChallans, setDeliveryChallans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [financialYears, setFinancialYears] = useState([]);
  const [selectedFY, setSelectedFY] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [includeCancelled, setIncludeCancelled] = useState(false);
  const [printingId, setPrintingId] = useState(null);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [printingPcId, setPrintingPcId] = useState(null);

  const token = localStorage.getItem("client_token");

  const fetchFY = async () => {
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/client/financial-years`, { headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) return;
      const data = await res.json();
      setFinancialYears(data);
      const active = data.find((fy) => fy.is_active);
      if (active) setSelectedFY(active.id);
    } catch (e) { console.error(e); }
  };

  const fetchPartyChallans = async () => {
    setLoading(true);
    try {
      let url = `${import.meta.env.VITE_API_URL}/client/party-challans?include_cancelled=${includeCancelled}`;
      if (selectedFY) url += `&financial_year_id=${selectedFY}`;
      if (statusFilter) url += `&status=${statusFilter}`;
      if (startDate) url += `&start_date=${startDate}`;
      if (endDate) url += `&end_date=${endDate}`;
      const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) throw new Error("Failed to load party challans");
      setPartyChallans(await res.json());
    } catch (e) { toast.error(e.message); } finally { setLoading(false); }
  };

  const fetchDeliveryChallans = async () => {
    setLoading(true);
    try {
      const params = [];
      if (selectedFY) params.push(`financial_year_id=${selectedFY}`);
      if (statusFilter) params.push(`status=${statusFilter}`);
      if (startDate) params.push(`start_date=${startDate}`);
      if (endDate) params.push(`end_date=${endDate}`);
      const url = `${import.meta.env.VITE_API_URL}/client/delivery-challans${params.length ? "?" + params.join("&") : ""}`;
      const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) throw new Error("Failed to load delivery challans");
      setDeliveryChallans(await res.json());
    } catch (e) { toast.error(e.message); } finally { setLoading(false); }
  };

  const handlePrintDC = async (challanId) => {
    setPrintingId(challanId);
    try {
      const res = await fetch(
        import.meta.env.VITE_API_URL + '/client/delivery-challans/' + challanId + '/download',
        { headers: { Authorization: 'Bearer ' + token } }
      );
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || 'Failed to load challan');
      }
      const html = await res.text();
      const printWindow = window.open('', '_blank');
      if (!printWindow) {
        toast.error('Popup blocked - please allow popups for this site');
        return;
      }
      printWindow.document.write(html);
      printWindow.document.close();
      printWindow.focus();
      setTimeout(function() { printWindow.print(); }, 800);
      toast.success('Challan opened - use Print > Save as PDF to download.');
    } catch (e) {
      toast.error(e.message);
    } finally {
      setPrintingId(null);
    }
  };


  const [isIssueModalOpen, setIsIssueModalOpen] = useState(false);
  const [issueTargetId, setIssueTargetId] = useState(null);
  const [issueNotes, setIssueNotes] = useState("");

  const handleUpdateStatus = async (challanId, action, notes = "") => {
    try {
      let body = { client_status: action };
      if (action === "discrepancy") {
        body.client_notes = notes;
      }
      
      const res = await fetch(`${import.meta.env.VITE_API_URL}/client/delivery-challans/${challanId}/report-issue`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(body)
      });
      if (!res.ok) throw new Error("Failed to update status");
      
      toast.success(action === "accepted" ? "Receipt acknowledged!" : "Issue reported successfully.");
      if (activeTab === "delivery") fetchDeliveryChallans();
      if (activeTab === "party") fetchPartyChallans();
      setIsIssueModalOpen(false);
      setIssueTargetId(null);
      setIssueNotes("");
    } catch (e) {
      toast.error(e.message);
    }
  };

  const onUpdateStatus = (id, action) => {
    if (action === "report_issue_flow") {
      setIssueTargetId(id);
      setIsIssueModalOpen(true);
    } else {
      handleUpdateStatus(id, action);
    }
  };

  useEffect(() => { fetchFY(); }, []);
  useEffect(() => {
    if (activeTab === "party") fetchPartyChallans();
    else fetchDeliveryChallans();
  }, [activeTab, selectedFY, statusFilter, includeCancelled, startDate, endDate]);

  const filteredParty = partyChallans.filter((c) => c.challan_number.toLowerCase().includes(searchTerm.toLowerCase()));
  const filteredDelivery = deliveryChallans.filter((c) => c.challan_number.toLowerCase().includes(searchTerm.toLowerCase()) || (c.party_challan_numbers || []).some((n) => n.toLowerCase().includes(searchTerm.toLowerCase())));
  const statusOptions = activeTab === "party" ? ["open", "partial", "completed", "cancelled"] : ["draft", "sent", "delivered"];

  const handleExportCSV = () => {
    const list = activeTab === "party" ? filteredParty : filteredDelivery;
    if (!list.length) return toast.error("No data to export");

    let csv = "";
    if (activeTab === "party") {
      csv = "Challan Number,Date,Status,Total Ordered,Total Delivered,Progress %\n";
      list.forEach(c => {
        const ord = c.items.reduce((s, i) => s + i.quantity_ordered, 0);
        const del = c.items.reduce((s, i) => s + i.quantity_delivered, 0);
        const pct = ord > 0 ? Math.round((del/ord)*100) : 0;
        csv += `${c.challan_number},${c.challan_date},${c.status},${ord},${del},${pct}%\n`;
      });
    } else {
      csv = "Delivery Challan No,Date,Status,Vehicle No,Party Challan Refs\n";
      list.forEach(c => {
        const refs = c.party_challan_numbers ? c.party_challan_numbers.join("; ") : "";
        csv += `${c.challan_number},${c.challan_date},${c.status},${c.vehicle_number || ""},${refs}\n`;
      });
    }

    const blob = new Blob([csv], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${activeTab}_challans_${new Date().toISOString().split("T")[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  };

  const handlePrintPC = async (challanId) => {
    setPrintingPcId(challanId);
    try {
      const res = await fetch(
        import.meta.env.VITE_API_URL + '/client/party-challans/' + challanId + '/report/download',
        { headers: { Authorization: 'Bearer ' + token } }
      );
      if (!res.ok) throw new Error("Failed to load report");
      const html = await res.text();
      const printWindow = window.open('', '_blank');
      if (!printWindow) return toast.error('Popup blocked - please allow popups');
      printWindow.document.write(html);
      printWindow.document.close();
      printWindow.focus();
    } catch (e) { toast.error(e.message); } finally { setPrintingPcId(null); }
  };

  // Stats calculations for Dashboard
  const stats = {
    openPartyChallans: partyChallans.filter(c => c.status === "open" || c.status === "partial").length,
    pendingItems: partyChallans.filter(c => c.status === "open" || c.status === "partial").reduce((sum, c) => sum + c.items.reduce((s, i) => s + Math.max(0, i.quantity_ordered - i.quantity_delivered), 0), 0),
    totalDispatches: partyChallans.reduce((sum, c) => sum + c.delivery_challan_count, 0)
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-10">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
            <span className="p-2 bg-gradient-to-br from-violet-500 to-purple-600 rounded-xl">
              <Package className="w-6 h-6 text-white" />
            </span>
            Challans
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 ml-12">Track your material orders and dispatches</p>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={handleExportCSV}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-sm hover:border-green-400 dark:hover:border-green-500 transition-all text-gray-700 dark:text-gray-300"
          >
            <Download className="w-4 h-4 text-green-600 dark:text-green-500" />
            <span className="hidden sm:inline">Export CSV</span>
          </button>
          <FYDropdown financialYears={financialYears} selected={selectedFY} onSelect={(v) => { setSelectedFY(v); setStatusFilter(""); }} />
        </div>
      </div>

      {/* Dashboard Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-white dark:bg-gray-800 p-5 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-violet-100 dark:bg-violet-900/30 text-violet-600 dark:text-violet-400 rounded-xl">
            <Package className="w-6 h-6" />
          </div>
          <div>
            <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">Open Party Challans</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.openPartyChallans}</p>
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 p-5 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-xl">
            <Clock className="w-6 h-6" />
          </div>
          <div>
            <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">Pending Delivery Items</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.pendingItems}</p>
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 p-5 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 rounded-xl">
            <Truck className="w-6 h-6" />
          </div>
          <div>
            <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">Total Dispatches</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.totalDispatches}</p>
          </div>
        </div>
      </div>

      <div className="flex bg-gray-100 dark:bg-gray-800 rounded-2xl p-1 gap-1">
        {[
          { key: "party", label: "Party Challans", icon: Package, color: "violet", count: filteredParty.length },
          { key: "delivery", label: "Delivery Challans", icon: Truck, color: "teal", count: filteredDelivery.length },
        ].map(({ key, label, icon: Icon, color, count }) => (
          <button key={key} onClick={() => { setActiveTab(key); setStatusFilter(""); setSearchTerm(""); }}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-sm font-semibold transition-all duration-200 ${activeTab === key ? "bg-white dark:bg-gray-700 shadow-sm text-" + color + "-700 dark:text-" + color + "-400" : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"}`}>
            <Icon className="w-4 h-4" />
            {label}
            {count > 0 && <span className={`bg-${color}-100 dark:bg-${color}-900/40 text-${color}-700 dark:text-${color}-300 text-xs px-2 py-0.5 rounded-full`}>{count}</span>}
          </button>
        ))}
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input type="text" placeholder="Search by challan number" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 text-sm bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl focus:outline-none focus:border-blue-400 dark:text-gray-200 transition-colors" />
          {searchTerm && <button onClick={() => setSearchTerm("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"><X className="w-4 h-4" /></button>}
        </div>

        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}
          className="px-4 py-2.5 text-sm bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl focus:outline-none focus:border-blue-400 dark:text-gray-200 transition-colors">
          <option value="">All Status</option>
          {statusOptions.map((s) => <option key={s} value={s}>{STATUS_CONFIG[s]?.label || s}</option>)}
        </select>

        {activeTab === "party" && (
          <button onClick={() => setIncludeCancelled(!includeCancelled)}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium rounded-xl border transition-all ${includeCancelled ? "border-red-300 bg-red-50 text-red-700 dark:border-red-700 dark:bg-red-900/20 dark:text-red-400" : "border-gray-200 bg-white text-gray-600 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400"}`}>
            {includeCancelled ? <Eye className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
            {includeCancelled ? "With Cancelled" : "Hide Cancelled"}
          </button>
        )}

        <button onClick={() => activeTab === "party" ? fetchPartyChallans() : fetchDeliveryChallans()}
          className="p-2.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors text-gray-500 dark:text-gray-400">
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3 text-gray-400 dark:text-gray-500">
          <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
          <p className="text-sm">Loading challans</p>
        </div>
      ) : activeTab === "party" ? (
        filteredParty.length === 0 ? (
          <EmptyState icon={Package} title="No Party Challans" description="No party challans found for the selected filters." color="violet" />
        ) : (
          <div className="space-y-3">
            {filteredParty.map((c) => <PartyChallanCard key={c.id} challan={c} handlePrintPC={handlePrintPC} printingPcId={printingPcId} />)}
          </div>
        )
      ) : (
        filteredDelivery.length === 0 ? (
          <EmptyState icon={Truck} title="No Delivery Challans" description="No delivery challans dispatched yet for the selected filters." color="teal" />
        ) : (
          <div className="space-y-3">
            {filteredDelivery.map((c) => <DeliveryChallanCard key={c.id} challan={c} onPrint={handlePrintDC} printingId={printingId} onUpdateStatus={onUpdateStatus} />)}
          </div>
        )
      )}

      {isIssueModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-gray-800 rounded-2xl w-full max-w-md shadow-2xl border border-gray-100 dark:border-gray-700 overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-gray-700 bg-red-50/50 dark:bg-red-900/10">
              <div className="flex items-center gap-3 text-red-600 dark:text-red-400">
                <AlertCircle className="w-5 h-5" />
                <h3 className="font-bold text-lg">Report Discrepancy</h3>
              </div>
              <button onClick={() => setIsIssueModalOpen(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Issue Description</label>
                <textarea
                  value={issueNotes}
                  onChange={(e) => setIssueNotes(e.target.value)}
                  placeholder="Please describe the issue (e.g., missing items, damaged goods, incorrect quantity)..."
                  className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-red-500/20 focus:border-red-500 outline-none transition-all resize-none h-32 text-sm text-gray-900 dark:text-white placeholder-gray-400"
                />
              </div>
              <div className="flex gap-3 pt-2">
                <button onClick={() => setIsIssueModalOpen(false)} className="flex-1 px-4 py-2.5 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 font-semibold rounded-xl transition-all">Cancel</button>
                <button onClick={() => handleUpdateStatus(issueTargetId, "discrepancy", issueNotes)} disabled={!issueNotes.trim()} className="flex-1 px-4 py-2.5 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-xl transition-all shadow-sm disabled:opacity-50 flex items-center justify-center gap-2">
                  <AlertCircle className="w-4 h-4" /> Submit Issue
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

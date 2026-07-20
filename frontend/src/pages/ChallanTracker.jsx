import React, { useEffect, useState, Suspense, lazy } from "react";
import { useTranslation } from "react-i18next";
import {
  Package, Truck, ChevronDown, Download, Printer, Loader2, Calendar, Search, X, CheckCircle, Clock, AlertCircle, XCircle, Eye, RefreshCw, Plus, Edit, Trash2, Send, ClipboardCheck
} from "lucide-react";
import toast from "react-hot-toast";

// API
import { getPartyChallans, deletePartyChallan } from "../api/partyChallans";
import { getDeliveryChallans, deleteDeliveryChallan, printDeliveryChallan, getDeliveryChallanShareLink } from "../api/challans";
import { getParties } from "../api/parties";
import { getItems } from "../api/items";

// Modals
import AddPartyChallanModal from "../components/AddPartyChallanModal";
import AddDeliveryChallanModal from "../components/AddDeliveryChallanModal";
import ConfirmDialog from "../components/ConfirmDialog";
import PDIReportModal from "../components/PDIReportModal";
const PdfPreviewModal = lazy(() => import("../components/PdfPreviewModal"));

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

function PartyChallanCard({ challan, onEdit, onDelete }) {
  const [expanded, setExpanded] = useState(false);
  const totalOrdered = challan.items?.reduce((s, i) => s + i.quantity_ordered, 0) || 0;
  const totalDelivered = challan.items?.reduce((s, i) => s + i.quantity_delivered, 0) || 0;
  const overallPct = totalOrdered > 0 ? Math.round((totalDelivered / totalOrdered) * 100) : 0;

  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm hover:shadow-md transition-all duration-200 overflow-hidden">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between p-4 sm:p-5 gap-4 sm:gap-0">
        <div className="flex items-start sm:items-center gap-3 sm:gap-4 cursor-pointer flex-1" onClick={() => setExpanded(!expanded)}>
          <div className="p-2 sm:p-2.5 bg-gradient-to-br from-violet-500 to-purple-600 rounded-xl shadow-sm shrink-0">
            <Package className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-bold text-gray-900 dark:text-white text-base">{challan.challan_number}</h3>
              <StatusBadge status={challan.status} />
              <span className="text-xs bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 px-2 py-0.5 rounded-full font-medium">
                {challan.party?.name || "Unknown Party"}
              </span>
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
        <div className="flex items-center justify-end gap-2 sm:gap-3 w-full sm:w-auto pt-3 sm:pt-0 border-t sm:border-0 border-gray-100 dark:border-gray-700">
          <div className="text-right hidden sm:block mr-2">
            <p className="text-xs text-gray-400 dark:text-gray-500">Dispatches</p>
            <p className="text-sm font-semibold text-gray-700 dark:text-gray-200">{challan.delivery_challan_count || 0}</p>
          </div>
          <button onClick={() => onEdit(challan)} className="p-2 text-gray-400 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg transition-colors" title="Edit">
            <Edit className="w-4 h-4" />
          </button>
          <button onClick={() => onDelete(challan)} className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-colors" title="Delete">
            <Trash2 className="w-4 h-4" />
          </button>
          <div className={`p-2 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-500 transition-transform duration-200 cursor-pointer ${expanded ? "rotate-180" : ""}`} onClick={() => setExpanded(!expanded)}>
            <ChevronDown className="w-4 h-4" />
          </div>
        </div>
      </div>

      {!expanded && challan.items && challan.items.length > 0 && (
        <div className="px-5 pb-4">
          <ProgressBar percent={overallPct} qty_ordered={totalOrdered} qty_delivered={totalDelivered} />
        </div>
      )}

      {expanded && (
        <div className="border-t border-gray-100 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-900/30">
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
                        <span className="opacity-60">·</span>
                        <span className="capitalize opacity-80">{dc.status}</span>
                        {dc.client_status === "discrepancy" && (
                          <span className="flex items-center ml-1 text-red-600 bg-red-100 rounded-full px-1.5 py-0.5" title="Issue Reported">
                            <AlertCircle className="w-3 h-3" />
                          </span>
                        )}
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
            {challan.items?.map((item) => (
              <div key={item.id} className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <p className="font-semibold text-gray-900 dark:text-white text-sm">{item.item?.name || "Unknown Item"}</p>
                    {item.process?.name && <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Process: {item.process.name}</p>}
                  </div>
                  <span className="text-xs font-bold text-gray-700 dark:text-gray-200 bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded-lg">
                    {item.quantity_ordered > 0 ? Math.round((item.quantity_delivered/item.quantity_ordered)*100) : 0}%
                  </span>
                </div>
                <ProgressBar percent={item.quantity_ordered > 0 ? (item.quantity_delivered/item.quantity_ordered)*100 : 0} qty_ordered={item.quantity_ordered} qty_delivered={item.quantity_delivered} />
              </div>
            ))}
            {(!challan.items || challan.items.length === 0) && <p className="text-sm text-gray-400 italic text-center py-4">No items in this challan</p>}
          </div>
        </div>
      )}
    </div>
  );
}

function DeliveryChallanCard({ challan, onEdit, onDelete, onPrint, onWhatsApp, onPDI, onResolveIssue }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm hover:shadow-md transition-all duration-200 overflow-hidden">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between p-4 sm:p-5 gap-4 sm:gap-0">
        <div className="flex items-start sm:items-center gap-3 sm:gap-4 cursor-pointer flex-1" onClick={() => setExpanded(!expanded)}>
          <div className="p-2 sm:p-2.5 bg-gradient-to-br from-teal-500 to-cyan-600 rounded-xl shadow-sm shrink-0">
            <Truck className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-bold text-gray-900 dark:text-white text-base">{challan.challan_number}</h3>
              <StatusBadge status={challan.status} />
              <span className="text-xs bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 px-2 py-0.5 rounded-full font-medium">
                {challan.party?.name || "Unknown Party"}
              </span>
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
        <div className="flex flex-wrap items-center justify-end gap-1 sm:gap-2 w-full sm:w-auto pt-3 sm:pt-0 border-t sm:border-0 border-gray-100 dark:border-gray-700">
          <button 
            onClick={() => onPDI(challan)} 
            className={`p-2 rounded-lg transition-colors ${
              challan.has_pdi_report 
                ? "bg-indigo-100 text-indigo-700 hover:bg-indigo-200 dark:bg-indigo-900/50 dark:text-indigo-300 dark:hover:bg-indigo-800/60 ring-1 ring-indigo-300 dark:ring-indigo-700" 
                : "text-indigo-600 hover:bg-indigo-50 dark:text-indigo-400 dark:hover:bg-indigo-900/30"
            }`} 
            title={challan.has_pdi_report ? "View/Edit PDI Report" : "Create PDI Report"}
          >
            <ClipboardCheck className="w-4 h-4" />
          </button>
          <button onClick={() => onWhatsApp(challan)} className="p-2 text-green-600 hover:bg-green-50 dark:text-green-400 dark:hover:bg-green-900/30 rounded-lg transition-colors" title="WhatsApp Share">
            <Send className="w-4 h-4" />
          </button>
          <button onClick={() => onPrint(challan)} className="p-2 text-blue-600 hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-blue-900/30 rounded-lg transition-colors" title="Print PDF">
            <Printer className="w-4 h-4" />
          </button>
          <div className="w-px h-6 bg-gray-200 dark:bg-gray-700 mx-1 hidden sm:block"></div>
          <button onClick={() => onEdit(challan)} className="p-2 text-gray-400 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg transition-colors" title="Edit">
            <Edit className="w-4 h-4" />
          </button>
          <button onClick={() => onDelete(challan)} className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-colors" title="Delete">
            <Trash2 className="w-4 h-4" />
          </button>
          <div className={`p-2 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-500 transition-transform duration-200 cursor-pointer ${expanded ? "rotate-180" : ""}`} onClick={() => setExpanded(!expanded)}>
            <ChevronDown className="w-4 h-4" />
          </div>
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
            {(!challan.items || challan.items.length === 0) ? (
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
                        <td className="py-2.5 pr-2 font-medium text-gray-800 dark:text-gray-200">{item.item?.name || "Unknown"}</td>
                        <td className="py-2.5 pr-2 text-gray-500 dark:text-gray-400 text-xs">{item.process?.name || "—"}</td>
                        <td className="py-2.5 text-right text-gray-700 dark:text-gray-300 font-medium">{item.quantity}</td>
                        <td className="py-2.5 text-right font-semibold text-green-600">{item.ok_qty}</td>
                        <td className="py-2.5 text-right font-semibold text-red-500">{item.cr_qty > 0 ? item.cr_qty : "—"}</td>
                        <td className="py-2.5 text-right font-semibold text-orange-500">{item.mr_qty > 0 ? item.mr_qty : "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

            {/* Client Status Section */}
            {(challan.client_status === "accepted" || challan.client_status === "discrepancy" || challan.client_status === "resolved") && (
              <div className="mx-5 mb-5 pt-4 border-t border-gray-100 dark:border-gray-700">
                <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500 mb-2">Client Feedback</p>
                {challan.client_status === "accepted" && (
                  <div className="flex items-center gap-2 text-green-600 bg-green-50 dark:bg-green-900/20 px-3 py-2 rounded-lg border border-green-100 dark:border-green-800">
                    <CheckCircle className="w-4 h-4" />
                    <span className="text-sm font-semibold">Client Acknowledged Receipt</span>
                  </div>
                )}
                {challan.client_status === "resolved" && (
                  <div className="flex items-center gap-2 text-gray-600 bg-gray-50 dark:bg-gray-800/50 px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700">
                    <CheckCircle className="w-4 h-4" />
                    <span className="text-sm font-semibold">Issue Resolved</span>
                    {challan.client_notes && <span className="text-xs ml-2 opacity-60">({challan.client_notes})</span>}
                  </div>
                )}
                {challan.client_status === "discrepancy" && (
                  <div className="bg-red-50 dark:bg-red-900/20 px-4 py-3 rounded-xl border border-red-100 dark:border-red-800">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-red-600 dark:text-red-400 mb-1">
                        <AlertCircle className="w-5 h-5" />
                        <span className="font-bold text-sm">Client Reported an Issue</span>
                      </div>
                      <button onClick={() => onResolveIssue && onResolveIssue(challan)} className="text-xs px-2.5 py-1 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 font-semibold shadow-sm transition-all">
                        Mark Resolved
                      </button>
                    </div>
                    {challan.client_notes && (
                      <p className="text-sm text-red-700 dark:text-red-300 mt-1 pl-7">{challan.client_notes}</p>
                    )}
                  </div>
                )}
              </div>
            )}

        </div>
      )}
    </div>
  );
}

function EmptyState({ icon: Icon, title, description, color = "blue" }) {
  const gradients = { violet: "from-violet-400 to-purple-500", teal: "from-teal-400 to-cyan-500", blue: "from-blue-400 to-indigo-500" };
  return (
    <div className="flex flex-col items-center justify-center py-20 gap-4 text-center animate-in fade-in zoom-in duration-500">
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

export default function ChallanTracker() {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState("party");
  const [partyChallans, setPartyChallans] = useState([]);
  const [deliveryChallans, setDeliveryChallans] = useState([]);
  const [parties, setParties] = useState([]);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const [statusFilter, setStatusFilter] = useState("");
  const [partyFilter, setPartyFilter] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  
  // Modals
  const [showAddPartyModal, setShowAddPartyModal] = useState(false);
  const [showAddDeliveryModal, setShowAddDeliveryModal] = useState(false);
  const [editingPartyChallan, setEditingPartyChallan] = useState(null);
  const [editingDeliveryChallan, setEditingDeliveryChallan] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState({ open: false, challan: null, type: null });
  
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [previewTitle, setPreviewTitle] = useState("");
  const [showPDIModal, setShowPDIModal] = useState(false);
  const [selectedPDIChallan, setSelectedPDIChallan] = useState(null);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [pcData, dcData, pData, iData] = await Promise.all([
        getPartyChallans(),
        getDeliveryChallans(),
        getParties(),
        getItems()
      ]);
      setPartyChallans(pcData);
      setDeliveryChallans(dcData);
      setParties(pData);
      setItems(iData);
    } catch (e) {
      toast.error("Failed to load challans");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const handleExportCSV = () => {
    const list = activeTab === "party" ? filteredParty : filteredDelivery;
    if (!list.length) return toast.error("No data to export");
    let csv = "";
    if (activeTab === "party") {
      csv = "Challan Number,Party,Date,Status,Progress %\n";
      list.forEach(c => {
        const ord = c.items?.reduce((s, i) => s + i.quantity_ordered, 0) || 0;
        const del = c.items?.reduce((s, i) => s + i.quantity_delivered, 0) || 0;
        const pct = ord > 0 ? Math.round((del/ord)*100) : 0;
        csv += `${c.challan_number},"${c.party?.name || ''}",${new Date(c.challan_date).toLocaleDateString()},${c.status},${pct}%\n`;
      });
    } else {
      csv = "Delivery Challan No,Party,Date,Status,Vehicle No\n";
      list.forEach(c => {
        csv += `${c.challan_number},"${c.party?.name || ''}",${new Date(c.challan_date).toLocaleDateString()},${c.status},${c.vehicle_number || ""}\n`;
      });
    }
    const blob = new Blob([csv], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${activeTab}_challans_${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const confirmDelete = async () => {
    try {
      if (deleteConfirm.type === 'party') {
        await deletePartyChallan(deleteConfirm.challan.id);
      } else {
        await deleteDeliveryChallan(deleteConfirm.challan.id);
      }
      toast.success("Deleted successfully");
      setDeleteConfirm({ open: false, challan: null, type: null });
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.detail || "Delete failed");
    }
  };

  const handlePrint = async (challan) => {
    setPreviewOpen(true);
    setPreviewUrl(null);
    setPreviewTitle(`Challan #${challan.challan_number}`);
    const toastId = toast.loading("Generating PDF...");
    try {
      const blob = await printDeliveryChallan(challan.id);
      const url = window.URL.createObjectURL(new Blob([blob], { type: "text/html" }));
      setPreviewUrl(url);
      toast.success("PDF generated", { id: toastId });
    } catch (err) {
      setPreviewOpen(false);
      toast.error(`Failed to generate PDF`, { id: toastId });
    }
  };

  const handleWhatsApp = async (challan) => {
    try {
      const toastId = toast.loading("Generating link...");
      const data = await getDeliveryChallanShareLink(challan.id);
      toast.dismiss(toastId);
      window.open(data.whatsapp_url, '_blank');
    } catch (e) {
      toast.error("Failed to generate WhatsApp link");
    }
  };

  const handleResolveIssue = async (challan) => {
    try {
      const toastId = toast.loading("Marking as resolved...");
      const { resolveDeliveryChallanIssue } = await import("../api/challans");
      await resolveDeliveryChallanIssue(challan.id);
      toast.success("Issue marked as resolved!", { id: toastId });
      fetchData(); // Refresh the data to show the gray resolved badge
    } catch (err) {
      toast.error("Failed to resolve issue");
    }
  };

  const filteredParty = partyChallans.filter(c => {
    const matchSearch = c.challan_number.toLowerCase().includes(searchTerm.toLowerCase()) || c.party?.name?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchStatus = statusFilter ? c.status === statusFilter : true;
    const matchParty = partyFilter ? c.party_id === parseInt(partyFilter) : true;
    return matchSearch && matchStatus && matchParty;
  });

  const filteredDelivery = deliveryChallans.filter(c => {
    const matchSearch = c.challan_number.toLowerCase().includes(searchTerm.toLowerCase()) || c.party?.name?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchStatus = statusFilter ? c.status === statusFilter : true;
    const matchParty = partyFilter ? c.party_id === parseInt(partyFilter) : true;
    return matchSearch && matchStatus && matchParty;
  });

  const pcIdByItem = {};
  partyChallans.forEach(pc => {
    pc.items?.forEach(item => { pcIdByItem[item.id] = pc.id; });
  });

  const dcByPc = {};
  deliveryChallans.forEach(dc => {
    dc.items?.forEach(item => {
      const pcId = pcIdByItem[item.party_challan_item_id] || item.party_challan_item?.party_challan_id;
      if (pcId) {
        if (!dcByPc[pcId]) dcByPc[pcId] = new Map();
        dcByPc[pcId].set(dc.id, dc);
      }
    });
  });

  const enrichedParty = filteredParty.map(pc => {
    const dcs = dcByPc[pc.id] ? Array.from(dcByPc[pc.id].values()) : [];
    return {
      ...pc,
      delivery_challan_count: dcs.length,
      delivery_challans_list: dcs.map(d => ({
        challan_number: d.challan_number,
        status: d.status,
        challan_date: d.challan_date,
        client_status: d.client_status
      }))
    };
  });

  const enrichedDelivery = filteredDelivery.map(dc => {
    const pcNumbers = new Set();
    dc.items?.forEach(item => {
      const pcId = pcIdByItem[item.party_challan_item_id] || item.party_challan_item?.party_challan_id;
      if (pcId) {
        const pc = partyChallans.find(p => p.id === pcId);
        if (pc) pcNumbers.add(pc.challan_number);
      }
    });
    return {
      ...dc,
      party_challan_numbers: Array.from(pcNumbers)
    };
  });

  const statusOptions = activeTab === "party" ? ["open", "partial", "completed", "cancelled"] : ["draft", "sent", "delivered"];

  const stats = {
    openPartyChallans: partyChallans.filter(c => c.status === "open" || c.status === "partial").length,
    pendingItems: partyChallans.filter(c => c.status === "open" || c.status === "partial").reduce((sum, c) => sum + (c.items || []).reduce((s, i) => s + Math.max(0, i.quantity_ordered - i.quantity_delivered), 0), 0),
    pendingIssues: deliveryChallans.filter(c => c.client_status === "discrepancy").length
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-10 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
            <span className="p-2 bg-gradient-to-br from-violet-500 to-purple-600 rounded-xl">
              <Package className="w-6 h-6 text-white" />
            </span>
            Challan Tracker
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 ml-12">Manage all your Work Orders and Shipments in one place</p>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={handleExportCSV} className="flex items-center gap-2 px-4 py-2 text-sm font-medium bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-sm hover:border-green-400 dark:hover:border-green-500 transition-all text-gray-700 dark:text-gray-300">
            <Download className="w-4 h-4 text-green-600" />
            <span className="hidden sm:inline">Export CSV</span>
          </button>
          <button onClick={() => activeTab === 'party' ? setShowAddPartyModal(true) : setShowAddDeliveryModal(true)} className="flex items-center gap-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white px-4 py-2 rounded-xl font-semibold transition-all duration-300 shadow-lg shadow-indigo-600/30 hover:scale-105 text-sm">
            <Plus size={16} />
            Add {activeTab === 'party' ? 'Work Order' : 'Shipment'}
          </button>
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
          <div className={`p-3 rounded-xl ${stats.pendingIssues > 0 ? 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400' : 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400'}`}>
            <AlertCircle className="w-6 h-6" />
          </div>
          <div>
            <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">Pending Issues</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.pendingIssues}</p>
          </div>
        </div>
      </div>

      <div className="flex bg-gray-100 dark:bg-gray-800 rounded-2xl p-1 gap-1">
        {[
          { key: "party", label: "Party Challans", icon: Package, color: "violet", count: partyChallans.length },
          { key: "delivery", label: "Delivery Challans", icon: Truck, color: "teal", count: deliveryChallans.length },
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
          <input type="text" placeholder="Search by number or party..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 text-sm bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl focus:outline-none focus:border-blue-400 dark:text-gray-200 transition-colors" />
          {searchTerm && <button onClick={() => setSearchTerm("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"><X className="w-4 h-4" /></button>}
        </div>

        <div className="grid grid-cols-[1fr_1fr_auto] sm:flex gap-2 sm:gap-3">
          <select value={partyFilter} onChange={(e) => setPartyFilter(e.target.value)} className="w-full px-2 sm:px-4 py-2.5 text-xs sm:text-sm bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl focus:outline-none focus:border-blue-400 dark:text-gray-200 transition-colors sm:max-w-[200px]">
            <option value="">All Parties</option>
            {parties.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>

          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="w-full px-2 sm:px-4 py-2.5 text-xs sm:text-sm bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl focus:outline-none focus:border-blue-400 dark:text-gray-200 transition-colors sm:max-w-[150px]">
            <option value="">All Status</option>
            {statusOptions.map((s) => <option key={s} value={s}>{STATUS_CONFIG[s]?.label || s}</option>)}
          </select>
          
          <button onClick={fetchData} className="p-2.5 sm:px-4 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors text-gray-500 dark:text-gray-400 flex items-center justify-center">
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3 text-gray-400">
            <Loader2 className="w-8 h-8 animate-spin text-purple-500" />
            <p className="text-sm font-medium">Loading data...</p>
          </div>
        ) : activeTab === "party" ? (
          enrichedParty.length === 0 ? (
            <EmptyState icon={Package} title="No Work Orders" description="No party challans match your filters. Create one to get started." color="violet" />
          ) : (
            <div className="space-y-3">
              {enrichedParty.map(c => <PartyChallanCard key={c.id} challan={c} 
                onEdit={(challan) => { setEditingPartyChallan(challan); setShowAddPartyModal(true); }}
                onDelete={(challan) => setDeleteConfirm({ open: true, challan, type: 'party' })}
              />)}
            </div>
          )
        ) : (
          enrichedDelivery.length === 0 ? (
            <EmptyState icon={Truck} title="No Shipments" description="No delivery challans match your filters." color="teal" />
          ) : (
            <div className="space-y-3">
              {enrichedDelivery.map(c => <DeliveryChallanCard key={c.id} challan={c} 
                onEdit={(challan) => { setEditingDeliveryChallan(challan); setShowAddDeliveryModal(true); }}
                onDelete={(challan) => setDeleteConfirm({ open: true, challan, type: 'delivery' })}
                onPrint={handlePrint}
                onWhatsApp={handleWhatsApp}
                onPDI={(challan) => { setSelectedPDIChallan(challan); setShowPDIModal(true); }}
                onResolveIssue={handleResolveIssue}
              />)}
            </div>
          )
        )}

      {showAddPartyModal && (
        <AddPartyChallanModal open={showAddPartyModal} onClose={() => { setShowAddPartyModal(false); setEditingPartyChallan(null); }}
          onSuccess={fetchData} partyChallan={editingPartyChallan} />
      )}
      
      {showAddDeliveryModal && (
        <AddDeliveryChallanModal open={showAddDeliveryModal} onClose={() => { setShowAddDeliveryModal(false); setEditingDeliveryChallan(null); }}
          onSuccess={fetchData} deliveryChallan={editingDeliveryChallan} />
      )}

      {showPDIModal && (
        <PDIReportModal isOpen={showPDIModal} onClose={() => { setShowPDIModal(false); setSelectedPDIChallan(null); }} challan={selectedPDIChallan} />
      )}

      <ConfirmDialog open={deleteConfirm.open} title="Delete Challan" message="Are you sure you want to delete this challan? This action cannot be undone."
        onConfirm={confirmDelete} onCancel={() => setDeleteConfirm({ open: false, challan: null, type: null })} />

      <Suspense fallback={null}>
        <PdfPreviewModal isOpen={previewOpen} onClose={() => setPreviewOpen(false)} pdfUrl={previewUrl} title={previewTitle} />
      </Suspense>
    </div>
  );
}

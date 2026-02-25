import { useEffect, useState, Fragment, Suspense, lazy } from "react";
import {
  Plus,
  Search,
  FileText,
  Edit,
  Trash2,
  Calendar,
  Building2,
  Package,
  ChevronLeft,
  ChevronRight,
  Truck,
  Printer,
  BarChart3,
  Send,
  Weight,
  ClipboardCheck,
  MessageCircle,
  CheckCircle,
} from "lucide-react";
import toast from "react-hot-toast";
import {
  getDeliveryChallans,
  deleteDeliveryChallan,
  printDeliveryChallan,
  printBulkDeliveryChallans,
  getChallanStats,
  getDeliveryChallanShareLink,
} from "../api/challans";
import { getParties } from "../api/parties";
import { getItems } from "../api/items";
import AddDeliveryChallanModal from "../components/AddDeliveryChallanModal";
import ConfirmDialog from "../components/ConfirmDialog";
import LoadingSpinner from "../components/LoadingSpinner";
import PDIReportModal from "../components/PDIReportModal";

const PdfPreviewModal = lazy(() => import("../components/PdfPreviewModal"));
import { formatDate } from "../utils/dateUtils";
import { useAuth } from "../hooks/useAuth";

export default function Challans() {
  const { hasFeature } = useAuth();
  const [challans, setChallans] = useState([]);
  const [parties, setParties] = useState([]);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingChallan, setEditingChallan] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [partyFilter, setPartyFilter] = useState("");
  const [itemFilter, setItemFilter] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [challansPerPage, setChallansPerPage] = useState(10);
  const [stats, setStats] = useState({ total: 0, sent: 0, delivered: 0 });
  const [selectedChallans, setSelectedChallans] = useState(new Set());
  // Date Range State
  const [dateRange, setDateRange] = useState({
    start: new Date(new Date().getFullYear(), new Date().getMonth(), 1)
      .toISOString()
      .split("T")[0], // First day of current month
    end: new Date().toISOString().split("T")[0], // Today
  });
  const [deleteConfirm, setDeleteConfirm] = useState({
    open: false,
    challan: null,
  });

  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [previewTitle, setPreviewTitle] = useState("");

  const [showPDIModal, setShowPDIModal] = useState(false);
  const [selectedPDIChallan, setSelectedPDIChallan] = useState(null);

  const loadChallans = async () => {
    try {
      setLoading(true);
      const [data, statsData, partiesData, itemsData] = await Promise.all([
        getDeliveryChallans({
          start_date: dateRange.start,
          end_date: dateRange.end,
        }),
        getChallanStats(),
        getParties(),
        getItems(),
      ]);
      setChallans(data);
      setStats(statsData);
      setParties(partiesData);
      setItems(itemsData);
    } catch (err) {
      console.error("Failed to load challans", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadChallans();
  }, [dateRange]); // Reload when date range changes

  const handleDelete = async (challan) => {
    setDeleteConfirm({ open: true, challan });
  };

  const confirmDelete = async () => {
    try {
      await deleteDeliveryChallan(deleteConfirm.challan.id);
      toast.success("Delivery Challan deleted successfully");
      setDeleteConfirm({ open: false, challan: null });
      loadChallans();
    } catch (err) {
      toast.error(
        err.response?.data?.detail || "Failed to delete delivery challan",
      );
    }
  };

  const handlePrint = async (challan) => {
    setPreviewOpen(true);
    setPreviewUrl(null);
    setPreviewTitle(`Challan #${challan.challan_number}`);

    let toastId;
    try {
      toastId = toast.loading("Generating PDF...");
      const blob = await printDeliveryChallan(challan.id);
      const url = window.URL.createObjectURL(
        new Blob([blob], { type: "application/pdf" }),
      );
      setPreviewUrl(url);
      toast.success("PDF generated", { id: toastId });
    } catch (err) {
      console.error(err);
      setPreviewOpen(false);

      let msg = err.message;
      if (msg === "Network Error") {
        msg = "Network Error (Check AdBlocker/Extensions?)";
      }
      toast.error(`Failed: ${msg}`, { id: toastId });
    }
  };

  const handleWhatsAppShare = async (challan) => {
    try {
      const toastId = toast.loading("Generating share link...");
      const response = await getDeliveryChallanShareLink(challan.id);
      toast.dismiss(toastId);

      if (response.whatsapp_url) {
        window.open(response.whatsapp_url, "_blank");
      } else {
        toast.error("Failed to generate WhatsApp link");
      }
    } catch (error) {
      console.error("Failed to share via WhatsApp", error);
      toast.error("Failed to prepare WhatsApp share");
    }
  };

  const handleClosePreview = () => {
    setPreviewOpen(false);
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
    }
  };

  const handleBulkPrint = async () => {
    if (selectedChallans.size === 0) return;

    setPreviewOpen(true);
    setPreviewUrl(null);
    setPreviewTitle(`Bulk Print (${selectedChallans.size} Challans)`);

    let toastId;
    try {
      toastId = toast.loading("Generating Bulk PDF...");
      const blob = await printBulkDeliveryChallans(
        Array.from(selectedChallans),
      );
      const url = window.URL.createObjectURL(
        new Blob([blob], { type: "application/pdf" }),
      );
      setPreviewUrl(url);
      toast.success("PDF generated", { id: toastId });
    } catch (err) {
      console.error(err);
      setPreviewOpen(false);

      let msg = err.message;
      if (err.response?.data?.detail) {
        msg = err.response.data.detail;
      }
      toast.error(`Failed: ${msg}`, { id: toastId });
    }
  };

  const toggleSelectAll = () => {
    if (selectedChallans.size === paginatedChallans.length) {
      setSelectedChallans(new Set());
    } else {
      setSelectedChallans(new Set(paginatedChallans.map((c) => c.id)));
    }
  };

  const toggleSelect = (id) => {
    const newSelected = new Set(selectedChallans);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedChallans(newSelected);
  };

  const filteredChallans = challans
    .filter((c) => {
      const matchesSearch =
        c.challan_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.party?.name?.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStatus = statusFilter ? c.status === statusFilter : true;
      const matchesParty = partyFilter
        ? c.party_id === Number(partyFilter)
        : true;
      const matchesItem = itemFilter
        ? c.items?.some(
            (challanItem) =>
              challanItem.item_id === Number(itemFilter) ||
              challanItem.item?.id === Number(itemFilter),
          )
        : true;
      return matchesSearch && matchesStatus && matchesParty && matchesItem;
    })
    .sort((a, b) => b.id - a.id);

  const totalPages = Math.ceil(filteredChallans.length / challansPerPage);
  const startIndex = (currentPage - 1) * challansPerPage;
  const endIndex = startIndex + challansPerPage;
  const paginatedChallans = filteredChallans.slice(startIndex, endIndex);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, statusFilter, partyFilter, itemFilter]);

  // Reset item filter when party filter changes
  useEffect(() => {
    setItemFilter("");
  }, [partyFilter]);

  // Get items filtered by selected party
  const filteredItems = partyFilter
    ? items.filter((item) => item.party_id === Number(partyFilter))
    : items;

  const getStatusColor = (status) => {
    switch (status) {
      case "draft":
        return "bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400";
      case "sent":
        return "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400";
      case "delivered":
        return "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400";
      default:
        return "bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400";
    }
  };

  // Calculate stats based on filtered challans (party-aware)
  const totalChallans = filteredChallans.length;
  const totalSent = filteredChallans.filter((c) => c.status === "sent").length;
  const totalDelivered = filteredChallans.filter(
    (c) => c.status === "delivered",
  ).length;

  const totalQuantitySent = filteredChallans
    .filter((c) => c.status === "sent")
    .reduce(
      (sum, c) =>
        sum +
        (c.items?.reduce(
          (s, item) =>
            s +
            Number(item.ok_qty || 0) +
            Number(item.cr_qty || 0) +
            Number(item.mr_qty || 0),
          0,
        ) || 0),
      0,
    );

  const totalQuantityDelivered = filteredChallans
    .filter((c) => c.status === "delivered")
    .reduce(
      (sum, c) =>
        sum +
        (c.items?.reduce(
          (s, item) =>
            s +
            Number(item.ok_qty || 0) +
            Number(item.cr_qty || 0) +
            Number(item.mr_qty || 0),
          0,
        ) || 0),
      0,
    );

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-gray-900 to-gray-600 dark:from-white dark:to-gray-300 bg-clip-text text-transparent">
            Delivery Challans
          </h1>
          <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 mt-1">
            Manage delivery challans and track shipments
          </p>
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto">
          {/* Print Button Moved to Filters */}
          <button
            onClick={() => {
              setEditingChallan(null);
              setShowAddModal(true);
            }}
            className="group flex items-center justify-center gap-2 bg-gradient-to-r from-green-600 to-emerald-700 hover:from-green-700 hover:to-emerald-800 text-white px-4 sm:px-6 py-2.5 sm:py-3 rounded-xl font-semibold transition-all duration-300 shadow-lg shadow-green-600/30 hover:shadow-xl hover:shadow-green-600/40 hover:scale-105 text-sm sm:text-base w-full md:w-auto"
          >
            <Plus
              size={18}
              className="group-hover:rotate-90 transition-transform duration-300 sm:w-5 sm:h-5"
            />
            Create Challan
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatCard
          label="Total Challans"
          value={totalChallans}
          icon={BarChart3}
          color="purple"
        />
        <StatCard
          label="Sent"
          value={totalSent}
          icon={Send}
          color="blue"
          subtext={`${totalQuantitySent} units sent`}
        />
        <StatCard
          label="Delivered"
          value={totalDelivered}
          icon={CheckCircle}
          color="green"
          subtext={`${totalQuantityDelivered} units delivered`}
        />
      </div>

      {/* Content */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-200 dark:border-gray-700 overflow-hidden backdrop-blur-sm">
        {/* Search and Filters */}
        <div className="p-5 border-b border-gray-200 dark:border-gray-700 bg-gradient-to-r from-gray-50 to-white dark:from-gray-800 dark:to-gray-800/50">
          <div className="flex flex-col sm:flex-row items-center gap-3">
            <div className="relative group flex-1 w-full">
              <div className="absolute inset-0 bg-gradient-to-r from-green-500/10 to-emerald-500/10 rounded-xl opacity-0 group-focus-within:opacity-100 transition-opacity duration-300"></div>
              <div className="relative flex items-center gap-3 bg-white dark:bg-gray-900/80 rounded-xl px-5 py-3 border-2 border-gray-200 dark:border-gray-700 focus-within:border-green-500 dark:focus-within:border-green-500 transition-all duration-300 shadow-sm hover:shadow-md">
                <Search
                  className="text-gray-400 group-focus-within:text-green-500 transition-colors duration-300"
                  size={20}
                />
                <input
                  type="text"
                  name="delivery_challan_search"
                  id="delivery_challan_search"
                  placeholder="Search by challan number or party..."
                  className="flex-1 bg-transparent border-none focus:ring-0 text-sm text-gray-900 dark:text-white placeholder-gray-400 outline-none"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
                {searchTerm && (
                  <span className="text-xs font-medium text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/30 px-2 py-1 rounded-md">
                    {filteredChallans.length} found
                  </span>
                )}
              </div>
            </div>

            <div className="w-full sm:w-auto flex items-center gap-2">
              <div className="relative">
                <input
                  type="date"
                  value={dateRange.start}
                  onChange={(e) =>
                    setDateRange({ ...dateRange, start: e.target.value })
                  }
                  className="px-3 py-3 rounded-xl border-2 border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm font-medium text-gray-900 dark:text-white focus:ring-2 focus:ring-green-500/30 focus:border-green-500 outline-none transition-all hover:border-gray-300 dark:hover:border-gray-600"
                  max={dateRange.end}
                />
              </div>
              <span className="text-gray-400 font-medium">to</span>
              <div className="relative">
                <input
                  type="date"
                  value={dateRange.end}
                  onChange={(e) =>
                    setDateRange({ ...dateRange, end: e.target.value })
                  }
                  className="px-3 py-3 rounded-xl border-2 border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm font-medium text-gray-900 dark:text-white focus:ring-2 focus:ring-green-500/30 focus:border-green-500 outline-none transition-all hover:border-gray-300 dark:hover:border-gray-600"
                  min={dateRange.start}
                />
              </div>
            </div>

            <div className="w-full sm:w-48">
              <select
                name="party_filter"
                id="party_filter"
                value={partyFilter}
                onChange={(e) => setPartyFilter(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm font-medium text-gray-900 dark:text-white focus:ring-2 focus:ring-green-500/30 focus:border-green-500 outline-none transition-all hover:border-gray-300 dark:hover:border-gray-600"
              >
                <option value="">All Parties</option>
                {parties
                  .filter((p) => p.is_active)
                  .map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
              </select>
            </div>

            <div className="w-full sm:w-48">
              <select
                name="item_filter"
                id="item_filter"
                value={itemFilter}
                onChange={(e) => setItemFilter(e.target.value)}
                disabled={!partyFilter}
                className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm font-medium text-gray-900 dark:text-white focus:ring-2 focus:ring-green-500/30 focus:border-green-500 outline-none transition-all hover:border-gray-300 dark:hover:border-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <option value="">All Items</option>
                {filteredItems
                  .filter((item) => item.is_active)
                  .map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.name}
                    </option>
                  ))}
              </select>
            </div>

            <div className="w-full sm:w-48">
              <select
                name="delivery_status_filter"
                id="delivery_status_filter"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm font-medium text-gray-900 dark:text-white focus:ring-2 focus:ring-green-500/30 focus:border-green-500 outline-none transition-all hover:border-gray-300 dark:hover:border-gray-600"
              >
                <option value="">All Status</option>
                <option value="draft">Draft</option>
                <option value="sent">Sent</option>
                <option value="delivered">Delivered</option>
              </select>
            </div>

            {/* Print Selected Button */}
            {selectedChallans.size > 0 && (
              <div className="w-full sm:w-auto">
                <button
                  onClick={handleBulkPrint}
                  className="w-full sm:w-auto flex items-center justify-center gap-2 bg-white dark:bg-gray-900 border-2 border-blue-100 dark:border-blue-900/50 hover:border-blue-500 dark:hover:border-blue-500 text-blue-600 dark:text-blue-400 px-4 py-3 rounded-xl font-semibold transition-all duration-300 shadow-sm hover:shadow-md animate-fade-in whitespace-nowrap"
                >
                  <Printer size={18} />
                  <span>Print ({selectedChallans.size})</span>
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto max-h-[calc(100vh-420px)] overflow-y-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-gradient-to-r from-gray-100 to-gray-50 dark:from-gray-700 dark:to-gray-700/80 text-gray-600 dark:text-gray-300 uppercase tracking-wider text-xs font-bold sticky top-0 z-10 backdrop-blur-sm shadow-md">
              <tr>
                <th className="px-6 py-4 whitespace-nowrap w-4">
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      className="w-4 h-4 text-green-600 bg-gray-100 border-gray-300 rounded focus:ring-green-500 dark:focus:ring-green-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600 transition-all cursor-pointer"
                      checked={
                        paginatedChallans.length > 0 &&
                        selectedChallans.size === paginatedChallans.length
                      }
                      onChange={toggleSelectAll}
                    />
                  </div>
                </th>
                <th className="px-6 py-4 whitespace-nowrap">Challan No.</th>
                <th className="px-6 py-4 whitespace-nowrap">Date</th>
                <th className="px-6 py-4 whitespace-nowrap">Party</th>
                <th className="px-6 py-4 whitespace-nowrap">Vehicle No.</th>
                <th className="px-6 py-4 whitespace-nowrap">Items</th>
                <th className="px-6 py-4 whitespace-nowrap">Status</th>
                <th className="px-6 py-4 whitespace-nowrap">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700/50">
              {loading ? (
                <tr>
                  <td
                    colSpan="8"
                    className="px-6 py-12 text-center text-gray-500"
                  >
                    <div className="flex flex-col items-center gap-3">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
                      <span className="text-sm font-medium">
                        Loading challans...
                      </span>
                    </div>
                  </td>
                </tr>
              ) : paginatedChallans.length === 0 ? (
                <tr>
                  <td
                    colSpan="8"
                    className="px-6 py-12 text-center text-gray-500"
                  >
                    <div className="flex flex-col items-center gap-2">
                      <Truck
                        className="text-gray-300 dark:text-gray-600"
                        size={48}
                      />
                      <span className="text-sm font-medium">
                        No challans found.
                      </span>
                      <span className="text-xs text-gray-400">
                        Try adjusting your search or filters
                      </span>
                    </div>
                  </td>
                </tr>
              ) : (
                paginatedChallans.map((challan, index) => (
                  <ChallanRow
                    key={challan.id}
                    challan={challan}
                    index={index}
                    onEdit={() => {
                      setEditingChallan(challan);
                      setShowAddModal(true);
                    }}
                    onEditPDI={(c) => {
                      setSelectedPDIChallan(c);
                      setShowPDIModal(true);
                    }}
                    onDelete={() => handleDelete(challan)}
                    onPrint={() => handlePrint(challan)}
                    onWhatsApp={() => handleWhatsAppShare(challan)}
                    hasWhatsAppFeature={hasFeature("WHATSAPP_SHARE")}
                    getStatusColor={getStatusColor}
                    selected={selectedChallans.has(challan.id)}
                    onSelect={() => toggleSelect(challan.id)}
                  />
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {filteredChallans.length > 0 && (
          <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 flex flex-col sm:flex-row items-center justify-between gap-4 bg-gradient-to-r from-gray-50 to-white dark:from-gray-800/50 dark:to-gray-800">
            <div className="flex items-center gap-4">
              <span className="text-sm text-gray-600 dark:text-gray-400">
                Showing{" "}
                <span className="font-bold text-green-600 dark:text-green-400">
                  {startIndex + 1}
                </span>{" "}
                to{" "}
                <span className="font-bold text-green-600 dark:text-green-400">
                  {Math.min(endIndex, filteredChallans.length)}
                </span>{" "}
                of{" "}
                <span className="font-bold text-gray-900 dark:text-white">
                  {filteredChallans.length}
                </span>{" "}
                challans
              </span>
              <select
                name="delivery_challans_per_page"
                id="delivery_challans_per_page"
                value={challansPerPage}
                onChange={(e) => {
                  setChallansPerPage(Number(e.target.value));
                  setCurrentPage(1);
                }}
                className="px-4 py-2 rounded-lg border-2 border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm font-medium text-gray-900 dark:text-white focus:ring-2 focus:ring-green-500/30 focus:border-green-500 outline-none transition-all hover:border-gray-300 dark:hover:border-gray-600"
              >
                <option value={10}>10 per page</option>
                <option value={25}>25 per page</option>
                <option value={50}>50 per page</option>
                <option value={100}>100 per page</option>
              </select>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setCurrentPage(currentPage - 1)}
                disabled={currentPage === 1}
                className="p-2.5 rounded-lg border-2 border-gray-200 dark:border-gray-700 hover:bg-green-50 dark:hover:bg-green-900/20 hover:border-green-300 dark:hover:border-green-700 disabled:opacity-40 disabled:cursor-not-allowed transition-all duration-200"
              >
                <ChevronLeft
                  size={18}
                  className="text-gray-600 dark:text-gray-400"
                />
              </button>
              <div className="flex items-center gap-1">
                {Array.from({ length: totalPages }, (_, i) => i + 1)
                  .filter((page) => {
                    if (totalPages <= 7) return true;
                    if (page === 1 || page === totalPages) return true;
                    if (page >= currentPage - 1 && page <= currentPage + 1)
                      return true;
                    return false;
                  })
                  .map((page, index, array) => (
                    <Fragment key={page}>
                      {index > 0 && array[index - 1] !== page - 1 && (
                        <span
                          key={`ellipsis-${page}`}
                          className="px-2 text-gray-400 font-bold"
                        >
                          ...
                        </span>
                      )}
                      <button
                        key={page}
                        onClick={() => setCurrentPage(page)}
                        className={`min-w-[40px] h-10 px-3 rounded-lg font-bold text-sm transition-all duration-200 ${
                          currentPage === page
                            ? "bg-gradient-to-r from-green-600 to-emerald-700 text-white shadow-lg shadow-green-500/40 scale-110"
                            : "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 hover:scale-105"
                        }`}
                      >
                        {page}
                      </button>
                    </Fragment>
                  ))}
              </div>
              <button
                onClick={() => setCurrentPage(currentPage + 1)}
                disabled={currentPage === totalPages}
                className="p-2.5 rounded-lg border-2 border-gray-200 dark:border-gray-700 hover:bg-green-50 dark:hover:bg-green-900/20 hover:border-green-300 dark:hover:border-green-700 disabled:opacity-40 disabled:cursor-not-allowed transition-all duration-200"
              >
                <ChevronRight
                  size={18}
                  className="text-gray-600 dark:text-gray-400"
                />
              </button>
            </div>
          </div>
        )}
      </div>

      <AddDeliveryChallanModal
        open={showAddModal}
        deliveryChallan={editingChallan}
        onClose={() => {
          setShowAddModal(false);
          setEditingChallan(null);
        }}
        onSuccess={loadChallans}
      />

      <ConfirmDialog
        open={deleteConfirm.open}
        title="Delete Delivery Challan"
        message={`Are you sure you want to delete delivery challan ${deleteConfirm.challan?.challan_number}? This action cannot be undone.`}
        confirmLabel="Delete"
        type="danger"
        onConfirm={confirmDelete}
        onCancel={() => setDeleteConfirm({ open: false, challan: null })}
      />

      <Suspense
        fallback={
          <LoadingSpinner fullScreen={false} text="Loading PDF Engine..." />
        }
      >
        <PdfPreviewModal
          isOpen={previewOpen}
          onClose={handleClosePreview}
          pdfUrl={previewUrl}
          title={previewTitle}
        />
      </Suspense>

      <PDIReportModal
        isOpen={showPDIModal}
        onClose={() => {
          setShowPDIModal(false);
          setSelectedPDIChallan(null);
        }}
        challan={selectedPDIChallan}
      />
    </div>
  );
}

function ChallanRow({
  challan,
  index,
  onEdit,
  onEditPDI,
  onDelete,
  onPrint,
  onWhatsApp,
  hasWhatsAppFeature,
  getStatusColor,
  selected,
  onSelect,
}) {
  return (
    <tr
      className={`group transition-all duration-300 hover:shadow-[inset_4px_0_0_0_rgb(34,197,94)] ${
        selected
          ? "bg-green-50/80 dark:bg-green-900/20"
          : "hover:bg-gradient-to-r hover:from-green-50/50 hover:to-emerald-50/30 dark:hover:from-green-900/10 dark:hover:to-emerald-900/10"
      }`}
      style={{
        animation: `fadeInUp 0.4s ease-out ${index * 0.05}s both`,
      }}
    >
      <td className="px-6 py-5">
        <div className="flex items-center">
          <input
            type="checkbox"
            className="w-4 h-4 text-green-600 bg-gray-100 border-gray-300 rounded focus:ring-green-500 dark:focus:ring-green-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600 transition-all cursor-pointer opacity-70 group-hover:opacity-100"
            checked={selected}
            onChange={onSelect}
          />
        </div>
      </td>
      <td className="px-6 py-5">
        <div className="flex items-center gap-2">
          <div className="p-1.5 bg-green-50 dark:bg-green-900/30 rounded-md">
            <FileText
              size={16}
              className="text-green-600 dark:text-green-400"
            />
          </div>
          <span className="font-bold text-gray-900 dark:text-white text-base group-hover:text-green-600 dark:group-hover:text-green-400 transition-colors duration-200">
            {challan.challan_number}
          </span>
        </div>
      </td>
      <td className="px-6 py-5">
        <div className="flex items-center gap-2">
          <div className="p-1.5 bg-blue-50 dark:bg-blue-900/30 rounded-md">
            <Calendar size={14} className="text-blue-600 dark:text-blue-400" />
          </div>
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
            {formatDate(challan.challan_date)}
          </span>
        </div>
      </td>
      <td className="px-6 py-5">
        <div className="flex items-center gap-2">
          <div className="p-1.5 bg-purple-50 dark:bg-purple-900/30 rounded-md">
            <Building2
              size={14}
              className="text-purple-600 dark:text-purple-400"
            />
          </div>
          <span className="font-semibold text-gray-900 dark:text-white">
            {challan.party?.name || "N/A"}
          </span>
        </div>
      </td>
      <td className="px-6 py-5">
        <div className="flex items-center gap-2">
          <div className="p-1.5 bg-amber-50 dark:bg-amber-900/30 rounded-md">
            <Truck size={14} className="text-amber-600 dark:text-amber-400" />
          </div>
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300 uppercase">
            {challan.vehicle_number || "-"}
          </span>
        </div>
      </td>
      <td className="px-6 py-5">
        <div className="flex items-center gap-2">
          <div className="p-1.5 bg-indigo-50 dark:bg-indigo-900/30 rounded-md">
            <Package
              size={14}
              className="text-indigo-600 dark:text-indigo-400"
            />
          </div>
          <span
            className="text-sm font-semibold text-gray-700 dark:text-gray-300 line-clamp-2"
            title={(() => {
              if (!challan.items?.length) return "No Items";
              const aggregated = challan.items.reduce((acc, i) => {
                const name = i.item?.name || "Unknown";
                acc[name] = (acc[name] || 0) + (Number(i.quantity) || 0);
                return acc;
              }, {});
              return Object.entries(aggregated)
                .map(([name, qty]) => `${name} (${qty} units)`)
                .join(", ");
            })()}
          >
            {(() => {
              if (!challan.items?.length) return "No Items";
              const aggregated = challan.items.reduce((acc, i) => {
                const name = i.item?.name || "Unknown";
                acc[name] = (acc[name] || 0) + (Number(i.quantity) || 0);
                return acc;
              }, {});

              return Object.entries(aggregated).map(
                ([name, qty], index, arr) => (
                  <span key={name}>
                    {name}{" "}
                    <span className="text-gray-400 font-normal">
                      ({qty} units)
                    </span>
                    {index < arr.length - 1 && ", "}
                  </span>
                ),
              );
            })()}
          </span>
        </div>
      </td>
      <td className="px-6 py-5">
        <span
          className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold shadow-sm ${getStatusColor(
            challan.status,
          )}`}
        >
          <span
            className={`w-2 h-2 rounded-full animate-pulse ${
              challan.status === "delivered"
                ? "bg-green-500 shadow-lg shadow-green-500/50"
                : challan.status === "sent"
                  ? "bg-blue-500 shadow-lg shadow-blue-500/50"
                  : "bg-gray-500 shadow-lg shadow-gray-500/50"
            }`}
          ></span>
          {challan.status.charAt(0).toUpperCase() + challan.status.slice(1)}
        </span>
      </td>
      <td className="px-6 py-5">
        <div className="flex items-center justify-end gap-2">
          {/* PDI Report Button */}
          <button
            onClick={() => {
              onEditPDI(challan);
            }}
            className="p-2 rounded-lg bg-orange-50 hover:bg-orange-100 dark:bg-orange-900/30 dark:hover:bg-orange-900/50 text-orange-600 dark:text-orange-400 transition-all duration-200 hover:scale-110 shadow-sm hover:shadow-md"
            title="PDI Report"
          >
            <ClipboardCheck size={16} />
          </button>

          <button
            onClick={onPrint}
            className="p-2 rounded-lg bg-blue-50 hover:bg-blue-100 dark:bg-blue-900/30 dark:hover:bg-blue-900/50 text-blue-600 dark:text-blue-400 transition-all duration-200 hover:scale-110 shadow-sm hover:shadow-md"
            title="Print PDF"
          >
            <Printer size={16} />
          </button>

          {/* WhatsApp Share Button */}
          {hasWhatsAppFeature && (
            <button
              onClick={onWhatsApp}
              className="p-2 rounded-lg bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-900/30 dark:hover:bg-emerald-900/50 text-emerald-600 dark:text-emerald-400 transition-all duration-200 hover:scale-110 shadow-sm hover:shadow-md"
              title="Share via WhatsApp"
            >
              <MessageCircle size={16} />
            </button>
          )}

          {/* Edit Button */}
          <button
            onClick={onEdit}
            className="p-2 rounded-lg bg-green-50 hover:bg-green-100 dark:bg-green-900/30 dark:hover:bg-green-900/50 text-green-600 dark:text-green-400 transition-all duration-200 hover:scale-110 shadow-sm hover:shadow-md"
            title="Edit Challan"
          >
            <Edit size={16} />
          </button>

          {/* Delete Button */}
          <button
            onClick={onDelete}
            className="p-2 rounded-lg bg-red-50 hover:bg-red-100 dark:bg-red-900/30 dark:hover:bg-red-900/50 text-red-600 dark:text-red-400 transition-all duration-200 hover:scale-110 shadow-sm hover:shadow-md"
            title="Delete Challan"
          >
            <Trash2 size={16} />
          </button>
        </div>
      </td>
    </tr>
  );
}

function StatCard({ label, value, icon: Icon, color, subtext }) {
  const colors = {
    blue: {
      bg: "bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/30 dark:to-blue-800/20",
      iconBg: "bg-gradient-to-br from-blue-500 to-blue-600",
      text: "text-blue-600 dark:text-blue-400",
      shadow: "shadow-blue-500/20 dark:shadow-blue-500/10",
      hoverShadow: "hover:shadow-blue-500/30 dark:hover:shadow-blue-500/20",
    },
    green: {
      bg: "bg-gradient-to-br from-green-50 to-emerald-100 dark:from-green-900/30 dark:to-emerald-800/20",
      iconBg: "bg-gradient-to-br from-green-500 to-emerald-600",
      text: "text-green-600 dark:text-green-400",
      shadow: "shadow-green-500/20 dark:shadow-green-500/10",
      hoverShadow: "hover:shadow-green-500/30 dark:hover:shadow-green-500/20",
    },
    purple: {
      bg: "bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/30 dark:to-purple-800/20",
      iconBg: "bg-gradient-to-br from-purple-500 to-purple-600",
      text: "text-purple-600 dark:text-purple-400",
      shadow: "shadow-purple-500/20 dark:shadow-purple-500/10",
      hoverShadow: "hover:shadow-purple-500/30 dark:hover:shadow-purple-500/20",
    },
  };

  const colorScheme = colors[color];

  return (
    <div
      className={`group relative ${colorScheme.bg} p-4 sm:p-6 rounded-2xl shadow-lg ${colorScheme.shadow} ${colorScheme.hoverShadow} border border-gray-200 dark:border-gray-700 transition-all duration-300 hover:scale-105 hover:-translate-y-1 overflow-hidden`}
    >
      <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 dark:bg-black/10 rounded-full -mr-16 -mt-16 group-hover:scale-150 transition-transform duration-500"></div>

      <div className="relative flex items-center gap-3 sm:gap-4">
        <div
          className={`p-3 sm:p-4 rounded-xl ${colorScheme.iconBg} shadow-lg group-hover:scale-110 group-hover:rotate-6 transition-all duration-300`}
        >
          <Icon size={24} className="text-white sm:w-7 sm:h-7" />
        </div>
        <div className="flex-1">
          <h3
            className={`text-2xl sm:text-3xl font-bold ${colorScheme.text} tabular-nums group-hover:scale-105 transition-transform duration-300 origin-left`}
          >
            {value}
          </h3>
          <p className="text-[10px] sm:text-xs text-gray-600 dark:text-gray-400 font-semibold uppercase tracking-wider mt-1">
            {label}
          </p>
          {subtext && (
            <p className="text-[10px] sm:text-xs text-gray-500 dark:text-gray-500 font-medium mt-1">
              {subtext}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

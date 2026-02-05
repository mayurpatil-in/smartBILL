import { useEffect, useState, Fragment } from "react";
import {
  Plus,
  Search,
  Package,
  FileText,
  Tag,
  Edit,
  Trash2,
  Power,
  Building2,
  Cog,
  Weight,
  ChevronLeft,
  ChevronRight,
  TrendingUp,
  IndianRupee,
  Boxes,
  Printer,
} from "lucide-react";
import toast from "react-hot-toast";
import {
  getItems,
  deleteItem,
  updateItem,
  printItemBarcode,
} from "../api/items";
import { getParties } from "../api/parties";
import AddItemModal from "../components/AddItemModal";
import ConfirmDialog from "../components/ConfirmDialog";
import useBarcodeScanner from "../hooks/useBarcodeScanner";

export default function Items() {
  const [items, setItems] = useState([]);
  const [parties, setParties] = useState([]);
  const [selectedParty, setSelectedParty] = useState("");
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [deleteConfirm, setDeleteConfirm] = useState({
    open: false,
    item: null,
  });
  const [printModal, setPrintModal] = useState({
    open: false,
    item: null,
    count: 1,
    format: "thermal",
  });

  const loadItems = async () => {
    try {
      setLoading(true);
      const [itemsData, partiesData] = await Promise.all([
        getItems(),
        getParties(),
      ]);
      setItems(itemsData);
      setParties(partiesData);
    } catch (err) {
      console.error("Failed to load data", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadItems();
  }, []);

  useBarcodeScanner({
    onScan: (code) => {
      setSearchTerm(code);
      toast.success(`Filtered by barcode: ${code}`);
    },
  });

  const handleToggleStatus = async (item) => {
    try {
      await updateItem(item.id, { ...item, is_active: !item.is_active });
      toast.success(`Item ${item.is_active ? "deactivated" : "activated"}`);
      loadItems();
    } catch (err) {
      toast.error("Failed to update status");
    }
  };

  const handleDelete = async () => {
    try {
      await deleteItem(deleteConfirm.item.id);
      toast.success("Item deleted successfully");
      setDeleteConfirm({ open: false, item: null });
      loadItems();
    } catch (err) {
      toast.error(err.response?.data?.detail || "Failed to delete item");
    }
  };

  const handlePrintClick = (item) => {
    setPrintModal({
      open: true,
      item: item,
      count: 1,
      format: "thermal",
    });
  };

  const handleConfirmPrint = async () => {
    try {
      if (!printModal.item) return;

      const blob = await printItemBarcode(
        printModal.item.id,
        printModal.count,
        printModal.format,
      );
      const url = window.URL.createObjectURL(blob);

      // Auto-print
      const iframe = document.createElement("iframe");
      iframe.style.display = "none";
      iframe.src = url;
      document.body.appendChild(iframe);
      iframe.contentWindow.onload = function () {
        iframe.contentWindow.print();
        // Cleanup after a delay to ensure print dialog opened
        setTimeout(() => {
          document.body.removeChild(iframe);
          window.URL.revokeObjectURL(url);
        }, 60000);
      };

      toast.success(`Printing ${printModal.count} barcode(s)...`);
      setPrintModal({ open: false, item: null, count: 1 });
    } catch (err) {
      toast.error(err.response?.data?.detail || "Failed to print barcode");
    }
  };

  const filteredItems = items
    .filter((i) => {
      const matchesSearch =
        i.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (i.barcode &&
          i.barcode.toLowerCase().includes(searchTerm.toLowerCase()));
      const matchesParty = selectedParty
        ? i.party_id === Number(selectedParty)
        : true;
      return matchesSearch && matchesParty;
    })
    .sort((a, b) => b.id - a.id); // Sort in descending order (newest first)

  // Pagination logic
  const totalPages = Math.ceil(filteredItems.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedItems = filteredItems.slice(startIndex, endIndex);

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, selectedParty]);

  // Calculate stats based on filtered items (updates when party is selected)
  const totalItems = filteredItems.length;
  const activeItems = filteredItems.filter((i) => i.is_active).length;
  const totalValue = filteredItems.reduce(
    (sum, item) => sum + Number(item.rate) * Number(item.casting_weight),
    0,
  );

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-gray-900 to-gray-600 dark:from-white dark:to-gray-300 bg-clip-text text-transparent">
            Stock / Items
          </h1>
          <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 mt-1">
            Manage your product inventory efficiently
          </p>
        </div>
        <button
          onClick={() => {
            setEditingItem(null);
            setShowAddModal(true);
          }}
          className="group flex items-center justify-center gap-2 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white px-4 sm:px-6 py-2.5 sm:py-3 rounded-xl font-semibold transition-all duration-300 shadow-lg shadow-blue-600/30 hover:shadow-xl hover:shadow-blue-600/40 hover:scale-105 text-sm sm:text-base w-full md:w-auto"
        >
          <Plus
            size={18}
            className="group-hover:rotate-90 transition-transform duration-300 sm:w-5 sm:h-5"
          />
          Add Item
        </button>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <StatCard
          label="Total Items"
          value={totalItems}
          icon={Boxes}
          color="blue"
        />
        <StatCard
          label="Active Items"
          value={activeItems}
          icon={Package}
          color="green"
        />
        <StatCard
          label="Total Value"
          value={`₹${totalValue.toLocaleString("en-IN", {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          })}`}
          icon={IndianRupee}
          color="purple"
        />
      </div>

      {/* Content */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-200 dark:border-gray-700 overflow-hidden backdrop-blur-sm">
        {/* Search & Filters */}
        <div className="p-5 border-b border-gray-200 dark:border-gray-700 bg-gradient-to-r from-gray-50 to-white dark:from-gray-800 dark:to-gray-800/50">
          <div className="flex flex-col sm:flex-row items-center gap-3">
            <div className="relative group flex-1 w-full">
              <div className="absolute inset-0 bg-gradient-to-r from-blue-500/10 to-purple-500/10 rounded-xl opacity-0 group-focus-within:opacity-100 transition-opacity duration-300"></div>
              <div className="relative flex items-center gap-3 bg-white dark:bg-gray-900/80 rounded-xl px-5 py-3 border-2 border-gray-200 dark:border-gray-700 focus-within:border-blue-500 dark:focus-within:border-blue-500 transition-all duration-300 shadow-sm hover:shadow-md">
                <Search
                  className="text-gray-400 group-focus-within:text-blue-500 transition-colors duration-300"
                  size={20}
                />
                <input
                  type="text"
                  name="item_search"
                  id="item_search"
                  placeholder="Search items by name..."
                  className="flex-1 bg-transparent border-none focus:ring-0 text-sm text-gray-900 dark:text-white placeholder-gray-400 outline-none"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
                {searchTerm && (
                  <span className="text-xs font-medium text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30 px-2 py-1 rounded-md">
                    {filteredItems.length} found
                  </span>
                )}
              </div>
            </div>

            <div className="w-full sm:w-64">
              <select
                name="party_filter"
                id="party_filter"
                value={selectedParty}
                onChange={(e) => setSelectedParty(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm font-medium text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 outline-none transition-all hover:border-gray-300 dark:hover:border-gray-600"
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
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto max-h-[calc(100vh-400px)] overflow-y-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-gradient-to-r from-gray-100 to-gray-50 dark:from-gray-700 dark:to-gray-700/80 text-gray-600 dark:text-gray-300 uppercase tracking-wider text-xs font-bold sticky top-0 z-10 backdrop-blur-sm shadow-md">
              <tr>
                <th className="px-6 py-4 whitespace-nowrap">Item Name</th>
                <th className="px-6 py-4 whitespace-nowrap">Barcode</th>
                <th className="px-6 py-4 whitespace-nowrap">Status</th>
                <th className="px-6 py-4 whitespace-nowrap">Party</th>
                <th className="px-6 py-4 whitespace-nowrap">Process</th>
                <th className="px-6 py-4 whitespace-nowrap">P.O No</th>
                <th className="px-6 py-4 whitespace-nowrap">Cast Wt.</th>
                <th className="px-6 py-4 whitespace-nowrap">Scrap Wt.</th>
                <th className="px-6 py-4 whitespace-nowrap">Rate</th>
                <th className="px-6 py-4 whitespace-nowrap">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700/50">
              {loading ? (
                <tr>
                  <td
                    colSpan="9"
                    className="px-6 py-12 text-center text-gray-500"
                  >
                    <div className="flex flex-col items-center gap-3">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                      <span className="text-sm font-medium">
                        Loading items...
                      </span>
                    </div>
                  </td>
                </tr>
              ) : filteredItems.length === 0 ? (
                <tr>
                  <td
                    colSpan="9"
                    className="px-6 py-12 text-center text-gray-500"
                  >
                    <div className="flex flex-col items-center gap-2">
                      <Package
                        className="text-gray-300 dark:text-gray-600"
                        size={48}
                      />
                      <span className="text-sm font-medium">
                        No items found.
                      </span>
                      <span className="text-xs text-gray-400">
                        Try adjusting your search or filters
                      </span>
                    </div>
                  </td>
                </tr>
              ) : (
                paginatedItems.map((item, index) => (
                  <ItemRow
                    key={item.id}
                    item={item}
                    index={index}
                    onEdit={() => {
                      setEditingItem(item);
                      setShowAddModal(true);
                    }}
                    onDelete={() => setDeleteConfirm({ open: true, item })}
                    onToggleStatus={() => handleToggleStatus(item)}
                    handlePrintBarcode={handlePrintClick}
                  />
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {filteredItems.length > 0 && (
          <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 flex flex-col sm:flex-row items-center justify-between gap-4 bg-gradient-to-r from-gray-50 to-white dark:from-gray-800/50 dark:to-gray-800">
            <div className="flex items-center gap-4">
              <span className="text-sm text-gray-600 dark:text-gray-400">
                Showing{" "}
                <span className="font-bold text-blue-600 dark:text-blue-400">
                  {startIndex + 1}
                </span>{" "}
                to{" "}
                <span className="font-bold text-blue-600 dark:text-blue-400">
                  {Math.min(endIndex, filteredItems.length)}
                </span>{" "}
                of{" "}
                <span className="font-bold text-gray-900 dark:text-white">
                  {filteredItems.length}
                </span>{" "}
                items
              </span>
              <select
                name="items_per_page"
                id="items_per_page"
                value={itemsPerPage}
                onChange={(e) => {
                  setItemsPerPage(Number(e.target.value));
                  setCurrentPage(1);
                }}
                className="px-4 py-2 rounded-lg border-2 border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm font-medium text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 outline-none transition-all hover:border-gray-300 dark:hover:border-gray-600"
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
                className="p-2.5 rounded-lg border-2 border-gray-200 dark:border-gray-700 hover:bg-blue-50 dark:hover:bg-blue-900/20 hover:border-blue-300 dark:hover:border-blue-700 disabled:opacity-40 disabled:cursor-not-allowed transition-all duration-200"
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
                            ? "bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-lg shadow-blue-500/40 scale-110"
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
                className="p-2.5 rounded-lg border-2 border-gray-200 dark:border-gray-700 hover:bg-blue-50 dark:hover:bg-blue-900/20 hover:border-blue-300 dark:hover:border-blue-700 disabled:opacity-40 disabled:cursor-not-allowed transition-all duration-200"
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

      <AddItemModal
        open={showAddModal}
        item={editingItem}
        onClose={() => {
          setShowAddModal(false);
          setEditingItem(null);
        }}
        onSuccess={loadItems}
      />

      <ConfirmDialog
        open={deleteConfirm.open}
        title="Delete Item"
        message={`Are you sure you want to delete "${deleteConfirm.item?.name}"? This action cannot be undone.`}
        confirmLabel="Delete"
        type="danger"
        onConfirm={handleDelete}
        onCancel={() => setDeleteConfirm({ open: false, item: null })}
      />

      {/* Print Barcode Modal */}
      {printModal.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl w-full max-w-md p-6 border border-gray-200 dark:border-gray-700 transform transition-all scale-100">
            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
              Print Barcodes
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
              Configure print settings for{" "}
              <span className="font-semibold text-gray-900 dark:text-white">
                {printModal.item?.name}
              </span>
            </p>

            <div className="space-y-6">
              {/* Count Input */}
              <div>
                <label
                  htmlFor="print_count"
                  className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
                >
                  Number of Copies
                </label>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() =>
                      setPrintModal((p) => ({
                        ...p,
                        count: Math.max(1, p.count - 1),
                      }))
                    }
                    className="p-2 rounded-lg border border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700"
                  >
                    <ChevronLeft size={16} />
                  </button>
                  <input
                    type="number"
                    id="print_count"
                    min="1"
                    max="100"
                    value={printModal.count}
                    onChange={(e) =>
                      setPrintModal((p) => ({
                        ...p,
                        count: Math.max(1, parseInt(e.target.value) || 1),
                      }))
                    }
                    className="w-20 text-center px-3 py-2 rounded-lg border-2 border-gray-200 dark:border-gray-700 bg-transparent font-bold focus:border-blue-500 outline-none"
                  />
                  <button
                    onClick={() =>
                      setPrintModal((p) => ({ ...p, count: p.count + 1 }))
                    }
                    className="p-2 rounded-lg border border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700"
                  >
                    <ChevronRight size={16} />
                  </button>
                </div>
              </div>

              {/* Format Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Paper Size
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <div
                    onClick={() =>
                      setPrintModal((p) => ({ ...p, format: "thermal" }))
                    }
                    className={`cursor-pointer p-3 rounded-xl border-2 transition-all ${
                      printModal.format === "thermal"
                        ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20"
                        : "border-gray-200 dark:border-gray-700 hover:border-blue-300"
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <div
                        className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                          printModal.format === "thermal"
                            ? "border-blue-500"
                            : "border-gray-400"
                        }`}
                      >
                        {printModal.format === "thermal" && (
                          <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                        )}
                      </div>
                      <span
                        className={`font-semibold text-sm ${
                          printModal.format === "thermal"
                            ? "text-blue-700 dark:text-blue-300"
                            : "text-gray-700 dark:text-gray-300"
                        }`}
                      >
                        Thermal Roll
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 ml-6">
                      50mm x 25mm labels
                    </p>
                  </div>

                  <div
                    onClick={() =>
                      setPrintModal((p) => ({ ...p, format: "a4" }))
                    }
                    className={`cursor-pointer p-3 rounded-xl border-2 transition-all ${
                      printModal.format === "a4"
                        ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20"
                        : "border-gray-200 dark:border-gray-700 hover:border-blue-300"
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <div
                        className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                          printModal.format === "a4"
                            ? "border-blue-500"
                            : "border-gray-400"
                        }`}
                      >
                        {printModal.format === "a4" && (
                          <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                        )}
                      </div>
                      <span
                        className={`font-semibold text-sm ${
                          printModal.format === "a4"
                            ? "text-blue-700 dark:text-blue-300"
                            : "text-gray-700 dark:text-gray-300"
                        }`}
                      >
                        A4 Sheet
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 ml-6">
                      Grid layout on A4
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-8">
              <button
                onClick={() =>
                  setPrintModal({
                    open: false,
                    item: null,
                    count: 1,
                    format: "thermal",
                  })
                }
                className="px-4 py-2 rounded-xl text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 font-medium transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmPrint}
                className="px-6 py-2 rounded-xl bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-semibold shadow-lg shadow-blue-500/30 hover:shadow-xl hover:scale-105 transition-all"
              >
                Print
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function ItemRow({
  item,
  index,
  onEdit,
  onDelete,
  onToggleStatus,
  handlePrintBarcode,
}) {
  return (
    <tr
      className="group hover:bg-gradient-to-r hover:from-blue-50/50 hover:to-purple-50/30 dark:hover:from-blue-900/10 dark:hover:to-purple-900/10 transition-all duration-300 hover:shadow-[inset_4px_0_0_0_rgb(59,130,246)]"
      style={{
        animation: `fadeInUp 0.4s ease-out ${index * 0.05}s both`,
      }}
    >
      <td className="px-6 py-5">
        <div>
          <div className="font-bold text-gray-900 dark:text-white text-base group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors duration-200">
            {item.name}
          </div>
          {item.hsn_code && (
            <div className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1.5 mt-1">
              <Tag size={13} className="text-gray-400" />
              <span>HSN: {item.hsn_code}</span>
            </div>
          )}
        </div>
      </td>
      <td className="px-6 py-5">
        {item.barcode ? (
          <span className="font-mono text-xs font-semibold text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded border border-gray-200 dark:border-gray-700">
            {item.barcode}
          </span>
        ) : (
          <span className="text-gray-400 dark:text-gray-600 text-xs italic">
            —
          </span>
        )}
      </td>
      <td className="px-6 py-5">
        <span
          className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold shadow-sm ${
            item.is_active
              ? "bg-gradient-to-r from-green-100 to-emerald-100 text-green-700 dark:from-green-900/40 dark:to-emerald-900/40 dark:text-green-400 border border-green-300 dark:border-green-700"
              : "bg-gradient-to-r from-red-100 to-rose-100 text-red-700 dark:from-red-900/40 dark:to-rose-900/40 dark:text-red-400 border border-red-300 dark:border-red-700"
          }`}
        >
          <span
            className={`w-2 h-2 rounded-full animate-pulse ${
              item.is_active
                ? "bg-green-500 shadow-lg shadow-green-500/50"
                : "bg-red-500 shadow-lg shadow-red-500/50"
            }`}
          ></span>
          {item.is_active ? "Active" : "Inactive"}
        </span>
      </td>
      <td className="px-6 py-5">
        {item.party_id ? (
          <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-gradient-to-r from-blue-50 to-sky-50 dark:from-blue-900/20 dark:to-sky-900/20 text-blue-700 dark:text-blue-300 text-xs font-semibold border border-blue-200 dark:border-blue-800">
            <Building2 size={14} />
            Linked
          </span>
        ) : (
          <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 text-xs font-medium">
            Global
          </span>
        )}
      </td>
      <td className="px-6 py-5">
        {item.process ? (
          <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 text-purple-700 dark:text-purple-300 text-xs font-semibold border border-purple-200 dark:border-purple-800">
            <Cog size={14} />
            {item.process.name}
          </span>
        ) : (
          <span className="text-gray-400 dark:text-gray-500 text-xs italic">
            No process
          </span>
        )}
      </td>
      <td className="px-6 py-5">
        {item.po_number ? (
          <span className="font-mono text-sm font-semibold text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded">
            {item.po_number}
          </span>
        ) : (
          <span className="text-gray-400 dark:text-gray-500 text-xs italic">
            —
          </span>
        )}
      </td>
      <td className="px-6 py-5">
        <div className="flex items-center gap-2">
          <div className="p-1.5 bg-amber-50 dark:bg-amber-900/30 rounded-md">
            <Weight size={14} className="text-amber-600 dark:text-amber-400" />
          </div>
          <div>
            <span className="font-bold text-sm text-gray-900 dark:text-white">
              {Number(item.casting_weight).toFixed(3)}
            </span>
            <span className="text-xs text-gray-400 ml-1">kg</span>
          </div>
        </div>
      </td>
      <td className="px-6 py-5">
        <div className="flex items-center gap-2">
          <div className="p-1.5 bg-orange-50 dark:bg-orange-900/30 rounded-md">
            <Weight
              size={14}
              className="text-orange-600 dark:text-orange-400"
            />
          </div>
          <div>
            <span className="font-bold text-sm text-gray-900 dark:text-white">
              {Number(item.scrap_weight).toFixed(3)}
            </span>
            <span className="text-xs text-gray-400 ml-1">kg</span>
          </div>
        </div>
      </td>
      <td className="px-6 py-5">
        <div className="flex items-center gap-2">
          <div className="p-1.5 bg-green-50 dark:bg-green-900/30 rounded-md">
            <IndianRupee
              size={14}
              className="text-green-600 dark:text-green-400"
            />
          </div>
          <span className="font-bold text-base text-green-600 dark:text-green-400">
            {Number(item.rate).toLocaleString("en-IN", {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}
          </span>
        </div>
      </td>
      <td className="px-6 py-5">
        <div className="flex items-center justify-end gap-2">
          {/* Print Barcode Button - Only if barcode exists */}
          {item.barcode && (
            <button
              onClick={() => handlePrintBarcode(item)}
              className="p-2 rounded-lg bg-gray-50 hover:bg-gray-100 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-400 transition-all duration-200 hover:scale-110 shadow-sm hover:shadow-md"
              title="Print Barcode"
            >
              <Printer size={16} />
            </button>
          )}

          {/* Edit Button */}
          <button
            onClick={onEdit}
            className="p-2 rounded-lg bg-blue-50 hover:bg-blue-100 dark:bg-blue-900/30 dark:hover:bg-blue-900/50 text-blue-600 dark:text-blue-400 transition-all duration-200 hover:scale-110 shadow-sm hover:shadow-md"
            title="Edit Item"
          >
            <Edit size={16} />
          </button>

          {/* Toggle Status Button */}
          <button
            onClick={onToggleStatus}
            className={`p-2 rounded-lg transition-all duration-200 hover:scale-110 shadow-sm hover:shadow-md ${
              item.is_active
                ? "bg-orange-50 hover:bg-orange-100 dark:bg-orange-900/30 dark:hover:bg-orange-900/50 text-orange-600 dark:text-orange-400"
                : "bg-green-50 hover:bg-green-100 dark:bg-green-900/30 dark:hover:bg-green-900/50 text-green-600 dark:text-green-400"
            }`}
            title={item.is_active ? "Deactivate" : "Activate"}
          >
            <Power size={16} />
          </button>

          {/* Delete Button */}
          <button
            onClick={onDelete}
            className="p-2 rounded-lg bg-red-50 hover:bg-red-100 dark:bg-red-900/30 dark:hover:bg-red-900/50 text-red-600 dark:text-red-400 transition-all duration-200 hover:scale-110 shadow-sm hover:shadow-md"
            title="Delete Item"
          >
            <Trash2 size={16} />
          </button>
        </div>
      </td>
    </tr>
  );
}

function StatCard({ label, value, icon: Icon, color }) {
  const colors = {
    blue: {
      gradient: "from-blue-500 to-blue-600",
      bg: "bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/30 dark:to-blue-800/20",
      iconBg: "bg-gradient-to-br from-blue-500 to-blue-600",
      text: "text-blue-600 dark:text-blue-400",
      shadow: "shadow-blue-500/20 dark:shadow-blue-500/10",
      hoverShadow: "hover:shadow-blue-500/30 dark:hover:shadow-blue-500/20",
    },
    green: {
      gradient: "from-green-500 to-emerald-600",
      bg: "bg-gradient-to-br from-green-50 to-emerald-100 dark:from-green-900/30 dark:to-emerald-800/20",
      iconBg: "bg-gradient-to-br from-green-500 to-emerald-600",
      text: "text-green-600 dark:text-green-400",
      shadow: "shadow-green-500/20 dark:shadow-green-500/10",
      hoverShadow: "hover:shadow-green-500/30 dark:hover:shadow-green-500/20",
    },
    purple: {
      gradient: "from-purple-500 to-pink-600",
      bg: "bg-gradient-to-br from-purple-50 to-pink-100 dark:from-purple-900/30 dark:to-pink-800/20",
      iconBg: "bg-gradient-to-br from-purple-500 to-pink-600",
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
      {/* Background decoration */}
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
        </div>
      </div>
    </div>
  );
}

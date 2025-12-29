import { useEffect, useState, useRef } from "react";
import {
  Plus,
  Search,
  MoreVertical,
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
} from "lucide-react";
import toast from "react-hot-toast";
import { getItems, deleteItem, updateItem } from "../api/items";
import { getParties } from "../api/parties";
import AddItemModal from "../components/AddItemModal";

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

  const handleToggleStatus = async (item) => {
    try {
      await updateItem(item.id, { ...item, is_active: !item.is_active });
      toast.success(`Item ${item.is_active ? "deactivated" : "activated"}`);
      loadItems();
    } catch (err) {
      toast.error("Failed to update status");
    }
  };

  const handleDelete = async (item) => {
    if (!confirm(`Are you sure you want to delete ${item.name}?`)) return;
    try {
      await deleteItem(item.id);
      toast.success("Item deleted successfully");
      loadItems();
    } catch (err) {
      toast.error("Failed to delete item");
    }
  };

  const filteredItems = items.filter((i) => {
    const matchesSearch = i.name
      .toLowerCase()
      .includes(searchTerm.toLowerCase());
    const matchesParty = selectedParty
      ? i.party_id === Number(selectedParty)
      : true;
    return matchesSearch && matchesParty;
  });

  // Pagination logic
  const totalPages = Math.ceil(filteredItems.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedItems = filteredItems.slice(startIndex, endIndex);

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, selectedParty]);

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Stock / Items
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Manage your product inventory
          </p>
        </div>
        <button
          onClick={() => {
            setEditingItem(null);
            setShowAddModal(true);
          }}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-xl font-medium transition-all shadow-lg shadow-blue-600/20"
        >
          <Plus size={20} />
          Add Item
        </button>
      </div>

      {/* Content */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
        {/* Search */}
        <div className="p-4 border-b border-gray-100 dark:border-gray-700 flex flex-col sm:flex-row items-center gap-3">
          <div className="flex-1 flex items-center gap-3 w-full bg-gray-50 dark:bg-gray-900/50 rounded-xl px-4 py-2 border border-gray-100 dark:border-gray-700 focus-within:ring-2 focus-within:ring-blue-500/20 focus-within:border-blue-500 transition-all">
            <Search className="text-gray-400" size={20} />
            <input
              type="text"
              placeholder="Search items by name..."
              className="flex-1 bg-transparent border-none focus:ring-0 text-sm text-gray-900 dark:text-white placeholder-gray-400 outline-none"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <div className="w-full sm:w-64">
            <select
              value={selectedParty}
              onChange={(e) => setSelectedParty(e.target.value)}
              className="w-full px-4 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all"
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

        {/* Table */}
        <div className="overflow-x-auto max-h-[calc(100vh-280px)] overflow-y-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-gray-50 dark:bg-gray-700/95 text-gray-500 uppercase tracking-wider font-semibold sticky top-0 z-10 backdrop-blur-sm shadow-sm">
              <tr>
                <th className="px-6 py-4 whitespace-nowrap">Item Name</th>
                <th className="px-6 py-4 whitespace-nowrap">Status</th>
                <th className="px-6 py-4 whitespace-nowrap">Party</th>
                <th className="px-6 py-4 whitespace-nowrap">Process</th>
                <th className="px-6 py-4 whitespace-nowrap">P.O No</th>
                <th className="px-6 py-4 whitespace-nowrap">Cast Wt.</th>
                <th className="px-6 py-4 whitespace-nowrap">Scrap Wt.</th>
                <th className="px-6 py-4 whitespace-nowrap">Rate</th>
                <th className="px-6 py-4 text-right whitespace-nowrap">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
              {loading ? (
                <tr>
                  <td
                    colSpan="5"
                    className="px-6 py-8 text-center text-gray-500"
                  >
                    Loading items...
                  </td>
                </tr>
              ) : filteredItems.length === 0 ? (
                <tr>
                  <td
                    colSpan="5"
                    className="px-6 py-8 text-center text-gray-500"
                  >
                    No items found.
                  </td>
                </tr>
              ) : (
                paginatedItems.map((item) => (
                  <ItemRow
                    key={item.id}
                    item={item}
                    onEdit={() => {
                      setEditingItem(item);
                      setShowAddModal(true);
                    }}
                    onDelete={() => handleDelete(item)}
                    onToggleStatus={() => handleToggleStatus(item)}
                  />
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {filteredItems.length > 0 && (
          <div className="px-6 py-4 border-t border-gray-100 dark:border-gray-700 flex flex-col sm:flex-row items-center justify-between gap-4 bg-gray-50 dark:bg-gray-800/50">
            <div className="flex items-center gap-4">
              <span className="text-sm text-gray-600 dark:text-gray-400">
                Showing{" "}
                <span className="font-semibold text-gray-900 dark:text-white">
                  {startIndex + 1}
                </span>{" "}
                to{" "}
                <span className="font-semibold text-gray-900 dark:text-white">
                  {Math.min(endIndex, filteredItems.length)}
                </span>{" "}
                of{" "}
                <span className="font-semibold text-gray-900 dark:text-white">
                  {filteredItems.length}
                </span>{" "}
                items
              </span>
              <select
                value={itemsPerPage}
                onChange={(e) => {
                  setItemsPerPage(Number(e.target.value));
                  setCurrentPage(1);
                }}
                className="px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none"
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
                className="p-2 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
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
                    <>
                      {index > 0 && array[index - 1] !== page - 1 && (
                        <span
                          key={`ellipsis-${page}`}
                          className="px-2 text-gray-400"
                        >
                          ...
                        </span>
                      )}
                      <button
                        key={page}
                        onClick={() => setCurrentPage(page)}
                        className={`min-w-[36px] h-9 px-3 rounded-lg font-medium text-sm transition ${
                          currentPage === page
                            ? "bg-blue-600 text-white shadow-md"
                            : "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                        }`}
                      >
                        {page}
                      </button>
                    </>
                  ))}
              </div>
              <button
                onClick={() => setCurrentPage(currentPage + 1)}
                disabled={currentPage === totalPages}
                className="p-2 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
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
    </div>
  );
}

function ItemRow({ item, onEdit, onDelete, onToggleStatus }) {
  const [showMenu, setShowMenu] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(event) {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setShowMenu(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <tr className="group hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
      <td className="px-6 py-4">
        <div>
          <div className="font-semibold text-gray-900 dark:text-white">
            {item.name}
          </div>
          {item.hsn_code && (
            <div className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1 mt-0.5">
              <Tag size={12} />
              HSN: {item.hsn_code}
            </div>
          )}
        </div>
      </td>
      <td className="px-6 py-4">
        <span
          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${
            item.is_active
              ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
              : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
          }`}
        >
          <span
            className={`w-1.5 h-1.5 rounded-full ${
              item.is_active ? "bg-green-500" : "bg-red-500"
            }`}
          ></span>
          {item.is_active ? "Active" : "Inactive"}
        </span>
      </td>
      <td className="px-6 py-4">
        {item.party_id ? (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 text-xs font-medium">
            <Building2 size={12} />
            Linked
          </span>
        ) : (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-gray-50 dark:bg-gray-800 text-gray-500 dark:text-gray-400 text-xs">
            Global
          </span>
        )}
      </td>
      <td className="px-6 py-4">
        {item.process ? (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-purple-50 dark:bg-purple-900/20 text-purple-700 dark:text-purple-300 text-xs font-medium">
            <Cog size={12} />
            {item.process.name}
          </span>
        ) : (
          <span className="text-gray-400 dark:text-gray-500 text-xs italic">
            No process
          </span>
        )}
      </td>
      <td className="px-6 py-4">
        {item.po_number ? (
          <span className="font-mono text-sm text-gray-700 dark:text-gray-300">
            {item.po_number}
          </span>
        ) : (
          <span className="text-gray-400 dark:text-gray-500 text-xs italic">
            —
          </span>
        )}
      </td>
      <td className="px-6 py-4">
        <div className="flex items-center gap-1.5 text-gray-700 dark:text-gray-300">
          <Weight size={14} className="text-gray-400" />
          <span className="font-medium">
            {Number(item.casting_weight).toFixed(3)}
          </span>
          <span className="text-xs text-gray-400">kg</span>
        </div>
      </td>
      <td className="px-6 py-4">
        <div className="flex items-center gap-1.5 text-gray-700 dark:text-gray-300">
          <Weight size={14} className="text-gray-400" />
          <span className="font-medium">
            {Number(item.scrap_weight).toFixed(3)}
          </span>
          <span className="text-xs text-gray-400">kg</span>
        </div>
      </td>
      <td className="px-6 py-4">
        <div className="font-semibold text-gray-900 dark:text-white text-base">
          ₹
          {Number(item.rate).toLocaleString("en-IN", {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          })}
        </div>
      </td>
      <td className="px-6 py-4 text-right relative">
        <button
          onClick={() => setShowMenu(!showMenu)}
          className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition"
        >
          <MoreVertical size={16} />
        </button>

        {showMenu && (
          <div
            ref={menuRef}
            className="absolute right-8 top-8 w-40 bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-100 dark:border-gray-700 z-10 animate-fade-in overflow-hidden"
          >
            <button
              onClick={() => {
                setShowMenu(false);
                onEdit();
              }}
              className="w-full text-left px-4 py-2.5 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center gap-2"
            >
              <Edit size={14} /> Edit
            </button>
            <button
              onClick={() => {
                setShowMenu(false);
                onToggleStatus();
              }}
              className={`w-full text-left px-4 py-2.5 text-sm hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center gap-2 ${
                item.is_active
                  ? "text-orange-600 dark:text-orange-400"
                  : "text-green-600 dark:text-green-400"
              }`}
            >
              <Power size={14} /> {item.is_active ? "Deactivate" : "Activate"}
            </button>
            <hr className="border-gray-100 dark:border-gray-700" />
            <button
              onClick={() => {
                setShowMenu(false);
                onDelete();
              }}
              className="w-full text-left px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center gap-2"
            >
              <Trash2 size={14} /> Delete
            </button>
          </div>
        )}
      </td>
    </tr>
  );
}

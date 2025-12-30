import React, { useEffect, useState, useRef } from "react";
import {
  Plus,
  Search,
  MoreVertical,
  FileText,
  Edit,
  Trash2,
  Calendar,
  Building2,
  Package,
  ChevronLeft,
  ChevronRight,
  TrendingUp,
  Truck,
} from "lucide-react";
import toast from "react-hot-toast";
import { getPartyChallans, deletePartyChallan } from "../api/partyChallans";
import AddPartyChallanModal from "../components/AddPartyChallanModal";
import ConfirmDialog from "../components/ConfirmDialog";
import { useNavigate } from "react-router-dom";

export default function PartyChallans() {
  const [challans, setChallans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingChallan, setEditingChallan] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [challansPerPage, setChallansPerPage] = useState(10);
  const [deleteConfirm, setDeleteConfirm] = useState({
    open: false,
    challan: null,
  });
  const navigate = useNavigate();

  const loadChallans = async () => {
    try {
      setLoading(true);
      const data = await getPartyChallans();
      setChallans(data);
    } catch (err) {
      console.error("Failed to load party challans", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadChallans();
  }, []);

  const handleDelete = async (challan) => {
    setDeleteConfirm({ open: true, challan });
  };

  const confirmDelete = async () => {
    try {
      await deletePartyChallan(deleteConfirm.challan.id);
      toast.success("Party Challan deleted successfully");
      setDeleteConfirm({ open: false, challan: null });
      loadChallans();
    } catch (err) {
      toast.error(
        err.response?.data?.detail || "Failed to delete party challan"
      );
    }
  };

  const filteredChallans = challans
    .filter((c) => {
      const matchesSearch =
        c.challan_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.party?.name?.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStatus = statusFilter ? c.status === statusFilter : true;
      return matchesSearch && matchesStatus;
    })
    .sort((a, b) => b.id - a.id); // Sort by ID descending (newest first)

  // Pagination
  const totalPages = Math.ceil(filteredChallans.length / challansPerPage);
  const startIndex = (currentPage - 1) * challansPerPage;
  const endIndex = startIndex + challansPerPage;
  const paginatedChallans = filteredChallans.slice(startIndex, endIndex);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, statusFilter]);

  const getStatusColor = (status) => {
    switch (status) {
      case "open":
        return "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400";
      case "partial":
        return "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400";
      case "completed":
        return "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400";
      case "cancelled":
        return "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400";
      default:
        return "bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400";
    }
  };

  const calculateProgress = (challan) => {
    if (!challan.items || challan.items.length === 0) return 0;
    const totalOrdered = challan.items.reduce(
      (sum, item) => sum + Number(item.quantity_ordered),
      0
    );
    const totalDelivered = challan.items.reduce(
      (sum, item) => sum + Number(item.quantity_delivered),
      0
    );
    return totalOrdered > 0 ? (totalDelivered / totalOrdered) * 100 : 0;
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Party Challans
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Manage work orders and track deliveries
          </p>
        </div>
        <button
          onClick={() => {
            setEditingChallan(null);
            setShowAddModal(true);
          }}
          className="flex items-center gap-2 bg-purple-600 hover:bg-purple-700 text-white px-5 py-2.5 rounded-xl font-medium transition-all shadow-lg shadow-purple-600/20"
        >
          <Plus size={20} />
          Create Party Challan
        </button>
      </div>

      {/* Content */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
        {/* Search and Filters */}
        <div className="p-4 border-b border-gray-100 dark:border-gray-700 flex flex-col sm:flex-row items-center gap-3">
          <div className="flex-1 flex items-center gap-3 w-full bg-gray-50 dark:bg-gray-900/50 rounded-xl px-4 py-2 border border-gray-100 dark:border-gray-700 focus-within:ring-2 focus-within:ring-purple-500/20 focus-within:border-purple-500 transition-all">
            <Search className="text-gray-400" size={20} />
            <input
              type="text"
              placeholder="Search by challan number or party..."
              className="flex-1 bg-transparent border-none focus:ring-0 text-sm text-gray-900 dark:text-white placeholder-gray-400 outline-none"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <div className="w-full sm:w-48">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full px-4 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 outline-none transition-all"
            >
              <option value="">All Status</option>
              <option value="open">Open</option>
              <option value="partial">Partial</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto h-[calc(100vh-420px)] overflow-y-auto border border-gray-200 dark:border-gray-700 rounded-lg">
          <table className="w-full text-left text-sm">
            <thead className="bg-gray-50 dark:bg-gray-700/95 text-gray-500 uppercase tracking-wider font-semibold sticky top-0 z-10 backdrop-blur-sm shadow-sm">
              <tr>
                <th className="px-6 py-4 whitespace-nowrap">Challan No.</th>
                <th className="px-6 py-4 whitespace-nowrap">Date</th>
                <th className="px-6 py-4 whitespace-nowrap">Party</th>
                <th className="px-6 py-4 whitespace-nowrap">Items</th>
                <th className="px-6 py-4 whitespace-nowrap">Progress</th>
                <th className="px-6 py-4 whitespace-nowrap">Status</th>
                <th className="px-6 py-4 text-right whitespace-nowrap">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
              {loading ? (
                <tr>
                  <td
                    colSpan="7"
                    className="px-6 py-8 text-center text-gray-500"
                  >
                    Loading party challans...
                  </td>
                </tr>
              ) : paginatedChallans.length === 0 ? (
                <tr>
                  <td
                    colSpan="7"
                    className="px-6 py-8 text-center text-gray-500"
                  >
                    No party challans found.
                  </td>
                </tr>
              ) : (
                paginatedChallans.map((challan) => (
                  <PartyChallanRow
                    key={challan.id}
                    challan={challan}
                    onEdit={() => {
                      setEditingChallan(challan);
                      setShowAddModal(true);
                    }}
                    onDelete={() => handleDelete(challan)}
                    onCreateDelivery={() =>
                      navigate("/challans", {
                        state: { partyChallanId: challan.id },
                      })
                    }
                    getStatusColor={getStatusColor}
                    calculateProgress={calculateProgress}
                  />
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {filteredChallans.length > 0 && (
          <div className="px-6 py-4 border-t border-gray-100 dark:border-gray-700 flex flex-col sm:flex-row items-center justify-between gap-4 bg-gray-50 dark:bg-gray-800/50">
            <div className="flex items-center gap-4">
              <span className="text-sm text-gray-600 dark:text-gray-400">
                Showing{" "}
                <span className="font-semibold text-gray-900 dark:text-white">
                  {startIndex + 1}
                </span>{" "}
                to{" "}
                <span className="font-semibold text-gray-900 dark:text-white">
                  {Math.min(endIndex, filteredChallans.length)}
                </span>{" "}
                of{" "}
                <span className="font-semibold text-gray-900 dark:text-white">
                  {filteredChallans.length}
                </span>{" "}
                challans
              </span>
              <select
                value={challansPerPage}
                onChange={(e) => {
                  setChallansPerPage(Number(e.target.value));
                  setCurrentPage(1);
                }}
                className="px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 outline-none"
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
                    <React.Fragment key={page}>
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
                            ? "bg-purple-600 text-white shadow-md"
                            : "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                        }`}
                      >
                        {page}
                      </button>
                    </React.Fragment>
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

      <AddPartyChallanModal
        open={showAddModal}
        partyChallan={editingChallan}
        onClose={() => {
          setShowAddModal(false);
          setEditingChallan(null);
        }}
        onSuccess={loadChallans}
      />

      <ConfirmDialog
        open={deleteConfirm.open}
        title="Delete Party Challan"
        message={`Are you sure you want to delete party challan ${deleteConfirm.challan?.challan_number}? This action cannot be undone.`}
        onConfirm={confirmDelete}
        onCancel={() => setDeleteConfirm({ open: false, challan: null })}
      />
    </div>
  );
}

function PartyChallanRow({
  challan,
  onEdit,
  onDelete,
  onCreateDelivery,
  getStatusColor,
  calculateProgress,
}) {
  const [showMenu, setShowMenu] = useState(false);
  const menuRef = useRef(null);
  const progress = calculateProgress(challan);

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
        <div className="flex items-center gap-2">
          <FileText size={16} className="text-purple-600" />
          <span className="font-semibold text-gray-900 dark:text-white">
            {challan.challan_number}
          </span>
        </div>
      </td>
      <td className="px-6 py-4">
        <div className="flex items-center gap-2 text-gray-600 dark:text-gray-300">
          <Calendar size={14} className="text-gray-400" />
          <span>{new Date(challan.challan_date).toLocaleDateString()}</span>
        </div>
      </td>
      <td className="px-6 py-4">
        <div className="flex items-center gap-2">
          <Building2 size={14} className="text-gray-400" />
          <span className="font-medium text-gray-900 dark:text-white">
            {challan.party?.name || "N/A"}
          </span>
        </div>
      </td>
      <td className="px-6 py-4">
        <div className="flex items-center gap-2 text-gray-600 dark:text-gray-300">
          <Package size={14} className="text-gray-400" />
          <span>{challan.items?.length || 0} items</span>
        </div>
      </td>
      <td className="px-6 py-4">
        <div className="flex items-center gap-2">
          <div className="flex-1 bg-gray-200 dark:bg-gray-700 rounded-full h-2 w-24">
            <div
              className="bg-gradient-to-r from-purple-600 to-blue-600 h-2 rounded-full transition-all"
              style={{ width: `${progress}%` }}
            ></div>
          </div>
          <span className="text-xs font-medium text-gray-600 dark:text-gray-400">
            {progress.toFixed(0)}%
          </span>
        </div>
      </td>
      <td className="px-6 py-4">
        <span
          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${getStatusColor(
            challan.status
          )}`}
        >
          <span
            className={`w-1.5 h-1.5 rounded-full ${
              challan.status === "completed"
                ? "bg-green-500"
                : challan.status === "partial"
                ? "bg-yellow-500"
                : challan.status === "open"
                ? "bg-blue-500"
                : "bg-red-500"
            }`}
          ></span>
          {challan.status.charAt(0).toUpperCase() + challan.status.slice(1)}
        </span>
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
            className="absolute right-8 top-8 w-48 bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-100 dark:border-gray-700 z-10 animate-fade-in overflow-hidden"
          >
            <button
              onClick={() => {
                setShowMenu(false);
                onCreateDelivery();
              }}
              className="w-full text-left px-4 py-2.5 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center gap-2"
            >
              <Truck size={14} /> Create Delivery
            </button>
            <hr className="border-gray-100 dark:border-gray-700" />
            <button
              onClick={() => {
                setShowMenu(false);
                onEdit();
              }}
              className="w-full text-left px-4 py-2.5 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center gap-2"
            >
              <Edit size={14} /> Edit
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

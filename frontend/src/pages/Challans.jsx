import { useEffect, useState, useRef } from "react";
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
} from "lucide-react";
import toast from "react-hot-toast";
import { getChallans, deleteChallan } from "../api/challans";
import AddChallanModal from "../components/AddChallanModal";

export default function Challans() {
  const [challans, setChallans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingChallan, setEditingChallan] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [challansPerPage, setChallansPerPage] = useState(10);

  const loadChallans = async () => {
    try {
      setLoading(true);
      const data = await getChallans();
      setChallans(data);
    } catch (err) {
      console.error("Failed to load challans", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadChallans();
  }, []);

  const handleDelete = async (challan) => {
    if (
      !confirm(
        `Are you sure you want to delete challan ${challan.challan_number}?`
      )
    )
      return;
    try {
      await deleteChallan(challan.id);
      toast.success("Challan deleted successfully");
      loadChallans();
    } catch (err) {
      toast.error("Failed to delete challan");
    }
  };

  const filteredChallans = challans.filter((c) => {
    const matchesSearch =
      c.challan_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.party?.name?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter ? c.status === statusFilter : true;
    return matchesSearch && matchesStatus;
  });

  // Pagination logic
  const totalPages = Math.ceil(filteredChallans.length / challansPerPage);
  const startIndex = (currentPage - 1) * challansPerPage;
  const endIndex = startIndex + challansPerPage;
  const paginatedChallans = filteredChallans.slice(startIndex, endIndex);

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, statusFilter]);

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

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Delivery Challans
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Manage delivery challans for parties
          </p>
        </div>
        <button
          onClick={() => {
            setEditingChallan(null);
            setShowAddModal(true);
          }}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-xl font-medium transition-all shadow-lg shadow-blue-600/20"
        >
          <Plus size={20} />
          Create Challan
        </button>
      </div>

      {/* Content */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
        {/* Search and Filters */}
        <div className="p-4 border-b border-gray-100 dark:border-gray-700 flex flex-col sm:flex-row items-center gap-3">
          <div className="flex-1 flex items-center gap-3 w-full bg-gray-50 dark:bg-gray-900/50 rounded-xl px-4 py-2 border border-gray-100 dark:border-gray-700 focus-within:ring-2 focus-within:ring-blue-500/20 focus-within:border-blue-500 transition-all">
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
              className="w-full px-4 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all"
            >
              <option value="">All Status</option>
              <option value="draft">Draft</option>
              <option value="sent">Sent</option>
              <option value="delivered">Delivered</option>
            </select>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto max-h-[calc(100vh-400px)] overflow-y-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-gray-50 dark:bg-gray-700/95 text-gray-500 uppercase tracking-wider font-semibold sticky top-0 z-10 backdrop-blur-sm shadow-sm">
              <tr>
                <th className="px-6 py-4 whitespace-nowrap">Challan No.</th>
                <th className="px-6 py-4 whitespace-nowrap">Date</th>
                <th className="px-6 py-4 whitespace-nowrap">Party</th>
                <th className="px-6 py-4 whitespace-nowrap">Items</th>
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
                    colSpan="6"
                    className="px-6 py-8 text-center text-gray-500"
                  >
                    Loading challans...
                  </td>
                </tr>
              ) : paginatedChallans.length === 0 ? (
                <tr>
                  <td
                    colSpan="6"
                    className="px-6 py-8 text-center text-gray-500"
                  >
                    No challans found.
                  </td>
                </tr>
              ) : (
                paginatedChallans.map((challan) => (
                  <ChallanRow
                    key={challan.id}
                    challan={challan}
                    onEdit={() => {
                      setEditingChallan(challan);
                      setShowAddModal(true);
                    }}
                    onDelete={() => handleDelete(challan)}
                    getStatusColor={getStatusColor}
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

      <AddChallanModal
        open={showAddModal}
        challan={editingChallan}
        onClose={() => {
          setShowAddModal(false);
          setEditingChallan(null);
        }}
        onSuccess={loadChallans}
      />
    </div>
  );
}

function ChallanRow({ challan, onEdit, onDelete, getStatusColor }) {
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
        <div className="flex items-center gap-2">
          <FileText size={16} className="text-blue-600" />
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
        <span
          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${getStatusColor(
            challan.status
          )}`}
        >
          <span
            className={`w-1.5 h-1.5 rounded-full ${
              challan.status === "delivered"
                ? "bg-green-500"
                : challan.status === "sent"
                ? "bg-blue-500"
                : "bg-gray-500"
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

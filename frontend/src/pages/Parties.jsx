import { useEffect, useState, Fragment } from "react";
import {
  Plus,
  Search,
  Phone,
  MapPin,
  Receipt,
  Wallet,
  Edit,
  Trash2,
  Power,
  User,
  Users,
  Mail,
  Building2,
  FileText,
  ChevronLeft,
  ChevronRight,
  TrendingUp,
  TrendingDown,
} from "lucide-react";
import toast from "react-hot-toast";
import { getParties, deleteParty, updateParty } from "../api/parties";
import AddPartyModal from "../components/AddPartyModal";
import ConfirmDialog from "../components/ConfirmDialog";

export default function Parties() {
  const [parties, setParties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingParty, setEditingParty] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [partiesPerPage, setPartiesPerPage] = useState(10);
  const [deleteConfirm, setDeleteConfirm] = useState({
    open: false,
    party: null,
  });

  const loadParties = async () => {
    try {
      setLoading(true);
      const data = await getParties();
      setParties(data);
    } catch (err) {
      console.error("Failed to load parties", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadParties();
  }, []);

  const handleDelete = async () => {
    try {
      await deleteParty(deleteConfirm.party.id);
      toast.success("Party deleted successfully");
      setDeleteConfirm({ open: false, party: null });
      loadParties();
    } catch (err) {
      toast.error("Failed to delete party");
    }
  };

  const handleToggleStatus = async (party) => {
    try {
      await updateParty(party.id, { ...party, is_active: !party.is_active });
      toast.success(`Party ${party.is_active ? "deactivated" : "activated"}`);
      loadParties();
    } catch (err) {
      toast.error("Failed to update status");
    }
  };

  const filteredParties = parties
    .filter((p) => p.name.toLowerCase().includes(searchTerm.toLowerCase()))
    .sort((a, b) => b.id - a.id); // Sort in descending order (newest first)

  // Pagination logic
  const totalPages = Math.ceil(filteredParties.length / partiesPerPage);
  const startIndex = (currentPage - 1) * partiesPerPage;
  const endIndex = startIndex + partiesPerPage;
  const paginatedParties = filteredParties.slice(startIndex, endIndex);

  // Reset to page 1 when search changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-gray-900 to-gray-600 dark:from-white dark:to-gray-300 bg-clip-text text-transparent">
            Parties Management
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Manage your customers and vendors efficiently
          </p>
        </div>
        <button
          onClick={() => {
            setEditingParty(null);
            setShowAddModal(true);
          }}
          className="group flex items-center gap-2 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white px-6 py-3 rounded-xl font-semibold transition-all duration-300 shadow-lg shadow-blue-600/30 hover:shadow-xl hover:shadow-blue-600/40 hover:scale-105"
        >
          <Plus
            size={20}
            className="group-hover:rotate-90 transition-transform duration-300"
          />
          Add Party
        </button>
      </div>

      {/* Stats/Summary Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <StatCard
          label="Total Parties"
          value={parties.length}
          icon={Users}
          color="blue"
        />
        <StatCard
          label="Total Collected"
          value={`₹${parties
            .reduce((acc, curr) => acc + (Number(curr.total_received) || 0), 0)
            .toLocaleString("en-IN", {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}`}
          icon={TrendingUp}
          color="green"
        />
        <StatCard
          label="Total Outstanding"
          value={`₹${parties
            .reduce((acc, curr) => acc + (Number(curr.current_balance) || 0), 0)
            .toLocaleString("en-IN", {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}`}
          icon={TrendingDown}
          color="red"
        />
      </div>

      {/* Content */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-200 dark:border-gray-700 overflow-hidden backdrop-blur-sm">
        {/* Search */}
        <div className="p-5 border-b border-gray-200 dark:border-gray-700 bg-gradient-to-r from-gray-50 to-white dark:from-gray-800 dark:to-gray-800/50">
          <div className="relative group">
            <div className="absolute inset-0 bg-gradient-to-r from-blue-500/10 to-purple-500/10 rounded-xl opacity-0 group-focus-within:opacity-100 transition-opacity duration-300"></div>
            <div className="relative flex items-center gap-3 bg-white dark:bg-gray-900/80 rounded-xl px-5 py-3 border-2 border-gray-200 dark:border-gray-700 focus-within:border-blue-500 dark:focus-within:border-blue-500 transition-all duration-300 shadow-sm hover:shadow-md">
              <Search
                className="text-gray-400 group-focus-within:text-blue-500 transition-colors duration-300"
                size={20}
              />
              <input
                type="text"
                name="party_search"
                id="party_search"
                placeholder="Search parties by name..."
                className="flex-1 bg-transparent border-none focus:ring-0 text-sm text-gray-900 dark:text-white placeholder-gray-400 outline-none"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
              {searchTerm && (
                <span className="text-xs font-medium text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30 px-2 py-1 rounded-md">
                  {filteredParties.length} found
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto max-h-[calc(100vh-400px)] overflow-y-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-gradient-to-r from-gray-100 to-gray-50 dark:from-gray-700 dark:to-gray-700/80 text-gray-600 dark:text-gray-300 uppercase tracking-wider text-xs font-bold sticky top-0 z-10 backdrop-blur-sm shadow-md">
              <tr>
                <th className="px-6 py-4 whitespace-nowrap">Party Name</th>
                <th className="px-6 py-4 whitespace-nowrap">Contact</th>
                <th className="px-6 py-4 whitespace-nowrap">GSTIN</th>
                <th className="px-6 py-4 whitespace-nowrap">Collected</th>
                <th className="px-6 py-4 whitespace-nowrap">Outstanding</th>
                <th className="px-6 py-4 whitespace-nowrap">Status</th>
                <th className="px-6 py-4 text-right whitespace-nowrap">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700/50">
              {loading ? (
                <tr>
                  <td
                    colSpan="7"
                    className="px-6 py-12 text-center text-gray-500"
                  >
                    <div className="flex flex-col items-center gap-3">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                      <span className="text-sm font-medium">
                        Loading parties...
                      </span>
                    </div>
                  </td>
                </tr>
              ) : filteredParties.length === 0 ? (
                <tr>
                  <td
                    colSpan="7"
                    className="px-6 py-12 text-center text-gray-500"
                  >
                    <div className="flex flex-col items-center gap-2">
                      <Users
                        className="text-gray-300 dark:text-gray-600"
                        size={48}
                      />
                      <span className="text-sm font-medium">
                        No parties found.
                      </span>
                      <span className="text-xs text-gray-400">
                        Try adjusting your search
                      </span>
                    </div>
                  </td>
                </tr>
              ) : (
                paginatedParties.map((party, index) => (
                  <PartyRow
                    key={party.id}
                    party={party}
                    index={index}
                    onEdit={() => {
                      setEditingParty(party);
                      setShowAddModal(true);
                    }}
                    onToggleStatus={() => handleToggleStatus(party)}
                    onDelete={() => setDeleteConfirm({ open: true, party })}
                  />
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {filteredParties.length > 0 && (
          <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 flex flex-col sm:flex-row items-center justify-between gap-4 bg-gradient-to-r from-gray-50 to-white dark:from-gray-800/50 dark:to-gray-800">
            <div className="flex items-center gap-4">
              <span className="text-sm text-gray-600 dark:text-gray-400">
                Showing{" "}
                <span className="font-bold text-blue-600 dark:text-blue-400">
                  {startIndex + 1}
                </span>{" "}
                to{" "}
                <span className="font-bold text-blue-600 dark:text-blue-400">
                  {Math.min(endIndex, filteredParties.length)}
                </span>{" "}
                of{" "}
                <span className="font-bold text-gray-900 dark:text-white">
                  {filteredParties.length}
                </span>{" "}
                parties
              </span>
              <select
                name="parties_per_page"
                id="parties_per_page"
                value={partiesPerPage}
                onChange={(e) => {
                  setPartiesPerPage(Number(e.target.value));
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

      <AddPartyModal
        open={showAddModal}
        action={editingParty ? "edit" : "add"}
        party={editingParty}
        onClose={() => {
          setShowAddModal(false);
          setEditingParty(null);
        }}
        onSuccess={loadParties}
      />

      <ConfirmDialog
        open={deleteConfirm.open}
        title="Delete Party"
        message={`Are you sure you want to delete "${deleteConfirm.party?.name}"? This action cannot be undone.`}
        confirmLabel="Delete"
        type="danger"
        onConfirm={handleDelete}
        onCancel={() => setDeleteConfirm({ open: false, party: null })}
      />
    </div>
  );
}

function PartyRow({ party, index, onEdit, onToggleStatus, onDelete }) {
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
            {party.name}
          </div>
          {party.address && (
            <div className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400 mt-1">
              <MapPin size={13} className="text-gray-400" />
              <span className="line-clamp-1">{party.address}</span>
            </div>
          )}
        </div>
      </td>
      <td className="px-6 py-5">
        <div className="space-y-1.5">
          {party.phone ? (
            <div className="flex items-center gap-2 text-gray-700 dark:text-gray-300">
              <div className="p-1.5 bg-blue-50 dark:bg-blue-900/30 rounded-md">
                <Phone size={13} className="text-blue-600 dark:text-blue-400" />
              </div>
              <span className="font-semibold text-sm">{party.phone}</span>
            </div>
          ) : (
            <span className="text-gray-400 dark:text-gray-500 text-xs italic">
              No phone
            </span>
          )}
          {party.email && (
            <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400 text-xs">
              <Mail size={12} className="text-gray-400" />
              <span className="truncate max-w-[180px]">{party.email}</span>
            </div>
          )}
        </div>
      </td>
      <td className="px-6 py-5">
        {party.gst_number ? (
          <div className="flex items-center gap-2 bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20 px-3 py-2 rounded-lg border border-amber-200 dark:border-amber-800">
            <FileText
              size={14}
              className="text-amber-600 dark:text-amber-400"
            />
            <span className="font-mono text-xs font-semibold text-gray-700 dark:text-gray-300">
              {party.gst_number}
            </span>
          </div>
        ) : (
          <span className="text-gray-400 dark:text-gray-500 text-xs italic">
            —
          </span>
        )}
      </td>
      <td className="px-6 py-5">
        <div className="flex items-center gap-2">
          <div className="p-1.5 bg-green-50 dark:bg-green-900/30 rounded-md">
            <TrendingUp
              size={14}
              className="text-green-600 dark:text-green-400"
            />
          </div>
          <span className="font-bold text-sm text-green-600 dark:text-green-400">
            ₹
            {(Number(party.total_received) || 0).toLocaleString("en-IN", {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}
          </span>
        </div>
      </td>
      <td className="px-6 py-5">
        <div className="flex items-center gap-2">
          <div
            className={`p-1.5 rounded-md ${
              party.current_balance >= 0
                ? "bg-red-50 dark:bg-red-900/30"
                : "bg-green-50 dark:bg-green-900/30"
            }`}
          >
            {party.current_balance >= 0 ? (
              <TrendingDown
                size={14}
                className="text-red-600 dark:text-red-400"
              />
            ) : (
              <TrendingUp
                size={14}
                className="text-green-600 dark:text-green-400"
              />
            )}
          </div>
          <div>
            <span
              className={`font-bold text-base ${
                party.current_balance >= 0
                  ? "text-red-600 dark:text-red-400"
                  : "text-green-600 dark:text-green-400"
              }`}
            >
              ₹
              {Math.abs(Number(party.current_balance)).toLocaleString("en-IN", {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
            </span>
            <span className="text-xs text-gray-500 dark:text-gray-400 ml-1.5 font-medium">
              {party.current_balance >= 0 ? "(Receivable)" : "(Payable)"}
            </span>
          </div>
        </div>
      </td>
      <td className="px-6 py-5">
        <span
          className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold shadow-sm ${
            party.is_active
              ? "bg-gradient-to-r from-green-100 to-emerald-100 text-green-700 dark:from-green-900/40 dark:to-emerald-900/40 dark:text-green-400 border border-green-300 dark:border-green-700"
              : "bg-gradient-to-r from-red-100 to-rose-100 text-red-700 dark:from-red-900/40 dark:to-rose-900/40 dark:text-red-400 border border-red-300 dark:border-red-700"
          }`}
        >
          <span
            className={`w-2 h-2 rounded-full animate-pulse ${
              party.is_active
                ? "bg-green-500 shadow-lg shadow-green-500/50"
                : "bg-red-500 shadow-lg shadow-red-500/50"
            }`}
          ></span>
          {party.is_active ? "Active" : "Inactive"}
        </span>
      </td>
      <td className="px-6 py-5">
        <div className="flex items-center justify-end gap-2">
          {/* Edit Button */}
          <button
            onClick={onEdit}
            className="p-2 rounded-lg bg-blue-50 hover:bg-blue-100 dark:bg-blue-900/30 dark:hover:bg-blue-900/50 text-blue-600 dark:text-blue-400 transition-all duration-200 hover:scale-110 shadow-sm hover:shadow-md"
            title="Edit Party"
          >
            <Edit size={16} />
          </button>

          {/* Toggle Status Button */}
          <button
            onClick={onToggleStatus}
            className={`p-2 rounded-lg transition-all duration-200 hover:scale-110 shadow-sm hover:shadow-md ${
              party.is_active
                ? "bg-orange-50 hover:bg-orange-100 dark:bg-orange-900/30 dark:hover:bg-orange-900/50 text-orange-600 dark:text-orange-400"
                : "bg-green-50 hover:bg-green-100 dark:bg-green-900/30 dark:hover:bg-green-900/50 text-green-600 dark:text-green-400"
            }`}
            title={party.is_active ? "Deactivate" : "Activate"}
          >
            <Power size={16} />
          </button>

          {/* Delete Button */}
          <button
            onClick={onDelete}
            className="p-2 rounded-lg bg-red-50 hover:bg-red-100 dark:bg-red-900/30 dark:hover:bg-red-900/50 text-red-600 dark:text-red-400 transition-all duration-200 hover:scale-110 shadow-sm hover:shadow-md"
            title="Delete Party"
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
    red: {
      gradient: "from-red-500 to-rose-600",
      bg: "bg-gradient-to-br from-red-50 to-rose-100 dark:from-red-900/30 dark:to-rose-800/20",
      iconBg: "bg-gradient-to-br from-red-500 to-rose-600",
      text: "text-red-600 dark:text-red-400",
      shadow: "shadow-red-500/20 dark:shadow-red-500/10",
      hoverShadow: "hover:shadow-red-500/30 dark:hover:shadow-red-500/20",
    },
  };

  const colorScheme = colors[color];

  return (
    <div
      className={`group relative ${colorScheme.bg} p-6 rounded-2xl shadow-lg ${colorScheme.shadow} ${colorScheme.hoverShadow} border border-gray-200 dark:border-gray-700 transition-all duration-300 hover:scale-105 hover:-translate-y-1 overflow-hidden`}
    >
      {/* Background decoration */}
      <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 dark:bg-black/10 rounded-full -mr-16 -mt-16 group-hover:scale-150 transition-transform duration-500"></div>

      <div className="relative flex items-center gap-4">
        <div
          className={`p-4 rounded-xl ${colorScheme.iconBg} shadow-lg group-hover:scale-110 group-hover:rotate-6 transition-all duration-300`}
        >
          <Icon size={28} className="text-white" />
        </div>
        <div className="flex-1">
          <h3
            className={`text-3xl font-bold ${colorScheme.text} tabular-nums group-hover:scale-105 transition-transform duration-300 origin-left`}
          >
            {value}
          </h3>
          <p className="text-xs text-gray-600 dark:text-gray-400 font-semibold uppercase tracking-wider mt-1">
            {label}
          </p>
        </div>
      </div>
    </div>
  );
}

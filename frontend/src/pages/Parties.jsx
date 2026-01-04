import { useEffect, useState, useRef, Fragment } from "react";
import {
  Plus,
  Search,
  MoreVertical,
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
} from "lucide-react";
import toast from "react-hot-toast";
import { getParties, deleteParty, updateParty } from "../api/parties";
import AddPartyModal from "../components/AddPartyModal";

export default function Parties() {
  const [parties, setParties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingParty, setEditingParty] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [partiesPerPage, setPartiesPerPage] = useState(10);

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

  const handleDelete = async (party) => {
    if (!confirm(`Are you sure you want to delete ${party.name}?`)) return;
    try {
      await deleteParty(party.id);
      toast.success("Party deleted successfully");
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

  const filteredParties = parties.filter((p) =>
    p.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

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
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Parties
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Manage your customers and vendors
          </p>
        </div>
        <button
          onClick={() => {
            setEditingParty(null);
            setShowAddModal(true);
          }}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-xl font-medium transition-all shadow-lg shadow-blue-600/20"
        >
          <Plus size={20} />
          Add Party
        </button>
      </div>

      {/* Stats/Summary Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
          icon={Wallet}
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
          icon={Wallet}
          color="red"
        />
      </div>

      {/* Content */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
        {/* Search */}
        <div className="p-4 border-b border-gray-100 dark:border-gray-700">
          <div className="flex items-center gap-3 bg-gray-50 dark:bg-gray-900/50 rounded-xl px-4 py-2 border border-gray-100 dark:border-gray-700 focus-within:ring-2 focus-within:ring-blue-500/20 focus-within:border-blue-500 transition-all">
            <Search className="text-gray-400" size={20} />
            <input
              type="text"
              placeholder="Search parties by name..."
              className="flex-1 bg-transparent border-none focus:ring-0 text-sm text-gray-900 dark:text-white placeholder-gray-400 outline-none"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto max-h-[calc(100vh-400px)] overflow-y-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-gray-50 dark:bg-gray-700/95 text-gray-500 uppercase tracking-wider font-semibold sticky top-0 z-10 backdrop-blur-sm shadow-sm">
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
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
              {loading ? (
                <tr>
                  <td
                    colSpan="6"
                    className="px-6 py-8 text-center text-gray-500"
                  >
                    Loading parties...
                  </td>
                </tr>
              ) : filteredParties.length === 0 ? (
                <tr>
                  <td
                    colSpan="6"
                    className="px-6 py-8 text-center text-gray-500"
                  >
                    No parties found.
                  </td>
                </tr>
              ) : (
                paginatedParties.map((party) => (
                  <PartyRow
                    key={party.id}
                    party={party}
                    onEdit={() => {
                      setEditingParty(party);
                      setShowAddModal(true);
                    }}
                    onToggleStatus={() => handleToggleStatus(party)}
                    onDelete={() => handleDelete(party)}
                  />
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {filteredParties.length > 0 && (
          <div className="px-6 py-4 border-t border-gray-100 dark:border-gray-700 flex flex-col sm:flex-row items-center justify-between gap-4 bg-gray-50 dark:bg-gray-800/50">
            <div className="flex items-center gap-4">
              <span className="text-sm text-gray-600 dark:text-gray-400">
                Showing{" "}
                <span className="font-semibold text-gray-900 dark:text-white">
                  {startIndex + 1}
                </span>{" "}
                to{" "}
                <span className="font-semibold text-gray-900 dark:text-white">
                  {Math.min(endIndex, filteredParties.length)}
                </span>{" "}
                of{" "}
                <span className="font-semibold text-gray-900 dark:text-white">
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
                    <Fragment key={page}>
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
                    </Fragment>
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
    </div>
  );
}

function PartyRow({ party, onEdit, onToggleStatus, onDelete }) {
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
            {party.name}
          </div>
          {party.address && (
            <div className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400 mt-0.5">
              <MapPin size={12} />
              {party.address}
            </div>
          )}
        </div>
      </td>
      <td className="px-6 py-4">
        <div className="space-y-1">
          {party.phone ? (
            <div className="flex items-center gap-2 text-gray-700 dark:text-gray-300">
              <Phone size={14} className="text-gray-400" />
              <span className="font-medium">{party.phone}</span>
            </div>
          ) : (
            <span className="text-gray-400 dark:text-gray-500 text-xs italic">
              No phone
            </span>
          )}
          {party.email && (
            <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400 text-xs">
              <Mail size={12} className="text-gray-400" />
              <span>{party.email}</span>
            </div>
          )}
        </div>
      </td>
      <td className="px-6 py-4">
        {party.gst_number ? (
          <div className="flex items-center gap-2">
            <FileText size={14} className="text-gray-400" />
            <span className="font-mono text-sm text-gray-700 dark:text-gray-300">
              {party.gst_number}
            </span>
          </div>
        ) : (
          <span className="text-gray-400 dark:text-gray-500 text-xs italic">
            —
          </span>
        )}
      </td>
      <td className="px-6 py-4">
        <div className="font-semibold text-sm text-green-600 dark:text-green-400">
          ₹
          {(Number(party.total_received) || 0).toLocaleString("en-IN", {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          })}
        </div>
      </td>
      <td className="px-6 py-4">
        <div className="font-semibold text-base">
          <span
            className={
              party.current_balance >= 0
                ? "text-red-600 dark:text-red-400"
                : "text-green-600 dark:text-green-400"
            }
          >
            ₹
            {Math.abs(Number(party.current_balance)).toLocaleString("en-IN", {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}
          </span>
          <span className="text-xs text-gray-500 dark:text-gray-400 ml-1">
            {party.current_balance >= 0 ? "(Receivable)" : "(Payable)"}
          </span>
        </div>
      </td>
      <td className="px-6 py-4">
        <span
          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${
            party.is_active
              ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
              : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
          }`}
        >
          <span
            className={`w-1.5 h-1.5 rounded-full ${
              party.is_active ? "bg-green-500" : "bg-red-500"
            }`}
          ></span>
          {party.is_active ? "Active" : "Inactive"}
        </span>
      </td>
      <td className="px-6 py-4 text-right relative">
        <button
          onClick={() => setShowMenu(!showMenu)}
          className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition"
        >
          <MoreVertical size={16} />
        </button>

        {/* DROPDOWN */}
        {showMenu && (
          <div
            ref={menuRef}
            className="absolute right-8 top-8 w-40 bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-100 dark:border-gray-700 z-10 animate-fade-in origin-top-right overflow-hidden"
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
                party.is_active
                  ? "text-orange-600 dark:text-orange-400"
                  : "text-green-600 dark:text-green-400"
              }`}
            >
              <Power size={14} />
              {party.is_active ? "Deactivate" : "Activate"}
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

function StatCard({ label, value, icon: Icon, color }) {
  const colors = {
    blue: "bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400",
    green:
      "bg-green-50 text-green-600 dark:bg-green-900/20 dark:text-green-400",
    red: "bg-red-50 text-red-600 dark:bg-red-900/20 dark:text-red-400",
  };

  return (
    <div className="bg-white dark:bg-gray-800 p-5 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 flex items-center gap-4">
      <div className={`p-3 rounded-xl ${colors[color]}`}>
        <Icon size={22} />
      </div>
      <div>
        <h3 className="text-2xl font-bold text-gray-900 dark:text-white">
          {value}
        </h3>
        <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">
          {label}
        </p>
      </div>
    </div>
  );
}

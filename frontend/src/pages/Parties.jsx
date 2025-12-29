import { useEffect, useState, useRef } from "react";
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
          label="Total Receivables"
          value={`₹ ${parties
            .filter((p) => p.opening_balance > 0)
            .reduce((acc, curr) => acc + Number(curr.opening_balance), 0)
            .toFixed(2)}`}
          icon={Wallet}
          color="green"
        />
        <StatCard
          label="Total Payables"
          value={`₹ ${Math.abs(
            parties
              .filter((p) => p.opening_balance < 0)
              .reduce((acc, curr) => acc + Number(curr.opening_balance), 0)
          ).toFixed(2)}`}
          icon={Wallet}
          color="red"
        />
      </div>

      {/* Content */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
        {/* Search */}
        <div className="p-4 border-b border-gray-100 dark:border-gray-700 flex items-center gap-3">
          <Search className="text-gray-400" size={20} />
          <input
            type="text"
            placeholder="Search parties by name..."
            className="flex-1 bg-transparent border-none focus:ring-0 text-sm text-gray-900 dark:text-white placeholder-gray-400"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        {/* Table */}
        <div className="overflow-x-auto min-h-[400px]">
          <table className="w-full text-left text-sm">
            <thead className="bg-gray-50 dark:bg-gray-700/50 text-gray-500 uppercase tracking-wider font-semibold">
              <tr>
                <th className="px-6 py-4 whitespace-nowrap">Party Name</th>
                <th className="px-6 py-4 whitespace-nowrap">Contact</th>
                <th className="px-6 py-4 whitespace-nowrap">GSTIN</th>
                <th className="px-6 py-4 whitespace-nowrap">Balance</th>
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
                filteredParties.map((party) => (
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
        <div className="font-medium text-gray-900 dark:text-white">
          {party.name}
        </div>
        {party.address && (
          <div className="flex items-center gap-1 text-xs text-gray-400 mt-0.5">
            <MapPin size={10} /> {party.address}
          </div>
        )}
      </td>
      <td className="px-6 py-4">
        {party.phone ? (
          <div className="flex items-center gap-2 text-gray-600 dark:text-gray-300">
            <Phone size={14} className="text-gray-400" />
            {party.phone}
          </div>
        ) : (
          <span className="text-gray-400 italic">No phone</span>
        )}
      </td>
      <td className="px-6 py-4 text-gray-600 dark:text-gray-300">
        {party.gst_number || <span className="text-gray-400 italic">—</span>}
      </td>
      <td className="px-6 py-4 font-medium">
        <span
          className={
            party.opening_balance >= 0 ? "text-green-600" : "text-red-600"
          }
        >
          ₹ {Number(party.opening_balance).toFixed(2)}
        </span>
      </td>
      <td className="px-6 py-4">
        <span
          className={`px-2 py-1 text-xs rounded-full font-medium ${
            party.is_active
              ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
              : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
          }`}
        >
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

import { useState, useEffect } from "react";
import {
  X,
  Save,
  Plus,
  Package,
  Tag,
  FileText,
  Building2,
  Cog,
  Weight,
  IndianRupee,
} from "lucide-react";
import toast from "react-hot-toast";
import { createItem, updateItem } from "../api/items";
import { getParties } from "../api/parties";
import { getProcesses } from "../api/processes";
import AddProcessModal from "./AddProcessModal";

export default function AddItemModal({ open, onClose, onSuccess, item }) {
  const [loading, setLoading] = useState(false);
  const [parties, setParties] = useState([]);
  const [processes, setProcesses] = useState([]);
  const [showProcessModal, setShowProcessModal] = useState(false);

  const [form, setForm] = useState({
    name: "",
    hsn_code: "",
    po_number: "",
    casting_weight: 0,
    scrap_weight: 0,
    rate: 0,
    party_id: "",
    process_id: "",
    barcode: "",
    is_active: true,
  });

  const fetchData = async () => {
    try {
      const [partiesData, processesData] = await Promise.all([
        getParties(),
        getProcesses(),
      ]);
      setParties(partiesData || []);
      setProcesses(processesData || []);
    } catch (err) {
      console.error("Failed to load dropdown data", err);
    }
  };

  useEffect(() => {
    if (open) fetchData();
  }, [open]);

  useEffect(() => {
    if (item) {
      setForm({
        name: item.name,
        hsn_code: item.hsn_code || "",
        po_number: item.po_number || "",
        casting_weight: item.casting_weight || 0,
        scrap_weight: item.scrap_weight || 0,
        rate: item.rate || 0,
        party_id: item.party_id || "",
        process_id: item.process_id || "",
        barcode: item.barcode || "",
        is_active: item.is_active,
      });
    } else {
      setForm({
        name: "",
        hsn_code: "",
        po_number: "",
        casting_weight: 0,
        scrap_weight: 0,
        rate: 0,
        party_id: "",
        process_id: "",
        is_active: true,
      });
    }
  }, [item, open]);

  if (!open) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      const payload = {
        ...form,
        party_id: form.party_id ? Number(form.party_id) : null,
        process_id: form.process_id ? Number(form.process_id) : null,
      };

      if (item) {
        await updateItem(item.id, payload);
        toast.success("Item updated successfully");
      } else {
        await createItem(payload);
        toast.success("Item added successfully");
      }
      onSuccess();
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.detail || "Failed to save item");
    } finally {
      setLoading(false);
    }
  };

  const handleProcessSuccess = (result) => {
    setProcesses((prev) => {
      const exists = prev.find((p) => p.id === result.id);
      if (exists) {
        return prev.map((p) => (p.id === result.id ? result : p));
      }
      return [...prev, result];
    });
    setForm((f) => ({ ...f, process_id: result.id }));
  };

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
        <div className="bg-white dark:bg-gray-800 rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden animate-scale-in">
          {/* Header with Gradient */}
          <div className="relative bg-gradient-to-r from-blue-600 to-purple-600 p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-white/20 backdrop-blur-sm rounded-xl">
                  <Package size={24} className="text-white" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-white">
                    {item ? "Edit Item" : "Add New Item"}
                  </h2>
                  <p className="text-blue-100 text-sm mt-0.5">
                    {item
                      ? "Update item information"
                      : "Create a new inventory item"}
                  </p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="p-2 hover:bg-white/20 rounded-full transition-all duration-200"
              >
                <X size={22} className="text-white" />
              </button>
            </div>
          </div>

          <form
            onSubmit={handleSubmit}
            className="p-6 space-y-5 max-h-[calc(100vh-250px)] overflow-y-auto"
          >
            {/* Basic Information Section */}
            <div className="space-y-4">
              <h3 className="text-sm font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wide flex items-center gap-2">
                <Package
                  size={16}
                  className="text-blue-600 dark:text-blue-400"
                />
                Basic Information
              </h3>
              <Input
                label="Item Name"
                icon={<Tag size={16} />}
                name="item_name"
                id="item_name"
                value={form.name}
                onChange={(v) => setForm({ ...form, name: v })}
                required
                autoFocus
                placeholder="Enter item name"
              />

              <div className="flex gap-2 items-end">
                <div className="flex-1">
                  <Input
                    label="Barcode"
                    icon={<Tag size={16} />}
                    name="barcode"
                    id="barcode"
                    value={form.barcode || ""}
                    onChange={(v) => setForm({ ...form, barcode: v })}
                    placeholder="Scan or enter barcode"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => {
                    const randomCode = Math.floor(
                      100000000000 + Math.random() * 900000000000,
                    ).toString();
                    setForm({ ...form, barcode: randomCode });
                    toast.success("Generated random barcode");
                  }}
                  className="px-4 py-3 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-xl font-medium text-sm transition-colors mb-[1px]"
                  title="Generate Random Barcode"
                >
                  Generate
                </button>
              </div>
            </div>

            {/* Linking & Process Section */}
            <div className="space-y-4">
              <h3 className="text-sm font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wide flex items-center gap-2">
                <Building2
                  size={16}
                  className="text-blue-600 dark:text-blue-400"
                />
                Linking & Process
              </h3>
              <div className="grid grid-cols-2 gap-4">
                {/* Party Selection */}
                <div>
                  <label
                    htmlFor="party_link"
                    className="block text-sm font-bold mb-2 text-gray-700 dark:text-gray-300 flex items-center gap-1.5"
                  >
                    <Building2 size={14} className="text-gray-400" />
                    Linked Party
                  </label>
                  <select
                    name="party_link"
                    id="party_link"
                    value={form.party_id}
                    onChange={(e) =>
                      setForm({ ...form, party_id: e.target.value })
                    }
                    className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 outline-none transition-all duration-200 font-medium"
                  >
                    <option value="">General Item (All Parties)</option>
                    {parties
                      .filter((p) => p.is_active)
                      .map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name}
                        </option>
                      ))}
                  </select>
                </div>

                {/* Process Selection */}
                <div>
                  <label
                    htmlFor="process_link"
                    className="block text-sm font-bold mb-2 text-gray-700 dark:text-gray-300 flex items-center gap-1.5"
                  >
                    <Cog size={14} className="text-gray-400" />
                    Process
                  </label>
                  <div className="flex gap-2">
                    <select
                      name="process_link"
                      id="process_link"
                      value={form.process_id}
                      onChange={(e) =>
                        setForm({ ...form, process_id: e.target.value })
                      }
                      className="flex-1 w-full px-4 py-3 rounded-xl border-2 border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 outline-none transition-all duration-200 font-medium"
                    >
                      <option value="">None</option>
                      {processes
                        .filter((p) => p.is_active)
                        .map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.name}
                          </option>
                        ))}
                    </select>
                    <button
                      type="button"
                      onClick={() => setShowProcessModal(true)}
                      className="px-3 py-3 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white rounded-xl transition-all shadow-md hover:shadow-lg"
                      title="Add New Process"
                    >
                      <Plus size={18} />
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Additional Details Section */}
            <div className="space-y-4">
              <h3 className="text-sm font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wide flex items-center gap-2">
                <FileText
                  size={16}
                  className="text-blue-600 dark:text-blue-400"
                />
                Additional Details
              </h3>
              <div className="grid grid-cols-2 gap-4">
                <Input
                  label="HSN Code"
                  icon={<Tag size={16} />}
                  name="hsn_code"
                  id="hsn_code"
                  value={form.hsn_code}
                  onChange={(v) => setForm({ ...form, hsn_code: v })}
                  placeholder="e.g., 7326"
                />
                <Input
                  label="P.O Number"
                  icon={<FileText size={16} />}
                  name="po_number"
                  id="po_number"
                  value={form.po_number}
                  onChange={(v) => setForm({ ...form, po_number: v })}
                  placeholder="e.g., PO-2024-001"
                />
              </div>
            </div>

            {/* Measurements & Pricing Section */}
            <div className="space-y-4">
              <h3 className="text-sm font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wide flex items-center gap-2">
                <Weight
                  size={16}
                  className="text-blue-600 dark:text-blue-400"
                />
                Measurements & Pricing
              </h3>
              <div className="grid grid-cols-2 gap-4">
                <Input
                  label="Casting Weight"
                  icon={<Weight size={16} />}
                  type="number"
                  name="casting_weight"
                  id="casting_weight"
                  value={form.casting_weight}
                  onChange={(v) => setForm({ ...form, casting_weight: v })}
                  placeholder="0.000"
                  step="0.001"
                  suffix="kg"
                />
                <Input
                  label="Scrap Weight"
                  icon={<Weight size={16} />}
                  type="number"
                  name="scrap_weight"
                  id="scrap_weight"
                  value={form.scrap_weight}
                  onChange={(v) => setForm({ ...form, scrap_weight: v })}
                  placeholder="0.000"
                  step="0.001"
                  suffix="kg"
                />
              </div>
              <Input
                label="Rate"
                icon={<IndianRupee size={16} />}
                type="number"
                name="item_rate"
                id="item_rate"
                value={form.rate}
                onChange={(v) => setForm({ ...form, rate: v })}
                required
                placeholder="0.00"
                step="0.01"
                prefix="₹"
              />
            </div>

            {/* Status Toggle */}
            <div className="flex items-center justify-between p-4 bg-gradient-to-r from-gray-50 to-blue-50 dark:from-gray-900 dark:to-blue-900/20 rounded-xl border-2 border-gray-200 dark:border-gray-700">
              <div className="flex items-center gap-3">
                <div
                  className={`p-2 rounded-lg ${
                    form.is_active
                      ? "bg-green-100 dark:bg-green-900/30"
                      : "bg-gray-200 dark:bg-gray-700"
                  }`}
                >
                  <Package
                    size={18}
                    className={
                      form.is_active
                        ? "text-green-600 dark:text-green-400"
                        : "text-gray-500"
                    }
                  />
                </div>
                <div>
                  <span className="text-sm font-bold text-gray-900 dark:text-white block">
                    Item Status
                  </span>
                  <span className="text-xs text-gray-500 dark:text-gray-400">
                    {form.is_active
                      ? "Active and visible"
                      : "Inactive and hidden"}
                  </span>
                </div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  name="item_status_toggle"
                  id="item_status_toggle"
                  className="sr-only peer"
                  checked={form.is_active}
                  onChange={(e) =>
                    setForm({ ...form, is_active: e.target.checked })
                  }
                />
                <div className="w-14 h-7 bg-gray-300 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all dark:border-gray-600 peer-checked:bg-gradient-to-r peer-checked:from-green-500 peer-checked:to-emerald-600 shadow-inner"></div>
              </label>
            </div>
          </form>

          {/* Footer */}
          <div className="flex justify-end gap-3 p-6 border-t-2 border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-2.5 rounded-xl text-gray-700 hover:bg-gray-200 dark:text-gray-300 dark:hover:bg-gray-700 font-semibold transition-all border-2 border-gray-300 dark:border-gray-600"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={loading}
              className="flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white rounded-xl font-semibold shadow-lg shadow-blue-600/30 hover:shadow-xl hover:shadow-blue-600/40 disabled:opacity-70 disabled:cursor-not-allowed transition-all duration-200"
            >
              <Save size={18} />
              {loading ? "Saving..." : item ? "Update Item" : "Save Item"}
            </button>
          </div>
        </div>
      </div>

      <AddProcessModal
        open={showProcessModal}
        onClose={() => setShowProcessModal(false)}
        onSuccess={handleProcessSuccess}
        existingProcesses={processes}
      />
    </>
  );
}

function Input({
  label,
  type = "text",
  value,
  onChange,
  required = false,
  placeholder = "",
  autoFocus = false,
  icon = null,
  prefix = null,
  suffix = null,
  step = null,
  name,
  id,
}) {
  return (
    <div>
      <label
        htmlFor={id || name}
        className="block text-sm font-bold mb-2 text-gray-700 dark:text-gray-300 flex items-center gap-1.5"
      >
        {icon && <span className="text-gray-400">{icon}</span>}
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      <div className="relative">
        {prefix && (
          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 dark:text-gray-400 font-semibold">
            {prefix}
          </span>
        )}
        <input
          type={type}
          name={name}
          id={id || name}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          required={required}
          placeholder={placeholder}
          autoFocus={autoFocus}
          step={step}
          className={`
            w-full ${prefix ? "pl-10" : "pl-4"} ${
              suffix ? "pr-12" : "pr-4"
            } py-3 rounded-xl border-2 border-gray-200 dark:border-gray-700
            bg-white dark:bg-gray-900 text-gray-900 dark:text-white
            focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500
            outline-none transition-all duration-200
            placeholder:text-gray-400 dark:placeholder:text-gray-600
            font-medium
          `}
        />
        {suffix && (
          <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 dark:text-gray-400 text-sm font-semibold">
            {suffix}
          </span>
        )}
      </div>
    </div>
  );
}

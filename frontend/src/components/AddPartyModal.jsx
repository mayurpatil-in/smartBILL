import { useState, useEffect } from "react";
import { X, Save } from "lucide-react";
import toast from "react-hot-toast";
import { createParty, updateParty } from "../api/parties";

export default function AddPartyModal({ open, onClose, onSuccess, party }) {
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    gst_number: "",
    address: "",
    opening_balance: 0,
    is_active: true,
  });

  useEffect(() => {
    if (party) {
      setForm({
        name: party.name,
        email: party.email || "",
        phone: party.phone || "",
        gst_number: party.gst_number || "",
        address: party.address || "",
        opening_balance: party.opening_balance || 0,
        is_active: party.is_active,
      });
    } else {
      setForm({
        name: "",
        email: "",
        phone: "",
        gst_number: "",
        address: "",
        opening_balance: 0,
        is_active: true,
      });
    }
  }, [party, open]);

  if (!open) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      if (party) {
        await updateParty(party.id, form);
        toast.success("Party updated successfully");
      } else {
        await createParty(form);
        toast.success("Party added successfully");
      }
      onSuccess();
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.detail || "Failed to save party");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
      <div className="bg-white dark:bg-gray-800 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden animate-scale-in">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-100 dark:border-gray-700">
          <h2 className="text-xl font-bold dark:text-white">
            {party ? "Edit Party" : "Add New Party"}
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition"
          >
            <X size={20} className="dark:text-gray-400" />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <Input
            label="Party Name"
            value={form.name}
            onChange={(v) => setForm({ ...form, name: v })}
            required
            autoFocus
          />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Phone Number"
              value={form.phone}
              onChange={(v) => setForm({ ...form, phone: v })}
            />
            <Input
              label="Email (Optional)"
              type="email"
              value={form.email}
              onChange={(v) => setForm({ ...form, email: v })}
            />
          </div>

          <Input
            label="GSTIN (Optional)"
            value={form.gst_number}
            onChange={(v) => setForm({ ...form, gst_number: v })}
            placeholder="e.g. 29ABCDE1234F1Z5"
          />

          <Input
            label="Address (Optional)"
            value={form.address}
            onChange={(v) => setForm({ ...form, address: v })}
          />

          <Input
            label="Opening Balance (Optional)"
            type="number"
            value={form.opening_balance}
            onChange={(v) => setForm({ ...form, opening_balance: v })}
          />

          {/* Status Toggle */}
          <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-700">
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Active Status
            </span>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                className="sr-only peer"
                checked={form.is_active}
                onChange={(e) =>
                  setForm({ ...form, is_active: e.target.checked })
                }
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
            </label>
          </div>

          {/* Footer */}
          <div className="flex justify-end gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2 rounded-lg text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700 font-medium transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex items-center gap-2 px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium shadow-lg shadow-blue-600/20 disabled:opacity-70 transition"
            >
              <Save size={18} />
              {loading ? "Saving..." : party ? "Update Party" : "Save Party"}
            </button>
          </div>
        </form>
      </div>
    </div>
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
}) {
  return (
    <div>
      <label className="block text-sm font-medium mb-1.5 text-gray-700 dark:text-gray-300">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required={required}
        placeholder={placeholder}
        autoFocus={autoFocus}
        className="
          w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700
          bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white
          focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500
          outline-none transition-all duration-200
          placeholder:text-gray-400 dark:placeholder:text-gray-600
        "
      />
    </div>
  );
}

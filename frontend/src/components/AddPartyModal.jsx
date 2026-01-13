import { useState, useEffect } from "react";
import {
  X,
  Save,
  User,
  Phone,
  Mail,
  FileText,
  MapPin,
  Wallet,
  UserPlus,
  UserCheck,
} from "lucide-react";
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
      <div className="bg-white dark:bg-gray-800 rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden animate-scale-in">
        {/* Header with Gradient */}
        <div className="relative bg-gradient-to-r from-blue-600 to-purple-600 p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-white/20 backdrop-blur-sm rounded-xl">
                {party ? (
                  <UserCheck size={24} className="text-white" />
                ) : (
                  <UserPlus size={24} className="text-white" />
                )}
              </div>
              <div>
                <h2 className="text-2xl font-bold text-white">
                  {party ? "Edit Party" : "Add New Party"}
                </h2>
                <p className="text-blue-100 text-sm mt-0.5">
                  {party
                    ? "Update party information"
                    : "Create a new party entry"}
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

        {/* Body */}
        <form
          onSubmit={handleSubmit}
          className="p-6 space-y-5 max-h-[calc(100vh-250px)] overflow-y-auto"
        >
          {/* Party Name */}
          <Input
            label="Party Name"
            name="party_name"
            id="party_name"
            icon={User}
            value={form.name}
            onChange={(v) => setForm({ ...form, name: v })}
            required
            autoFocus
            placeholder="Enter party name"
          />

          {/* Contact Information */}
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wide flex items-center gap-2">
              <Phone size={16} className="text-blue-600 dark:text-blue-400" />
              Contact Information
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                label="Phone Number"
                name="party_phone"
                id="party_phone"
                icon={Phone}
                value={form.phone}
                onChange={(v) => setForm({ ...form, phone: v })}
                placeholder="+91 98765 43210"
              />
              <Input
                label="Email Address"
                type="email"
                name="party_email"
                id="party_email"
                icon={Mail}
                value={form.email}
                onChange={(v) => setForm({ ...form, email: v })}
                placeholder="party@example.com"
              />
            </div>
          </div>

          {/* Business Details */}
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wide flex items-center gap-2">
              <FileText
                size={16}
                className="text-blue-600 dark:text-blue-400"
              />
              Business Details
            </h3>
            <Input
              label="GSTIN"
              name="gst_number"
              id="gst_number"
              icon={FileText}
              value={form.gst_number}
              onChange={(v) =>
                setForm({ ...form, gst_number: v.toUpperCase() })
              }
              placeholder="29ABCDE1234F1Z5"
            />
            <Input
              label="Address"
              name="party_address"
              id="party_address"
              icon={MapPin}
              value={form.address}
              onChange={(v) => setForm({ ...form, address: v })}
              placeholder="Enter complete address"
              isTextarea
            />
          </div>

          {/* Financial Information */}
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wide flex items-center gap-2">
              <Wallet size={16} className="text-blue-600 dark:text-blue-400" />
              Financial Information
            </h3>
            <Input
              label="Opening Balance"
              type="number"
              name="opening_balance"
              id="opening_balance"
              icon={Wallet}
              value={form.opening_balance}
              onChange={(v) => setForm({ ...form, opening_balance: v })}
              placeholder="0.00"
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
                <User
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
                  Party Status
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
                name="is_active"
                id="is_active"
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
            {loading ? "Saving..." : party ? "Update Party" : "Save Party"}
          </button>
        </div>
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
  name,
  id,
  icon: Icon,
  isTextarea = false,
}) {
  const inputClasses = `
    w-full pl-11 pr-4 py-3 rounded-xl border-2 border-gray-200 dark:border-gray-700
    bg-white dark:bg-gray-900 text-gray-900 dark:text-white
    focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500
    outline-none transition-all duration-200
    placeholder:text-gray-400 dark:placeholder:text-gray-600
    ${isTextarea ? "min-h-[80px] resize-none" : ""}
  `;

  return (
    <div>
      <label
        htmlFor={id || name}
        className="block text-sm font-bold mb-2 text-gray-700 dark:text-gray-300"
      >
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      <div className="relative">
        {Icon && (
          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
            <Icon size={18} />
          </div>
        )}
        {isTextarea ? (
          <textarea
            name={name}
            id={id || name}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            required={required}
            placeholder={placeholder}
            autoFocus={autoFocus}
            className={inputClasses}
            rows={3}
          />
        ) : (
          <input
            type={type}
            name={name}
            id={id || name}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            required={required}
            placeholder={placeholder}
            autoFocus={autoFocus}
            className={inputClasses}
          />
        )}
      </div>
    </div>
  );
}

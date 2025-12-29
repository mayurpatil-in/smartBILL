import { useState, useEffect } from "react";
import {
  X,
  Save,
  Plus,
  Trash2,
  FileText,
  Building2,
  Calendar,
  Package,
} from "lucide-react";
import toast from "react-hot-toast";
import {
  createChallan,
  updateChallan,
  getNextChallanNumber,
} from "../api/challans";
import { getParties } from "../api/parties";
import { getItems } from "../api/items";

export default function AddChallanModal({ open, onClose, onSuccess, challan }) {
  const [loading, setLoading] = useState(false);
  const [parties, setParties] = useState([]);
  const [items, setItems] = useState([]);
  const [nextChallanNumber, setNextChallanNumber] = useState("");

  const [form, setForm] = useState({
    party_id: "",
    challan_date: new Date().toISOString().split("T")[0],
    notes: "",
    status: "draft",
    items: [{ item_id: "", quantity: 1 }],
  });

  const fetchData = async () => {
    try {
      const [partiesData, itemsData, challanNumberData] = await Promise.all([
        getParties(),
        getItems(),
        challan
          ? Promise.resolve({ next_challan_number: "" })
          : getNextChallanNumber(),
      ]);
      setParties(partiesData.filter((p) => p.is_active) || []);
      setItems(itemsData.filter((i) => i.is_active) || []);
      if (!challan) {
        setNextChallanNumber(challanNumberData.next_challan_number);
      }
    } catch (err) {
      console.error("Failed to load data", err);
    }
  };

  useEffect(() => {
    if (open) {
      fetchData();
    }
  }, [open]);

  useEffect(() => {
    if (challan) {
      setForm({
        party_id: challan.party_id,
        challan_date: challan.challan_date,
        notes: challan.notes || "",
        status: challan.status,
        items: challan.items.map((i) => ({
          item_id: i.item_id,
          quantity: i.quantity,
        })),
      });
    } else {
      setForm({
        party_id: "",
        challan_date: new Date().toISOString().split("T")[0],
        notes: "",
        status: "draft",
        items: [{ item_id: "", quantity: 1 }],
      });
    }
  }, [challan, open]);

  if (!open) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validation
    if (!form.party_id) {
      toast.error("Please select a party");
      return;
    }

    if (form.items.length === 0) {
      toast.error("Please add at least one item");
      return;
    }

    const invalidItems = form.items.filter(
      (i) => !i.item_id || i.quantity <= 0
    );
    if (invalidItems.length > 0) {
      toast.error("Please fill all item details correctly");
      return;
    }

    try {
      setLoading(true);
      const payload = {
        ...form,
        party_id: Number(form.party_id),
        items: form.items.map((i) => ({
          item_id: Number(i.item_id),
          quantity: Number(i.quantity),
        })),
      };

      if (challan) {
        await updateChallan(challan.id, payload);
        toast.success("Challan updated successfully");
      } else {
        await createChallan(payload);
        toast.success("Challan created successfully");
      }
      onSuccess();
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.detail || "Failed to save challan");
    } finally {
      setLoading(false);
    }
  };

  const addItemRow = () => {
    setForm({
      ...form,
      items: [...form.items, { item_id: "", quantity: 1 }],
    });
  };

  const removeItemRow = (index) => {
    const newItems = form.items.filter((_, i) => i !== index);
    setForm({ ...form, items: newItems });
  };

  const updateItemRow = (index, field, value) => {
    const newItems = [...form.items];
    newItems[index][field] = value;
    setForm({ ...form, items: newItems });
  };

  const getItemDetails = (itemId) => {
    return items.find((i) => i.id === Number(itemId));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
      <div className="bg-white dark:bg-gray-800 rounded-2xl w-full max-w-4xl shadow-2xl overflow-hidden animate-scale-in max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-gray-100 dark:border-gray-700 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-gray-900 dark:to-gray-800 sticky top-0 backdrop-blur-md z-10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center shadow-lg">
              <FileText size={20} className="text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                {challan ? "Edit Challan" : "Create New Challan"}
              </h2>
              {!challan && nextChallanNumber && (
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Challan No: {nextChallanNumber}
                </p>
              )}
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/50 dark:hover:bg-gray-700 rounded-full transition-all"
          >
            <X size={20} className="text-gray-600 dark:text-gray-400" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Basic Details */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wide">
              <Building2 size={16} className="text-blue-600" />
              Challan Details
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold mb-2 text-gray-700 dark:text-gray-300 flex items-center gap-1.5">
                  <Building2 size={14} className="text-gray-400" />
                  Party <span className="text-red-500">*</span>
                </label>
                <select
                  value={form.party_id}
                  onChange={(e) =>
                    setForm({ ...form, party_id: e.target.value })
                  }
                  required
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all"
                >
                  <option value="">Select Party</option>
                  {parties.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold mb-2 text-gray-700 dark:text-gray-300 flex items-center gap-1.5">
                  <Calendar size={14} className="text-gray-400" />
                  Date <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  value={form.challan_date}
                  onChange={(e) =>
                    setForm({ ...form, challan_date: e.target.value })
                  }
                  required
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all"
                />
              </div>
            </div>
          </div>

          {/* Items Section */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wide">
                <Package size={16} className="text-blue-600" />
                Items
              </div>
              <button
                type="button"
                onClick={addItemRow}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-medium transition-all shadow-md"
              >
                <Plus size={16} />
                Add Item
              </button>
            </div>

            <div className="space-y-3">
              {form.items.map((item, index) => {
                const itemDetails = getItemDetails(item.item_id);
                return (
                  <div
                    key={index}
                    className="flex gap-3 items-start p-4 bg-gray-50 dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700"
                  >
                    <div className="flex-1 grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-medium mb-1.5 text-gray-600 dark:text-gray-400">
                          Item
                        </label>
                        <select
                          value={item.item_id}
                          onChange={(e) =>
                            updateItemRow(index, "item_id", e.target.value)
                          }
                          required
                          className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none"
                        >
                          <option value="">Select Item</option>
                          {items.map((i) => (
                            <option key={i.id} value={i.id}>
                              {i.name}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-xs font-medium mb-1.5 text-gray-600 dark:text-gray-400">
                          Quantity
                        </label>
                        <input
                          type="number"
                          value={item.quantity}
                          onChange={(e) =>
                            updateItemRow(index, "quantity", e.target.value)
                          }
                          min="0.01"
                          step="0.01"
                          required
                          className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none"
                        />
                      </div>
                    </div>

                    {form.items.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeItemRow(index)}
                        className="mt-6 p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition"
                      >
                        <Trash2 size={18} />
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-semibold mb-2 text-gray-700 dark:text-gray-300">
              Notes (Optional)
            </label>
            <textarea
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              rows={3}
              placeholder="Add any additional notes..."
              className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all resize-none"
            />
          </div>

          {/* Status */}
          <div>
            <label className="block text-sm font-semibold mb-2 text-gray-700 dark:text-gray-300">
              Status
            </label>
            <select
              value={form.status}
              onChange={(e) => setForm({ ...form, status: e.target.value })}
              className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none"
            >
              <option value="draft">Draft</option>
              <option value="sent">Sent</option>
              <option value="delivered">Delivered</option>
            </select>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end gap-3 pt-6 border-t border-gray-200 dark:border-gray-700">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-2.5 rounded-xl text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700 font-semibold transition-all border border-gray-200 dark:border-gray-600"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex items-center gap-2 px-8 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-xl font-semibold shadow-lg shadow-blue-600/30 hover:shadow-xl hover:shadow-blue-600/40 disabled:opacity-70 disabled:cursor-not-allowed transition-all"
            >
              <Save size={18} />
              {loading
                ? "Saving..."
                : challan
                ? "Update Challan"
                : "Create Challan"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

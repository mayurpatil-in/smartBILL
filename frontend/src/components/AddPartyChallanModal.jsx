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
  Cog,
  TrendingUp,
} from "lucide-react";
import toast from "react-hot-toast";
import {
  createPartyChallan,
  updatePartyChallan,
  getNextPartyChallanNumber,
} from "../api/partyChallans";
import { getParties } from "../api/parties";
import { getItems } from "../api/items";
import { getProcesses } from "../api/processes";
import { getStock } from "../api/stock";

export default function AddPartyChallanModal({
  open,
  onClose,
  onSuccess,
  partyChallan,
}) {
  const [loading, setLoading] = useState(false);
  const [parties, setParties] = useState([]);
  const [items, setItems] = useState([]);
  const [processes, setProcesses] = useState([]);
  const [stockData, setStockData] = useState({});
  const [nextChallanNumber, setNextChallanNumber] = useState("");

  const [form, setForm] = useState({
    challan_number: "",
    party_id: "",
    challan_date: new Date().toISOString().split("T")[0],
    working_days: "",
    notes: "",
    items: [],
  });

  const [currentItem, setCurrentItem] = useState({
    item_id: "",
    process_id: "",
    quantity_ordered: "",
    rate: "",
  });

  const fetchData = async () => {
    try {
      const [
        partiesData,
        itemsData,
        processesData,
        stockResponse,
        challanNumberData,
      ] = await Promise.all([
        getParties(),
        getItems(),
        getProcesses(),
        getStock(),
        partyChallan
          ? Promise.resolve({ next_challan_number: "" })
          : getNextPartyChallanNumber(),
      ]);
      setParties(partiesData.filter((p) => p.is_active) || []);
      setItems(itemsData.filter((i) => i.is_active) || []);
      setProcesses(processesData.filter((p) => p.is_active) || []);

      // Create stock lookup map
      const stockMap = {};
      if (stockResponse && Array.isArray(stockResponse)) {
        stockResponse.forEach((stock) => {
          stockMap[stock.item_id] = stock.current_stock || 0;
        });
      }
      setStockData(stockMap);

      if (!partyChallan) {
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
    if (partyChallan) {
      setForm({
        challan_number: partyChallan.challan_number,
        party_id: partyChallan.party_id,
        challan_date: partyChallan.challan_date,
        working_days: partyChallan.working_days || "",
        notes: partyChallan.notes || "",
        items: partyChallan.items.map((i) => ({
          item_id: i.item_id,
          process_id: i.process_id || "",
          quantity_ordered: i.quantity_ordered,
          rate: i.rate || "",
        })),
      });
      setCurrentItem({
        item_id: "",
        process_id: "",
        quantity_ordered: "",
        rate: "",
      });
    } else {
      setForm({
        challan_number: "",
        party_id: "",
        challan_date: new Date().toISOString().split("T")[0],
        working_days: "",
        notes: "",
        items: [],
      });
      setCurrentItem({
        item_id: "",
        process_id: "",
        quantity_ordered: "",
        rate: "",
      });
    }
  }, [partyChallan, open]);

  if (!open) return null;

  const handleAddItem = () => {
    if (!currentItem.item_id) {
      toast.error("Please select an item");
      return;
    }
    if (!currentItem.quantity_ordered || currentItem.quantity_ordered <= 0) {
      toast.error("Please enter a valid quantity");
      return;
    }

    // Check for duplicate item with same process
    const isDuplicate = form.items.some(
      (item) =>
        item.item_id === currentItem.item_id &&
        item.process_id === currentItem.process_id
    );

    if (isDuplicate) {
      const itemName = getItemName(currentItem.item_id);
      const processName = currentItem.process_id
        ? getProcessName(currentItem.process_id)
        : "No Process";
      toast.error(`${itemName} with ${processName} is already added`);
      return;
    }

    setForm({
      ...form,
      items: [...form.items, { ...currentItem }],
    });
    setCurrentItem({
      item_id: "",
      process_id: "",
      quantity_ordered: "",
      rate: "",
    });
    toast.success("Item added successfully");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!form.challan_number || !form.challan_number.trim()) {
      toast.error("Please enter challan number");
      return;
    }

    if (!form.party_id) {
      toast.error("Please select a party");
      return;
    }

    if (form.items.length === 0) {
      toast.error("Please add at least one item");
      return;
    }

    const invalidItems = form.items.filter(
      (i) => !i.item_id || i.quantity_ordered <= 0
    );
    if (invalidItems.length > 0) {
      toast.error("Please fill all item details correctly");
      return;
    }

    try {
      setLoading(true);
      const payload = {
        challan_number: form.challan_number.trim(),
        party_id: Number(form.party_id),
        challan_date: form.challan_date,
        working_days: form.working_days ? Number(form.working_days) : null,
        notes: form.notes,
        items: form.items.map((i) => ({
          item_id: Number(i.item_id),
          process_id: i.process_id ? Number(i.process_id) : null,
          quantity_ordered: Number(i.quantity_ordered),
          rate: i.rate ? Number(i.rate) : null,
        })),
      };

      if (partyChallan) {
        await updatePartyChallan(partyChallan.id, payload);
        toast.success("Party Challan updated successfully");
      } else {
        await createPartyChallan(payload);
        toast.success("Party Challan created successfully");
      }
      onSuccess();
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.detail || "Failed to save party challan");
    } finally {
      setLoading(false);
    }
  };

  const addItemRow = () => {
    setForm({
      ...form,
      items: [
        ...form.items,
        { item_id: "", process_id: "", quantity_ordered: 1, rate: "" },
      ],
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

  const getAvailableQty = (itemId) => {
    return stockData[itemId] || 0;
  };

  // Filter items by selected party
  const getPartyItems = () => {
    if (!form.party_id) return [];
    return items.filter((item) => item.party_id === Number(form.party_id));
  };

  const getItemName = (itemId) => {
    const item = items.find((i) => i.id === Number(itemId));
    return item ? item.name : "Unknown";
  };

  const getProcessName = (processId) => {
    const process = processes.find((p) => p.id === Number(processId));
    return process ? process.name : "Unknown";
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
      <div className="bg-white dark:bg-gray-800 rounded-2xl w-full max-w-4xl shadow-2xl overflow-hidden animate-scale-in max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-gray-100 dark:border-gray-700 bg-gradient-to-r from-purple-50 to-blue-50 dark:from-gray-900 dark:to-gray-800 sticky top-0 backdrop-blur-md z-10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-600 to-blue-600 flex items-center justify-center shadow-lg">
              <FileText size={20} className="text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                {partyChallan ? "Edit Party Challan" : "Create Party Challan"}
              </h2>
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
              <Building2 size={16} className="text-purple-600" />
              Challan Details
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-semibold mb-2 text-gray-700 dark:text-gray-300 flex items-center gap-1.5">
                  <FileText size={14} className="text-gray-400" />
                  Challan No. <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={form.challan_number}
                  onChange={(e) =>
                    setForm({ ...form, challan_number: e.target.value })
                  }
                  placeholder="Enter challan number"
                  required
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 outline-none transition-all"
                />
              </div>

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
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 outline-none transition-all"
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
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 outline-none transition-all"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold mb-2 text-gray-700 dark:text-gray-300 flex items-center gap-1.5">
                  <TrendingUp size={14} className="text-gray-400" />
                  Working Days
                </label>
                <input
                  type="number"
                  value={form.working_days}
                  onChange={(e) =>
                    setForm({ ...form, working_days: e.target.value })
                  }
                  min="0"
                  placeholder="Optional"
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 outline-none transition-all"
                />
              </div>
            </div>
          </div>

          {/* Items Section */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wide">
              <Package size={16} className="text-purple-600" />
              Items
            </div>

            {/* Item Input Row */}
            <div className="bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 p-4 rounded-xl border-2 border-gray-200 dark:border-gray-700">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 items-end">
                <div>
                  <label className="block text-xs font-semibold mb-1.5 text-gray-700 dark:text-gray-300">
                    Select Item <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={currentItem.item_id}
                    onChange={(e) =>
                      setCurrentItem({
                        ...currentItem,
                        item_id: e.target.value,
                      })
                    }
                    className="w-full px-3 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 outline-none"
                  >
                    <option value="">
                      {form.party_id ? "Select Item" : "Select Party First"}
                    </option>
                    {getPartyItems().map((i) => (
                      <option key={i.id} value={i.id}>
                        {i.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold mb-1.5 text-gray-700 dark:text-gray-300">
                    Select Process
                  </label>
                  <select
                    value={currentItem.process_id}
                    onChange={(e) =>
                      setCurrentItem({
                        ...currentItem,
                        process_id: e.target.value,
                      })
                    }
                    className="w-full px-3 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 outline-none"
                  >
                    <option value="">Select Process</option>
                    {processes.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold mb-1.5 text-gray-700 dark:text-gray-300">
                    Available Qty
                  </label>
                  <div className="px-3 py-2.5 rounded-lg border-2 border-green-300 bg-green-50 dark:bg-green-900/20 dark:border-green-700 text-sm font-bold text-green-700 dark:text-green-400 flex items-center justify-center gap-1.5">
                    <Package size={14} />
                    {currentItem.item_id
                      ? getAvailableQty(currentItem.item_id)
                      : "-"}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold mb-1.5 text-gray-700 dark:text-gray-300">
                    Enter Qty <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    value={currentItem.quantity_ordered}
                    onChange={(e) =>
                      setCurrentItem({
                        ...currentItem,
                        quantity_ordered: e.target.value,
                      })
                    }
                    min="1"
                    placeholder="0"
                    className="w-full px-3 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 outline-none"
                  />
                </div>

                <button
                  type="button"
                  onClick={handleAddItem}
                  className="flex items-center justify-center gap-2 px-4 py-2.5 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white rounded-lg font-semibold transition-all shadow-md hover:shadow-lg"
                >
                  <Plus size={18} />
                  Add
                </button>
              </div>
            </div>

            {/* Items Table */}
            {form.items.length > 0 && (
              <div className="bg-white dark:bg-gray-800 rounded-xl border-2 border-gray-200 dark:border-gray-700 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gradient-to-r from-gray-700 to-gray-800 text-white">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider">
                          Item Name
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider">
                          Process
                        </th>
                        <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider">
                          Quantity
                        </th>
                        <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider">
                          Delete
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                      {form.items.map((item, index) => (
                        <tr
                          key={index}
                          className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                        >
                          <td className="px-4 py-3 text-sm text-gray-900 dark:text-white font-medium">
                            {getItemName(item.item_id)}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300">
                            {item.process_id
                              ? getProcessName(item.process_id)
                              : "-"}
                          </td>
                          <td className="px-4 py-3 text-sm text-right font-semibold text-gray-900 dark:text-white">
                            {item.quantity_ordered}
                          </td>
                          <td className="px-4 py-3 text-center">
                            <button
                              type="button"
                              onClick={() => removeItemRow(index)}
                              className="p-1.5 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                            >
                              <Trash2 size={16} />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="sticky bottom-0 flex justify-end gap-3 pt-6 pb-4 px-6 -mx-6 -mb-6 border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 backdrop-blur-md z-10">
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
              className="flex items-center gap-2 px-8 py-2.5 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white rounded-xl font-semibold shadow-lg shadow-purple-600/30 hover:shadow-xl hover:shadow-purple-600/40 disabled:opacity-70 disabled:cursor-not-allowed transition-all"
            >
              <Save size={18} />
              {loading ? "Saving..." : partyChallan ? "Update" : "Create"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

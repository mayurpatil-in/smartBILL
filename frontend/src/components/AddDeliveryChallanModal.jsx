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
  Truck,
  CheckCircle,
  XCircle,
  AlertTriangle,
} from "lucide-react";
import toast from "react-hot-toast";
import {
  createDeliveryChallan,
  updateDeliveryChallan,
  getNextDeliveryChallanNumber,
} from "../api/challans";
import { getParties } from "../api/parties";
import { getItems } from "../api/items";
import { getPartyChallansByItem } from "../api/partyChallans";

export default function AddDeliveryChallanModal({
  open,
  onClose,
  onSuccess,
  deliveryChallan,
}) {
  const [loading, setLoading] = useState(false);
  const [parties, setParties] = useState([]);
  const [items, setItems] = useState([]);
  const [partyChallansByItem, setPartyChallansByItem] = useState([]);
  const [nextChallanNumber, setNextChallanNumber] = useState("");

  const [form, setForm] = useState({
    party_id: "",
    challan_date: new Date().toISOString().split("T")[0],
    vehicle_number: "",
    notes: "",
    items: [],
  });

  const [currentItem, setCurrentItem] = useState({
    item_id: "",
    party_challan_id: "",
    party_challan_item_id: "",
    process_id: "",
    challan_qty: 0,
    pending_qty: 0,
    ok_qty: "",
    cr_qty: "",
    mr_qty: "",
    total_qty: 0,
  });

  const fetchData = async () => {
    try {
      const [partiesData, itemsData] = await Promise.all([
        getParties(),
        getItems(),
      ]);
      setParties(partiesData.filter((p) => p.is_active) || []);
      setItems(itemsData.filter((i) => i.is_active) || []);
    } catch (err) {
      console.error("Failed to load data", err);
    }
  };

  const handlePartyChange = async (partyId) => {
    setForm({ ...form, party_id: partyId });
    if (partyId) {
      try {
        const data = await getNextDeliveryChallanNumber(partyId);
        setNextChallanNumber(data.next_challan_number);
      } catch (err) {
        console.error("Failed to fetch next number", err);
      }
    } else {
      setNextChallanNumber("");
    }
  };

  useEffect(() => {
    if (open) {
      fetchData();
    }
  }, [open]);

  useEffect(() => {
    if (deliveryChallan) {
      setForm({
        party_id: deliveryChallan.party_id,
        challan_date: deliveryChallan.challan_date,
        vehicle_number: deliveryChallan.vehicle_number || "",
        notes: deliveryChallan.notes || "",
        items: deliveryChallan.items.map((i) => ({
          party_challan_item_id: i.party_challan_item_id,
          item_id: i.item?.id,
          party_challan_id: i.party_challan_item?.party_challan_id,
          process_id: i.process?.id,
          ok_qty: i.ok_qty,
          cr_qty: i.cr_qty,
          mr_qty: i.mr_qty,
          total_qty: i.quantity,
          challan_number:
            i.party_challan_item?.party_challan?.challan_number || "N/A",
          process_name: i.process?.name || "-",
        })),
      });
      // If editing, we don't fetch next number, we show current
    } else {
      setForm({
        party_id: "",
        challan_date: new Date().toISOString().split("T")[0],
        vehicle_number: "",
        notes: "",
        items: [],
      });
      setNextChallanNumber(""); // Reset when opening fresh
      setCurrentItem({
        item_id: "",
        party_challan_id: "",
        party_challan_item_id: "",
        process_id: "",
        challan_qty: 0,
        pending_qty: 0,
        ok_qty: "",
        cr_qty: "",
        mr_qty: "",
        total_qty: 0,
      });
    }
  }, [deliveryChallan, open]);

  if (!open) return null;

  // Filter items by selected party
  const getPartyItems = () => {
    if (!form.party_id) return [];
    return items.filter((item) => item.party_id === Number(form.party_id));
  };

  // When item selected, fetch party challans for that item
  const handleItemChange = async (itemId) => {
    setCurrentItem({
      ...currentItem,
      item_id: itemId,
      party_challan_item_id: "",
      challan_qty: 0,
      pending_qty: 0,
    });
    setPartyChallansByItem([]);

    if (form.party_id && itemId) {
      try {
        const challans = await getPartyChallansByItem(form.party_id, itemId);
        setPartyChallansByItem(challans);
      } catch (err) {
        console.error("Failed to load party challans", err);
      }
    }
  };

  // Calculate effective pending quantity (Backend Pending - Form Usage)
  const getEffectivePending = (item) => {
    const used = form.items
      .filter((i) => String(i.party_challan_item_id) === String(item.id))
      .reduce((sum, i) => sum + Number(i.total_qty || 0), 0);
    return Math.max(0, item.pending_qty - used);
  };

  // When challan item selected, populate quantities
  const handleChallanItemChange = (partyChallanItemId) => {
    let selectedItem = null;
    for (const challan of partyChallansByItem) {
      const item = challan.items.find(
        (i) => i.id === Number(partyChallanItemId)
      );
      if (item) {
        selectedItem = { ...item, challan_id: challan.id };
        break;
      }
    }

    if (selectedItem) {
      const effectivePending = getEffectivePending(selectedItem);
      setCurrentItem({
        ...currentItem,
        party_challan_item_id: partyChallanItemId,
        party_challan_id: selectedItem.challan_id,
        process_id: selectedItem.process_id,
        challan_qty: effectivePending,
        pending_qty: effectivePending,
      });
    }
  };

  // Auto-calculate total when quantities change
  const handleQtyChange = (field, value) => {
    const newItem = { ...currentItem, [field]: value || 0 };
    newItem.total_qty =
      Number(newItem.ok_qty || 0) +
      Number(newItem.cr_qty || 0) +
      Number(newItem.mr_qty || 0);

    setCurrentItem(newItem);
  };

  // Add item to table
  const handleAddItem = () => {
    if (!currentItem.item_id || !currentItem.party_challan_item_id) {
      toast.error("Please select item and challan");
      return;
    }

    if (currentItem.total_qty <= 0) {
      toast.error("Total quantity must be greater than 0");
      return;
    }

    if (currentItem.total_qty > currentItem.pending_qty) {
      toast.error(
        `Total quantity cannot exceed pending quantity (${currentItem.pending_qty})`
      );
      return;
    }

    // Check if already added
    const isDuplicate = form.items.some(
      (item) => item.party_challan_item_id === currentItem.party_challan_item_id
    );

    if (isDuplicate) {
      toast.error("This challan item is already added");
      return;
    }

    // Find challan number and process name
    let challanNumber = "";
    let processName = "-";

    for (const challan of partyChallansByItem) {
      const foundItem = challan.items.find(
        (i) => i.id === Number(currentItem.party_challan_item_id)
      );
      if (foundItem) {
        challanNumber = challan.challan_number;
        processName = foundItem.process_name || "-";
        break;
      }
    }

    setForm({
      ...form,
      items: [
        ...form.items,
        {
          ...currentItem,
          challan_number: challanNumber,
          process_name: processName,
        },
      ],
    });

    // Reset current item
    setCurrentItem({
      item_id: "",
      party_challan_id: "",
      party_challan_item_id: "",
      process_id: "",
      challan_qty: 0,
      pending_qty: 0,
      ok_qty: "",
      cr_qty: "",
      mr_qty: "",
      total_qty: 0,
    });
    setPartyChallansByItem([]);

    toast.success("Item added successfully");
  };

  const removeItemRow = (index) => {
    const newItems = form.items.filter((_, i) => i !== index);
    setForm({ ...form, items: newItems });
  };

  const getItemName = (itemId) => {
    const item = items.find((i) => i.id === Number(itemId));
    return item ? item.name : "Unknown";
  };

  const getChallanNumber = (challanId) => {
    for (const challan of partyChallansByItem) {
      if (challan.id === Number(challanId)) {
        return challan.challan_number;
      }
    }
    return "N/A";
  };

  const getProcessName = (processId) => {
    if (!processId) return "-";
    for (const challan of partyChallansByItem) {
      for (const item of challan.items) {
        if (item.process_id === Number(processId)) {
          return item.process_name || "-";
        }
      }
    }
    return "-";
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!form.party_id) {
      toast.error("Please select a party");
      return;
    }

    if (form.items.length === 0) {
      toast.error("Please add at least one item");
      return;
    }

    try {
      setLoading(true);
      const payload = {
        party_id: Number(form.party_id),
        challan_date: form.challan_date,
        vehicle_number: form.vehicle_number,
        notes: form.notes,
        items: form.items.map((i) => ({
          party_challan_item_id: Number(i.party_challan_item_id),
          ok_qty: Number(i.ok_qty || 0),
          cr_qty: Number(i.cr_qty || 0),
          mr_qty: Number(i.mr_qty || 0),
          quantity: Number(i.total_qty),
        })),
      };

      if (deliveryChallan) {
        await updateDeliveryChallan(deliveryChallan.id, payload);
        toast.success("Delivery Challan updated successfully");
      } else {
        await createDeliveryChallan(payload);
        toast.success("Delivery Challan created successfully");
      }
      onSuccess();
      onClose();
    } catch (err) {
      toast.error(
        err.response?.data?.detail || "Failed to save delivery challan"
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
      <div className="bg-white dark:bg-gray-800 rounded-2xl w-full max-w-6xl shadow-2xl overflow-hidden animate-scale-in max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-100 dark:border-gray-700 bg-gradient-to-r from-purple-50 to-blue-50 dark:from-gray-900 dark:to-gray-800 sticky top-0 backdrop-blur-md z-10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-600 to-blue-600 flex items-center justify-center shadow-lg">
              <FileText size={20} className="text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                {deliveryChallan
                  ? "Edit Delivery Challan"
                  : "Create Delivery Challan"}
              </h2>
              {!deliveryChallan && nextChallanNumber && (
                <p className="text-sm text-gray-500 dark:text-gray-400">
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
          {/* Challan Details */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wide">
              <Building2 size={16} className="text-purple-600" />
              Challan Details
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-semibold mb-2 text-gray-700 dark:text-gray-300 flex items-center gap-1.5">
                  <Building2 size={14} className="text-gray-400" />
                  Party <span className="text-red-500">*</span>
                </label>
                <select
                  value={form.party_id}
                  onChange={(e) => handlePartyChange(e.target.value)}
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
                  <Truck size={14} className="text-gray-400" />
                  Vehicle Number
                </label>
                <input
                  type="text"
                  value={form.vehicle_number}
                  onChange={(e) =>
                    setForm({ ...form, vehicle_number: e.target.value })
                  }
                  placeholder="MH-12-AB-1234"
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
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-3 items-end">
                {/* Select Item */}
                <div className="lg:col-span-3">
                  <label className="block text-xs font-semibold mb-1.5 text-gray-700 dark:text-gray-300">
                    Select Item <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={currentItem.item_id}
                    onChange={(e) => handleItemChange(e.target.value)}
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

                {/* Total Pending Qty Display */}
                <div className="lg:col-span-2">
                  <label className="block text-xs font-semibold mb-1.5 text-gray-700 dark:text-gray-300">
                    Total Pending Qty
                  </label>
                  <div
                    className={`px-3 py-2.5 rounded-lg border-2 text-sm font-bold flex items-center justify-center ${
                      currentItem.item_id
                        ? "border-orange-300 bg-orange-50 dark:bg-orange-900/20 dark:border-orange-700 text-orange-700 dark:text-orange-400"
                        : "border-gray-200 bg-gray-50 dark:bg-gray-800 dark:border-gray-700 text-gray-400"
                    }`}
                  >
                    {currentItem.item_id
                      ? `${partyChallansByItem.reduce(
                          (acc, challan) =>
                            acc +
                            challan.items.reduce(
                              (sum, item) => sum + getEffectivePending(item),
                              0
                            ),
                          0
                        )} units`
                      : "-"}
                  </div>
                </div>

                {/* Select Challan */}
                <div className="lg:col-span-3">
                  <label className="block text-xs font-semibold mb-1.5 text-gray-700 dark:text-gray-300">
                    Select Challan <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={currentItem.party_challan_item_id}
                    onChange={(e) => handleChallanItemChange(e.target.value)}
                    disabled={!currentItem.item_id}
                    className="w-full px-3 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 outline-none disabled:opacity-50"
                  >
                    <option value="">Select Challan</option>
                    {partyChallansByItem.map((challan) =>
                      challan.items.map((item) => (
                        <option key={item.id} value={item.id}>
                          {challan.challan_number} -{" "}
                          {item.process_name || "No Process"} (Pending:{" "}
                          {getEffectivePending(item)})
                        </option>
                      ))
                    )}
                  </select>
                </div>

                {/* Challan Qty */}
                <div className="lg:col-span-1">
                  <label className="block text-xs font-semibold mb-1.5 text-gray-700 dark:text-gray-300">
                    Challan Qty
                  </label>
                  <div className="px-3 py-2.5 rounded-lg border-2 border-blue-300 bg-blue-50 dark:bg-blue-900/20 dark:border-blue-700 text-sm font-bold text-blue-700 dark:text-blue-400 flex items-center justify-center">
                    {currentItem.challan_qty || "-"}
                  </div>
                </div>

                {/* OK Qty */}
                <div className="lg:col-span-1">
                  <label className="flex items-center gap-1.5 text-xs font-semibold mb-1.5 text-gray-700 dark:text-gray-300">
                    <CheckCircle className="h-3.5 w-3.5 text-green-600 dark:text-green-400" />
                    OK Qty <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    value={currentItem.ok_qty}
                    onChange={(e) => handleQtyChange("ok_qty", e.target.value)}
                    min="0"
                    placeholder="0"
                    className="w-full px-3 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-green-50/50 dark:bg-green-900/10 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-green-500/20 focus:border-green-500 outline-none transition-colors"
                  />
                </div>

                {/* CR Qty */}
                <div className="lg:col-span-1">
                  <label className="flex items-center gap-1.5 text-xs font-semibold mb-1.5 text-gray-700 dark:text-gray-300">
                    <XCircle className="h-3.5 w-3.5 text-red-600 dark:text-red-400" />
                    CR Qty
                  </label>
                  <input
                    type="number"
                    value={currentItem.cr_qty}
                    onChange={(e) => handleQtyChange("cr_qty", e.target.value)}
                    min="0"
                    placeholder="0"
                    className="w-full px-3 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-red-50/50 dark:bg-red-900/10 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-red-500/20 focus:border-red-500 outline-none transition-colors"
                  />
                </div>

                {/* MR Qty */}
                <div className="lg:col-span-1">
                  <label className="flex items-center gap-1.5 text-xs font-semibold mb-1.5 text-gray-700 dark:text-gray-300">
                    <AlertTriangle className="h-3.5 w-3.5 text-orange-600 dark:text-orange-400" />
                    MR Qty
                  </label>
                  <input
                    type="number"
                    value={currentItem.mr_qty}
                    onChange={(e) => handleQtyChange("mr_qty", e.target.value)}
                    min="0"
                    placeholder="0"
                    className="w-full px-3 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-orange-50/50 dark:bg-orange-900/10 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 outline-none transition-colors"
                  />
                </div>
              </div>

              {/* Total Qty Display */}
              <div className="mt-3 flex justify-between items-center">
                <span className="text-lg font-bold text-gray-900 dark:text-white">
                  Total Qty:{" "}
                  <span className="text-purple-600 dark:text-purple-400">
                    {currentItem.total_qty}
                  </span>
                </span>
                <button
                  type="button"
                  onClick={handleAddItem}
                  className="flex items-center justify-center gap-2 px-6 py-2.5 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white rounded-lg font-semibold transition-all shadow-md hover:shadow-lg"
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
                          Challan No.
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider">
                          Process
                        </th>
                        <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider">
                          <div className="flex items-center justify-end gap-1">
                            <CheckCircle size={14} className="text-green-400" />
                            OK
                          </div>
                        </th>
                        <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider">
                          <div className="flex items-center justify-end gap-1">
                            <XCircle size={14} className="text-red-400" />
                            CR
                          </div>
                        </th>
                        <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider">
                          <div className="flex items-center justify-end gap-1">
                            <AlertTriangle
                              size={14}
                              className="text-orange-400"
                            />
                            MR
                          </div>
                        </th>
                        <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider">
                          Total
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
                            {item.challan_number || "N/A"}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300">
                            {item.process_name || "-"}
                          </td>
                          <td className="px-4 py-3 text-sm text-right text-green-600 dark:text-green-400 font-medium">
                            {item.ok_qty}
                          </td>
                          <td className="px-4 py-3 text-sm text-right text-red-600 dark:text-red-400 font-medium">
                            {item.cr_qty}
                          </td>
                          <td className="px-4 py-3 text-sm text-right text-orange-600 dark:text-orange-400 font-medium">
                            {item.mr_qty}
                          </td>
                          <td className="px-4 py-3 text-sm text-right font-bold text-purple-600 dark:text-purple-400">
                            {item.total_qty}
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
              {loading ? "Saving..." : deliveryChallan ? "Update" : "Create"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

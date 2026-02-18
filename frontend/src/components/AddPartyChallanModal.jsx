import { useState, useEffect, useRef } from "react";
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
import { getPartyChallansByItem } from "../api/partyChallans";

import {
  formatDate,
  getFinancialYearStartDate,
  getFinancialYearEndDate,
} from "../utils/dateUtils";

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
  const scrollContainerRef = useRef(null);
  const partySelectRef = useRef(null);
  const itemSelectRef = useRef(null);

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
    pending_at_party: 0,
  });

  const handleItemChange = async (itemId) => {
    let pending = 0;
    if (form.party_id && itemId) {
      try {
        const challans = await getPartyChallansByItem(form.party_id, itemId);
        pending = challans.reduce(
          (acc, challan) =>
            acc +
            challan.items.reduce(
              (sum, item) => sum + Number(item.pending_qty || 0),
              0,
            ),
          0,
        );
      } catch (err) {
        console.error("Failed to fetch pending qty", err);
      }
    }
    setCurrentItem((prev) => ({
      ...prev,
      item_id: itemId,
      pending_at_party: pending,
    }));
  };

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
      // Auto-focus on party select when modal opens
      setTimeout(() => {
        if (partySelectRef.current) {
          partySelectRef.current.focus();
        }
      }, 100);
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
        item.process_id === currentItem.process_id,
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

    // Auto-scroll to bottom to show the newly added item
    setTimeout(() => {
      if (scrollContainerRef.current) {
        scrollContainerRef.current.scrollTo({
          top: scrollContainerRef.current.scrollHeight,
          behavior: "smooth",
        });
      }
      // Auto-focus on item select for quick addition of next item
      if (itemSelectRef.current) {
        itemSelectRef.current.focus();
      }
    }, 100);
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
      (i) => !i.item_id || i.quantity_ordered <= 0,
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

  const getEffectiveQtyAtParty = (item) => {
    const currentPending = Number(item.pending_at_party || 0);
    const addedInForm = form.items
      .filter((i) => i.item_id === item.item_id)
      .reduce((sum, i) => sum + Number(i.quantity_ordered || 0), 0);
    return currentPending + addedInForm;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-fade-in">
      <div className="bg-white dark:bg-gray-800 rounded-3xl w-full max-w-5xl shadow-2xl overflow-hidden animate-scale-in max-h-[92vh] flex flex-col border border-gray-200/50 dark:border-gray-700/50">
        {/* Header */}
        <div className="flex items-center justify-between p-4 sm:p-6 border-b border-gray-100 dark:border-gray-700 bg-gradient-to-r from-purple-500 via-purple-600 to-blue-600 sticky top-0 backdrop-blur-xl z-10 shadow-lg">
          <div className="flex items-center gap-3 sm:gap-4 flex-1 min-w-0">
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center shadow-xl border border-white/30 flex-shrink-0">
              <FileText size={20} className="text-white sm:w-6 sm:h-6" />
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="text-lg sm:text-xl md:text-2xl font-bold text-white drop-shadow-md truncate">
                {partyChallan ? "Edit Party Challan" : "Create Party Challan"}
              </h2>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 sm:p-2.5 hover:bg-white/20 rounded-lg sm:rounded-xl transition-all duration-200 group flex-shrink-0"
          >
            <X
              size={20}
              className="text-white group-hover:rotate-90 transition-transform duration-200 sm:w-[22px] sm:h-[22px]"
            />
          </button>
        </div>

        {/* Scrollable Content */}
        <div ref={scrollContainerRef} className="flex-1 overflow-y-auto">
          <form onSubmit={handleSubmit} className="p-6 space-y-6">
            {/* Basic Details */}
            <div className="space-y-4">
              <div className="flex items-center gap-2.5 text-sm font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-600 to-blue-600 uppercase tracking-wide">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center shadow-md">
                  <Building2 size={16} className="text-white" />
                </div>
                Challan Details
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
                {/* Party - Wider */}
                <div className="group lg:col-span-2">
                  <label
                    htmlFor="party_id"
                    className="block text-sm font-semibold mb-2 text-gray-700 dark:text-gray-300 flex items-center gap-1.5"
                  >
                    <Building2 size={14} className="text-purple-500" />
                    Party <span className="text-red-500">*</span>
                  </label>
                  <select
                    ref={partySelectRef}
                    name="party_id"
                    id="party_id"
                    value={form.party_id}
                    onChange={(e) =>
                      setForm({ ...form, party_id: e.target.value })
                    }
                    required
                    className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-900/50 text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500/30 focus:border-purple-500 outline-none transition-all duration-200 hover:border-purple-300 dark:hover:border-purple-700 cursor-pointer"
                  >
                    <option value="">Select Party</option>
                    {parties.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Challan No */}
                <div className="group">
                  <label
                    htmlFor="challan_number"
                    className="block text-sm font-semibold mb-2 text-gray-700 dark:text-gray-300 flex items-center gap-1.5"
                  >
                    <FileText size={14} className="text-purple-500" />
                    Challan No. <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="challan_number"
                    id="challan_number"
                    value={form.challan_number}
                    onChange={(e) =>
                      setForm({ ...form, challan_number: e.target.value })
                    }
                    placeholder="Enter challan number"
                    required
                    className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-900/50 text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500/30 focus:border-purple-500 outline-none transition-all duration-200 hover:border-purple-300 dark:hover:border-purple-700"
                  />
                </div>

                {/* Date */}
                <div className="group">
                  <label
                    htmlFor="challan_date"
                    className="block text-sm font-semibold mb-2 text-gray-700 dark:text-gray-300 flex items-center gap-1.5"
                  >
                    <Calendar size={14} className="text-purple-500" />
                    Date <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    name="challan_date"
                    id="challan_date"
                    value={form.challan_date}
                    min={getFinancialYearStartDate()}
                    max={getFinancialYearEndDate()}
                    onChange={(e) =>
                      setForm({ ...form, challan_date: e.target.value })
                    }
                    required
                    className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-900/50 text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500/30 focus:border-purple-500 outline-none transition-all duration-200 hover:border-purple-300 dark:hover:border-purple-700 cursor-pointer"
                  />
                </div>

                <div className="group">
                  <label
                    htmlFor="working_days"
                    className="block text-sm font-semibold mb-2 text-gray-700 dark:text-gray-300 flex items-center gap-1.5"
                  >
                    <TrendingUp size={14} className="text-purple-500" />
                    Working Days
                  </label>
                  <input
                    type="number"
                    name="working_days"
                    id="working_days"
                    value={form.working_days}
                    onChange={(e) =>
                      setForm({ ...form, working_days: e.target.value })
                    }
                    min="0"
                    placeholder="Optional"
                    className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-900/50 text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500/30 focus:border-purple-500 outline-none transition-all duration-200 hover:border-purple-300 dark:hover:border-purple-700"
                  />
                </div>
              </div>
            </div>

            {/* Items Section */}
            <div className="space-y-4">
              <div className="sticky top-0 z-20 flex items-center gap-2.5 text-sm font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-600 to-blue-600 uppercase tracking-wide py-3 bg-white dark:bg-gray-800 backdrop-blur-md -mx-6 px-6">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center shadow-md">
                  <Package size={16} className="text-white" />
                </div>
                Items
              </div>

              {/* Item Input Row */}
              <div className="sticky top-[52px] z-10 bg-gradient-to-br from-purple-50/50 via-blue-50/30 to-indigo-50/50 dark:from-gray-900/80 dark:via-gray-800/60 dark:to-gray-900/80 p-5 rounded-2xl border-2 border-purple-200/50 dark:border-gray-700/50 shadow-sm hover:shadow-md transition-shadow duration-200 backdrop-blur-md">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-4 items-end">
                  {/* Select Item */}
                  <div className="lg:col-span-4">
                    <label
                      htmlFor="item_id"
                      className="block text-xs font-bold mb-2 text-gray-700 dark:text-gray-300 uppercase tracking-wide"
                    >
                      Select Item <span className="text-red-500">*</span>
                    </label>
                    <select
                      ref={itemSelectRef}
                      name="item_id"
                      id="item_id"
                      value={currentItem.item_id}
                      onChange={(e) => handleItemChange(e.target.value)}
                      className="w-full px-4 py-2.5 rounded-xl border-2 border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm font-medium text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500/30 focus:border-purple-500 outline-none transition-all duration-200 hover:border-purple-400 dark:hover:border-purple-600 cursor-pointer shadow-sm"
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

                  {/* Select Process */}
                  <div className="lg:col-span-3">
                    <label
                      htmlFor="process_id"
                      className="block text-xs font-bold mb-2 text-gray-700 dark:text-gray-300 uppercase tracking-wide"
                    >
                      Select Process
                    </label>
                    <select
                      name="process_id"
                      id="process_id"
                      value={currentItem.process_id}
                      onChange={(e) =>
                        setCurrentItem({
                          ...currentItem,
                          process_id: e.target.value,
                        })
                      }
                      className="w-full px-4 py-2.5 rounded-xl border-2 border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm font-medium text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500/30 focus:border-purple-500 outline-none transition-all duration-200 hover:border-purple-400 dark:hover:border-purple-600 cursor-pointer shadow-sm"
                    >
                      <option value="">Select Process</option>
                      {processes.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Qty at Party Display */}
                  <div className="lg:col-span-2">
                    <span className="block text-xs font-bold mb-2 text-gray-700 dark:text-gray-300 uppercase tracking-wide">
                      Qty at Party
                    </span>
                    <div
                      className={`px-4 py-2.5 rounded-xl border-2 text-sm font-bold flex items-center justify-center transition-all duration-200 shadow-sm ${
                        currentItem.item_id
                          ? "border-orange-300 bg-gradient-to-br from-orange-50 to-amber-50 dark:from-orange-900/30 dark:to-amber-900/20 dark:border-orange-600 text-orange-700 dark:text-orange-400 shadow-orange-200/50 dark:shadow-orange-900/30"
                          : "border-gray-200 bg-white dark:bg-gray-800 dark:border-gray-700 text-gray-400"
                      }`}
                    >
                      {currentItem.item_id
                        ? `${getEffectiveQtyAtParty(currentItem)} units`
                        : "-"}
                    </div>
                  </div>

                  {/* Enter Qty */}
                  <div className="lg:col-span-2">
                    <label
                      htmlFor="quantity_ordered"
                      className="block text-xs font-bold mb-2 text-gray-700 dark:text-gray-300 uppercase tracking-wide"
                    >
                      Enter Qty <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="number"
                      name="quantity_ordered"
                      id="quantity_ordered"
                      value={currentItem.quantity_ordered}
                      onChange={(e) =>
                        setCurrentItem({
                          ...currentItem,
                          quantity_ordered: e.target.value,
                        })
                      }
                      min="1"
                      placeholder="0"
                      className="w-full px-4 py-2.5 rounded-xl border-2 border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm font-medium text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500/30 focus:border-purple-500 outline-none transition-all duration-200 hover:border-purple-400 dark:hover:border-purple-600 shadow-sm"
                    />
                  </div>

                  {/* Add Button */}
                  <div className="lg:col-span-1">
                    <button
                      type="button"
                      onClick={handleAddItem}
                      className="w-full flex items-center justify-center px-4 py-2.5 bg-gradient-to-r from-purple-600 via-purple-500 to-blue-600 hover:from-purple-700 hover:via-purple-600 hover:to-blue-700 text-white rounded-xl font-bold transition-all duration-200 shadow-lg shadow-purple-500/40 hover:shadow-xl hover:shadow-purple-500/50 hover:scale-105 active:scale-95"
                    >
                      <Plus size={20} strokeWidth={2.5} />
                    </button>
                  </div>
                </div>
              </div>

              {/* Items Table */}
              {form.items.length > 0 && (
                <div className="sticky top-[280px] bg-white dark:bg-gray-800 rounded-2xl border-2 border-gray-200 dark:border-gray-700 overflow-hidden shadow-md">
                  {/* Fixed Table Header */}
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-gradient-to-r from-purple-600 via-purple-500 to-blue-600 text-white">
                        <tr>
                          <th className="px-5 py-4 text-left text-xs font-bold uppercase tracking-wider bg-purple-600 w-[35%]">
                            Item Name
                          </th>
                          <th className="px-5 py-4 text-left text-xs font-bold uppercase tracking-wider bg-purple-600 w-[30%]">
                            Process
                          </th>
                          <th className="px-5 py-4 text-right text-xs font-bold uppercase tracking-wider bg-purple-600 w-[20%]">
                            Quantity
                          </th>
                          <th className="px-5 py-4 text-center text-xs font-bold uppercase tracking-wider bg-purple-600 w-[15%]">
                            Action
                          </th>
                        </tr>
                      </thead>
                    </table>
                  </div>

                  {/* Scrollable Table Body */}
                  <div className="overflow-x-auto overflow-y-auto max-h-[240px]">
                    <table className="w-full">
                      <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                        {form.items.map((item, index) => (
                          <tr
                            key={index}
                            className="hover:bg-purple-50/50 dark:hover:bg-gray-700/50 transition-colors duration-150 group"
                          >
                            <td className="px-5 py-4 text-sm text-gray-900 dark:text-white font-semibold w-[35%]">
                              {getItemName(item.item_id)}
                            </td>
                            <td className="px-5 py-4 text-sm text-gray-600 dark:text-gray-300 font-medium w-[30%]">
                              {item.process_id ? (
                                getProcessName(item.process_id)
                              ) : (
                                <span className="text-gray-400 italic">
                                  No Process
                                </span>
                              )}
                            </td>
                            <td className="px-5 py-4 text-sm text-right font-bold text-purple-600 dark:text-purple-400 w-[20%]">
                              {item.quantity_ordered}
                            </td>
                            <td className="px-5 py-4 text-center w-[15%]">
                              <button
                                type="button"
                                onClick={() => removeItemRow(index)}
                                className="p-2 text-red-600 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-xl transition-all duration-200 hover:scale-110 active:scale-95 group-hover:shadow-md"
                              >
                                <Trash2 size={18} strokeWidth={2} />
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
            <div className="sticky bottom-0 flex justify-end gap-4 pt-6 pb-4 px-6 -mx-6 -mb-6 border-t-2 border-gray-200 dark:border-gray-700 bg-gradient-to-b from-white to-gray-50/80 dark:from-gray-800 dark:to-gray-900/80 backdrop-blur-xl z-10">
              <button
                type="button"
                onClick={onClose}
                className="px-8 py-3 rounded-xl text-gray-700 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 font-bold transition-all duration-200 border-2 border-gray-300 dark:border-gray-600 hover:scale-105 active:scale-95 shadow-md"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="flex items-center gap-2.5 px-10 py-3 bg-gradient-to-r from-purple-600 via-purple-500 to-blue-600 hover:from-purple-700 hover:via-purple-600 hover:to-blue-700 text-white rounded-xl font-bold shadow-xl shadow-purple-500/40 hover:shadow-2xl hover:shadow-purple-500/50 disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:scale-100 transition-all duration-200 hover:scale-105 active:scale-95"
              >
                <Save size={20} strokeWidth={2.5} />
                {loading
                  ? "Saving..."
                  : partyChallan
                    ? "Update Challan"
                    : "Create Challan"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

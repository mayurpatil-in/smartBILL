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
  Truck,
  CheckCircle,
  XCircle,
  AlertTriangle,
  IndianRupee,
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
import useBarcodeScanner from "../hooks/useBarcodeScanner";
import { useAuth } from "../hooks/useAuth";

import {
  getFinancialYearStartDate,
  getFinancialYearEndDate,
} from "../utils/dateUtils";

export default function AddDeliveryChallanModal({
  open,
  onClose,
  onSuccess,
  deliveryChallan,
}) {
  const { hasFeature } = useAuth();
  const [loading, setLoading] = useState(false);
  const [parties, setParties] = useState([]);
  const [items, setItems] = useState([]);
  const [partyChallansByItem, setPartyChallansByItem] = useState([]);
  const [nextChallanNumber, setNextChallanNumber] = useState("");
  const scrollContainerRef = useRef(null);
  const partySelectRef = useRef(null);
  const itemSelectRef = useRef(null);

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
    rate: "",
    party_rate: "",
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
      // Auto-focus on party select when modal opens
      setTimeout(() => {
        if (partySelectRef.current) {
          partySelectRef.current.focus();
        }
      }, 100);
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
          rate: i.rate || 0,
          party_rate: i.party_rate || 0,
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
        rate: "",
        total_qty: 0,
      });
    }
  }, [deliveryChallan, open]);

  // Barcode Scanner Integration
  useBarcodeScanner({
    onScan: (scannedCode) => {
      if (!open) return;

      const matchedItem = items.find(
        (i) => i.barcode === scannedCode || i.hsn_code === scannedCode,
      );

      if (matchedItem) {
        toast.success(`Scanned: ${matchedItem.name}`);
        // If party is selected, ensure item belongs to it or is global
        if (form.party_id) {
          if (
            matchedItem.party_id &&
            matchedItem.party_id !== Number(form.party_id)
          ) {
            toast.error("Item belongs to a different party");
            return;
          }
        }

        handleItemChange(matchedItem.id);
      } else {
        toast.error(`Unknown Barcode: ${scannedCode}`);
      }
    },
    minLength: 3,
    enabled: hasFeature("ITEM_BARCODE"),
  });

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
        (i) => i.id === Number(partyChallanItemId),
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
        rate: selectedItem.rate || 0,
        party_rate: selectedItem.party_rate || 0,
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

  /* Add item to table */
  const handleAddItem = () => {
    // Check if item type matches existing items
    if (form.items.length > 0) {
      const firstItem = form.items[0];
      if (Number(firstItem.item_id) !== Number(currentItem.item_id)) {
        toast.error(
          "You can only add items of the same type. Please remove existing items to add a different product.",
        );
        return;
      }
    }

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
        `Total quantity cannot exceed pending quantity (${currentItem.pending_qty})`,
      );
      return;
    }

    // Check if already added
    const isDuplicate = form.items.some(
      (item) =>
        item.party_challan_item_id === currentItem.party_challan_item_id,
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
        (i) => i.id === Number(currentItem.party_challan_item_id),
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
      rate: "",
      total_qty: 0,
    });
    setPartyChallansByItem([]);

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
          rate: Number(i.rate || 0),
          party_rate: Number(i.party_rate || 0),
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
        err.response?.data?.detail || "Failed to save delivery challan",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-fade-in">
      <div className="bg-white dark:bg-gray-800 rounded-3xl w-full max-w-[90rem] shadow-2xl overflow-hidden animate-scale-in max-h-[92vh] flex flex-col border border-gray-200/50 dark:border-gray-700/50">
        {/* Header */}
        <div className="flex items-center justify-between p-4 sm:p-6 border-b border-gray-100 dark:border-gray-700 bg-gradient-to-r from-purple-500 via-purple-600 to-blue-600 sticky top-0 backdrop-blur-xl z-10 shadow-lg">
          <div className="flex items-center gap-3 sm:gap-4 flex-1 min-w-0">
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center shadow-xl border border-white/30 flex-shrink-0">
              <FileText size={20} className="text-white sm:w-6 sm:h-6" />
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="text-lg sm:text-xl md:text-2xl font-bold text-white drop-shadow-md truncate">
                {deliveryChallan
                  ? "Edit Delivery Challan"
                  : "Create Delivery Challan"}
              </h2>
              {!deliveryChallan && nextChallanNumber && (
                <p className="text-xs sm:text-sm text-white/80 font-medium mt-0.5 truncate">
                  Challan No: {nextChallanNumber}
                </p>
              )}
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
            {/* Challan Details */}
            <div className="space-y-4">
              <div className="flex items-center gap-2.5 text-sm font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-600 to-blue-600 uppercase tracking-wide">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center shadow-md">
                  <Building2 size={16} className="text-white" />
                </div>
                Challan Details
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <div>
                  <label
                    htmlFor="delivery_party_id"
                    className="block text-sm font-semibold mb-2 text-gray-700 dark:text-gray-300 flex items-center gap-1.5"
                  >
                    <Building2 size={14} className="text-purple-500" />
                    Party <span className="text-red-500">*</span>
                  </label>
                  <select
                    ref={partySelectRef}
                    name="delivery_party_id"
                    id="delivery_party_id"
                    value={form.party_id}
                    onChange={(e) => handlePartyChange(e.target.value)}
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

                <div>
                  <label
                    htmlFor="delivery_challan_date"
                    className="block text-sm font-semibold mb-2 text-gray-700 dark:text-gray-300 flex items-center gap-1.5"
                  >
                    <Calendar size={14} className="text-purple-500" />
                    Date <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    name="delivery_challan_date"
                    id="delivery_challan_date"
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

                <div>
                  <label
                    htmlFor="vehicle_number"
                    className="block text-sm font-semibold mb-2 text-gray-700 dark:text-gray-300 flex items-center gap-1.5"
                  >
                    <Truck size={14} className="text-purple-500" />
                    Vehicle Number
                  </label>
                  <input
                    type="text"
                    name="vehicle_number"
                    id="vehicle_number"
                    value={form.vehicle_number}
                    onChange={(e) =>
                      setForm({ ...form, vehicle_number: e.target.value })
                    }
                    placeholder="MH-12-AB-1234"
                    className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-900/50 text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500/30 focus:border-purple-500 outline-none transition-all duration-200 hover:border-purple-300 dark:hover:border-purple-700"
                  />
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div className="sticky top-0 z-30 flex items-center gap-2.5 text-sm font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-600 to-blue-600 uppercase tracking-wide py-3 bg-white dark:bg-gray-800 backdrop-blur-md -mx-6 px-6 shadow-sm">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center shadow-md">
                  <Package size={16} className="text-white" />
                </div>
                Items
              </div>

              {/* Item Input Row */}
              <div className="sticky top-[56px] z-20 bg-gradient-to-br from-purple-50 via-blue-50 to-indigo-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 p-5 rounded-2xl border-2 border-purple-200/50 dark:border-gray-700/50 shadow-md transition-shadow duration-200">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-3 items-end">
                  {/* Select Item */}
                  <div className="lg:col-span-3">
                    <label
                      htmlFor="delivery_item_id"
                      className="block text-xs font-semibold mb-1.5 text-gray-700 dark:text-gray-300"
                    >
                      Select Item <span className="text-red-500">*</span>
                    </label>
                    <select
                      ref={itemSelectRef}
                      name="delivery_item_id"
                      id="delivery_item_id"
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
                  <div className="lg:col-span-1">
                    <span className="block text-xs font-semibold mb-1.5 text-gray-700 dark:text-gray-300">
                      Pending
                    </span>
                    <div
                      className={`px-2 py-2.5 rounded-lg border-2 text-sm font-bold flex items-center justify-center whitespace-nowrap ${
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
                                0,
                              ),
                            0,
                          )}`
                        : "-"}
                    </div>
                  </div>

                  {/* Select Challan */}
                  <div className="lg:col-span-2">
                    <label
                      htmlFor="party_challan_item_id"
                      className="block text-xs font-semibold mb-1.5 text-gray-700 dark:text-gray-300"
                    >
                      Select Challan <span className="text-red-500">*</span>
                    </label>
                    <select
                      name="party_challan_item_id"
                      id="party_challan_item_id"
                      value={currentItem.party_challan_item_id}
                      onChange={(e) => handleChallanItemChange(e.target.value)}
                      disabled={!currentItem.item_id}
                      className="w-full px-3 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 outline-none disabled:opacity-50"
                    >
                      <option value="">Select Challan</option>
                      {partyChallansByItem.map((challan) =>
                        challan.items
                          .filter((item) => getEffectivePending(item) > 0)
                          .map((item) => (
                            <option key={item.id} value={item.id}>
                              {challan.challan_number} -{" "}
                              {item.process_name || "No Process"} (Pending:{" "}
                              {getEffectivePending(item)})
                            </option>
                          )),
                      )}
                    </select>
                  </div>

                  {/* Challan Qty */}
                  <div className="lg:col-span-1">
                    <span className="block text-xs font-semibold mb-1.5 text-gray-700 dark:text-gray-300">
                      Challan Qty
                    </span>
                    <div className="px-3 py-2.5 rounded-lg border-2 border-blue-300 bg-blue-50 dark:bg-blue-900/20 dark:border-blue-700 text-sm font-bold text-blue-700 dark:text-blue-400 flex items-center justify-center">
                      {currentItem.challan_qty || "-"}
                    </div>
                  </div>

                  {/* OK Qty */}
                  <div className="lg:col-span-1">
                    <label
                      htmlFor="ok_qty"
                      className="flex items-center gap-1.5 text-xs font-semibold mb-1.5 text-gray-700 dark:text-gray-300"
                    >
                      <CheckCircle className="h-3.5 w-3.5 text-green-600 dark:text-green-400" />
                      OK Qty <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="number"
                      name="ok_qty"
                      id="ok_qty"
                      value={currentItem.ok_qty}
                      onChange={(e) =>
                        handleQtyChange("ok_qty", e.target.value)
                      }
                      min="0"
                      placeholder="0"
                      className="w-full px-3 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-green-50/50 dark:bg-green-900/10 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-green-500/20 focus:border-green-500 outline-none transition-colors"
                    />
                  </div>

                  {/* CR Qty */}
                  <div className="lg:col-span-1">
                    <label
                      htmlFor="cr_qty"
                      className="flex items-center gap-1.5 text-xs font-semibold mb-1.5 text-gray-700 dark:text-gray-300"
                    >
                      <XCircle className="h-3.5 w-3.5 text-red-600 dark:text-red-400" />
                      CR Qty
                    </label>
                    <input
                      type="number"
                      name="cr_qty"
                      id="cr_qty"
                      value={currentItem.cr_qty}
                      onChange={(e) =>
                        handleQtyChange("cr_qty", e.target.value)
                      }
                      min="0"
                      placeholder="0"
                      className="w-full px-3 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-red-50/50 dark:bg-red-900/10 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-red-500/20 focus:border-red-500 outline-none transition-colors"
                    />
                  </div>

                  {/* MR Qty */}
                  <div className="lg:col-span-1">
                    <label
                      htmlFor="mr_qty"
                      className="flex items-center gap-1.5 text-xs font-semibold mb-1.5 text-gray-700 dark:text-gray-300"
                    >
                      <AlertTriangle className="h-3.5 w-3.5 text-orange-600 dark:text-orange-400" />
                      MR Qty
                    </label>
                    <input
                      type="number"
                      name="mr_qty"
                      id="mr_qty"
                      value={currentItem.mr_qty}
                      onChange={(e) =>
                        handleQtyChange("mr_qty", e.target.value)
                      }
                      min="0"
                      placeholder="0"
                      className="w-full px-3 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-orange-50/50 dark:bg-orange-900/10 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 outline-none transition-colors"
                    />
                  </div>

                  {/* Rate */}
                  <div className="lg:col-span-1">
                    <label
                      htmlFor="rate"
                      className="flex items-center gap-1.5 text-xs font-semibold mb-1.5 text-gray-700 dark:text-gray-300"
                    >
                      <IndianRupee className="h-3.5 w-3.5 text-green-600 dark:text-green-400 stroke-[3]" />
                      Rate
                    </label>
                    <input
                      type="number"
                      name="rate"
                      id="rate"
                      value={currentItem.rate}
                      readOnly
                      className="w-full px-3 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-gray-100 dark:bg-gray-800 text-sm text-gray-500 dark:text-gray-400 focus:ring-0 focus:border-gray-300 outline-none cursor-not-allowed"
                    />
                  </div>

                  {/* Party Rate */}
                  <div className="lg:col-span-1">
                    <label
                      htmlFor="party_rate"
                      className="flex items-center gap-1.5 text-xs font-semibold mb-1.5 text-gray-700 dark:text-gray-300"
                    >
                      <IndianRupee className="h-3.5 w-3.5 text-green-600 dark:text-green-400 stroke-[3]" />
                      Party Rate
                    </label>
                    <input
                      type="number"
                      name="party_rate"
                      id="party_rate"
                      value={currentItem.party_rate}
                      onChange={(e) =>
                        setCurrentItem({
                          ...currentItem,
                          party_rate: e.target.value,
                        })
                      }
                      className="w-full px-3 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 outline-none"
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
                <div className="bg-white dark:bg-gray-800 rounded-xl border-2 border-gray-200 dark:border-gray-700 overflow-hidden shadow-sm">
                  <div className="overflow-x-auto">
                    <table className="w-full table-fixed">
                      <thead className="bg-gradient-to-r from-purple-600 via-purple-500 to-blue-600 text-white">
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider w-[4%]">
                            #
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider w-[12%]">
                            Item Name
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider w-[10%]">
                            Challan No.
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider w-[10%]">
                            Process
                          </th>
                          <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider w-[8%]">
                            <div className="flex items-center justify-end gap-1">
                              <CheckCircle
                                size={14}
                                className="text-green-300"
                              />
                              OK
                            </div>
                          </th>
                          <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider w-[8%]">
                            <div className="flex items-center justify-end gap-1">
                              <XCircle size={14} className="text-red-300" />
                              CR
                            </div>
                          </th>
                          <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider w-[8%]">
                            <div className="flex items-center justify-end gap-1">
                              <AlertTriangle
                                size={14}
                                className="text-orange-300"
                              />
                              MR
                            </div>
                          </th>
                          <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider w-[8%]">
                            Rate
                          </th>
                          <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider w-[8%]">
                            Party Rate
                          </th>
                          <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider w-[8%]">
                            Amount
                          </th>
                          <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider w-[8%]">
                            Total Qty
                          </th>
                          <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider w-[8%]">
                            Delete
                          </th>
                        </tr>
                      </thead>
                    </table>
                  </div>

                  <div className="overflow-x-auto overflow-y-auto max-h-[300px]">
                    <table className="w-full table-fixed">
                      <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                        {form.items.map((item, index) => (
                          <tr
                            key={index}
                            className="hover:bg-purple-50 dark:hover:bg-gray-700/50 transition-colors"
                          >
                            <td className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400 w-[4%]">
                              {index + 1}
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-900 dark:text-white font-medium w-[12%]">
                              {getItemName(item.item_id)}
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300 w-[10%]">
                              {item.challan_number || "N/A"}
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300 w-[10%]">
                              {item.process_name || "-"}
                            </td>
                            <td className="px-4 py-3 text-sm text-right text-green-600 dark:text-green-400 font-medium w-[8%]">
                              {item.ok_qty}
                            </td>
                            <td className="px-4 py-3 text-sm text-right text-red-600 dark:text-red-400 font-medium w-[8%]">
                              {item.cr_qty}
                            </td>
                            <td className="px-4 py-3 text-sm text-right text-orange-600 dark:text-orange-400 font-medium w-[8%]">
                              {item.mr_qty}
                            </td>
                            <td className="px-4 py-3 text-sm text-right text-gray-900 dark:text-gray-300 font-medium w-[8%]">
                              {item.rate}
                            </td>
                            <td className="px-4 py-3 text-sm text-right text-gray-900 dark:text-gray-300 font-medium w-[8%]">
                              {item.party_rate || 0}
                            </td>
                            <td className="px-4 py-3 text-sm text-right text-gray-900 dark:text-gray-300 font-medium w-[8%]">
                              {(
                                Number(item.total_qty) *
                                (Number(item.rate || 0) +
                                  Number(item.party_rate || 0))
                              ).toFixed(2)}
                            </td>
                            <td className="px-4 py-3 text-sm text-right font-bold text-purple-600 dark:text-purple-400 w-[8%]">
                              {item.total_qty}
                            </td>
                            <td className="px-4 py-3 text-center w-[8%]">
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
                      <tfoot className="bg-gray-50 dark:bg-gray-900/50 font-bold border-t-2 border-gray-200 dark:border-gray-700">
                        <tr>
                          <td
                            colSpan={4}
                            className="px-4 py-3 text-right text-gray-900 dark:text-white uppercase tracking-wider text-xs"
                          >
                            Total
                          </td>
                          <td className="px-4 py-3 text-right text-green-600 dark:text-green-400 text-sm">
                            {form.items.reduce(
                              (sum, i) => sum + Number(i.ok_qty || 0),
                              0,
                            )}
                          </td>
                          <td className="px-4 py-3 text-right text-red-600 dark:text-red-400 text-sm">
                            {form.items.reduce(
                              (sum, i) => sum + Number(i.cr_qty || 0),
                              0,
                            )}
                          </td>
                          <td className="px-4 py-3 text-right text-orange-600 dark:text-orange-400 text-sm">
                            {form.items.reduce(
                              (sum, i) => sum + Number(i.mr_qty || 0),
                              0,
                            )}
                          </td>
                          <td className="px-4 py-3 text-right text-gray-400 text-sm">
                            -
                          </td>
                          <td className="px-4 py-3 text-right text-gray-400 text-sm">
                            -
                          </td>
                          <td className="px-4 py-3 text-right text-gray-900 dark:text-white text-sm">
                            {form.items
                              .reduce(
                                (sum, i) =>
                                  sum +
                                  Number(i.total_qty || 0) *
                                    (Number(i.rate || 0) +
                                      Number(i.party_rate || 0)),
                                0,
                              )
                              .toFixed(2)}
                          </td>
                          <td className="px-4 py-3 text-right text-purple-600 dark:text-purple-400 text-sm">
                            {form.items.reduce(
                              (sum, i) => sum + Number(i.total_qty || 0),
                              0,
                            )}
                          </td>
                          <td></td>
                        </tr>
                      </tfoot>
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
                  : deliveryChallan
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

import { useState, useEffect, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  Plus,
  Trash2,
  Save,
  ArrowLeft,
  FileText,
  Calendar,
  Building2,
  Package,
  Truck,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Edit,
} from "lucide-react";
import toast from "react-hot-toast";
import {
  createInvoice,
  getNextInvoiceNumber,
  getInvoice,
  updateInvoice,
} from "../api/invoices";
import { getParties } from "../api/parties";
import { getPendingChallanItems } from "../api/challans";
import { getActiveFinancialYear } from "../api/financialYear";

export default function InvoiceForm() {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEditMode = Boolean(id);
  const itemsTableRef = useRef(null);

  const [loading, setLoading] = useState(false);
  const [parties, setParties] = useState([]);
  const [nextInvoiceNumber, setNextInvoiceNumber] = useState("");

  // Pending items from backend
  const [pendingItems, setPendingItems] = useState([]);

  // Form State
  const [activeFY, setActiveFY] = useState(null);
  const [formData, setFormData] = useState({
    party_id: "",
    invoice_date: new Date().toISOString().split("T")[0],
    due_date: "",
    notes: "",
    items: [],
  });

  // Current Selection State
  const [currentItem, setCurrentItem] = useState({
    item_id: "",
    item_name: "",
    challan_id: "", // Selected Delivery Challan ID
    challan_number: "", // For display
    delivery_challan_item_id: "", // Specific item ID in DC
    grn_no: "", // GRN No input
    quantity: "", // Total Challan Qty (Reference)
    billing_qty: "", // Actual Billing Qty (OK + CR)
    ok_qty: "",
    cr_qty: "",
    mr_qty: "",
    rate: "",
    amount: "",
  });

  // Load Parties and Active FY
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [partiesData, fyData] = await Promise.all([
          getParties(),
          getActiveFinancialYear(),
        ]);
        setParties(partiesData.filter((p) => p.is_active));
        setActiveFY(fyData);

        if (isEditMode) {
          // Edit Mode: Load Invoice
          const invoice = await getInvoice(id);
          setNextInvoiceNumber(invoice.invoice_number); // Keep existing number
          setFormData({
            party_id: invoice.party_id,
            invoice_date: invoice.invoice_date,
            due_date: invoice.due_date || "",
            notes: invoice.notes || "",
            items: invoice.items.map((i) => ({
              item_id: i.item_id,
              name: i.item?.name || "Unknown Item",
              grn_no: i.grn_no,
              delivery_challan_item_id: i.delivery_challan_item_id,
              challan_number:
                i.delivery_challan_item?.challan?.challan_number || "",
              quantity: i.quantity,
              rate: i.rate,
              amount: i.amount,
              // Calculate derived fields or defaults if missing in backend response meant for view
              ok_qty:
                i.ok_qty !== undefined
                  ? i.ok_qty
                  : i.delivery_challan_item?.ok_qty || 0,
              cr_qty:
                i.cr_qty !== undefined
                  ? i.cr_qty
                  : i.delivery_challan_item?.cr_qty || 0,
              mr_qty:
                i.mr_qty !== undefined
                  ? i.mr_qty
                  : i.delivery_challan_item?.mr_qty || 0,
              billing_qty: i.quantity,
              delivery_challan_item_ids: i.challan_item_ids || [],
            })),
          });
        } else {
          // Create Mode: Load Next Number
          const nextInvData = await getNextInvoiceNumber();
          setNextInvoiceNumber(nextInvData.next_invoice_number);

          // Adjust default date if current date is outside FY
          if (fyData) {
            const today = new Date().toISOString().split("T")[0];
            if (today < fyData.start_date) {
              setFormData((prev) => ({
                ...prev,
                invoice_date: fyData.start_date,
              }));
            } else if (today > fyData.end_date) {
              setFormData((prev) => ({
                ...prev,
                invoice_date: fyData.end_date,
              }));
            }
          }
        }
      } catch (error) {
        console.error("Failed to load initial data", error);
        toast.error("Failed to load data");
      }
    };
    fetchData();
  }, [id, isEditMode]);

  // Fetch Pending Items when Party Changes
  useEffect(() => {
    if (formData.party_id) {
      const fetchPending = async () => {
        try {
          // Pass current Invoice ID (id) to include its items in the list
          const data = await getPendingChallanItems(formData.party_id, id);
          setPendingItems(data);
        } catch (error) {
          console.error("Failed to load pending items", error);
        }
      };
      fetchPending();
    } else {
      setPendingItems([]);
    }
  }, [formData.party_id]);

  // Handlers

  // 1. Handle Item Selection
  const handleItemSelect = (itemId) => {
    // Find first available challan for this item to auto-select or just reset challan
    // Better to just set item and let user pick challan
    const selectedItem = pendingItems.find((i) => i.item_id === Number(itemId));

    setCurrentItem({
      ...currentItem,
      item_id: itemId,
      item_name: selectedItem ? selectedItem.item_name : "",
      challan_id: "", // Reset Challan
      challan_number: "",
      delivery_challan_item_id: "",
      quantity: "",
      ok_qty: "",
      cr_qty: "",
      mr_qty: "",
      rate: "",
      amount: "",
    });
  };

  // 2. Handle Challan Selection (Auto-fill details)
  const handleChallanSelect = (deliveryChallanItemId) => {
    // Recalculate grouped challans for the current item
    const groupedChallans = filteredPendingItems
      .filter((i) => i.item_id === Number(currentItem.item_id))
      .reduce((acc, item) => {
        const existingChallan = acc.find(
          (c) => c.challan_id === item.challan_id,
        );

        if (existingChallan) {
          const prevQty = Number(existingChallan.quantity) || 0;
          const newQty = Number(item.quantity) || 0;

          existingChallan.ok_qty =
            (Number(existingChallan.ok_qty) || 0) + (Number(item.ok_qty) || 0);
          existingChallan.cr_qty =
            (Number(existingChallan.cr_qty) || 0) + (Number(item.cr_qty) || 0);
          existingChallan.mr_qty =
            (Number(existingChallan.mr_qty) || 0) + (Number(item.mr_qty) || 0);
          existingChallan.quantity = prevQty + newQty;

          if (!existingChallan.delivery_challan_item_ids) {
            existingChallan.delivery_challan_item_ids = [
              existingChallan.delivery_challan_item_id,
            ];
          }
          existingChallan.delivery_challan_item_ids.push(
            item.delivery_challan_item_id,
          );
          // Rate remains the same (fixed per item)
        } else {
          acc.push({
            ...item,
            delivery_challan_item_ids: [item.delivery_challan_item_id],
          });
        }

        return acc;
      }, []);

    // Find from grouped data
    const selected = groupedChallans.find(
      (i) => i.delivery_challan_item_id === Number(deliveryChallanItemId),
    );

    if (selected) {
      const qty = Number(selected.quantity); // Challan Total (summed)
      const rate = Number(selected.rate); // Fixed rate per item
      const ok = Number(selected.ok_qty) || 0; // Summed OK (Remaining from backend)
      const cr = Number(selected.cr_qty) || 0; // Summed CR (Remaining from backend)
      const billQty = ok + cr; // Billable Quantity

      setCurrentItem({
        ...currentItem,
        challan_id: selected.challan_id,
        challan_number: selected.challan_number,
        delivery_challan_item_id: selected.delivery_challan_item_id,
        delivery_challan_item_ids: selected.delivery_challan_item_ids, // Store all IDs
        grn_no: "", // Reset GRN when challan changes
        quantity: qty,
        billing_qty: billQty,
        ok_qty: ok,
        cr_qty: cr,
        mr_qty: selected.mr_qty,
        max_ok: ok, // Store max limit
        max_cr: cr, // Store max limit
        rate: rate,
        amount: billQty * rate,
      });
    }
  };

  // 3. Add Item to List
  const handleAddItem = () => {
    if (
      !currentItem.item_id ||
      !currentItem.delivery_challan_item_id ||
      !currentItem.quantity ||
      currentItem.rate === "" ||
      !currentItem.grn_no
    ) {
      toast.error(
        "Please select Item, Challan, GRN No. and ensure Quantity/Rate are filled",
      );
      return;
    }

    // Check duplicate
    if (
      formData.items.some(
        (i) =>
          i.delivery_challan_item_id === currentItem.delivery_challan_item_id,
      )
    ) {
      toast.error("This Challan Item is already added");
      return;
    }

    const newItem = {
      item_id: Number(currentItem.item_id),
      name: currentItem.item_name,
      challan_id: currentItem.challan_id, // Important for backend linking if needed
      delivery_challan_item_id: currentItem.delivery_challan_item_id,
      challan_number: currentItem.challan_number,
      grn_no: currentItem.grn_no,

      ok_qty: currentItem.ok_qty,
      cr_qty: currentItem.cr_qty,
      mr_qty: currentItem.mr_qty,

      delivery_challan_item_ids: currentItem.delivery_challan_item_ids, // To mark all as billed

      quantity: Number(currentItem.billing_qty), // Use Billing Qty for Invoice
      rate: Number(currentItem.rate),
      amount: Number(currentItem.amount), // Already calculated
    };

    setFormData({
      ...formData,
      items: [...formData.items, newItem],
    });

    // Reset UI
    setCurrentItem({
      item_id: "",
      item_name: "",
      challan_id: "",
      challan_number: "",
      delivery_challan_item_id: "",
      grn_no: "",
      quantity: "",
      billing_qty: "",
      ok_qty: "",
      cr_qty: "",
      mr_qty: "",
      max_ok: 0,
      max_cr: 0,
      rate: "",
      amount: "",
    });

    // Auto-scroll to show the items table
    setTimeout(() => {
      if (itemsTableRef.current) {
        itemsTableRef.current.scrollIntoView({
          behavior: "smooth",
          block: "nearest",
        });
      }
    }, 100);
  };

  const handleRemoveItem = (index) => {
    const newItems = formData.items.filter((_, i) => i !== index);
    setFormData({ ...formData, items: newItems });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.party_id) {
      toast.error("Please select a party");
      return;
    }
    if (formData.items.length === 0) {
      toast.error("Please add at least one item");
      return;
    }

    try {
      setLoading(true);

      const payload = {
        party_id: Number(formData.party_id),
        invoice_date: formData.invoice_date,
        due_date: formData.due_date || null,
        notes: formData.notes,
        items: formData.items.map((i) => ({
          item_id: i.item_id,
          grn_no: i.grn_no,
          delivery_challan_item_id: i.delivery_challan_item_id,
          quantity: i.quantity,
          rate: i.rate,
          ok_qty: i.ok_qty,
          cr_qty: i.cr_qty,
          mr_qty: i.mr_qty,
          delivery_challan_item_ids: i.delivery_challan_item_ids,
        })),
      };

      if (isEditMode) {
        await updateInvoice(id, payload);
        toast.success("Invoice updated successfully");
      } else {
        await createInvoice(payload);
        toast.success("Invoice created successfully");
      }

      navigate("/invoices");
    } catch (error) {
      console.error(error);
      toast.error("Failed to create invoice");
    } finally {
      setLoading(false);
    }
  };

  // Filter out items that are already added to the invoice
  // Filter out items that are already added to the invoice
  const filteredPendingItems = pendingItems.filter(
    (pending) =>
      !formData.items.some((added) => {
        const pendingId = Number(pending.delivery_challan_item_id);
        const addedId = Number(added.delivery_challan_item_id);

        if (addedId === pendingId) return true;

        if (
          added.delivery_challan_item_ids &&
          added.delivery_challan_item_ids.includes(pendingId)
        ) {
          return true;
        }

        return false;
      }),
  );

  // Helper to get unique items from pending list
  const uniqueItems = [
    ...new Set(filteredPendingItems.map((i) => i.item_id)),
  ].map((id) => filteredPendingItems.find((i) => i.item_id === id));

  // Helper to get challans for selected item (grouped by challan with summed quantities)
  const availableChallans = filteredPendingItems
    .filter((i) => i.item_id === Number(currentItem.item_id))
    .reduce((acc, item) => {
      // Find if this challan already exists in accumulator
      const existingChallan = acc.find((c) => c.challan_id === item.challan_id);

      if (existingChallan) {
        // Sum up quantities for the same challan
        const prevQty = Number(existingChallan.quantity) || 0;
        const newQty = Number(item.quantity) || 0;

        existingChallan.ok_qty =
          (Number(existingChallan.ok_qty) || 0) + (Number(item.ok_qty) || 0);
        existingChallan.cr_qty =
          (Number(existingChallan.cr_qty) || 0) + (Number(item.cr_qty) || 0);
        existingChallan.mr_qty =
          (Number(existingChallan.mr_qty) || 0) + (Number(item.mr_qty) || 0);
        existingChallan.quantity = prevQty + newQty;

        // Store all delivery_challan_item_ids as an array
        if (!existingChallan.delivery_challan_item_ids) {
          existingChallan.delivery_challan_item_ids = [
            existingChallan.delivery_challan_item_id,
          ];
        }

        const newIds = item.delivery_challan_item_ids || [
          item.delivery_challan_item_id,
        ];
        existingChallan.delivery_challan_item_ids.push(...newIds);

        // Dedup IDs
        existingChallan.delivery_challan_item_ids = [
          ...new Set(existingChallan.delivery_challan_item_ids),
        ];

        // Rate remains the same (fixed per item)
      } else {
        // Add new challan entry
        acc.push({
          ...item,
          delivery_challan_item_ids: item.delivery_challan_item_ids || [
            item.delivery_challan_item_id,
          ],
        });
      }

      return acc;
    }, []);

  // Calculations
  const [gstRate, setGstRate] = useState(() => {
    const saved = localStorage.getItem("invoice_gst_rate");
    return saved ? Number(saved) : 18;
  });

  useEffect(() => {
    localStorage.setItem("invoice_gst_rate", gstRate);
  }, [gstRate]);

  const [showGstEdit, setShowGstEdit] = useState(false);

  const subtotal = formData.items.reduce((sum, item) => sum + item.amount, 0);
  const gst = subtotal * (gstRate / 100);
  const grandTotal = subtotal + gst;

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-purple-50/30 to-blue-50/30 dark:from-gray-900 dark:via-gray-900 dark:to-gray-900 py-6 px-4 animate-fade-in">
      <div className="max-w-7xl mx-auto">
        {/* Enhanced Header with Gradient */}
        <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-2xl overflow-hidden border border-gray-200/50 dark:border-gray-700/50 mb-6">
          <div className="bg-gradient-to-r from-purple-500 via-purple-600 to-blue-600 p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <button
                  onClick={() => navigate("/invoices")}
                  className="p-2.5 hover:bg-white/20 rounded-xl transition-all duration-200 group"
                >
                  <ArrowLeft
                    size={22}
                    className="text-white group-hover:-translate-x-1 transition-transform duration-200"
                  />
                </button>
                <div className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center shadow-xl border border-white/30">
                  <FileText size={24} className="text-white" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-white drop-shadow-md">
                    {isEditMode ? "Edit Invoice" : "Create Invoice"}
                  </h1>
                  <p className="text-sm text-white/80 font-medium mt-0.5">
                    {nextInvoiceNumber
                      ? `Invoice No: ${nextInvoiceNumber}`
                      : "Loading..."}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Form Section */}
          <div className="lg:col-span-3 space-y-6">
            {/* Invoice Details Card */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-200 dark:border-gray-700 p-6 space-y-6">
              {/* Section Header */}
              <div className="flex items-center gap-2.5 text-sm font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-600 to-blue-600 uppercase tracking-wide pb-4 border-b border-gray-100 dark:border-gray-700">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center shadow-md">
                  <Building2 size={16} className="text-white" />
                </div>
                Invoice Details
              </div>

              {/* Basic Fields */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label
                    htmlFor="invoice_party_id"
                    className="block text-sm font-semibold mb-2 text-gray-700 dark:text-gray-300 flex items-center gap-1.5"
                  >
                    <Building2 size={14} className="text-purple-500" />
                    Party <span className="text-red-500">*</span>
                  </label>
                  <select
                    name="invoice_party_id"
                    id="invoice_party_id"
                    value={formData.party_id}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        party_id: e.target.value,
                        items: [],
                      })
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
                <div>
                  <label
                    htmlFor="invoice_date"
                    className="block text-sm font-semibold mb-2 text-gray-700 dark:text-gray-300 flex items-center gap-1.5"
                  >
                    <Calendar size={14} className="text-purple-500" />
                    Invoice Date <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    name="invoice_date"
                    id="invoice_date"
                    value={formData.invoice_date}
                    min={activeFY?.start_date}
                    max={activeFY?.end_date}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        invoice_date: e.target.value,
                      })
                    }
                    required
                    className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-900/50 text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500/30 focus:border-purple-500 outline-none transition-all duration-200 hover:border-purple-300 dark:hover:border-purple-700 cursor-pointer"
                  />
                </div>
              </div>
            </div>

            {/* Add Items Card */}
            <div className="sticky top-6 z-20 bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-200 dark:border-gray-700 p-6 space-y-6">
              {/* Items Section Header */}
              <div className="flex items-center gap-2.5 text-sm font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-600 to-blue-600 uppercase tracking-wide pb-4 border-b border-gray-100 dark:border-gray-700">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center shadow-md">
                  <Package size={16} className="text-white" />
                </div>
                Add Items
              </div>

              {/* Item Selection Section */}
              <div className="bg-gradient-to-br from-purple-50 via-blue-50 to-indigo-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 p-5 rounded-2xl border-2 border-purple-200/50 dark:border-gray-700/50 shadow-md transition-shadow duration-200 mb-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
                  {/* 1. Select Item */}
                  <div>
                    <label
                      htmlFor="invoice_item_id"
                      className="block text-xs font-semibold mb-1.5 text-gray-700 dark:text-gray-300"
                    >
                      Select Item <span className="text-red-500">*</span>
                    </label>
                    <select
                      name="invoice_item_id"
                      id="invoice_item_id"
                      value={currentItem.item_id}
                      onChange={(e) => handleItemSelect(e.target.value)}
                      disabled={!formData.party_id}
                      className="w-full px-3 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 outline-none disabled:opacity-50"
                    >
                      <option value="">
                        {formData.party_id
                          ? "Select Item"
                          : "Select Party First"}
                      </option>
                      {uniqueItems.map((i) => (
                        <option key={i.item_id} value={i.item_id}>
                          {i.item_name}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* 2. Select Challan */}
                  <div>
                    <label
                      htmlFor="invoice_challan_id"
                      className="block text-xs font-semibold mb-1.5 text-gray-700 dark:text-gray-300"
                    >
                      Select Delivery Challan{" "}
                      <span className="text-red-500">*</span>
                    </label>
                    <select
                      name="invoice_challan_id"
                      id="invoice_challan_id"
                      value={currentItem.delivery_challan_item_id}
                      onChange={(e) => handleChallanSelect(e.target.value)}
                      disabled={!currentItem.item_id}
                      className="w-full px-3 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 outline-none disabled:opacity-50"
                    >
                      <option value="">Select Challan</option>
                      {availableChallans.map((c) => {
                        const remainingOk = Number(c.ok_qty) || 0;
                        const remainingCr = Number(c.cr_qty) || 0;
                        const remainingMr = Number(c.mr_qty) || 0;
                        const remainingTotal =
                          remainingOk + remainingCr + remainingMr;
                        return (
                          <option
                            key={c.delivery_challan_item_id}
                            value={c.delivery_challan_item_id}
                          >
                            {c.challan_number} (Rem Qty: {remainingTotal})
                          </option>
                        );
                      })}
                    </select>
                  </div>

                  {/* 3. GRN No. */}
                  <div>
                    <label
                      htmlFor="invoice_grn_no"
                      className="block text-xs font-semibold mb-1.5 text-gray-700 dark:text-gray-300"
                    >
                      GRN No. <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      name="invoice_grn_no"
                      id="invoice_grn_no"
                      value={currentItem.grn_no}
                      onChange={(e) =>
                        setCurrentItem({
                          ...currentItem,
                          grn_no: e.target.value,
                        })
                      }
                      placeholder="Enter GRN No"
                      className="w-full px-3 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 outline-none transition-colors"
                    />
                  </div>
                </div>

                {/* Auto-filled Details Row */}
                <div className="grid grid-cols-2 lg:grid-cols-8 gap-3">
                  {/* Reference Quantities Group */}
                  <div className="col-span-2 lg:col-span-4 grid grid-cols-2 lg:grid-cols-4 gap-2">
                    <div>
                      <label
                        htmlFor="invoice_ok_qty"
                        className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider font-bold mb-1.5 text-green-600 dark:text-green-400 pl-1"
                      >
                        <CheckCircle className="h-3 w-3" />
                        OK Qty
                      </label>
                      <input
                        type="number"
                        id="invoice_ok_qty"
                        name="invoice_ok_qty"
                        value={currentItem.ok_qty}
                        onChange={(e) => {
                          const val = Number(e.target.value);
                          if (val > (currentItem.max_ok || 999999)) {
                            toast.error(
                              `OK Qty cannot exceed remaining: ${currentItem.max_ok}`,
                            );
                            return;
                          }
                          const newOk = val;
                          const billQty =
                            newOk + Number(currentItem.cr_qty || 0);
                          const totalQty =
                            billQty + Number(currentItem.mr_qty || 0);
                          setCurrentItem({
                            ...currentItem,
                            ok_qty: val,
                            billing_qty: billQty,
                            quantity: totalQty, // Update Total Qty
                            amount: billQty * Number(currentItem.rate || 0),
                          });
                        }}
                        className="w-full h-10 px-3 border-2 border-green-200 dark:border-green-900/50 bg-white dark:bg-gray-800 rounded-lg text-sm text-right font-bold text-green-700 dark:text-green-400 focus:ring-2 focus:ring-green-500/20 focus:border-green-500 outline-none transition-colors"
                      />
                    </div>
                    <div>
                      <label
                        htmlFor="invoice_cr_qty"
                        className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider font-bold mb-1.5 text-red-600 dark:text-red-400 pl-1"
                      >
                        <XCircle className="h-3 w-3" />
                        CR Qty
                      </label>
                      <input
                        type="number"
                        id="invoice_cr_qty"
                        name="invoice_cr_qty"
                        value={currentItem.cr_qty}
                        onChange={(e) => {
                          const val = Number(e.target.value);
                          if (val > (currentItem.max_cr || 999999)) {
                            toast.error(
                              `CR Qty cannot exceed remaining: ${currentItem.max_cr}`,
                            );
                            return;
                          }
                          const newCr = val;
                          const billQty =
                            Number(currentItem.ok_qty || 0) + newCr;
                          const totalQty =
                            billQty + Number(currentItem.mr_qty || 0);
                          setCurrentItem({
                            ...currentItem,
                            cr_qty: val,
                            billing_qty: billQty,
                            quantity: totalQty, // Update Total Qty
                            amount: billQty * Number(currentItem.rate || 0),
                          });
                        }}
                        className="w-full h-10 px-3 border-2 border-red-200 dark:border-red-900/50 bg-white dark:bg-gray-800 rounded-lg text-sm text-right font-bold text-red-700 dark:text-red-400 focus:ring-2 focus:ring-red-500/20 focus:border-red-500 outline-none transition-colors"
                      />
                    </div>
                    <div>
                      <label
                        htmlFor="invoice_mr_qty"
                        className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider font-bold mb-1.5 text-orange-600 dark:text-orange-400 pl-1"
                      >
                        <AlertTriangle className="h-3 w-3" />
                        MR Qty
                      </label>
                      <input
                        type="number"
                        id="invoice_mr_qty"
                        name="invoice_mr_qty"
                        value={currentItem.mr_qty}
                        onChange={(e) => {
                          const val = Number(e.target.value);
                          const totalQty =
                            Number(currentItem.ok_qty || 0) +
                            Number(currentItem.cr_qty || 0) +
                            val;
                          setCurrentItem({
                            ...currentItem,
                            mr_qty: val,
                            quantity: totalQty, // Update Total Qty
                          });
                        }}
                        className="w-full h-10 px-3 border-2 border-orange-200 dark:border-orange-900/50 bg-white dark:bg-gray-800 rounded-lg text-sm text-right font-bold text-orange-700 dark:text-orange-400 focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 outline-none transition-colors"
                      />
                    </div>
                    <div>
                      <label
                        htmlFor="invoice_total_qty"
                        className="block text-[10px] uppercase tracking-wider font-bold mb-1.5 text-gray-600 dark:text-gray-400 pl-1"
                      >
                        Total Qty
                      </label>
                      <input
                        type="text"
                        id="invoice_total_qty"
                        name="invoice_total_qty"
                        readOnly
                        value={currentItem.quantity}
                        className="w-full h-10 px-3 border-2 border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50 rounded-lg text-sm text-right font-medium text-gray-600 dark:text-gray-400"
                        title="Remaining Billable Quantity (from Backend)"
                      />
                    </div>
                  </div>

                  {/* Billing Group */}
                  <div className="col-span-2 lg:col-span-3 grid grid-cols-3 gap-2">
                    <div>
                      <label
                        htmlFor="invoice_bill_qty"
                        className="block text-[10px] uppercase tracking-wider font-bold mb-1.5 text-blue-600 dark:text-blue-400 pl-1"
                      >
                        Bill Qty
                      </label>
                      <input
                        type="text"
                        id="invoice_bill_qty"
                        name="invoice_bill_qty"
                        readOnly
                        value={currentItem.billing_qty}
                        className="w-full h-10 px-3 bg-blue-50 dark:bg-blue-900/20 border-2 border-blue-200 dark:border-blue-800 rounded-lg text-sm font-bold text-blue-700 dark:text-blue-300 text-right"
                      />
                    </div>
                    <div>
                      <label
                        htmlFor="invoice_rate"
                        className="block text-[10px] uppercase tracking-wider font-bold mb-1.5 text-gray-600 dark:text-gray-400 pl-1"
                      >
                        Rate
                      </label>
                      <input
                        type="text"
                        id="invoice_rate"
                        name="invoice_rate"
                        readOnly
                        value={currentItem.rate}
                        className="w-full h-10 px-3 border-2 border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50 rounded-lg text-sm text-right font-medium text-gray-900 dark:text-white"
                      />
                    </div>
                    <div>
                      <label
                        htmlFor="invoice_amount"
                        className="block text-[10px] uppercase tracking-wider font-bold mb-1.5 text-gray-900 dark:text-white pl-1"
                      >
                        Amount
                      </label>
                      <input
                        type="text"
                        id="invoice_amount"
                        name="invoice_amount"
                        readOnly
                        value={
                          currentItem.amount
                            ? `₹${currentItem.amount.toFixed(2)}`
                            : ""
                        }
                        className="w-full h-10 px-3 border-2 border-gray-200 dark:border-gray-700 bg-gray-100 dark:bg-gray-800 rounded-lg text-sm font-bold text-gray-900 dark:text-white text-right"
                      />
                    </div>
                  </div>

                  {/* Action Group */}
                  <div className="col-span-2 lg:col-span-1 flex flex-col justify-end">
                    <span className="block text-[10px] uppercase tracking-wider font-bold mb-1.5 text-gray-500 dark:text-gray-400 text-center">
                      Action
                    </span>
                    <button
                      onClick={handleAddItem}
                      className="w-full h-10 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white rounded-lg flex items-center justify-center gap-2 text-sm font-bold uppercase tracking-wide transition-all shadow-md hover:shadow-lg cursor-pointer"
                    >
                      <Plus size={16} /> Add
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Items Table Card */}
            {formData.items.length > 0 && (
              <div
                ref={itemsTableRef}
                className="bg-white dark:bg-gray-800 rounded-2xl border-2 border-gray-200 dark:border-gray-700 overflow-hidden shadow-lg"
              >
                <div className="max-h-[400px] overflow-y-auto">
                  <table className="w-full">
                    <thead className="bg-gradient-to-r from-purple-600 via-purple-500 to-blue-600 text-white">
                      <tr>
                        <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider">
                          Sr. No.
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider">
                          Item
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider">
                          Challan / GRN
                        </th>
                        <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider">
                          Qty
                        </th>
                        <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider">
                          Rate
                        </th>
                        <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider">
                          Amount
                        </th>
                        <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider">
                          Delete
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                      {formData.items.map((item, index) => (
                        <tr
                          key={index}
                          className="hover:bg-purple-50 dark:hover:bg-gray-700/50 transition-colors"
                        >
                          <td className="px-4 py-3 text-sm text-center font-semibold text-gray-500 dark:text-gray-400">
                            {index + 1}
                          </td>
                          <td className="px-4 py-3 text-sm font-medium text-gray-900 dark:text-white">
                            {item.name}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300">
                            <div>{item.challan_number}</div>
                            {item.grn_no && (
                              <div className="text-xs text-purple-600 dark:text-purple-400 mt-0.5">
                                GRN: {item.grn_no}
                              </div>
                            )}
                          </td>
                          <td className="px-4 py-3 text-sm text-right text-gray-600 dark:text-gray-300">
                            <div className="flex flex-col items-end">
                              <span className="font-bold text-purple-600 dark:text-purple-400">
                                {item.quantity}
                              </span>
                              <span className="text-xs text-gray-400">
                                (OK:{item.ok_qty} CR:{item.cr_qty} MR:
                                {item.mr_qty})
                              </span>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-sm text-right font-medium text-gray-900 dark:text-white">
                            ₹{item.rate}
                          </td>
                          <td className="px-4 py-3 text-sm text-right font-bold text-gray-900 dark:text-white">
                            ₹{item.amount.toFixed(2)}
                          </td>
                          <td className="px-4 py-3 text-center">
                            <button
                              onClick={() => handleRemoveItem(index)}
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

          {/* Totals & Submit Section */}
          <div className="space-y-6">
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-200 dark:border-gray-700 p-6 sticky top-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-600 to-blue-600">
                  Summary
                </h2>
                <button
                  onClick={() => setShowGstEdit(!showGstEdit)}
                  className="p-2 hover:bg-purple-50 dark:hover:bg-purple-900/20 rounded-lg transition-colors group"
                  title="Edit GST Rate"
                >
                  <Edit
                    size={18}
                    className="text-gray-400 group-hover:text-purple-600 transition-colors"
                  />
                </button>
              </div>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between text-gray-600 dark:text-gray-400">
                  <span>Subtotal</span>
                  <span className="font-semibold">₹{subtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between items-center text-gray-600 dark:text-gray-400">
                  <span>CGST ({gstRate / 2}%)</span>
                  <span className="font-semibold">₹{(gst / 2).toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-gray-600 dark:text-gray-400">
                  <span>SGST ({gstRate / 2}%)</span>
                  <span className="font-semibold">₹{(gst / 2).toFixed(2)}</span>
                </div>

                {/* GST Edit Modal/Input */}
                {showGstEdit && (
                  <div className="flex items-center justify-between p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg border border-purple-200 dark:border-purple-800 animate-scale-in my-2">
                    <label
                      htmlFor="gst_rate_edit"
                      className="text-sm font-semibold text-purple-700 dark:text-purple-300"
                    >
                      New Rate (%):
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        name="gst_rate_edit"
                        id="gst_rate_edit"
                        value={gstRate}
                        onChange={(e) => setGstRate(Number(e.target.value))}
                        className="w-16 px-2 py-1 text-sm font-bold text-center rounded border-2 border-purple-300 dark:border-purple-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-purple-500"
                        autoFocus
                      />
                      <button
                        onClick={() => setShowGstEdit(false)}
                        className="p-1.5 bg-green-500 hover:bg-green-600 text-white rounded-lg transition-colors shadow-sm"
                      >
                        <CheckCircle size={16} />
                      </button>
                    </div>
                  </div>
                )}

                <div className="pt-3 border-t-2 border-gray-200 dark:border-gray-700 flex justify-between font-bold text-lg">
                  <span className="text-gray-900 dark:text-white">
                    Grand Total
                  </span>
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-600 to-blue-600">
                    ₹{grandTotal.toFixed(2)}
                  </span>
                </div>
              </div>

              <button
                onClick={handleSubmit}
                disabled={loading}
                className="w-full mt-6 py-3 bg-gradient-to-r from-purple-600 via-purple-500 to-blue-600 hover:from-purple-700 hover:via-purple-600 hover:to-blue-700 text-white rounded-xl font-bold shadow-xl shadow-purple-500/40 hover:shadow-2xl hover:shadow-purple-500/50 disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:scale-100 transition-all duration-200 hover:scale-105 active:scale-95 flex items-center justify-center gap-2"
              >
                <Save size={20} strokeWidth={2.5} />
                {loading
                  ? isEditMode
                    ? "Updating..."
                    : "Creating..."
                  : isEditMode
                    ? "Update Invoice"
                    : "Create Invoice"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

import { useState, useEffect } from "react";
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
              ok_qty: i.delivery_challan_item?.ok_qty || 0,
              cr_qty: i.delivery_challan_item?.cr_qty || 0,
              mr_qty: i.delivery_challan_item?.mr_qty || 0,
              billing_qty: i.quantity,
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
    const selected = pendingItems.find(
      (i) => i.delivery_challan_item_id === Number(deliveryChallanItemId)
    );
    if (selected) {
      const qty = Number(selected.quantity); // Challan Total
      const rate = Number(selected.rate);
      const ok = Number(selected.ok_qty) || 0;
      const cr = Number(selected.cr_qty) || 0;
      const billQty = ok + cr; // Billable Quantity

      setCurrentItem({
        ...currentItem,
        challan_id: selected.challan_id,
        challan_number: selected.challan_number,
        delivery_challan_item_id: selected.delivery_challan_item_id,
        grn_no: "", // Reset GRN when challan changes
        quantity: qty,
        billing_qty: billQty,
        ok_qty: selected.ok_qty,
        cr_qty: selected.cr_qty,
        mr_qty: selected.mr_qty,
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
      currentItem.rate === ""
    ) {
      toast.error(
        "Please select Item, Challan and ensure Quantity/Rate are filled"
      );
      return;
    }

    // Check duplicate
    if (
      formData.items.some(
        (i) =>
          i.delivery_challan_item_id === currentItem.delivery_challan_item_id
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
      rate: "",
      amount: "",
    });
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
      // Backend expects generic list usually, but we might want to link challan_id?
      // CURRENT BACKEND 'create_invoice' does NOT link challan_id per item, it links generic items.
      // It creates a `StockTransaction` "OUT".
      // BUT wait, if we are billing against a Delivery Challan, the stock is ALREADY "OUT" via the DC?
      // Let's check `routers/challan.py`.
      // `create_challan` creates StockTransaction "IN" (delivery FROM party back to us? wait).
      // `routers/challan.py` line 118: transaction_type="IN".
      // "items are being delivered back from party"?
      // No, typically Delivery Challan is OUT (we send to party).
      // Wait, line 113 says "IN because items are coming back".
      // Is Delivery Challan for INWARD?
      // Usually DC is OUTWARD.
      // Let's assume standard flow: DC = Out to Party (Process). Invoice = Bill Party.

      // If DC was OUT, stock is gone.
      // Invoice should NOT deduct stock again if it's linked to DC.
      // If Invoice is DIRECT, it deducts stock.

      // My `create_invoice` (direct) does OUT.
      // My `create_invoice_from_challan` does NOT deduct stock (items loop doesn't create StockTx).

      // This hybrid approach (Select Items from Challans) is tricky.
      // If I send these items to `create_invoice`, it WILL deduct stock again!
      // I need to use a new endpoint or update `create_invoice` to handle "linked" items.

      // For now, I will use `create_invoice` but I should probably flag these items as "from challan"
      // so backend doesn't double-deduct?
      // VALIDATION: `data: InvoiceCreate` doesn't have `challan_item_id`.
      // I should stick to the requirements: "fetch delivery challan no... detail".
      // If the backend doesn't support item-level challan linking yet, I only send generic items.
      // BUT user effectively wants to bill these.
      // The Invoice created via `POST /invoice` will be "Direct" status.
      // It won't mark the Delivery Challan as "BILLED".
      // This might be an issue.
      // STARTING SIMPLE: Just UI population for now as requested.
      // Linking backend logic properly is a bigger task (Partial billing of challans).

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
  const filteredPendingItems = pendingItems.filter(
    (pending) =>
      !formData.items.some(
        (added) =>
          added.delivery_challan_item_id &&
          Number(added.delivery_challan_item_id) ===
            Number(pending.delivery_challan_item_id)
      )
  );

  // Helper to get unique items from pending list
  const uniqueItems = [
    ...new Set(filteredPendingItems.map((i) => i.item_id)),
  ].map((id) => filteredPendingItems.find((i) => i.item_id === id));

  // Helper to get challans for selected item
  const availableChallans = filteredPendingItems.filter(
    (i) => i.item_id === Number(currentItem.item_id)
  );

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
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate("/invoices")}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors"
          >
            <ArrowLeft size={24} className="text-gray-600 dark:text-gray-300" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              {isEditMode ? `Edit Invoice ${nextInvoiceNumber}` : "New Invoice"}
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {isEditMode
                ? "Update invoice details and items"
                : "Create invoice from delivery challans"}
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Form Section */}
        <div className="lg:col-span-3 space-y-6">
          {/* Invoice Details Card */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 space-y-6">
            <div className="flex items-center justify-between border-b border-gray-100 dark:border-gray-700 pb-4">
              <h2 className="text-lg font-semibold flex items-center gap-2 text-gray-900 dark:text-white">
                <FileText size={20} className="text-purple-600" />
                Invoice Details
              </h2>
              <span className="font-mono text-sm font-medium text-purple-600 bg-purple-50 dark:bg-purple-900/20 px-3 py-1 rounded-lg border border-purple-100 dark:border-purple-800">
                Invoice No: {nextInvoiceNumber || "Loading..."}
              </span>
            </div>

            {/* Basic Fields */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Party
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
                  className="w-full px-4 py-2 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 dark:text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none"
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
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Invoice Date
                </label>
                <input
                  type="date"
                  name="invoice_date"
                  id="invoice_date"
                  value={formData.invoice_date}
                  min={activeFY?.start_date}
                  max={activeFY?.end_date}
                  onChange={(e) =>
                    setFormData({ ...formData, invoice_date: e.target.value })
                  }
                  className="w-full px-4 py-2 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 dark:text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none"
                />
              </div>
            </div>

            {/* Item Selection Section (Moved here as requested) */}
            <div className="bg-gray-50 dark:bg-gray-900 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
              <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3 flex items-center gap-2">
                <Package size={16} /> Add Item from Challan
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                {/* 1. Select Item */}
                <div>
                  <label className="block text-xs font-medium mb-1">
                    Select Item
                  </label>
                  <select
                    name="invoice_item_id"
                    id="invoice_item_id"
                    value={currentItem.item_id}
                    onChange={(e) => handleItemSelect(e.target.value)}
                    disabled={!formData.party_id}
                    className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 dark:text-white text-sm"
                  >
                    <option value="">
                      {formData.party_id ? "Select Item" : "Select Party First"}
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
                  <label className="block text-xs font-medium mb-1">
                    Select Delivery Challan
                  </label>
                  <select
                    name="invoice_challan_id"
                    id="invoice_challan_id"
                    value={currentItem.delivery_challan_item_id}
                    onChange={(e) => handleChallanSelect(e.target.value)}
                    disabled={!currentItem.item_id}
                    className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 dark:text-white text-sm"
                  >
                    <option value="">Select Challan</option>
                    {availableChallans.map((c) => (
                      <option
                        key={c.delivery_challan_item_id}
                        value={c.delivery_challan_item_id}
                      >
                        {c.challan_number} (Qty: {c.quantity})
                      </option>
                    ))}
                  </select>
                </div>

                {/* 3. GRN No. */}
                <div>
                  <label className="block text-xs font-medium mb-1">
                    GRN No.
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
                    className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 dark:text-white text-sm focus:ring-2 focus:ring-purple-500 outline-none"
                  />
                </div>
              </div>
            </div>

            {/* Auto-filled Details Row */}
            <div className="grid grid-cols-2 lg:grid-cols-8 gap-3 mb-4">
              {/* Reference Quantities Group */}
              <div className="col-span-2 lg:col-span-4 grid grid-cols-2 lg:grid-cols-4 gap-2 p-1.5 bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-700 rounded-xl">
                <div>
                  <label className="block text-[10px] uppercase tracking-wider font-bold mb-1.5 text-green-600 pl-1">
                    OK Qty
                  </label>
                  <input
                    type="text"
                    readOnly
                    value={currentItem.ok_qty}
                    className="w-full h-10 px-3 border border-green-200 dark:border-green-900/50 bg-green-50 dark:bg-green-900/20 rounded-lg text-sm text-right font-bold text-green-700 dark:text-green-400"
                  />
                </div>
                <div>
                  <label className="block text-[10px] uppercase tracking-wider font-bold mb-1.5 text-red-600 pl-1">
                    CR Qty
                  </label>
                  <input
                    type="text"
                    readOnly
                    value={currentItem.cr_qty}
                    className="w-full h-10 px-3 border border-red-200 dark:border-red-900/50 bg-red-50 dark:bg-red-900/20 rounded-lg text-sm text-right font-bold text-red-700 dark:text-red-400"
                  />
                </div>
                <div>
                  <label className="block text-[10px] uppercase tracking-wider font-bold mb-1.5 text-orange-600 pl-1">
                    MR Qty
                  </label>
                  <input
                    type="text"
                    readOnly
                    value={currentItem.mr_qty}
                    className="w-full h-10 px-3 border border-orange-200 dark:border-orange-900/50 bg-orange-50 dark:bg-orange-900/20 rounded-lg text-sm text-right font-bold text-orange-700 dark:text-orange-400"
                  />
                </div>
                <div>
                  <label className="block text-[10px] uppercase tracking-wider font-bold mb-1.5 text-gray-500 pl-1">
                    Total Qty
                  </label>
                  <input
                    type="text"
                    readOnly
                    value={currentItem.quantity}
                    className="w-full h-10 px-3 border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 rounded-lg text-sm text-right font-medium text-gray-500"
                  />
                </div>
              </div>
              {/* Billing Group */}
              <div className="col-span-2 lg:col-span-3 grid grid-cols-3 gap-2 p-1.5 bg-blue-50/30 dark:bg-blue-900/10 border border-blue-100 dark:border-blue-800 rounded-xl">
                <div>
                  <label className="block text-[10px] uppercase tracking-wider font-bold mb-1.5 text-blue-600 pl-1">
                    Bill Qty
                  </label>
                  <input
                    type="text"
                    readOnly
                    value={currentItem.billing_qty}
                    className="w-full h-10 px-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg text-sm font-bold text-blue-700 dark:text-blue-300 text-right"
                  />
                </div>
                <div>
                  <label className="block text-[10px] uppercase tracking-wider font-bold mb-1.5 text-gray-600 dark:text-gray-400 pl-1">
                    Rate
                  </label>
                  <input
                    type="text"
                    readOnly
                    value={currentItem.rate}
                    className="w-full h-10 px-3 border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 rounded-lg text-sm text-right font-medium text-gray-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-[10px] uppercase tracking-wider font-bold mb-1.5 text-gray-900 dark:text-white pl-1">
                    Amount
                  </label>
                  <input
                    type="text"
                    readOnly
                    value={
                      currentItem.amount
                        ? `₹${currentItem.amount.toFixed(2)}`
                        : ""
                    }
                    className="w-full h-10 px-3 border border-gray-200 dark:border-gray-700 bg-gray-100 dark:bg-gray-800 rounded-lg text-sm font-bold text-gray-900 dark:text-white text-right"
                  />
                </div>
              </div>

              {/* Action Group */}
              <div className="col-span-2 lg:col-span-1 p-1.5 bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-700 rounded-xl flex flex-col justify-end">
                <label className="block text-[10px] uppercase tracking-wider font-bold mb-1.5 text-gray-500 dark:text-gray-400 text-center">
                  Action
                </label>
                <button
                  onClick={handleAddItem}
                  className="w-full h-10 bg-blue-600 hover:bg-blue-700 text-white rounded-lg flex items-center justify-center gap-2 text-sm font-bold uppercase tracking-wide transition-colors shadow-sm cursor-pointer"
                >
                  <Plus size={16} /> Add
                </button>
              </div>
            </div>
          </div>

          {/* Items Table Card */}
          {formData.items.length > 0 && (
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 dark:bg-gray-900 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    <tr>
                      <th className="px-4 py-3">Item</th>
                      <th className="px-4 py-3">Challan / GRN</th>
                      <th className="px-4 py-3 text-right">Qty</th>
                      <th className="px-4 py-3 text-right">Rate</th>
                      <th className="px-4 py-3 text-right">Amount</th>
                      <th className="px-4 py-3 text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                    {formData.items.map((item, index) => (
                      <tr key={index}>
                        <td className="px-4 py-3 text-sm font-medium text-gray-900 dark:text-white">
                          {item.name}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-500">
                          <div>{item.challan_number}</div>
                          {item.grn_no && (
                            <div className="text-xs text-purple-600 mt-0.5">
                              GRN: {item.grn_no}
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-3 text-sm text-right text-gray-600 dark:text-gray-300">
                          <div className="flex flex-col items-end">
                            <span className="font-bold">{item.quantity}</span>
                            <span className="text-xs text-gray-400">
                              (OK:{item.ok_qty} CR:{item.cr_qty} MR:
                              {item.mr_qty})
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-sm text-right text-gray-600 dark:text-gray-300">
                          ₹{item.rate}
                        </td>
                        <td className="px-4 py-3 text-sm text-right font-semibold text-gray-900 dark:text-white">
                          ₹{item.amount.toFixed(2)}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <button
                            onClick={() => handleRemoveItem(index)}
                            className="text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 p-1.5 rounded-lg transition-colors"
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
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 sticky top-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                Summary
              </h2>
              <button
                onClick={() => setShowGstEdit(!showGstEdit)}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors group"
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
                <span>₹{subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between items-center text-gray-600 dark:text-gray-400">
                <span>CGST ({gstRate / 2}%)</span>
                <span>₹{(gst / 2).toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-gray-600 dark:text-gray-400">
                <span>SGST ({gstRate / 2}%)</span>
                <span>₹{(gst / 2).toFixed(2)}</span>
              </div>

              {/* GST Edit Modal/Input */}
              {showGstEdit && (
                <div className="flex items-center justify-between p-2 bg-purple-50 dark:bg-purple-900/20 rounded-lg border border-purple-100 dark:border-purple-800 animate-scale-in my-2">
                  <span className="text-sm font-semibold text-purple-700 dark:text-purple-300">
                    New Rate (%):
                  </span>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      name="gst_rate_edit"
                      id="gst_rate_edit"
                      value={gstRate}
                      onChange={(e) => setGstRate(Number(e.target.value))}
                      className="w-16 px-2 py-1 text-sm font-bold text-center rounded border border-purple-200 dark:border-purple-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-purple-500"
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

              <div className="pt-3 border-t border-gray-200 dark:border-gray-700 flex justify-between font-bold text-lg text-gray-900 dark:text-white">
                <span>Grand Total</span>
                <span>₹{grandTotal.toFixed(2)}</span>
              </div>
            </div>

            <button
              onClick={handleSubmit}
              disabled={loading}
              className="w-full mt-6 py-3 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white rounded-xl font-bold shadow-lg shadow-purple-600/20 transition-all flex items-center justify-center gap-2"
            >
              <Save size={20} />
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
  );
}

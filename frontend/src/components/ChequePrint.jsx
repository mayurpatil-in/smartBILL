import React, { forwardRef } from "react";
import { ToWords } from "to-words";

const toWords = new ToWords({
  localeCode: "en-IN",
  converterOptions: {
    currency: true,
    ignoreDecimal: false,
    ignoreZeroCurrency: false,
    doNotAddOnly: false,
    currencyOptions: {
      name: "Rupee",
      plural: "Rupees",
      symbol: "₹",
      fractionalUnit: {
        name: "Paise",
        plural: "Paise",
        symbol: "",
      },
    },
  },
});

const ChequePrint = forwardRef(({ expense }, ref) => {
  if (!expense) return null;

  const dateObj = expense.cheque_date
    ? new Date(expense.cheque_date)
    : new Date();

  // Format Date as DD MM YYYY individual characters if possible,
  // but for standard printing we usually just place them with spacing
  const day = String(dateObj.getDate()).padStart(2, "0");
  const month = String(dateObj.getMonth() + 1).padStart(2, "0");
  const year = String(dateObj.getFullYear());

  // Standard CTS-2010 Cheque Dimensions approx: 203mm x 92mm
  // We use absolute positioning based on standard layouts (HDFC, SBI, ICICI are similar)
  // Measurements in 'mm' approx converted to pixels/rem.

  return (
    <div
      ref={ref}
      className="print-cheque-container relative bg-white text-black font-bold font-mono"
      style={{
        width: "203mm",
        height: "92mm",
        marginLeft: "5mm",
        marginTop: "5mm",
        position: "relative", // Ensure relative positioning applies always
      }}
    >
      {/* DATE: Top Right */}
      <div className="absolute top-[8mm] right-[15mm] tracking-[6px] text-lg">
        {day}
        {month}
        {year}
      </div>

      {/* PAYEE NAME: Top Left-ish */}
      <div className="absolute top-[22mm] left-[25mm] w-[130mm] whitespace-nowrap">
        {expense.payee_name || "Self"}
      </div>

      {/* AMOUNT IN WORDS: Middle Left */}
      <div className="absolute top-[32mm] left-[30mm] w-[120mm] leading-8 text-sm uppercase">
        {toWords.convert(Number(expense.amount || 0))}
      </div>

      {/* AMOUNT BOX: Middle Right */}
      <div className="absolute top-[35mm] right-[15mm] w-[45mm] text-xl tracking-wider bg-white/50 backdrop-blur-sm px-2">
        **{Number(expense.amount).toLocaleString("en-IN")}**
      </div>

      {/* AC PAYEE STAMP (Optional Visual) */}
      <div className="absolute top-[10mm] left-[80mm] -rotate-12 border-2 border-black px-2 text-xs opacity-50">
        A/C PAYEE ONLY
      </div>
    </div>
  );
});

export default ChequePrint;

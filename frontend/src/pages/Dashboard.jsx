import { useEffect, useState } from "react";
import FinancialYearCard from "../components/FinancialYearCard";
import { getActiveFinancialYear } from "../api/financialYear";

export default function Dashboard() {
  const [financialYear, setFinancialYear] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Fetch active financial year when dashboard loads
  useEffect(() => {
    let mounted = true;

    const fetchFY = async () => {
      try {
        const data = await getActiveFinancialYear();
        if (mounted) setFinancialYear(data);
      } catch (err) {
        // 404 = no active FY (valid business case)
        if (mounted) setFinancialYear(null);
      } finally {
        if (mounted) setLoading(false);
      }
    };

    fetchFY();

    return () => {
      mounted = false;
    };
  }, []);

  return (
    <div className="space-y-6">
      {/* ===== TOP DASHBOARD ROW (YOUR RED BOX AREA) ===== */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <FinancialYearCard fy={financialYear} loading={loading} />
      </div>

      {/* ===== NEXT ROWS (FUTURE) ===== */}
      {/* 
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <InvoiceSummaryCard />
        <PartyCountCard />
        <StockAlertCard />
      </div>
      */}

      {error && (
        <p className="text-sm text-red-500">
          {error}
        </p>
      )}
    </div>
  );
}

import { useEffect, useState } from "react";
import { useAuth } from "../hooks/useAuth";
import FinancialYearCard from "../components/FinancialYearCard";
import AddFinancialYearModal from "../components/AddFinancialYearModal";
import {
  getActiveFinancialYear,
  getAllFinancialYears,
  createFinancialYear,
  activateFinancialYear,
  deleteFinancialYear,
} from "../api/financialYear";

export default function Dashboard() {
  const { user } = useAuth();
  const [activeFY, setActiveFY] = useState(null);
  const [allFY, setAllFY] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showModal, setShowModal] = useState(false);

  // 🔄 Load FY data
  const loadFY = async () => {
    try {
      setLoading(true);
      const [active, all] = await Promise.all([
        getActiveFinancialYear(),
        getAllFinancialYears(),
      ]);
      setActiveFY(active);
      setAllFY(all);
    } catch {
      setActiveFY(null);
      setAllFY([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadFY();
  }, []);

  // ➕ Create FY
  const handleCreateFY = async (startDate, endDate) => {
    try {
      await createFinancialYear({
        start_date: startDate,
        end_date: endDate,
      });
      setShowModal(false);
      loadFY();
    } catch {
      setError("Failed to create financial year");
    }
  };

  // 🔄 Activate FY
  const handleSelectFY = async (fy) => {
    try {
      await activateFinancialYear(fy.id);
      setShowModal(false);
      loadFY();
    } catch {
      setError("Failed to activate financial year");
    }
  };

  // 🗑 Delete FY
  const handleDeleteFY = async (fy) => {
    if (!window.confirm("Delete this financial year?")) return;
    try {
      await deleteFinancialYear(fy.id);
      loadFY();
    } catch {
      setError("Failed to delete financial year");
    }
  };

  return (
    <div className="space-y-6">
       {/* 👑 ADMIN HEADER */}
<div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between
                bg-white dark:bg-gray-800
                p-4 md:p-6
                rounded-2xl
                border border-gray-100 dark:border-gray-700
                shadow-sm">

  {/* LEFT: Title + Context */}
  <div className="flex items-start gap-4">
    {/* Icon */}
    <div className="flex h-12 w-12 items-center justify-center
                    rounded-xl
                    bg-blue-50 dark:bg-blue-900/30
                    text-blue-600 dark:text-blue-400">
      👑
    </div>

    <div>
      <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white">
        {user?.companyName || "Admin Portal"}
      </h1>

      <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
        Manage your company's financial year
      </p>
    </div>
  </div>
</div>


      {/* TOP CARD */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <FinancialYearCard
          fy={activeFY}
          loading={loading}
          onAddFY={() => setShowModal(true)}
        />
      </div>

      {error && (
        <p className="text-sm text-red-500">{error}</p>
      )}

      {/* ADVANCED MODAL */}
      <AddFinancialYearModal
        open={showModal}
        onClose={() => setShowModal(false)}
        onSave={handleCreateFY}
        companyName={activeFY?.company_name}
        activeFY={activeFY}
        allFY={allFY}
        onSelectFY={handleSelectFY}
        onDeleteFY={handleDeleteFY}
      />
    </div>
  );
}

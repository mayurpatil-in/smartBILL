import { useEffect, useState } from "react";
import FinancialYearCard from "../components/FinancialYearCard";
import AddFinancialYearModal from "../components/AddFinancialYearModal";
import {
  getActiveFinancialYear,
  getAllFinancialYears,
  createFinancialYear,
  activateFinancialYear,
  deleteFinancialYear,
} from "../api/financialYear";
import { Settings as SettingsIcon } from "lucide-react";

export default function Settings() {
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
      loadFY(); // Refresh to see update
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
    <div className="space-y-6 animate-fade-in-up">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white dark:bg-gray-800 p-4 md:p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-xl text-blue-600 dark:text-blue-400">
            <SettingsIcon size={24} />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              Settings
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Manage your application configuration
            </p>
          </div>
        </div>
      </div>

      <div className="max-w-3xl">
        <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-4">
          Financial Year Configuration
        </h2>
        <FinancialYearCard
          fy={activeFY}
          loading={loading}
          onAddFY={() => setShowModal(true)}
        />
        {error && <p className="text-sm text-red-500 mt-2">{error}</p>}
      </div>

      {/* MODAL */}
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

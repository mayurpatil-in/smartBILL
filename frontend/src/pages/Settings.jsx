import { useState, useEffect } from "react";
import FinancialYearCard from "../components/FinancialYearCard";
import AddFinancialYearModal from "../components/AddFinancialYearModal";
import BackupTab from "../components/settings/BackupTab";
import {
  getActiveFinancialYear,
  getAllFinancialYears,
  createFinancialYear,
  activateFinancialYear,
  deleteFinancialYear,
} from "../api/financialYear";
import { getProfile } from "../api/profile";
import SubscriptionCard from "../components/SubscriptionCard";
import { Settings as SettingsIcon, Database, LayoutGrid } from "lucide-react";

export default function Settings() {
  const [activeTab, setActiveTab] = useState("general");

  // -- Financial Year State --
  const [activeFY, setActiveFY] = useState(null);
  const [allFY, setAllFY] = useState([]);
  const [company, setCompany] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showModal, setShowModal] = useState(false);

  // 🔄 Load Data
  const loadData = async () => {
    try {
      setLoading(true);
      const [active, all, profileData] = await Promise.all([
        getActiveFinancialYear(),
        getAllFinancialYears(),
        getProfile(),
      ]);
      setActiveFY(active);
      setAllFY(all);
      if (profileData?.company) {
        setCompany(profileData.company);
      }
    } catch {
      setActiveFY(null);
      setAllFY([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // ➕ Create FY
  const handleCreateFY = async (startDate, endDate) => {
    try {
      await createFinancialYear({
        start_date: startDate,
        end_date: endDate,
      });
      setShowModal(false);
      loadData();
    } catch {
      setError("Failed to create financial year");
    }
  };

  // 🔄 Activate FY
  const handleSelectFY = async (fy) => {
    try {
      await activateFinancialYear(fy.id);
      setShowModal(false);
      loadData();
    } catch {
      setError("Failed to activate financial year");
    }
  };

  // 🗑 Delete FY
  const handleDeleteFY = async (fy) => {
    if (!window.confirm("Delete this financial year?")) return;
    try {
      await deleteFinancialYear(fy.id);
      loadData();
    } catch {
      setError("Failed to delete financial year");
    }
  };

  return (
    <div className="space-y-8 animate-fade-in-up">
      {/* Header */}
      <div className="relative overflow-hidden bg-gradient-to-br from-blue-50 via-white to-indigo-50 dark:from-gray-800 dark:via-gray-800 dark:to-gray-900 p-8 rounded-3xl shadow-lg border border-gray-200 dark:border-gray-700">
        {/* Decorative Background Elements */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-blue-400/10 dark:bg-blue-500/5 rounded-full blur-3xl -mr-32 -mt-32"></div>
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-indigo-400/10 dark:bg-indigo-500/5 rounded-full blur-3xl -ml-24 -mb-24"></div>

        <div className="relative flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="flex items-center gap-5">
            <div className="p-4 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl shadow-lg shadow-blue-500/30 dark:shadow-blue-500/20">
              <SettingsIcon size={28} className="text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 dark:from-white dark:to-gray-300 bg-clip-text text-transparent">
                Settings
              </h1>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                Manage your application configuration and preferences
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* TABS NAVIGATION */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 p-2">
        <div className="flex gap-2">
          <button
            onClick={() => setActiveTab("general")}
            className={`flex-1 py-3 px-6 text-sm font-semibold rounded-xl transition-all duration-300 ${
              activeTab === "general"
                ? "bg-gradient-to-r from-blue-500 to-indigo-600 text-white shadow-lg shadow-blue-500/30"
                : "text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700/50 hover:text-gray-900 dark:hover:text-white"
            }`}
          >
            <div className="flex items-center justify-center gap-2">
              <LayoutGrid size={18} />
              <span>General</span>
            </div>
          </button>
          <button
            onClick={() => setActiveTab("backup")}
            className={`flex-1 py-3 px-6 text-sm font-semibold rounded-xl transition-all duration-300 ${
              activeTab === "backup"
                ? "bg-gradient-to-r from-blue-500 to-indigo-600 text-white shadow-lg shadow-blue-500/30"
                : "text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700/50 hover:text-gray-900 dark:hover:text-white"
            }`}
          >
            <div className="flex items-center justify-center gap-2">
              <Database size={18} />
              <span>Backup & Restore</span>
            </div>
          </button>
        </div>
      </div>

      {/* CONTENT AREA */}
      <div className="min-h-[400px]">
        {activeTab === "general" && (
          <div className="max-w-6xl animate-fade-in">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <SubscriptionCard company={company} loading={loading} />

              <FinancialYearCard
                fy={activeFY}
                loading={loading}
                onAddFY={() => setShowModal(true)}
              />
            </div>
            {error && <p className="text-sm text-red-500 mt-2">{error}</p>}
          </div>
        )}

        {activeTab === "backup" && <BackupTab />}
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

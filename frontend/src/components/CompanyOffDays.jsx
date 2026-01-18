import { useState, useEffect } from "react";
import { Coffee, Check, Save } from "lucide-react";
import toast from "react-hot-toast";
import { getCompanySettings, updateOffDays } from "../api/employees";

const DAYS = [
  { id: 0, label: "Monday" },
  { id: 1, label: "Tuesday" },
  { id: 2, label: "Wednesday" },
  { id: 3, label: "Thursday" },
  { id: 4, label: "Friday" },
  { id: 5, label: "Saturday" },
  { id: 6, label: "Sunday" },
];

export default function CompanyOffDays() {
  const [selectedDays, setSelectedDays] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    setLoading(true);
    try {
      const data = await getCompanySettings();
      // data.off_days is array of ints
      setSelectedDays(data.off_days || []);
    } catch (error) {
      toast.error("Failed to load settings");
    } finally {
      setLoading(false);
    }
  };

  const toggleDay = (dayId) => {
    if (selectedDays.includes(dayId)) {
      setSelectedDays(selectedDays.filter((d) => d !== dayId));
    } else {
      setSelectedDays([...selectedDays, dayId]);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await updateOffDays(selectedDays);
      toast.success("Weekly off days updated successfully");
    } catch (error) {
      toast.error("Failed to update settings");
    } finally {
      setSaving(false);
    }
  };

  if (loading)
    return <div className="p-8 text-center">Loading settings...</div>;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-xl border border-gray-200 dark:border-gray-700">
        <div className="flex items-center gap-4 mb-8">
          <div className="p-3 bg-gradient-to-br from-indigo-500 to-violet-600 rounded-xl text-white shadow-lg">
            <Coffee size={24} />
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">
              Weekly Off Days
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Select official weekly off days (e.g. Sundays). These are treated
              as Paid Leaves.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {DAYS.map((day) => {
            const isSelected = selectedDays.includes(day.id);
            return (
              <button
                key={day.id}
                onClick={() => toggleDay(day.id)}
                className={`p-4 rounded-xl border-2 transition-all duration-200 relative overflow-hidden group ${
                  isSelected
                    ? "border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-300"
                    : "border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:border-indigo-300"
                }`}
              >
                <span className="font-semibold block">{day.label}</span>
                {isSelected && (
                  <div className="absolute top-2 right-2 text-indigo-600 dark:text-indigo-400">
                    <Check size={16} strokeWidth={3} />
                  </div>
                )}
              </button>
            );
          })}
        </div>

        <div className="flex justify-end">
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-6 py-2.5 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white rounded-xl font-semibold shadow-lg shadow-indigo-600/30 hover:shadow-xl hover:scale-105 transition-all flex items-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
          >
            {saving ? (
              "Saving..."
            ) : (
              <>
                <Save size={18} /> Save Settings
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

import { useState, useEffect } from "react";
import { format } from "date-fns";
import { Plus, Trash2, PartyPopper, Calendar } from "lucide-react";
import toast from "react-hot-toast";
import { getHolidays, createHoliday, deleteHoliday } from "../api/employees";

export default function CompanyHolidays() {
  const [holidays, setHolidays] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newHoliday, setNewHoliday] = useState({ name: "", date: "" });
  const [isAdding, setIsAdding] = useState(false);

  useEffect(() => {
    loadHolidays();
  }, []);

  const loadHolidays = async () => {
    setLoading(true);
    try {
      const data = await getHolidays();
      setHolidays(data);
    } catch (error) {
      console.error(error);
      toast.error("Failed to load holidays");
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = async (e) => {
    e.preventDefault();
    if (!newHoliday.name || !newHoliday.date) return;
    setIsAdding(true);
    try {
      await createHoliday(newHoliday);
      setNewHoliday({ name: "", date: "" });
      toast.success("Holiday added successfully");
      loadHolidays();
    } catch (error) {
      toast.error(error.response?.data?.detail || "Failed to add holiday");
    } finally {
      setIsAdding(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to remove this holiday?"))
      return;
    try {
      await deleteHoliday(id);
      toast.success("Holiday removed");
      loadHolidays();
    } catch (err) {
      toast.error("Failed to delete holiday");
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-xl border border-gray-200 dark:border-gray-700">
        <div className="flex items-center gap-4 mb-8">
          <div className="p-3 bg-gradient-to-br from-pink-500 to-rose-600 rounded-xl text-white shadow-lg">
            <PartyPopper size={24} />
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">
              With Company Holidays
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Official holidays are treated as paid leave for all employees.
            </p>
          </div>
        </div>

        {/* Add Form */}
        <form
          onSubmit={handleAdd}
          className="flex flex-col md:flex-row gap-4 items-end mb-8 bg-gray-50 dark:bg-gray-900/50 p-6 rounded-2xl border border-gray-100 dark:border-gray-700/50"
        >
          <div className="flex-1 w-full">
            <label
              htmlFor="holiday_name"
              className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2"
            >
              Holiday Name
            </label>
            <input
              type="text"
              id="holiday_name"
              name="holiday_name"
              placeholder="e.g. Diwali Festival"
              className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 dark:text-white focus:ring-2 focus:ring-pink-500/20 focus:border-pink-500 outline-none transition-all"
              value={newHoliday.name}
              onChange={(e) =>
                setNewHoliday({ ...newHoliday, name: e.target.value })
              }
              required
            />
          </div>
          <div className="w-full md:w-auto">
            <label
              htmlFor="holiday_date"
              className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2"
            >
              Date
            </label>
            <input
              type="date"
              id="holiday_date"
              name="holiday_date"
              className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 dark:text-white focus:ring-2 focus:ring-pink-500/20 focus:border-pink-500 outline-none transition-all"
              value={newHoliday.date}
              onChange={(e) =>
                setNewHoliday({ ...newHoliday, date: e.target.value })
              }
              required
            />
          </div>
          <button
            type="submit"
            disabled={isAdding}
            className="px-6 py-2.5 bg-gradient-to-r from-pink-600 to-rose-600 hover:from-pink-700 hover:to-rose-700 text-white rounded-xl font-semibold hover:shadow-lg hover:shadow-pink-600/30 transition-all duration-300 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed hover:scale-105"
          >
            {isAdding ? (
              "Adding..."
            ) : (
              <>
                <Plus size={20} /> Add Holiday
              </>
            )}
          </button>
        </form>

        {/* List */}
        <div className="rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden shadow-sm">
          <table className="w-full text-left">
            <thead className="bg-gray-50 dark:bg-gray-900/80 text-gray-500 uppercase text-xs font-bold tracking-wider">
              <tr>
                <th className="px-6 py-4">Holiday Name</th>
                <th className="px-6 py-4">Date</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700/50 bg-white dark:bg-gray-800">
              {loading ? (
                <tr>
                  <td
                    colSpan="3"
                    className="px-6 py-12 text-center text-gray-500"
                  >
                    <div className="flex flex-col items-center gap-2">
                      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-pink-500"></div>
                      Loading...
                    </div>
                  </td>
                </tr>
              ) : holidays.length === 0 ? (
                <tr>
                  <td
                    colSpan="3"
                    className="px-6 py-12 text-center text-gray-500"
                  >
                    <PartyPopper
                      size={48}
                      className="mx-auto mb-3 text-gray-300 dark:text-gray-600"
                    />
                    <p>No holidays added yet.</p>
                  </td>
                </tr>
              ) : (
                holidays.map((h) => (
                  <tr
                    key={h.id}
                    className="hover:bg-pink-50/30 dark:hover:bg-pink-900/10 transition-colors group"
                  >
                    <td className="px-6 py-4 font-semibold text-gray-900 dark:text-white flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-pink-100 text-pink-600 flex items-center justify-center text-sm font-bold">
                        {h.name.charAt(0)}
                      </div>
                      {h.name}
                    </td>
                    <td className="px-6 py-4 text-gray-600 dark:text-gray-400 font-medium">
                      {format(new Date(h.date), "MMMM d, yyyy")}
                      <span className="ml-2 text-xs bg-gray-100 dark:bg-gray-700 px-2 py-0.5 rounded text-gray-500">
                        {format(new Date(h.date), "EEEE")}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={() => handleDelete(h.id)}
                        className="text-gray-400 hover:text-red-600 p-2 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-all transform hover:scale-110 opacity-0 group-hover:opacity-100"
                        title="Delete"
                      >
                        <Trash2 size={18} />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

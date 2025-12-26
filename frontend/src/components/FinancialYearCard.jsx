export default function FinancialYearCard({ fy, loading }) {
  if (loading) {
    return (
      <div className="rounded-xl border p-6 bg-white dark:bg-gray-900">
        <p className="text-gray-400 text-sm">Loading financial year…</p>
      </div>
    );
  }

  if (!fy) {
    return (
      <div className="rounded-xl border p-6 bg-red-50 dark:bg-gray-900">
        <p className="text-red-600 text-sm">No Active Financial Year</p>
      </div>
    );
  }

  const startYear = new Date(fy.start_date).getFullYear();
  const endYear = new Date(fy.end_date).getFullYear();

  return (
    <div className="rounded-xl shadow-md p-6 bg-white dark:bg-gray-900 border">
      <h3 className="text-lg font-semibold mb-2">
        Financial Year
      </h3>

      <p className="text-2xl font-bold">
        {startYear} – {endYear}
      </p>

      <div className="mt-4 flex gap-3">
        <span className="text-xs px-2 py-1 rounded bg-green-100 text-green-700">
          Active
        </span>

        {!fy.is_locked ? (
          <span className="text-xs px-2 py-1 rounded bg-blue-100 text-blue-700">
            Open
          </span>
        ) : (
          <span className="text-xs px-2 py-1 rounded bg-red-100 text-red-700">
            Locked
          </span>
        )}
      </div>
    </div>
  );
}

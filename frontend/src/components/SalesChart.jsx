import { LineChart, Line, XAxis, Tooltip, ResponsiveContainer } from "recharts";

const data = [
  { month: "Apr", sales: 40000 },
  { month: "May", sales: 52000 },
  { month: "Jun", sales: 48000 },
  { month: "Jul", sales: 61000 },
];

export default function SalesChart() {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow p-5">
      <h3 className="font-semibold mb-4 text-gray-700 dark:text-white">
        Monthly Sales
      </h3>

      <ResponsiveContainer width="100%" height={250}>
        <LineChart data={data}>
          <XAxis dataKey="month" />
          <Tooltip />
          <Line type="monotone" dataKey="sales" stroke="#2563eb" />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

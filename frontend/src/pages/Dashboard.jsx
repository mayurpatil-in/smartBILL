import DashboardLayout from "../layouts/DashboardLayout";
import StatCard from "../components/StatCard";

export default function Dashboard() {
  return (
    <DashboardLayout>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
          gap: 20,
        }}
      >
        <StatCard title="Total Sales" value="₹ 2,45,000" />
        <StatCard title="Invoices" value="128" />
        <StatCard title="Stock Items" value="56" />
        <StatCard title="Pending Payments" value="₹ 35,000" />
      </div>
    </DashboardLayout>
  );
}

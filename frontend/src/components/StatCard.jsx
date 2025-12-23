export default function StatCard({ title, value }) {
  return (
    <div
      style={{
        background: "#ffffff",
        padding: 20,
        borderRadius: 8,
        boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
        flex: 1,
      }}
    >
      <p style={{ color: "#64748b" }}>{title}</p>
      <h2>{value}</h2>
    </div>
  );
}

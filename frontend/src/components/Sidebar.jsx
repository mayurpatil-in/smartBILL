import { Link } from "react-router-dom";

export default function Sidebar() {
  return (
    <div
      style={{
        width: "220px",
        background: "#1e293b",
        color: "#fff",
        padding: "20px",
      }}
    >
      <h2 style={{ marginBottom: 30 }}>SmartBill</h2>

      <nav style={{ display: "flex", flexDirection: "column", gap: 15 }}>
        <Link style={linkStyle} to="/">Dashboard</Link>
        <Link style={linkStyle} to="/invoices">Invoices</Link>
        <Link style={linkStyle} to="/challans">Challans</Link>
        <Link style={linkStyle} to="/stock">Stock</Link>
        <Link style={linkStyle} to="/reports">Reports</Link>
      </nav>
    </div>
  );
}

const linkStyle = {
  color: "#cbd5f5",
  textDecoration: "none",
  fontSize: 15,
};

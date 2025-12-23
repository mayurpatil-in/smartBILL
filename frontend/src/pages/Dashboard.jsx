import { useEffect, useState } from "react";
import api from "../api/axios";

export default function Dashboard() {
  const [sales, setSales] = useState(0);

  useEffect(() => {
    api.get("/reports/sales").then((res) => {
      setSales(res.data.total_sales);
    });
  }, []);

  return (
    <div>
      <h1>Dashboard</h1>
      <div style={{ fontSize: 24 }}>
        💰 Total Sales: ₹ {sales}
      </div>
    </div>
  );
}

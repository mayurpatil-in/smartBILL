import { useEffect, useState } from "react";
import api from "../api/axios";

export default function Invoices() {
  const [invoices, setInvoices] = useState([]);

  useEffect(() => {
    api.get("/invoice").then((res) => setInvoices(res.data));
  }, []);

  return (
    <div>
      <h2>Invoices</h2>
      {invoices.map((inv) => (
        <div key={inv.id}>
          Invoice #{inv.id} – ₹{inv.grand_total}
          <a
            href={`http://127.0.0.1:8000/invoice/${inv.id}/pdf`}
            target="_blank"
          >
            📄 PDF
          </a>
        </div>
      ))}
    </div>
  );
}

### 📂 Backend

```bash
backend/
├── app/
│   ├── main.py
│   ├── core/
│   │   ├── config.py
│   │   ├── security.py
│   │   └── dependencies.py
│   │
│   ├── database/
│   │   ├── session.py
│   │   ├── base.py
│   │   └── init_db.py
│   │
│   ├── models/
│   │   ├── company.py
│   │   ├── user.py
│   │   ├── financial_year.py
│   │   ├── party.py
│   │   ├── item.py
│   │   ├── stock.py
│   │   ├── challan.py
│   │   ├── invoice.py
│   │   ├── employee.py
│   │   ├── attendance.py
│   │   └── salary.py
│   │
│   ├── schemas/
│   │   ├── auth.py
│   │   ├── company.py
│   │   ├── user.py
│   │   ├── party.py
│   │   ├── challan.py
│   │   ├── invoice.py
│   │   └── employee.py
│   │
│   ├── routers/
│   │   ├── auth.py
│   │   ├── company.py
│   │   ├── financial_year.py
│   │   ├── party.py
│   │   ├── challan.py
│   │   ├── invoice.py
│   │   ├── stock.py
│   │   ├── employee.py
│   │   └── reports.py
│   │
│   ├── services/
│   │   ├── auth_service.py
│   │   ├── invoice_service.py
│   │   ├── stock_service.py
│   │   |── salary_service.py
    |   └── financial_year_service.py
│   │
│   ├── middleware/
│   │   ├── auth.py
│   │   └── company_context.py
│   │
│   └── utils/
│       ├── gst.py
│       ├── pdf.py
│       └── helpers.py
│
├── alembic/
├── requirements.txt
└── .env
```

---

### ⭐ Frontend
```bash
frontend/
├── src/
│   ├── api/
│   │   ├── axios.js
│   │   ├── auth.api.js
│   │   └── invoice.api.js
│   │
│   ├── auth/
│   │   ├── Login.jsx
│   │   └── ProtectedRoute.jsx
│   │
│   ├── layouts/
│   │   ├── MainLayout.jsx
│   │   └── Sidebar.jsx
│   │
│   ├── pages/
│   │   ├── Dashboard.jsx
│   │   ├── Party.jsx
│   │   ├── Challan.jsx
│   │   ├── Invoice.jsx
│   │   ├── Stock.jsx
│   │   └── Employee.jsx
│   │
│   ├── components/
│   │   ├── tables/
│   │   ├── forms/
│   │   └── charts/
│   │
│   ├── hooks/
│   ├── utils/
│   └── App.jsx
│
├── package.json
└── vite.config.js

```
# SmartBILL System (SaaS)
Production-ready multi-tenant billing system built with React, FastAPI, and PostgreSQL. Implements real-world accounting workflows including financial year (April–March) management, GST billing, delivery challans, stock control, employee attendance &amp; payroll, and secure role-based access.

## ✅ Tech Stack:
- React JS
- FastAPI
- PostgreSQL

---

## 🚀 Features

### Core Features
- 🔐 Company-wise login (Multi-tenant architecture)
- 📆 Financial year–based accounting (April–March)
- 🧾 GST-compliant invoicing
- 🚚 Delivery challan → Invoice workflow
- 📦 Real-time stock management (ledger-based)
- 👨‍💼 Employee attendance & salary management
- 📊 Role-based dashboard

### Security & Compliance
- JWT authentication
- Role-based access control (RBAC)
- Company-level data isolation
- Immutable invoices
- Audit-friendly schema

---
## ⚙️ BackEnd
### Backend Run
```bash
uv run uvicorn app.main:app --reload
```
### Database Update
```bash
uv run python -c "from app.database.init_db import init_db; init_db()"

uv run uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```
---

## ⭐ FrontEnd
### Frontend Run
```bash
npm run dev
```
### Install Dependencies
```bash
npm install axios react-router-dom @mui/material @mui/icons-material recharts
```
- Design 
```bash
npm install -D tailwindcss postcss autoprefixer
npx tailwindcss init -p
```
---
## Status: 🚧 In Progress
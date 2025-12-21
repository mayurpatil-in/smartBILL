# Database Schema — SmartBILL System (SaaS)

## 1. Overview

This document defines the **database schema** for a **multi-tenant billing and accounting system** designed for Indian businesses.

The schema supports:
- Company-wise (tenant-wise) data isolation
- Financial year–based accounting (April–March)
- GST-compliant billing
- Stock management
- Employee attendance and payroll

The database uses **PostgreSQL** with strong relational integrity.

---

## 2. Core Design Principles

### Multi-Tenancy
- Single database
- Logical tenant isolation using `company_id`
- No cross-company data access

### Financial Year Enforcement
- All transactional data is linked to a `financial_year_id`
- Closed financial years are immutable

### Audit & Compliance
- Timestamped records
- Immutable invoices
- Stock ledger–based inventory

---

## 3. Master Tables

---

### 3.1 Company

Stores tenant (company) information.

```sql
company
-------
id (PK)
name
gst_number
address
phone
email
created_at
updated_at
```

---

### 3.2 Users

Stores system users for each company.

```sql
users
-----
id (PK)
company_id (FK → company.id)
name
email
password_hash
role
is_active
created_at
updated_at
```
### Roles:
- SUPER_ADMIN
- COMPANY_ADMIN
- ACCOUNTANT
- EMPLOYEE

---

### 3.3 Financial Year

Defines accounting period (April to March).
```sql
financial_year
--------------
id (PK)
company_id (FK → company.id)
start_date
end_date
is_active
is_locked
created_at
```
### Rules::
- Only one active financial year per company
- Locked years are read-only
---

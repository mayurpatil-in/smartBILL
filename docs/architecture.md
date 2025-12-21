# System Architecture — smartBill system (SaaS)

## 1. Overview

This project is a **multi-tenant billing and accounting system** built for Indian businesses.  
It supports **company-wise data isolation**, **financial year–based accounting (April–March)**, GST-compliant billing, stock management, and employee payroll.

The system follows a **backend-first, API-driven architecture** with clear separation of concerns and scalability in mind.

---

## 2. High-Level Architecture

Client applications communicate with the backend via REST APIs.

```bash
Client (Browser)
     |
     v
React JS (Frontend)
     |
     v
FastAPI (REST APIs)
     |
     v
PostgreSQL (Database)
```


### Key Characteristics
- Stateless backend using JWT authentication
- Single database with logical multi-tenancy
- Financial-year-aware data model
- Modular backend design

---

## 3. Technology Stack

### Frontend
- React JS (Vite)
- Axios (HTTP client)
- React Query (server state management)
- Ant Design / MUI (UI components)

### Backend
- FastAPI
- SQLAlchemy ORM
- Alembic (database migrations)
- JWT authentication
- `uv` for Python dependency and environment management

### Database
- PostgreSQL

---

## 4. Multi-Tenant Design (Company-wise Isolation)

Each company is treated as a **logical tenant** within the same database.

### Design Rules
- Every master and transaction table contains:
  - `company_id`
  - `financial_year_id`
- `company_id` is embedded inside the JWT token
- Middleware injects company context into every request


### Benefits
- Strong data isolation
- Lower infrastructure cost
- Easy onboarding of new companies

---

## 5. Authentication & Authorization

### Authentication
- JWT access tokens
- Optional refresh token support
- Secure password hashing using bcrypt

### Authorization (RBAC)

| Role | Permissions |
|---|---|
| Super Admin | System-level access |
| Company Admin | Full company access |
| Accountant | Billing, reports |
| Employee | Attendance only |

API routes are protected using role-based dependencies.

---

## 6. Financial Year Handling (April–March)

The system strictly enforces **financial year–based accounting**.

### Rules
- Financial year runs from **1 April to 31 March**
- Only one active financial year per company
- Closed financial years are read-only

All transactional data is linked to a financial year to ensure:
- Accurate reports
- Audit safety
- Legal compliance

---

## 7. Core Business Flow

### Party Management
- Maintain customers and vendors
- Track opening balances

### Delivery Challan
- Generate challans
- Temporary stock deduction
- Convert challan to invoice

### Invoice & Billing
- GST-compliant invoices
- Challan-to-invoice workflow
- Invoices become immutable after generation

### Stock Management
- Centralized stock ledger
- Automatic stock updates on IN/OUT transactions

### Employee & Payroll
- Daily attendance
- Monthly salary calculation

---

## 8. Backend Architecture (FastAPI)

The backend follows **Clean Architecture principles**.


### Advantages
- Testable business logic
- Clear separation of responsibilities
- Easy scalability

---

## 9. Database Design Philosophy

- Normalized schema
- Strong foreign key relationships
- Timestamped records (`created_at`, `updated_at`)
- Soft deletes where required

Every table is designed to be:
- Company-aware
- Financial-year-aware
- Audit-friendly

---

## 10. Error Handling & Logging

- Centralized exception handling
- Meaningful HTTP status codes
- Structured logs for production debugging

---

## 11. Security Considerations

- Short-lived JWT access tokens
- Role-based API protection
- ORM-based query safety
- Company-level data isolation enforced at backend

---

## 12. Scalability & Future Enhancements

Planned enhancements:
- Multi-branch support
- GST return filing (GSTR-1)
- WhatsApp invoice sharing
- Background jobs for reports
- Read replicas for analytics

---

## 13. Deployment Architecture (Planned)


All services will be containerized using Docker.

---

## 14. Architecture Rationale

This architecture is chosen to:
- Reflect real-world accounting systems
- Support SaaS growth
- Ensure data integrity and compliance
- Remain maintainable long-term




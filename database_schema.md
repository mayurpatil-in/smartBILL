# Database Schema Design

This document outlines the full database schema for the Smart Bill Web App.

## Entity Relationship Diagram (ERD)

```mermaid
erDiagram
    %% Auth & User Management
    COMPANY ||--o{ USER : "has users"
    COMPANY ||--o{ ROLE : "has roles"
    ROLE ||--o{ USER : "assigned to"
    ROLE ||--o{ ROLE_PERMISSION : "has"
    PERMISSION ||--o{ ROLE_PERMISSION : "assigned to"
    USER ||--o{ AUDIT_LOG : "performs"
    USER ||--o{ NOTIFICATION : "receives"

    %% Core Business Settings
    COMPANY ||--o{ FINANCIAL_YEAR : "has"
    COMPANY ||--o{ PROCESS : "defines"

    %% Parties & Inventory
    COMPANY ||--o{ PARTY : "manages"
    FINANCIAL_YEAR ||--o{ PARTY : "tracks"

    COMPANY ||--o{ ITEM : "stocks"
    ITEM }o--|| PROCESS : "undergoes"
    ITEM }o--|| STOCK_TRANSACTION : "logged in"

    %% Sales & Invoicing Flow
    PARTY ||--o{ INVOICE : "billed to"
    INVOICE ||--o{ INVOICE_ITEM : "contains"
    ITEM ||--o{ INVOICE_ITEM : "listed in"

    PARTY ||--o{ DELIVERY_CHALLAN : "receives"
    DELIVERY_CHALLAN ||--o{ DELIVERY_CHALLAN_ITEM : "contains"
    ITEM ||--o{ DELIVERY_CHALLAN_ITEM : "includes"

    PARTY ||--o{ PARTY_CHALLAN : "sends"
    PARTY_CHALLAN ||--o{ PARTY_CHALLAN_ITEM : "contains"
    ITEM ||--o{ PARTY_CHALLAN_ITEM : "includes"

    %% Financials
    PARTY ||--o{ PAYMENT : "makes/receives"
    PAYMENT ||--o{ PAYMENT_ALLOCATION : "allocates"
    INVOICE ||--o{ PAYMENT_ALLOCATION : "paid by"
    COMPANY ||--o{ EXPENSE : "incurs"
    PARTY ||--o{ EXPENSE : "paid to"

    %% HR & Payroll
    USER ||--|| EMPLOYEE_PROFILE : "has"
    USER ||--o{ ATTENDANCE : "marks"
    USER ||--o{ SALARY_ADVANCE : "requests"

    %% Table Definitions
    COMPANY {
        int id PK
        string name
        string gst_number
        date subscription_end
    }

    USER {
        int id PK
        int company_id FK
        int role_id FK
        string name
        string email
        string password_hash
    }

    ROLE {
        int id PK
        string name
        boolean is_system_role
    }

    PERMISSION {
        int id PK
        string code
        string module
        string action
    }

    PARTY {
        int id PK
        int company_id FK
        string name
        string gst_number
        numeric opening_balance
    }

    ITEM {
        int id PK
        string name
        string hsn_code
        numeric rate
    }

    INVOICE {
        int id PK
        string invoice_number
        date invoice_date
        numeric grand_total
        string payment_status
    }

    PAYMENT {
        int id PK
        date payment_date
        numeric amount
        string payment_type
        string payment_mode
    }
```

## Detailed Schema Description

### 1. Authentication & User Management

| Table                | Description                                                                                  | Key Columns                                             |
| :------------------- | :------------------------------------------------------------------------------------------- | :------------------------------------------------------ |
| **users**            | Stores system users (Super Admin, Company Admins, Employees).                                | `id`, `company_id`, `role_id`, `email`, `password_hash` |
| **roles**            | Defines user roles (e.g., 'Company Admin', 'Sales Manager'). System roles cannot be deleted. | `id`, `company_id`, `name`, `is_system_role`            |
| **permissions**      | Granular permissions for modules (e.g., `invoices.create`).                                  | `id`, `code`, `module`, `action`                        |
| **role_permissions** | Many-to-many link between Rolse and Permissions.                                             | `role_id`, `permission_id`                              |
| **audit_logs**       | Tracks important user actions for security and debugging.                                    | `user_id`, `action`, `details`, `ip_address`            |
| **notifications**    | System notifications for users.                                                              | `title`, `message`, `type`, `is_read`                   |

### 2. Core Business Structure

| Table              | Description                                                | Key Columns                                    |
| :----------------- | :--------------------------------------------------------- | :--------------------------------------------- |
| **company**        | The tenant/business entity. Includes subscription details. | `id`, `name`, `gst_number`, `subscription_end` |
| **financial_year** | Fiscal years for accounting boundaries.                    | `id`, `company_id`, `start_date`, `end_date`   |
| **processes**      | Manufacturing processes (e.g., 'Casting', 'Polishing').    | `id`, `company_id`, `name`                     |

### 3. CRM & Inventory

| Table                  | Description                                           | Key Columns                                     |
| :--------------------- | :---------------------------------------------------- | :---------------------------------------------- |
| **party**              | Customers and Vendors.                                | `id`, `company_id`, `name`, `gst_number`        |
| **items**              | Products/Services for sale or purchase.               | `id`, `name`, `hsn_code`, `rate`, `process_id`  |
| **stock_transactions** | Logs stock movements (IN/OUT) for inventory tracking. | `id`, `item_id`, `quantity`, `transaction_type` |

### 4. Sales & Invoicing

| Table                      | Description                                          | Key Columns                                                 |
| :------------------------- | :--------------------------------------------------- | :---------------------------------------------------------- |
| **invoice**                | Sales invoices generated for parties.                | `id`, `invoice_number`, `party_id`, `grand_total`, `status` |
| **invoice_items**          | Line items within an invoice.                        | `id`, `invoice_id`, `item_id`, `quantity`, `rate`, `amount` |
| **delivery_challan**       | Delivery notes for shipping goods.                   | `id`, `challan_number`, `party_id`, `status`                |
| **delivery_challan_items** | Items included in a delivery challan.                | `id`, `challan_id`, `item_id`, `quantity`                   |
| **party_challan**          | Challans received from parties (e.g., for job work). | `id`, `challan_number`, `party_id`, `status`                |
| **party_challan_items**    | Items inside a party challan.                        | `id`, `party_challan_id`, `item_id`, `quantity_ordered`     |

### 5. Financials

| Table                  | Description                             | Key Columns                                                         |
| :--------------------- | :-------------------------------------- | :------------------------------------------------------------------ |
| **payments**           | Payments made or received.              | `id`, `party_id`, `amount`, `payment_date`, `type` (PAID/RECEIVED)  |
| **payment_allocation** | Links payments to specific invoices.    | `payment_id`, `invoice_id`, `amount`                                |
| **expenses**           | Business expenses (e.g., Rent, Salary). | `id`, `category`, `amount`, `payment_method`, `party_id` (optional) |

### 6. HR & Payroll

| Table                 | Description                                   | Key Columns                                                          |
| :-------------------- | :-------------------------------------------- | :------------------------------------------------------------------- |
| **employee_profiles** | Extended profile for users who are employees. | `user_id`, `designation`, `base_salary`, `joining_date`, `documents` |
| **attendance**        | Daily attendance logs.                        | `user_id`, `date`, `status`, `overtime_hours`                        |
| **salary_advances**   | Tracks salary advances given to employees.    | `user_id`, `amount`, `date`, `is_deducted`                           |

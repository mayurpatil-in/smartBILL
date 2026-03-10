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

uv run uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

### Database Update

```bash
uv run python -c "from app.database.init_db import init_db; init_db()"

uv run alembic init alembic
uv run alembic revision --autogenerate -m "add user roles and company subscription"
uv run alembic upgrade head

```

---

## ⭐ FrontEnd

### Frontend Run

```bash
npm run dev -- --host
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

## ⭐ Desktop

### Dektop Run

```bash
npm run tauri dev

npm run tauri icon app-icon.png # Change app-icon.png to your icon

uv run build_desktop.py

netstat -ano | findstr :8000 || echo Port 8000 is free
```

### VPS sql

```bash
sudo -i -u postgres
psql
```

## Run on Android

To start the app on an emulator/device:

```powershell
npx tauri android dev
```

## Status: 🚧 In Progress

---

## 🗺️ Quick Navigation

| #   | Module                                                                   | What It Does                           |
| --- | ------------------------------------------------------------------------ | -------------------------------------- |
| 1   | [Dashboard](#1--dashboard)                                               | Business overview at a glance          |
| 2   | [GST Invoicing](#2--gst-compliant-invoicing)                             | Create & send professional invoices    |
| 3   | [Delivery Challans](#3--delivery-challan-system)                         | Track goods sent to customers          |
| 4   | [Party Challans](#4--party-challans-vendor-job-work)                     | Track goods sent/received from vendors |
| 5   | [Parties (Customers & Vendors)](#5--parties-customer--vendor-management) | Manage your contacts and ledger        |
| 6   | [Payments](#6--payment-management)                                       | Record money received or paid          |
| 7   | [Items & Inventory](#7--items--inventory-management)                     | Product catalog and stock tracking     |
| 8   | [Expenses](#8--expense-management)                                       | Track all business spending            |
| 9   | [Employees & Payroll](#9--employee-management--payroll)                  | Attendance, salary, advances           |
| 10  | [Reports](#10--reports--analytics)                                       | Sales, GST, P&L, stock reports         |
| 11  | [AI Insights](#11--ai-insights)                                          | Smart business intelligence            |
| 12  | [Client Portal](#12--client-portal-for-your-customers)                   | Self-service for your customers        |
| 13  | [User Management & Roles](#13--user-management--roles)                   | Manage your team's access              |
| 14  | [Settings](#14--settings--configuration)                                 | Company profile, FY, processes         |

---

## 1. 📊 Dashboard

### What It Does

The Dashboard gives you a **real-time snapshot** of your entire business — sales, expenses, pending payments, top customers, and more — all in one screen.

### Key Widgets

| Widget                 | What You See                           |
| ---------------------- | -------------------------------------- |
| **Total Sales**        | Revenue for the current financial year |
| **Outstanding Amount** | How much money customers owe you       |
| **Total Expenses**     | How much you've spent this year        |
| **Cash Flow Chart**    | Income vs. Expenses over time          |
| **Top Customers**      | Highest revenue-generating parties     |
| **Overdue Invoices**   | Invoices past their due date           |
| **Expense Breakdown**  | Pie chart by category                  |
| **Monthly Trend**      | Month-over-month sales bar chart       |

### How to Use

1. Log in → you land on the Dashboard automatically
2. Use the **Financial Year** selector (top bar) to switch between years
3. Click any card (e.g., "Overdue Invoices") to jump to that module directly
4. Data refreshes in real-time as you create invoices, payments, etc.

---

## 2. 🧾 GST-Compliant Invoicing

### What It Does

Create professional **GST invoices** (CGST/SGST/IGST), track payment status, generate PDFs, and manage payment history — all in one place.

### Invoice Features

- GST calculations: CGST, SGST, IGST auto-computed
- HSN code on each line item
- Customizable invoice number prefix
- Payment terms (Due in 7/15/30 days)
- Payment status: **Paid | Partial | Unpaid | Overdue**
- PDF generation for printing or WhatsApp/email
- Discount and additional charges support

### How to Create an Invoice

1. Go to **Invoices → New Invoice**
2. Select **Party** (customer) from the dropdown — or add a new one
3. Set **Invoice Date** and **Due Date**
4. Add line items:
   - Select Item → Rate, Quantity auto-filled
   - Tax % automatically applies
5. Add **Discount** or **Additional Charges** (optional)
6. Review totals → Click **Save Invoice**
7. Click **Download PDF** to share with the customer

### Converting a Challan to Invoice

1. Go to **Challans**
2. Find the challan → click **Convert to Invoice**
3. Items auto-populate — adjust if needed and save

### Recording a Payment Against an Invoice

1. Open the invoice → click **Record Payment**
2. Enter amount, payment mode (Cash/UPI/Bank/Cheque), and date
3. The invoice status updates automatically (Partial → Paid)

### Payment Status Guide

| Status         | Meaning              |
| -------------- | -------------------- |
| 🟢 **Paid**    | Fully settled        |
| 🟡 **Partial** | Some amount received |
| 🔴 **Unpaid**  | No payment yet       |
| ⚠️ **Overdue** | Due date has passed  |

---

## 3. 🚚 Delivery Challan System

### What It Does

Create **delivery notes** when you send goods to customers — before or independent of invoicing. Each challan can have a **QR code** that customers can scan to verify delivery.

### Challan Features

- Challan number with auto-increment
- QR code generation for each challan
- PDI (Pre-Delivery Inspection) report generation
- Status tracking: **Pending → Delivered → Invoiced**
- Bulk print multiple challans
- Convert directly to invoice

### How to Create a Delivery Challan

1. Go to **Challans → New Challan**
2. Select **Party** (customer)
3. Add items (name, quantity, rate)
4. Click **Save**
5. Use **Print** or **Download PDF** to give to the delivery person

### QR Code Verification

- Each challan generates a unique QR code
- Customer or delivery staff **scans the QR** with any phone
- Public page opens showing challan details — **no login required**
- Confirms delivery authenticity

### PDI Report (Pre-Delivery Inspection)

1. Open a challan → click **Generate PDI Report**
2. Document item-wise inspection status
3. Include in delivery package for quality assurance

---

## 4. 📦 Party Challans (Vendor / Job Work)

### What It Does

Track goods you **send to vendors** for job work (e.g., Casting, Polishing) or **receive** raw materials. Essential for manufacturing workflows.

### How to Use

1. Go to **Party Challans → New Party Challan**
2. Select **Party** (vendor/job worker)
3. Select **Process** (e.g., Casting, Polishing)
4. Add items with quantities sent
5. Save → track when items return

### Status Tracking

| Status             | Meaning                  |
| ------------------ | ------------------------ |
| **Pending**        | Items sent, not returned |
| **Partial Return** | Some items received back |
| **Completed**      | All items returned       |

---

## 5. 👥 Parties (Customer & Vendor Management)

### What It Does

Maintain a complete database of all your **customers and vendors** with their GST numbers, balances, transaction history, and ledger.

### Party Profile Contains

- Name, GST number, address, phone
- Opening balance (Dr/Cr)
- Credit limit
- Complete transaction ledger

### How to Add a Party

1. Go to **Parties → Add Party**
2. Fill: Name, GST Number, Address, Contact
3. Set **Opening Balance** if they owe you money (or you owe them)
4. Click Save

### Party Ledger

1. Click on any party name → **View Ledger**
2. See all invoices, payments, challans in one timeline
3. Running balance shown for each transaction
4. **Outstanding Amount** displayed prominently
5. Export ledger as PDF

### Aging Analysis

- See which invoices are **0-30, 30-60, 60-90, 90+ days** overdue
- Available in **Reports → Outstanding Aging**

---

## 6. 💰 Payment Management

### What It Does

Record all money **received from customers** or **paid to vendors**, link payments to invoices, and view full payment history.

### Payment Modes Supported

`Cash` | `Cheque` | `UPI` | `Bank Transfer` | `Card`

### How to Record a Payment Received

1. Go to **Payments → New Payment**
2. Set Type: **Received**
3. Select Party (customer)
4. Enter Amount, Date, Payment Mode, Reference No.
5. **Allocate to Invoice(s)**: tick the invoices this payment covers
6. Save → invoice status updates automatically

### How to Record a Payment Made (to vendor)

1. Same flow but set Type: **Paid**
2. Select vendor party
3. Link to expenses or outstanding balances

### Payment History

- View all payments under **Payments → Payment List**
- Filter by party, date range, or payment mode
- Export to PDF or print receipts

---

## 7. 🏷️ Items & Inventory Management

### What It Does

Manage your **product/service catalog** and track real-time stock levels. Every invoice or challan automatically updates stock.

### Item Details

- Item name, HSN code, default rate
- Tax rate (GST %)
- Assigned manufacturing process
- Multiple product images
- Unit of measure

### How to Add an Item

1. Go to **Items → Add Item**
2. Fill Name, HSN Code, Rate, Tax %
3. Assign a **Process** if it goes through manufacturing
4. Upload product images (optional)
5. Save

### Stock Tracking

- Every **delivery challan** reduces stock (OUT)
- Every **party challan received** increases stock (IN)
- View current stock: **Items → Stock Report**
- Full movement history per item

### Reading the Stock Ledger

| Column      | Meaning                           |
| ----------- | --------------------------------- |
| **Date**    | Transaction date                  |
| **Type**    | IN (received) or OUT (dispatched) |
| **Qty**     | Units moved                       |
| **Balance** | Running stock total               |

---

## 8. 💸 Expense Management

### What It Does

Record and categorize all **business expenses** — rent, utilities, salaries, transport, etc. — and see where your money is going.

### Expense Categories

`Rent` | `Salaries` | `Utilities` | `Transportation` | `Office Supplies` | `Marketing` | `Custom`

### How to Record an Expense

1. Go to **Expenses → Add Expense**
2. Select **Category**
3. Enter Amount, Date, Description
4. Select **Payment Method** (Cash/Bank/UPI)
5. Link to a **Party** (optional — e.g., landlord for rent)
6. Save

### Expense Reports

- Go to **Reports → Expense Report**
- Filter by category, date range, or party
- View monthly breakdown chart
- Compare expenses vs. revenue

---

## 9. 👨‍💼 Employee Management & Payroll

### What It Does

Manage the **complete HR lifecycle** — employee profiles, daily attendance, salary calculation, advances, and salary slips.

### Employee Profile Contains

- Personal info, designation, department
- Joining date, employment status
- Salary structure (Monthly/Daily/Hourly)
- Documents (Aadhar, PAN card scans)
- Employee photo

### How to Add an Employee

1. Go to **Employees → Add Employee**
2. Fill personal details + designation
3. Set Salary: Base salary, type (Monthly/Daily/Hourly)
4. Upload documents
5. Save → employee is now in the system

### Marking Attendance

1. Go to **Employees → Attendance**
2. Select the date (today is pre-filled)
3. For each employee, mark:
   - ✅ **Present**
   - ❌ **Absent**
   - 🌗 **Half Day**
   - 🏖️ **Leave**
   - 🎉 **Holiday**
4. Enter **Overtime Hours** if applicable
5. Save

### Salary Calculation

1. Go to **Employees → Salary**
2. Select **Month** and **Year**
3. Salary auto-calculated based on:
   - Attendance days × daily rate
   - Overtime hours × overtime rate
   - Minus: advances and deductions
4. Review and **Generate Salary Slip** PDF
5. Record payment when salary is paid

### Salary Advances

1. Go to **Employees → Salary Advances**
2. Record advance given: amount + date
3. Advance is automatically deducted from next salary
4. Track balance remaining

---

## 10. 📊 Reports & Analytics

### What It Does

Generate comprehensive **financial, sales, inventory, GST, and HR reports** — all filterable by date and exportable as PDF.

### Available Reports

#### 💹 Financial Reports

| Report                  | What It Shows                   |
| ----------------------- | ------------------------------- |
| **Sales Report**        | All invoices by date/party/item |
| **Purchase Report**     | Vendor transactions             |
| **Profit & Loss**       | Income minus expenses           |
| **Cash Flow Statement** | Money in vs. money out          |
| **Outstanding Report**  | Who owes you money              |
| **Aging Analysis**      | Overdue buckets (30/60/90 days) |

#### 🧾 GST Reports

| Report                 | Use Case                |
| ---------------------- | ----------------------- |
| **GSTR-1 Ready Data**  | Sales to file GSTR-1    |
| **GSTR-3B Ready Data** | Summary for GST payment |
| **GST Summary**        | CGST/SGST/IGST breakup  |

#### 📦 Inventory Reports

| Report                 | What It Shows                     |
| ---------------------- | --------------------------------- |
| **Stock Summary**      | Current stock of all items        |
| **Stock Movement**     | IN/OUT history                    |
| **Item-wise Sales**    | Best selling items                |
| **Process-wise Stock** | Stock at each manufacturing stage |

#### 👥 HR Reports

| Report                 | What It Shows                   |
| ---------------------- | ------------------------------- |
| **Attendance Summary** | Monthly attendance per employee |
| **Salary Report**      | Salary paid per month           |
| **Leave Report**       | Leave days taken                |

### How to Generate a Report

1. Go to **Reports** in the left menu
2. Select report type from the tabs
3. Set **Date Range** and any filters (Party, Item, Employee)
4. Click **Generate**
5. Click **Download PDF** or **Print**

---

## 11. 🤖 AI Insights

### What It Does

AI Insights analyzes your business data and gives you **intelligent recommendations** and trend analysis to help you make better decisions.

### AI Capabilities

- **Revenue Trends**: Spot growing/declining sales patterns
- **Top Performers**: Best customers and best-selling products
- **Cash Flow Forecast**: Predict upcoming cash needs
- **Expense Analysis**: Identify areas of overspending
- **Outstanding Risk**: Flag customers with long overdue payments
- **Inventory Recommendations**: Items running low or overstocked

### How to Use

1. Go to **AI Insights** in the left menu
2. Select analysis category:
   - Sales Analysis
   - Expense Analysis
   - Customer Insights
   - Inventory Analysis
3. Set date range
4. Review the AI-generated insights and charts
5. Use recommendations for business decisions

---

## 12. 🌐 Client Portal (For Your Customers)

### What It Does

Give your **customers their own login** to view invoices, download PDFs, check their balance, and see their full transaction statement — **without calling you**.

### What Customers Can Do in the Portal

- ✅ Log in securely with their credentials
- ✅ View all invoices issued to them
- ✅ Download invoice PDFs
- ✅ Check outstanding balance
- ✅ View full ledger statement
- ✅ See payment history
- ✅ Update their profile
- ✅ Toggle Dark/Light mode

### How to Give a Customer Portal Access

1. Go to **User Management → Add User**
2. Set Role as **Client**
3. Link to the **Party** (customer) account
4. Set email and password
5. Share credentials with the customer
6. Customer visits your portal URL and logs in

### Customer Login URL

Customers log in at: `https://yourdomain.com/client/login`

---

## 13. 🔐 User Management & Roles

### What It Does

Control **who can access what** in SmartBILL. Create custom roles for Sales staff, Accountants, Warehouse managers, etc., each with specific permissions.

### User Roles Overview

| Role              | Access Level                        |
| ----------------- | ----------------------------------- |
| **Super Admin**   | Manages all companies in the system |
| **Company Admin** | Full access to your company         |
| **Custom Roles**  | You define what they can see/do     |
| **Client**        | Customer portal only                |

### How to Create a Custom Role

1. Go to **Role Management → Create Role**
2. Give the role a name (e.g., "Sales Manager")
3. Tick the permissions they need:
   - `invoices.view`, `invoices.create`, `invoices.edit`
   - `reports.view`
   - `parties.view`, etc.
4. Save the role

### How to Add a Team Member

1. Go to **User Management → Add User**
2. Enter Name, Email, Password
3. Assign a **Role**
4. Save → they can log in immediately

### Permission Levels Per Module

| Permission | What It Allows          |
| ---------- | ----------------------- |
| **View**   | Read-only access        |
| **Create** | Add new records         |
| **Edit**   | Modify existing records |
| **Delete** | Remove records          |

---

## 14. ⚙️ Settings & Configuration

### What It Does

Configure your **company profile**, financial years, manufacturing processes, and system preferences.

### Company Settings

1. Go to **Settings → Company Profile**
2. Update:
   - Company Name, Logo
   - GST Number, PAN
   - Address, Phone, Email
   - Bank Account Details (shown on invoices)
3. Save → changes reflect on all future PDFs/invoices

### Financial Year Management

1. Go to **Settings → Financial Year**
2. **Create New FY**: Set start date (April 1) and end date (March 31)
3. **Set Active FY**: Click "Set as Active" to switch years
4. All reports and data filter by the active FY

> [!TIP]
> Switch financial year using the **FY selector** in the top navigation bar — you can view historical data without changing the active year.

### Process Management (Manufacturing)

1. Go to **Settings → Processes**
2. Add processes: e.g., Casting, Polishing, Finishing
3. Assign processes to **Items** in the Items module
4. Track stock at each process stage

### Invoice Customization

- Go to **Settings → Invoice Settings**
- Set Invoice Number Prefix (e.g., `INV-2425-`)
- Configure default payment terms
- Add custom footer text
- These settings apply to all new invoices

---

## 🔄 Common Business Workflows

### 📤 Complete Sales Cycle

```
1. Add Customer to Parties
       ↓
2. Create Delivery Challan (when goods dispatched)
       ↓
3. Generate PDI Report (optional quality check)
       ↓
4. Convert Challan → Invoice
       ↓
5. Share Invoice PDF with Customer
       ↓
6. Record Payment when received
       ↓
7. Allocate Payment to Invoice → Status: PAID ✅
```

### 🏭 Manufacturing / Job Work Cycle

```
1. Create Item with Process assigned
       ↓
2. Send raw material via Party Challan (to vendor)
       ↓
3. Vendor processes the goods (Casting, Polishing, etc.)
       ↓
4. Receive finished goods back → update Party Challan status
       ↓
5. Stock updated automatically
       ↓
6. Create Delivery Challan to customer
       ↓
7. Invoice and collect payment
```

---

## 🔒 Security & Data Safety

| Feature               | Detail                                                 |
| --------------------- | ------------------------------------------------------ |
| **Secure Login**      | JWT-based authentication                               |
| **Role-Based Access** | Each user sees only what they're permitted             |
| **Audit Logs**        | Every action is tracked with user, time, IP            |
| **Data Backup**       | One-click backup — download and restore anytime        |
| **Data Isolation**    | Your company's data is completely separate from others |
| **HTTPS**             | All data encrypted in transit                          |

### How to Take a Backup

1. Go to **Backup** in the menu (Admin only)
2. Click **Create Backup Now**
3. Download the backup file and store it safely
4. To restore: contact your system administrator

---

## 📱 Platform Support

SmartBILL works across:

- 🌐 **Web Browser** (Chrome, Firefox, Edge, Safari)
- 🖥️ **Desktop App** (Windows / macOS / Linux via Tauri)
- 📱 **Mobile App** (Android via Tauri)

All platforms sync with the same data in real-time.

---

## ❓ Frequently Asked Questions

**Q: Can multiple users work at the same time?**
A: Yes, SmartBILL is a multi-user system. Each team member has their own login.

**Q: Can I see data from previous financial years?**
A: Yes. Use the FY selector in the top bar to switch years and view historical data.

**Q: Is my data safe?**
A: Yes. All data is stored in a secure database with regular backups, HTTPS encryption, and role-based access control.

**Q: Can my customers see their own invoices?**
A: Yes! Use the **Client Portal** feature to give customers their own login.

**Q: What GST reports does SmartBILL generate?**
A: GSTR-1 ready data, GSTR-3B summary, and full GST breakup by CGST/SGST/IGST — all filterable by date.

**Q: Can I add my company logo to invoices?**
A: Yes. Upload your logo in **Settings → Company Profile** and it appears on all invoices and PDFs.

**Q: What if I make an error on an invoice?**
A: You can edit invoices (if permissions allow). All edits are logged in the audit trail.

---

_SmartBILL — Built for Indian Businesses | GST Compliant | Secure | Multi-Platform_

# Document Management System (DMS) - Comprehensive System Documentation

> [!NOTE]
> This document provides a high-level overview of the architectural decisions, authorization systems, and core workflow modules for the Document Management System (DMS). It is intended as a single source of truth for both developers and system administrators.

## 1. System Overview

### Purpose & Scope
The DMS is an enterprise-level, secure web application designed to track engineering workflows, quality control inspections, vendor submissions, and client approvals. It acts as the central hub for storing documents, orchestrating tiered approval processes, and maintaining a robust audit trail.

### Technology Stack
- **Frontend**: 
  - **Framework**: React 19 + Vite (Fast HMR and optimal bundling)
  - **Styling**: Tailwind CSS (Utility-first framework) + Radix UI / `shadcn/ui` (Accessible component library)
  - **Routing**: React Router v7 (`routes.jsx`)
  - **Data Visualization**: Recharts
  - **Utilities**: Date-fns (date formatting), XLSX (Excel export/parsing)
- **Backend**:
  - **Runtime**: Node.js + Express.js
  - **Database & ORM**: PostgreSQL managed via Prisma ORM v7
  - **Authentication**: JWT (JSON Web Tokens) with `bcryptjs`
  - **File Handling**: Multer (Uploads), Archiver, PDFKit
  - **Scheduled Tasks**: `node-cron`
  - **Email Integration**: Nodemailer (for temporary passwords and alerts)

### Architecture
- **Stateless REST API**: The backend is organized into standard `Controllers` and `Services`. State is maintained entirely via PostgreSQL and JWTs.
- **Unified Error Handling**: Shared error middlewares to ensure consistent API response shapes.
- **Centralized Data Tables**: The frontend relies heavily on the `ProDataTable` component for robust, server-side paginated data grids.

---

## 2. User Roles & Authorization (RBAC)

The system relies on a rigid **Role-Based Access Control (RBAC)** architecture to ensure engineers, administrators, and clients only access what they are permitted to see or approve.

### Core Roles
- **Site Admin**: God-mode access, can create companies and assign Company Admins.
- **Admin**: Standard company-wide administrator. Has access to the Approval Center, Audit Logs, User Management, and Reporting.
- **DCC (Document Control Center)**: Manages Jobs, Purchase Orders, Transmissions, and Document assignments.
- **QC Engineer**: Responsible for reviewing and approving NDT joints, Material Heat Charts, DCRs, and NCRs.
- **Production Engineer**: Responsible for creating/submitting initial drafts and workflows (e.g., Weld Joints, NCRs, Inspections).
- **Design Engineer**: Reviews technical documents like Design Change Requests (DCRs) and specific NCRs.
- **Marketing**: Handles the Request for Quotation (RFQ) module.
- **Weld Plan Admin / NDT Engineer**: Specialized roles for the welding joints workflow.

### Enforcement
- **Frontend**: Routes are guarded via a `protect()` wrapper in `routes.jsx` which intercepts the route based on the authenticated user's token roles.
- **Backend**: Protected endpoints use JWT extraction middleware to verify the user role before hitting the Controller logic.

---

## 3. Core Modules & Workflows

### 3.1 Administration & Settings
- **User Management**: Admins can invite users, assign roles, and trigger forced password resets.
- **Organization Hierarchy**: Management of Departments, QC Groups, and legacy Group structures.

### 3.2 Document Control Center (DCC)
The DCC handles the ingestion and transmission of engineering documents.
- **Jobs & POs**: Creating core entities that link to physical components.
- **Drawing Transmittals (DTN)**: Generating Drawing Transmittal Notes to track when documents are sent to clients for review.

### 3.3 Material Heat Chart (MHC)
- **Purpose**: Traceability of raw materials and heat numbers used in manufacturing.
- **Workflow**: Production Engineers upload bulk MHC data via Excel. QC Engineers review the items, approving or rejecting specific material records to ensure metallurgical compliance.

### 3.4 Welding Joints
- **Purpose**: Tracking individual welding joints through construction.
- **Workflow**: 
  - Tracks Fit-up, Root, and Final welding stages.
  - Generates NDT (Non-Destructive Testing) requests and tracks their results (RT, UT, PT).

### 3.5 Quality Assurance Plan (QAP)
- **Purpose**: Building hierarchical Quality Assurance check plans.
- **Workflow**: Organizes structured headings, operations, and checkpoints specific to engineering jobs.

### 3.6 Request for Quotation (RFQ)
- **Purpose**: Tracks incoming client RFQs, target dates, and submission statuses.
- **Access**: Restricted primarily to the Marketing role. 

### 3.7 Non-Conformance Reports (NCR)
- **Purpose**: Documenting engineering or manufacturing deviations.
- **Workflow**: Allows tiered approval sequences across Production, Quality, and Design Engineering teams to close out issues.

### 3.8 Design Change Requests (DCR)
- **Purpose**: Tracking structural or design modifications post-approval.
- **Workflow**: Requires multi-tier approvals before the physical change can be executed on the shop floor.

### 3.9 Inspections
- Tracks distinct quality inspection reports:
  - **Dish End Inspection Report**
  - **Final Inspection Report**
  - **Hydrostatic Pressure Test Report**
- These reports follow a standard Draft -> Pending -> Approved workflow.

---

## 4. Centralized Features

### Approval Center Dashboard
> [!TIP]
> The Approval Center is the primary workflow hub for Administrators and Approvers.

- Consolidates pending tasks from **10 distinct modules** into a single, paginated list.
- **Supported Modules**: MHC, Weld Joints, DTN, QAP, NCR, DCR, RFQ, Dish End, Final Inspection, and Hydrostatic Tests.
- Includes quick-action "Review" buttons that seamlessly deep-link the user to the specific module's approval dialog.

### Enterprise Audit Logging
> [!IMPORTANT]
> The DMS tracks all destructive and modifying actions for strict accountability.

- Automatically intercepts all `POST`, `PUT`, `PATCH`, and `DELETE` requests.
- Resolves human-readable module references (e.g., logging "RFQ-1024" instead of "a uuid").
- Administrators can review the immutable audit logs via the `/admin/audit-logs` dashboard.

---

## 5. Development & Setup Guide

### Environment Configuration
The backend relies on a `.env` file containing critical keys:
```env
DATABASE_URL="postgresql://user:password@localhost:5432/dms"
JWT_SECRET="your-secure-secret"
SMTP_HOST="smtp.example.com"
# ... other SMTP configs
```

### Database Migrations
Changes to `schema.prisma` must be synchronized to the PostgreSQL database.
```bash
# Push schema to database without creating a formal migration file
npx prisma db push

# Generate the local Prisma Client types
npx prisma generate
```

### Starting the Application
```bash
# Terminal 1: Backend
cd backend
npm run dev # Uses nodemon

# Terminal 2: Frontend
cd frontend
npm run dev # Uses vite
```

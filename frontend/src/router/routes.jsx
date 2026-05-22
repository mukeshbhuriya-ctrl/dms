import App from "@/App"
import ProtectedRoute from "@/components/ProtectedRoute"
import AppLayout from "@/components/layout/AppLayout"
import { ROLES, MODULES } from "@/config/roles"

import {
  SiteAdminLogin,
  SiteAdminDashboard,
  SiteAdminCreateCompany,
} from "@/pages/siteadmin"
import { UserDashboard, UploadDocument } from "@/pages/user"

import {
  AssignDocument,
  CreateJob,
  CreatePO,
  CreateTransmission,
  DocumentApprover,
  SendDocumentToClient,
  CreateCustomer,
  CreateLocation,
  ClientApprovalStatus,
  CommunicationMatrix,
} from "@/pages/dms"

import {
  AdminDashboard,
  CreateUser,
  DepartmentManagement,
  GroupManagement,
  FinalInspectionReports,
  Reports,
  AuditLogs,
  ApprovalCenter,
} from "@/pages/admin"
import JobOverview from "@/pages/admin/job_360"
import { WeldingJoints } from "@/pages/wpj/admin"
import { ViewWeldingJoints } from "@/pages/wpj/user"
import { MaterialHeatChart } from "@/pages/admin/material_heat_chart"
import { InspectionReport, HydroPresText } from "@/pages/admin/hydro"
import { CreateQARP, HeadingMaster } from "@/pages/admin/qap"
import { CreateDCR } from "@/pages/dcr"
import { RfqRegister, RfqLookupManager, RfqDashboard } from "@/pages/marketing"
import { CreateNCR } from "@/pages/ncr"
import { DrawingMaster, DrawingTransmittal } from "@/pages/dtn"

// ─── Helper: wrap element with ProtectedRoute + Permission guard ─────
const protect = (element, moduleKey = null, allowedRoles = null) => (
  <ProtectedRoute moduleKey={moduleKey} allowedRoles={allowedRoles}>
    {element}
  </ProtectedRoute>
)

// ─── Site Admin (separate auth system) ─────────────────────────
const siteAdminRoutes = [
  { path: "/siteadmin/login", element: <SiteAdminLogin /> },
  {
    path: "/siteadmin/dashboard",
    element: (
      <ProtectedRoute
        authKey="siteadmin_auth"
        apiEndpoint="/api/siteadmin/auth/me"
        loginPath="/siteadmin/login"
      >
        <SiteAdminDashboard />
      </ProtectedRoute>
    ),
  },
  {
    path: "/siteadmin/create-company",
    element: (
      <ProtectedRoute
        authKey="siteadmin_auth"
        apiEndpoint="/api/siteadmin/auth/me"
        loginPath="/siteadmin/login"
      >
        <SiteAdminCreateCompany />
      </ProtectedRoute>
    ),
  },
]

// ─── User Routes ───────────────────────────────────────────────
const userRoutes = [
    {
    path: "/user/dashboard",
    element: protect(
      <UserDashboard />,
      MODULES.DASHBOARD_USER,
      [ROLES.DCC, ROLES.USER, ROLES.PRODUCTION_ENGINEER, ROLES.QC_ENGINEER, ROLES.NDT_ENGINEER, ROLES.WELD_PLAN_ADMIN, ROLES.DESIGN_ENGINEER, ROLES.TAXATION, ROLES.QAP],
    ),
  },
  {
    path: "/user/upload-documents",
    element: protect(
      <UploadDocument />,
      MODULES.DMS.UPLOAD,
      [ROLES.USER, ROLES.PRODUCTION_ENGINEER, ROLES.QC_ENGINEER, ROLES.DCC, ROLES.ADMIN]
    ),
  },
]

// ─── DCC Routes ────────────────────────────────────────────────
const dccRoutes = [
  {
    path: "/dcc/create-customer",
    element: protect(<CreateCustomer />, MODULES.CUSTOMERS.CUSTOMER, [ROLES.ADMIN, ROLES.DCC, ROLES.TAXATION]),
  },
  {
    path: "/dcc/create-location",
    element: protect(<CreateLocation />, MODULES.CUSTOMERS.LOCATION, [ROLES.ADMIN, ROLES.DCC, ROLES.TAXATION]),
  },
  {
    path: "/dcc/create-po",
    element: protect(<CreatePO />, MODULES.PO_MANAGEMENT, [ROLES.ADMIN, ROLES.DCC, ROLES.TAXATION]),
  },
  {
    path: "/dcc/create-job",
    element: protect(<CreateJob />, MODULES.JOB_MANAGEMENT, [ROLES.ADMIN, ROLES.DCC, ROLES.TAXATION]),
  },
  {
    path: "/dcc/communication-matrix",
    element: protect(<CommunicationMatrix />, MODULES.DMS.MASTER, [ROLES.ADMIN, ROLES.DCC]),
  },
  {
    path: "/dcc/documents",
    element: protect(<AssignDocument />, MODULES.DMS.VDR, [ROLES.ADMIN, ROLES.DCC]),
  },
  {
    path: "/dcc/document-approver",
    element: protect(<DocumentApprover />, MODULES.DMS.APPROVER, [ROLES.ADMIN, ROLES.DCC, ROLES.QC_ENGINEER]),
  },
  {
    path: "/dcc/create-transmission",
    element: protect(<CreateTransmission />, MODULES.DMS.TRANSMISSION_CREATE, [ROLES.ADMIN, ROLES.DCC]),
  },
  {
    path: "/dcc/send-document-to-client",
    element: protect(<SendDocumentToClient />, MODULES.DMS.TRANSMISSION_CREATE, [ROLES.ADMIN, ROLES.DCC]),
  },
  {
    path: "/dcc/client-approval-status",
    element: protect(<ClientApprovalStatus />, MODULES.DMS.TRANSMISSION_STATUS, [ROLES.ADMIN, ROLES.DCC]),
  },
  {
    path: "/dtn/drawing-transmittal",
    element: protect(<DrawingTransmittal />, MODULES.DTN.VIEW, [ROLES.ADMIN, ROLES.DCC]),
  },
  {
    path: "/dtn/drawing-master",
    element: protect(<DrawingMaster />, MODULES.DTN.MASTER, [ROLES.ADMIN, ROLES.DCC]),
  },
]

// ─── Admin Routes ──────────────────────────────────────────────
const adminRoutes = [
  {
    path: "/admin/dashboard",
    element: protect(<AdminDashboard />, MODULES.DASHBOARD_ADMIN, [ROLES.ADMIN]),
  },
  {
    path: "/approval-center",
    element: protect(<ApprovalCenter />, MODULES.DASHBOARD_ADMIN, [ROLES.ADMIN]),
  },
  {
    path: "/admin/job-overview",
    element: protect(<JobOverview />, MODULES.JOB_OVERVIEW, [ROLES.ADMIN]),
  },
  {
    path: "/admin/reports",
    element: protect(<Reports />, MODULES.REPORTS_MANAGEMENT, [ROLES.ADMIN]),
  },
  {
    path: "/users",
    element: protect(<CreateUser />, MODULES.ADMINISTRATION.USERS, [ROLES.ADMIN]),
  },
  {
    path: "/departments",
    element: protect(<DepartmentManagement />, MODULES.ADMINISTRATION.DEPARTMENTS, [ROLES.ADMIN]),
  },
  {
    path: "/group-management",
    element: protect(<GroupManagement />, MODULES.ADMINISTRATION.QC_GROUPS, [ROLES.ADMIN]), // Reuse same permission module for now
  },
  {
    path: "/material-heat-chart",
    element: protect(<MaterialHeatChart />, MODULES.MHC, [ROLES.ADMIN, ROLES.PRODUCTION_ENGINEER, ROLES.QC_ENGINEER]),
  },
  {
    path: "/hydrostatic-pressure-test",
    element: protect(<HydroPresText />, MODULES.HYDRO_TEST, [ROLES.ADMIN]),
  },
  {
    path: "/inspections/dish-end",
    element: protect(
      <InspectionReport />,
      MODULES.INSPECTION.DISH_END,
      [ROLES.ADMIN, ROLES.PRODUCTION_ENGINEER, ROLES.QC_ENGINEER]
    ),
  },
  {
    path: "/inspections/final",
    element: protect(
      <FinalInspectionReports />,
      MODULES.INSPECTION.FINAL,
      [ROLES.ADMIN, ROLES.PRODUCTION_ENGINEER, ROLES.QC_ENGINEER]
    ),
  },
  {
    path: "/create-qarp",
    element: protect(<CreateQARP />, MODULES.QAP, [ROLES.ADMIN, ROLES.QAP]),
  },
  {
    path: "/qap/heading-master",
    element: protect(<HeadingMaster />, MODULES.QAP, [ROLES.ADMIN, ROLES.QAP]),
  },
  {
    path: "/admin/audit-logs",
    element: protect(<AuditLogs />, MODULES.ADMINISTRATION.AUDIT_LOGS, [ROLES.ADMIN]),
  },
]

// ─── Welding Routes ────────────────────────────────────────────
const weldRoutes = [
  {
    path: "/welding-joints",
    element: protect(<WeldingJoints />, MODULES.WELD_PLAN, [ROLES.ADMIN, ROLES.WELD_PLAN_ADMIN]),
  },
  {
    path: "/view-weldingjoints",
    element: protect(
      <ViewWeldingJoints />,
      MODULES.WELD_JOINTS,
      [ROLES.ADMIN, ROLES.PRODUCTION_ENGINEER, ROLES.QC_ENGINEER, ROLES.NDT_ENGINEER]
    ),
  },
]

// ─── DCR Routes ────────────────────────────────────────────
const dcrRoutes = [
  {
    path: "/dcr/dcr-request",
    element: protect(<CreateDCR />, MODULES.DCR, [ROLES.ADMIN, ROLES.DCR, ROLES.QC_ENGINEER, ROLES.DESIGN_ENGINEER]),
  },
  {
    path: "/dcr/design-engineer-approval",
    element: protect(<CreateDCR />, MODULES.DCR, [ROLES.ADMIN, ROLES.DCR, ROLES.QC_ENGINEER, ROLES.DESIGN_ENGINEER]),
  },
  {
    path: "/dcr/quality-engineer-approval",
    element: protect(<CreateDCR />, MODULES.DCR, [ROLES.ADMIN, ROLES.DCR, ROLES.QC_ENGINEER, ROLES.DESIGN_ENGINEER]),
  },
]

// ─── Marketing Routes ──────────────────────────────────────────
const marketingRoutes = [
  {
    path: "/marketing/dashboard",
    element: protect(<RfqDashboard />, MODULES.DASHBOARD_MARKETING, [ROLES.ADMIN, ROLES.MARKETING]),
  },
  {
    path: "/marketing/rfq-register",
    element: protect(<RfqRegister />, MODULES.MARKETING_RFQ, [ROLES.ADMIN, ROLES.MARKETING]),
  },
  {
    path: "/marketing/lookups/:type",
    element: protect(<RfqLookupManager />, MODULES.MARKETING.MASTER, [ROLES.ADMIN, ROLES.MARKETING]),
  },
]

// ─── NCR Routes ────────────────────────────────────────────
const ncrRoutes = [
  {
    path: "/ncr/create-ncr",
    element: protect(<CreateNCR />, MODULES.NCR, [ROLES.ADMIN, ROLES.PRODUCTION_ENGINEER, ROLES.QC_ENGINEER, ROLES.DESIGN_ENGINEER, ROLES.WELD_PLAN_ADMIN]),
  },
]

// ─── All Routes ────────────────────────────────────────────────
const protectedRoutes = [
  ...userRoutes,
  ...dccRoutes,
  ...adminRoutes,
  ...weldRoutes,
  ...dcrRoutes,
  ...marketingRoutes,
  ...ncrRoutes,
]

const appRoutes = [
  {
    path: "/",
    element: <App />,
  },
  {
    path: "/login",
    element: <App />,
  },
  ...siteAdminRoutes,
  {
    element: <AppLayout />,
    children: protectedRoutes,
  }
]

export default appRoutes


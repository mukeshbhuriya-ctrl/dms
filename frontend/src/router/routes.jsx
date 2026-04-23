import App from "@/App"
import ProtectedRoute from "@/components/ProtectedRoute"
import AppLayout from "@/components/layout/AppLayout"
import { ROLES } from "@/config/roles"

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
  QcGroupManagement,
  FinalInspectionReports,
  Reports,
} from "@/pages/admin"
import { WeldingJoints } from "@/pages/wpj/admin"
import { ViewWeldingJoints } from "@/pages/wpj/user"
import { MaterialHeatChart } from "@/pages/admin/material_heat_chart"
import { InspectionReport, HydroPresText } from "@/pages/admin/hydro"
import { CreateQARP } from "@/pages/admin/qap"
import { CreateDCR } from "@/pages/dcr"
import { RfqRegister, RfqLookupManager, RfqDashboard } from "@/pages/marketing"
import { CreateNCR } from "@/pages/ncr"
import { DrawingMaster, DrawingTransmittal } from "@/pages/dtn"

// ─── Helper: wrap element with ProtectedRoute + role guard ─────
const protect = (element, allowedRoles = null) => (
  <ProtectedRoute allowedRoles={allowedRoles}>
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
      [ROLES.DCC, ROLES.USER, ROLES.PRODUCTION_ENGINEER, ROLES.QC_ENGINEER, ROLES.NDT_ENGINEER, ROLES.WELD_PLAN_ADMIN, ROLES.DESIGN_ENGINEER, ROLES.TAXATION],
    ),
  },
  {
    path: "/user/upload-documents",
    element: protect(
      <UploadDocument />,
      [ROLES.USER, ROLES.PRODUCTION_ENGINEER, ROLES.QC_ENGINEER]
    ),
  },
]

// ─── DCC Routes ────────────────────────────────────────────────
const dccRoutes = [
  {
    path: "/dcc/create-customer",
    element: protect(<CreateCustomer />, [ROLES.ADMIN, ROLES.DCC, ROLES.TAXATION]),
  },
  {
    path: "/dcc/create-location",
    element: protect(<CreateLocation />, [ROLES.ADMIN, ROLES.DCC, ROLES.TAXATION]),
  },
  {
    path: "/dcc/create-po",
    element: protect(<CreatePO />, [ROLES.ADMIN, ROLES.DCC, ROLES.TAXATION]),
  },
  {
    path: "/dcc/create-job",
    element: protect(<CreateJob />, [ROLES.ADMIN, ROLES.DCC, ROLES.TAXATION]),
  },
  {
    path: "/dcc/communication-matrix",
    element: protect(<CommunicationMatrix />, [ROLES.ADMIN, ROLES.DCC]),
  },
  {
    path: "/dcc/documents",
    element: protect(<AssignDocument />, [ROLES.ADMIN, ROLES.DCC]),
  },
  {
    path: "/dcc/document-approver",
    element: protect(<DocumentApprover />, [ROLES.ADMIN, ROLES.DCC, ROLES.QC_ENGINEER]),
  },
  {
    path: "/dcc/create-transmission",
    element: protect(<CreateTransmission />, [ROLES.ADMIN, ROLES.DCC]),
  },
  {
    path: "/dcc/send-document-to-client",
    element: protect(<SendDocumentToClient />, [ROLES.ADMIN, ROLES.DCC]),
  },
  {
    path: "/dcc/client-approval-status",
    element: protect(<ClientApprovalStatus />, [ROLES.ADMIN, ROLES.DCC]),
  },
  {
    path: "/dtn/drawing-transmittal",
    element: protect(<DrawingTransmittal />, [ROLES.ADMIN, ROLES.DCC]),
  },
  {
    path: "/dtn/drawing-master",
    element: protect(<DrawingMaster />, [ROLES.ADMIN, ROLES.DCC]),
  },
]

// ─── Admin Routes ──────────────────────────────────────────────
const adminRoutes = [
  {
    path: "/admin/dashboard",
    element: protect(<AdminDashboard />, [ROLES.ADMIN]),
  },
  {
    path: "/admin/reports",
    element: protect(<Reports />, [ROLES.ADMIN]),
  },
  {
    path: "/users",
    element: protect(<CreateUser />, [ROLES.ADMIN]),
  },
  {
    path: "/departments",
    element: protect(<DepartmentManagement />, [ROLES.ADMIN]),
  },
  {
    path: "/qc-group",
    element: protect(<QcGroupManagement />, [ROLES.ADMIN]),
  },
  {
    path: "/material-heat-chart",
    element: protect(<MaterialHeatChart />, [ROLES.ADMIN, ROLES.PRODUCTION_ENGINEER, ROLES.QC_ENGINEER]),
  },
  {
    path: "/hydrostatic-pressure-test",
    element: protect(<HydroPresText />, [ROLES.ADMIN]),
  },
  {
    path: "/inspections/dish-end",
    element: protect(
      <InspectionReport />,
      [ROLES.ADMIN, ROLES.PRODUCTION_ENGINEER, ROLES.QC_ENGINEER]
    ),
  },
  {
    path: "/inspections/final",
    element: protect(
      <FinalInspectionReports />,
      [ROLES.ADMIN, ROLES.PRODUCTION_ENGINEER, ROLES.QC_ENGINEER]
    ),
  },
  {
    path: "/create-qarp",
    element: protect(<CreateQARP />, [ROLES.ADMIN]),
  },
]

// ─── Welding Routes ────────────────────────────────────────────
const weldRoutes = [
  {
    path: "/welding-joints",
    element: protect(<WeldingJoints />, [ROLES.ADMIN, ROLES.WELD_PLAN_ADMIN]),
  },
  {
    path: "/view-weldingjoints",
    element: protect(
      <ViewWeldingJoints />,
      [ROLES.ADMIN, ROLES.PRODUCTION_ENGINEER, ROLES.QC_ENGINEER, ROLES.NDT_ENGINEER]
    ),
  },
]

// ─── DCR Routes ────────────────────────────────────────────
const dcrRoutes = [
  {
    path: "/dcr/dcr-request",
    element: protect(<CreateDCR />, [ROLES.ADMIN, ROLES.DCR, ROLES.QC_ENGINEER, ROLES.DESIGN_ENGINEER]),
  },
  {
    path: "/dcr/design-engineer-approval",
    element: protect(<CreateDCR />, [ROLES.ADMIN, ROLES.DCR, ROLES.QC_ENGINEER, ROLES.DESIGN_ENGINEER]),
  },
  {
    path: "/dcr/quality-engineer-approval",
    element: protect(<CreateDCR />, [ROLES.ADMIN, ROLES.DCR, ROLES.QC_ENGINEER, ROLES.DESIGN_ENGINEER]),
  },
]

// ─── Marketing Routes ──────────────────────────────────────────
const marketingRoutes = [
  {
    path: "/marketing/dashboard",
    element: protect(<RfqDashboard />, [ROLES.ADMIN, ROLES.MARKETING]),
  },
  {
    path: "/marketing/rfq-register",
    element: protect(<RfqRegister />, [ROLES.ADMIN, ROLES.MARKETING]),
  },
  {
    path: "/marketing/lookups/:type",
    element: protect(<RfqLookupManager />, [ROLES.ADMIN, ROLES.MARKETING]),
  },
]

// ─── NCR Routes ────────────────────────────────────────────
const ncrRoutes = [
  {
    path: "/ncr/create-ncr",
    element: protect(<CreateNCR />, [ROLES.ADMIN, ROLES.PRODUCTION_ENGINEER, ROLES.QC_ENGINEER, ROLES.DESIGN_ENGINEER, ROLES.WELD_PLAN_ADMIN]),
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

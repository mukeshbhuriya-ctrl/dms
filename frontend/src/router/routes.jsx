import App from "@/App"
import ProtectedRoute from "@/components/ProtectedRoute"
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
  DocumentMaster,
  SendDocumentToClient,
  CreateCustomer,
  CreateLocation,
  ClientApprovalStatus,
} from "@/pages/dms"

import {
  AdminDashboard,
  CreateUser,
  DepartmentManagement,
  FinalInspectionReports,
} from "@/pages/admin"
import { WeldingJoints } from "@/pages/wpj/admin"
import { ViewWeldingJoints } from "@/pages/wpj/user"
import { MaterialHeatChart } from "@/pages/admin/material_heat_chart"
import { InspectionReport, HydroPresText } from "@/pages/admin/hydro"
import { CreateQARP } from "@/pages/admin/qap"
import { CreateDCR, DesignEngineerDCRApproval, QualityEngineerDCRApproval } from "@/pages/dcr"

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
      [ROLES.DCC, ROLES.USER, ROLES.PRODUCTION_ENGINEER, ROLES.QC_ENGINEER, ROLES.NDT_ENGINEER, ROLES.WELD_PLAN_ADMIN, ROLES.PRODUCTION, ROLES.MANAGER]
    ),
  },
  {
    path: "/user/upload-documents",
    element: protect(
      <UploadDocument />,
      [ROLES.ADMIN, ROLES.USER, ROLES.PRODUCTION_ENGINEER, ROLES.QC_ENGINEER]
    ),
  },
]

// ─── DCC Routes ────────────────────────────────────────────────
const dccRoutes = [
  {
    path: "/dcc/create-customer",
    element: protect(<CreateCustomer />, [ROLES.ADMIN, ROLES.DCC]),
  },
  {
    path: "/dcc/create-location",
    element: protect(<CreateLocation />, [ROLES.ADMIN, ROLES.DCC]),
  },
  {
    path: "/dcc/create-po",
    element: protect(<CreatePO />, [ROLES.ADMIN, ROLES.DCC]),
  },
  {
    path: "/dcc/create-job",
    element: protect(<CreateJob />, [ROLES.ADMIN, ROLES.DCC]),
  },
  {
    path: "/dcc/document-master",
    element: protect(<DocumentMaster />, [ROLES.ADMIN, ROLES.DCC]),
  },
  {
    path: "/dcc/assign-document",
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
]

// ─── Admin Routes ──────────────────────────────────────────────
const adminRoutes = [
  {
    path: "/admin/dashboard",
    element: protect(<AdminDashboard />, [ROLES.ADMIN, ROLES.PRODUCTION]),
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
    path: "/material-heat-chart",
    element: protect(<MaterialHeatChart />, [ROLES.ADMIN]),
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
    element: protect(<DesignEngineerDCRApproval />, [ROLES.ADMIN, ROLES.DCR, ROLES.QC_ENGINEER, ROLES.DESIGN_ENGINEER]),
  },
  {
    path: "/dcr/quality-engineer-approval",
    element: protect(<QualityEngineerDCRApproval />, [ROLES.ADMIN, ROLES.DCR, ROLES.QC_ENGINEER, ROLES.DESIGN_ENGINEER]),
  },
]

// ─── All Routes ────────────────────────────────────────────────
const appRoutes = [
  {
    path: "/",
    element: <App />,
  },
  ...siteAdminRoutes,
  ...userRoutes,
  ...dccRoutes,
  ...adminRoutes,
  ...weldRoutes,
  ...dcrRoutes,
]

export default appRoutes

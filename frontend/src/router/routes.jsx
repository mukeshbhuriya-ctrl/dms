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
import JobOverview from "@/pages/admin/job_360"
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

const buildModuleRoutes = ({ modulePath, element, allowedRoles, legacyPaths = [] }) => {
  const protectedElement = protect(element, allowedRoles)
  const routes = [
    { path: `${modulePath}/list`, element: protectedElement },
    { path: `${modulePath}/create`, element: protectedElement },
    { path: `${modulePath}/edit/:id`, element: protectedElement },
    { path: `${modulePath}/view/:id`, element: protectedElement },
  ]

  legacyPaths.forEach((legacyPath) => {
    routes.push({ path: legacyPath, element: protectedElement })
  })

  return routes
}

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
  ...buildModuleRoutes({
    modulePath: "/customers",
    element: <CreateCustomer />,
    allowedRoles: [ROLES.ADMIN, ROLES.DCC, ROLES.TAXATION],
    legacyPaths: ["/dcc/create-customer"],
  }),
  ...buildModuleRoutes({
    modulePath: "/locations",
    element: <CreateLocation />,
    allowedRoles: [ROLES.ADMIN, ROLES.DCC, ROLES.TAXATION],
    legacyPaths: ["/dcc/create-location"],
  }),
  ...buildModuleRoutes({
    modulePath: "/purchase-orders",
    element: <CreatePO />,
    allowedRoles: [ROLES.ADMIN, ROLES.DCC, ROLES.TAXATION],
    legacyPaths: ["/dcc/create-po"],
  }),
  ...buildModuleRoutes({
    modulePath: "/jobs",
    element: <CreateJob />,
    allowedRoles: [ROLES.ADMIN, ROLES.DCC, ROLES.TAXATION],
    legacyPaths: ["/dcc/create-job"],
  }),
  ...buildModuleRoutes({
    modulePath: "/communication-matrix",
    element: <CommunicationMatrix />,
    allowedRoles: [ROLES.ADMIN, ROLES.DCC],
    legacyPaths: ["/dcc/communication-matrix"],
  }),
  ...buildModuleRoutes({
    modulePath: "/documents",
    element: <AssignDocument />,
    allowedRoles: [ROLES.ADMIN, ROLES.DCC],
    legacyPaths: ["/dcc/documents"],
  }),
  ...buildModuleRoutes({
    modulePath: "/document-approver",
    element: <DocumentApprover />,
    allowedRoles: [ROLES.ADMIN, ROLES.DCC, ROLES.QC_ENGINEER],
    legacyPaths: ["/dcc/document-approver"],
  }),
  ...buildModuleRoutes({
    modulePath: "/transmissions",
    element: <CreateTransmission />,
    allowedRoles: [ROLES.ADMIN, ROLES.DCC],
    legacyPaths: ["/dcc/create-transmission", "/transmissions/:id"],
  }),
  ...buildModuleRoutes({
    modulePath: "/client-submissions",
    element: <SendDocumentToClient />,
    allowedRoles: [ROLES.ADMIN, ROLES.DCC],
    legacyPaths: ["/dcc/send-document-to-client"],
  }),
  ...buildModuleRoutes({
    modulePath: "/client-approval-status",
    element: <ClientApprovalStatus />,
    allowedRoles: [ROLES.ADMIN, ROLES.DCC],
    legacyPaths: ["/dcc/client-approval-status", "/client-approval-status/:id"],
  }),
  ...buildModuleRoutes({
    modulePath: "/drawing-transmittal",
    element: <DrawingTransmittal />,
    allowedRoles: [ROLES.ADMIN, ROLES.DCC],
    legacyPaths: ["/dtn/drawing-transmittal"],
  }),
  ...buildModuleRoutes({
    modulePath: "/drawing-master",
    element: <DrawingMaster />,
    allowedRoles: [ROLES.ADMIN, ROLES.DCC],
    legacyPaths: ["/dtn/drawing-master"],
  }),
]

// ─── Admin Routes ──────────────────────────────────────────────
const adminRoutes = [
  {
    path: "/admin/dashboard",
    element: protect(<AdminDashboard />, [ROLES.ADMIN]),
  },
  {
    path: "/admin/job-overview",
    element: protect(<JobOverview />, [ROLES.ADMIN]),
  },
  {
    path: "/admin/reports",
    element: protect(<Reports />, [ROLES.ADMIN]),
  },
  ...buildModuleRoutes({
    modulePath: "/user",
    element: <CreateUser />,
    allowedRoles: [ROLES.ADMIN],
    legacyPaths: ["/users"],
  }),
  ...buildModuleRoutes({
    modulePath: "/department",
    element: <DepartmentManagement />,
    allowedRoles: [ROLES.ADMIN],
    legacyPaths: ["/departments"],
  }),
  ...buildModuleRoutes({
    modulePath: "/qc-group",
    element: <QcGroupManagement />,
    allowedRoles: [ROLES.ADMIN],
    legacyPaths: ["/qc-group"],
  }),
  ...buildModuleRoutes({
    modulePath: "/material-heat-chart",
    element: <MaterialHeatChart />,
    allowedRoles: [ROLES.ADMIN, ROLES.PRODUCTION_ENGINEER, ROLES.QC_ENGINEER],
    legacyPaths: ["/material-heat-chart"],
  }),
  ...buildModuleRoutes({
    modulePath: "/hydro-test",
    element: <HydroPresText />,
    allowedRoles: [ROLES.ADMIN],
    legacyPaths: ["/hydrostatic-pressure-test"],
  }),
  ...buildModuleRoutes({
    modulePath: "/inspection-report",
    element: <InspectionReport />,
    allowedRoles: [ROLES.ADMIN, ROLES.PRODUCTION_ENGINEER, ROLES.QC_ENGINEER],
    legacyPaths: ["/inspections/dish-end"],
  }),
  ...buildModuleRoutes({
    modulePath: "/final-inspection",
    element: <FinalInspectionReports />,
    allowedRoles: [ROLES.ADMIN, ROLES.PRODUCTION_ENGINEER, ROLES.QC_ENGINEER],
    legacyPaths: ["/inspections/final"],
  }),
  ...buildModuleRoutes({
    modulePath: "/qap",
    element: <CreateQARP />,
    allowedRoles: [ROLES.ADMIN, ROLES.PRODUCTION_ENGINEER, ROLES.QC_ENGINEER],
    legacyPaths: ["/create-qarp"],
  }),
]

// ─── Welding Routes ────────────────────────────────────────────
const weldRoutes = [
  ...buildModuleRoutes({
    modulePath: "/welding-joints",
    element: <WeldingJoints />,
    allowedRoles: [ROLES.ADMIN, ROLES.WELD_PLAN_ADMIN],
    legacyPaths: ["/welding-joints"],
  }),
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
  ...buildModuleRoutes({
    modulePath: "/dcr",
    element: <CreateDCR />,
    allowedRoles: [ROLES.ADMIN, ROLES.DCR, ROLES.QC_ENGINEER, ROLES.DESIGN_ENGINEER],
    legacyPaths: ["/dcr/dcr-request", "/dcr/design-engineer-approval", "/dcr/quality-engineer-approval"],
  }),
]

// ─── Marketing Routes ──────────────────────────────────────────
const marketingRoutes = [
  {
    path: "/marketing/dashboard",
    element: protect(<RfqDashboard />, [ROLES.ADMIN, ROLES.MARKETING]),
  },
  ...buildModuleRoutes({
    modulePath: "/rfq",
    element: <RfqRegister />,
    allowedRoles: [ROLES.ADMIN, ROLES.MARKETING],
    legacyPaths: ["/marketing/rfq-register"],
  }),
  {
    path: "/rfq/attachments/:id",
    element: protect(<RfqRegister />, [ROLES.ADMIN, ROLES.MARKETING]),
  },
  {
    path: "/marketing/lookups/:type",
    element: protect(<RfqLookupManager />, [ROLES.ADMIN, ROLES.MARKETING]),
  },
]

// ─── NCR Routes ────────────────────────────────────────────
const ncrRoutes = [
  ...buildModuleRoutes({
    modulePath: "/ncr",
    element: <CreateNCR />,
    allowedRoles: [ROLES.ADMIN, ROLES.PRODUCTION_ENGINEER, ROLES.QC_ENGINEER, ROLES.DESIGN_ENGINEER, ROLES.WELD_PLAN_ADMIN],
    legacyPaths: ["/ncr/create-ncr"],
  }),
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

import App from "@/App"
import ProtectedRoute from "@/components/ProtectedRoute"
import SiteAdminRoute from "@/components/SiteAdminRoute"
import AppLayout from "@/components/layout/AppLayout"

import {
  SiteAdminLogin,
  SiteAdminDashboard,
  SiteAdminCreateCompany,
} from "@/pages/siteadmin"
import { UserDashboard, UploadDocument } from "@/pages/user"
import QualityProductionDashboard from "@/pages/dashboard/quality_production_dashboard.jsx"

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
  RoleManagement,
  DepartmentManagement,
  GroupManagement,
  FinalInspectionReports,
  Reports,
  AuditLogs,
  ApprovalCenter
} from "@/pages/admin"
import { TubeSheetInspection } from "@/pages/admin/tube_sheet"
import { TubeBundleInspection } from "@/pages/admin/tube_bundle"
import JobOverview from "@/pages/admin/job_360"
import { WeldingJoints } from "@/pages/wpj/admin"
import { ViewWeldingJoints } from "@/pages/wpj/user"
import TravelerWeldingNDE from "@/pages/wpj/traveler_welding_nde"
import { MaterialHeatChart } from "@/pages/admin/material_heat_chart"
import { InspectionReport, HydroPresText } from "@/pages/admin/hydro"
import { CreateQARP, HeadingMaster } from "@/pages/admin/qap"
import { CreateDCR } from "@/pages/dcr"
import { RfqRegister, RfqLookupManager, RfqDashboard } from "@/pages/marketing"
import { CreateNCR } from "@/pages/ncr"
import { DrawingMaster, DrawingTransmittal } from "@/pages/dtn"
import { CalibrationInstruments, PressureGauges } from "@/pages/admin/masters"
import { MachineMaster } from "@/pages/maintenance/machine_master"
import { MaintenanceMemo } from "@/pages/maintenance/maintenance_memo"
import { PreventiveMaintenance } from "@/pages/maintenance/preventive_maintenance"
import { CreateWorkPermit } from "@/pages/work_permit"

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
      <SiteAdminRoute
        authKey="siteadmin_auth"
        apiEndpoint="/api/siteadmin/auth/me"
        loginPath="/siteadmin/login"
      >
        <SiteAdminDashboard />
      </SiteAdminRoute>
    ),
  },
  {
    path: "/siteadmin/create-company",
    element: (
      <SiteAdminRoute
        authKey="siteadmin_auth"
        apiEndpoint="/api/siteadmin/auth/me"
        loginPath="/siteadmin/login"
      >
        <SiteAdminCreateCompany />
      </SiteAdminRoute>
    ),
  },
]

// ─── User Routes ───────────────────────────────────────────────
const userRoutes = [
    {
    path: "/user/dashboard",
    element: protect(
      <UserDashboard />,
    ),
  },
  {
    path: "/user/upload-documents",
    element: protect(
      <UploadDocument />
    ),
  },
  {
    path: "/dashboard/quality-production",
    element: protect(<QualityProductionDashboard />),
  },
]

// ─── DCC Routes ────────────────────────────────────────────────
const dccRoutes = [
  {
    path: "/dcc/create-customer",
    element: protect(<CreateCustomer />),
  },
  {
    path: "/dcc/create-location",
    element: protect(<CreateLocation />),
  },
  {
    path: "/dcc/create-po",
    element: protect(<CreatePO />),
  },
  {
    path: "/dcc/create-job",
    element: protect(<CreateJob />),
  },
  {
    path: "/dcc/communication-matrix",
    element: protect(<CommunicationMatrix />),
  },
  {
    path: "/dcc/documents",
    element: protect(<AssignDocument />),
  },
  {
    path: "/dcc/document-approver",
    element: protect(<DocumentApprover />),
  },
  {
    path: "/dcc/create-transmission",
    element: protect(<CreateTransmission />),
  },
  {
    path: "/dcc/send-document-to-client",
    element: protect(<SendDocumentToClient />),
  },
  {
    path: "/dcc/client-approval-status",
    element: protect(<ClientApprovalStatus />),
  },
  {
    path: "/dtn/drawing-transmittal",
    element: protect(<DrawingTransmittal />),
  },
  {
    path: "/dtn/drawing-master",
    element: protect(<DrawingMaster />),
  },
]

// ─── Admin Routes ──────────────────────────────────────────────
const adminRoutes = [
  {
    path: "/admin/dashboard",
    element: protect(<AdminDashboard />),
  },
  {
    path: "/approval-center",
    element: protect(<ApprovalCenter />),
  },
  {
    path: "/admin/job-overview",
    element: protect(<JobOverview />),
  },
  {
    path: "/admin/reports",
    element: protect(<Reports />),
  },
  {
    path: "/users",
    element: protect(<CreateUser />),
  },
  {
    path: "admin/roles",
    element: protect(<RoleManagement />),
  },
  {
    path: "/departments",
    element: protect(<DepartmentManagement />),
  },
  {
    path: "/masters/calibration-instruments",
    element: protect(<CalibrationInstruments />),
  },
  {
    path: "/masters/pressure-gauges",
    element: protect(<PressureGauges />),
  },
  {
    path: "/group-management",
    element: protect(<GroupManagement />), // Reuse same permission module for now
  },
  {
    path: "/material-heat-chart",
    element: protect(<MaterialHeatChart />),
  },
  {
    path: "/hydrostatic-pressure-test",
    element: protect(<HydroPresText />),
  },
  {
    path: "/inspections/tube-sheet",
    element: protect(
      <TubeSheetInspection />
    ),
  },
  {
    path: "/inspections/tube-bundle",
    element: protect(
      <TubeBundleInspection />
    ),
  },
  {
    path: "/inspections/dish-end",
    element: protect(
      <InspectionReport />
    ),
  },
  {
    path: "/inspections/final",
    element: protect(
      <FinalInspectionReports />
    ),
  },
  {
    path: "/create-qarp",
    element: protect(<CreateQARP />),
  },
  {
    path: "/qap/heading-master",
    element: protect(<HeadingMaster />),
  },
  {
    path: "/admin/audit-logs",
    element: protect(<AuditLogs />),
  },
]

// ─── Welding Routes ────────────────────────────────────────────
const weldRoutes = [
  {
    path: "/welding-joints",
    element: protect(<WeldingJoints />),
  },
  {
    path: "/view-weldingjoints",
    element: protect(
      <ViewWeldingJoints />
    ),
  },
  {
    path: "/traveler-welding-nde",
    element: protect(
      <TravelerWeldingNDE />
    ),
  },
]

// ─── DCR Routes ────────────────────────────────────────────
const dcrRoutes = [
  {
    path: "/dcr/dcr-request",
    element: protect(<CreateDCR />),
  },
  {
    path: "/dcr/design-engineer-approval",
    element: protect(<CreateDCR />),
  },
  {
    path: "/dcr/quality-engineer-approval",
    element: protect(<CreateDCR />),
  },
]

// ─── Marketing Routes ──────────────────────────────────────────
const marketingRoutes = [
  {
    path: "/marketing/dashboard",
    element: protect(<RfqDashboard />),
  },
  {
    path: "/marketing/rfq-register",
    element: protect(<RfqRegister />),
  },
  {
    path: "/marketing/lookups/:type",
    element: protect(<RfqLookupManager />),
  },
]

// ─── NCR Routes ────────────────────────────────────────────
const ncrRoutes = [
  {
    path: "/ncr/create-ncr",
    element: protect(<CreateNCR />),
  },
]

// ─── Maintenance Routes ────────────────────────────────────
const maintenanceRoutes = [
  {
    path: "/maintenance/machines",
    element: protect(<MachineMaster />),
  },
  {
    path: "/maintenance/memo",
    element: protect(<MaintenanceMemo />),
  },
  {
    path: "/maintenance/pm-schedule",
    element: protect(<PreventiveMaintenance />),
  },
]

// ─── Work Permit Routes ────────────────────────────────────
const workPermitRoutes = [
  {
    path: "/work-permit",
    element: protect(
      <CreateWorkPermit />
    ),
  }
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
  ...maintenanceRoutes,
  ...workPermitRoutes,
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


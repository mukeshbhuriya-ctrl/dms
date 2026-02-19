import App from "@/App"
import ProtectedRoute from "@/components/ProtectedRoute"

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
  DepartmentManagement
} from "@/pages/admin"
import { WeldingJoints } from "@/pages/wpj/admin"
import { ViewWeldingJoints } from "@/pages/wpj/user"

const userAuthProps = {
  authKey: "user_auth",
  loginPath: "/",
  apiEndpoint: "/api/users/auth/me",
}

const wrapProtected = (element, props) => {
  if (!props) {
    return <ProtectedRoute>{element}</ProtectedRoute>
  }

  return <ProtectedRoute {...props}>{element}</ProtectedRoute>
}

const siteAdminRoutes = [
  {
    path: "/siteadmin/login",
    element: <SiteAdminLogin />,
  },
  {
    path: "/siteadmin/dashboard",
    element: wrapProtected(<SiteAdminDashboard />),
  },
  {
    path: "/siteadmin/create-company",
    element: wrapProtected(<SiteAdminCreateCompany />),
  },
]

const userRoutes = [
  {
    path: "/user/dashboard",
    element: wrapProtected(<UserDashboard />, userAuthProps),
  },
  {
    path: "/user/upload-documents",
    element: <UploadDocument />,
  },
]

const dccRoutes = [
  {
    path: "/dcc/assign-document",
    element: <AssignDocument />,
  },
  {
    path: "/dcc/create-job",
    element: <CreateJob />,
  },
  {
    path: "/dcc/create-po",
    element: <CreatePO />,
  },
  {
    path: "/dcc/create-transmission",
    element: <CreateTransmission />,
  },
  {
    path: "/dcc/document-approver",
    element: <DocumentApprover />,
  },
  {
    path: "/dcc/document-master",
    element: <DocumentMaster />,
  },
  {
    path: "/dcc/send-document-to-client",
    element: <SendDocumentToClient />,
  },
  {
    path: "/dcc/create-customer",
    element: <CreateCustomer />,
  },
  {
    path: "/dcc/create-location",
    element: <CreateLocation />,
  },
  {
    path: "/dcc/client-approval-status",
    element: <ClientApprovalStatus />,
  },
]

const adminRoutes = [
  {
    path: "/admin/dashboard",
    element: <AdminDashboard />,
  },
  {
    path: "/users",
    element: <CreateUser />,
  },
  {
    path: "/departments",
    element: <DepartmentManagement />,
  },
]

const weldAdminRoutes = [
  {
    path: "/welding-joints",
    element: <WeldingJoints />,
  },
]

const weldProductionRoutes = [
  {
    path: "/view-weldingjoints",
    element: <ViewWeldingJoints />,
  },
]

const weldQCRoutes = [
  {
    path: "/view-weldingjoints",
    element: <ViewWeldingJoints />,
  },
]

const protectedDccRoutes = dccRoutes.map((route) => ({
  ...route,
  element: wrapProtected(route.element, userAuthProps),
}))

const appRoutes = [
  {
    path: "/",
    element: <App />,
  },
  ...siteAdminRoutes,
  ...userRoutes,
  ...adminRoutes,
  ...weldAdminRoutes,
  ...weldProductionRoutes,
  ...weldQCRoutes,
  ...protectedDccRoutes,
]

export default appRoutes

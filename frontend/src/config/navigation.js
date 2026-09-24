import {
  LayoutDashboard,
  FileText,
  Users,
  Briefcase,
  Folder,
  ShieldCheck,
  Wrench,
  ClipboardCheck,
  Building2,
  Gauge,
  PenTool,
  FlaskConical,
  Ruler,
  Package,
  BarChart3,
  ScrollText,
  AlertTriangle,
  Settings,
  TrendingUp,
} from "lucide-react"

/**
 * Breadcrumb Route Map
 * Maps every route path to a breadcrumb label and optional parent group.
 * Used by the Breadcrumbs component to auto-generate the trail.
 */
export const BREADCRUMB_MAP = {
  // ── Dashboards ──
  "/admin/dashboard":           { label: "Dashboard", icon: LayoutDashboard },
  "/user/dashboard":            { label: "Dashboard", icon: LayoutDashboard },
  "/dashboard/quality-production": { label: "Dashboard", icon: LayoutDashboard },
  "/marketing/dashboard":       { label: "Marketing Dashboard", icon: TrendingUp },

  // ── Administration ──
  "/users":                     { label: "Users", parent: "Administration", icon: Users },
  "/departments":               { label: "Departments", parent: "Administration", icon: Building2 },
  "/group-management":          { label: "Group Management", parent: "Administration", icon: Settings },
  "/admin/audit-logs":          { label: "Audit Logs", parent: "Administration", icon: ScrollText },
  "/approval-center":           { label: "Approval Center", parent: "Administration", icon: ShieldCheck },

  // ── Job & PO ──
  "/admin/job-overview":        { label: "Job Overview", icon: Gauge },
  "/admin/reports":             { label: "Reports", icon: BarChart3 },
  "/dcc/create-customer":       { label: "Customer", parent: "Customer Management", icon: Users },
  "/dcc/create-location":       { label: "Location", parent: "Customer Management", icon: Building2 },
  "/dcc/create-po":             { label: "Purchase Orders", icon: Briefcase },
  "/dcc/create-job":            { label: "Jobs", icon: FileText },

  // ── DTN ──
  "/dtn/drawing-transmittal":   { label: "Drawing Transmittal", parent: "DTN", icon: Folder },
  "/dtn/drawing-master":        { label: "Drawing Master", parent: "DTN", icon: Folder },

  // ── DMS ──
  "/dcc/communication-matrix":  { label: "Communication Matrix", parent: "DMS", icon: Folder },
  "/dcc/documents":             { label: "Documents (VDR)", parent: "DMS", icon: FileText },
  "/user/upload-documents":     { label: "Upload Documents", parent: "DMS", icon: FileText },
  "/dcc/document-approver":     { label: "Document Approver", parent: "DMS", icon: ClipboardCheck },
  "/dcc/create-transmission":   { label: "Create Transmission", parent: "DMS", icon: Folder },
  "/dcc/send-document-to-client": { label: "Send to Client", parent: "DMS", icon: Folder },
  "/dcc/client-approval-status":  { label: "Client Approval Status", parent: "DMS", icon: ShieldCheck },

  // ── Quality ──
  "/material-heat-chart":       { label: "Material Heat Chart", parent: "Quality", icon: FlaskConical },
  "/hydrostatic-pressure-test": { label: "Hydrostatic Pressure Test", parent: "Quality", icon: Gauge },
  "/create-qarp":               { label: "Quality Assurance Plan", parent: "Quality", icon: ClipboardCheck },
  "/qap/heading-master":        { label: "QAP Heading Master", parent: "Quality", icon: ClipboardCheck },

  // ── Inspection ──
  "/inspections/dish-end":      { label: "Dish End Inspection", parent: "Inspection", icon: Ruler },
  "/inspections/final":         { label: "Final Dimension", parent: "Inspection", icon: Ruler },
  "/inspections/tube-sheet":    { label: "Tube Sheet", parent: "Inspection", icon: Ruler },
  "/inspections/tube-bundle":   { label: "Tube Bundle", parent: "Inspection", icon: Ruler },

  // ── Welding ──
  "/welding-joints":            { label: "Weld Plan", parent: "Welding", icon: Wrench },
  "/view-weldingjoints":        { label: "Welding Joints", parent: "Welding", icon: Wrench },
  "/traveler-welding-nde":      { label: "Traveler Welding & NDE", parent: "Welding", icon: Wrench },

  // ── DCR / NCR ──
  "/dcr/dcr-request":               { label: "DCR Request", parent: "DCR", icon: PenTool },
  "/dcr/design-engineer-approval":  { label: "Design Approval", parent: "DCR", icon: PenTool },
  "/dcr/quality-engineer-approval": { label: "Quality Approval", parent: "DCR", icon: PenTool },
  "/ncr/create-ncr":                { label: "NCR", icon: AlertTriangle },

  // ── Masters ──
  "/masters/calibration-instruments": { label: "Calibration Instruments", parent: "Masters", icon: Package },
  "/masters/pressure-gauges":         { label: "Pressure Gauges", parent: "Masters", icon: Gauge },

  // ── Marketing ──
  "/marketing/rfq-register":  { label: "RFQ Register", parent: "Marketing", icon: TrendingUp },
}

/**
 * Resolves the breadcrumb trail for a given pathname.
 * Returns an array of { label, path } objects.
 */
export function resolveBreadcrumbs(pathname) {
  const crumbs = []
  const entry = BREADCRUMB_MAP[pathname]

  if (!entry) {
    // Unknown route — just show the last segment
    const segments = pathname.split("/").filter(Boolean)
    const lastSegment = segments[segments.length - 1] || "Page"
    return [{ label: formatSegment(lastSegment), path: pathname }]
  }

  // If there's a parent group, add it (non-clickable)
  if (entry.parent) {
    crumbs.push({ label: entry.parent, path: null })
  }

  // Add the current page
  crumbs.push({ label: entry.label, path: pathname })

  return crumbs
}

function formatSegment(segment) {
  return segment
    .replace(/[-_]/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase())
}

import { useState, useCallback } from "react";
import ProDataTable from "@/components/shared/ProDataTable";
import { ModuleHeader } from "@/components/shared/ModuleHeader";
import ImportReviewDialog from "@/components/shared/ImportReviewDialog";
import apiClient from "@/api/api.client";
import { toast } from "react-toastify";
import * as XLSX from "xlsx";

export default function CalibrationInstruments() {
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [importReview, setImportReview] = useState({ isOpen: false, data: [], summary: {} });

  const fetchData = useCallback(async ({ page, limit, search }) => {
    try {
      // Simulate API pagination on the frontend for now since the backend might just return all active
      const response = await apiClient.get('/api/masters/instruments?type=CALIBRATION_INSTRUMENT');
      let data = Array.isArray(response) ? response : (response.data || []);

      if (search) {
        const s = search.toLowerCase();
        data = data.filter(i =>
          (i.equipment_desc && i.equipment_desc.toLowerCase().includes(s)) ||
          (i.serial_no && i.serial_no.toLowerCase().includes(s))
        );
      }

      const total = data.length;
      const totalPages = Math.ceil(total / limit) || 1;
      const start = (page - 1) * limit;
      const paginatedData = data.slice(start, start + limit);

      return {
        data: paginatedData,
        meta: { total, page, totalPages }
      };
    } catch (error) {
      console.error("Error fetching instruments:", error);
      return { data: [], meta: { total: 0, page: 1, totalPages: 1 } };
    }
  }, []);

  const handleImport = async (file) => {
    try {
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data);
      const worksheet = workbook.Sheets[workbook.SheetNames[0]];
      const rawAoa = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: "" });

      if (rawAoa.length === 0) {
        toast.error("The uploaded file is empty.");
        return;
      }

      // Find the actual header row (skip titles)
      let headerRowIndex = 0;
      for (let i = 0; i < Math.min(10, rawAoa.length); i++) {
        const rowString = rawAoa[i].join(" ").toLowerCase();
        if (rowString.includes("equipment") || rowString.includes("description") || rowString.includes("make")) {
          headerRowIndex = i;
          break;
        }
      }

      const headers = rawAoa[headerRowIndex].map(h => String(h).replace(/[\n\r]/g, ' ').replace(/\s+/g, ' ').trim().toLowerCase());

      const rawData = [];
      for (let i = headerRowIndex + 1; i < rawAoa.length; i++) {
        const rowArray = rawAoa[i];
        // Skip fully empty rows
        if (rowArray.every(cell => cell === "")) continue;

        const rowObj = {};
        headers.forEach((h, idx) => {
          if (h) rowObj[h] = rowArray[idx];
        });
        rawData.push({ rowObj, originalRow: i + 1 });
      }

      const getValue = (rowObj, keyParts) => {
        const parts = Array.isArray(keyParts) ? keyParts : [keyParts];
        for (const part of parts) {
          const key = Object.keys(rowObj).find(k => k.includes(part.toLowerCase()));
          if (key && rowObj[key] !== undefined && rowObj[key] !== "") {
            return String(rowObj[key]).trim();
          }
        }
        return "";
      };

      const parsedData = rawData.map(({ rowObj, originalRow }) => {
        const equipment_desc = getValue(rowObj, ["equipment description", "equipment"]);
        const make = getValue(rowObj, "make");
        const range = getValue(rowObj, "range");
        const serial_no = getValue(rowObj, ["model no", "equipment id", "sr no./"]);
        const frequency = getValue(rowObj, "frequency");
        const required_accuracy = getValue(rowObj, "accuracy");
        const least_count = getValue(rowObj, "least count");
        const certificate_no = getValue(rowObj, "certificate");
        const remarks = getValue(rowObj, "remarks");

        let calibration_date = null;
        let due_date = null;

        const calDateRaw = getValue(rowObj, ["calibration date", "cal date"]);
        const dueDateRaw = getValue(rowObj, ["due date"]);

        if (calDateRaw) {
          calibration_date = parseExcelDate(calDateRaw);
        }
        if (dueDateRaw) {
          due_date = parseExcelDate(dueDateRaw);
        }

        const errors = [];
        if (!equipment_desc) errors.push("Equipment Description is required");
        if (!serial_no) errors.push("ID/SR No. is required");

        return {
          originalRow,
          payload: {
            equipment_desc,
            make,
            range,
            serial_no,
            frequency,
            required_accuracy,
            least_count,
            certificate_no,
            calibration_date,
            due_date,
            remarks
          },
          display: {
            "Equipment": equipment_desc,
            "SR No.": serial_no,
            "Make": make,
            "Range": range,
            "Frequency": frequency,
            "Accuracy": required_accuracy,
            "Least Count": least_count,
            "Cert. No.": certificate_no,
            "Cal. Date": calibration_date ? new Date(calibration_date).toLocaleDateString('en-GB') : calDateRaw,
            "Due Date": due_date ? new Date(due_date).toLocaleDateString('en-GB') : dueDateRaw,
            "Remarks": remarks
          },
          status: errors.length > 0 ? "error" : "valid",
          errors
        };
      });

      const validCount = parsedData.filter(d => d.status === 'valid').length;
      const errorCount = parsedData.filter(d => d.status === 'error').length;

      setImportReview({
        isOpen: true,
        data: parsedData,
        summary: {
          total: parsedData.length,
          valid: validCount,
          error: errorCount,
          duplicate: 0 // Duplicates are handled at the backend
        }
      });
    } catch (err) {
      console.error("Excel import error:", err);
      toast.error("Failed to parse Excel file.");
    }
  };

  const handleDownloadTemplate = () => {
    const headers = [
      "Sr. No.",
      "Equipment Description",
      "Make",
      "RANGE",
      "SR No./ Model No./ Equipment Id. No",
      "Frequency",
      "Required Accuracy",
      "Least Count",
      "Certificate No.",
      "Calibration DATE",
      "Calibration Due DATE",
      "Remarks"
    ];

    const ws = XLSX.utils.aoa_to_sheet([headers]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Instruments");
    XLSX.writeFile(wb, "Calibration_Instruments_Template.xlsx");
    toast.info("Downloading template...");
  };

  const parseExcelDate = (excelDate) => {
    if (!excelDate) return null;
    
    // Check if it's an Excel numeric date (either a number or a string containing only digits)
    const numericDate = Number(excelDate);
    if (!isNaN(numericDate) && numericDate > 10000) { // Valid Excel dates usually > 10000
      const date = new Date(Math.round((numericDate - 25569) * 86400 * 1000));
      return date.toISOString();
    }

    // If it's a string like '20-May-25'
    const parsed = new Date(excelDate);
    if (!isNaN(parsed.getTime())) return parsed.toISOString();
    return null;
  };

  const handleConfirmImport = async () => {
    const validRows = importReview.data.filter(d => d.status === 'valid').map(d => d.payload);

    if (validRows.length === 0) {
      toast.error("No valid records to import.");
      return;
    }

    try {
      const response = await apiClient.post('/api/masters/instruments/bulk', {
        type: "CALIBRATION_INSTRUMENT",
        data: validRows
      });

      toast.success(`Import complete: ${response.created || 0} created, ${response.skipped || 0} skipped (duplicates).`);
      setImportReview({ isOpen: false, data: [], summary: {} });
      setRefreshTrigger(prev => prev + 1);
    } catch (err) {
      console.error("Bulk upload error:", err);
      toast.error(err.response?.data?.error || "Failed to bulk import instruments.");
    }
  };

  const columns = [
    { accessorKey: "equipment_desc", header: "Equipment Description" },
    { accessorKey: "make", header: "Make" },
    { accessorKey: "range", header: "Range" },
    { accessorKey: "serial_no", header: "ID No. / SR No." },
    { accessorKey: "frequency", header: "Frequency" },
    {
      accessorKey: "due_date",
      header: "Due Date",
      cell: (row) => row.due_date ? new Date(row.due_date).toLocaleDateString('en-GB') : "-"
    }
  ];

  return (
    <div className="flex flex-col h-[calc(100vh-64px)] bg-slate-50">
      <ModuleHeader
        title="Calibration Instruments"
        description="Manage calibration instruments and import bulk data."
      />

      <main className="flex-1 overflow-auto p-6 flex flex-col">
        <ProDataTable
          columns={columns}
          fetchData={fetchData}
          onImport={handleImport}
          onDownloadTemplate={handleDownloadTemplate}
          globalSearchPlaceholder="Search by description or SR No..."
          refreshKey={refreshTrigger}
        />
      </main>

      <ImportReviewDialog
        open={importReview.isOpen}
        onOpenChange={(open) => setImportReview(prev => ({ ...prev, isOpen: open }))}
        title="Review Calibration Instruments Import"
        description="Review the extracted instruments before saving. Errors must be fixed in the Excel file."
        data={importReview.data}
        totalCount={importReview.summary.total}
        validCount={importReview.summary.valid}
        errorCount={importReview.summary.error}
        duplicateCount={importReview.summary.duplicate}
        columns={[
          { header: "Equipment", key: "Equipment", minWidth: "150px", render: (row) => row.display["Equipment"] },
          { header: "Make", key: "Make", render: (row) => row.display["Make"] },
          { header: "Range", key: "Range", render: (row) => row.display["Range"] },
          { header: "ID/SR No.", key: "SR No.", minWidth: "120px", render: (row) => row.display["SR No."] },
          { header: "Freq.", key: "Frequency", render: (row) => row.display["Frequency"] },
          { header: "Accuracy", key: "Accuracy", render: (row) => row.display["Accuracy"] },
          { header: "Least Count", key: "Least Count", render: (row) => row.display["Least Count"] },
          { header: "Cert. No.", key: "Cert. No.", render: (row) => row.display["Cert. No."] },
          { header: "Cal. Date", key: "Cal. Date", render: (row) => row.display["Cal. Date"] },
          { header: "Due Date", key: "Due Date", render: (row) => row.display["Due Date"] },
          { header: "Remarks", key: "Remarks", render: (row) => row.display["Remarks"] }
        ]}
        onConfirm={handleConfirmImport}
      />
    </div>
  );
}

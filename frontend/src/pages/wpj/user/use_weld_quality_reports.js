import { useState } from 'react';
import { toast } from 'react-toastify';
import apiClient from '@/api/api.client';
import * as XLSX from 'xlsx';

export const useWeldQualityReports = (selectedPlanId) => {
  const [isDownloadingFTR, setIsDownloadingFTR] = useState(false);
  const [isDownloadingNFTR, setIsDownloadingNFTR] = useState(false);

  const downloadReport = async (type) => {
    try {
      if (type === 'FTR') setIsDownloadingFTR(true);
      else setIsDownloadingNFTR(true);

      const url = `/api/wpj/reports/quality-metrics?type=${type}${selectedPlanId ? `&plan_id=${selectedPlanId}` : ''}`;
      const response = await apiClient.get(url);

      if (response.success && response.data && response.data.length > 0) {
        const worksheet = XLSX.utils.json_to_sheet(response.data);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, `${type} Report`);
        
        // Adjust column widths
        const colWidths = [
          { wch: 15 }, // Job No
          { wch: 15 }, // Plan No
          { wch: 15 }, // Joint No
          { wch: 15 }, // Category
          { wch: 15 }, // Stage Name
          { wch: 10 }, // Status
          { wch: 20 }, // Prod Eng
          { wch: 20 }, // QC Eng
          { wch: 20 }, // Submitted At
          { wch: 20 }, // Approved At
          { wch: 20 }, // Rejected At
          { wch: 30 }, // Remarks
        ];
        worksheet['!cols'] = colWidths;

        XLSX.writeFile(workbook, `Weld_Joint_${type}_Report.xlsx`);
        toast.success(`${type} Report downloaded successfully!`, { theme: "colored" });
      } else {
        toast.info(`No data found for ${type} Report in the current selection.`, { theme: "colored" });
      }
    } catch (error) {
      console.error(`Error downloading ${type} Report:`, error);
      toast.error(`Failed to download ${type} Report.`, { theme: "colored" });
    } finally {
      if (type === 'FTR') setIsDownloadingFTR(false);
      else setIsDownloadingNFTR(false);
    }
  };

  return {
    downloadFTR: () => downloadReport('FTR'),
    downloadNFTR: () => downloadReport('NFTR'),
    isDownloadingFTR,
    isDownloadingNFTR
  };
};

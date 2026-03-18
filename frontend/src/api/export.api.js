import apiClient from "./api.client";

/**
 * Reusable helper to handle binary file downloads.
 */
const downloadFile = async (endpoint, filename, params = {}) => {
    return exportApi.download(`/api/export${endpoint}`, filename, params);
};

/**
 * API service for exporting module data to Excel.
 */
export const exportApi = {
    /**
     * Helper to handle binary file downloads
     */
    download: async (endpoint, filename, params = {}, options = {}) => {
        try {
            const response = await apiClient.get(endpoint, params, { 
                ...options, 
                responseType: 'blob' 
            });
            
            const blob = new Blob([response], { 
                type: options.contentType || 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
            });
            
            const url = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', filename);
            document.body.appendChild(link);
            link.click();
            link.remove();
            window.URL.revokeObjectURL(url);
            
            return { success: true };
        } catch (error) {
            console.error(`exportApi download error (${endpoint}):`, error);
            throw error;
        }
    },

    exportLocations: (params) => downloadFile('/locations', 'locations_export.xlsx', params),
    exportCustomers: (params) => downloadFile('/customers', 'customers_export.xlsx', params),
    exportJobs: (params) => downloadFile('/jobs', 'jobs_export.xlsx', params),
    exportDepartments: (params) => downloadFile('/departments', 'departments_export.xlsx', params),
    exportUsers: (params) => downloadFile('/users', 'users_export.xlsx', params),
    exportMHC: (params) => downloadFile('/mhc', 'mhc_export.xlsx', params),
    exportQAP: (params) => downloadFile('/qap', 'qap_export.xlsx', params),
    exportHydro: (params) => downloadFile('/hydro', 'hydro_test_export.xlsx', params),
    exportDishEnd: (params) => downloadFile('/dish-end', 'dish_end_inspection_export.xlsx', params),
    exportFinalInspection: (params) => downloadFile('/final-inspection', 'final_inspection_export.xlsx', params),
    exportModule: async (moduleName, params, filename) => {
        return await downloadFile(`/module/${moduleName}`, filename, params);
    },

    getReportSummary: async (params = {}) => {
        try {
            const response = await apiClient.get('/api/export/summary', params);
            return response;
        } catch (error) {
            console.error("exportApi.getReportSummary error:", error);
            return { success: false, data: {} };
        }
    }
};

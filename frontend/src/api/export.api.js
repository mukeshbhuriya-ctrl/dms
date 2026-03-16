import apiClient from "./api.client";

/**
 * Reusable helper to handle binary file downloads.
 */
const downloadFile = async (endpoint, filename) => {
    return exportApi.download(`/api/export${endpoint}`, filename);
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

    exportLocations: () => downloadFile('/locations', 'locations_export.xlsx'),
    exportCustomers: () => downloadFile('/customers', 'customers_export.xlsx'),
    exportJobs: () => downloadFile('/jobs', 'jobs_export.xlsx'),
    exportDepartments: () => downloadFile('/departments', 'departments_export.xlsx'),
    exportUsers: () => downloadFile('/users', 'users_export.xlsx'),
    exportMHC: () => downloadFile('/mhc', 'mhc_export.xlsx'),
    exportQAP: () => downloadFile('/qap', 'qap_export.xlsx'),
    exportHydro: () => downloadFile('/hydro', 'hydro_test_export.xlsx'),
    exportDishEnd: () => downloadFile('/dish-end', 'dish_end_inspection_export.xlsx'),
    exportFinalInspection: () => downloadFile('/final-inspection', 'final_inspection_export.xlsx'),
    exportModule: (moduleName, customFilename) => downloadFile(`/module/${moduleName}`, customFilename || `${moduleName}_export.xlsx`),

};

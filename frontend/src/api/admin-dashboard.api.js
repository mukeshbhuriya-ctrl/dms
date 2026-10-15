import apiClient from './api.client';

export const adminDashboardApi = {
    getOverview: async () => {
        return await apiClient.get('/api/admin/dashboard/overview');
    },
    getAlerts: async (params = {}) => {
        return await apiClient.get('/api/admin/dashboard/alerts', params);
    },
    getTrends: async (params = {}) => {
        return await apiClient.get('/api/admin/dashboard/trends', params);
    },
    getDmsUploadAnalytics: async (params = {}) => {
        return await apiClient.get('/api/admin/dashboard/dms/upload-analytics', params);
    },
    getDmsUploadRecords: async (params = {}) => {
        return await apiClient.get('/api/admin/dashboard/dms/upload-records', params);
    },
    exportDmsUploadRecords: async (params = {}) => {
        return await apiClient.get('/api/admin/dashboard/dms/export-upload-records', params, { responseType: 'blob' });
    }
};

export default adminDashboardApi;


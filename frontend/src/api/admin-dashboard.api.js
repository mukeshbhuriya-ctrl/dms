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
    }
};

export default adminDashboardApi;

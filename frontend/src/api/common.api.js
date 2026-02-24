import apiClient from "./api.client";

export const commonApi = {
    getCustomers: (params) => apiClient.get('/api/common/customers', params),
    getLocations: (params) => apiClient.get('/api/common/locations', params),
    getPos: (params) => apiClient.get('/api/common/pos', params),
    getJobs: (params) => apiClient.get('/api/common/jobs', params),
};

export default commonApi;

import apiClient from "./api.client";

export const poApi = {
    getPos: (params) => apiClient.get('/api/dcc/get-pos', params),
    getPoFilters: () => apiClient.get('/api/dcc/get-po-filters'),
    createPo: (data) => apiClient.post('/api/dcc/create-po', data),
    updatePoCommunicationMatrix: (id, data) => apiClient.put(`/api/dcc/update-po-communication-matrix/${id}`, data),
    getCustomers: (params) => apiClient.get('/api/dcc/get-customers', params),
    getPoAttachments: (poId, params) => apiClient.get(`/api/dcc/get-po-attachments/${poId}`, params)
};

export default poApi;

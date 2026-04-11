import apiClient from "./api.client";

export const poApi = {
    getPos: (params) => apiClient.get('/api/dcc/get-pos', params),
    createPo: (data) => apiClient.post('/api/dcc/create-po', data),
    updatePoCommunicationMatrix: (id, data) => apiClient.put(`/api/dcc/update-po-communication-matrix/${id}`, data),
    getCustomers: (params) => apiClient.get('/api/dcc/get-customers', params)
};

export default poApi;

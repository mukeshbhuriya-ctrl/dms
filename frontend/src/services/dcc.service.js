import apiClient from "../api/api.client";

export const dccService = {
    getCustomers: async (params = {}) => {
        return await apiClient.get("/api/dcc/get-customers", params);
    },

    getDocumentsForApproval: async (params = {}) => {
        return await apiClient.get("/api/dcc/documents-approval", params);
    },

    createTransmission: async (data) => {
        return await apiClient.post("/api/dcc/create-transmission", data);
    },

    getTransmissions: async (params = {}) => {
        return await apiClient.get("/api/dcc/get-transmissions", params);
    },

    getTransmissionDocuments: async (params = {}) => {
        return await apiClient.get("/api/dcc/get-transmission-documents", params);
    },

    reviewDocument: async (data) => {
        return await apiClient.post("/api/dcc/review-document", data);
    },

    getJobs: async (params = {}) => {
        return await apiClient.get("/api/dcc/get-jobs", params);
    },

    getMyAssignedDocuments: async (params = {}) => {
        return await apiClient.get("/api/dcc/upload-documents", params);
    },

    uploadDocumentVersion: async (formData) => {
        // apiClient handles FormData automatically by not setting Content-Type
        return await apiClient.post("/api/dcc/upload-document-version", formData);
    },

    sendTransmissionEmail: async (data) => {
        return await apiClient.post("/api/dcc/send-transmission-email", data);
    },

    updateTransmissionClientStatus: async (formData) => {
        // Now accepts FormData for multi-file upload
        return await apiClient.post("/api/dcc/transmission/client-status", formData);
    },

    updateTransmissionDocumentClientStatus: async (formData) => {
        // Accepts FormData for single doc status + file
        return await apiClient.post("/api/dcc/transmission/document/client-status", formData);
    },

    downloadTransmittalPDF: async (id) => {
        return await apiClient.get(`/api/dcc/download-transmittal-pdf/${id}`, {}, { responseType: 'blob' });
    },

    // Audit Trail Methods
    getDocumentTrail: async (documentId) => {
        return await apiClient.get(`/api/dcc/document-trail/${documentId}`);
    },

    getTransmissionTrail: async (transmissionId) => {
        return await apiClient.get(`/api/dcc/transmission-trail/${transmissionId}`);
    },

    downloadTransmissionFeedback: async (id) => {
        return await apiClient.get(`/api/dcc/transmission/${id}/download-feedback`, {}, { responseType: 'blob' });
    }
};

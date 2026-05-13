import apiClient from "../api/api.client";

export const dccService = {
    getCustomers: async (params = {}) => {
        return await apiClient.get("/api/dcc/get-customers", params);
    },

    getDocumentsForApproval: async (params = {}) => {
        return await apiClient.get("/api/dcc/documents-approval", params);
    },
    
    getApprovedDocumentsForTransmission: async (params = {}) => {
        return await apiClient.get("/api/dcc/documents-transmission", params);
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

    getPos: async (params = {}) => {
        return await apiClient.get("/api/dcc/get-pos", params);
    },

    getActiveFilters: async (params = {}) => {
        return await apiClient.get("/api/dcc/get-active-filters", params);
    },

    getTransmissionFilters: async () => {
        return await apiClient.get("/api/dcc/get-transmission-filters");
    },

    getMyAssignedDocuments: async (params = {}) => {
        return await apiClient.get("/api/dcc/upload-documents", params);
    },

    uploadDocumentVersion: async (formData, options = {}) => {
        // Use the specialized XMLHttpRequest method for progress tracking
        return await apiClient.uploadWithProgress("/api/dcc/upload-document-version", formData, options);
    },

    sendTransmissionEmail: async (data) => {
        return await apiClient.post("/api/dcc/send-transmission-email", data);
    },

    updateTransmissionClientStatus: async (formData) => {
        // Now accepts FormData for multi-file upload
        return await apiClient.post("/api/dcc/transmission/client-status", formData);
    },

    updateTransmissionDocumentClientStatus: async (formData, options = {}) => {
        // Accepts FormData for single doc status + file. Use uploadWithProgress for progress tracking.
        return await apiClient.uploadWithProgress("/api/dcc/transmission/document/client-status", formData, options);
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
    },

    // Email Templates
    getEmailTemplates: async () => {
        return await apiClient.get("/api/dcc/email-templates");
    },

    createEmailTemplate: async (data) => {
        return await apiClient.post("/api/dcc/email-templates", data);
    },

    updateEmailTemplate: async (id, data) => {
        return await apiClient.put(`/api/dcc/email-templates/${id}`, data);
    },

    deleteEmailTemplate: async (id) => {
        return await apiClient.delete(`/api/dcc/email-templates/${id}`);
    }
};

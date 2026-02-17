const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || "http://localhost:3000";

const getHeaders = () => {
    const authData = localStorage.getItem('user_auth');
    const token = authData ? JSON.parse(authData)?.payload?.token : null;
    return {
        'Content-Type': 'application/json',
        'Authorization': token ? `Bearer ${token}` : ''
    };
};

const handleResponse = async (response) => {
    const contentType = response.headers.get("content-type");
    if (contentType && contentType.indexOf("application/json") !== -1) {
        const data = await response.json();
        if (!response.ok) {
            const error = (data && data.message) || response.statusText;
            throw new Error(error);
        }
        return data;
    } else {
        const text = await response.text();
        if (!response.ok) {
            throw new Error(text || response.statusText);
        }
        return { success: true, message: text };
    }
};

export const dccService = {
    getCustomers: async (params = {}) => {
        const query = new URLSearchParams(params).toString();
        const response = await fetch(`${BACKEND_URL}/api/dcc/get-customers?${query}`, {
            method: 'GET',
            headers: getHeaders(),
            credentials: "include"
        });
        return handleResponse(response);
    },

    getDocumentsForApproval: async (params = {}) => {
        const query = new URLSearchParams(params).toString();
        const response = await fetch(`${BACKEND_URL}/api/dcc/documents-approval?${query}`, {
            method: 'GET',
            headers: getHeaders(),
            credentials: "include"
        });
        return handleResponse(response);
    },

    createTransmission: async (data) => {
        const response = await fetch(`${BACKEND_URL}/api/dcc/create-transmission`, {
            method: 'POST',
            headers: getHeaders(),
            credentials: "include",
            body: JSON.stringify(data)
        });
        return handleResponse(response);
    },

    getTransmissions: async (params = {}) => {
        const query = new URLSearchParams(params).toString();
        const response = await fetch(`${BACKEND_URL}/api/dcc/get-transmissions?${query}`, {
            method: 'GET',
            headers: getHeaders(),
            credentials: "include"
        });
        return handleResponse(response);
    },

    reviewDocument: async (data) => {
        const response = await fetch(`${BACKEND_URL}/api/dcc/review-document`, {
            method: 'POST', // Changed from PUT to match controller/route if needed, but route says POST
            headers: getHeaders(),
            credentials: "include",
            body: JSON.stringify(data)
        });
        return handleResponse(response);
    },

    getJobs: async (params = {}) => {
        const query = new URLSearchParams(params).toString();
        const response = await fetch(`${BACKEND_URL}/api/dcc/get-jobs?${query}`, {
            method: 'GET',
            headers: getHeaders(),
            credentials: "include"
        });
        return handleResponse(response);
    },

    getMyAssignedDocuments: async (params = {}) => {
        const query = new URLSearchParams(params).toString();
        const response = await fetch(`${BACKEND_URL}/api/dcc/upload-documents?${query}`, {
            method: 'GET',
            headers: getHeaders(),
            credentials: "include"
        });
        return handleResponse(response);
    },

    uploadDocumentVersion: async (formData) => {
        const headers = getHeaders();
        delete headers['Content-Type']; // Let browser set multipart/form-data boundary

        const response = await fetch(`${BACKEND_URL}/api/dcc/upload-document-version`, {
            method: 'POST',
            headers: headers,
            credentials: "include",
            body: formData
        });
        return handleResponse(response);
    }
};

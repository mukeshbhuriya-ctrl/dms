/**
 * Centralized API Client
 */

const backendUrl = import.meta.env.VITE_BACKEND_URL || "http://localhost:3000";

/**
 * Get auth token from localStorage
 */
// Fallback: check localStorage. The browser handles HttpOnly cookies automatically.
const getAuthToken = () => {
    const authData = localStorage.getItem("user_auth");
    if (!authData) return null;

    try {
        const parsed = JSON.parse(authData);
        return parsed?.payload?.token || parsed?.token || null;
    } catch {
        return null;
    }
};

class ApiClient {
    async request(method, endpoint, body = null, options = {}) {
        const token = getAuthToken();

        const headers = new Headers({
            ...options.headers,
        });

        // Automatically set JSON header if not FormData
        if (!(body instanceof FormData)) {
            headers.set("Content-Type", "application/json");
        }

        if (token) {
            headers.set("Authorization", `Bearer ${token}`);
        }

        const config = {
            method,
            headers,
            credentials: "include",
            ...options,
        };

        if (body) {
            config.body =
                body instanceof FormData ? body : JSON.stringify(body);
        }

        const response = await fetch(`${backendUrl}${endpoint}`, config);

        return this.handleResponse(response, options);
    }

    async handleResponse(response, options = {}) {
        if (options.responseType === 'blob') {
            return await response.blob();
        }
        if (options.responseType === 'text') {
            return await response.text();
        }

        const contentType = response.headers.get("content-type");

        let data;
        if (contentType?.includes("application/json")) {
            data = await response.json();
        } else {
            data = await response.text();
        }

        if (!response.ok) {
            // Auto handle unauthorized globally
            if (response.status === 401 && !options.skipAuthRedirect) {
                localStorage.removeItem("user_auth");
                window.location.href = "/";
            }

            const error = new Error(
                data?.message || "API request failed"
            );
            error.status = response.status;
            error.data = data;
            throw error;
        }

        return data;
    }

    get(endpoint, params = {}, options = {}) {
        const url = new URL(`${backendUrl}${endpoint}`);
        if (params && Object.keys(params).length > 0) {
            Object.keys(params).forEach(key => {
                if (params[key] !== undefined && params[key] !== null) {
                    url.searchParams.append(key, params[key]);
                }
            });
        }
        let path = endpoint;
        if (params && Object.keys(params).length > 0) {
            const searchParams = new URLSearchParams();
            Object.keys(params).forEach(key => {
                if (params[key] !== undefined && params[key] !== null) {
                    searchParams.append(key, params[key]);
                }
            });
            path = `${endpoint}?${searchParams.toString()}`;
        }
        return this.request("GET", path, null, options);
    }

    post(endpoint, body = {}, options = {}) {
        return this.request("POST", endpoint, body, options);
    }

    put(endpoint, body = {}, options = {}) {
        return this.request("PUT", endpoint, body, options);
    }

    patch(endpoint, body = {}, options = {}) {
        return this.request("PATCH", endpoint, body, options);
    }

    delete(endpoint, body = null, options = {}) {
        return this.request("DELETE", endpoint, body, options);
    }

    /**
     * Specialized method for file uploads with progress tracking using XMLHttpRequest
     */
    uploadWithProgress(endpoint, formData, options = {}) {
        return new Promise((resolve, reject) => {
            const xhr = new XMLHttpRequest();
            const token = getAuthToken();

            xhr.open('POST', `${backendUrl}${endpoint}`, true);
            
            // Allow credentials (cookies)
            xhr.withCredentials = true;

            if (token) {
                xhr.setRequestHeader('Authorization', `Bearer ${token}`);
            }

            // Do NOT set Content-Type header manually for FormData, 
            // the browser will set it automatically with the boundary

            // Upload progress event
            if (xhr.upload && options.onUploadProgress) {
                xhr.upload.onprogress = (event) => {
                    if (event.lengthComputable) {
                        const percentComplete = Math.round((event.loaded * 100) / event.total);
                        options.onUploadProgress({
                            loaded: event.loaded,
                            total: event.total,
                            progress: percentComplete
                        });
                    }
                };
            }

            xhr.onload = () => {
                if (xhr.status >= 200 && xhr.status < 300) {
                    try {
                        const response = JSON.parse(xhr.responseText);
                        resolve(response);
                    } catch (e) {
                        resolve(xhr.responseText);
                    }
                } else {
                    if (xhr.status === 401 && !options.skipAuthRedirect) {
                        localStorage.removeItem("user_auth");
                        window.location.href = "/";
                        return;
                    }
                    
                    let errorData;
                    try {
                        errorData = JSON.parse(xhr.responseText);
                    } catch (e) {
                        errorData = { message: xhr.responseText || "Upload failed" };
                    }
                    
                    const error = new Error(errorData.message || `Upload failed with status ${xhr.status}`);
                    error.status = xhr.status;
                    error.data = errorData;
                    reject(error);
                }
            };

            xhr.onerror = () => {
                reject(new Error("Network Error occurred during upload"));
            };

            xhr.send(formData);
        });
    }
}

const apiClient = new ApiClient();

export default apiClient;

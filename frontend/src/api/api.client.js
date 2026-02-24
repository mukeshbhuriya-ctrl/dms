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

        return this.handleResponse(response);
    }

    async handleResponse(response) {
        const contentType = response.headers.get("content-type");

        let data;
        if (contentType?.includes("application/json")) {
            data = await response.json();
        } else {
            data = await response.text();
        }

        if (!response.ok) {
            // Auto handle unauthorized globally
            if (response.status === 401) {
                localStorage.removeItem("user_auth");
                window.location.href = "/login";
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

    delete(endpoint, body = null, options = {}) {
        return this.request("DELETE", endpoint, body, options);
    }
}

const apiClient = new ApiClient();

export default apiClient;

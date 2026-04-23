import apiClient from "@/api/api.client";

export const notificationsApi = {
  list: async (params = {}) => apiClient.get("/api/notifications", params),
  unreadCount: async () => apiClient.get("/api/notifications/unread-count"),
  markRead: async (id) => apiClient.patch(`/api/notifications/${id}/read`, {}),
  markAllRead: async () => apiClient.patch("/api/notifications/read-all", {}),
  create: async (payload) => apiClient.post("/api/notifications", payload),
};

export default notificationsApi;

import apiClient from "./api.client";

export const getJob360Snapshot = async (jobId) => {
  const response = await apiClient.get(`/api/admin/job-360/${jobId}`);
  return response.data;
};

export default {
  getJob360Snapshot,
};

import apiClient from "./api.client";

export const getJobOverviewSnapshot = async (jobId) => {
  const response = await apiClient.get(`/api/admin/job-360/${jobId}`);
  return response.data;
};

export default {
  getJobOverviewSnapshot,
};

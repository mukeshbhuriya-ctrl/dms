import apiClient from './api.client';

/**
 * Month-Wise NCR Analytics & Ledger API
 */
export const getNcrOverview = (params = {}) =>
  apiClient.get('/api/admin/ncr-analytics/overview', params);

export const getNcrRecords = (params = {}) =>
  apiClient.get('/api/admin/ncr-analytics/records', params);

export const getNcrById = (ncrId) =>
  apiClient.get(`/api/ncr/${ncrId}`);

export const exportNcrRecords = (params = {}) =>
  apiClient.get('/api/admin/ncr-analytics/export', params, { responseType: 'blob' });

export const downloadNcrPdf = (ncrId) =>
  apiClient.get(`/api/ncr/${ncrId}/download`, {}, { responseType: 'blob' });

export default {
  getNcrOverview,
  getNcrRecords,
  getNcrById,
  exportNcrRecords,
  downloadNcrPdf,
};

import apiClient from './api.client';

/**
 * Month-Wise DCR Analytics & Ledger API
 */
export const getDcrOverview = (params = {}) =>
  apiClient.get('/api/admin/dcr-analytics/overview', params);

export const getDcrRecords = (params = {}) =>
  apiClient.get('/api/admin/dcr-analytics/records', params);

export const exportDcrRecords = (params = {}) =>
  apiClient.get('/api/admin/dcr-analytics/export', params, { responseType: 'blob' });

export const downloadDcrPdf = (dcrId) =>
  apiClient.get(`/api/dcr/download-pdf/${dcrId}`, {}, { responseType: 'blob' });

export default {
  getDcrOverview,
  getDcrRecords,
  exportDcrRecords,
  downloadDcrPdf,
};

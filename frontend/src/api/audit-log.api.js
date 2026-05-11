import apiClient from './api.client';

/**
 * Audit Log API Service
 */

export const getAuditLogs = (params) =>
  apiClient.get('/api/admin/audit-logs', params);

export const getAuditLogFilters = () =>
  apiClient.get('/api/admin/audit-logs/filters');

export const exportAuditLogs = (params) =>
  apiClient.get('/api/admin/audit-logs/export', params, { responseType: 'blob' });

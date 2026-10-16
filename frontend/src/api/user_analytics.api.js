import apiClient from './api.client';

/**
 * User Management & Activity Analytics API
 */
export const getUserOverview = (params = {}) =>
  apiClient.get('/api/admin/user-analytics/overview', params);

export const getUserTrends = (params = {}) =>
  apiClient.get('/api/admin/user-analytics/trends', params);

export const getUserDepartments = (params = {}) =>
  apiClient.get('/api/admin/user-analytics/departments', params);

export const getUserInactivity = (params = {}) =>
  apiClient.get('/api/admin/user-analytics/inactivity', params);

export const getUserLoginRecords = (params = {}) =>
  apiClient.get('/api/admin/user-analytics/logins', params);

export const getUserProductivityRecords = (params = {}) =>
  apiClient.get('/api/admin/user-analytics/productivity', params);

export const exportUserLogins = (params = {}) =>
  apiClient.get('/api/admin/user-analytics/export-logins', params, { responseType: 'blob' });

export const exportUserInactivity = (params = {}) =>
  apiClient.get('/api/admin/user-analytics/export-inactivity', params, { responseType: 'blob' });

export default {
  getUserOverview,
  getUserTrends,
  getUserDepartments,
  getUserInactivity,
  getUserLoginRecords,
  getUserProductivityRecords,
  exportUserLogins,
  exportUserInactivity,
};

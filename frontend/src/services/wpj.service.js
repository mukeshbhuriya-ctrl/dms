import apiClient from '@/api/api.client';

class WpjService {
    /**
     * Fetch employee groups by type
     * @param {string} groupType - 'QUALITY' or 'PRODUCTION'
     * @returns {Promise<any>}
     */
    async getEmployeeGroups(groupType) {
        try {
            return await apiClient.get(`/api/employee-groups?group_type=${groupType}&limit=1000`);
        } catch (error) {
            console.error(`Error fetching ${groupType} groups:`, error);
            throw error;
        }
    }

    /**
     * Fetch groups the current logged-in user is a member of
     * @returns {Promise<any>}
     */
    async getMyGroups() {
        try {
            return await apiClient.get('/api/employee-groups/my-groups');
        } catch (error) {
            console.error('Error fetching user groups:', error);
            throw error;
        }
    }
}

export default new WpjService();

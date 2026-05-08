const { ROLE_PERMISSIONS } = require('../config/permissions');
const MODULES = require('../config/modules');

class PermissionService {
    /**
     * Resolves the unique set of module permissions for a user based on their roles.
     * @param {string[]} roles - Array of user role names
     * @returns {string[]} Unique array of module keys
     */
    /**
     * Resolves the unique set of module permissions for a user based on their roles.
     * Supports hierarchical module-based configuration.
     */
    resolveUserPermissions(roles = []) {
        const permissions = new Set();

        const flatten = (item) => {
            if (typeof item === 'string') {
                permissions.add(item);
            } else if (Array.isArray(item)) {
                item.forEach(flatten);
            } else if (typeof item === 'object' && item !== null) {
                Object.values(item).forEach(flatten);
            }
        };

        // 1. Process Roles
        roles.forEach(role => {
            const roleModules = ROLE_PERMISSIONS[role];
            if (roleModules) {
                flatten(roleModules);
            }
        });

        // 2. Handle Super User (ADMIN)
        if (roles.includes('ADMIN') || permissions.has(MODULES.ALL)) {
            return [MODULES.ALL];
        }

        return Array.from(permissions);
    }
}

module.exports = new PermissionService();

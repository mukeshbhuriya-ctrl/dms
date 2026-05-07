import { useAuth } from "@/context/AuthContext";
import { ROLES } from "@/config/roles";

/**
 * Utility hook to check if the logged-in user is an Admin.
 * 
 * @returns {boolean} True if user has the ADMIN role.
 */
export const useCheckAdmin = () => {
    const { roles } = useAuth();
    return roles.includes(ROLES.ADMIN);
};

export default useCheckAdmin;

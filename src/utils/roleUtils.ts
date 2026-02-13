import { UserRole } from '@/types';

/**
 * Returns the dashboard path for a given user role
 */
export const getDashboardPath = (role: UserRole): string => {
    switch (role) {
        case 'admin':
            return '/dashboard/admin';
        case 'owner':
            return '/dashboard/owner';
        case 'tenant':
            return '/dashboard/tenant';
        case 'security':
            return '/dashboard/security';
        case 'staff':
            return '/dashboard/staff';
        default:
            return '/dashboard/tenant';
    }
};

/**
 * Checks if a user role can access a route with given allowed roles
 */
export const canAccessRoute = (
    userRole: UserRole,
    allowedRoles: UserRole[]
): boolean => {
    return allowedRoles.includes(userRole);
};

/**
 * Returns a user-friendly display name for a role
 */
export const getUserRoleDisplayName = (role: UserRole): string => {
    switch (role) {
        case 'admin':
            return 'Administrator';
        case 'owner':
            return 'Property Owner';
        case 'tenant':
            return 'Tenant';
        case 'security':
            return 'Security Personnel';
        case 'staff':
            return 'Staff Member';
        default:
            return 'User';
    }
};

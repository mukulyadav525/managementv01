import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuthStore } from '@/stores/authStore';
import { UserRole } from '@/types';
import { getDashboardPath, canAccessRoute } from '@/utils/roleUtils';

interface RoleProtectedRouteProps {
    children: React.ReactNode;
    allowedRoles: UserRole[];
}

export const RoleProtectedRoute: React.FC<RoleProtectedRouteProps> = ({
    children,
    allowedRoles,
}) => {
    const { user, loading } = useAuthStore();

    // Show loading state while authentication is being checked
    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-primary-600 mx-auto"></div>
                    <p className="mt-4 text-gray-600">Loading...</p>
                </div>
            </div>
        );
    }

    // If user is not authenticated, redirect to login
    if (!user) {
        return <Navigate to="/login" replace />;
    }

    // If user's role is not in allowed roles, redirect to their appropriate dashboard
    if (!canAccessRoute(user.role, allowedRoles)) {
        const correctDashboard = getDashboardPath(user.role);
        return <Navigate to={correctDashboard} replace />;
    }

    // User is authenticated and has correct role
    return <>{children}</>;
};

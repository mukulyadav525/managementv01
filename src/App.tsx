import React, { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { useAuthStore } from './stores/authStore';
import { getDashboardPath } from './utils/roleUtils';

// Pages
import { LoginPage } from './pages/LoginPage';
import { RegisterPage } from './pages/RegisterPage';
import { AdminDashboardPage } from './pages/dashboards/AdminDashboardPage';
import { OwnerDashboardPage } from './pages/dashboards/OwnerDashboardPage';
import { TenantDashboardPage } from './pages/dashboards/TenantDashboardPage';
import { SecurityDashboardPage } from './pages/dashboards/SecurityDashboardPage';
import { StaffDashboardPage } from './pages/dashboards/StaffDashboardPage';
import { VisitorsPage } from './pages/VisitorsPage';
import { PaymentsPage } from './pages/PaymentsPage';
import { ComplaintsPage } from './pages/ComplaintsPage';
import { OwnerTenantsPage } from './pages/OwnerTenantsPage';
import { FlatsPage } from './pages/FlatsPage';
import { ResidentsPage } from './pages/ResidentsPage';
import { ResidentsListPage } from './pages/ResidentsListPage';
import { AnnouncementsPage } from './pages/AnnouncementsPage';
import { VehiclesPage } from './pages/VehiclesPage';
import { SettingsPage } from './pages/SettingsPage';
import { ProfilePage } from './pages/ProfilePage';
import { SalaryPaymentsPage } from './pages/SalaryPaymentsPage';
import { CCTVPage } from './pages/CCTVPage';
import { AdminSalaryPage } from './pages/admin/AdminSalaryPage';
import { StaffPage } from './pages/admin/StaffPage';
import { OwnerStaffPage } from './pages/OwnerStaffPage';

// Components
import { RoleProtectedRoute } from './components/routing/RoleProtectedRoute';

// Protected Route Component (for basic auth check)
const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, loading } = useAuthStore();

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

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
};

// Smart Dashboard Redirect - redirects to role-specific dashboard
const DashboardRedirect: React.FC = () => {
  const { user, loading } = useAuthStore();

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

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  const dashboardPath = getDashboardPath(user.role);
  return <Navigate to={dashboardPath} replace />;
};

function App() {
  const { initializeAuth } = useAuthStore();

  useEffect(() => {
    initializeAuth();
  }, []);

  return (
    <BrowserRouter>
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 3000,
          style: {
            background: '#363636',
            color: '#fff',
          },
          success: {
            duration: 3000,
            iconTheme: {
              primary: '#10b981',
              secondary: '#fff',
            },
          },
          error: {
            duration: 4000,
            iconTheme: {
              primary: '#ef4444',
              secondary: '#fff',
            },
          },
        }}
      />

      <Routes>
        {/* Public Routes */}
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />

        {/* Role-Specific Dashboard Routes */}
        <Route
          path="/dashboard/admin"
          element={
            <RoleProtectedRoute allowedRoles={['admin']}>
              <AdminDashboardPage />
            </RoleProtectedRoute>
          }
        />
        <Route
          path="/dashboard/owner"
          element={
            <RoleProtectedRoute allowedRoles={['owner']}>
              <OwnerDashboardPage />
            </RoleProtectedRoute>
          }
        />
        <Route
          path="/dashboard/tenant"
          element={
            <RoleProtectedRoute allowedRoles={['tenant']}>
              <TenantDashboardPage />
            </RoleProtectedRoute>
          }
        />
        <Route
          path="/dashboard/security"
          element={
            <RoleProtectedRoute allowedRoles={['security']}>
              <SecurityDashboardPage />
            </RoleProtectedRoute>
          }
        />
        <Route
          path="/dashboard/staff"
          element={
            <RoleProtectedRoute allowedRoles={['staff']}>
              <StaffDashboardPage />
            </RoleProtectedRoute>
          }
        />

        {/* Other Protected Routes */}
        <Route
          path="/flats"
          element={
            <ProtectedRoute>
              <FlatsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/residents"
          element={
            <RoleProtectedRoute allowedRoles={['admin']}>
              <ResidentsPage />
            </RoleProtectedRoute>
          }
        />
        <Route
          path="/visitors"
          element={
            <ProtectedRoute>
              <VisitorsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/payments"
          element={
            <ProtectedRoute>
              <PaymentsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/complaints"
          element={
            <ProtectedRoute>
              <ComplaintsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/announcements"
          element={
            <ProtectedRoute>
              <AnnouncementsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/vehicles"
          element={
            <ProtectedRoute>
              <VehiclesPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/settings"
          element={
            <RoleProtectedRoute allowedRoles={['admin']}>
              <SettingsPage />
            </RoleProtectedRoute>
          }
        />
        <Route
          path="/profile"
          element={
            <ProtectedRoute>
              <ProfilePage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/owner/tenants"
          element={
            <RoleProtectedRoute allowedRoles={['owner']}>
              <OwnerTenantsPage />
            </RoleProtectedRoute>
          }
        />
        <Route
          path="/owner/staff"
          element={
            <RoleProtectedRoute allowedRoles={['owner', 'tenant']}>
              <OwnerStaffPage />
            </RoleProtectedRoute>
          }
        />
        <Route
          path="/salary/requests"
          element={
            <RoleProtectedRoute allowedRoles={['security', 'staff']}>
              <SalaryPaymentsPage />
            </RoleProtectedRoute>
          }
        />
        <Route
          path="/security/cctv"
          element={
            <RoleProtectedRoute allowedRoles={['security', 'admin']}>
              <CCTVPage />
            </RoleProtectedRoute>
          }
        />
        <Route
          path="/security/residents"
          element={
            <RoleProtectedRoute allowedRoles={['security']}>
              <ResidentsListPage />
            </RoleProtectedRoute>
          }
        />

        <Route
          path="/admin/salary"
          element={
            <RoleProtectedRoute allowedRoles={['admin']}>
              <AdminSalaryPage />
            </RoleProtectedRoute>
          }
        />
        <Route
          path="/admin/staff"
          element={
            <RoleProtectedRoute allowedRoles={['admin']}>
              <StaffPage />
            </RoleProtectedRoute>
          }
        />
        {/* Redirects */}
        <Route path="/dashboard" element={<DashboardRedirect />} />
        <Route path="/" element={<DashboardRedirect />} />
        <Route path="*" element={<DashboardRedirect />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;


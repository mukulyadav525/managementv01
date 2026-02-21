import React, { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { useAuthStore } from './stores/authStore';
import { getDashboardPath } from './utils/roleUtils';

// Pages
import { LoginPage } from './pages/LoginPage';
import { RegisterPage } from './pages/RegisterPage';
import { CompleteProfilePage } from './pages/CompleteProfilePage';
import { AdminDashboardPage } from './pages/dashboards/AdminDashboardPage';
import { OwnerDashboardPage } from './pages/dashboards/OwnerDashboardPage';
import { TenantDashboardPage } from './pages/dashboards/TenantDashboardPage';
import { SecurityDashboardPage } from './pages/dashboards/SecurityDashboardPage';
import { ForgotPasswordPage } from './pages/ForgotPasswordPage';
import { ResetPasswordPage } from './pages/ResetPasswordPage';
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
import { PetsPage } from './pages/PetsPage';
import { ServicesPage } from './pages/ServicesPage';
import { SettingsPage } from './pages/SettingsPage';
import { ProfilePage } from './pages/ProfilePage';
import { SalaryPaymentsPage } from './pages/SalaryPaymentsPage';
import { CCTVPage } from './pages/CCTVPage';
import { AdminSalaryPage } from './pages/admin/AdminSalaryPage';
import { StaffPage } from './pages/admin/StaffPage';
import { OwnerStaffPage } from './pages/OwnerStaffPage';
import { EmergencyDirectoryPage } from './pages/EmergencyDirectoryPage';
import { AmenityBookingPage } from './pages/AmenityBookingPage';
import { PollsPage } from './pages/PollsPage';
import { DocumentsPage } from './pages/DocumentsPage';
import { GatePassPage } from './pages/GatePassPage';

// Components
import { RoleProtectedRoute } from './components/routing/RoleProtectedRoute';

// Protected Route Component (for basic auth check)
const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, loading, needsCompletion } = useAuthStore();

  console.log(`ProtectedRoute: Render - Loading: ${loading}, User: ${user?.uid ? 'YES' : 'NO'}, NeedsCompletion: ${needsCompletion}`);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-primary-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Initializing securely...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    console.warn('ProtectedRoute: No user found, redirecting to /login');
    return <Navigate to="/login" replace />;
  }

  if (needsCompletion) {
    console.log('ProtectedRoute: User needs completion, redirecting to /complete-profile');
    return <Navigate to="/complete-profile" replace />;
  }

  return <>{children}</>;
};

// Smart Dashboard Redirect - redirects to role-specific dashboard
const DashboardRedirect: React.FC = () => {
  const { user, loading, needsCompletion } = useAuthStore();

  console.log(`DashboardRedirect: Render - Loading: ${loading}, User: ${user?.uid ? 'YES' : 'NO'}, Role: ${user?.role}`);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-primary-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Redirecting to dashboard...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    console.warn('DashboardRedirect: No user, redirecting to /login');
    return <Navigate to="/login" replace />;
  }

  if (needsCompletion) {
    return <Navigate to="/complete-profile" replace />;
  }

  const dashboardPath = getDashboardPath(user.role);
  console.log(`DashboardRedirect: Navigating to ${dashboardPath}`);
  return <Navigate to={dashboardPath} replace />;
};

function App() {
  console.log('App: Component rendering...');
  const { initializeAuth, loading, user } = useAuthStore();

  useEffect(() => {
    console.log('App: useEffect mounting, calling initializeAuth()');
    initializeAuth();
  }, []);

  console.log(`App: State - Loading: ${loading}, User: ${user?.email || 'None'}`);

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
        <Route path="/complete-profile" element={<CompleteProfilePage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/update-password" element={<ResetPasswordPage />} />

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
          path="/emergency"
          element={
            <ProtectedRoute>
              <EmergencyDirectoryPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/amenities"
          element={
            <ProtectedRoute>
              <AmenityBookingPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/polls"
          element={
            <ProtectedRoute>
              <PollsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/documents"
          element={
            <ProtectedRoute>
              <DocumentsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/gatepass"
          element={
            <ProtectedRoute>
              <GatePassPage />
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
          path="/pets"
          element={
            <ProtectedRoute>
              <PetsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/services"
          element={
            <ProtectedRoute>
              <ServicesPage />
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


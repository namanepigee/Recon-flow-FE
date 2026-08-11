import { Navigate, Route, Routes } from 'react-router-dom';

import ProtectedRoute from '../components/auth/ProtectedRoute.jsx';
import OrganisationGuard from '../components/organisation/OrganisationGuard.jsx';
import PermissionGuard from '../components/organisation/PermissionGuard.jsx';
import AdminPermissionsOverviewPage from '../pages/AdminPermissionsOverviewPage.jsx';
import AdminPermissionsPage from '../pages/AdminPermissionsPage.jsx';
import AdminUserDetailPage from '../pages/AdminUserDetailPage.jsx';
import AdminUsersPage from '../pages/AdminUsersPage.jsx';
import AnalyticsDashboardPage from '../pages/AnalyticsDashboardPage.jsx';
import DashboardPage from '../pages/DashboardPage.jsx';
import InvoicePage from '../pages/InvoicePage.jsx';
import LoginPage from '../pages/LoginPage.jsx';
import NotFoundPage from '../pages/NotFoundPage.jsx';
import OrganisationOnboardingPage from '../pages/OrganisationOnboardingPage.jsx';
import PaymentAdvicePage from '../pages/PaymentAdvicePage.jsx';
import PaymentsPage from '../pages/PaymentsPage.jsx';
import ProfilePage from '../pages/ProfilePage.jsx';
import ReconPage from '../pages/ReconPage.jsx';
import SignupPage from '../pages/SignupPage.jsx';

export default function AppRoutes() {
  return (
    <Routes>
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <OrganisationGuard>
              <DashboardPage />
            </OrganisationGuard>
          </ProtectedRoute>
        }
      />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/signup" element={<SignupPage />} />
      <Route
        path="/onboarding"
        element={
          <ProtectedRoute>
            <OrganisationOnboardingPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <OrganisationGuard>
              <AnalyticsDashboardPage />
            </OrganisationGuard>
          </ProtectedRoute>
        }
      />
      <Route
        path="/recon"
        element={
          <ProtectedRoute>
            <OrganisationGuard>
              <ReconPage />
            </OrganisationGuard>
          </ProtectedRoute>
        }
      />
      <Route
        path="/invoice"
        element={
          <ProtectedRoute>
            <OrganisationGuard>
              <InvoicePage />
            </OrganisationGuard>
          </ProtectedRoute>
        }
      />
      <Route
        path="/payments"
        element={
          <ProtectedRoute>
            <OrganisationGuard>
              <PaymentsPage />
            </OrganisationGuard>
          </ProtectedRoute>
        }
      />
      <Route
        path="/payment-advice"
        element={
          <ProtectedRoute>
            <OrganisationGuard>
              <PaymentAdvicePage />
            </OrganisationGuard>
          </ProtectedRoute>
        }
      />
      <Route
        path="/profile"
        element={
          <ProtectedRoute>
            <OrganisationGuard>
              <ProfilePage />
            </OrganisationGuard>
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/users"
        element={
          <ProtectedRoute>
            <OrganisationGuard>
              <PermissionGuard permission="organisation.users.view">
                <AdminUsersPage />
              </PermissionGuard>
            </OrganisationGuard>
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/users/:membershipId"
        element={
          <ProtectedRoute>
            <OrganisationGuard>
              <PermissionGuard permission="organisation.users.view">
                <AdminUserDetailPage />
              </PermissionGuard>
            </OrganisationGuard>
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/permissions"
        element={
          <ProtectedRoute>
            <OrganisationGuard>
              <PermissionGuard permission="organisation.permissions.manage">
                <AdminPermissionsOverviewPage />
              </PermissionGuard>
            </OrganisationGuard>
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/users/:membershipId/permissions"
        element={
          <ProtectedRoute>
            <OrganisationGuard>
              <PermissionGuard permission="organisation.permissions.manage">
                <AdminPermissionsPage />
              </PermissionGuard>
            </OrganisationGuard>
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/audit"
        element={<Navigate replace to="/admin/users" />}
      />
      <Route
        path="/admin/organisation"
        element={<Navigate replace to="/profile" />}
      />
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}

import React, { Suspense, lazy } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { AppLayout, CustomerLayout, AgentLayout, AdminLayout } from './layouts/AppLayout';
import { ProtectedRoute } from './components/layout/ProtectedRoute';
import { RoleRoute } from './components/layout/RoleRoute';
import { ErrorBoundary } from './components/layout/ErrorBoundary';
import { AuthPage } from './pages/AuthPage';
import { Spinner } from './components/ui/Feedback';
import { useAuth } from './features/auth/AuthContext';

const OldApp = lazy(() => import('./OldApp'));

// M2-D Phase 2: Customer Pages
const CustomerDashboard = lazy(() => import('./pages/customer/CustomerDashboard'));
const CustomerShipments = lazy(() => import('./pages/customer/CustomerShipments'));
const CustomerOrderDetails = lazy(() => import('./pages/customer/CustomerOrderDetails'));
const CreateShipment = lazy(() => import('./pages/customer/CreateShipment'));
const TrackingPage = lazy(() => import('./pages/customer/TrackingPage'));
const CustomerProfile = lazy(() => import('./pages/customer/CustomerProfile'));
// M2-D Phase 2: Agent Pages
const AgentDashboard = lazy(() => import('./pages/agent/AgentDashboard'));
const AgentAssignments = lazy(() => import('./pages/agent/AgentAssignments'));
const AgentOrderDetails = lazy(() => import('./pages/agent/AgentOrderDetails'));
const AgentProfile = lazy(() => import('./pages/agent/AgentProfile'));

const PageLoader = () => (
  <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
    <Spinner size={48} />
  </div>
);

// Redirect /app to the correct sub-route based on authenticated role
function RoleBasedRedirect() {
  const { role } = useAuth();
  if (role === 'delivery-agent') return <Navigate to="agent" replace />;
  if (role === 'admin' || role === 'sub-admin') return <Navigate to="admin" replace />;
  return <Navigate to="customer" replace />;
}

export default function App() {
  return (
    <ErrorBoundary>
      <Suspense fallback={<PageLoader />}>
        <Routes>
        {/* Public Routes */}
        <Route path="/" element={<Navigate to="/app" />} />
        <Route path="/login" element={<AuthPage />} />
        <Route path="/register" element={<AuthPage />} />
        <Route path="/tracking" element={<OldApp />} /> {/* Fallback to old tracking for now */}

        {/* Protected App Shell */}
        <Route path="/app" element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>
          <Route index element={<RoleBasedRedirect />} />
          
          {/* Customer Routes */}
          <Route path="customer" element={<RoleRoute allowedRoles={['customer']}><CustomerLayout /></RoleRoute>}>
            <Route index element={<CustomerDashboard />} />
            <Route path="shipments" element={<CustomerShipments />} />
            <Route path="shipments/new" element={<Navigate to="../create-shipment" replace />} />
            <Route path="create-shipment" element={<CreateShipment />} />
            <Route path="shipments/:orderId" element={<CustomerOrderDetails />} />
            <Route path="tracking" element={<TrackingPage />} />
            <Route path="profile" element={<CustomerProfile />} />
          </Route>
          
          {/* Agent Routes */}
          <Route path="agent" element={<RoleRoute allowedRoles={['delivery-agent']}><AgentLayout /></RoleRoute>}>
            <Route index element={<AgentDashboard />} />
            <Route path="assignments" element={<AgentAssignments />} />
            <Route path="assignments/:orderId" element={<AgentOrderDetails />} />
            <Route path="profile" element={<AgentProfile />} />
          </Route>

          {/* Admin Routes */}
          <Route path="admin" element={<RoleRoute allowedRoles={['admin', 'sub-admin']}><AdminLayout /></RoleRoute>}>
            <Route index element={<OldApp />} />
            <Route path="orders" element={<OldApp />} />
            <Route path="fleet" element={<OldApp />} />
            <Route path="analytics" element={<OldApp />} />
            <Route path="settings" element={<OldApp />} />
          </Route>
        </Route>
      </Routes>
    </Suspense>
    </ErrorBoundary>
  );
}

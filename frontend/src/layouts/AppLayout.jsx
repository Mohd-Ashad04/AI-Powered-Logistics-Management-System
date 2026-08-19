import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { useAuth } from '../features/auth/AuthContext';
import { useShipments } from '../features/orders/useShipments';
import { Sidebar } from '../components/layout/Sidebar';
import { Navbar } from '../components/layout/Navbar';
import { generateNotificationsFromShipments } from '../utils/helpers';

export function AppLayout() {
  const { user, logout, token } = useAuth();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [showNotifs, setShowNotifs] = useState(false);
  
  // Real backend data integration
  const { data: shipments = [] } = useShipments();
  const notifications = generateNotificationsFromShipments(shipments);

  return (
    <div style={{ display: 'flex', minHeight: '100vh', width: '100%', backgroundColor: 'var(--color-bg-base)' }}>
      <Sidebar 
        collapsed={sidebarCollapsed} 
        setCollapsed={setSidebarCollapsed} 
        customer={user} 
      />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        <Navbar 
          customer={user}
          onLogout={logout}
          showNotifs={showNotifs}
          setShowNotifs={setShowNotifs}
          notifications={notifications}
        />
        <div style={{ padding: 'var(--space-6)', flex: 1, overflowY: 'auto' }}>
          <Outlet context={{ shipments, customer: user, authToken: token }} />
        </div>
      </div>
    </div>
  );
}

export function CustomerLayout() { return <Outlet />; }
export function AgentLayout() { return <Outlet />; }
export function AdminLayout() { return <Outlet />; }
import React from 'react';
import { NavLink } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Package, 
  MapPin, 
  Truck, 
  BarChart3, 
  Settings, 
  LogOut,
  ChevronLeft,
  ChevronRight,
  ShieldAlert
} from 'lucide-react';
import { IconButton } from '../ui';
import './layout.css';

const customerNavItems = [
  { id: "dashboard", path: "/app/customer", label: "Dashboard", icon: LayoutDashboard },
  { id: "shipments", path: "/app/customer/shipments", label: "Shipments", icon: Package },
  { id: "tracking", path: "/app/customer/tracking", label: "Tracking", icon: MapPin },
  { id: "settings", path: "/app/customer/profile", label: "Profile", icon: Settings },
];

const agentNavItems = [
  { id: "dashboard", path: "/app/agent", label: "Dashboard", icon: LayoutDashboard },
  { id: "assignments", path: "/app/agent/assignments", label: "Assignments", icon: Truck },
  { id: "settings", path: "/app/agent/profile", label: "Profile", icon: Settings },
];

export function Sidebar({ collapsed, setCollapsed, customer }) {
  const roleName = customer?.role ? customer.role.toUpperCase() : "CUSTOMER";
  const navItems = roleName === 'DELIVERY-AGENT' ? agentNavItems : customerNavItems;
  
  return (
    <aside className={`ui-sidebar ${collapsed ? 'collapsed' : ''}`}>
      <div className="ui-sidebar-header">
        {!collapsed && (
          <div className="ui-sidebar-brand">
            <div className="ui-brand-icon">
              <ShieldAlert size={20} className="text-accent-primary" />
            </div>
            <div>
              <h2 className="ui-brand-title">AiLogiTrack</h2>
              <span className="ui-brand-subtitle">{roleName.replace('-', ' ')} PORTAL</span>
            </div>
          </div>
        )}
        {collapsed && <ShieldAlert size={24} className="text-accent-primary mx-auto" />}
      </div>

      <nav className="ui-sidebar-nav">
        {navItems.map((item) => (
          <NavLink 
            key={item.id} 
            to={item.path}
            end={item.path === '/app/customer' || item.path === '/app/agent'}
            className={({ isActive }) => `ui-nav-link ${isActive ? 'active' : ''}`}
            title={collapsed ? item.label : undefined}
          >
            <item.icon size={20} className="ui-nav-icon" />
            {!collapsed && <span>{item.label}</span>}
          </NavLink>
        ))}
      </nav>

      <div className="ui-sidebar-footer">
        <IconButton 
          icon={collapsed ? ChevronRight : ChevronLeft} 
          onClick={() => setCollapsed(!collapsed)} 
          variant="ghost"
          aria-label="Toggle Sidebar"
          style={{ width: '100%', justifyContent: 'center' }}
        />
      </div>
    </aside>
  );
}

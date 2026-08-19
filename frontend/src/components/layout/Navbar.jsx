import React from 'react';
import { Bell, Search, LogOut, User } from 'lucide-react';
import { IconButton } from '../ui';
import './layout.css';

export function Navbar({ customer, onLogout, showNotifs, setShowNotifs, notifications = [] }) {
  const initials = customer?.name ? customer.name.substring(0, 2).toUpperCase() : 'US';

  return (
    <header className="ui-navbar">
      <div className="ui-navbar-search">
        <Search size={18} className="text-muted" />
        <input 
          type="text" 
          placeholder="Search tracking numbers, shipments..." 
          className="ui-navbar-search-input"
        />
      </div>

      <div className="ui-navbar-actions">
        <div style={{ position: 'relative' }}>
          <IconButton 
            icon={Bell} 
            variant="ghost" 
            onClick={() => setShowNotifs(!showNotifs)}
          />
          {notifications.length > 0 && (
            <span className="ui-notif-badge">{notifications.length}</span>
          )}
          
          {showNotifs && (
            <div className="ui-notif-dropdown animate-slide-up">
              <div className="ui-notif-header">
                <h4>Notifications</h4>
              </div>
              <div className="ui-notif-body">
                {notifications.length === 0 ? (
                  <p className="text-muted text-sm text-center p-4">No new notifications</p>
                ) : (
                  notifications.map((n, i) => (
                    <div key={i} className="ui-notif-item">
                      <p>{n.text}</p>
                      <small>{n.time}</small>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        <div className="ui-navbar-profile">
          <div className="ui-avatar">{initials}</div>
          <div className="ui-profile-info">
            <span className="ui-profile-name">{customer?.name || 'User'}</span>
            <span className="ui-profile-role">{customer?.role || 'Customer'}</span>
          </div>
        </div>

        <IconButton 
          icon={LogOut} 
          variant="ghost" 
          onClick={onLogout} 
          title="Logout"
          className="text-danger hover:bg-danger-subtle"
        />
      </div>
    </header>
  );
}

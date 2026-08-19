import React from 'react';
import { CheckCircle2, AlertCircle, Clock, Truck, Package, XCircle, CheckCircle } from 'lucide-react';
import './ui.css';

export function Card({ children, className = '', elevated = false }) {
  return (
    <div className={`ui-card ${elevated ? 'ui-card-elevated' : ''} ${className}`}>
      {children}
    </div>
  );
}

export function CardHeader({ title, description, actions, className = '' }) {
  return (
    <div className={`flex justify-between items-start ${className}`} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
      <div>
        {title && <h3 className="ui-card-title">{title}</h3>}
        {description && <p className="ui-card-description">{description}</p>}
      </div>
      {actions && <div>{actions}</div>}
    </div>
  );
}

export function Badge({ children, variant = 'neutral', icon: Icon, className = '' }) {
  return (
    <span className={`ui-badge ui-badge-${variant} ${className}`}>
      {Icon && <Icon size={14} />}
      {children}
    </span>
  );
}

export function StatusBadge({ status, className = '' }) {
  let variant = 'neutral';
  let Icon = Package;
  
  const s = (status || '').toLowerCase();
  
  if (s.includes('pending')) { variant = 'warning'; Icon = Clock; }
  else if (s.includes('transit')) { variant = 'info'; Icon = Truck; }
  else if (s.includes('delivered') || s.includes('active') || s.includes('available')) { variant = 'success'; Icon = CheckCircle2; }
  else if (s.includes('cancel') || s.includes('fail') || s.includes('offline')) { variant = 'danger'; Icon = XCircle; }
  else if (s.includes('assigned')) { variant = 'info'; Icon = CheckCircle; }

  return (
    <Badge variant={variant} icon={Icon} className={className}>
      {status || 'Unknown'}
    </Badge>
  );
}

export function Table({ children, className = '' }) {
  return (
    <div className={`ui-table-container ${className}`}>
      <table className="ui-table">
        {children}
      </table>
    </div>
  );
}

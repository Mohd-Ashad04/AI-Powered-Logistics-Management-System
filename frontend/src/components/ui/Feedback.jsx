import React from 'react';
import { Loader2, X } from 'lucide-react';
import { IconButton } from './Button';
import './ui.css';

export function Modal({ isOpen, onClose, title, children, footer }) {
  if (!isOpen) return null;

  return (
    <div className="ui-modal-backdrop animate-fade-in" onClick={onClose}>
      <div className="ui-modal animate-scale-in" onClick={e => e.stopPropagation()}>
        <div className="ui-modal-header">
          <h3 className="ui-card-title">{title}</h3>
          <IconButton icon={X} onClick={onClose} size="sm" aria-label="Close modal" />
        </div>
        <div className="ui-modal-body">
          {children}
        </div>
        {footer && (
          <div className="ui-modal-footer">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}

export function Spinner({ size = 24, className = '' }) {
  return <Loader2 className={`animate-spin text-accent-primary ${className}`} size={size} />;
}

export function Skeleton({ className = '' }) {
  return <div className={`skeleton-shimmer ${className}`} style={{ borderRadius: 'var(--radius-md)', minHeight: '20px' }} />;
}

export function EmptyState({ icon: Icon, title, description, action }) {
  return (
    <div className="ui-empty-state animate-fade-in">
      {Icon && <Icon className="ui-empty-icon" size={48} />}
      <h3 className="ui-card-title">{title}</h3>
      <p className="ui-card-description" style={{ marginTop: 'var(--space-2)', marginBottom: 'var(--space-4)' }}>
        {description}
      </p>
      {action}
    </div>
  );
}

export function ErrorState({ title, description, action }) {
  return (
    <div className="ui-empty-state animate-fade-in" style={{ borderColor: 'var(--color-danger-border)', backgroundColor: 'var(--color-danger-bg)' }}>
      <h3 className="ui-card-title" style={{ color: 'var(--color-danger-text)' }}>{title}</h3>
      <p className="ui-card-description" style={{ marginTop: 'var(--space-2)', marginBottom: 'var(--space-4)', color: 'var(--color-danger-text)' }}>
        {description}
      </p>
      {action}
    </div>
  );
}

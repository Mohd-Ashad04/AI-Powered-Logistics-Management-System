import React from 'react';
import { Card } from '../ui/DataDisplay';

export function StatCard({ title, value, icon: Icon, trend, trendValue, iconColor = "var(--color-accent-primary)" }) {
  return (
    <Card elevated className="ui-stat-card" style={{ transition: 'transform var(--motion-duration-fast)', cursor: 'default' }}>
      <style>{`
        .ui-stat-card:hover { transform: translateY(-4px); }
      `}</style>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <p className="ui-card-description">{title}</p>
          <h3 style={{ fontSize: 'var(--font-size-3xl)', margin: 'var(--space-2) 0', color: 'var(--color-text-primary)' }}>
            {value}
          </h3>
          {trend && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-1)', fontSize: 'var(--font-size-xs)' }}>
              <span className={trend === 'up' ? 'text-success' : trend === 'down' ? 'text-danger' : 'text-muted'}>
                {trend === 'up' ? '↑' : trend === 'down' ? '↓' : '→'} {trendValue}
              </span>
              <span className="text-muted">vs last period</span>
            </div>
          )}
        </div>
        {Icon && (
          <div style={{ padding: 'var(--space-3)', borderRadius: 'var(--radius-md)', backgroundColor: 'var(--color-surface-1)', color: iconColor }}>
            <Icon size={24} />
          </div>
        )}
      </div>
    </Card>
  );
}

export function ProgressIndicator({ value, max = 100, label, colorClass = "bg-accent-primary" }) {
  const percentage = Math.min(100, Math.max(0, (value / max) * 100));
  
  return (
    <div style={{ width: '100%', marginBottom: 'var(--space-4)' }}>
      {label && (
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 'var(--space-2)', fontSize: 'var(--font-size-sm)' }}>
          <span className="text-secondary">{label}</span>
          <span className="text-primary font-medium">{Math.round(percentage)}%</span>
        </div>
      )}
      <div style={{ height: '8px', width: '100%', backgroundColor: 'var(--color-surface-1)', borderRadius: 'var(--radius-pill)', overflow: 'hidden' }}>
        <div 
          className={colorClass}
          style={{ 
            height: '100%', 
            width: `${percentage}%`, 
            transition: 'width 1s var(--motion-ease-spring)',
            backgroundColor: 'var(--color-accent-primary)' 
          }} 
        />
      </div>
    </div>
  );
}

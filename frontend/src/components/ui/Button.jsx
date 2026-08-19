import React from 'react';
import { Loader2 } from 'lucide-react';
import './ui.css';

export function Button({ 
  children, 
  variant = 'primary', 
  size = 'md', 
  isLoading = false, 
  disabled, 
  icon: Icon,
  className = '',
  ...props 
}) {
  const baseClass = `ui-btn ui-btn-${variant} ui-btn-${size} ${className}`;
  
  return (
    <button 
      className={baseClass} 
      disabled={disabled || isLoading} 
      {...props}
    >
      {isLoading ? <Loader2 className="animate-spin" size={16} /> : Icon && <Icon size={16} />}
      {children}
    </button>
  );
}

export function IconButton({ 
  icon: Icon, 
  variant = 'ghost', 
  size = 'md', 
  isLoading = false, 
  disabled,
  className = '',
  ...props 
}) {
  const baseClass = `ui-icon-btn ui-icon-btn-${size} ${className}`;
  
  return (
    <button 
      className={baseClass} 
      disabled={disabled || isLoading} 
      {...props}
    >
      {isLoading ? <Loader2 className="animate-spin" size={18} /> : <Icon size={18} />}
    </button>
  );
}

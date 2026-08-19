import React, { forwardRef } from 'react';
import './ui.css';

export const Input = forwardRef(({ 
  label, 
  error, 
  className = '', 
  id, 
  required,
  ...props 
}, ref) => {
  const inputId = id || `input-${Math.random().toString(36).substr(2, 9)}`;
  
  return (
    <div className="ui-form-group">
      {label && (
        <label htmlFor={inputId} className="ui-label">
          {label} {required && <span className="text-danger">*</span>}
        </label>
      )}
      <input
        ref={ref}
        id={inputId}
        className={`ui-input ${error ? 'error' : ''} ${className}`}
        required={required}
        {...props}
      />
      {error && <span className="ui-error-message">{error}</span>}
    </div>
  );
});

Input.displayName = 'Input';

export const Select = forwardRef(({ 
  label, 
  error, 
  options = [], 
  className = '', 
  id, 
  required,
  ...props 
}, ref) => {
  const selectId = id || `select-${Math.random().toString(36).substr(2, 9)}`;
  
  return (
    <div className="ui-form-group">
      {label && (
        <label htmlFor={selectId} className="ui-label">
          {label} {required && <span className="text-danger">*</span>}
        </label>
      )}
      <select
        ref={ref}
        id={selectId}
        className={`ui-select ${error ? 'error' : ''} ${className}`}
        required={required}
        {...props}
      >
        <option value="" disabled hidden>Select an option</option>
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
      {error && <span className="ui-error-message">{error}</span>}
    </div>
  );
});

Select.displayName = 'Select';

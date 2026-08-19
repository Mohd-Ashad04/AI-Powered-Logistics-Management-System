import React, { useState, useRef, useEffect } from 'react';
import { useLocationSearch } from '../useLocations';
import { Search, MapPin, X, AlertCircle } from 'lucide-react';

export default function LocationAutocomplete({ label, value, onChange, placeholder, required }) {
  const { query, setQuery, results, isLoading } = useLocationSearch();
  const [isOpen, setIsOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const wrapperRef = useRef(null);

  useEffect(() => {
    if (value && value.city) {
      setQuery(`${value.city}, ${value.country}`);
    } else {
      setQuery('');
    }
  }, [value, setQuery]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleInputChange = (e) => {
    setQuery(e.target.value);
    setIsOpen(true);
    setSelectedIndex(-1);
    if (value) {
      onChange(null);
    }
  };

  const handleSelect = (loc) => {
    onChange(loc);
    setQuery(`${loc.city}, ${loc.country}`);
    setIsOpen(false);
  };

  const handleKeyDown = (e) => {
    if (!isOpen) {
      if (e.key === 'ArrowDown' || e.key === 'Enter') {
        setIsOpen(true);
      }
      return;
    }

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(prev => (prev < results.length - 1 ? prev + 1 : prev));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(prev => (prev > 0 ? prev - 1 : prev));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (selectedIndex >= 0 && selectedIndex < results.length) {
        handleSelect(results[selectedIndex]);
      } else if (results.length === 1) {
        handleSelect(results[0]);
      }
    } else if (e.key === 'Escape') {
      setIsOpen(false);
    }
  };

  const handleClear = () => {
    onChange(null);
    setQuery('');
    setIsOpen(false);
    // Focus the input again
    const input = wrapperRef.current?.querySelector('input');
    if (input) input.focus();
  };

  return (
    <div ref={wrapperRef} style={{ position: 'relative', display: 'flex', flexDirection: 'column', gap: 'var(--space-1)' }}>
      {label && <label className="ui-label">{label} {required && <span style={{ color: 'var(--color-danger)' }}>*</span>}</label>}
      <div style={{ position: 'relative' }}>
        <Search size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-muted)' }} />
        <input 
          type="text" 
          className="ui-input" 
          style={{ paddingLeft: '40px', paddingRight: value ? '40px' : '12px' }}
          placeholder={placeholder || "Search city, area or PIN"}
          value={query}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          onFocus={() => setIsOpen(true)}
          required={required && !value}
        />
        {value && (
          <button 
            type="button" 
            onClick={handleClear}
            style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-muted)', display: 'flex', alignItems: 'center' }}
          >
            <X size={18} />
          </button>
        )}
      </div>
      
      {value && !value.resolved && (
         <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--color-warning)', fontSize: 'var(--font-size-xs)', marginTop: '4px' }}>
           <AlertCircle size={14} />
           <span>Resolving precise coordinates... Please wait.</span>
         </div>
      )}

      {isOpen && query.trim().length >= 2 && !value && (
        <div style={{ 
          position: 'absolute', 
          top: '100%', 
          left: 0, 
          right: 0, 
          marginTop: '4px', 
          backgroundColor: 'var(--color-surface-1)', 
          border: '1px solid var(--color-border-subtle)', 
          borderRadius: 'var(--radius-md)', 
          boxShadow: 'var(--shadow-lg)', 
          zIndex: 10,
          maxHeight: '240px',
          overflowY: 'auto'
        }}>
          {isLoading ? (
            <div style={{ padding: 'var(--space-3)', color: 'var(--color-text-muted)', textAlign: 'center', fontSize: 'var(--font-size-sm)' }}>
              Searching...
            </div>
          ) : results.length > 0 ? (
            <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
              {results.map((loc, idx) => (
                <li 
                  key={`${loc.city}-${loc.state}`}
                  onClick={() => handleSelect(loc)}
                  onMouseEnter={() => setSelectedIndex(idx)}
                  style={{ 
                    padding: 'var(--space-2) var(--space-3)', 
                    cursor: 'pointer', 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: 'var(--space-3)',
                    backgroundColor: selectedIndex === idx ? 'var(--color-surface-2)' : 'transparent',
                    borderBottom: '1px solid var(--color-border-subtle)'
                  }}
                >
                  <MapPin size={18} className="text-accent-primary" />
                  <div>
                    <p style={{ margin: 0, color: 'var(--color-text-primary)', fontWeight: 500, fontSize: 'var(--font-size-sm)' }}>
                      {loc.name}, {loc.country}
                    </p>
                    <p style={{ margin: 0, color: 'var(--color-text-secondary)', fontSize: 'var(--font-size-xs)' }}>
                      {loc.state} {loc.pincode ? `• ${loc.pincode}` : ''}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <div style={{ padding: 'var(--space-3)', color: 'var(--color-text-muted)', textAlign: 'center', fontSize: 'var(--font-size-sm)' }}>
              No locations found
            </div>
          )}
        </div>
      )}
    </div>
  );
}

import React from 'react';
import './ui.css';

export function Table({ columns, data, keyField = 'id', onRowClick, isLoading, emptyState }) {
  return (
    <div className="ui-table-container">
      <table className="ui-table">
        <thead>
          <tr>
            {columns.map((col, i) => (
              <th key={col.key || i} style={{ width: col.width }}>{col.title}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {isLoading ? (
            <tr>
              <td colSpan={columns.length} className="text-center">
                <div className="skeleton-shimmer" style={{ height: '40px', borderRadius: '4px' }} />
              </td>
            </tr>
          ) : data && data.length > 0 ? (
            data.map((row) => (
              <tr 
                key={row[keyField]} 
                onClick={() => onRowClick && onRowClick(row)}
                style={{ cursor: onRowClick ? 'pointer' : 'default' }}
              >
                {columns.map((col, i) => (
                  <td key={col.key || i}>
                    {col.render ? col.render(row[col.key], row) : row[col.key]}
                  </td>
                ))}
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan={columns.length}>
                {emptyState || <div className="text-center p-4 text-muted">No data available</div>}
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

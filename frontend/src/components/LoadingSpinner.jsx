import React from 'react';
import './LoadingSpinner.css';

/**
 * Loading spinner component with optional text message
 * @param {string} message - Optional message to display below spinner
 * @param {string} size - Size: 'small', 'medium' (default), 'large'
 * @param {boolean} fullPage - If true, centers in the full page
 */
const LoadingSpinner = ({ message = 'Ładowanie...', size = 'medium', fullPage = false }) => {
  const sizeClass = `spinner-${size}`;

  if (fullPage) {
    return (
      <div className="loading-spinner-fullpage">
        <div className="loading-spinner-content">
          <div className={`loading-spinner ${sizeClass}`}>
            <div className="spinner-ring"></div>
            <div className="spinner-ring"></div>
            <div className="spinner-ring"></div>
          </div>
          {message && <p className="loading-message">{message}</p>}
        </div>
      </div>
    );
  }

  return (
    <div className="loading-spinner-container">
      <div className={`loading-spinner ${sizeClass}`}>
        <div className="spinner-ring"></div>
        <div className="spinner-ring"></div>
        <div className="spinner-ring"></div>
      </div>
      {message && <p className="loading-message">{message}</p>}
    </div>
  );
};

/**
 * Skeleton loader for table rows
 * @param {number} rows - Number of skeleton rows to display
 * @param {number} columns - Number of columns per row
 */
export const TableSkeleton = ({ rows = 5, columns = 4 }) => {
  return (
    <div className="table-skeleton">
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <div key={rowIndex} className="skeleton-row">
          {Array.from({ length: columns }).map((_, colIndex) => (
            <div key={colIndex} className="skeleton-cell">
              <div className="skeleton-line"></div>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
};

/**
 * Skeleton loader for cards/tiles
 * @param {number} count - Number of skeleton cards to display
 */
export const CardSkeleton = ({ count = 3 }) => {
  return (
    <div className="card-skeleton-container">
      {Array.from({ length: count }).map((_, index) => (
        <div key={index} className="skeleton-card">
          <div className="skeleton-card-header">
            <div className="skeleton-circle"></div>
            <div className="skeleton-line short"></div>
          </div>
          <div className="skeleton-card-body">
            <div className="skeleton-line"></div>
            <div className="skeleton-line medium"></div>
            <div className="skeleton-line short"></div>
          </div>
        </div>
      ))}
    </div>
  );
};

export default LoadingSpinner;

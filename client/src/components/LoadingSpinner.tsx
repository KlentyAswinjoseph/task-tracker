import React from 'react';

interface LoadingSpinnerProps {
  show: boolean;
  message?: string;
}

const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({ show, message = 'Loading data...' }) => {
  return (
    <div className={`loading ${show ? 'show' : ''}`}>
      <div className="spinner"></div>
      <p>{message}</p>
    </div>
  );
};

export default LoadingSpinner; 
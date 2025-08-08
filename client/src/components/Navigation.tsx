import React from 'react';
import { Link, useLocation } from 'react-router-dom';

const Navigation: React.FC = () => {
  const location = useLocation();

  const isActive = (path: string): boolean => {
    return location.pathname === path;
  };

  return (
    <div className="nav-links">
      <Link 
        to="/" 
        className={isActive('/') ? 'active' : ''}
        style={{ background: isActive('/') ? '#10b981' : '#3b82f6' }}
      >
        <i className="fas fa-code-branch"></i>
        Branch Dashboard
      </Link>
      <Link 
        to="/tasks" 
        className={isActive('/tasks') ? 'active' : ''}
        style={{ background: isActive('/tasks') ? '#10b981' : '#3b82f6' }}
      >
        <i className="fas fa-tasks"></i>
        Task Analytics
      </Link>
      <Link 
        to="/chatbot" 
        className={isActive('/chatbot') ? 'active' : ''}
        style={{ background: isActive('/chatbot') ? '#10b981' : '#f59e0b' }}
      >
        <i className="fas fa-robot"></i>
        AI Chatbot
      </Link>
      <Link 
        to="/users" 
        className={isActive('/users') ? 'active' : ''}
        style={{ background: isActive('/users') ? '#10b981' : '#8b5cf6' }}
      >
        <i className="fas fa-users"></i>
        Squad Management
      </Link>
    </div>
  );
};

export default Navigation; 
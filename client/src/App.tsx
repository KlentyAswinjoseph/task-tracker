import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Dashboard from './pages/Dashboard';
import TaskAnalytics from './pages/TaskAnalytics';
import SquadManagement from './pages/SquadManagement';
import './styles/globals.css';

function App() {
  return (
    <Router>
      <div className="App">
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/tasks" element={<TaskAnalytics />} />
          <Route path="/chatbot" element={
            <div className="container">
              <div className="header">
                <h1>
                  <i className="fas fa-robot"></i>
                  AI Chatbot
                </h1>
                <p>Coming soon - AI-powered task analytics chatbot</p>
              </div>
            </div>
          } />
          <Route path="/users" element={<SquadManagement />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;

// client/src/Navbar.js

import React from 'react';
import { Link } from 'react-router-dom';
import './Navbar.css'; // We'll create this CSS file next

function Navbar({ currentUser, onLogout }) {
  if (!currentUser) {
    return null; // Don't show Navbar if not logged in
  }

  return (
    <nav className="navbar">
      <div className="navbar-brand">
        <Link to="/dashboard" className="app-title-link">ADCCS</Link>
      </div>
      <ul className="navbar-links">
        <li><Link to="/summary">Summary</Link></li>
        <li><Link to="/aircraft">Aircraft</Link></li>
        <li><Link to="/incidents">Incidents</Link></li>
        <li><Link to="/alerts">Alerts</Link></li>
        {currentUser.role === 'Administrator' && (
          <li><Link to="/missiles">Missiles</Link></li>
        )}
        {/* Add more links here as you create more pages */}
      </ul>
      <div className="navbar-user-info">
        <span>{currentUser.username} ({currentUser.role})</span>
        <button onClick={onLogout} className="logout-button">Logout</button>
      </div>
    </nav>
  );
}

export default Navbar;
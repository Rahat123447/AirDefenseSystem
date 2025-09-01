// client/src/HomeDashboard.js

import React from 'react';
import { Link } from 'react-router-dom'; // Import Link for navigation
import './HomeDashboard.css'; // We'll create this CSS file next

function HomeDashboard({ currentUser }) {
  // We can add more complex logic or data fetching here later if needed for the home view
  // For now, it's primarily a navigation hub.

  if (!currentUser) {
    return <p>Please log in to view the dashboard.</p>;
  }

  return (
    <div className="home-dashboard-container">
      <h2>Welcome, {currentUser.username}!</h2>
      <p>Select a section to manage the Air Defense System.</p>

      <div className="dashboard-navigation-grid">
        <Link to="/summary" className="nav-card">
          <h3>Region Surveillance Summary</h3>
          <p>View aggregated data on radar activity and threat levels.</p>
        </Link>

        <Link to="/aircraft" className="nav-card">
          <h3>Detected Aircraft Management</h3>
          <p>Detect new aircraft, view current threats, and manage classifications.</p>
        </Link>

        <Link to="/incidents" className="nav-card">
          <h3>Incident Reports</h3>
          <p>Review logs of all interception events and detailed incident reports.</p>
        </Link>

        <Link to="/alerts" className="nav-card">
          <h3>Automated System Alerts</h3>
          <p>Monitor system-generated alerts for unintercepted high threats.</p>
        </Link>

        {currentUser.role === 'Administrator' && (
          <Link to="/missiles" className="nav-card admin-feature">
            <h3>Missile Inventory & Management</h3>
            <p>Add new missiles and manage available interception assets.</p>
          </Link>
        )}
        
        {/* Add more links for other features like Threat Rules Management, Radar Station Config, etc. */}
      </div>
    </div>
  );
}

export default HomeDashboard;
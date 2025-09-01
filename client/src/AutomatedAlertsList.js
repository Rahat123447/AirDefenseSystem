// client/src/AutomatedAlertsList.js

import React, { useState, useEffect } from 'react';
import './AutomatedAlertsList.css';

function AutomatedAlertsList({ refreshTrigger, currentUser }) {
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [acknowledgementMessage, setAcknowledgementMessage] = useState(null); // NEW: State for individual alert messages

  const fetchAutomatedAlerts = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('http://localhost:5000/api/alerts/automated');
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      setAlerts(data);
    } catch (err) {
      setError(err.message);
      console.error('Error fetching automated alerts:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (currentUser) {
      fetchAutomatedAlerts();
    } else {
      setAlerts([]);
      setLoading(false);
    }
  }, [refreshTrigger, currentUser]);

  // NEW: Handler for acknowledging an alert
  const handleAcknowledgeAlert = async (alertId) => {
    if (!currentUser || !currentUser.id) {
      setAcknowledgementMessage({ type: 'error', text: 'Operator ID not available. Please log in again.' });
      return;
    }

    // Clear previous message after a short delay
    setAcknowledgementMessage(null);

    try {
      const response = await fetch(`http://localhost:5000/api/alerts/${alertId}/acknowledge`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ operatorId: currentUser.id }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || data.message || 'Failed to acknowledge alert');
      }

      setAcknowledgementMessage({ type: 'success', text: data.message });
      // Refresh the list to show the updated status
      fetchAutomatedAlerts();

    } catch (err) {
      setAcknowledgementMessage({ type: 'error', text: err.message });
      console.error('Error acknowledging alert:', err);
    }
    setTimeout(() => setAcknowledgementMessage(null), 5000); // Clear message after 5 seconds
  };


  if (loading) {
    return <p className="loading-message">Loading automated alerts...</p>;
  }

  if (error) {
    return <p className="error-message">Error loading automated alerts: {error}</p>;
  }

  return (
    <div className="automated-alerts-list-container">
      <h3>Automated System Alerts</h3>
      {acknowledgementMessage && ( // Display message here
        <p className={`form-message ${acknowledgementMessage.type}`} style={{marginBottom: '20px'}}>
            {acknowledgementMessage.text}
        </p>
      )}
      {alerts.length === 0 ? (
        <p>No automated alerts at this time.</p>
      ) : (
        <ul className="alert-list">
          {alerts.map((alert) => (
            <li key={alert.ALERT_ID} className={`alert-item threat-level-${alert.THREAT_LEVEL.toLowerCase().replace(' ', '-')}`}>
              <div className="alert-header">
                <strong>Alert #{alert.ALERT_ID} - Aircraft: {alert.AIRCRAFT_IDENTIFIER}</strong>
                <span className={`threat-badge ${alert.THREAT_LEVEL.toLowerCase().replace(' ', '-')}`}>
                    {alert.THREAT_LEVEL}
                </span>
              </div>
              <div className="alert-details">
                <p><strong>Time:</strong> {new Date(alert.ALERT_TIME).toLocaleString()}</p>
                <p><strong>Reason:</strong> {alert.REASON}</p>
                <p><strong>Status:</strong> {alert.IS_ACKNOWLEDGED === 1 ? 'Acknowledged' : 'Pending Acknowledgment'}</p>
                {alert.IS_ACKNOWLEDGED === 0 && currentUser && currentUser.role === 'Administrator' && (
                  <div className="alert-actions">
                    <button
                      className="acknowledge-alert-button"
                      onClick={() => handleAcknowledgeAlert(alert.ALERT_ID)}
                    >
                      Acknowledge
                    </button>
                  </div>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default AutomatedAlertsList;
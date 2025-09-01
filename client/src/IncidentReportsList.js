// client/src/IncidentReportsList.js

import React, { useState, useEffect } from 'react';
import './IncidentReportsList.css';

function IncidentReportsList({ refreshTrigger, currentUser }) {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchIncidentReports = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('http://localhost:5000/api/incidents/all');
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      setReports(data);
    } catch (err) {
      setError(err.message);
      console.error('Error fetching incident reports:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (currentUser) {
      fetchIncidentReports();
    } else {
      setReports([]);
      setLoading(false);
    }
  }, [refreshTrigger, currentUser]);

  if (loading) {
    return <p className="loading-message">Loading incident reports...</p>;
  }

  if (error) {
    return <p className="error-message">Error loading incident reports: {error}</p>;
  }

  return (
    <div className="incident-reports-list-container">
      <h3>Recent Incident Reports</h3>
      {reports.length === 0 ? (
        <p>No incident reports generated yet.</p>
      ) : (
        <ul className="incident-list">
          {reports.map((report) => (
            <li key={report.REPORT_ID} className="incident-item">
              <div className="incident-header">
                <strong>Incident #{report.REPORT_ID} - Aircraft: {report.AIRCRAFT_IDENTIFIER}</strong>
                <span className={`threat-badge ${report.THREAT_LEVEL_AT_INCIDENT.toLowerCase().replace(' ', '-')}`}>
                    {report.THREAT_LEVEL_AT_INCIDENT}
                </span>
              </div>
              <div className="incident-details">
                <p><strong>Time:</strong> {new Date(report.INCIDENT_TIME).toLocaleString()}</p>
                <p><strong>Missile Used:</strong> {report.MISSILE_TYPE_USED}</p>
                <p><strong>Operator:</strong> {report.LAUNCHING_OPERATOR_USERNAME}</p>
                <p><strong>Result:</strong> {report.INTERCEPTION_RESULT}</p>
                <p><strong>Summary:</strong> {report.REPORT_SUMMARY}</p>
                {report.INTERCEPTION_DETAILS && <p><strong>Interception Notes:</strong> {report.INTERCEPTION_DETAILS}</p>}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default IncidentReportsList;
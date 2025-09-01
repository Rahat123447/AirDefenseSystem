// client/src/RegionSurveillanceSummary.js

import React, { useState, useEffect } from 'react';
import './RegionSurveillanceSummary.css'; // We'll create this CSS file next

function RegionSurveillanceSummary({ refreshTrigger }) {
  const [summaryData, setSummaryData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchSummaryData = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('http://localhost:5000/api/surveillance/summary');
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      setSummaryData(data);
    } catch (err) {
      setError(err.message);
      console.error('Error fetching surveillance summary:', err);
    } finally {
      setLoading(false);
    }
  };

  // Fetch summary data when the component mounts or refreshTrigger changes
  useEffect(() => {
    fetchSummaryData();
  }, [refreshTrigger]);

  if (loading) {
    return <p className="loading-message">Loading surveillance summary...</p>;
  }

  if (error) {
    return <p className="error-message">Error loading summary: {error}</p>;
  }

  return (
    <div className="region-summary-container">
      <h3>Region Surveillance Summary</h3>
      {summaryData.length === 0 ? (
        <p>No surveillance data available yet.</p>
      ) : (
        <table className="summary-table">
          <thead>
            <tr>
              <th>Radar Station</th>
              <th>Status</th>
              <th>Detected Aircraft</th>
              <th>High Threats</th>
              <th>Max Alt (ft)</th>
              <th>Min Alt (ft)</th>
              <th>Avg Speed (kts)</th>
            </tr>
          </thead>
          <tbody>
            {summaryData.map((row, index) => (
              <tr key={index}>
                <td>{row.STATION_NAME}</td>
                <td className={`status-${row.OPERATIONAL_STATUS.toLowerCase()}`}>{row.OPERATIONAL_STATUS}</td>
                <td>{row.DETECTED_AIRCRAFT_COUNT}</td>
                <td className={row.HIGH_THREAT_COUNT > 0 ? 'high-threat-cell' : ''}>{row.HIGH_THREAT_COUNT}</td>
                <td>{row.MAX_ALTITUDE_FT ? row.MAX_ALTITUDE_FT : 'N/A'}</td>
                <td>{row.MIN_ALTITUDE_FT ? row.MIN_ALTITUDE_FT : 'N/A'}</td>
                <td>{row.AVG_SPEED_KTS ? Math.round(row.AVG_SPEED_KTS) : 'N/A'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

export default RegionSurveillanceSummary;
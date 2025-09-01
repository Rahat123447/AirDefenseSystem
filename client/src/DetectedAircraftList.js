// client/src/DetectedAircraftList.js

import React, { useState, useEffect } from 'react';
import './DetectedAircraftList.css';
import ThreatLevelOverrideModal from './ThreatLevelOverrideModal';
import InterceptionModal from './InterceptionModal';

// Added missileInventoryRefreshTrigger to props
function DetectedAircraftList({ refreshTrigger, currentUser, onAircraftUpdated, missileInventoryRefreshTrigger }) {
  const [aircrafts, setAircrafts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [showOverrideModal, setShowOverrideModal] = useState(false);
  const [selectedAircraftForOverride, setSelectedAircraftForOverride] = useState(null);

  const [showInterceptionModal, setShowInterceptionModal] = useState(false);
  const [selectedAircraftForInterception, setSelectedAircraftForInterception] = useState(null);


  const fetchDetectedAircraft = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('http://localhost:5000/api/aircraft/all');
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      setAircrafts(data);
    } catch (err) {
      setError(err.message);
      console.error('Error fetching detected aircraft:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDetectedAircraft();
  }, [refreshTrigger]);

  const handleOpenOverrideModal = (aircraft) => {
    setSelectedAircraftForOverride(aircraft);
    setShowOverrideModal(true);
  };

  const handleCloseOverrideModal = () => {
    setShowOverrideModal(false);
    setSelectedAircraftForOverride(null);
  };

  const handleThreatOverrideSuccess = () => {
    fetchDetectedAircraft();
    if(onAircraftUpdated) {
      onAircraftUpdated();
    }
  };

  const handleOpenInterceptionModal = (aircraft) => {
    setSelectedAircraftForInterception(aircraft);
    setShowInterceptionModal(true);
  };

  const handleCloseInterceptionModal = () => {
    setShowInterceptionModal(false);
    setSelectedAircraftForInterception(null);
  };

  const handleInterceptionSuccess = () => {
    fetchDetectedAircraft();
    if(onAircraftUpdated) {
      onAircraftUpdated();
    }
  };

  const isHighThreat = (threatLevel) => {
    return threatLevel === 'High' || threatLevel === 'Critical';
  };


  if (loading) {
    return <p className="loading-message">Loading detected aircraft...</p>;
  }

  if (error) {
    return <p className="error-message">Error loading aircraft: {error}</p>;
  }

  return (
    <div className="detected-aircraft-list-container">
      <h3>Detected Aircraft & Threat Levels</h3>
      {aircrafts.length === 0 ? (
        <p>No aircraft detected yet.</p>
      ) : (
        <ul className="aircraft-list">
          {aircrafts.map((aircraft) => (
            <li key={aircraft.DETECTION_ID} className={`aircraft-item threat-level-${aircraft.THREAT_LEVEL.toLowerCase().replace(' ', '-')}`}>
              <div className="aircraft-header">
                <strong>{aircraft.AIRCRAFT_IDENTIFIER}</strong> (ID: {aircraft.DETECTION_ID})
                <span className={`threat-badge ${aircraft.THREAT_LEVEL.toLowerCase().replace(' ', '-')}`}>
                    {aircraft.THREAT_LEVEL}
                </span>
              </div>
              <div className="aircraft-details">
                <p><strong>Time:</strong> {new Date(aircraft.DETECTION_TIME).toLocaleString()}</p>
                <p><strong>Location:</strong> Lat: {aircraft.LATITUDE}, Long: {aircraft.LONGITUDE}, Alt: {aircraft.ALTITUDE_FT}ft</p>
                <p><strong>Speed:</strong> {aircraft.SPEED_KTS}kts, <strong>Heading:</strong> {aircraft.HEADING_DEG}°</p>
                <p><strong>Radar:</strong> {aircraft.RADAR_STATION_NAME}</p>
                <p><strong>Classified:</strong> {aircraft.SOURCE} at {new Date(aircraft.CLASSIFICATION_TIME).toLocaleString()}</p>
              </div>
              {currentUser && currentUser.role === 'Administrator' && (
                <div className="aircraft-actions">
                  <button
                    className="override-threat-button"
                    onClick={() => handleOpenOverrideModal(aircraft)}
                  >
                    Manage Threat
                  </button>
                  {isHighThreat(aircraft.THREAT_LEVEL) && (
                    <button
                      className="initiate-interception-button"
                      onClick={() => handleOpenInterceptionModal(aircraft)}
                    >
                      Intercept
                    </button>
                  )}
                </div>
              )}
            </li>
          ))}
        </ul>
      )}

      {showOverrideModal && selectedAircraftForOverride && (
        <ThreatLevelOverrideModal
          aircraft={selectedAircraftForOverride}
          currentUser={currentUser}
          onClose={handleCloseOverrideModal}
          onOverrideSuccess={handleThreatOverrideSuccess}
        />
      )}

      {showInterceptionModal && selectedAircraftForInterception && (
        <InterceptionModal
          aircraft={selectedAircraftForInterception}
          currentUser={currentUser}
          onClose={handleCloseInterceptionModal}
          onInterceptionSuccess={handleInterceptionSuccess}
          // NEW: Pass the missileInventoryRefreshTrigger to the InterceptionModal
          missileInventoryRefreshTrigger={missileInventoryRefreshTrigger}
        />
      )}
    </div>
  );
}

export default DetectedAircraftList;
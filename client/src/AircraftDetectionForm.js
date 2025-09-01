// client/src/AircraftDetectionForm.js

import React, { useState, useEffect } from 'react';
import './AircraftDetectionForm.css';

function AircraftDetectionForm({ radars, onAircraftDetected }) {
  const [aircraftIdentifier, setAircraftIdentifier] = useState('');
  const [latitude, setLatitude] = useState('');
  const [longitude, setLongitude] = useState('');
  const [altitudeFt, setAltitudeFt] = useState('');
  const [speedKts, setSpeedKts] = useState('');
  const [headingDeg, setHeadingDeg] = useState('');
  const [selectedRadarId, setSelectedRadarId] = useState('');
  const [message, setMessage] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (radars && radars.length > 0 && !selectedRadarId) {
      setSelectedRadarId(radars[0][0]);
    }
  }, [radars, selectedRadarId]);


  const handleSubmit = async (event) => {
    event.preventDefault();
    setMessage(null);
    setLoading(true);

    if (!aircraftIdentifier || !latitude || !longitude || !altitudeFt || !speedKts || !headingDeg || !selectedRadarId) {
      setMessage({ type: 'error', text: 'Please fill in all fields.' });
      setLoading(false);
      return;
    }

    const detectionData = {
      aircraft_identifier: aircraftIdentifier,
      latitude: parseFloat(latitude),
      longitude: parseFloat(longitude),
      altitude_ft: parseInt(altitudeFt),
      speed_kts: parseInt(speedKts),
      heading_deg: parseInt(headingDeg),
      radar_id: parseInt(selectedRadarId),
    };

    try {
      const response = await fetch('http://localhost:5000/api/aircraft/detect', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(detectionData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to detect aircraft');
      }

      const result = await response.json();
      setMessage({ type: 'success', text: `Aircraft ${result.aircraft_identifier} detected (ID: ${result.detection_id}). Initial Threat Level: ${result.initial_threat_level}` });
      
      setAircraftIdentifier('');
      setLatitude('');
      setLongitude('');
      setAltitudeFt('');
      setSpeedKts('');
      setHeadingDeg('');
      
      if (onAircraftDetected) {
        onAircraftDetected();
      }

    } catch (err) {
      setMessage({ type: 'error', text: err.message });
      console.error('Error detecting aircraft:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="aircraft-detection-form-container">
      <h3>Detect New Aircraft</h3>
      <form onSubmit={handleSubmit} className="aircraft-detection-form">
        {message && (
          <p className={`form-message ${message.type}`}>
            {message.text}
          </p>
        )}

        <div className="form-group">
          <label htmlFor="aircraftIdentifier">Aircraft Identifier:</label>
          <input
            type="text"
            id="aircraftIdentifier"
            value={aircraftIdentifier}
            onChange={(e) => setAircraftIdentifier(e.target.value)}
            required
            disabled={loading}
          />
        </div>

        <div className="form-row">
            <div className="form-group">
                <label htmlFor="latitude">Latitude:</label>
                <input
                    type="number"
                    id="latitude"
                    step="0.0001"
                    value={latitude}
                    onChange={(e) => setLatitude(e.target.value)}
                    required
                    disabled={loading}
                />
            </div>
            <div className="form-group">
                <label htmlFor="longitude">Longitude:</label>
                <input
                    type="number"
                    id="longitude"
                    step="0.0001"
                    value={longitude}
                    onChange={(e) => setLongitude(e.target.value)}
                    required
                    disabled={loading}
                />
            </div>
        </div>

        <div className="form-row">
            <div className="form-group">
                <label htmlFor="altitudeFt">Altitude (ft):</label>
                <input
                    type="number"
                    id="altitudeFt"
                    value={altitudeFt}
                    onChange={(e) => setAltitudeFt(e.target.value)}
                    required
                    disabled={loading}
                />
            </div>
            <div className="form-group">
                <label htmlFor="speedKts">Speed (kts):</label>
                <input
                    type="number"
                    id="speedKts"
                    value={speedKts}
                    onChange={(e) => setSpeedKts(e.target.value)}
                    required
                    disabled={loading}
                />
            </div>
            <div className="form-group">
                <label htmlFor="headingDeg">Heading (deg):</label>
                <input
                    type="number"
                    id="headingDeg"
                    min="0"
                    max="359"
                    value={headingDeg}
                    onChange={(e) => setHeadingDeg(e.target.value)}
                    required
                    disabled={loading}
                />
            </div>
        </div>

        <div className="form-group">
          <label htmlFor="radarStation">Detected by Radar:</label>
          <select
            id="radarStation"
            value={selectedRadarId}
            onChange={(e) => setSelectedRadarId(e.target.value)}
            required
            disabled={loading || !radars || radars.length === 0}
          >
            {radars && radars.length > 0 ? (
              radars.map((radar) => (
                <option key={radar[0]} value={radar[0]}>
                  {radar[1]} (ID: {radar[0]})
                </option>
              ))
            ) : (
              <option value="">No radars available</option>
            )}
          </select>
        </div>

        <button type="submit" disabled={loading}>
          {loading ? 'Detecting...' : 'Detect Aircraft'}
        </button>
      </form>
    </div>
  );
}

export default AircraftDetectionForm;
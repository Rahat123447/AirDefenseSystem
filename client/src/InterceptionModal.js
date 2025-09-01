// client/src/InterceptionModal.js

import React, { useState, useEffect } from 'react';
import './InterceptionModal.css';

// Added missileInventoryRefreshTrigger to props
const InterceptionModal = ({ aircraft, currentUser, onClose, onInterceptionSuccess, missileInventoryRefreshTrigger }) => {
  const [availableMissiles, setAvailableMissiles] = useState([]);
  const [selectedMissileId, setSelectedMissileId] = useState('');
  const [interceptionNotes, setInterceptionNotes] = useState('');
  const [message, setMessage] = useState(null);
  const [loading, setLoading] = useState(false);
  const [loadingMissiles, setLoadingMissiles] = useState(true);

  useEffect(() => {
    const fetchAvailableMissiles = async () => {
      setLoadingMissiles(true);
      try {
        const response = await fetch('http://localhost:5000/api/missiles/available');
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        setAvailableMissiles(data);
        if (data.length > 0 && !selectedMissileId) { // Only set default if nothing selected yet
          setSelectedMissileId(data[0].MISSILE_ID);
        } else if (data.length === 0) {
          setSelectedMissileId(''); // Clear selection if no missiles available
        }
      } catch (err) {
        setMessage({ type: 'error', text: `Failed to load missiles: ${err.message}` });
        console.error('Error fetching available missiles:', err);
      } finally {
        setLoadingMissiles(false);
      }
    };

    fetchAvailableMissiles();
  }, [missileInventoryRefreshTrigger]); // Re-run effect when missileInventoryRefreshTrigger changes

  const handleSubmit = async (event) => {
    event.preventDefault();
    setMessage(null);
    setLoading(true);

    if (!currentUser || !currentUser.id) {
      setMessage({ type: 'error', text: 'Operator ID not available. Please log in again.' });
      setLoading(false);
      return;
    }

    if (!selectedMissileId) {
      setMessage({ type: 'error', text: 'Please select an available missile.' });
      setLoading(false);
      return;
    }

    try {
      const response = await fetch('http://localhost:5000/api/interceptions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          threatId: aircraft.THREAT_ID,
          missileId: parseInt(selectedMissileId),
          operatorId: currentUser.id,
          interceptionNotes: interceptionNotes,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to initiate interception');
      }

      const result = await response.json();
      setMessage({ type: 'success', text: `Interception initiated successfully for ${aircraft.AIRCRAFT_IDENTIFIER}.` });
      
      if (onInterceptionSuccess) {
        onInterceptionSuccess();
      }
      setTimeout(onClose, 2000);

    } catch (err) {
      setMessage({ type: 'error', text: err.message });
      console.error('Error initiating interception:', err);
    } finally {
      setLoading(false);
    }
  };

  if (!aircraft) return null;

  return (
    <div className="modal-backdrop">
      <div className="modal-content interception-modal">
        <h3>Initiate Interception for {aircraft.AIRCRAFT_IDENTIFIER}</h3>
        {message && (
          <p className={`modal-message ${message.type}`}>
            {message.text}
          </p>
        )}
        <div className="aircraft-summary">
          <p><strong>Threat Level:</strong> <span className={`threat-badge ${aircraft.THREAT_LEVEL.toLowerCase().replace(' ', '-')}`}>{aircraft.THREAT_LEVEL}</span></p>
          <p><strong>Altitude:</strong> {aircraft.ALTITUDE_FT}ft</p>
          <p><strong>Speed:</strong> {aircraft.SPEED_KTS}kts</p>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="missile">Select Missile:</label>
            {loadingMissiles ? (
              <p>Loading missiles...</p>
            ) : availableMissiles.length === 0 ? (
              <p className="no-missiles-message">No available missiles for interception.</p>
            ) : (
              <select
                id="missile"
                value={selectedMissileId}
                onChange={(e) => setSelectedMissileId(e.target.value)}
                disabled={loading}
                required
              >
                {availableMissiles.map((missile) => (
                  <option key={missile.MISSILE_ID} value={missile.MISSILE_ID}>
                    {missile.MISSILE_TYPE} (SN: {missile.SERIAL_NUMBER})
                  </option>
                ))}
              </select>
            )}
          </div>
          
          <div className="form-group">
            <label htmlFor="notes">Interception Notes (Optional):</label>
            <textarea
              id="notes"
              value={interceptionNotes}
              onChange={(e) => setInterceptionNotes(e.target.value)}
              disabled={loading}
              rows="3"
            ></textarea>
          </div>

          <div className="modal-actions">
            <button type="submit" disabled={loading || availableMissiles.length === 0}>
              {loading ? 'Launching...' : 'Launch Missile'}
            </button>
            <button type="button" onClick={onClose} disabled={loading}>
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default InterceptionModal;
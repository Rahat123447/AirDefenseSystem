// client/src/ThreatLevelOverrideModal.js

import React, { useState } from 'react';
import './ThreatLevelOverrideModal.css';

const ThreatLevelOverrideModal = ({ aircraft, currentUser, onClose, onOverrideSuccess }) => {
  const [newThreatLevel, setNewThreatLevel] = useState(aircraft.THREAT_LEVEL);
  const [message, setMessage] = useState(null);
  const [loading, setLoading] = useState(false);

  const allowedThreatLevels = ['Unknown', 'Low', 'Moderate', 'High', 'Critical'];

  const handleSubmit = async (event) => {
    event.preventDefault();
    setMessage(null);
    setLoading(true);

    if (!currentUser || !currentUser.id) {
      setMessage({ type: 'error', text: 'Operator ID not available. Please log in again.' });
      setLoading(false);
      return;
    }

    try {
      const response = await fetch(`http://localhost:5000/api/threats/${aircraft.THREAT_ID}/override`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          newThreatLevel: newThreatLevel,
          operatorId: currentUser.id,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to override threat level');
      }

      const result = await response.json();
      setMessage({ type: 'success', text: `Threat level updated to ${result.newThreatLevel} for ${aircraft.AIRCRAFT_IDENTIFIER}.` });
      
      if (onOverrideSuccess) {
        onOverrideSuccess();
      }
      setTimeout(onClose, 2000);

    } catch (err) {
      setMessage({ type: 'error', text: err.message });
      console.error('Error overriding threat level:', err);
    } finally {
      setLoading(false);
    }
  };

  if (!aircraft) return null;

  return (
    <div className="modal-backdrop">
      <div className="modal-content">
        <h3>Override Threat Level for {aircraft.AIRCRAFT_IDENTIFIER}</h3>
        {message && (
          <p className={`modal-message ${message.type}`}>
            {message.text}
          </p>
        )}
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="threatLevel">New Threat Level:</label>
            <select
              id="threatLevel"
              value={newThreatLevel}
              onChange={(e) => setNewThreatLevel(e.target.value)}
              disabled={loading}
              required
            >
              {allowedThreatLevels.map((level) => (
                <option key={level} value={level}>{level}</option>
              ))}
            </select>
          </div>
          <div className="modal-actions">
            <button type="submit" disabled={loading}>
              {loading ? 'Updating...' : 'Update Threat'}
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

export default ThreatLevelOverrideModal;
// client/src/AddMissileForm.js

import React, { useState } from 'react';
import './AddMissileForm.css'; // We'll create this CSS file next

function AddMissileForm({ onMissileAdded }) {
  const [missileType, setMissileType] = useState('');
  const [message, setMessage] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setMessage(null);
    setLoading(true);

    if (!missileType) {
      setMessage({ type: 'error', text: 'Missile type cannot be empty.' });
      setLoading(false);
      return;
    }

    try {
      const response = await fetch('http://localhost:5000/api/missiles/add', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ missile_type: missileType }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to add missile');
      }

      setMessage({ type: 'success', text: data.message });
      setMissileType(''); // Clear input after success
      
      // Notify parent component that a missile was added
      if (onMissileAdded) {
        onMissileAdded();
      }

    } catch (err) {
      setMessage({ type: 'error', text: err.message });
      console.error('Error adding missile:', err);
    } finally {
      setLoading(false);
    }
    setTimeout(() => setMessage(null), 5000); // Clear message after 5 seconds
  };

  return (
    <div className="add-missile-form-container">
      <h3>Add New Missile to Inventory (Max 16)</h3>
      <form onSubmit={handleSubmit} className="add-missile-form">
        {message && (
          <p className={`form-message ${message.type}`}>
            {message.text}
          </p>
        )}

        <div className="form-group">
          <label htmlFor="missileType">Missile Type Name:</label>
          <input
            type="text"
            id="missileType"
            value={missileType}
            onChange={(e) => setMissileType(e.target.value)}
            required
            disabled={loading}
            placeholder="e.g., S-400, Patriot, Stinger"
          />
        </div>

        <button type="submit" disabled={loading}>
          {loading ? 'Adding...' : 'Add Missile'}
        </button>
      </form>
    </div>
  );
}

export default AddMissileForm;
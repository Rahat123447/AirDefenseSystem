// client/src/pages/AutomatedAlertsPage.js

import React, { useState } from 'react';
import AutomatedAlertsList from '../AutomatedAlertsList'; // Import the component

function AutomatedAlertsPage({ currentUser, refreshTrigger, onAutomatedAlertGenerated }) {
  const [generateAlertMessage, setGenerateAlertMessage] = useState(null);
  const [generatingAlert, setGeneratingAlert] = useState(false);

  // Handler for generating an automated alert (moved from App.js)
  const handleGenerateAutomatedAlert = async () => {
    setGenerateAlertMessage(null);
    setGeneratingAlert(true);
    try {
      const response = await fetch('http://localhost:5000/api/alerts/generate-unintercepted-threat-alert', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || data.message || 'Failed to generate alert');
      }

      setGenerateAlertMessage({ type: 'success', text: data.message });
      if (onAutomatedAlertGenerated) { // Notify parent (App.js) to refresh alerts list
        onAutomatedAlertGenerated();
      }

    } catch (err) {
      setGenerateAlertMessage({ type: 'error', text: err.message });
      console.error('Error generating automated alert:', err);
    } finally {
      setGeneratingAlert(false);
    }
    setTimeout(() => setGenerateAlertMessage(null), 5000);
  };

  if (!currentUser) {
    return <p>Please log in to view this page.</p>;
  }

  return (
    <div className="page-container">
      <h2>Automated System Alerts</h2>
      
      {/* Generate Alert Button for Admins */}
      {currentUser.role === 'Administrator' && (
        <div className="generate-alert-section">
            {generateAlertMessage && (
                <p className={`form-message ${generateAlertMessage.type}`}>
                    {generateAlertMessage.text}
                </p>
            )}
            <button
                onClick={handleGenerateAutomatedAlert}
                disabled={generatingAlert}
                className="generate-alert-button"
            >
                {generatingAlert ? 'Generating...' : 'Generate Unintercepted Threat Alert'}
            </button>
        </div>
      )}

      <AutomatedAlertsList refreshTrigger={refreshTrigger} currentUser={currentUser} />
    </div>
  );
}

export default AutomatedAlertsPage;
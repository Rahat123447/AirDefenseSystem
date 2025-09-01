// client/src/pages/AircraftManagementPage.js

import React from 'react';
import AircraftDetectionForm from '../AircraftDetectionForm'; // Import the component
import DetectedAircraftList from '../DetectedAircraftList'; // Import the component

function AircraftManagementPage({ currentUser, radars, aircraftListRefreshTrigger, onAircraftDetected, onAircraftUpdated, missileInventoryRefreshTrigger }) {
  if (!currentUser) {
    return <p>Please log in to view this page.</p>;
  }

  return (
    <div className="page-container">
      <h2>Aircraft Detection & Threat Management</h2>
      <AircraftDetectionForm radars={radars} onAircraftDetected={onAircraftDetected} />
      <DetectedAircraftList
        refreshTrigger={aircraftListRefreshTrigger}
        currentUser={currentUser}
        onAircraftUpdated={onAircraftUpdated}
        missileInventoryRefreshTrigger={missileInventoryRefreshTrigger}
      />
    </div>
  );
}

export default AircraftManagementPage;
// client/src/pages/RegionSurveillancePage.js

import React from 'react';
import RegionSurveillanceSummary from '../RegionSurveillanceSummary'; // Import the component

function RegionSurveillancePage({ currentUser, refreshTrigger }) {
  if (!currentUser) {
    return <p>Please log in to view this page.</p>;
  }

  return (
    <div className="page-container">
      <h2>Region Surveillance Overview</h2>
      <RegionSurveillanceSummary refreshTrigger={refreshTrigger} />
    </div>
  );
}

export default RegionSurveillancePage;
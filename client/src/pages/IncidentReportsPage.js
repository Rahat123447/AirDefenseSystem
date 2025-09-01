// client/src/pages/IncidentReportsPage.js

import React from 'react';
import IncidentReportsList from '../IncidentReportsList'; // Import the component

function IncidentReportsPage({ currentUser, refreshTrigger }) {
  if (!currentUser) {
    return <p>Please log in to view this page.</p>;
  }

  return (
    <div className="page-container">
      <h2>All Incident Reports</h2>
      <IncidentReportsList refreshTrigger={refreshTrigger} currentUser={currentUser} />
    </div>
  );
}

export default IncidentReportsPage;
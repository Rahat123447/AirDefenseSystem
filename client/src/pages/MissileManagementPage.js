// client/src/pages/MissileManagementPage.js

import React from 'react';
import AddMissileForm from '../AddMissileForm'; // Import the component

function MissileManagementPage({ currentUser, onMissileAdded }) {
  if (!currentUser) {
    return <p>Please log in to view this page.</p>;
  }

  if (currentUser.role !== 'Administrator') {
    return <p>Access Denied: Only Administrators can manage missiles.</p>;
  }

  return (
    <div className="page-container">
      <h2>Missile Inventory Management</h2>
      <AddMissileForm onMissileAdded={onMissileAdded} />
      {/* We can add a list of all missiles here later if needed, e.g., <MissileList refreshTrigger={missileAddedTrigger} /> */}
    </div>
  );
}

export default MissileManagementPage;
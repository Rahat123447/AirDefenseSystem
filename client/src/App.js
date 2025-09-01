// client/src/App.js

import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'; // NEW: React Router imports
import './App.css'; // Main App CSS

// Core Components (no longer rendered directly in App.js main)
import Login from './Login';
import Navbar from './Navbar'; // NEW: Import Navbar
import HomeDashboard from './HomeDashboard'; // NEW: Import HomeDashboard

// Page Components (NEW: from client/src/pages)
import RegionSurveillancePage from './pages/RegionSurveillancePage';
import AircraftManagementPage from './pages/AircraftManagementPage';
import IncidentReportsPage from './pages/IncidentReportsPage';
import AutomatedAlertsPage from './pages/AutomatedAlertsPage';
import MissileManagementPage from './pages/MissileManagementPage';


function App() {
  const [currentUser, setCurrentUser] = useState(null);
  const [radars, setRadars] = useState([]);
  const [loadingRadars, setLoadingRadars] = useState(true);
  const [errorRadars, setErrorRadars] = useState(null);
  
  // Refresh triggers for child components
  const [aircraftListRefreshTrigger, setAircraftListRefreshTrigger] = useState(0);
  const [incidentReportsRefreshTrigger, setIncidentReportsRefreshTrigger] = useState(0);
  const [automatedAlertsRefreshTrigger, setAutomatedAlertsRefreshTrigger] = useState(0);
  const [missileInventoryRefreshTrigger, setMissileInventoryRefreshTrigger] = useState(0);
  const [surveillanceSummaryRefreshTrigger, setSurveillanceSummaryRefreshTrigger] = useState(0);

  // Effect 1: Check for stored user on initial load
  useEffect(() => {
    const storedUser = localStorage.getItem('currentUser');
    if (storedUser) {
      setCurrentUser(JSON.parse(storedUser));
    }
  }, []);

  // Effect 2: Fetch radars only if a user is logged in (needed for AircraftDetectionForm)
  useEffect(() => {
    const fetchRadars = async () => {
      if (!currentUser) {
        setLoadingRadars(false);
        return;
      }
      try {
        const response = await fetch('http://localhost:5000/api/radars');
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        setRadars(data);
      } catch (err) {
        setErrorRadars(err.message);
        console.error("Error fetching radar stations:", err);
      } finally {
        setLoadingRadars(false);
      }
    };

    fetchRadars();
  }, [currentUser]);

  const handleLoginSuccess = (operatorData) => {
    setCurrentUser(operatorData);
    localStorage.setItem('currentUser', JSON.stringify(operatorData));
    // Trigger refreshes for all data-dependent components on login
    setLoadingRadars(true);
    setAircraftListRefreshTrigger(prev => prev + 1);
    setIncidentReportsRefreshTrigger(prev => prev + 1);
    setAutomatedAlertsRefreshTrigger(prev => prev + 1);
    setMissileInventoryRefreshTrigger(prev => prev + 1);
    setSurveillanceSummaryRefreshTrigger(prev => prev + 1);
  };

  const handleLogout = () => {
    setCurrentUser(null);
    localStorage.removeItem('currentUser');
    // Reset all data/triggers on logout for a clean state
    setRadars([]);
    setAircraftListRefreshTrigger(0);
    setIncidentReportsRefreshTrigger(0);
    setAutomatedAlertsRefreshTrigger(0);
    setMissileInventoryRefreshTrigger(0);
    setSurveillanceSummaryRefreshTrigger(0);
  };

  // Generic handler for events that should refresh multiple lists
  const handleDataUpdated = () => {
    setAircraftListRefreshTrigger(prev => prev + 1);
    setIncidentReportsRefreshTrigger(prev => prev + 1);
    setAutomatedAlertsRefreshTrigger(prev => prev + 1);
    setMissileInventoryRefreshTrigger(prev => prev + 1); // e.g., interception updates missile status
    setSurveillanceSummaryRefreshTrigger(prev => prev + 1); // e.g., new aircraft affects summary
  };

  return (
    <Router>
      <div className="App">
        {currentUser && <Navbar currentUser={currentUser} onLogout={handleLogout} />} {/* Render Navbar if logged in */}

        <main className="app-main-content">
          <Routes>
            {/* Redirect to /dashboard if logged in and trying to access root or login */}
            <Route path="/" element={currentUser ? <Navigate to="/dashboard" /> : <Login onLoginSuccess={handleLoginSuccess} />} />
            <Route path="/login" element={currentUser ? <Navigate to="/dashboard" /> : <Login onLoginSuccess={handleLoginSuccess} />} />

            {/* Protected Routes (only accessible if currentUser is set) */}
            <Route path="/dashboard" element={currentUser ? <HomeDashboard currentUser={currentUser} /> : <Navigate to="/login" />} />
            
            <Route path="/summary" element={currentUser ? <RegionSurveillancePage currentUser={currentUser} refreshTrigger={surveillanceSummaryRefreshTrigger} /> : <Navigate to="/login" />} />
            
            <Route path="/aircraft" element={currentUser ? 
                <AircraftManagementPage
                    currentUser={currentUser}
                    radars={radars}
                    aircraftListRefreshTrigger={aircraftListRefreshTrigger}
                    onAircraftDetected={handleDataUpdated}
                    onAircraftUpdated={handleDataUpdated}
                    missileInventoryRefreshTrigger={missileInventoryRefreshTrigger}
                /> : <Navigate to="/login" />} 
            />

            <Route path="/incidents" element={currentUser ? <IncidentReportsPage currentUser={currentUser} refreshTrigger={incidentReportsRefreshTrigger} /> : <Navigate to="/login" />} />
            
            <Route path="/alerts" element={currentUser ? 
                <AutomatedAlertsPage 
                    currentUser={currentUser} 
                    refreshTrigger={automatedAlertsRefreshTrigger}
                    onAutomatedAlertGenerated={handleDataUpdated} // Alert generation also updates all related lists
                /> : <Navigate to="/login" />} 
            />

            <Route path="/missiles" element={currentUser ? 
                <MissileManagementPage 
                    currentUser={currentUser} 
                    onMissileAdded={handleDataUpdated} 
                /> : <Navigate to="/login" />} 
            />

            {/* Catch-all for unknown routes (e.g., redirect to dashboard or login) */}
            <Route path="*" element={currentUser ? <Navigate to="/dashboard" /> : <Navigate to="/login" />} />

          </Routes>
        </main>
      </div>
    </Router>
  );
}

export default App;
import React from 'react';
import { 
  BrowserRouter as Router, 
  Routes, 
  Route 
} from 'react-router-dom';
import Login from './components/Login';
import EmergencyForm from './components/EmergencyForm';
import AdminDashboard from './components/AdminDashboard';

function App() {
  return (
    <Router 
      future={{ 
        v7_relativeSplatPath: true,
        v7_startTransition: true
      }}
    >
      <div className="min-h-screen bg-gray-100">
        <Routes>
          <Route path="/admin/login" element={<Login />} />
          <Route path="/admin/dashboard" element={<AdminDashboard />} />
          <Route path="/" element={<EmergencyForm />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;

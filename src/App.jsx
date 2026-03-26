import React, { useEffect } from 'react'; // 1. إضافة useEffect هنا
import { 
  BrowserRouter as Router, 
  Routes, 
  Route 
} from 'react-router-dom';
import Login from './components/Login';
import EmergencyForm from './components/EmergencyForm';
import AdminDashboard from './components/AdminDashboard';

function App() {

  // 2. وضع useEffect داخل المكون
  useEffect(() => {
    let deferredPrompt;

    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      deferredPrompt = e;
      // هنا يمكنك إظهار زر "تثبيت" مخصص عند الحاجة
      console.log("PWA is installable");
      
      // مثال: يمكنك حفظ المتغير في state لإظهار زر لاحقاً
      // setInstallPrompt(e); 
    });
  }, []);

  return (
    <Router 
      future={{ 
        v7_relativeSplatPath: true,
        v7_startTransition: true
      }}
    >
      {/* ملاحظة: مكوناتك داخلية تتحكم بالخلفية، لكن هذا جيد كحاوية عامة */}
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
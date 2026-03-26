import React, { useEffect, useState } from 'react';
import { 
  BrowserRouter as Router, 
  Routes, 
  Route 
} from 'react-router-dom';
import Login from './components/Login';
import EmergencyForm from './components/EmergencyForm';
import AdminDashboard from './components/AdminDashboard';
import { Share2, X, Download } from 'lucide-react'; // استيراد أيقونات جديدة

function App() {
  // State لإدارة نافذة التثبيت
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [showInstallModal, setShowInstallModal] = useState(false);

  useEffect(() => {
    // التحقق مما إذا كان المستخدم قد رفض التثبيت سابقاً (لتجنب الإزعاج)
    const dismissed = localStorage.getItem('pwa-install-dismissed');
    
    const handler = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      // إظهار النافذة إذا لم يكن قد رفضها
      if (!dismissed) {
        setTimeout(() => setShowInstallModal(true), 2000); // تظهر بعد ثانيتين
      }
    };

    window.addEventListener('beforeinstallprompt', handler);

    // التحقق إذا كان التطبيق مثبتاً بالفعل (لإخفاء النافذة)
    window.addEventListener('appinstalled', () => {
      setShowInstallModal(false);
      setDeferredPrompt(null);
    });

    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  // دالة التثبيت
  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setShowInstallModal(false);
    }
    setDeferredPrompt(null);
  };

  // دالة إغلاق النافذة وتذكر اختيار المستخدم
  const handleCloseModal = () => {
    setShowInstallModal(false);
    // خيار: حفظ أن المستخدم أغلق النافذة لعدم إظهارها مجدداً لفترة
    localStorage.setItem('pwa-install-dismissed', 'true');
  };

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

      {/* --- نافذة التثبيت المنبثقة (Popup) --- */}
      {showInstallModal && (
        <div className="fixed inset-0 bg-black/80 z-[9999] flex items-end sm:items-center justify-center p-4 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-[#121212] border border-slate-800 rounded-t-3xl sm:rounded-2xl w-full max-w-sm shadow-2xl relative overflow-hidden transform transition-transform duration-300 translate-y-0">
            
            {/* زر الإغلاق */}
            <button 
              onClick={handleCloseModal} 
              className="absolute top-4 left-4 text-slate-500 hover:text-white p-1.5 bg-slate-900 rounded-full z-10"
            >
              <X className="w-4 h-4"/>
            </button>

            <div className="p-8 pt-12 text-center">
              {/* الأيقونة */}
              <div className="w-20 h-20 mx-auto mb-6 relative">
                <div className="absolute inset-0 bg-red-600 rounded-2xl blur-xl opacity-40"></div>
                <div className="relative w-full h-full bg-gradient-to-br from-red-600 to-rose-500 rounded-2xl flex items-center justify-center shadow-lg">
                    <span className="text-3xl font-black text-white">650</span>
                </div>
              </div>

              <h2 className="text-xl font-black text-white mb-2">ثبّت التطبيق</h2>
              <p className="text-slate-400 text-sm mb-6 leading-relaxed">
                أضف هذا التطبيق إلى شاشتك الرئيسية للوصول السريع وتجربة أفضل بدون متصفح.
              </p>

              {/* الأزرار */}
              <div className="flex flex-col gap-3">
                <button
                  onClick={handleInstallClick}
                  className="w-full py-3.5 rounded-xl bg-gradient-to-r from-red-600 to-rose-500 text-white font-bold text-sm uppercase tracking-wider flex items-center justify-center gap-2 hover:shadow-red-500/30 transition-all"
                >
                  <Download className="w-4 h-4"/>
                  تثبيت الآن
                </button>
                
                <button
                  onClick={handleCloseModal}
                  className="text-slate-500 hover:text-slate-300 text-xs font-medium py-2"
                >
                  ليس الآن
                </button>
              </div>

              {/* نصيحة للمستخدم (موضحة في الصورة أيضاً) */}
              <div className="mt-6 pt-4 border-t border-slate-800/50 flex items-center justify-center gap-2 text-[10px] text-slate-600">
                <Share2 className="w-3 h-3"/>
                <span>أو اضغط "مشاركة" ثم "إضافة إلى الشاشة الرئيسية"</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </Router>
  );
}

export default App;
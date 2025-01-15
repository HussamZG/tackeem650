import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import CryptoJS from 'crypto-js'; // استيراد مكتبة التشفير

function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const navigate = useNavigate();

  // مفتاح التشفير (يجب تخزينه بشكل آمن)
  const SECRET_KEY = import.meta.env.VITE_ENCRYPTION_KEY || 'default-secret-key-650';

  // دالة تشفير كلمة المرور
  const encryptPassword = (password) => {
    return CryptoJS.AES.encrypt(password, SECRET_KEY).toString();
  };

  // دالة فك تشفير كلمة المرور
  const decryptPassword = (encryptedPassword) => {
    const bytes = CryptoJS.AES.decrypt(encryptedPassword, SECRET_KEY);
    return bytes.toString(CryptoJS.enc.Utf8);
  };

  const handleLogin = (e) => {
    e.preventDefault();
    
    // التحقق من عدم وجود حقول فارغة
    if (!username || !password) {
      toast.error('يرجى إدخال اسم المستخدم وكلمة المرور', {
        position: "top-right",
        autoClose: 3000,
        hideProgressBar: false,
        closeOnClick: true,
        pauseOnHover: true,
        draggable: true,
      });
      return;
    }

    // المعلومات الصحيحة للدخول مع تشفير كلمات المرور
    const validCredentials = [
      { 
        username: 'shtayer', 
        password: encryptPassword('Shtayer650') 
      },
      { 
        username: 'مسؤول', 
        password: encryptPassword('12345') 
      }
    ];

    // التحقق من صحة بيانات الاعتماد
    const isValidUser = validCredentials.some(
      cred => cred.username === username && 
              decryptPassword(cred.password) === password
    );

    if (isValidUser) {
      // إنشاء رمز مميز مشفر
      const token = CryptoJS.AES.encrypt(
        `${username}:${new Date().getTime()}`, 
        SECRET_KEY
      ).toString();

      // تخزين المعلومات بشكل آمن
      localStorage.setItem('token', token);
      localStorage.setItem('username', username);

      // عرض رسالة نجاح
      toast.success('تم تسجيل الدخول بنجاح', {
        position: "top-right",
        autoClose: 2000,
        onClose: () => navigate('/admin/dashboard', { replace: true })
      });
    } else {
      // عرض رسالة خطأ
      toast.error('اسم المستخدم أو كلمة المرور غير صحيحة', {
        position: "top-right",
        autoClose: 3000,
      });
    }
  };

  const handleGoBack = () => {
    navigate('/', { replace: true });
  };

  return (
    <div dir="rtl" className="min-h-screen bg-gray-900 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <ToastContainer 
        rtl={true}
        theme="dark"
        style={{ 
          fontFamily: 'inherit', 
          fontSize: '16px',
          textAlign: 'right'
        }}
      />
      <div className="max-w-md w-full bg-gray-800 shadow-2xl rounded-2xl overflow-hidden border border-gray-700">
        <div className="bg-blue-800 text-white py-6 px-8 text-center flex justify-between items-center border-b border-gray-700">
          <button 
            onClick={handleGoBack}
            className="text-gray-300 hover:text-white p-2 rounded-full transition-colors"
            title="العودة للخلف"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <div>
            <h2 className="text-3xl font-extrabold text-blue-300">لوحة التحكم الإدارية</h2>
            <p className="mt-2 text-blue-400 text-sm">نظام إدارة الحالات الإسعافية</p>
          </div>
        </div>
        
        <form onSubmit={handleLogin} className="p-8 space-y-6">
          <div>
            <label htmlFor="username" className="block text-right text-blue-300 font-bold mb-2">
              اسم المستخدم
            </label>
            <div className="relative">
              <input
                id="username"
                name="username"
                type="text"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full px-4 py-3 pl-10 text-right border border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600 transition-colors bg-gray-700 text-gray-100"
                placeholder="أدخل اسم المستخدم"
              />
              <svg 
                xmlns="http://www.w3.org/2000/svg" 
                className="h-5 w-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-blue-400" 
                viewBox="0 0 20 20" 
                fill="currentColor"
              >
                <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
              </svg>
            </div>
          </div>
          
          <div>
            <label htmlFor="password" className="block text-right text-blue-300 font-bold mb-2">
              كلمة المرور
            </label>
            <div className="relative">
              <input
                id="password"
                name="password"
                type={showPassword ? "text" : "password"}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 pl-10 text-right border border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600 transition-colors bg-gray-700 text-gray-100"
                placeholder="أدخل كلمة المرور"
              />
              <svg 
                xmlns="http://www.w3.org/2000/svg" 
                className="h-5 w-5 absolute left-10 top-1/2 transform -translate-y-1/2 text-blue-400" 
                viewBox="0 0 20 20" 
                fill="currentColor"
              >
                <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
              </svg>
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute left-3 top-1/2 transform -translate-y-1/2"
              >
                {showPassword ? (
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-blue-400" viewBox="0 0 20 20" fill="currentColor">
                    <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
                    <path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd" />
                  </svg>
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-blue-400" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M3.707 2.293a1 1 0 00-1.414 1.414l14 14a1 1 0 001.414-1.414l-1.473-1.473A10.014 10.014 0 0019.542 10C18.268 5.943 14.478 3 10 3a9.958 9.958 0 00-4.512 1.074l-1.781-1.781zm4.261 4.262l1.514 1.514a2.003 2.003 0 012.45 2.45l1.514 1.514a4 4 0 00-5.478-5.478z" clipRule="evenodd" />
                    <path d="M12.454 16.697L9.75 13.992a4 4 0 01-3.742-3.742L2.335 6.578A9.98 9.98 0 00.458 10c1.274 4.057 5.064 7 9.542 7 .847 0 1.67-.105 2.454-.303z" />
                  </svg>
                )}
              </button>
            </div>
          </div>
          
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <input
                id="remember-me"
                name="remember-me"
                type="checkbox"
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-700 rounded bg-gray-700"
              />
              <label htmlFor="remember-me" className="block text-blue-300">
                تذكرني
              </label>
            </div>
            
            <div className="text-sm">
              <a href="#" className="font-medium text-blue-400 hover:text-blue-300">
                نسيت كلمة المرور؟
              </a>
            </div>
          </div>
          
          <div>
            <button
              type="submit"
              className="w-full flex justify-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-lg font-medium text-white bg-blue-700 hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
            >
              تسجيل الدخول
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default Login;

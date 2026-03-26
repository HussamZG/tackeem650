import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import CryptoJS from 'crypto-js';
// استيراد الأيقونات
import { 
  User, Lock, Eye, EyeOff, LogIn, ArrowRight, 
  ShieldCheck, Heart, Activity 
} from 'lucide-react';

function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false); // إضافة حالة التحميل
  const navigate = useNavigate();

  const SECRET_KEY = import.meta.env.VITE_ENCRYPTION_KEY || 'default-secret-key-650';

  const encryptPassword = (password) => CryptoJS.AES.encrypt(password, SECRET_KEY).toString();
  const decryptPassword = (encryptedPassword) => {
    const bytes = CryptoJS.AES.decrypt(encryptedPassword, SECRET_KEY);
    return bytes.toString(CryptoJS.enc.Utf8);
  };

  const handleLogin = (e) => {
    e.preventDefault();
    
    if (!username || !password) {
      toast.error('يرجى إدخال اسم المستخدم وكلمة المرور');
      return;
    }

    setIsLoading(true);

    // محاكاة تأخير بسيط لتجربة مستخدم أفضل (يمكن إزالته)
    setTimeout(() => {
      const validCredentials = [
        { username: 'shtayer', password: encryptPassword('Shtayer650') },
        { username: 'مسؤول', password: encryptPassword('12345') }
      ];

      const isValidUser = validCredentials.some(
        cred => cred.username === username && decryptPassword(cred.password) === password
      );

      if (isValidUser) {
        const token = CryptoJS.AES.encrypt(`${username}:${new Date().getTime()}`, SECRET_KEY).toString();
        localStorage.setItem('token', token);
        localStorage.setItem('username', username);

        toast.success('تم تسجيل الدخول بنجاح ✅', {
          onClose: () => navigate('/admin/dashboard', { replace: true })
        });
      } else {
        toast.error('اسم المستخدم أو كلمة المرور غير صحيحة ❌');
      }
      setIsLoading(false);
    }, 500);
  };

  const handleGoBack = () => navigate('/', { replace: true });

  // كلاسات موحدة للتصميم
  const inputClass = "w-full bg-[#0a0a0a] border border-slate-800 rounded-2xl px-5 py-4 text-white focus:border-red-600 focus:ring-1 focus:ring-red-600/20 transition-all outline-none text-sm placeholder:text-slate-700 h-[58px]";
  const labelClass = "text-[11px] font-bold text-slate-500 uppercase tracking-widest mr-1 mb-2 block";

  return (
    <div dir="rtl" className="min-h-screen bg-[#050505] text-slate-300 font-sans flex flex-col items-center justify-center overflow-x-hidden">
      <ToastContainer theme="dark" rtl position="top-center" autoClose={2000} />

      <div className="w-full max-w-md px-4 flex flex-col items-center">
        
        {/* زر العودة */}
        <div className="w-full flex justify-start mb-4">
          <button 
            onClick={handleGoBack}
            className="flex items-center gap-2 text-slate-500 hover:text-red-500 transition-colors text-xs font-bold uppercase tracking-widest group"
          >
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            العودة للرئيسية
          </button>
        </div>

        {/* صندوق تسجيل الدخول */}
        <div className="w-full bg-[#0d0d0d] border border-slate-800 rounded-[2rem] sm:rounded-[3rem] shadow-2xl overflow-hidden">
          
          {/* الرأس */}
          <div className="px-6 py-8 sm:px-10 bg-[#121212] border-b border-slate-800 flex flex-col items-center text-center relative">
            <div className="absolute top-4 right-4 opacity-10">
              <ShieldCheck className="w-20 h-20 text-red-600" />
            </div>
            <div className="relative z-10 flex items-center gap-3 mb-2">
              <Activity className="w-6 h-6 text-red-600 animate-pulse" />
              <h1 className="text-xl sm:text-2xl font-black text-white tracking-tighter uppercase">
                نظام الدخول <span className="text-red-600">650</span>
              </h1>
            </div>
            <p className="text-slate-500 text-xs uppercase tracking-widest">
              لوحة التحكم الإدارية
            </p>
          </div>

          {/* الفورم */}
          <form onSubmit={handleLogin} className="p-6 sm:p-10 space-y-8">
            
            {/* حقل اسم المستخدم */}
            <div>
              <label className={labelClass}><User className="inline w-3.5 h-3.5 ml-1" /> اسم المستخدم</label>
              <div className="relative">
                <input
                  name="username"
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className={inputClass}
                  placeholder="أدخل اسم المستخدم"
                />
                <div className="absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none">
                  <User className="w-5 h-5 text-slate-700" />
                </div>
              </div>
            </div>

            {/* حقل كلمة المرور */}
            <div>
              <label className={labelClass}><Lock className="inline w-3.5 h-3.5 ml-1" /> كلمة المرور</label>
              <div className="relative">
                <input
                  name="password"
                  type={showPassword ? "text" : "password"}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className={`${inputClass} pl-12`} // مساحة إضافية للأيقونات
                  placeholder="أدخل كلمة المرور"
                />
                <div className="absolute left-4 top-1/2 -translate-y-1/2 flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="text-slate-600 hover:text-red-500 transition-colors"
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                  <div className="w-px h-5 bg-slate-800"></div> {/* فاصل */}
                  <Lock className="w-5 h-5 text-slate-700 pointer-events-none" />
                </div>
              </div>
            </div>

            {/* خيارات إضافية */}
            <div className="flex items-center justify-between text-[10px]">
              <label className="flex items-center gap-2 text-slate-500 cursor-pointer group">
                <input type="checkbox" className="accent-red-600 w-3.5 h-3.5 bg-slate-900 border-slate-700 rounded" />
                <span className="group-hover:text-slate-300 transition-colors">تذكرني</span>
              </label>
              <a href="#" className="text-red-500 hover:text-red-400 transition-colors font-bold">
                نسيت كلمة المرور؟
              </a>
            </div>

            {/* زر الدخول */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-4 sm:py-5 rounded-2xl bg-gradient-to-r from-red-700 to-rose-600 text-white font-black text-sm uppercase tracking-[0.4em] shadow-xl hover:shadow-red-600/30 active:scale-[0.99] transition-all disabled:opacity-50 flex items-center justify-center gap-3"
            >
              {isLoading ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              ) : (
                <>
                  <LogIn className="w-5 h-5" />
                  <span>تسجيل الدخول</span>
                </>
              )}
            </button>

          </form>
        </div>
      </div>

      

      <style>{`
        .animate-pulse-custom { animation: pulse-neon 3.5s ease-in-out infinite; }
        @keyframes pulse-neon { 
          0%, 100% { opacity: 1; filter: drop-shadow(0 0 5px rgba(220,38,38,0.3)); transform: scale(1); } 
          50% { opacity: 0.5; filter: drop-shadow(0 0 25px rgba(220,38,38,0.8)); transform: scale(0.97); } 
        }
      `}</style>
    </div>
  );
}

export default Login;
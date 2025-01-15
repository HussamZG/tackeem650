import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import DatePicker, { registerLocale } from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import ar from 'date-fns/locale/ar-SA';
import { supabase } from '../supabaseClient';
import { v4 as uuidv4 } from 'uuid';

registerLocale('ar', ar);

function EmergencyForm() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    rescuerName: '',
    rescuerRank: '',
    trainer: '',
    date: null,
    caseCode: '',
    caseDetails: ''
  });

  const rescuerRanks = ['قائد', 'كشاف', 'مسعف'];
  
  const trainers = [
    'رقية العبدلله', 
    'ريهام الريشاني', 
    'جوهر ابو فخر', 
    'اية المحيثاوي', 
    'غسان صالحة', 
    'عدي النداف', 
    'رهف العمر', 
    'غنوة مرشد', 
    'غيث ابو الفضل', 
    'وسام شلغين', 
    'ابي عصمان', 
    'سليمان سعيد', 
    'يمامة ابو عمار', 
    'عبير ابو راس', 
    'هادي عواد', 
    'رامي السمان'
  ];

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prevState => ({
      ...prevState,
      [name]: value
    }));
  };

  const handleDateChange = (date) => {
    setFormData(prevState => ({
      ...prevState,
      date: date
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // التحقق من إدخال جميع الحقول
    const isFormValid = Object.entries(formData).every(([key, value]) => {
      if (key === 'date') return value !== null;
      return value.trim() !== '';
    });
    
    if (!isFormValid) {
      toast.error('يرجى ملء جميع الحقول', {
        position: "top-right",
        autoClose: 3000
      });
      return;
    }

    try {
      // إعداد بيانات الحالة للإرسال
      const caseData = {
        case_unique_id: uuidv4(), // إضافة معرف فريد
        rescuer_name: formData.rescuerName,
        rescuer_rank: formData.rescuerRank,
        trainer: formData.trainer,
        date: formData.date ? formData.date.toISOString().split('T')[0] : null,
        case_code: formData.caseCode,  
        case_details: formData.caseDetails,  
        created_at: new Date().toISOString()
      };

      // طباعة البيانات للتشخيص
      console.log('بيانات الحالة للإرسال:', caseData);

      // إرسال البيانات إلى Supabase
      const { data, error } = await supabase
        .from('emergencyCases')
        .insert(caseData)
        .select();

      // طباعة نتيجة الإرسال
      console.log('نتيجة الإرسال:', { data, error });

      if (error) {
        console.error('خطأ في إضافة الحالة:', error);
        toast.error(`فشل حفظ الحالة: ${error.message}`, {
          position: "top-right",
          autoClose: 3000
        });
        return;
      }

      // رسالة نجاح
      toast.success('تم حفظ الحالة بنجاح', {
        position: "top-right",
        autoClose: 2000
      });

      // إعادة تعيير النموذج
      setFormData({
        rescuerName: '',
        rescuerRank: '',
        trainer: '',
        date: null,
        caseCode: '',
        caseDetails: ''
      });

    } catch (err) {
      console.error('خطأ غير متوقع:', err);
      toast.error('حدث خطأ أثناء حفظ الحالة', {
        position: "top-right",
        autoClose: 3000
      });
    }
  };

  return (
    <div dir="rtl" className="min-h-screen bg-gray-900 py-12 px-4 sm:px-6 lg:px-8 flex items-center justify-center">
      <ToastContainer 
        rtl={true}
        theme="dark"
        style={{ 
          fontFamily: 'inherit', 
          fontSize: '16px',
          textAlign: 'right'
        }}
      />
      
      <div className="max-w-2xl w-full bg-gray-800 shadow-2xl rounded-2xl overflow-hidden border border-gray-700">
        <div className="bg-blue-800 text-white py-6 px-8 border-b border-gray-700">
          <div className="flex justify-between items-center">
            <button 
              onClick={() => navigate('/admin/login')}
              className="text-gray-300 hover:text-white p-2 rounded-full transition-colors"
              title="العودة لتسجيل الدخول"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
              </svg>
            </button>
            <h2 className="text-3xl font-bold text-right text-blue-300">نموذج حالة طارئة</h2>
          </div>
        </div>
        
        <form onSubmit={handleSubmit} className="p-8 space-y-6">
          <div className="grid grid-cols-2 gap-6">
            <div>
              <label className="block text-right mb-2 text-blue-300">اسم المسعف</label>
              <input
                type="text"
                name="rescuerName"
                value={formData.rescuerName}
                onChange={handleChange}
                className="w-full px-4 py-3 border border-gray-700 rounded-lg text-right bg-gray-700 text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-600"
                placeholder="أدخل اسم المسعف"
              />
            </div>
            
            <div>
              <label className="block text-right mb-2 text-blue-300">رتبة المسعف</label>
              <select
                name="rescuerRank"
                value={formData.rescuerRank}
                onChange={handleChange}
                className="w-full px-4 py-3 border border-gray-700 rounded-lg text-right bg-gray-700 text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-600"
              >
                <option value="">اختر الرتبة</option>
                {rescuerRanks.map((rank, index) => (
                  <option key={index} value={rank}>{rank}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-right mb-2 text-blue-300">اسم المدرب</label>
            <select
              name="trainer"
              value={formData.trainer}
              onChange={handleChange}
              className="w-full px-4 py-3 border border-gray-700 rounded-lg text-right bg-gray-700 text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-600"
            >
              <option value="">اختر المدرب</option>
              {trainers.map((trainer, index) => (
                <option key={index} value={trainer}>{trainer}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-right mb-2 text-blue-300">التاريخ</label>
            <div className="relative">
              <DatePicker
                selected={formData.date}
                onChange={handleDateChange}
                locale="ar"
                dateFormat="yyyy-MM-dd"
                placeholderText="اختر التاريخ"
                className="w-full px-4 py-3 border border-gray-700 rounded-lg text-right bg-gray-700 text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-600 cursor-pointer"
                calendarClassName="custom-calendar"
                wrapperClassName="w-full"
                popperClassName="custom-popper"
                popperPlacement="bottom-end"
              />
              <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
            </div>
          </div>

          <div>
            <label className="block text-right mb-2 text-blue-300">كود الحالة</label>
            <select
              name="caseCode"
              value={formData.caseCode}
              onChange={handleChange}
              className="w-full px-4 py-3 border border-gray-700 rounded-lg text-right bg-gray-700 text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-600"
            >
              <option value="">اختر كود الحالة</option>
              <option value="yellow" className="text-yellow-400">أصفر</option>
              <option value="red" className="text-red-400">أحمر</option>
            </select>
          </div>

          <div>
            <label className="block text-right mb-2 text-blue-300">تفاصيل الحالة</label>
            <textarea
              name="caseDetails"
              value={formData.caseDetails}
              onChange={handleChange}
              className="w-full px-4 py-3 border border-gray-700 rounded-lg text-right bg-gray-700 text-gray-100 h-32 focus:outline-none focus:ring-2 focus:ring-blue-600"
              placeholder="أدخل تفاصيل الحالة"
            ></textarea>
          </div>

          <div className="text-center">
            <button 
              type="submit"
              className="bg-blue-700 text-white px-8 py-3 rounded-lg hover:bg-blue-600 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              حفظ الحالة
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default EmergencyForm;

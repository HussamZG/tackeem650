import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import DatePicker, { registerLocale } from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import ar from 'date-fns/locale/ar-SA';
import * as XLSX from 'xlsx';
import { supabase } from '../supabaseClient';
import CryptoJS from 'crypto-js';

registerLocale('ar', ar);

// مفتاح التشفير (يجب أن يكون نفس المفتاح المستخدم في تسجيل الدخول)
const SECRET_KEY = import.meta.env.VITE_ENCRYPTION_KEY || 'default-secret-key-650';

function AdminDashboard() {
  const [startDate, setStartDate] = useState(null);
  const [endDate, setEndDate] = useState(null);
  const [emergencyCases, setEmergencyCases] = useState([]);
  const [filteredCases, setFilteredCases] = useState([]);
  const [selectedCase, setSelectedCase] = useState(null);
  const [selectedCases, setSelectedCases] = useState([]);
  const [selectAll, setSelectAll] = useState(false);
  const [filters, setFilters] = useState({
    caseCode: '',
    dateFrom: '',
    dateTo: '',
    rescuerName: '',
    rescuerRank: '',
    trainer: '',
    sortBy: 'date',
    sortOrder: 'desc'
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [totalCasesCount, setTotalCasesCount] = useState(0);
  const [redCasesCount, setRedCasesCount] = useState(0);
  const [yellowCasesCount, setYellowCasesCount] = useState(0);
  const navigate = useNavigate();

  // رابط واجهة برمجة التطبيقات
  const apiUrl = 'https://your-backend-api.com/api'; // استبدل برابط API الفعلي

  // التحقق من صحة التوكن
  const isTokenValid = () => {
    const token = localStorage.getItem('token');
    const username = localStorage.getItem('username');
    
    if (!token || !username) {
      return false;
    }

    try {
      // فك تشفير التوكن
      const decodedToken = CryptoJS.AES.decrypt(token, SECRET_KEY).toString(CryptoJS.enc.Utf8);
      const [storedUsername, timestamp] = decodedToken.split(':');
      
      // التحقق من اسم المستخدم
      if (storedUsername !== username) {
        return false;
      }

      // التحقق من صلاحية التوكن (24 ساعة)
      const currentTime = new Date().getTime();
      const tokenTime = parseInt(timestamp, 10);
      const tokenAge = currentTime - tokenTime;
      
      return tokenAge < 24 * 60 * 60 * 1000; // 24 ساعة
    } catch (error) {
      console.error('خطأ في التحقق من التوكن:', error);
      return false;
    }
  };

  // التحقق من التوكن عند تحميل المكون
  useEffect(() => {
    if (!isTokenValid()) {
      // توجيه المستخدم لتسجيل الدخول إذا كان التوكن غير صالح
      navigate('/login', { replace: true });
    }
  }, []);

  // دالة اختبار الاتصال بـ Supabase
  const checkSupabaseConnection = async () => {
    try {
      const connectionResult = await supabase.supabaseUrl;
      
      if (!connectionResult) {
        toast.error(`فشل الاتصال بـ Supabase`);
        console.error('تفاصيل الخطأ:', 'لا يوجد رابط');
      } else {
        toast.success('تم الاتصال بـ Supabase بنجاح');
      }
    } catch (err) {
      toast.error('حدث خطأ أثناء اختبار الاتصال');
      console.error(err);
    }
  };

  // تأثير لاختبار الاتصال وجلب الحالات
  useEffect(() => {
    // دالة جلب الحالات
    const fetchEmergencyCases = async () => {
      setLoading(true);
      try {
        // جلب جميع البيانات مع التأكيد على استرداد اسم المسعف ورتبته
        const { data, error } = await supabase
          .from('emergencyCases')
          .select('*')
          .order('created_at', { ascending: false }); // ترتيب تنازلي حسب التاريخ

        // طباعة نتائج جلب البيانات للتشخيص
        console.log('جميع نتائج الحالات:', {
          عدد_الحالات: data ? data.length : 0,
          أمثلة_البيانات: data ? data.slice(0, 3).map(item => ({
            rescuerName: item.rescuerName,
            rescuer_name: item.rescuer_name,
            rescuerRank: item.rescuerRank,
            rescuer_rank: item.rescuer_rank,
            caseCode: item.caseCode,
            case_code: item.case_code
          })) : [],
          الخطأ: error
        });

        if (error) {
          throw error;
        }

        // تحديث الحالات مع التأكد من وجود الأعمدة
        const processedData = data.map(item => ({
          ...item,
          rescuerName: item.rescuerName || item.rescuer_name,
          rescuerRank: item.rescuerRank || item.rescuer_rank,
          caseCode: item.caseCode || item.case_code
        }));

        setEmergencyCases(processedData || []);
        setFilteredCases(processedData || []);
        setLoading(false);
      } catch (err) {
        console.error('خطأ في جلب جميع الحالات:', err);
        toast.error('تعذر جلب البيانات. يرجى المحاولة لاحقًا.');
        setError(err);
        setLoading(false);
      }
    };

    // دالة تهيئة لوحة التحكم
    const initializeDashboard = async () => {
      // اختبار الاتصال أولاً
      await checkSupabaseConnection();
      
      // جلب الحالات
      await fetchEmergencyCases();
    };

    // تشغيل التهيئة
    initializeDashboard();
  }, []);

  // تأثير لتحميل الحالات وطباعة التفاصيل المفصلة
  useEffect(() => {
    const applyFilters = (cases) => {
      // التأكد من وجود نسخة من الحالات
      let result = [...cases];

      // فلتر رمز الحالة مع معالجة حساسية الأحرف والتنوع
      if (filters.caseCode) {
        result = result.filter(c => {
          const normalizedFilterCode = filters.caseCode.trim().toLowerCase();
          const normalizedCaseCode = (c.case_code || c.caseCode || '').trim().toLowerCase();
          
          // قاموس لمعالجة التنويعات
          const codeVariants = {
            'أحمر': ['red', 'Red', 'أحمر'],
            'أصفر': ['yellow', 'Yellow', 'أصفر'],
            'أخضر': ['green', 'Green', 'أخضر']
          };

          // التحقق من المطابقة
          return Object.values(codeVariants).some(variants => 
            variants.includes(normalizedFilterCode) && 
            variants.includes(normalizedCaseCode)
          );
        });
      }

      // فلتر التاريخ من
      if (filters.dateFrom) {
        const startDate = new Date(filters.dateFrom);
        startDate.setHours(0, 0, 0, 0); // بداية اليوم
        result = result.filter(c => {
          const caseDate = new Date(c.date);
          return caseDate >= startDate;
        });
      }

      // فلتر التاريخ إلى
      if (filters.dateTo) {
        const endDate = new Date(filters.dateTo);
        endDate.setHours(23, 59, 59, 999); // نهاية اليوم
        result = result.filter(c => {
          const caseDate = new Date(c.date);
          return caseDate <= endDate;
        });
      }

      // فلتر اسم المسعف مع معالجة حساسية الأحرف
      if (filters.rescuerName) {
        const normalizedName = filters.rescuerName.trim().toLowerCase();
        result = result.filter(c => {
          const rescuerName = (c.rescuerName || c.rescuer_name || '').trim().toLowerCase();
          return rescuerName.includes(normalizedName);
        });
      }

      // فلتر رتبة المسعف
      if (filters.rescuerRank) {
        result = result.filter(c => {
          const rescuerRank = c.rescuerRank || c.rescuer_rank || '';
          return rescuerRank.trim() === filters.rescuerRank.trim();
        });
      }

      // فلتر المدرب
      if (filters.trainer) {
        result = result.filter(c => {
          const trainer = c.trainer || '';
          return trainer.trim() === filters.trainer.trim();
        });
      }

      // الترتيب مع التعامل مع القيم المفقودة
      result.sort((a, b) => {
        const sortField = filters.sortBy || 'date';
        const sortOrder = filters.sortOrder || 'desc';
        
        // التعامل مع القيم غير الموجودة
        const valueA = a[sortField] || '';
        const valueB = b[sortField] || '';
        
        let comparison = 0;
        if (valueA < valueB) comparison = -1;
        if (valueA > valueB) comparison = 1;
        
        return sortOrder === 'desc' ? comparison * -1 : comparison;
      });

      return result;
    };

    const result = applyFilters(emergencyCases);
    setFilteredCases(result);
  }, [emergencyCases, filters]);

  // دالة حذف حالة واحدة
  const deleteCase = async (caseId) => {
    try {
      const { error } = await supabase
        .from('emergencyCases')
        .delete()
        .eq('id', caseId);

      if (error) {
        throw error;
      }

      // إعادة جلب الحالات بعد الحذف
      await fetchEmergencyCases();
      toast.success('تم حذف الحالة بنجاح');
    } catch (err) {
      console.error('خطأ في حذف الحالة:', err);
      toast.error('تعذر حذف الحالة. يرجى المحاولة لاحقًا.');
    }
  };

  // حالة تحديد جميع الحالات
  const handleSelectAll = () => {
    setSelectAll(!selectAll);
    if (!selectAll) {
      // تحديد جميع المعرفات الفريدة للحالات
      const allUniqueIds = filteredCases.map(c => c.case_unique_id);
      setSelectedCases(allUniqueIds);
    } else {
      // إلغاء التحديد
      setSelectedCases([]);
    }
  };

  // دالة حذف الحالات المحددة
  const handleDeleteCases = async () => {
    try {
      // التأكد من وجود حالات محددة للحذف
      if (selectedCases.length === 0) {
        toast.error('لم يتم تحديد أي حالة للحذف');
        return;
      }

      // طلب تأكيد من المستخدم
      const confirmDelete = window.confirm(`هل أنت متأكد من حذف ${selectedCases.length} حالة؟`);
      if (!confirmDelete) {
        return;
      }

      // حذف الحالات باستخدام المعرف الفريد
      const { data, error } = await supabase
        .from('emergencyCases')
        .delete()
        .in('case_unique_id', selectedCases);

      if (error) {
        console.error('خطأ في حذف الحالات:', error);
        toast.error(`حدث خطأ أثناء حذف الحالات: ${error.message}`);
        return;
      }

      // إعادة جلب الحالات من قاعدة البيانات بعد الحذف
      const { data: updatedCases, error: fetchError } = await supabase
        .from('emergencyCases')
        .select('*')
        .order('date', { ascending: false });

      if (fetchError) {
        console.error('خطأ في جلب الحالات:', fetchError);
        toast.error('تعذر تحديث قائمة الحالات');
        return;
      }

      // تحديث حالة الحالات
      setEmergencyCases(updatedCases || []);
      setFilteredCases(updatedCases || []);

      // إعادة تعيين الحالات المحددة
      setSelectedCases([]);
      setSelectAll(false);

      // رسالة نجاح
      toast.success(`تم حذف ${selectedCases.length} حالة بنجاح`);

    } catch (err) {
      console.error('خطأ غير متوقع في حذف الحالات:', err);
      toast.error('حدث خطأ غير متوقع أثناء حذف الحالات');
    }
  };

  // دالة للتحقق من رمز الحالة
  const matchCaseCode = (caseCode, filterCode) => {
    // قائمة بالأكواد المقبولة
    const codeVariants = {
      'أصفر': ['أصفر', 'اصفر', 'اصفر '],
      'أحمر': ['أحمر', 'احمر', 'احمر ']
    };

    // التحويل للأحرف الصغيرة وإزالة المسافات
    const normalizedCaseCode = caseCode.trim().toLowerCase();
    const normalizedFilterCode = filterCode.trim().toLowerCase();

    // التحقق من المطابقة
    return codeVariants[filterCode] 
      ? codeVariants[filterCode].includes(normalizedCaseCode)
      : normalizedCaseCode === normalizedFilterCode;
  };

  // دالة تطبيق الفلاتر
  const applyFilters = (cases) => {
    let result = [...cases];

    // فلتر رمز الحالة
    if (filters.caseCode) {
      result = result.filter(c => {
        const match = matchCaseCode(c.caseCode, filters.caseCode);
        console.log(`Filtering case: ${c.caseCode}, Matches ${filters.caseCode}: ${match}`);
        return match;
      });
    }

    // فلتر التاريخ من
    if (filters.dateFrom) {
      result = result.filter(c => new Date(c.date) >= new Date(filters.dateFrom));
    }

    // فلتر التاريخ إلى
    if (filters.dateTo) {
      result = result.filter(c => new Date(c.date) <= new Date(filters.dateTo));
    }

    // فلتر اسم المسعف
    if (filters.rescuerName) {
      result = result.filter(c => 
        c.rescuerName.toLowerCase().includes(filters.rescuerName.toLowerCase())
      );
    }

    // فلتر رتبة المسعف
    if (filters.rescuerRank) {
      result = result.filter(c => c.rescuerRank === filters.rescuerRank);
    }

    // فلتر المدرب
    if (filters.trainer) {
      result = result.filter(c => c.trainer === filters.trainer);
    }

    // الترتيب
    result.sort((a, b) => {
      const sortField = filters.sortBy || 'date';
      const sortOrder = filters.sortOrder || 'desc';
      
      let comparison = 0;
      if (a[sortField] < b[sortField]) comparison = -1;
      if (a[sortField] > b[sortField]) comparison = 1;
      
      return sortOrder === 'desc' ? comparison * -1 : comparison;
    });

    return result;
  };

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    
    // التحقق من القيم الفارغة
    const trimmedValue = typeof value === 'string' ? value.trim() : value;
    
    setFilters(prev => {
      const newFilters = {
        ...prev,
        [name]: trimmedValue || '' // استخدام سلسلة فارغة إذا كانت القيمة غير موجودة
      };
      
      // إعادة تطبيق الفلاتر تلقائيًا
      const filteredCases = applyFilters(emergencyCases);
      setFilteredCases(filteredCases);
      
      return newFilters;
    });
  };

  const handleLogout = () => {
    toast.info('تم تسجيل الخروج', {
      position: "top-right",
      autoClose: 2000,
      onClose: () => navigate('/admin/login')
    });
  };

  const handleCaseDetails = async (c) => {
    try {
      console.log('محاولة جلب تفاصيل الحالة:', {
        date: c.date,
        rescuerName: c.rescuerName || c.rescuer_name,
        caseCode: c.caseCode || c.case_code
      });

      // جلب التفاصيل الكاملة للحالة من قاعدة البيانات
      const { data, error } = await supabase
        .from('emergencyCases')
        .select('*')
        .eq('date', c.date)
        .eq('rescuer_name', c.rescuerName || c.rescuer_name)
        .single();

      if (error) {
        console.error('خطأ في جلب تفاصيل الحالة:', error);
        toast.error('تعذر جلب تفاصيل الحالة');
        return;
      }

      console.log('تفاصيل الحالة المستردة:', data);

      // تحديث الحالة المحددة مع التأكد من وجود جميع الأعمدة
      setSelectedCase({
        id: data.id,
        rescuerName: data.rescuer_name || 'غير محدد',
        rescuerRank: data.rescuer_rank || 'غير محدد',
        caseCode: data.case_code || 'غير محدد',
        trainer: data.trainer || 'غير محدد',
        date: data.date || 'غير محدد',
        caseDetails: data.case_details || 'لا توجد تفاصيل إضافية',
        additionalNotes: data.additional_notes || 'لا توجد ملاحظات',
        case_unique_id: data.case_unique_id
      });
    } catch (err) {
      console.error('خطأ غير متوقع:', err);
      toast.error('حدث خطأ أثناء جلب تفاصيل الحالة');
    }
  };

  const closeCaseDetails = () => {
    setSelectedCase(null);
  };

  // استخراج القيم الفريدة للفلاتر
  const uniqueRanks = [...new Set(emergencyCases.map(c => c.rescuerRank))];
  const uniqueTrainers = [...new Set(emergencyCases.map(c => c.trainer))];

  // دالة لتحويل رموز الحالات إلى العربية
  const convertCaseCodeToArabic = (caseCode) => {
    const caseCodeMap = {
      'red': 'أحمر',
      'yellow': 'أصفر',
      'green': 'أخضر',
      'Red': 'أحمر',
      'Yellow': 'أصفر',
      'Green': 'أخضر',
      'أحمر': 'أحمر',
      'أصفر': 'أصفر',
      'أخضر': 'أخضر'
    };
    
    return caseCodeMap[caseCode] || caseCode;
  };

  // دالة لتحديد لون الحالة
  const getCaseColor = (caseCode) => {
    const arabicCaseCode = convertCaseCodeToArabic(caseCode);
    switch(arabicCaseCode) {
      case 'أحمر':
        return 'text-red-500';
      case 'أصفر':
        return 'text-yellow-500';
      case 'أخضر':
        return 'text-green-500';
      default:
        return 'text-gray-500';
    }
  };

  // حساب إجمالي الحالات وعدد الحالات الحمراء والصفراء
  const calculateCaseCounts = (cases) => {
    const totalCases = cases.length;
    
    const redCases = cases.filter(c => {
      const arabicCaseCode = convertCaseCodeToArabic(c.case_code || c.caseCode);
      return arabicCaseCode === 'أحمر';
    }).length;

    const yellowCases = cases.filter(c => {
      const arabicCaseCode = convertCaseCodeToArabic(c.case_code || c.caseCode);
      return arabicCaseCode === 'أصفر';
    }).length;

    return { 
      totalCases, 
      redCases, 
      yellowCases 
    };
  };

  // تحديث useEffect لحساب العدادات
  useEffect(() => {
    if (filteredCases) {
      console.log('حالات مفلترة:', filteredCases);
      
      const { totalCases, redCases, yellowCases } = calculateCaseCounts(filteredCases);
      
      console.log('نتائج العداد:', {
        totalCases, 
        redCases, 
        yellowCases
      });

      setTotalCasesCount(totalCases);
      setRedCasesCount(redCases);
      setYellowCasesCount(yellowCases);
    }
  }, [filteredCases]);

  const exportToExcel = async () => {
    try {
      // جلب البيانات الكاملة مع التفاصيل
      const { data, error } = await supabase
        .from('emergencyCases')
        .select('*')
        .order('date', { ascending: false });

      if (error) {
        console.error('خطأ في جلب البيانات للتصدير:', error);
        toast.error('تعذر جلب البيانات للتصدير');
        return;
      }

      // معالجة البيانات للتصدير
      const processedData = data.map(item => ({
        'رمز الحالة': item.case_code || 'غير محدد',
        'اسم المسعف': item.rescuer_name || 'غير محدد',
        'رتبة المسعف': item.rescuer_rank || 'غير محدد',
        'المدرب': item.trainer || 'غير محدد',
        'التاريخ': item.date || 'غير محدد',
        'تفاصيل الحالة': item.case_details || 'لا توجد تفاصيل'
      }));

      // إنشاء ورقة عمل Excel
      const worksheet = XLSX.utils.json_to_sheet(processedData);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'حالات الطوارئ');

      // حفظ الملف
      const fileName = `حالات_الطوارئ_${new Date().toLocaleDateString().replace(/\//g, '-')}.xlsx`;
      XLSX.writeFile(workbook, fileName);

      // رسالة نجاح
      toast.success(`تم تصدير ${processedData.length} حالة إلى ملف إكسل`);
    } catch (err) {
      console.error('خطأ في تصدير البيانات:', err);
      toast.error('حدث خطأ أثناء تصدير البيانات');
    }
  };

  // حالة التحديد المتعدد
  const toggleSelectAll = () => {
    // إذا كانت جميع الحالات محددة بالفعل، قم بإلغاء التحديد
    if (selectedCases.length === filteredCases.length) {
      setSelectedCases([]);
    } else {
      // تحديد أول حالة في القائمة
      if (filteredCases.length > 0) {
        setSelectedCases([filteredCases[0]]);
      }
    }
  };

  // دالة تحديد حالة للحذف
  const toggleCaseSelection = (c) => {
    setSelectedCases(prevSelected => {
      // التحقق مما إذا كانت الحالة محددة بالفعل
      const isCurrentlySelected = prevSelected.includes(c.case_unique_id);
      
      if (isCurrentlySelected) {
        // إزالة الحالة من المحددات
        return prevSelected.filter(id => id !== c.case_unique_id);
      } else {
        // إضافة الحالة للمحددات
        return [...prevSelected, c.case_unique_id];
      }
    });

    // إلغاء تحديد الكل إذا تم إلغاء تحديد بعض الحالات
    setSelectAll(false);
  };

  // دالة إضافة حالة جديدة
  const addNewCase = async (newCase) => {
    try {
      // التحقق من صحة البيانات
      if (!newCase.rescuerName || !newCase.caseCode) {
        toast.error('يرجى إدخال اسم المسعف ورمز الحالة');
        return false;
      }

      // إعداد بيانات الحالة
      const caseData = {
        ...newCase,
        date: newCase.date ? new Date(newCase.date).toISOString() : new Date().toISOString(),
        created_at: new Date().toISOString()
      };

      // إدراج الحالة في Supabase
      const { data, error } = await supabase
        .from('emergencyCases')
        .insert(caseData)
        .select();

      if (error) {
        console.error('خطأ في إضافة الحالة:', error);
        toast.error(`فشل إضافة الحالة: ${error.message}`);
        return false;
      }

      // إعادة جلب الحالات بعد الإضافة
      await fetchEmergencyCases();

      // عرض رسالة نجاح
      toast.success('تمت إضافة الحالة بنجاح');
      return true;
    } catch (err) {
      console.error('خطأ غير متوقع:', err);
      toast.error('حدث خطأ أثناء إضافة الحالة');
      return false;
    }
  };

  return (
    <div dir="rtl" className="min-h-screen bg-gray-100 p-4 md:p-8 flex flex-col">
      <ToastContainer rtl={true} theme="dark" />
      
      {/* العنوان والأزرار الرئيسية - متجاوب */}
      <div className="flex flex-col md:flex-row justify-between items-center mb-6 space-y-4 md:space-y-0">
        <h1 className="text-2xl md:text-3xl font-bold text-gray-800">لوحة التحكم الإدارية</h1>
        <div className="flex flex-wrap gap-2 md:gap-4 justify-center">
          <button 
            onClick={exportToExcel}
            className="bg-blue-700 text-white px-6 py-2 rounded-lg shadow-md hover:bg-blue-600 transition-colors text-sm md:text-base"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
            <span>تصدير إلى إكسل</span>
          </button>
          <button 
            onClick={handleLogout}
            className="bg-gray-700 text-gray-200 px-6 py-2 rounded-lg shadow-md hover:bg-gray-600 transition-colors flex items-center space-x-2 space-x-reverse border border-gray-600"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            <span>تسجيل الخروج</span>
          </button>
        </div>
      </div>

      {/* إحصائيات الحالات - متجاوب */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-white p-4 rounded-lg shadow-md text-center">
          <h3 className="text-lg font-semibold">إجمالي الحالات</h3>
          <p className="text-2xl font-bold text-gray-700">{totalCasesCount}</p>
        </div>
        <div className="bg-white p-4 rounded-lg shadow-md text-center">
          <h3 className="text-lg font-semibold text-red-600">حالات أحمر</h3>
          <p className="text-2xl font-bold text-red-700">{redCasesCount}</p>
        </div>
        <div className="bg-white p-4 rounded-lg shadow-md text-center">
          <h3 className="text-lg font-semibold text-yellow-600">حالات أصفر</h3>
          <p className="text-2xl font-bold text-yellow-700">{yellowCasesCount}</p>
        </div>
      </div>

      {/* منطقة الفلترة - متجاوبة */}
      <div className="bg-white p-4 rounded-lg shadow-md mb-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <input 
            type="text" 
            placeholder="رمز الحالة" 
            value={filters.caseCode}
            onChange={(e) => handleFilterChange('caseCode', e.target.value)}
            className="w-full p-2 border rounded-lg"
          />
          <DatePicker
            locale="ar"
            selected={startDate}
            onChange={(date) => setStartDate(date)}
            placeholderText="من تاريخ"
            className="w-full p-2 border rounded-lg"
          />
          <DatePicker
            locale="ar"
            selected={endDate}
            onChange={(date) => setEndDate(date)}
            placeholderText="إلى تاريخ"
            className="w-full p-2 border rounded-lg"
          />
        </div>
      </div>

      {/* جدول الحالات - متجاوب */}
      <div className="bg-white rounded-lg shadow-md overflow-x-auto">
        {loading ? (
          <div className="text-center p-6">
            <p>جارٍ التحميل...</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-right">
              <thead className="bg-gray-100 border-b">
                <tr>
                  <th className="p-3 text-sm font-semibold tracking-wide hidden md:table-cell">
                    <input 
                      type="checkbox" 
                      checked={selectAll}
                      onChange={() => handleSelectAll()}
                      className="form-checkbox"
                    />
                  </th>
                  <th className="p-3 text-sm font-semibold tracking-wide">رمز الحالة</th>
                  <th className="p-3 text-sm font-semibold tracking-wide hidden md:table-cell">اسم المسعف</th>
                  <th className="p-3 text-sm font-semibold tracking-wide hidden lg:table-cell">التاريخ</th>
                  <th className="p-3 text-sm font-semibold tracking-wide">الإجراءات</th>
                </tr>
              </thead>
              <tbody>
                {filteredCases.map((emergencyCase, index) => (
                  <tr key={index} className="border-b hover:bg-gray-50">
                    <td className="p-3 hidden md:table-cell">
                      <input 
                        type="checkbox" 
                        checked={selectedCases.includes(emergencyCase.id)}
                        onChange={() => handleCaseSelection(emergencyCase.id)}
                        className="form-checkbox"
                      />
                    </td>
                    <td className="p-3 text-sm">{emergencyCase.caseCode}</td>
                    <td className="p-3 text-sm hidden md:table-cell">{emergencyCase.rescuerName}</td>
                    <td className="p-3 text-sm hidden lg:table-cell">{emergencyCase.date}</td>
                    <td className="p-3 text-sm">
                      <div className="flex space-x-2 reverse-space-x">
                        <button 
                          onClick={() => viewCaseDetails(emergencyCase)}
                          className="bg-blue-500 text-white px-2 py-1 rounded-lg text-xs hover:bg-blue-600"
                        >
                          عرض
                        </button>
                        <button 
                          onClick={() => editCase(emergencyCase)}
                          className="bg-green-500 text-white px-2 py-1 rounded-lg text-xs hover:bg-green-600"
                        >
                          تعديل
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* نص عند عدم وجود بيانات */}
      {!loading && filteredCases.length === 0 && (
        <div className="text-center p-6 bg-white rounded-lg shadow-md">
          <p>لا توجد حالات للعرض</p>
        </div>
      )}
    </div>
  );
}

export default AdminDashboard;

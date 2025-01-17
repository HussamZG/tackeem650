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
  const [isLoading, setIsLoading] = useState(false);
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
      navigate('/admin/login', { replace: true });
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
      setIsLoading(true);
      try {
        // جلب جميع البيانات مع التأكيد على استرداد اسم المسعف ورتبته
        const { data, error } = await supabase
            .from('emergencyCases')
            .select('*')
            .order('created_at', { ascending: false }); // ترتيب تنازلي حسب التاريخ
        // طباعة نتائج جلب البيانات للتشخيص
        console.log('جميع نتائج الحالات:', {
          عدد_الحالات: data ? data.length : 0,
          الحالات: data ? data.map(item => ({
            اسم_المسعف: item.rescuerName || item.rescuer_name,
            رتبة_المسعف: item.rescuerRank || item.rescuer_rank,
            كود_الحالة: item.caseCode || item.case_code
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

      } catch (err) {
        console.error('خطأ في جلب الحالات:', err);
        toast.error('تعذر جلب الحالات', {
          position: "top-right",
          autoClose: 3000
        });
      } finally {
        setIsLoading(false);
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
  const deleteSelectedCases = async () => {
    if (selectedCases.length === 0) {
      toast.warning('لم يتم تحديد أي حالات للحذف', {
        position: "top-right",
        autoClose: 3000
      });
      return;
    }

    const confirmDelete = window.confirm(`هل أنت متأكد من حذف ${selectedCases.length} حالة؟`);
    if (!confirmDelete) return;

    setIsLoading(true);
    try {
      // حذف الحالات المحددة
      const { error } = await supabase
        .from('emergencyCases')
        .delete()
        .in('case_unique_id', selectedCases);

      if (error) throw error;

      // تحديث القائمة بعد الحذف
      setEmergencyCases(prevCases => 
        prevCases.filter(cas => !selectedCases.includes(cas.case_unique_id))
      );
      setFilteredCases(prevCases => 
        prevCases.filter(cas => !selectedCases.includes(cas.case_unique_id))
      );

      // إعادة تعيين الحالات المحددة
      setSelectedCases([]);
      setSelectAll(false);

      toast.success(`تم حذف ${selectedCases.length} حالة بنجاح`, {
        position: "top-right",
        autoClose: 3000
      });
    } catch (err) {
      console.error('خطأ في حذف الحالات:', err);
      toast.error('تعذر حذف الحالات', {
        position: "top-right",
        autoClose: 3000
      });
    } finally {
      setIsLoading(false);
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
      const { data, error } = await supabase
        .from('emergencyCases')
        .select('*')
        .eq('case_unique_id', c.case_unique_id)
        .single();

      if (error) throw error;

      // تحويل البيانات إلى التنسيق المطلوب
      setSelectedCase({
        case_unique_id: data.case_unique_id,
        rescuerName: data.rescuer_name,
        rescuerRank: data.rescuer_rank,
        trainer: data.trainer,
        date: data.date,
        caseCode: data.case_code,
        caseDetails: data.case_details,
        created_at: data.created_at
      });
    } catch (err) {
      console.error('خطأ في جلب تفاصيل الحالة:', err);
      toast.error('تعذر جلب تفاصيل الحالة');
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
  // تحديث دالة refreshCases
  const refreshCases = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('emergencyCases')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      const processedData = data.map(item => ({
        case_unique_id: item.case_unique_id,
        rescuerName: item.rescuer_name,
        rescuerRank: item.rescuer_rank,
        trainer: item.trainer,
        date: item.date,
        caseCode: item.case_code,
        caseDetails: item.case_details,
        created_at: item.created_at
      }));

      setEmergencyCases(processedData);
      setFilteredCases(processedData);
      
      // تحديث العدادات
      const redCases = processedData.filter(cas => cas.caseCode === 'red').length;
      const yellowCases = processedData.filter(cas => cas.caseCode === 'yellow').length;
      
      setRedCasesCount(redCases);
      setYellowCasesCount(yellowCases);
      setTotalCasesCount(processedData.length);

    } catch (err) {
      console.error('خطأ في تحديث الحالات:', err);
      toast.error('تعذر تحديث الحالات');
    } finally {
      setIsLoading(false);
    }
  };
  return (
      <div dir="rtl" className="min-h-screen bg-gray-900 text-gray-100">
        <ToastContainer rtl={true} theme="dark" />
        
        {/* مؤشر التحميل */}
        {isLoading && (
          <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center">
            <div className="relative">
              <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-blue-500"></div>
              <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-blue-500">
                <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24">
                  <path
                    stroke="currentColor"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M12 6v6m0 0v6m0-6h6m-6 0H6"
                  />
                </svg>
              </div>
            </div>
            <span className="ml-2 text-lg text-blue-500">جاري التحميل...</span>
          </div>
        )}

        <div className="container mx-auto max-w-7xl px-4 py-8">
          <div className="flex justify-between items-center mb-8">
            <h1 className="text-4xl font-extrabold text-blue-300">لوحة التحكم الإدارية</h1>
            <div className="flex items-center space-x-4 space-x-reverse">
              <button
                  onClick={exportToExcel}
                  className="bg-blue-700 text-white px-6 py-2 rounded-lg shadow-md hover:bg-blue-600 transition-colors flex items-center space-x-2 space-x-reverse"
              >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" className="size-6">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
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
              <button
                  onClick={refreshCases}
                  className="bg-blue-700 text-white px-6 py-2 rounded-lg shadow-md hover:bg-blue-600 transition-colors flex items-center space-x-2 space-x-reverse"
              >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="size-6">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182m0-4.991v4.99" />
                </svg>

                <span>تحديث الحالات</span>
              </button>
            </div>
          </div>
          {/* قسم الفلاتر */}
          <div className="bg-gray-800 rounded-2xl shadow-2xl p-6 mb-8 border border-gray-700">
            <h2 className="text-2xl font-semibold text-blue-300 mb-6 border-b pb-3 border-gray-700 flex justify-between items-center">
              <span>فلترة الحالات</span>
              {/* زر مسح الفلاتر */}
              {Object.values(filters).some(value => value !== '' && value !== 'date' && value !== 'desc') && (
                  <button
                      onClick={() => setFilters({
                        caseCode: '',
                        dateFrom: '',
                        dateTo: '',
                        rescuerName: '',
                        rescuerRank: '',
                        trainer: '',
                        sortBy: 'date',
                        sortOrder: 'desc'
                      })}
                      className="text-red-400 hover:text-red-300 transition-colors flex items-center space-x-1 space-x-reverse"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                    <span>مسح الفلاتر</span>
                  </button>
              )}
            </h2>
            <div className="grid grid-cols-4 gap-6">
              {/* فلتر رمز الحالة */}
              <div className="space-y-2">
                <label className="block text-sm font-medium text-blue-300">كود الحالة</label>
                <select
                    name="caseCode"
                    value={filters.caseCode}
                    onChange={handleFilterChange}
                    className="w-full p-3 border border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-600 transition-all text-gray-100 bg-gray-700"
                >
                  <option value="">جميع الحالات</option>
                  <option value="أحمر">أحمر</option>
                  <option value="أصفر">أصفر</option>
                </select>
              </div>
              {/* فلتر التاريخ من */}
              <div className="space-y-2">
                <label className="block text-sm font-medium text-blue-300">من تاريخ</label>
                <input
                    type="date"
                    name="dateFrom"
                    value={filters.dateFrom}
                    onChange={handleFilterChange}
                    className="w-full p-3 border border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-600 transition-all text-gray-100 bg-gray-700"
                />
              </div>
              {/* فلتر التاريخ إلى */}
              <div className="space-y-2">
                <label className="block text-sm font-medium text-blue-300">إلى تاريخ</label>
                <input
                    type="date"
                    name="dateTo"
                    value={filters.dateTo}
                    onChange={handleFilterChange}
                    className="w-full p-3 border border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-600 transition-all text-gray-100 bg-gray-700"
                />
              </div>
              {/* فلتر اسم المسعف */}
              <div className="space-y-2">
                <label className="block text-sm font-medium text-blue-300">اسم المسعف</label>
                <input
                    type="text"
                    name="rescuerName"
                    value={filters.rescuerName}
                    onChange={handleFilterChange}
                    placeholder="ادخل اسم المسعف"
                    className="w-full p-3 border border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-600 transition-all text-gray-100 bg-gray-700"
                />
              </div>
              {/* فلتر رتبة المسعف */}
              <div className="space-y-2">
                <label className="block text-sm font-medium text-blue-300">رتبة المسعف</label>
                <select
                    name="rescuerRank"
                    value={filters.rescuerRank}
                    onChange={handleFilterChange}
                    className="w-full p-3 border border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-600 transition-all text-gray-100 bg-gray-700"
                >
                  <option value="">جميع الرتب</option>
                  {uniqueRanks.map(rank => (
                      <option key={rank} value={rank}>{rank}</option>
                  ))}
                </select>
              </div>
              {/* فلتر المدرب */}
              <div className="space-y-2">
                <label className="block text-sm font-medium text-blue-300">المدرب</label>
                <select
                    name="trainer"
                    value={filters.trainer}
                    onChange={handleFilterChange}
                    className="w-full p-3 border border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-600 transition-all text-gray-100 bg-gray-700"
                >
                  <option value="">جميع المدربين</option>
                  {uniqueTrainers.map(trainer => (
                      <option key={trainer} value={trainer}>{trainer}</option>
                  ))}
                </select>
              </div>
              {/* فلتر الترتيب */}
              <div className="space-y-2">
                <label className="block text-sm font-medium text-blue-300">الترتيب حسب</label>
                <select
                    name="sortBy"
                    value={filters.sortBy}
                    onChange={handleFilterChange}
                    className="w-full p-3 border border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-600 transition-all text-gray-100 bg-gray-700"
                >
                  <option value="date">التاريخ</option>
                  <option value="rescuerName">اسم المسعف</option>
                </select>
              </div>
              {/* فلتر اتجاه الترتيب */}
              <div className="space-y-2">
                <label className="block text-sm font-medium text-blue-300">اتجاه الترتيب</label>
                <select
                    name="sortOrder"
                    value={filters.sortOrder}
                    onChange={handleFilterChange}
                    className="w-full p-3 border border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-600 transition-all text-gray-100 bg-gray-700"
                >
                  <option value="desc">تنازلي</option>
                  <option value="asc">تصاعدي</option>
                </select>
              </div>
            </div>
          </div>
          {/* قسم الإحصائيات */}
          <div className="grid grid-cols-3 gap-6 mb-8">
            <div className="bg-gray-800 rounded-2xl shadow-xl p-6 text-center hover:shadow-2xl transition-shadow border border-gray-700">
              <div className="flex justify-center items-center mb-4">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-blue-300 mb-2">إجمالي الحالات</h3>
              <p className="text-3xl font-bold text-gray-100">{totalCasesCount}</p>
            </div>
            <div className="bg-gray-800 rounded-2xl shadow-xl p-6 text-center hover:shadow-2xl transition-shadow border border-gray-700">
              <div className="flex justify-center items-center mb-4">
                <span className="w-12 h-12 rounded-full bg-amber-500 flex items-center justify-center text-white text-2xl font-bold">!</span>
              </div>
              <h3 className="text-xl font-semibold text-amber-700 mb-2">حالات أصفر</h3>
              <p className="text-3xl font-bold text-amber-900">{yellowCasesCount}</p>
            </div>
            <div className="bg-gray-800 rounded-2xl shadow-xl p-6 text-center hover:shadow-2xl transition-shadow border border-gray-700">
              <div className="flex justify-center items-center mb-4">
                <span className="w-12 h-12 rounded-full bg-red-500 flex items-center justify-center text-white text-2xl font-bold">!</span>
              </div>
              <h3 className="text-xl font-semibold text-red-700 mb-2">حالات أحمر</h3>
              <p className="text-3xl font-bold text-red-900">{redCasesCount}</p>
            </div>
          </div>
          {/* جدول الحالات */}
          <div className="bg-gray-800 rounded-2xl shadow-2xl overflow-hidden border border-gray-700">
            <div className="p-6 flex justify-between items-center border-b border-gray-700">
              <h2 className="text-2xl font-semibold text-blue-300">تفاصيل الحالات</h2>
              <div className="text-blue-400 font-medium">
                عدد النتائج: {filteredCases.length} حالة
              </div>
              <div className="flex items-center space-x-2 space-x-reverse">
                <button
                    onClick={deleteSelectedCases}
                    className="bg-red-700 text-white px-6 py-2 rounded-lg shadow-md hover:bg-red-600 transition-colors flex items-center space-x-2 space-x-reverse"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                  <span>حذف المحدد</span>
                </button>
                <button
                    onClick={handleSelectAll}
                    className="bg-blue-700 text-white px-6 py-2 rounded-lg shadow-md hover:bg-blue-600 transition-colors flex items-center space-x-2 space-x-reverse"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
                  </svg>
                  <span>{selectAll ? 'إلغاء التحديد' : 'تحديد الكل'}</span>
                </button>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-right">
                <thead className="bg-gray-700 border-b border-gray-600">
                <tr>
                  <th className="p-4 text-sm font-medium text-blue-300">
                    <input
                        type="checkbox"
                        checked={selectAll}
                        onChange={handleSelectAll}
                        className="mr-2"
                    />
                  </th>
                  <th className="p-4 text-sm font-medium text-blue-300">معرف الحالة</th>
                  {['اسم المسعف', 'رتبة المسعف', 'المدرب', 'كود الحالة', 'التاريخ', 'التفاصيل'].map((header) => (
                      <th key={header} className="p-4 text-sm font-medium text-blue-300">{header}</th>
                  ))}
                </tr>
                </thead>
                <tbody>
                {filteredCases.map((c) => {
                  const caseCodeColor = getCaseColor(c.caseCode);
                  const uniqueKey = `${c.date}_${c.rescuerName}_${c.caseCode}`;
                  return (
                      <tr
                          key={c.case_unique_id}
                          className={`${
                              selectedCases.includes(c.case_unique_id)
                                  ? 'bg-blue-100 dark:bg-blue-800'
                                  : 'hover:bg-gray-100 dark:hover:bg-gray-700'
                          } transition-colors duration-200`}
                      >
                        <td className="p-4">
                          <input
                              type="checkbox"
                              checked={selectedCases.includes(c.case_unique_id)}
                              onChange={() => toggleCaseSelection(c)}
                              className="mr-2"
                          />
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">{c.case_unique_id}</td>
                        <td className="px-6 py-4 whitespace-nowrap">{c.rescuerName}</td>
                        <td className="px-6 py-4 whitespace-nowrap">{c.rescuerRank}</td>
                        <td className="px-6 py-4 whitespace-nowrap">{c.trainer}</td>
                        <td className="px-6 py-4 whitespace-nowrap">
                        <span
                            className={`px-3 py-1 rounded-full text-xs font-bold 
                            ${caseCodeColor} bg-gray-200
                            text-gray-800 dark:text-gray-100 dark:bg-gray-700`}
                        >
                          {convertCaseCodeToArabic(c.caseCode)}
                        </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {c.date ? new Date(c.date).toLocaleDateString('en-GB', {
                            day: '2-digit',
                            month: '2-digit',
                            year: 'numeric'
                          }) : 'غير محدد'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <button
                              disabled={isLoading}
                              onClick={() => handleCaseDetails(c)}
                              className={`bg-blue-700 text-white px-4 py-2 rounded-lg hover:bg-blue-600 transition-colors 
                                ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
                          >
                            {isLoading ? 'جاري التحميل...' : 'عرض التفاصيل'}
                          </button>
                        </td>
                      </tr>
                  );
                })}
                </tbody>
              </table>
            </div>
          </div>
          {/* نافذة تفاصيل الحالة */}
          {selectedCase && (
              <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center">
                <div className="bg-gray-800 rounded-2xl shadow-2xl w-3/4 max-w-4xl p-8 relative border border-gray-700">
                  <button
                      onClick={() => setSelectedCase(null)}
                      className="absolute top-4 left-4 text-gray-400 hover:text-gray-200 transition-colors"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                  <h2 className="text-3xl font-bold text-blue-300 mb-6 border-b border-gray-700 pb-4">تفاصيل الحالة</h2>

                  <div className="p-6 space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-blue-300 font-bold mb-2">معرف الحالة</label>
                        <p className="bg-gray-700 p-3 rounded text-gray-100">{selectedCase.case_unique_id}</p>
                      </div>
                      <div>
                        <label className="block text-blue-300 font-bold mb-2">اسم المسعف</label>
                        <p className="bg-gray-700 p-3 rounded text-gray-100">{selectedCase.rescuerName}</p>
                      </div>
                      <div>
                        <label className="block text-blue-300 font-bold mb-2">رتبة المسعف</label>
                        <p className="bg-gray-700 p-3 rounded text-gray-100">{selectedCase.rescuerRank}</p>
                      </div>
                      <div>
                        <label className="block text-blue-300 font-bold mb-2">المدرب</label>
                        <p className="bg-gray-700 p-3 rounded text-gray-100">{selectedCase.trainer}</p>
                      </div>
                      <div>
                        <label className="block text-blue-300 font-bold mb-2">كود الحالة</label>
                        <p className={`px-3 py-1 rounded font-bold
                      ${getCaseColor(selectedCase.caseCode)} bg-gray-200
                    `}>
                          {selectedCase.caseCode}
                        </p>
                      </div>
                    </div>
                    <div className="mt-4">
                      <label className="block text-blue-300 font-bold mb-2">التاريخ</label>
                      <p className="bg-gray-700 p-3 rounded text-gray-100">
                        {selectedCase.date ? new Date(selectedCase.date).toLocaleDateString('en-GB', {
                          day: '2-digit',
                          month: '2-digit',
                          year: 'numeric'
                        }) : 'غير محدد'}
                      </p>
                    </div>
                    <div className="mt-4">
                      <label className="block text-blue-300 font-bold mb-2">تفاصيل الحالة</label>
                      <p className="bg-gray-700 p-3 rounded min-h-[100px] text-gray-100">
                        {selectedCase.caseDetails}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
          )}
        </div>
      </div>
  );
}
export default AdminDashboard;

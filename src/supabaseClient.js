import { createClient } from '@supabase/supabase-js';

// محاولة استرداد المتغيرات من مصادر مختلفة
const supabaseUrl = 
  import.meta.env.VITE_SUPABASE_URL || 
  import.meta.env.REACT_APP_SUPABASE_URL || 
  process.env.VITE_SUPABASE_URL || 
  process.env.REACT_APP_SUPABASE_URL || 
  'https://afnyknmkwbklqvydnhxl.supabase.co';

const supabaseAnonKey = 
  import.meta.env.VITE_SUPABASE_ANON_KEY || 
  import.meta.env.REACT_APP_SUPABASE_ANON_KEY || 
  process.env.VITE_SUPABASE_ANON_KEY || 
  process.env.REACT_APP_SUPABASE_ANON_KEY || 
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFmbnlrbm1rd2JrbHF2eWRuaHhsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzY5MzM5ODcsImV4cCI6MjA1MjUwOTk4N30.H6mgpG4BwtwpdsJfw7H7U_kVedSrzllqiSsKVNp0Ovo';

// التحقق من وجود المفاتيح
if (!supabaseUrl || !supabaseAnonKey) {
  console.error('مفاتيح Supabase مفقودة. تأكد من إضافة المتغيرات في .env');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true
  }
});

// دالة متقدمة للتحقق من صحة الاتصال
export const testSupabaseConnection = async () => {
  try {
    // اختبار الاتصال الأساسي
    const { data, error } = await supabase
      .from('emergencyCases')
      .select('id')
      .limit(1);

    if (error) {
      console.error('خطأ في الاتصال بـ Supabase:', error);
      return {
        success: false,
        message: 'فشل الاتصال بالجدول',
        details: error
      };
    }

    console.log('اتصال Supabase ناجح بالكامل!');
    return {
      success: true,
      message: 'تم الاتصال بنجاح وإجراء الاختبارات'
    };

  } catch (err) {
    console.error('خطأ غير متوقع:', err);
    return {
      success: false,
      message: 'خطأ غير متوقع',
      details: err
    };
  }
};

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import * as XLSX from 'xlsx';
import { supabase } from '../supabaseClient';
import CryptoJS from 'crypto-js';

// استيراد الأيقونات
import { 
  Activity, HeartPulse, Wind, AlertTriangle, 
  User, Shield, Search, Calendar, Tag, 
  FileText, LogIn, Loader2, GraduationCap, Stethoscope, 
  CircleAlert, CircleSlash, FileDown, RefreshCw, LogOut, 
  Trash2, CheckSquare, X, Eye, Filter,
  Heart, Settings, Syringe, Droplets, Thermometer, ChevronDown, 
  SlidersHorizontal, Zap, Bone, Scissors,
  Bandage, Plug, AlignCenterVertical, Move, Shirt, UserCheck, Droplet,
  ChevronLeft, ChevronRight, Award, Save, StickyNote, Users
} from 'lucide-react';

const SECRET_KEY = import.meta.env.VITE_ENCRYPTION_KEY || 'default-secret-key-650';

// --- تعريف التقنيات ---
const techniqueOptions = [
  { id: 'proper_position', label: 'الوضعية المناسبة', Icon: UserCheck },
  { id: 'cpr', label: 'CPR', Icon: HeartPulse },
  { id: 'defibrillation', label: 'صادم', Icon: Zap },
  { id: 'suction', label: 'سكشن', Icon: RefreshCw },
  { id: 'oxygen_therapy', label: 'تسريب أكسجين', Icon: Wind },
  { id: 'airway', label: 'تطبيق AIRWAY', Icon: Plug },
  { id: 'bleeding_control', label: 'إيقاف نزف', Icon: Droplet },
  { id: 'iv_access', label: 'فتح وريد', Icon: Syringe },
  { id: 'iv_fluids', label: 'تسريب سيرومات', Icon: Droplets },
  { id: 'burn_care', label: 'تغليف حرق', Icon: Bandage },
  { id: 'splinting', label: 'تثبيت كسر', Icon: Bone },
  { id: 'spinal', label: 'إصابة عمود فقري', Icon: AlignCenterVertical },
  { id: 'lifting', label: 'الحمل والنقل', Icon: Move },
  { id: 'dressing', label: 'تطبيق ضماد', Icon: Scissors },
  { id: 'ked', label: 'KED', Icon: Shirt },
];

function AdminDashboard() {
  const navigate = useNavigate();
  
  // --- Mode State ---
  const [dashboardMode, setDashboardMode] = useState('individual'); // 'individual' | 'team'

  // --- Data States ---
  const [emergencyCases, setEmergencyCases] = useState([]);
  const [teamMissions, setTeamMissions] = useState([]); 
  const [filteredCases, setFilteredCases] = useState([]);
  
  const [selectedCase, setSelectedCase] = useState(null);
  const [selectedCases, setSelectedCases] = useState([]);
  const [selectAll, setSelectAll] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [casesToDelete, setCasesToDelete] = useState([]);
  
  // Grading & Notes
  const [inputGrade, setInputGrade] = useState('');
  const [inputNotes, setInputNotes] = useState('');
  const [isSavingGrade, setIsSavingGrade] = useState(false);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 15;

  // Filters
  const [filters, setFilters] = useState({
    caseCode: '', dateFrom: '', dateTo: '', rescuerName: '',
    rescuerRank: '', trainer: '', technique: '', sortBy: 'date', sortOrder: 'desc',
    isGraded: ''
  });

  const [activeDropdown, setActiveDropdown] = useState(null);
  const [dropdownSearch, setDropdownSearch] = useState('');
  
  const dropdownRefs = {
    caseCode: useRef(null), rescuerRank: useRef(null),
    trainer: useRef(null), sortBy: useRef(null), technique: useRef(null),
    isGraded: useRef(null)
  };

  // --- Core Logic ---

  const isTokenValid = () => {
    const token = localStorage.getItem('token');
    const username = localStorage.getItem('username');
    if (!token || !username) return false;
    try {
      const decodedToken = CryptoJS.AES.decrypt(token, SECRET_KEY).toString(CryptoJS.enc.Utf8);
      const [storedUsername, timestamp] = decodedToken.split(':');
      if (storedUsername !== username) return false;
      return (new Date().getTime() - parseInt(timestamp, 10)) < 24 * 60 * 60 * 1000;
    } catch { return false; }
  };

  useEffect(() => {
    if (!isTokenValid()) navigate('/admin/login', { replace: true });
    else {
        fetchEmergencyCases();
        fetchTeamMissions();
    }
  }, []);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (activeDropdown && dropdownRefs[activeDropdown]?.current && !dropdownRefs[activeDropdown].current.contains(event.target)) {
        setActiveDropdown(null); setDropdownSearch('');
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [activeDropdown]);

  // --- Fetch Functions ---
  const fetchEmergencyCases = async () => {
    try {
      const { data, error } = await supabase.from('emergencyCases').select('*').order('created_at', { ascending: false });
      if (error) throw error;
      const processedData = data.map(item => ({
        ...item,
        rescuerName: item.rescuer_name || item.rescuerName,
        rescuerRank: item.rescuer_rank || item.rescuerRank,
        caseCode: item.case_code || item.caseCode,
        caseDetails: item.case_details || item.caseDetails,
        techniquesUsed: item.techniques_used || [],
        grade: item.grade, notes: item.notes || '',
        oxygen: item.oxygen, pulse: item.pulse, pressure: item.pressure,
        temperature: item.temperature, sugar: item.sugar
      }));
      setEmergencyCases(processedData);
    } catch (err) { console.error(err); }
  };

  const fetchTeamMissions = async () => {
    try {
        const { data, error } = await supabase.from('teamMissions').select('*').order('created_at', { ascending: false });
        if (error) throw error;
        const processed = data.map(item => ({
            ...item,
            senderName: item.sender_name,
            missionDate: item.mission_date,
            caseCode: item.case_code || item.caseCode,
            caseDetails: item.case_details || item.caseDetails,
            teamMembers: item.team_members || [],
            techniquesUsed: item.techniques_used || [],
            oxygen: item.oxygen, 
            pulse: item.pulse, 
            pressure: item.pressure,
            temperature: item.temperature, 
            sugar: item.sugar
        }));
        setTeamMissions(processed);
    } catch (err) { console.error(err); }
  };

  // --- Filtering Logic ---
  useEffect(() => {
    let result = dashboardMode === 'individual' ? [...emergencyCases] : [...teamMissions];
    
    if (filters.caseCode) result = result.filter(c => (c.caseCode || '').toLowerCase() === filters.caseCode.toLowerCase());
    if (filters.dateFrom) { const start = new Date(filters.dateFrom); start.setHours(0,0,0,0); result = result.filter(c => new Date(dashboardMode === 'individual' ? c.date : c.missionDate) >= start); }
    if (filters.dateTo) { const end = new Date(filters.dateTo); end.setHours(23,59,59,999); result = result.filter(c => new Date(dashboardMode === 'individual' ? c.date : c.missionDate) <= end); }
    
    if (dashboardMode === 'individual') {
        if (filters.rescuerName) result = result.filter(c => (c.rescuerName || '').toLowerCase().includes(filters.rescuerName.toLowerCase()));
        if (filters.rescuerRank) result = result.filter(c => c.rescuerRank === filters.rescuerRank);
        if (filters.trainer) result = result.filter(c => c.trainer === filters.trainer);
        if (filters.isGraded === 'graded') result = result.filter(c => c.grade !== null && c.grade !== undefined);
        if (filters.isGraded === 'ungraded') result = result.filter(c => c.grade === null || c.grade === undefined);
    } else {
        if (filters.rescuerName) result = result.filter(c => (c.senderName || '').toLowerCase().includes(filters.rescuerName.toLowerCase()));
    }

    if (filters.technique) result = result.filter(c => c.techniquesUsed && c.techniquesUsed.includes(filters.technique));
    
    result.sort((a, b) => {
      const field = dashboardMode === 'individual' ? filters.sortBy : 'created_at';
      const order = filters.sortOrder === 'asc' ? 1 : -1;
      return ((a[field] || '') > (b[field] || '') ? 1 : -1) * order;
    });
    
    setFilteredCases(result);
    setCurrentPage(1); 
  }, [filters, emergencyCases, teamMissions, dashboardMode]);

  // --- Pagination Logic ---
  const totalPages = Math.ceil(filteredCases.length / itemsPerPage);
  const paginatedCases = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredCases.slice(startIndex, startIndex + itemsPerPage);
  }, [currentPage, filteredCases]);

  // --- Actions ---
  const handleLogout = () => { localStorage.clear(); toast.info('تسجيل الخروج', { onClose: () => navigate('/admin/login') }); };
  
  const toggleCaseSelection = (id) => setSelectedCases(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  
  const handleSelectAll = () => { 
      const visibleIds = paginatedCases.map(c => dashboardMode === 'individual' ? c.case_unique_id : c.id);
      if (selectAll) { setSelectedCases([]); } 
      else { setSelectedCases(prev => [...new Set([...prev, ...visibleIds])]); }
      setSelectAll(!selectAll); 
  };
  
  const deleteSelectedCases = () => { if (selectedCases.length === 0) return; setCasesToDelete(selectedCases); setShowDeleteConfirm(true); };

  const confirmDelete = async () => {
    setIsLoading(true);
    try {
        const idField = dashboardMode === 'individual' ? 'case_unique_id' : 'id';
        const table = dashboardMode === 'individual' ? 'emergencyCases' : 'teamMissions';
        const { error } = await supabase.from(table).delete().in(idField, casesToDelete);
        if (error) throw error;
        
        if (dashboardMode === 'individual') setEmergencyCases(prev => prev.filter(c => !casesToDelete.includes(c.case_unique_id)));
        else setTeamMissions(prev => prev.filter(c => !casesToDelete.includes(c.id)));
        
        setSelectedCases([]); setSelectAll(false);
        toast.success(`تم حذف ${casesToDelete.length} حالة`);
    } catch { toast.error('خطأ بالحذف'); } 
    finally { setIsLoading(false); setShowDeleteConfirm(false); setCasesToDelete([]); }
  };

  // --- Evaluation Submission (Modified) ---
  const handleEvaluationSubmit = async () => {
    const gradeValue = inputGrade === '' ? null : parseInt(inputGrade);
    
    // التحقق: القيمة يجب أن تكون بين 0 و 100
    if (gradeValue !== null && (isNaN(gradeValue) || gradeValue < 0 || gradeValue > 100)) {
      toast.error('الرجاء إدخال درجة صحيحة بين 0 و 100');
      return;
    }
    
    setIsSavingGrade(true);
    try {
      const { error } = await supabase
        .from('emergencyCases')
        .update({ grade: gradeValue, notes: inputNotes })
        .eq('case_unique_id', selectedCase.case_unique_id);

      if (error) throw error;
      
      setEmergencyCases(prev => prev.map(c => c.case_unique_id === selectedCase.case_unique_id ? {...c, grade: gradeValue, notes: inputNotes} : c));
      setSelectedCase(prev => ({...prev, grade: gradeValue, notes: inputNotes}));
      toast.success('تم حفظ التقييم والملاحظات بنجاح');
    } catch (err) { toast.error('فشل حفظ البيانات'); } 
    finally { setIsSavingGrade(false); }
  };

  const exportToExcel = (exportAll = true) => {
    const dataToExport = exportAll ? filteredCases : filteredCases.filter(c => selectedCases.includes(dashboardMode === 'individual' ? c.case_unique_id : c.id));
    if (dataToExport.length === 0) { toast.error("لا توجد حالات للتصدير"); return; }
    
    let data = [];
    if (dashboardMode === 'individual') {
        data = dataToExport.map(item => ({
            'اسم المسعف': item.rescuerName, 'الرتبة': item.rescuerRank, 'المدرب': item.trainer,
            'تاريخ': new Date(item.date).toLocaleDateString('en-GB'),
            'كود الحالة': item.caseCode === 'red' ? 'أحمر' : 'أصفر',
            'العلامة': item.grade !== null && item.grade !== undefined ? item.grade : 'غير مقيّم',
            'ملاحظات': item.notes || ''
        }));
    } else {
        data = dataToExport.map(item => ({
            'اسم المرسل': item.senderName,
            'عدد الفريق': item.teamMembers ? item.teamMembers.length : 0,
            'تاريخ': new Date(item.missionDate).toLocaleDateString('en-GB'),
            'كود الحالة': item.caseCode === 'red' ? 'أحمر' : 'أصفر',
            'التفاصيل': item.caseDetails
        }));
    }

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'التقرير');
    XLSX.writeFile(wb, `Report_${new Date().toLocaleDateString('en-GB')}.xlsx`);
  };

  const handleQuickDate = (type) => {
    const today = new Date(); let from = new Date(); let to = new Date();
    to.setHours(23, 59, 59, 999); from.setHours(0, 0, 0, 0);
    if (type === 'today') { } else if (type === 'week') { from.setDate(today.getDate() - 7); }
    setFilters(prev => ({ ...prev, dateFrom: from.toISOString().split('T')[0], dateTo: to.toISOString().split('T')[0] }));
  };

  // --- Helpers ---
  const convertCode = (c) => ({ red: 'أحمر', yellow: 'أصفر' }[c] || c);
  const uniqueRanks = useMemo(() => [...new Set(emergencyCases.map(c => c.rescuerRank).filter(Boolean))], [emergencyCases]);
  const uniqueTrainers = useMemo(() => [...new Set(emergencyCases.map(c => c.trainer).filter(Boolean))], [emergencyCases]);
  
  const stats = useMemo(() => ({ 
      total: filteredCases.length, 
      red: filteredCases.filter(c => c.caseCode === 'red').length, 
      yellow: filteredCases.filter(c => c.caseCode === 'yellow').length,
      ungraded: dashboardMode === 'individual' ? filteredCases.filter(c => c.grade === null || c.grade === undefined).length : 0
  }), [filteredCases, dashboardMode]);

  const inputClass = "w-full bg-[#0a0a0a] border border-slate-800 rounded-xl px-4 py-3 text-white focus:border-red-600 outline-none text-sm h-[48px] placeholder:text-slate-600 relative z-10 custom-date-input";
  const selectBtnClass = "w-full bg-[#0a0a0a] border border-slate-800 rounded-xl px-4 py-3 text-white transition-all text-sm h-[48px] flex justify-between items-center cursor-pointer hover:border-slate-700";

  const renderDropdown = (id, label, Icon, options, currentValue, displayMap = {}) => {
    const isOpen = activeDropdown === id;
    const filtered = options.filter(o => (displayMap[o] || o).toLowerCase().includes(dropdownSearch.toLowerCase()));
    return (
      <div className="relative" ref={dropdownRefs[id]}>
        <label className="block text-[10px] text-slate-500 uppercase mb-1">{label}</label>
        <div onClick={() => setActiveDropdown(isOpen ? null : id)} className={selectBtnClass}>
          <div className="flex items-center gap-2">
            <Icon className={`w-4 h-4 ${currentValue ? 'text-red-500' : 'text-slate-500'}`} />
            <span className={currentValue ? "text-white truncate" : "text-slate-500"}>{currentValue ? (displayMap[currentValue] || currentValue) : label}</span>
          </div>
          <ChevronDown className={`w-4 h-4 text-slate-500 transition-transform flex-shrink-0 ${isOpen ? 'rotate-180' : ''}`} />
        </div>
        {isOpen && (
          <div className="absolute z-50 w-full mt-2 bg-[#151515] border border-slate-700 rounded-2xl shadow-2xl p-3">
            <input autoFocus placeholder="بحث..." value={dropdownSearch} onChange={(e) => setDropdownSearch(e.target.value)} className="w-full bg-[#0a0a0a] border border-slate-800 rounded-xl px-4 py-2.5 text-xs outline-none focus:border-red-600 mb-2 text-white" />
            <div className="max-h-32 overflow-y-auto custom-scrollbar space-y-1">
              <div onClick={() => { setFilters(p => ({ ...p, [id]: '' })); setActiveDropdown(null); setDropdownSearch(''); }} className={`px-4 py-2 rounded-xl cursor-pointer text-sm ${!currentValue ? 'bg-red-600 text-white' : 'hover:bg-slate-800 text-slate-300'}`}>الكل</div>
              {filtered.map(opt => (
                <div key={opt} onClick={() => { setFilters(p => ({ ...p, [id]: opt })); setActiveDropdown(null); setDropdownSearch(''); }} className={`px-4 py-2 rounded-xl cursor-pointer text-sm truncate ${currentValue === opt ? 'bg-red-600 text-white' : 'hover:bg-slate-800 text-slate-300'}`}>{displayMap[opt] || opt}</div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div dir="rtl" className="min-h-screen bg-[#050505] text-slate-300 font-sans flex flex-col">
      <ToastContainer theme="dark" rtl position="top-center" autoClose={2000} />

      {isLoading && !selectedCase && ( <div className="fixed inset-0 bg-black/80 z-50 flex flex-col items-center justify-center backdrop-blur-sm"><Loader2 className="w-12 h-12 text-red-600 animate-spin mb-4" /><span className="text-white font-bold tracking-widest uppercase">جاري المعالجة...</span></div> )}

      {/* Header */}
      <header className="w-full px-4 sm:px-8 py-4 border-b border-slate-900 bg-[#0a0a0a]">
        <div className="container mx-auto flex justify-between items-center gap-4">
          <div className="flex items-center gap-3 flex-shrink-0">
            <div className="relative p-2 bg-red-600/10 rounded-lg"><Settings className="w-6 h-6 text-red-600" /></div>
            <div>
              <h1 className="text-lg sm:text-xl font-black text-white tracking-tight uppercase">لوحة التحكم <span className="text-red-600">650</span></h1>
              <p className="text-[9px] text-slate-500 uppercase tracking-widest hidden sm:block">نظام الإدارة</p>
            </div>
          </div>
          <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
            <button onClick={fetchEmergencyCases} className="p-2.5 bg-slate-800 rounded-full text-slate-300 hover:bg-slate-700 transition-colors" title="تحديث"><RefreshCw className="w-5 h-5"/></button>
            <button onClick={() => exportToExcel(true)} className="px-4 py-2.5 bg-gradient-to-r from-red-700 to-rose-600 rounded-xl text-white font-bold text-xs uppercase tracking-wider flex items-center gap-2 shadow-lg hover:shadow-red-500/30">
                <FileDown className="w-4 h-4"/> <span className="hidden sm:inline">تصدير</span>
            </button>
            <button onClick={() => exportToExcel(false)} className="p-2.5 bg-red-700 rounded-full text-white hover:bg-red-600 transition-colors" title="تصدير المحدد"><CheckSquare className="w-5 h-5"/></button>
            <button onClick={handleLogout} className="p-2.5 text-slate-500 hover:text-red-500 hover:bg-slate-800 rounded-full transition-colors" title="تسجيل الخروج"><LogOut className="w-5 h-5" /></button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 sm:px-8 py-8 flex-grow">
        
        {/* Mode Switcher */}
        <div className="flex justify-center mb-10">
            <div className="bg-[#0d0d0d] p-2 rounded-2xl border border-slate-800 inline-flex gap-2">
                <button onClick={() => { setDashboardMode('individual'); setFilters({caseCode: '', dateFrom: '', dateTo: '', rescuerName: '', rescuerRank: '', trainer: '', technique: '', sortBy: 'date', sortOrder: 'desc', isGraded: ''}); }} className={`px-4 sm:px-6 py-3 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center gap-2 ${dashboardMode === 'individual' ? 'bg-red-600 text-white shadow-lg' : 'text-slate-400 hover:bg-slate-800'}`}>
                    <UserCheck className="w-4 h-4"/> تقييمات فردية
                </button>
                <button onClick={() => { setDashboardMode('team'); setFilters({caseCode: '', dateFrom: '', dateTo: '', rescuerName: '', rescuerRank: '', trainer: '', technique: '', sortBy: 'date', sortOrder: 'desc', isGraded: ''}); }} className={`px-4 sm:px-6 py-3 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center gap-2 ${dashboardMode === 'team' ? 'bg-cyan-600 text-white shadow-lg' : 'text-slate-400 hover:bg-slate-800'}`}>
                    <Users className="w-4 h-4"/> مهمات جماعية
                </button>
            </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <StatBox title="إجمالي النتائج" value={stats.total} Icon={Activity} color="text-cyan-500" />
          <StatBox title="حالات حرجة" value={stats.red} Icon={AlertTriangle} color="text-red-500" />
          {dashboardMode === 'individual' && <StatBox title="بانتظار التقييم" value={stats.ungraded} Icon={Award} color="text-amber-500" />}
          <StatBox title="حالات متوسطة" value={stats.yellow} Icon={CircleSlash} color="text-amber-500" />
        </div>

        {/* Filters */}
        <div className="bg-[#0d0d0d] border border-slate-800 rounded-[2rem] p-6 sm:p-8 mb-8 shadow-2xl">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6 border-b border-slate-800 pb-4">
            <h2 className="text-sm font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2"><SlidersHorizontal className="w-4 h-4" /> فلترة وتحليل النتائج</h2>
            <div className="flex flex-wrap gap-2">
                <button onClick={() => handleQuickDate('today')} className="px-3 py-1.5 bg-slate-800 rounded-lg text-[10px] font-bold text-slate-300 hover:bg-slate-700">اليوم</button>
                <button onClick={() => handleQuickDate('week')} className="px-3 py-1.5 bg-slate-800 rounded-lg text-[10px] font-bold text-slate-300 hover:bg-slate-700">هذا الأسبوع</button>
                {dashboardMode === 'individual' && <button onClick={() => setFilters(p => ({...p, isGraded: 'ungraded'}))} className="px-3 py-1.5 bg-amber-900/30 border border-amber-800 rounded-lg text-[10px] font-bold text-amber-400 hover:bg-amber-900/50">بانتظار التقييم</button>}
                <button onClick={() => setFilters({ caseCode: '', dateFrom: '', dateTo: '', rescuerName: '', rescuerRank: '', trainer: '', technique: '', sortBy: 'date', sortOrder: 'desc', isGraded: '' })} className="text-slate-500 hover:text-red-500 text-[10px] font-bold px-2">مسح الكل</button>
            </div>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {renderDropdown('caseCode', 'كود الحالة', Tag, ['red', 'yellow'], filters.caseCode, { red: 'أحمر', yellow: 'أصفر' })}
            {renderDropdown('technique', 'التقنية', Zap, techniqueOptions.map(t => t.id), filters.technique, techniqueOptions.reduce((acc, curr) => { acc[curr.id] = curr.label; return acc; }, {}))}
            
            {dashboardMode === 'individual' ? (
                <>
                    {renderDropdown('isGraded', 'حالة التقييم', Award, ['graded', 'ungraded'], filters.isGraded, { graded: 'تم التقييم', ungraded: 'لم يتم التقييم' })}
                    {renderDropdown('rescuerRank', 'الرتبة', Shield, uniqueRanks, filters.rescuerRank)}
                    {renderDropdown('trainer', 'المدرب', GraduationCap, uniqueTrainers, filters.trainer)}
                    <div>
                      <label className="block text-[10px] text-slate-500 uppercase mb-1">اسم المسعف</label>
                      <div className="relative">
                        <input type="text" value={filters.rescuerName} onChange={(e) => setFilters(p => ({...p, rescuerName: e.target.value}))} placeholder="بحث..." className={inputClass} />
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-600" />
                      </div>
                    </div>
                </>
            ) : (
                <div className="col-span-3">
                    <label className="block text-[10px] text-slate-500 uppercase mb-1">اسم المرسل</label>
                    <div className="relative">
                        <input type="text" value={filters.rescuerName} onChange={(e) => setFilters(p => ({...p, rescuerName: e.target.value}))} placeholder="بحث..." className={inputClass} />
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-600" />
                    </div>
                </div>
            )}
            
            <div><label className="block text-[10px] text-slate-500 uppercase mb-1">من تاريخ</label><input type="date" value={filters.dateFrom} onChange={(e) => setFilters(p => ({...p, dateFrom: e.target.value}))} className={inputClass} /></div>
            <div><label className="block text-[10px] text-slate-500 uppercase mb-1">إلى تاريخ</label><input type="date" value={filters.dateTo} onChange={(e) => setFilters(p => ({...p, dateTo: e.target.value}))} className={inputClass} /></div>
          </div>
        </div>

        {/* Table */}
        <div className="bg-[#0d0d0d] border border-slate-800 rounded-[2rem] shadow-2xl overflow-hidden">
          <div className="p-4 sm:p-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-800 bg-[#121212]">
            <h2 className="text-sm font-bold text-white uppercase tracking-widest flex items-center gap-2"><Eye className="w-4 h-4"/> {dashboardMode === 'individual' ? 'سجل التقييمات' : 'سجل المهمات'} <span className="text-red-500 text-xs font-normal">({filteredCases.length})</span></h2>
            <div className="flex gap-2 w-full sm:w-auto">
              <button onClick={deleteSelectedCases} disabled={selectedCases.length === 0} className={`${'px-4 py-2 rounded-xl bg-slate-800 border border-slate-700 text-slate-300 font-bold text-xs uppercase tracking-wider flex items-center gap-2 hover:bg-slate-700 transition-all'} border-red-600/30 text-red-500 hover:bg-red-600/20 flex-1 sm:flex-initial justify-center`}>
                  <Trash2 className="w-4 h-4" /> حذف (<span>{selectedCases.length}</span>)
              </button>
              <button onClick={handleSelectAll} className={`${'px-4 py-2 rounded-xl bg-slate-800 border border-slate-700 text-slate-300 font-bold text-xs uppercase tracking-wider flex items-center gap-2 hover:bg-slate-700 transition-all'} flex-1 sm:flex-initial justify-center`}>
                <CheckSquare className="w-4 h-4" /> {selectAll ? 'إلغاء' : 'تحديد'}
              </button>
            </div>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full text-right min-w-[600px]">
              <thead className="bg-[#0a0a0a] text-slate-500 border-b border-slate-800 text-[10px]">
                <tr>
                  <th className="p-4 w-10"><input type="checkbox" checked={selectAll} onChange={handleSelectAll} className="accent-red-600" /></th>
                  {dashboardMode === 'individual' ? (
                      <>
                        <th className="p-4 font-bold uppercase">المسعف</th>
                        <th className="p-4 font-bold uppercase hidden md:table-cell">المدرب</th>
                        <th className="p-4 font-bold uppercase">الكود</th>
                        <th className="p-4 font-bold uppercase hidden sm:table-cell">التاريخ</th>
                        <th className="p-4 font-bold uppercase">التقييم</th>
                        <th className="p-4 font-bold uppercase">خيارات</th>
                      </>
                  ) : (
                      <>
                        <th className="p-4 font-bold uppercase">المرسل</th>
                        <th className="p-4 font-bold uppercase">عدد الفريق</th>
                        <th className="p-4 font-bold uppercase">الكود</th>
                        <th className="p-4 font-bold uppercase">التاريخ</th>
                        <th className="p-4 font-bold uppercase">خيارات</th>
                      </>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {paginatedCases.map((c) => {
                  const isUngraded = dashboardMode === 'individual' && (c.grade === null || c.grade === undefined);
                  const rowId = dashboardMode === 'individual' ? c.case_unique_id : c.id;
                  return (
                  <tr key={rowId} className={`hover:bg-slate-900/50 transition-colors ${selectedCases.includes(rowId) ? 'bg-red-900/10' : ''} ${isUngraded ? 'bg-amber-950/10 hover:bg-amber-900/20' : ''}`}>
                    <td className="p-4"><input type="checkbox" checked={selectedCases.includes(rowId)} onChange={() => toggleCaseSelection(rowId)} className="accent-red-600" /></td>
                    
                    {dashboardMode === 'individual' ? (
                        <>
                            <td className="p-4 font-medium text-white">{c.rescuerName}</td>
                            <td className="p-4 text-slate-400 hidden md:table-cell">{c.trainer}</td>
                            <td className="p-4"><span className={`px-2 py-1 rounded-full text-[10px] font-bold ${c.caseCode === 'red' ? 'bg-red-500/20 text-red-500' : 'bg-amber-500/20 text-amber-500'}`}>{convertCode(c.caseCode)}</span></td>
                            <td className="p-4 text-slate-400 hidden sm:table-cell text-xs">{new Date(c.date).toLocaleDateString('en-GB')}</td>
                            <td className="p-4">
                            {isUngraded ? (
                                <span className="px-2 py-1 rounded-full text-[9px] font-bold bg-slate-800 text-amber-400 border border-amber-700/30">لم تُقيّم</span>
                            ) : (
                                <span className="px-2 py-1 rounded-full text-[9px] font-bold bg-slate-800 text-emerald-400">{c.grade}%</span>
                            )}
                            </td>
                        </>
                    ) : (
                        <>
                            <td className="p-4 font-medium text-white">{c.senderName}</td>
                            <td className="p-4 text-slate-400">{c.teamMembers ? c.teamMembers.length : 0}</td>
                            <td className="p-4"><span className={`px-2 py-1 rounded-full text-[10px] font-bold ${c.caseCode === 'red' ? 'bg-red-500/20 text-red-500' : 'bg-amber-500/20 text-amber-500'}`}>{convertCode(c.caseCode)}</span></td>
                            <td className="p-4 text-slate-400 text-xs">{new Date(c.missionDate).toLocaleDateString('en-GB')}</td>
                        </>
                    )}
                    
                    <td className="p-4">
                        <div className="flex items-center gap-2">
                            <button onClick={() => { setSelectedCase(c); setInputGrade(c.grade || ''); setInputNotes(c.notes || ''); }} className="text-cyan-500 hover:text-cyan-400 p-1.5 bg-cyan-900/20 rounded-lg hover:bg-cyan-900/40 transition-colors"><Eye className="w-4 h-4"/></button>
                            <button onClick={() => { setSelectedCases([rowId]); setShowDeleteConfirm(true); setCasesToDelete([rowId]); }} className="text-red-500 hover:text-red-400 p-1.5 bg-red-900/20 rounded-lg hover:bg-red-900/40 transition-colors"><Trash2 className="w-4 h-4"/></button>
                        </div>
                    </td>
                  </tr>
                )})}
              </tbody>
            </table>
            {filteredCases.length === 0 && <div className="text-center py-16 text-slate-600"><FileText className="w-12 h-12 mx-auto mb-4 opacity-50" />لا توجد حالات</div>}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="p-4 flex justify-center items-center gap-2 border-t border-slate-800 bg-[#0a0a0a]">
              <button onClick={() => setCurrentPage(p => Math.max(p - 1, 1))} disabled={currentPage === 1} className="p-2 rounded-lg bg-slate-800 text-slate-400 hover:bg-slate-700 disabled:opacity-30 transition-colors"><ChevronRight className="w-5 h-5"/></button>
              <span className="text-xs text-slate-400 px-4">صفحة <span className="text-white font-bold">{currentPage}</span> من <span className="text-white font-bold">{totalPages}</span></span>
              <button onClick={() => setCurrentPage(p => Math.min(p + 1, totalPages))} disabled={currentPage === totalPages} className="p-2 rounded-lg bg-slate-800 text-slate-400 hover:bg-slate-700 disabled:opacity-30 transition-colors"><ChevronLeft className="w-5 h-5"/></button>
            </div>
          )}
        </div>
      </main>

<footer dir="ltr" className="w-full py-8 flex flex-col items-center justify-center border-t border-slate-900/50 bg-[#050505] mt-12 relative">
    <div className="absolute top-0 w-1/2 h-[1px] bg-gradient-to-r from-transparent via-red-600/50 to-transparent"></div>
    <div className="flex flex-col items-center gap-4 group">
        <div className="relative flex items-center gap-4">
            <div className="w-8 h-px bg-gradient-to-r from-transparent to-red-600/60 transition-all duration-500 group-hover:w-12"></div>
            <div className="relative">
                <span className="absolute inset-0 blur-sm text-red-600 text-xl font-mono font-black tracking-tighter opacity-60 select-none transition-opacity duration-300 group-hover:opacity-90">&lt;SHTAYER/&gt;</span>
                <span className="relative text-xl font-mono font-black tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-red-500 via-rose-500 to-red-500 select-none transition-all duration-300">&lt;SHTAYER/&gt;</span>
            </div>
            <div className="w-8 h-px bg-gradient-to-l from-transparent to-red-600/60 transition-all duration-500 group-hover:w-12"></div>
        </div>
        <div className="flex items-center gap-2 text-[10px] text-slate-700 font-mono tracking-[0.2em] uppercase">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
            System Online
            <span className="text-slate-800 mx-1">|</span>
            Medical Response Interface
        </div>
    </div>
</footer>
      {/* --- Modal --- */}
      {selectedCase && (
        <div className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4 backdrop-blur-sm" onClick={() => setSelectedCase(null)}>
          <div className="bg-[#121212] border border-slate-800 rounded-[2rem] shadow-2xl w-full max-w-4xl relative overflow-hidden max-h-[95vh] flex flex-col animate-in fade-in zoom-in duration-300" onClick={e => e.stopPropagation()}>
            
            {/* Header */}
            <div className="bg-[#0a0a0a] p-6 border-b border-slate-800 flex justify-between items-center shrink-0">
              <div className="flex items-center gap-4">
                <div className={`p-3 rounded-xl ${selectedCase.caseCode === 'red' ? 'bg-red-900/30' : 'bg-amber-900/30'}`}>
                  <FileText className={`w-6 h-6 ${selectedCase.caseCode === 'red' ? 'text-red-500' : 'text-amber-500'}`} />
                </div>
                <div>
                  <h3 className="text-white font-bold text-lg uppercase tracking-wide">{dashboardMode === 'individual' ? 'ملف الحالة الطبية' : 'تقرير المهمة'}</h3>
                  <p className="text-[10px] text-slate-500 font-mono">ID: {dashboardMode === 'individual' ? selectedCase.case_unique_id : selectedCase.id}</p>
                </div>
              </div>
              <button onClick={() => setSelectedCase(null)} className="text-slate-500 hover:text-white p-2 hover:bg-slate-800 rounded-full transition-colors"><X className="w-5 h-5" /></button>
            </div>

            {/* Content Area */}
            <div className="p-6 sm:p-8 overflow-y-auto custom-scrollbar flex-grow">
              
              {dashboardMode === 'individual' ? (
                 // Individual Modal Content
                 <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    <div className="lg:col-span-1 space-y-6">
                        <div>
                            <p className="text-[10px] text-slate-500 uppercase mb-1">المسعف</p>
                            <h2 className="text-2xl font-black text-white">{selectedCase.rescuerName}</h2>
                            <p className="text-slate-400 text-sm mt-1 flex items-center gap-2"><Shield className="w-3 h-3"/> {selectedCase.rescuerRank}</p>
                        </div>
                        <div className="border-t border-slate-800 pt-4 space-y-3">
                            <div className="flex items-center gap-3 text-sm"><GraduationCap className="w-4 h-4 text-slate-500"/><span className="text-slate-400">المدرب:</span><span className="text-white font-bold">{selectedCase.trainer || 'غير محدد'}</span></div>
                            <div className="flex items-center gap-3 text-sm"><Calendar className="w-4 h-4 text-slate-500"/><span className="text-slate-400">التاريخ:</span><span className="text-white font-bold">{new Date(selectedCase.date).toLocaleDateString('en-GB')}</span></div>
                        </div>
                        {selectedCase.techniquesUsed && selectedCase.techniquesUsed.length > 0 && (
                            <div className="border-t border-slate-800 pt-4">
                            <h4 className="text-[10px] font-bold text-slate-500 uppercase mb-3 flex items-center gap-2"><Zap className="w-3 h-3"/> التقنيات</h4>
                            <div className="flex flex-wrap gap-2">
                                {selectedCase.techniquesUsed.map(techId => {
                                const tech = techniqueOptions.find(t => t.id === techId);
                                if (!tech) return null;
                                const IconComponent = tech.Icon;
                                return <span key={techId} className="px-2.5 py-1 bg-slate-800 rounded-lg text-[11px] text-slate-200 flex items-center gap-1.5 border border-slate-700"><IconComponent className="w-3 h-3 text-red-500"/> {tech.label}</span>;
                                })}
                            </div>
                            </div>
                        )}
                    </div>
                    
                    <div className="lg:col-span-2 space-y-6">
                        {(selectedCase.oxygen || selectedCase.pulse || selectedCase.pressure || selectedCase.temperature || selectedCase.sugar) && (
                            <div>
                            <h4 className="text-[10px] font-bold text-slate-500 uppercase mb-4 flex items-center gap-2"><Stethoscope className="w-3 h-3"/> العلامات الحيوية</h4>
                            <div className="grid grid-cols-3 sm:grid-cols-5 gap-3 text-center">
                                {selectedCase.oxygen && <VitalStatusCard label="O2" value={selectedCase.oxygen} unit="%" Icon={Wind} status={parseInt(selectedCase.oxygen) >= 95 ? 'safe' : 'warning'} />}
                                {selectedCase.pulse && <VitalStatusCard label="Pulse" value={selectedCase.pulse} unit="bpm" Icon={HeartPulse} status="neutral" />}
                                {selectedCase.pressure && <VitalStatusCard label="BP" value={selectedCase.pressure} unit="" Icon={Activity} status="neutral" />}
                                {selectedCase.temperature && <VitalStatusCard label="Temp" value={selectedCase.temperature} unit="°C" Icon={Thermometer} status={parseFloat(selectedCase.temperature) > 37.5 ? 'warning' : 'safe'} />}
                                {selectedCase.sugar && <VitalStatusCard label="Sugar" value={selectedCase.sugar} unit="mg/dL" Icon={Droplets} status="neutral" />}
                            </div>
                            </div>
                        )}
                        <div className="border-t border-slate-800 pt-6">
                            <h4 className="text-[10px] font-bold text-slate-500 uppercase mb-3 flex items-center gap-2"><FileText className="w-3 h-3"/> التقرير</h4>
                            <div className="bg-[#0a0a0a] p-5 rounded-2xl border border-slate-800 min-h-[100px]">
                            <p className="text-slate-200 leading-relaxed whitespace-pre-wrap text-sm">{selectedCase.caseDetails || 'لا توجد تفاصيل.'}</p>
                            </div>
                        </div>
                        
                        {/* Grading Section (Modified) */}
                        <div className="border-t border-slate-800 pt-6">
                            <div className="flex flex-col sm:flex-row gap-6">
                                <div className="w-full sm:w-1/3">
                                    <h4 className="text-[10px] font-bold text-slate-500 uppercase mb-4 flex items-center gap-2"><Award className="w-3 h-3"/> التقييم (0-100)</h4>
                                    <input 
                                        type="number" 
                                        min="0" 
                                        max="100" 
                                        value={inputGrade} 
                                        onChange={(e) => setInputGrade(e.target.value)} 
                                        className="w-full bg-[#0a0a0a] text-4xl font-black text-center text-white outline-none border-b-4 border-slate-700 focus:border-red-600 transition-colors appearance-none h-20" 
                                        placeholder="--"
                                    />
                                </div>
                                <div className="w-full sm:w-2/3">
                                    <h4 className="text-[10px] font-bold text-slate-500 uppercase mb-4 flex items-center gap-2"><StickyNote className="w-3 h-3"/> ملاحظات المدرب</h4>
                                    <textarea value={inputNotes} onChange={(e) => setInputNotes(e.target.value)} placeholder="أضف ملاحظاتك هنا..." className="w-full h-24 bg-[#0a0a0a] border border-slate-800 rounded-xl p-4 text-white text-sm focus:border-red-600 outline-none resize-none"/>
                                </div>
                            </div>
                            <div className="mt-6 flex justify-end">
                                <button onClick={handleEvaluationSubmit} disabled={isSavingGrade} className="px-8 py-3 rounded-xl bg-gradient-to-r from-red-700 to-rose-600 text-white font-bold text-sm uppercase flex items-center justify-center gap-2 hover:shadow-red-600/20 transition-all disabled:opacity-50">
                                    {isSavingGrade ? <Loader2 className="w-4 h-4 animate-spin"/> : <Save className="w-4 h-4"/>}
                                    <span>حفظ التقييم والملاحظات</span>
                                </button>
                            </div>
                        </div>
                    </div>
                 </div>
              ) : (
                  // Team Mission Modal Content
                  <div className="space-y-6">
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="text-[10px] text-slate-500 uppercase mb-1">قائد المهمة (المرسل)</p>
                          <h2 className="text-2xl font-black text-white">{selectedCase.senderName}</h2>
                        </div>
                        <div className={`text-left px-3 py-1 rounded-lg ${selectedCase.caseCode === 'red' ? 'bg-red-500/10' : 'bg-amber-500/10'}`}>
                          <span className={`text-[10px] uppercase block font-bold ${selectedCase.caseCode === 'red' ? 'text-red-400' : 'text-amber-400'}`}>كود</span>
                          <span className={`text-2xl font-black ${selectedCase.caseCode === 'red' ? 'text-red-500' : 'text-amber-500'}`}>{selectedCase.caseCode === 'red' ? 'أحمر' : 'أصفر'}</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-3 text-sm bg-[#0a0a0a] p-3 rounded-xl border border-slate-800">
                        <Calendar className="w-4 h-4 text-cyan-400"/>
                        <span className="text-slate-400">تاريخ المهمة:</span>
                        <span className="text-white font-bold">{new Date(selectedCase.missionDate).toLocaleDateString('en-GB')}</span>
                      </div>

                      {(selectedCase.oxygen || selectedCase.pulse || selectedCase.pressure || selectedCase.temperature || selectedCase.sugar) && (
                        <div>
                          <h4 className="text-[10px] font-bold text-slate-500 uppercase mb-4 flex items-center gap-2"><Stethoscope className="w-3 h-3"/> العلامات الحيوية</h4>
                          <div className="grid grid-cols-3 sm:grid-cols-5 gap-3 text-center">
                            {selectedCase.oxygen && <VitalStatusCard label="O2" value={selectedCase.oxygen} unit="%" Icon={Wind} status={parseInt(selectedCase.oxygen) >= 95 ? 'safe' : 'warning'} />}
                            {selectedCase.pulse && <VitalStatusCard label="Pulse" value={selectedCase.pulse} unit="bpm" Icon={HeartPulse} status="neutral" />}
                            {selectedCase.pressure && <VitalStatusCard label="BP" value={selectedCase.pressure} unit="" Icon={Activity} status="neutral" />}
                            {selectedCase.temperature && <VitalStatusCard label="Temp" value={selectedCase.temperature} unit="°C" Icon={Thermometer} status={parseFloat(selectedCase.temperature) > 37.5 ? 'warning' : 'safe'} />}
                            {selectedCase.sugar && <VitalStatusCard label="Sugar" value={selectedCase.sugar} unit="mg/dL" Icon={Droplets} status="neutral" />}
                          </div>
                        </div>
                      )}

                      {selectedCase.techniquesUsed && selectedCase.techniquesUsed.length > 0 && (
                        <div className="border-t border-slate-800 pt-4">
                           <h4 className="text-[10px] font-bold text-slate-500 uppercase mb-3 flex items-center gap-2"><Zap className="w-3 h-3"/> التقنيات المستخدمة</h4>
                           <div className="flex flex-wrap gap-2">
                            {selectedCase.techniquesUsed.map(techId => {
                               const tech = techniqueOptions.find(t => t.id === techId);
                               if (!tech) return null;
                               const IconComponent = tech.Icon;
                               return <span key={techId} className="px-2.5 py-1 bg-slate-800 rounded-lg text-[11px] text-slate-200 flex items-center gap-1.5 border border-slate-700"><IconComponent className="w-3 h-3 text-cyan-500"/> {tech.label}</span>;
                            })}
                           </div>
                        </div>
                      )}

                      <div className="bg-[#0a0a0a] p-4 rounded-xl border border-slate-800">
                          <h4 className="text-[10px] font-bold text-slate-500 uppercase mb-3 flex items-center gap-2"><Users className="w-3 h-3"/> أعضاء الفريق ({selectedCase.teamMembers ? selectedCase.teamMembers.length : 0})</h4>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                              {selectedCase.teamMembers && selectedCase.teamMembers.map((m, i) => (
                                  <div key={i} className="flex justify-between items-center bg-slate-900/50 p-2 rounded-lg text-sm">
                                      <span className="font-bold text-white">{m.name}</span>
                                      <span className="text-[10px] text-slate-400 bg-slate-800 px-2 py-0.5 rounded">{m.rank}</span>
                                  </div>
                              ))}
                          </div>
                      </div>
                      
                      <div className="border-t border-slate-800 pt-4">
                          <h4 className="text-[10px] font-bold text-slate-500 uppercase mb-2"><FileText className="w-3 h-3 inline ml-1"/> تفاصيل المهمة</h4>
                          <p className="text-slate-300 text-sm">{selectedCase.caseDetails || 'لا توجد تفاصيل'}</p>
                      </div>
                  </div>
              )}
            </div>
          </div>
        </div>
      )}

      {showDeleteConfirm && (
         <div className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
         <div className="bg-[#121212] border border-slate-800 rounded-2xl p-8 max-w-sm w-full text-center">
           <AlertTriangle className="w-16 h-16 text-red-500 mx-auto mb-4" />
           <h3 className="text-xl font-bold text-white mb-2">تأكيد الحذف</h3>
           <p className="text-slate-400 mb-6">هل أنت متأكد من حذف <span className="text-red-500 font-bold">{casesToDelete.length}</span> حالة؟</p>
           <div className="flex gap-4">
             <button onClick={confirmDelete} className="flex-1 py-3 rounded-xl bg-red-600 text-white font-bold hover:bg-red-700 transition-colors">حذف</button>
             <button onClick={() => setShowDeleteConfirm(false)} className="flex-1 py-3 rounded-xl bg-slate-800 text-slate-300 font-bold hover:bg-slate-700 transition-colors">إلغاء</button>
           </div>
         </div>
       </div>
      )}

      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 6px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #334155; border-radius: 10px; }
        input[type="date"].custom-date-input::-webkit-calendar-picker-indicator { filter: invert(1); cursor: pointer; opacity: 0.6; }
        input[type="number"]::-webkit-outer-spin-button, input[type="number"]::-webkit-inner-spin-button { -webkit-appearance: none; margin: 0; }
        input[type="number"] { -moz-appearance: textfield; }
        .animate-pulse-custom { animation: pulse-neon 3.5s ease-in-out infinite; }
        @keyframes pulse-neon { 0%, 100% { opacity: 1; filter: drop-shadow(0 0 5px rgba(220,38,38,0.3)); } 50% { opacity: 0.5; filter: drop-shadow(0 0 15px rgba(220,38,38,0.8)); } }
      `}</style>
    </div>
  );
}

// --- Helper Components ---

const StatBox = ({ title, value, Icon, color }) => (
  <div className="bg-[#0d0d0d] p-6 rounded-2xl border border-slate-800 flex flex-col items-center text-center group transition-all hover:border-slate-700 hover:bg-[#111111]">
    <Icon className={`w-6 h-6 ${color} transition-all group-hover:scale-110 opacity-60 group-hover:opacity-100`} />
    <p className={`text-[9px] font-bold uppercase tracking-tighter mt-2 ${color}`}>{title}</p>
    <div className="text-lg sm:text-2xl font-black text-white mt-1">{value}</div>
  </div>
);

const VitalStatusCard = ({ label, value, unit, Icon, status }) => {
  const colorMap = {
    safe: { text: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-900/50' },
    warning: { text: 'text-amber-400', bg: 'bg-amber-500/10', border: 'border-amber-900/50' },
    critical: { text: 'text-red-500', bg: 'bg-red-500/10', border: 'border-red-900/50' },
    neutral: { text: 'text-indigo-400', bg: 'bg-indigo-500/10', border: 'border-indigo-900/50' }
  };
  const styles = colorMap[status] || colorMap.neutral;
  return (
    <div className={`${styles.bg} ${styles.border} border p-3 rounded-xl flex flex-col items-center justify-center transition-colors`}>
      <Icon className={`w-4 h-4 ${styles.text} mb-1`} />
      <div className={`text-lg font-bold ${styles.text} flex items-baseline`}>{value}<span className="text-[9px] font-normal opacity-70 mr-0.5">{unit}</span></div>
      <span className="block text-[8px] text-slate-500 uppercase mt-1">{label}</span>
    </div>
  );
};

export default AdminDashboard;
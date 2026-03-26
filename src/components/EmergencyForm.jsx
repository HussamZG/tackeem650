import React, { useState, useMemo, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import DatePicker, { registerLocale } from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import ar from 'date-fns/locale/ar-SA';
import { supabase } from '../supabaseClient';
import { v4 as uuidv4 } from 'uuid';

// استيراد الأيقونات
import { 
  Activity, HeartPulse, Wind, AlertTriangle, 
  User, Shield, Search, Calendar, Tag, 
  FileText, LogIn, Loader2, GraduationCap, Stethoscope, 
  CircleAlert, CircleSlash, ChevronDown, Syringe, 
  Bandage, Bone, Zap, Scissors, Droplets, 
  Thermometer, Heart, RefreshCw, Plug, AlignCenterVertical, 
  Move, Shirt, UserCheck, Droplet, Plus, Trash2, Users
} from 'lucide-react';

// تسجيل اللغة العربية
registerLocale('ar', ar);

// --- الثوابت (Constants) ---
const rescuerRanks = ['قائد تحت التقييم', 'كشاف تحت التقييم'];
const teamMemberRanks = ['قائد', 'كشاف', 'مسعف'];

const trainers = [
  'أبي عصمان', 'آية المحيثاوي', 'جوهر أبو فخر', 'دانيال الحميدي', 'رامي السمان', 
  'رهف العمر', 'ريهام الريشاني', 'رقية العبدلله', 'سليمان سعيد', 'عبير أبو راس', 
  'عدي النداف', 'غسان صالحة', 'غيث أبو الفضل', 'غنوة مرشد', 'وسام شلغين', 
  'هادي عواد', 'يمامة أبو عمار'
];

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

const caseCodeOptions = [
  { value: 'yellow', label: 'أصفر (متوسط)', Icon: CircleSlash, color: 'text-amber-400', hoverBg: 'hover:bg-amber-500/20' },
  { value: 'red', label: 'أحمر (حرج)', Icon: CircleAlert, color: 'text-red-500', hoverBg: 'hover:bg-red-500/20' },
];

// --- المكون الرئيسي ---
function EmergencyForm() {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [formMode, setFormMode] = useState('evaluation');

  // --- States ---
  const [evalData, setEvalData] = useState({
    rescuerName: '', rescuerRank: '', trainer: '', date: null, caseCode: '',
    oxygen: '', pulse: '', pressure: '', temperature: '', sugar: '', 
    techniques: [], caseDetails: ''
  });

  const [missionData, setMissionData] = useState({
    senderName: '', date: null, caseCode: '',
    oxygen: '', pulse: '', pressure: '', temperature: '', sugar: '', 
    techniques: [], caseDetails: '',
    teamMembers: [{ name: '', rank: '' }]
  });

  // Dropdown States
  const [openDropdown, setOpenDropdown] = useState({ trainer: false, rank: false, code: false });
  const [searchQuery, setSearchQuery] = useState('');
  
  // Refs
  const trainerRef = useRef(null);
  const rankRef = useRef(null);
  const codeRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (trainerRef.current && !trainerRef.current.contains(e.target)) setOpenDropdown(p => ({...p, trainer: false}));
      if (rankRef.current && !rankRef.current.contains(e.target)) setOpenDropdown(p => ({...p, rank: false}));
      if (codeRef.current && !codeRef.current.contains(e.target)) setOpenDropdown(p => ({...p, code: false}));
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // --- Logic & Helpers ---
  const getPulseAnimation = (pulse) => {
    const val = parseInt(pulse);
    if (!val || val < 30 || val > 200) return {};
    return { animationDuration: `${60 / val}s`, animationName: 'heartbeat', animationTimingFunction: 'ease-in-out', animationIterationCount: 'infinite' };
  };

  const getOxygenStyle = (val) => {
    const v = parseInt(val);
    if (!v) return { cls: "text-cyan-400", anim: "" };
    if (v >= 95) return { cls: "text-cyan-400", anim: "animate-breathe" };
    if (v >= 90) return { cls: "text-amber-400", anim: "animate-pulse" };
    return { cls: "text-red-500", anim: "animate-pulse-fast" };
  };

  const getTempStyle = (val) => {
    const v = parseFloat(val);
    if (!v) return "text-amber-400";
    if (v > 37.5) return "text-red-500";
    if (v < 36.0) return "text-blue-400";
    return "text-emerald-400";
  };

  // Team Members Logic
  const updateTeamMember = (index, field, value) => {
    setMissionData(prev => {
      const members = [...prev.teamMembers];
      members[index][field] = value;
      return { ...prev, teamMembers: members };
    });
  };

  const addTeamMember = () => setMissionData(p => ({...p, teamMembers: [...p.teamMembers, { name: '', rank: '' }]}));
  const removeTeamMember = (index) => {
    if (missionData.teamMembers.length === 1) return;
    setMissionData(p => ({...p, teamMembers: p.teamMembers.filter((_, i) => i !== index)}));
  };

  const toggleTechnique = (id, isMission) => {
    const setter = isMission ? setMissionData : setEvalData;
    setter(p => ({
      ...p,
      techniques: p.techniques.includes(id) ? p.techniques.filter(t => t !== id) : [...p.techniques, id]
    }));
  };

  // Submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      if (formMode === 'evaluation') {
        if (!evalData.rescuerName || !evalData.date || !evalData.trainer) { toast.error('أكمل حقول التقييم الأساسية'); setIsLoading(false); return; }
        const dateObj = evalData.date ? new Date(evalData.date) : null;
        if (dateObj) dateObj.setHours(0,0,0,0);

        const { error } = await supabase.from('emergencyCases').insert({
          case_unique_id: uuidv4(), rescuer_name: evalData.rescuerName, rescuer_rank: evalData.rescuerRank,
          trainer: evalData.trainer, date: dateObj ? dateObj.toISOString() : null, case_code: evalData.caseCode,
          oxygen: evalData.oxygen, pulse: evalData.pulse, pressure: evalData.pressure,
          temperature: evalData.temperature, sugar: evalData.sugar, 
          techniques_used: evalData.techniques, case_details: evalData.caseDetails
        });
        if (error) throw error;
        toast.success('تم حفظ التقييم الفردي');
        setEvalData({ rescuerName: '', rescuerRank: '', trainer: '', date: null, caseCode: '', oxygen: '', pulse: '', pressure: '', temperature: '', sugar: '', techniques: [], caseDetails: '' });

      } else {
        // Mission Mode
        if (!missionData.senderName || !missionData.date) { toast.error('أكمل اسم المرسل والتاريخ'); setIsLoading(false); return; }
        const dateObj = missionData.date ? new Date(missionData.date) : null;
        if (dateObj) dateObj.setHours(0,0,0,0);

        const { error } = await supabase.from('teamMissions').insert({
          sender_name: missionData.senderName,
          mission_date: dateObj ? dateObj.toISOString() : null,
          case_code: missionData.caseCode,
          team_members: missionData.teamMembers,
          case_details: missionData.caseDetails,
          oxygen: missionData.oxygen, pulse: missionData.pulse, pressure: missionData.pressure,
          temperature: missionData.temperature, sugar: missionData.sugar, 
          techniques_used: missionData.techniques
        });
        if (error) throw error;
        toast.success('تم حفظ تقرير المهمة');
        setMissionData({ senderName: '', date: null, caseCode: '', oxygen: '', pulse: '', pressure: '', temperature: '', sugar: '', techniques: [], caseDetails: '', teamMembers: [{ name: '', rank: '' }] });
      }
    } catch (err) { console.error(err); toast.error('خطأ في الحفظ'); }
    finally { setIsLoading(false); }
  };

  // Dynamic Data based on mode
  const currentData = formMode === 'evaluation' ? evalData : missionData;
  const currentHandler = (e) => {
    const { name, value } = e.target;
    formMode === 'evaluation' 
      ? setEvalData(p => ({...p, [name]: value}))
      : setMissionData(p => ({...p, [name]: value}));
  };

  // Classes
  const inputClass = "w-full bg-[#0a0a0a] border border-slate-800 rounded-xl px-4 py-3 text-white focus:border-red-600 outline-none text-sm h-[48px] placeholder:text-slate-600 relative z-10";
  const selectBtnClass = "w-full bg-[#0a0a0a] border border-slate-800 rounded-xl px-4 py-3 text-white transition-all text-sm h-[48px] flex justify-between items-center cursor-pointer hover:border-slate-700";
  const labelClass = "text-[11px] font-bold text-slate-500 uppercase tracking-widest mr-1 mb-2 flex items-center gap-2";

  const CalendarPortalContainer = ({ children }) => createPortal(<div className="datepicker-portal-wrapper">{children}</div>, document.body);

  return (
    <div dir="rtl" className="min-h-screen bg-[#050505] text-slate-300 font-sans flex flex-col items-center overflow-x-hidden">
      <ToastContainer theme="dark" rtl position="top-center" autoClose={2000} />

      {/* Header */}
      <header className="w-full max-w-6xl px-4 py-6 sm:py-10 flex justify-between items-center border-b border-slate-900/50">
        <div className="flex items-center gap-3">
          <div className="relative"><Activity className="w-6 h-6 text-red-600" /><div className="absolute inset-0 bg-red-600 rounded-full blur-md opacity-50 animate-pulse"></div></div>
          <h1 className="text-xl sm:text-2xl font-black text-white tracking-tighter uppercase">نظام التقييم <span className="text-red-600">650</span></h1>
        </div>
        <button onClick={() => navigate('/admin/login')} className="px-4 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs font-bold hover:text-red-500 transition-all active:scale-95 flex items-center gap-2">
          <LogIn className="w-4 h-4" /> لوحة الإدارة
        </button>
      </header>

      <main className="w-full max-w-6xl px-4 sm:px-6 pt-8 pb-24 flex-grow">
        
        {/* Mode Switcher */}
        <div className="flex justify-center mb-10">
            <div className="bg-[#0d0d0d] p-2 rounded-2xl border border-slate-800 inline-flex gap-2">
                <button onClick={() => setFormMode('evaluation')} className={`px-4 sm:px-6 py-3 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center gap-2 ${formMode === 'evaluation' ? 'bg-red-600 text-white shadow-lg' : 'text-slate-400 hover:bg-slate-800'}`}>
                    <UserCheck className="w-4 h-4"/> تقييم فردي
                </button>
                <button onClick={() => setFormMode('mission')} className={`px-4 sm:px-6 py-3 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center gap-2 ${formMode === 'mission' ? 'bg-cyan-600 text-white shadow-lg' : 'text-slate-400 hover:bg-slate-800'}`}>
                    <Users className="w-4 h-4"/> تقرير جماعي
                </button>
            </div>
        </div>

        {/* Form Body */}
        <div className="bg-[#0d0d0d] border border-slate-800 rounded-[2rem] sm:rounded-[3rem] shadow-2xl overflow-hidden">
          <div className="px-6 py-5 sm:px-10 sm:py-8 bg-[#121212] border-b border-slate-800">
            <h2 className="text-[11px] sm:text-xs font-bold text-red-500 tracking-[0.3em] uppercase flex items-center gap-2">
              <FileText className="w-4 h-4" /> {formMode === 'evaluation' ? 'تقرير أداء فردي' : 'تقرير مهمة جماعية'}
            </h2>
          </div>

          <form onSubmit={handleSubmit} className="p-6 sm:p-12 space-y-10">
            
            {/* --- IDENTITY SECTION --- */}
            {formMode === 'evaluation' ? (
              // Individual Evaluation Inputs
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                 <div>
                    <label className={labelClass}><User className="w-3.5 h-3.5" /> اسم المسعف</label>
                    <input name="rescuerName" value={evalData.rescuerName} onChange={currentHandler} className={inputClass} placeholder="الاسم الكامل..." />
                 </div>
                 
                 {/* Rank Dropdown */}
                 <div className="relative" ref={rankRef}>
                    <label className={labelClass}><Shield className="w-3.5 h-3.5" /> الرتبة</label>
                    <div onClick={() => setOpenDropdown(p => ({...p, rank: !p.rank}))} className={selectBtnClass}>
                        <span>{evalData.rescuerRank || "اختر الرتبة..."}</span>
                        <ChevronDown className={`w-4 h-4 transition-transform ${openDropdown.rank ? 'rotate-180' : ''}`}/>
                    </div>
                    {openDropdown.rank && (
                        <div className="absolute z-50 w-full mt-2 bg-[#151515] border border-slate-700 rounded-2xl shadow-2xl p-3">
                           {rescuerRanks.map(r => <div key={r} onClick={() => {setEvalData(p => ({...p, rescuerRank: r})); setOpenDropdown(p => ({...p, rank: false}))}} className="px-4 py-2 rounded-xl hover:bg-red-600 cursor-pointer text-sm">{r}</div>)}
                        </div>
                    )}
                 </div>

                 {/* Trainer Dropdown */}
                 <div className="relative" ref={trainerRef}>
                    <label className={labelClass}><GraduationCap className="w-3.5 h-3.5" /> المدرب</label>
                    <div onClick={() => setOpenDropdown(p => ({...p, trainer: !p.trainer}))} className={selectBtnClass}>
                        <span>{evalData.trainer || "اختر المدرب..."}</span>
                        <ChevronDown className={`w-4 h-4 transition-transform ${openDropdown.trainer ? 'rotate-180' : ''}`}/>
                    </div>
                    {openDropdown.trainer && (
                        <div className="absolute z-50 w-full mt-2 bg-[#151515] border border-slate-700 rounded-2xl shadow-2xl p-3">
                           <input placeholder="بحث..." className="w-full bg-[#0a0a0a] border border-slate-800 rounded-lg px-3 py-2 text-xs mb-2 outline-none" onChange={(e) => setSearchQuery(e.target.value)} />
                           {trainers.filter(t => t.includes(searchQuery)).map(t => <div key={t} onClick={() => {setEvalData(p => ({...p, trainer: t})); setOpenDropdown(p => ({...p, trainer: false}))}} className="px-4 py-2 rounded-xl hover:bg-red-600 cursor-pointer text-sm">{t}</div>)}
                        </div>
                    )}
                 </div>
              </div>
            ) : (
              // Team Mission Inputs
              <div className="space-y-6">
                {/* Row 1: Sender, Date, Code */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div>
                        <label className={`${labelClass} text-cyan-400`}><User className="w-3.5 h-3.5" /> اسم المسعف (المرسل)</label>
                        <input name="senderName" value={missionData.senderName} onChange={currentHandler} className={inputClass} placeholder="اسم صاحب التقرير" />
                    </div>
                    <div>
                        <label className={`${labelClass} text-cyan-400`}><Calendar className="w-3.5 h-3.5" /> تاريخ المهمة</label>
                        <DatePicker 
                            selected={missionData.date} 
                            onChange={(d) => setMissionData(p => ({...p, date: d}))} 
                            locale="ar" dateFormat="yyyy/MM/dd" className={inputClass} 
                            calendarClassName="custom-dark-calendar" 
                            popperContainer={CalendarPortalContainer} 
                            placeholderText="يوم / شهر / سنة"
                            readOnly={true} 
                        />
                    </div>

                    {/* Case Code Dropdown */}
                    <div className="relative" ref={codeRef}>
                        <label className={`${labelClass} text-cyan-400`}><Tag className="w-3.5 h-3.5" /> كود الحالة</label>
                        <div onClick={() => setOpenDropdown(p => ({...p, code: !p.code}))} className={selectBtnClass}>
                            <div className="flex items-center gap-2">
                                {missionData.caseCode && React.createElement(caseCodeOptions.find(c => c.value === missionData.caseCode)?.Icon, { className: `w-4 h-4 ${caseCodeOptions.find(c => c.value === missionData.caseCode)?.color}` })}
                                <span>{missionData.caseCode ? caseCodeOptions.find(c => c.value === missionData.caseCode)?.label : "اختر التصنيف..."}</span>
                            </div>
                            <ChevronDown className={`w-4 h-4 text-slate-500 transition-transform ${openDropdown.code ? 'rotate-180' : ''}`}/>
                        </div>
                        {openDropdown.code && (
                            <div className="absolute z-50 w-full mt-2 bg-[#151515] border border-slate-700 rounded-2xl shadow-2xl p-3">
                                {caseCodeOptions.map(opt => (
                                    <div key={opt.value} onClick={() => { setMissionData(p => ({...p, caseCode: opt.value})); setOpenDropdown(p => ({...p, code: false})); }} className={`flex items-center gap-3 px-4 py-3 rounded-xl cursor-pointer text-sm ${opt.hoverBg}`}>
                                        <opt.Icon className={`w-5 h-5 ${opt.color}`}/> <span className="text-slate-200">{opt.label}</span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                {/* Team Members Card */}
                <div className="bg-[#0a0a0a] border border-slate-800 rounded-2xl p-4 sm:p-6">
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="text-sm font-bold text-slate-300 flex items-center gap-2"><Users className="w-4 h-4 text-cyan-400"/> أعضاء الفريق المساندين</h3>
                        <button type="button" onClick={addTeamMember} className="px-3 py-1.5 bg-cyan-600 text-white rounded-lg text-xs font-bold flex items-center gap-1 hover:bg-cyan-500 transition-colors">
                            <Plus className="w-3 h-3"/> إضافة عضو
                        </button>
                    </div>
                    
                    <div className="space-y-3">
                        {missionData.teamMembers.map((member, index) => (
                            <div key={index} className="relative bg-[#151515] p-3 sm:p-4 rounded-xl border border-slate-900 transition-all hover:border-slate-700">
                                {missionData.teamMembers.length > 1 && (
                                    <button type="button" onClick={() => removeTeamMember(index)} className="absolute top-2 left-2 text-slate-700 hover:text-red-500 transition-colors z-10">
                                        <Trash2 className="w-4 h-4"/>
                                    </button>
                                )}
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    <input type="text" placeholder="اسم العضو" value={member.name} onChange={(e) => updateTeamMember(index, 'name', e.target.value)} className="w-full bg-transparent border-b border-slate-700 pb-1 text-white outline-none focus:border-cyan-400 text-sm" />
                                    <select value={member.rank} onChange={(e) => updateTeamMember(index, 'rank', e.target.value)} className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs outline-none text-white appearance-none cursor-pointer">
                                        <option value="" disabled>الرتبة</option>
                                        {teamMemberRanks.map(r => <option key={r} value={r}>{r}</option>)}
                                    </select>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
              </div>
            )}

            {/* --- SHARED SECTIONS --- */}
            
            {/* Date & Code (Evaluation Only) */}
            {formMode === 'evaluation' && (
              <div className="border-t border-slate-900 pt-10">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <label className={`${labelClass} text-cyan-600`}><Calendar className="w-3.5 h-3.5" /> تاريخ الحالة</label>
                        <DatePicker 
                            selected={evalData.date} 
                            onChange={(d) => setEvalData(p => ({...p, date: d}))} 
                            locale="ar" dateFormat="yyyy/MM/dd" className={inputClass} 
                            calendarClassName="custom-dark-calendar" 
                            popperContainer={CalendarPortalContainer} 
                            placeholderText="يوم / شهر / سنة"
                            readOnly={true}
                        />
                    </div>
                    <div className="relative" ref={codeRef}>
                        <label className={`${labelClass} text-cyan-600`}><Tag className="w-3.5 h-3.5" /> كود الحالة</label>
                        <div onClick={() => setOpenDropdown(p => ({...p, code: !p.code}))} className={selectBtnClass}>
                            <div className="flex items-center gap-2">
                                {evalData.caseCode && React.createElement(caseCodeOptions.find(c => c.value === evalData.caseCode)?.Icon, { className: `w-4 h-4 ${caseCodeOptions.find(c => c.value === evalData.caseCode)?.color}` })}
                                <span>{evalData.caseCode ? caseCodeOptions.find(c => c.value === evalData.caseCode)?.label : "اختر التصنيف..."}</span>
                            </div>
                            <ChevronDown className={`w-4 h-4 text-slate-500 transition-transform ${openDropdown.code ? 'rotate-180' : ''}`}/>
                        </div>
                        {openDropdown.code && (
                            <div className="absolute z-50 w-full mt-2 bg-[#151515] border border-slate-700 rounded-2xl shadow-2xl p-3">
                                {caseCodeOptions.map(opt => (
                                    <div key={opt.value} onClick={() => { setEvalData(p => ({...p, caseCode: opt.value})); setOpenDropdown(p => ({...p, code: false})); }} className={`flex items-center gap-3 px-4 py-3 rounded-xl cursor-pointer text-sm ${opt.hoverBg}`}>
                                        <opt.Icon className={`w-5 h-5 ${opt.color}`}/> <span className="text-slate-200">{opt.label}</span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
              </div>
            )}

            {/* Vitals */}
            <div className="border-t border-slate-900 pt-10">
              <h3 className="text-[11px] font-bold text-slate-400 uppercase tracking-[0.3em] mb-6 flex items-center gap-2"><Stethoscope className="w-4 h-4" /> العلامات الحيوية</h3>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                <div className="relative">
                  <label className={labelClass}><Wind className={`w-3.5 h-3.5 ${getOxygenStyle(currentData.oxygen).cls}`} /> الأكسجة</label>
                  <input name="oxygen" value={currentData.oxygen} onChange={currentHandler} className={`${inputClass} text-left`} placeholder="%" dir="ltr" />
                </div>
                <div className="relative">
                  <label className={labelClass}><HeartPulse className="w-3.5 h-3.5 text-rose-500" style={getPulseAnimation(currentData.pulse)} fill="currentColor" /> النبض</label>
                  <input name="pulse" value={currentData.pulse} onChange={currentHandler} className={`${inputClass} text-left`} placeholder="BPM" dir="ltr" />
                </div>
                <div className="relative">
                  <label className={labelClass}><Activity className="w-3.5 h-3.5 text-indigo-400" /> الضغط</label>
                  <input name="pressure" value={currentData.pressure} onChange={currentHandler} className={`${inputClass} text-left`} placeholder="120/80" dir="ltr" />
                </div>
                <div className="relative">
                  <label className={labelClass}><Thermometer className={`w-3.5 h-3.5 ${getTempStyle(currentData.temperature)}`} /> الحرارة</label>
                  <input name="temperature" value={currentData.temperature} onChange={currentHandler} className={`${inputClass} text-left`} placeholder="C°" dir="ltr" />
                </div>
                <div className="relative">
                  <label className={labelClass}><Droplets className="w-3.5 h-3.5 text-red-400" /> السكر</label>
                  <input name="sugar" value={currentData.sugar} onChange={currentHandler} className={`${inputClass} text-left`} placeholder="mg/dL" dir="ltr" />
                </div>
              </div>
            </div>

            {/* Techniques */}
            <div className="border-t border-slate-900 pt-10">
              <h3 className="text-[11px] font-bold text-slate-400 uppercase tracking-[0.3em] mb-2 flex items-center gap-2"><Zap className="w-4 h-4" /> التقنيات المستخدمة</h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                {techniqueOptions.map((tech) => {
                  const isSelected = currentData.techniques.includes(tech.id);
                  return (
                    <button key={tech.id} type="button" onClick={() => toggleTechnique(tech.id, formMode === 'mission')}
                      className={`p-4 rounded-2xl border flex flex-col items-center justify-center gap-2 transition-all duration-200 group h-24 ${isSelected ? 'bg-red-900/30 border-red-600 shadow-[0_0_15px_rgba(220,38,38,0.2)]' : 'bg-[#0a0a0a] border-slate-800 hover:border-slate-700 hover:bg-slate-900/50'}`}>
                      <tech.Icon className={`w-6 h-6 transition-colors ${isSelected ? 'text-red-400' : 'text-slate-500 group-hover:text-slate-300'}`} />
                      <span className={`text-[11px] font-bold transition-colors text-center leading-tight ${isSelected ? 'text-white' : 'text-slate-400'}`}>{tech.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Details */}
            <div className="border-t border-slate-900 pt-10">
              <label className={labelClass}><FileText className="w-3.5 h-3.5" /> تفاصيل التقرير</label>
              <textarea name="caseDetails" value={currentData.caseDetails} onChange={currentHandler} className="w-full bg-[#0a0a0a] border border-slate-800 rounded-[1.5rem] p-6 text-white h-40 focus:border-red-600 outline-none resize-none text-sm placeholder:text-slate-700" placeholder="اكتب التقرير الميداني هنا..." />
            </div>

            <button type="submit" disabled={isLoading} className="w-full py-5 rounded-2xl bg-gradient-to-r from-red-700 to-rose-600 text-white font-black text-sm uppercase tracking-[0.4em] shadow-xl hover:shadow-red-600/30 active:scale-[0.99] transition-all disabled:opacity-50 flex items-center justify-center gap-3">
              {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <AlertTriangle className="w-5 h-5" />}
              {isLoading ? 'جاري الحفظ...' : 'اعتماد التقرير'}
            </button>
          </form>
        </div>
      </main>

      {/* Footer & Styles */}
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

      <style>{`
        @keyframes heartbeat { 0% { transform: scale(1); } 14% { transform: scale(1.25); } 28% { transform: scale(1); } 42% { transform: scale(1.15); } 70% { transform: scale(1); } }
        .animate-heartbeat { animation: heartbeat 1.5s ease-in-out infinite; }
        @keyframes breathe { 0%, 100% { transform: scale(1); opacity: 0.8; } 50% { transform: scale(1.2); opacity: 1; } }
        .animate-breathe { animation: breathe 3s ease-in-out infinite; }
        .animate-pulse-fast { animation: pulse 0.5s cubic-bezier(0.4, 0, 0.6, 1) infinite; }
        
        .custom-dark-calendar { background-color: #151515 !important; border: 1px solid #334155 !important; border-radius: 1.5rem !important; font-family: sans-serif !important; box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.8) !important; overflow: hidden; }
        .react-datepicker__header { background-color: #0f172a !important; border-bottom: 1px solid #334155 !important; }
        .react-datepicker__current-month, .react-datepicker__day-name, .react-datepicker__day { color: #cbd5e1 !important; }
        .react-datepicker__day--selected { background-color: #dc2626 !important; color: white !important; border-radius: 0.5rem !important; }
        .react-datepicker__day:hover { background-color: #475569 !important; border-radius: 0.5rem !important; }

        /* --- حل مشكلة الموبايل (توسيط التقويم ومنع لوحة المفاتيح) --- */
        .datepicker-portal-wrapper {
          position: fixed; /* تغطية كاملة للشاشة */
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          z-index: 99999;
          pointer-events: none; /* السماح بالنقر على الخلفية لإغلاق التقويم إن أردت */
          display: flex;
          align-items: center; /* توسيط عمودي */
          justify-content: center; /* توسيط أفقي */
        }

        /* السماح للتقويم نفسه باستقبال اللمس */
        .datepicker-portal-wrapper .react-datepicker-popper {
          pointer-events: auto;
          z-index: 100000;
          position: relative !important;
          transform: none !important;
        }

        /* تنسيقات الموبايل */
        @media (max-width: 768px) {
          .custom-dark-calendar {
            width: 90vw !important; /* عرض أكبر في الموبايل */
            font-size: 16px !important; /* حجم خط أكبر للسهولة */
          }
        }
      `}</style>
    </div>
  );
}

export default EmergencyForm;
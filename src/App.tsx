import React, { useState, useEffect } from 'react';
import { db, auth } from './firebase';
import { collection, addDoc, query, orderBy, onSnapshot, serverTimestamp, writeBatch, doc } from 'firebase/firestore';
import { onAuthStateChanged, signInWithPopup, GoogleAuthProvider, signOut } from 'firebase/auth';
import { SCALES } from './constants/scales';
import { ScaleType, Submission } from './types';
import { ChevronRight, CheckCircle2, LayoutDashboard, LogOut, Activity, ArrowLeft, Download, Plus, Save } from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import * as XLSX from 'xlsx';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export default function App() {
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    const handleError = (event: ErrorEvent) => {
      console.error("Caught global error:", event.error);
      setErrorInfo(event.error?.stack || event.error?.message || "Unknown error");
      setHasError(true);
    };
    window.addEventListener('error', handleError);
    return () => window.removeEventListener('error', handleError);
  }, []);

  const [errorInfo, setErrorInfo] = useState<string>('');
  const [isAuthLoading, setIsAuthLoading] = useState(import.meta.env.VITE_DEMO !== 'true');
  const [view, setView] = useState<'home' | 'form' | 'admin' | 'success'>('home');
  const [user, setUser] = useState<any>(null);
  const [isAdmin, setIsAdmin] = useState(false);

  if (isAuthLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-4">
          <Activity size={48} className="text-blue-600 animate-pulse" />
          <p className="text-slate-400 font-medium animate-pulse">Загрузка...</p>
        </div>
      </div>
    );
  }

  if (hasError) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-red-50 p-6 text-left overflow-auto">
        <div className="max-w-2xl w-full space-y-4">
          <h1 className="text-2xl font-bold text-red-600">Что-то пошло не так</h1>
          <p className="text-slate-600">Произошла ошибка при загрузке приложения. Пожалуйста, обновите страницу.</p>
          <pre className="bg-white p-4 border border-red-200 rounded text-xs text-red-700 whitespace-pre-wrap">
            {errorInfo}
          </pre>
        </div>
      </div>
    );
  }

  const [patientLastName, setPatientLastName] = useState('');
  const [patientFirstName, setPatientFirstName] = useState('');
  const [patientMiddleName, setPatientMiddleName] = useState('');
  const [patientPhone, setPatientPhone] = useState('');
  // Multi-scale state
  const [activeTabs, setActiveTabs] = useState<ScaleType[]>(['VAS']);
  const [currentTabIndex, setCurrentTabIndex] = useState(0);
  const [allResponses, setAllResponses] = useState<Record<ScaleType, Record<string, number>>>({} as any);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (import.meta.env.VITE_DEMO === 'true') return;
    return onAuthStateChanged(auth, (u) => {
      setUser(u);
      if (u?.email === import.meta.env.VITE_ADMIN_EMAIL) {
        setIsAdmin(true);
        setView('admin');
      } else {
        setIsAdmin(false);
        if (view === 'admin') setView('home');
      }
      setIsAuthLoading(false);
    });
  }, [view]);

  useEffect(() => {
    if (isAdmin && view === 'admin') {
      const q = query(collection(db, 'submissions'), orderBy('createdAt', 'desc'));
      return onSnapshot(q, (snapshot) => {
        setSubmissions(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Submission)));
      });
    }
  }, [isAdmin, view]);

  const handleToggleScale = (type: ScaleType) => {
    if (activeTabs.includes(type)) {
      if (activeTabs.length > 1) {
        const nextTabs = activeTabs.filter(t => t !== type);
        setActiveTabs(nextTabs);
        setCurrentTabIndex(0);
      }
    } else {
      setActiveTabs([...activeTabs, type]);
      setCurrentTabIndex(activeTabs.length);
    }
  };

  const currentScaleType = activeTabs[currentTabIndex];
  const currentScale = SCALES.find(s => s.id === currentScaleType);

  const handleResponseChange = (scaleId: ScaleType, qId: string, val: number) => {
    setAllResponses(prev => ({
      ...prev,
      [scaleId]: {
        ...(prev[scaleId] || {}),
        [qId]: val
      }
    }));
  };

  const handleSubmitAll = async () => {
    if (!patientLastName || !patientFirstName) return alert("Пожалуйста, введите фамилию и имя.");
    setIsSubmitting(true);

    try {
      const batch = writeBatch(db);
      const createdAt = serverTimestamp();

      for (const scaleType of activeTabs) {
        const responses = allResponses[scaleType] || {};
        const scale = SCALES.find(s => s.id === scaleType);
        const score = scale ? scale.calculateScore(responses) : 0;

        const subRef = doc(collection(db, 'submissions'));
        batch.set(subRef, {
          patientLastName,
          patientFirstName,
          patientMiddleName,
          patientPhone,
          scaleType,
          responses,
          score,
          createdAt,
          status: 'pending'
        });
      }

      await batch.commit();
      setView('success');
    } catch (error) {
      console.error("Error submitting forms:", error);
      alert("Ошибка при сохранении. Проверьте интернет-соединение.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const exportToExcel = () => {
    if (submissions.length === 0) return;

    const data = submissions.map(sub => ({
      'Дата': new Date(sub.createdAt?.toDate()).toLocaleString('ru-RU'),
      'Фамилия': sub.patientLastName,
      'Имя': sub.patientFirstName,
      'Отчество': sub.patientMiddleName,
      'Телефон': sub.patientPhone,
      'Шкала': sub.scaleType,
      'Результат (Баллы)': sub.score,
      'Ответы (JSON)': JSON.stringify(sub.responses)
    }));

    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Результаты");
    XLSX.writeFile(workbook, `Assessment_Results_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  const login = async () => {
    try {
      await signInWithPopup(auth, new GoogleAuthProvider());
    } catch (error: any) {
      console.error("Login error:", error);
      if (error.code === 'auth/popup-blocked') {
        alert("Пожалуйста, разрешите всплывающие окна в браузере для входа.");
      } else if (error.code === 'auth/popup-closed-by-user') {
        // User closed it, ignore
      } else {
        alert("Ошибка входа (" + error.code + "): " + error.message + "\nПопробуйте использовать другой браузер или отключить VPN, если проблема сохраняется.");
      }
    }
  };
  const logout = () => signOut(auth);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans selection:bg-blue-100">
      <header className="fixed top-0 w-full bg-white/80 backdrop-blur-md border-b border-slate-200 z-50">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2 cursor-pointer" onClick={() => setView('home')}>
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white">
              <Activity size={18} />
            </div>
            <span className="font-bold tracking-tight text-lg">ОртоПлатформа</span>
          </div>
          
          <div className="flex items-center gap-4">
            {isAdmin && (
              <>
                <button 
                  onClick={() => setView('home')}
                  className={cn(
                    "flex items-center gap-2 text-sm font-medium transition-colors p-2 rounded-lg",
                    view === 'home' ? "bg-blue-50 text-blue-600" : "text-slate-600 hover:text-slate-900"
                  )}
                >
                  <Plus size={16} />
                  <span className="hidden sm:inline">Новая анкета</span>
                </button>
                <button 
                  onClick={() => setView('admin')}
                  className={cn(
                    "flex items-center gap-2 text-sm font-medium transition-colors p-2 rounded-lg",
                    view === 'admin' ? "bg-blue-50 text-blue-600" : "text-slate-600 hover:text-slate-900"
                  )}
                >
                  <LayoutDashboard size={16} />
                  <span className="hidden sm:inline">Панель врача</span>
                </button>
              </>
            )}
            {!user ? (
              <button onClick={login} className="text-sm font-medium text-slate-600 hover:text-slate-900 px-4 py-2 bg-slate-100 rounded-lg">Вход для врача</button>
            ) : (
              <div className="flex items-center gap-3 pl-4 border-l border-slate-200">
                <div className="hidden lg:block text-right">
                  <p className="text-xs font-bold leading-none">{user.displayName || 'Врач'}</p>
                  <p className="text-[10px] text-slate-400 mt-1">{user.email}</p>
                </div>
                <button onClick={logout} className="p-2 text-slate-400 hover:text-red-500 transition-colors">
                  <LogOut size={16} />
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      <main className="pt-24 pb-16 px-6 max-w-6xl mx-auto">
        <div className="relative">
          {view === 'home' && (
            <div className="space-y-12">
              <div className="text-center space-y-4 pt-12">
                <h1 className="text-4xl sm:text-6xl font-black tracking-tight text-slate-900">
                  Медицинские анкеты
                </h1>
                <p className="text-slate-500 text-lg max-w-2xl mx-auto">
                  Выберите одну или несколько шкал для оценки вашего состояния перед приемом.
                </p>
              </div>

              <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-xl max-w-2xl mx-auto space-y-8">
                <div className="space-y-4">
                  <label className="text-sm font-bold uppercase tracking-wider text-slate-400">Контактная информация</label>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <input 
                      type="text" 
                      placeholder="Фамилия" 
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium text-sm"
                      value={patientLastName}
                      onChange={e => setPatientLastName(e.target.value)}
                    />
                    <input 
                      type="text" 
                      placeholder="Имя" 
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium text-sm"
                      value={patientFirstName}
                      onChange={e => setPatientFirstName(e.target.value)}
                    />
                    <input 
                      type="text" 
                      placeholder="Отчество" 
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium text-sm"
                      value={patientMiddleName}
                      onChange={e => setPatientMiddleName(e.target.value)}
                    />
                  </div>
                  <div className="grid grid-cols-1 gap-4">
                    <input 
                      type="tel" 
                      placeholder="Телефон" 
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium text-sm"
                      value={patientPhone}
                      onChange={e => setPatientPhone(e.target.value)}
                    />
                  </div>
                </div>

                <div className="space-y-4">
                  <label className="text-sm font-bold uppercase tracking-wider text-slate-400">Выберите шкалы для заполнения</label>
                  <div className="space-y-2">
                    {SCALES.map((scale) => (
                      <div 
                        key={scale.id} 
                        onClick={() => handleToggleScale(scale.id)}
                        className={cn(
                          "flex items-center justify-between p-4 rounded-xl border-2 cursor-pointer transition-all",
                          activeTabs.includes(scale.id) 
                            ? "border-blue-500 bg-blue-50/50" 
                            : "border-slate-100 hover:border-slate-200 bg-white"
                        )}
                      >
                        <div className="flex items-center gap-3">
                          <div className={cn(
                            "w-5 h-5 rounded-md flex items-center justify-center transition-colors",
                            activeTabs.includes(scale.id) ? "bg-blue-600 text-white" : "bg-slate-200"
                          )}>
                            {activeTabs.includes(scale.id) && <Plus size={14} className="rotate-45" />}
                          </div>
                          <div>
                            <p className="font-bold text-slate-800">{scale.title}</p>
                            <p className="text-xs text-slate-400">{scale.id}</p>
                          </div>
                        </div>
                        {activeTabs.includes(scale.id) && <span className="text-[10px] font-bold text-blue-600 bg-blue-100/50 px-2 py-0.5 rounded-full uppercase">Выбрано</span>}
                      </div>
                    ))}
                  </div>
                </div>

                <button 
                  disabled={!patientLastName || !patientFirstName || activeTabs.length === 0}
                  onClick={() => setView('form')}
                  className="w-full bg-slate-900 text-white font-bold py-4 rounded-2xl hover:bg-slate-800 disabled:opacity-50 active:scale-[0.98] transition-all shadow-xl shadow-slate-200 flex items-center justify-center gap-2"
                >
                  Начать заполнение
                  <ChevronRight size={20} />
                </button>
              </div>
            </div>
          )}

          {view === 'form' && currentScale && (
            <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-8">
              {/* Sidebar Tabs */}
              <div className="space-y-4">
                <div className="p-4 bg-white rounded-2xl border border-slate-200 mb-6">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Пациент</p>
                  <p className="font-black text-slate-900 truncate text-xs">{patientLastName} {patientFirstName}</p>
                  <button onClick={() => setView('home')} className="text-[10px] text-blue-600 font-bold hover:underline mt-1">Изменить данные</button>
                </div>

                <div className="space-y-2">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3 ml-2">Список шкал</p>
                  {activeTabs.map((tab, idx) => (
                    <button
                      key={tab}
                      onClick={() => setCurrentTabIndex(idx)}
                      className={cn(
                        "w-full flex items-center justify-between p-4 rounded-xl transition-all border font-bold text-left",
                        idx === currentTabIndex 
                          ? "bg-blue-600 border-blue-600 text-white shadow-lg shadow-blue-100" 
                          : "bg-white border-slate-100 text-slate-600 hover:border-slate-200"
                      )}
                    >
                      <span className="truncate text-sm">{SCALES.find(s => s.id === tab)?.id}</span>
                      {Object.keys(allResponses[tab] || {}).length > 0 && (
                         <div className={cn(
                            "w-2 h-2 rounded-full",
                            idx === currentTabIndex ? "bg-white" : "bg-green-500"
                         )} />
                      )}
                    </button>
                  ))}
                </div>

                <button 
                  onClick={handleSubmitAll}
                  disabled={isSubmitting}
                  className="w-full mt-8 bg-green-600 text-white font-bold py-4 rounded-xl hover:bg-green-700 active:scale-[0.98] transition-all shadow-lg shadow-green-100 flex items-center justify-center gap-2"
                >
                  {isSubmitting ? 'Отправка...' : 'Завершить все'}
                  <Save size={18} />
                </button>
              </div>

              {/* Form Content */}
              <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-2xl space-y-10 h-fit">
                <div className="border-b border-slate-100 pb-6">
                  <h2 className="text-3xl font-black text-slate-900 leading-tight">{currentScale.title}</h2>
                  <p className="text-slate-500 mt-2 text-sm">{currentScale.description}</p>
                </div>

                <div className="space-y-10">
                  {currentScale.sections.map((section, sIdx) => (
                    <div key={sIdx} className="space-y-8">
                       {section.title && (
                        <div className="flex items-center gap-3">
                          <div className="h-6 w-1 bg-blue-600 rounded-full" />
                          <h3 className="font-bold text-slate-900">{section.title}</h3>
                        </div>
                      )}
                      
                      <div className="space-y-12">
                        {section.questions.map((q) => (
                          <div key={q.id} className="space-y-4">
                            <label className="block text-slate-800 font-semibold text-lg leading-snug">
                              {q.text}
                            </label>
                            
                            {q.type === 'slider' && (
                              <div className="space-y-6 pt-2 pb-4">
                                <input 
                                  type="range" 
                                  min="0" 
                                  max={q.options ? (q.options.length - 1).toString() : "10"} 
                                  step="1"
                                  className="w-full h-5 bg-slate-100 rounded-full appearance-none cursor-pointer accent-blue-600 hover:accent-blue-700 transition-all focus:outline-none focus:ring-4 focus:ring-blue-100"
                                  value={
                                    q.options 
                                      ? Math.max(0, q.options.findIndex(o => o.value === (allResponses[currentScaleType]?.[q.id] ?? q.options![0].value)))
                                      : (allResponses[currentScaleType]?.[q.id] || 0)
                                  }
                                  onChange={(e) => {
                                    const index = parseInt(e.target.value);
                                    const newVal = q.options ? q.options[index].value : index;
                                    handleResponseChange(currentScaleType, q.id, newVal);
                                  }}
                                />
                                <div className="space-y-3">
                                  <div className="flex justify-between text-[10px] sm:text-xs text-slate-400 font-black px-1 uppercase tracking-widest leading-none">
                                    <span className="max-w-[120px]">{q.minLabel || (q.options ? q.options[0].label : '0')}</span>
                                    <span className="max-w-[120px] text-right">{q.maxLabel || (q.options ? q.options[q.options.length - 1].label : '10')}</span>
                                  </div>
                                  
                                  <div className="flex flex-col items-center gap-2">
                                    <div className="flex items-center gap-3 bg-blue-600 text-white px-6 py-2.5 rounded-2xl shadow-xl shadow-blue-100 transition-all transform animate-in fade-in slide-in-from-top-2 duration-300">
                                      <span className="text-2xl font-black">
                                        {allResponses[currentScaleType]?.[q.id] ?? (q.options ? q.options[0].value : 0)}
                                      </span>
                                      <div className="w-px h-6 bg-white/30" />
                                      <span className="text-sm font-bold leading-tight max-w-[200px] text-center">
                                        {q.options 
                                          ? q.options.find(o => o.value === (allResponses[currentScaleType]?.[q.id] ?? q.options![0].value))?.label 
                                          : (allResponses[currentScaleType]?.[q.id] || 0) === 0 ? q.minLabel : (allResponses[currentScaleType]?.[q.id] || 0) === 10 ? q.maxLabel : (allResponses[currentScaleType]?.[q.id] || 0) + ' баллов'
                                        }
                                      </span>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            )}

                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>

                <div className="flex justify-between items-center pt-10 border-t border-slate-100">
                  <button 
                    disabled={currentTabIndex === 0}
                    onClick={() => setCurrentTabIndex(currentTabIndex - 1)}
                    className="flex items-center gap-2 text-slate-400 hover:text-slate-900 transition-colors font-bold disabled:opacity-0"
                  >
                    <ArrowLeft size={18} />
                    Назад
                  </button>

                  {currentTabIndex < activeTabs.length - 1 ? (
                    <button 
                      onClick={() => setCurrentTabIndex(currentTabIndex + 1)}
                      className="bg-blue-600 text-white font-black px-10 py-4 rounded-xl hover:bg-blue-700 transition-all flex items-center gap-2 shadow-lg shadow-blue-100"
                    >
                      Далее
                      <ChevronRight size={18} />
                    </button>
                  ) : (
                    <button 
                      onClick={handleSubmitAll}
                      disabled={isSubmitting}
                      className="bg-green-600 text-white font-black px-10 py-4 rounded-xl hover:bg-green-700 transition-all flex items-center gap-2 shadow-lg shadow-green-100"
                    >
                      {isSubmitting ? 'Сохранение...' : 'Завершить'}
                      <CheckCircle2 size={18} />
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}

          {view === 'success' && (
            <div className="text-center py-24 space-y-10">
              <div className="w-32 h-32 bg-green-50 text-green-600 rounded-full flex items-center justify-center mx-auto ring-8 ring-green-50/50">
                <CheckCircle2 size={64} />
              </div>
              <div className="space-y-4">
                <h2 className="text-5xl font-black text-slate-900">Данные отправлены!</h2>
                <p className="text-slate-500 text-xl max-w-lg mx-auto">
                  Спасибо за заполнение. Ваши результаты успешно переданы в клинику.
                </p>
              </div>
              <button 
                onClick={() => {
                  setPatientLastName('');
                  setPatientFirstName('');
                  setPatientMiddleName('');
                  setPatientPhone('');
                  setAllResponses({} as any);
                  setActiveTabs(['VAS']);
                  setView('home');
                }}
                className="px-12 py-5 bg-slate-900 text-white rounded-2xl font-black hover:bg-slate-800 transition-all shadow-2xl shadow-slate-300"
              >
                Вернуться на главную
              </button>
            </div>
          )}

          {view === 'admin' && isAdmin && (
            <div className="space-y-8 pb-12">
               <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-6 bg-white p-8 rounded-3xl border border-slate-200 shadow-sm">
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-blue-600 mb-2">
                    <LayoutDashboard size={20} />
                    <span className="text-xs font-black uppercase tracking-widest">Админ-панель</span>
                  </div>
                  <h2 className="text-4xl font-black tracking-tight text-slate-900">Результаты осмотров</h2>
                  <p className="text-slate-500 text-sm">Всего получено <span className="font-bold text-slate-900">{submissions.length}</span> анкет.</p>
                </div>

                <div className="flex gap-2 w-full sm:w-auto">
                  <button 
                    onClick={exportToExcel}
                    className="flex-1 sm:flex-none flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700 text-white font-bold px-6 py-3 rounded-xl shadow-lg shadow-green-100 transition-all"
                  >
                    <Download size={18} />
                    Выгрузить в Excel
                  </button>
                  <button 
                    onClick={() => setView('home')}
                    className="flex-1 sm:flex-none flex items-center justify-center gap-2 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold px-6 py-3 rounded-xl transition-all"
                  >
                    <ArrowLeft size={18} />
                    Вернуться
                  </button>
                  <button 
                    onClick={logout}
                    className="flex-1 sm:flex-none flex items-center justify-center gap-2 bg-white border border-slate-200 hover:bg-slate-50 text-red-500 font-bold px-6 py-3 rounded-xl transition-all"
                  >
                    <LogOut size={18} />
                    Выйти
                  </button>
                </div>
              </div>

              <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50/50 border-b border-slate-100">
                      <th className="p-6 text-[10px] font-black uppercase tracking-widest text-slate-400">Дата</th>
                      <th className="p-6 text-[10px] font-black uppercase tracking-widest text-slate-400">Пациент</th>
                      <th className="p-6 text-[10px] font-black uppercase tracking-widest text-slate-400">Шкала</th>
                      <th className="p-6 text-[10px] font-black uppercase tracking-widest text-slate-400">Результат</th>
                      <th className="p-6 text-[10px] font-black uppercase tracking-widest text-slate-400">Действия</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {submissions.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="p-20 text-center text-slate-400 font-medium italic">
                          Данных пока нет...
                        </td>
                      </tr>
                    ) : (
                      submissions.map((sub) => (
                        <tr key={sub.id} className="hover:bg-slate-50/50 transition-colors">
                          <td className="p-6 text-sm text-slate-500 leading-tight">
                            {new Date(sub.createdAt?.toDate()).toLocaleDateString('ru-RU')}<br/>
                            <span className="text-[10px] opacity-70">{new Date(sub.createdAt?.toDate()).toLocaleTimeString('ru-RU')}</span>
                          </td>
                          <td className="p-6">
                            <p className="font-bold text-slate-900 text-sm leading-tight">
                              {sub.patientLastName} {sub.patientFirstName} {sub.patientMiddleName}
                            </p>
                            <p className="text-xs text-slate-400 mt-1">{sub.patientPhone}</p>
                          </td>
                          <td className="p-6">
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-black bg-blue-50 text-blue-700 uppercase tracking-tight">
                              {sub.scaleType}
                            </span>
                          </td>
                          <td className="p-6">
                             <div className="flex items-baseline gap-1">
                                <span className="text-xl font-black text-slate-900">{sub.score}</span>
                                <span className="text-[10px] text-slate-400 font-bold uppercase">б.</span>
                             </div>
                          </td>
                          <td className="p-6">
                             <button 
                              onClick={() => alert(JSON.stringify(sub.responses, null, 2))}
                              className="text-xs font-bold text-blue-600 hover:text-blue-800 transition-colors bg-blue-50 px-4 py-2 rounded-lg"
                             >
                               Подробнее
                             </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </main>

      <footer className="py-16 border-t border-slate-100 bg-white">
        <div className="max-w-6xl mx-auto px-6 grid grid-cols-1 md:grid-cols-[1fr_auto] gap-12 text-slate-400 text-sm">
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-slate-900">
              <Activity size={20} className="text-blue-600" />
              <span className="font-black tracking-tighter text-xl">ОртоПлатформа</span>
            </div>
            <p className="max-w-xs leading-relaxed">
              Профессиональная система оценки клинических исходов в ортопедии и травматологии. 
            </p>
            <p className="text-[10px] font-bold uppercase tracking-widest">&copy; 2026 Все права защищены</p>
          </div>
          <div className="flex gap-12 font-bold uppercase tracking-widest text-[10px] text-slate-400">
            <div className="flex flex-col gap-4">
               <span className="text-slate-900">Навигация</span>
               <a href="#" onClick={() => setView('home')} className="hover:text-blue-600 transition-colors">Главная</a>
               <a href="#" className="hover:text-blue-600 transition-colors">О сервисе</a>
            </div>
            <div className="flex flex-col gap-4">
               <span className="text-slate-900">Правовая информация</span>
               <a href="#" className="hover:text-blue-600 transition-colors">Конфиденциальность</a>
               <a href="#" className="hover:text-blue-600 transition-colors">Условия</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

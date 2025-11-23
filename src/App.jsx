import React, { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

// Daily Goal Tracker - Final Master Version (Smart Progress Logic)
// 🔑 IMPORTANT: PASTE YOUR GOOGLE GEMINI API KEY BELOW

const apiKey = import.meta.env.VITE_API_KEY; // <--- ENSURE YOUR KEY IS IN .env

// Helper: Call Gemini API
async function callGemini(prompt, systemInstruction = "You are a helpful assistant.") {
  if (!apiKey) {
    alert("Please add your Gemini API Key in the code (src/App.jsx) to use AI features.");
    return "";
  }
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key=${apiKey}`;
  const payload = { contents: [{ parts: [{ text: prompt }] }], systemInstruction: { parts: [{ text: systemInstruction }] } };
  let delay = 1000;
  for (let i = 0; i < 5; i++) {
    try {
      const response = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      const data = await response.json();
      return data.candidates?.[0]?.content?.parts?.[0]?.text || "";
    } catch (e) {
      if (i === 4) throw e;
      await new Promise(r => setTimeout(r, delay));
      delay *= 2;
    }
  }
}

// --- STORAGE HELPERS ---
const getStorageKey = (type, year, month) => {
  const mKey = `${year}-${String(month + 1).padStart(2, '0')}`;
  return type === 'events' ? `daily-goals-events-${mKey}` : `daily-goals-${mKey}`;
};

const loadInitialActivities = (year, month) => {
  try {
    const raw = localStorage.getItem(getStorageKey('activities', year, month));
    if (raw) return JSON.parse(raw);
  } catch (e) { console.warn(e); }
  return [{ id: Math.random().toString(36).slice(2, 9), name: 'Meditation', checks: {} }, { id: Math.random().toString(36).slice(2, 9), name: 'Exercise', checks: {} }, { id: Math.random().toString(36).slice(2, 9), name: 'Study', checks: {} }];
};

const loadInitialEvents = (year, month) => {
  try {
    const raw = localStorage.getItem(getStorageKey('events', year, month));
    if (raw) return JSON.parse(raw);
  } catch (e) { console.warn(e); }
  return {};
};

export default function DailyGoalTracker() {
  const today = new Date();
  
  // 1. Initialize Date State
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());

  // 2. LAZY INITIALIZATION
  const [activities, setActivities] = useState(() => loadInitialActivities(today.getFullYear(), today.getMonth()));
  const [events, setEvents] = useState(() => loadInitialEvents(today.getFullYear(), today.getMonth()));
  
  const [isDataLoaded, setIsDataLoaded] = useState(true);
  const isFirstRender = useRef(true);

  const [newActivityName, setNewActivityName] = useState('');
  const [lastRemoved, setLastRemoved] = useState(null);
  const [insight, setInsight] = useState(null);
  const [loadingInsight, setLoadingInsight] = useState(false);

  // span inputs
  const [pendingFrom, setPendingFrom] = useState('1');
  const [pendingTo, setPendingTo] = useState('1');
  const [dayFrom, setDayFrom] = useState(1);
  const [dayTo, setDayTo] = useState(1);
  const [spanError, setSpanError] = useState('');

  // UI state
  const [selectedDay, setSelectedDay] = useState(null);
  const scrollRef = useRef(null);
  const [darkMode, setDarkMode] = useState(() => {
    try { return localStorage.getItem('dg-dark-mode') === '1'; } catch (e) { return false; }
  });

  const monthNames = ['January','February','March','April','May','June','July','August','September','October','November','December'];
  const daysInMonth = (y,m) => new Date(y, m+1, 0).getDate();
  const dateString = (y,m,d) => `${y}-${String(m+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
  const weekdayShort = (y,m,d) => ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'][new Date(y,m,d).getDay()];

  // --- EFFECTS ---

  useEffect(() => {
    try { localStorage.setItem('dg-dark-mode', darkMode ? '1' : '0'); } catch (e) {}
    if (typeof document !== 'undefined') {
      if (darkMode) document.documentElement.classList.add('dark'); else document.documentElement.classList.remove('dark');
    }
  }, [darkMode]);

  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      const mt = daysInMonth(year, month);
      setDayFrom(1); setDayTo(mt); setPendingFrom('1'); setPendingTo(String(mt));
      return;
    }

    const mt = daysInMonth(year, month);
    setDayFrom(1); setDayTo(mt); setPendingFrom('1'); setPendingTo(String(mt));
    setSelectedDay(null); setInsight(null);

    setActivities(loadInitialActivities(year, month));
    setEvents(loadInitialEvents(year, month));
    setIsDataLoaded(true);
  }, [year, month]);

  useEffect(() => {
    if (!isDataLoaded) return;
    const actKey = getStorageKey('activities', year, month);
    const evKey = getStorageKey('events', year, month);
    try { localStorage.setItem(actKey, JSON.stringify(activities)); } catch (e) { console.warn(e); }
    try { localStorage.setItem(evKey, JSON.stringify(events)); } catch (e) { console.warn(e); }
  }, [activities, events, year, month, isDataLoaded]);

  useEffect(() => {
    if (!lastRemoved) return;
    const t = setTimeout(() => setLastRemoved(null), 7000);
    return () => clearTimeout(t);
  }, [lastRemoved]);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    function update() { }
    update();
    el.addEventListener('scroll', update, { passive: true });
    window.addEventListener('resize', update);
    return () => { el.removeEventListener('scroll', update); window.removeEventListener('resize', update); };
  }, [month, year]);

  // --- LOGIC ---

  function id() { return Math.random().toString(36).slice(2,9); }

  function addActivity() {
    const name = newActivityName.trim();
    if (!name) return;
    setActivities(prev => [...prev, { id: id(), name, checks: {} }]);
    setNewActivityName('');
  }

  function removeActivity(aid) {
    setActivities(prev => {
      const idx = prev.findIndex(p => p.id === aid);
      if (idx === -1) return prev;
      const copy = [...prev];
      const [removed] = copy.splice(idx, 1);
      setLastRemoved({ activity: removed, index: idx });
      return copy;
    });
  }

  function undoRemove() {
    if (!lastRemoved) return;
    setActivities(prev => {
      const copy = [...prev];
      const i = Math.min(Math.max(0, lastRemoved.index), copy.length);
      copy.splice(i, 0, lastRemoved.activity);
      return copy;
    });
    setLastRemoved(null);
  }

  function isFutureDay(d) {
    const cell = new Date(year, month, d);
    cell.setHours(0,0,0,0);
    const now = new Date(); now.setHours(0,0,0,0);
    return cell.getTime() > now.getTime();
  }

  function toggleCheck(activityId, day) {
    if (isFutureDay(day)) return;
    setActivities(prev => prev.map(act => {
      if (act.id !== activityId) return act;
      const copy = { ...act.checks };
      const k = dateString(year, month, day);
      if (copy[k]) delete copy[k]; else copy[k] = true;
      return { ...act, checks: copy };
    }));
  }

  // ⚠️ UPDATED LOGIC: Calculates progress up to TODAY if in current month
  function getEfficiencyData(act) {
    const mt = daysInMonth(year, month);
    
    // 1. Get the viewed range (User selected or full month)
    const start = Math.max(1, Math.min(dayFrom, mt));
    const end = Math.max(1, Math.min(dayTo, mt));
    const s = Math.min(start, end);
    const e = Math.max(start, end);

    // 2. Logic: If calculating for the CURRENT calendar month, cap the 'end' date at TODAY.
    let effectiveEnd = e;
    if (year === today.getFullYear() && month === today.getMonth()) {
      effectiveEnd = Math.min(e, today.getDate());
    }

    // Edge case: If the user explicitly selected a FUTURE ONLY range (e.g. 25-30 when today is 23)
    if (s > effectiveEnd) {
       return { checkedCount: 0, totalDays: 0, percent: 0 };
    }

    // 3. Calculate total days based on the EFFECTIVE end (up to today)
    const totalDays = effectiveEnd - s + 1;
    
    let checked = 0;
    for (let d = s; d <= effectiveEnd; d++) {
      if (act.checks[dateString(year, month, d)]) checked++;
    }
    
    const percent = totalDays <= 0 ? 0 : Math.round((checked / totalDays) * 100);
    return { checkedCount: checked, totalDays, percent };
  }

  function getCurrentStreak(act) {
    const mt = daysInMonth(year, month);
    let lastDay = Math.min(dayTo, mt);
    if (year === today.getFullYear() && month === today.getMonth()) lastDay = Math.min(lastDay, today.getDate());
    const startDay = Math.max(1, Math.min(dayFrom, mt));
    let cur = 0;
    for (let d = lastDay; d >= startDay; d--) {
      if (act.checks[dateString(year, month, d)]) cur++; else break;
    }
    return cur;
  }

  function percentColor(p) { if (p >= 75) return '#10b981'; if (p >= 40) return '#f59e0b'; return '#ef4444'; }

  const monthTotal = daysInMonth(year, month);
  const canApply = (() => {
    const a = Number(pendingFrom), b = Number(pendingTo);
    if (!Number.isInteger(a) || !Number.isInteger(b)) return false;
    if (a < 1 || b < 1 || a > monthTotal || b > monthTotal) return false;
    return a <= b;
   })();

  function applySpan() {
    setSpanError('');
    const a = Number(pendingFrom), b = Number(pendingTo);
    if (!Number.isInteger(a) || !Number.isInteger(b)) { setSpanError('Use whole numbers'); return; }
    if (a < 1 || b < 1 || a > monthTotal || b > monthTotal) { setSpanError(`Values must be 1..${monthTotal}`); return; }
    if (a > b) { setSpanError('From must be <= To'); return; }
    setDayFrom(a); setDayTo(b); setSelectedDay(null);
  }

  const spanStart = Math.min(dayFrom, dayTo);
  const spanEnd = Math.max(dayFrom, dayTo);
  const shownDays = Array.from({ length: Math.max(0, spanEnd - spanStart + 1) }, (_, i) => spanStart + i);

  function getEventsForDay(d) { return events[dateString(year, month, d)] || []; }
  
  function addEvent(d, ev) {
    const k = dateString(year, month, d);
    setEvents(prev => { const copy = { ...prev }; const arr = (copy[k] || []).slice(); arr.push({ id: id(), ...ev }); copy[k] = arr; return copy; });
  }
  function updateEvent(d, eventId, patch) {
    const k = dateString(year, month, d);
    setEvents(prev => { const copy = { ...prev }; const arr = (copy[k] || []).map(it => it.id === eventId ? { ...it, ...patch } : it); if (arr.length) copy[k] = arr; else delete copy[k]; return copy; });
  }
  function removeEvent(d, eventId) {
    const k = dateString(year, month, d);
    setEvents(prev => { const copy = { ...prev }; const arr = (copy[k] || []).filter(it => it.id !== eventId); if (arr.length) copy[k] = arr; else delete copy[k]; return copy; });
  }

  function goToTodayAndHighlight() {
    const td = new Date();
    const d = td.getDate();
    const m = td.getMonth();
    const y = td.getFullYear();

    if (year !== y || month !== m) {
      setYear(y); setMonth(m);
    }
    
    const mt = daysInMonth(y, m);
    setDayFrom(1); setDayTo(mt); setPendingFrom('1'); setPendingTo(String(mt));
    
    setSelectedDay(d);
    setTimeout(() => setSelectedDay(null), 1500); 

    if(scrollRef.current) {
       const scrollPos = (d - 1) * 64; 
       scrollRef.current.scrollTo({ left: scrollPos, behavior: 'smooth' });
    }
  }

  function handleMonthChange(e) { setMonth(Number(e.target.value)); }
  function handleYearChange(e) { setYear(Number(e.target.value || today.getFullYear())); }

  function dayBadgeColor(eventsForDay) {
    if (!eventsForDay || eventsForDay.length === 0) return { bg: 'bg-transparent', text: 'text-gray-700 dark:text-gray-200' };
    const hasImportant = eventsForDay.some(e => e.priority === 'Important');
    const hasExam = eventsForDay.some(e => e.type === 'Exam');
    if (hasImportant) return { bg: 'bg-amber-200 dark:bg-amber-400', text: 'text-amber-900 dark:text-amber-950' };
    if (hasExam) return { bg: 'bg-purple-200 dark:bg-purple-400', text: 'text-purple-900 dark:text-purple-950' };
    return { bg: 'bg-gray-200 dark:bg-gray-600', text: 'text-gray-900 dark:text-gray-50' };
  }

  function exportMonth() {
    const payload = { year, month, activities, events };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `daily-goals-${year}-${String(month+1).padStart(2,'0')}.json`; a.click(); URL.revokeObjectURL(url);
  }

  function importMonth(file) {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target.result);
        if (data && typeof data.year === 'number' && typeof data.month === 'number' && Array.isArray(data.activities)) {
          setYear(data.year); setMonth(data.month); setActivities(data.activities); setEvents(data.events || {}); alert('Imported');
        } else alert('Invalid file format');
      } catch (err) { alert('Failed to import'); }
    };
    reader.readAsText(file);
  }

  async function generateInsights() {
    setLoadingInsight(true);
    setInsight(null);
    try {
      const summary = activities.map(a => {
        const streak = getCurrentStreak(a);
        const { percent } = getEfficiencyData(a);
        return `${a.name}: ${percent}% completed, current streak ${streak} days.`;
      }).join('\n');

      const futureEvents = Object.entries(events)
        .filter(([k]) => {
          const d = new Date(k);
          return d >= new Date() && d.getMonth() === month;
        })
        .map(([k, evs]) => `${k}: ${evs.map(e => e.title).join(', ')}`)
        .join('\n');

      const prompt = `
        You are a motivational coach. Analyze this monthly habit data:
        ${summary}
        Upcoming events:
        ${futureEvents || "None"}
        Provide 3 short, punchy, encouraging sentences suitable for a dashboard. 
        Focus on praising consistency or encouraging improvement. Mention specific upcoming events if any.
        Do not use markdown formatting like bold/italic, just plain text.
      `;

      const result = await callGemini(prompt);
      setInsight(result || "Keep going — small wins add up!");
    } catch (err) {
      console.error(err);
      setInsight("Could not connect to AI coach right now. Keep going!");
    } finally {
      setLoadingInsight(false);
    }
  }

  return (
    <div className={`relative w-full min-h-screen p-4 md:p-8 transition-colors duration-500 ${darkMode ? 'bg-slate-900 text-gray-100' : 'bg-gradient-to-br from-indigo-50 via-purple-50 to-teal-50 text-gray-900'}`}>
      
      {/* Floating Glass Container */}
      <div className={`max-w-7xl mx-auto backdrop-blur-xl rounded-3xl shadow-2xl border border-white/20 p-6 md:p-8 transition-colors duration-500 ${darkMode ? 'bg-slate-900/70 shadow-black/50' : 'bg-white/60 shadow-indigo-100/50'}`}>
        
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
          <div>
            <h1 className="text-3xl font-extrabold bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 to-purple-600 dark:from-indigo-400 dark:to-purple-400">
              Daily Goal Tracker
            </h1>
            <div className="text-sm text-gray-500 dark:text-gray-400 mt-1">Your personal AI-powered growth companion.</div>
          </div>
          
          <div className="flex items-center gap-3 bg-white/50 dark:bg-slate-800/50 p-2 rounded-2xl border border-white/20 shadow-sm">
            <select 
              value={month} 
              onChange={handleMonthChange} 
              className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-600 text-gray-700 dark:text-gray-200 font-medium rounded-lg shadow-sm px-3 py-1.5 outline-none cursor-pointer focus:ring-2 focus:ring-indigo-500 transition-all"
            >
              {monthNames.map((m, i) => (<option key={m} value={i}>{m}</option>))}
            </select>

            <input 
              type="number" 
              value={year} 
              onChange={handleYearChange} 
              className="w-20 bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-600 text-center text-gray-700 dark:text-gray-200 font-medium rounded-lg shadow-sm px-2 py-1.5 outline-none focus:ring-2 focus:ring-indigo-500 transition-all" 
            />

            <button onClick={goToTodayAndHighlight} className="px-3 py-1.5 bg-indigo-100 text-indigo-700 dark:bg-indigo-900/50 dark:text-indigo-300 rounded-xl text-sm font-semibold hover:bg-indigo-200 transition-colors">Today</button>
            
            <div onClick={() => setDarkMode(!darkMode)} className={`w-14 h-8 flex items-center rounded-full p-1 cursor-pointer transition-colors duration-300 ${darkMode ? 'bg-slate-700 justify-end' : 'bg-indigo-200 justify-start'}`} title="Toggle Theme">
              <motion.div layout className="bg-white w-6 h-6 rounded-full shadow-md flex items-center justify-center text-sm select-none">
                {darkMode ? '🌙' : '☀️'}
              </motion.div>
            </div>
          </div>
        </div>

        {/* Controls & Insights */}
        <div className="mb-6 flex flex-wrap gap-3">
          <div className="flex-1 min-w-[250px] relative group">
            <input 
              className="w-full pl-4 pr-12 py-3 rounded-xl bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 focus:ring-2 focus:ring-indigo-500 outline-none transition-all shadow-sm group-hover:shadow-md text-gray-900 dark:text-white placeholder-gray-400" 
              placeholder="Add a new habit..." 
              value={newActivityName} 
              onChange={e => setNewActivityName(e.target.value)} 
              onKeyDown={e => { if (e.key === 'Enter') addActivity(); }} 
            />
            <button onClick={addActivity} className="absolute right-2 top-2 p-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors shadow-lg shadow-indigo-200 dark:shadow-none">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
            </button>
          </div>

          <button onClick={generateInsights} disabled={loadingInsight} className="px-5 py-3 bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white font-medium rounded-xl shadow-lg shadow-purple-200 dark:shadow-none hover:shadow-xl hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-70 disabled:cursor-not-allowed flex items-center gap-2">
             {loadingInsight ? <span className="animate-spin">🌀</span> : '✨'} AI Insights
          </button>
          
          <div className="flex gap-2 ml-auto">
             <button onClick={exportMonth} className="px-4 py-3 bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-gray-300 font-medium rounded-xl hover:bg-gray-200 dark:hover:bg-slate-700 transition-colors">Export</button>
             <label className="px-4 py-3 bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-gray-300 font-medium rounded-xl hover:bg-gray-200 dark:hover:bg-slate-700 transition-colors cursor-pointer">
               Import <input type="file" accept="application/json" className="hidden" onChange={e => e.target.files?.[0] && importMonth(e.target.files[0])} />
             </label>
          </div>
        </div>

        <AnimatePresence>
          {insight && (
            <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="mb-6">
              <div className="p-5 bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-indigo-950/30 dark:to-purple-950/30 border border-indigo-100 dark:border-indigo-900 rounded-2xl flex gap-4 relative shadow-inner">
                <div className="text-3xl">💡</div>
                <div className="flex-1 text-indigo-900 dark:text-indigo-200 text-sm leading-relaxed font-medium">{insight}</div>
                <button onClick={() => setInsight(null)} className="absolute top-3 right-3 text-indigo-400 hover:text-indigo-600 dark:hover:text-indigo-200">✕</button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Span Controls */}
        <div className={`mb-6 p-4 rounded-2xl border border-gray-100 dark:border-slate-700 flex flex-wrap items-center gap-3 transition-colors ${darkMode ? 'bg-slate-800/50' : 'bg-gray-50/50'}`}>
          <div className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">View Range</div>
          <input value={pendingFrom} onChange={e => { setPendingFrom(e.target.value); setSpanError(''); }} className="w-14 text-center p-1.5 rounded-lg bg-white dark:bg-slate-700 border border-gray-200 dark:border-slate-600 focus:border-indigo-500 outline-none" />
          <span className="text-gray-400">-</span>
          <input value={pendingTo} onChange={e => { setPendingTo(e.target.value); setSpanError(''); }} className="w-14 text-center p-1.5 rounded-lg bg-white dark:bg-slate-700 border border-gray-200 dark:border-slate-600 focus:border-indigo-500 outline-none" />
          <button disabled={!canApply} onClick={applySpan} className={`px-4 py-1.5 rounded-lg font-medium text-sm transition-all ${canApply ? 'bg-indigo-600 text-white shadow-md shadow-indigo-200 dark:shadow-none' : 'bg-gray-200 text-gray-400 dark:bg-slate-700 dark:text-slate-500'}`}>Set View</button>
          <button 
  onClick={() => { 
    setDayFrom(1); 
    setDayTo(daysInMonth(year, month)); 
    setPendingFrom('1'); 
    setPendingTo(String(daysInMonth(year, month))); 
  }} 
  className="px-3 py-1.5 text-sm text-gray-500 bg-blue-50 border border-blue-200 rounded-md hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
>
  Reset Full Month
</button>
          <div className="ml-2 text-xs font-medium text-rose-500">{spanError}</div>
        </div>

        {/* Main Grid */}
        <div ref={scrollRef} className="overflow-x-auto rounded-2xl border border-gray-100 dark:border-slate-700/50 shadow-sm bg-white dark:bg-slate-800 relative">
          <table className="w-full border-collapse">
            <thead>
              <tr>
                {/* ⚠️ STICKY LEFT HEADER # */}
                <th className="p-4 text-left text-xs font-bold text-gray-400 uppercase tracking-wider border-b border-r border-gray-100 dark:border-slate-700 sticky left-0 bg-gray-50 dark:bg-slate-900 z-30 w-16 min-w-[4rem] shadow-sm">#</th>
                
                {/* ⚠️ STICKY LEFT HEADER ACTIVITY */}
                <th className="p-4 text-left text-xs font-bold text-gray-400 uppercase tracking-wider border-b border-r border-gray-100 dark:border-slate-700 sticky left-16 bg-gray-50 dark:bg-slate-900 z-30 min-w-[180px] shadow-sm">ACTIVITY</th>
                
                {/* DAY HEADERS */}
                {shownDays.map(d => {
                  const evs = getEventsForDay(d);
                  const badge = dayBadgeColor(evs);
                  const isSelected = selectedDay === d;

                  return (
                    <motion.th key={d} onClick={() => setSelectedDay(prev => prev === d ? null : d)} className="p-2 border-b border-r border-gray-100 dark:border-slate-700 min-w-[64px] cursor-pointer group">
                      <div className={`
                        flex flex-col items-center justify-center rounded-xl py-2 transition-all duration-200 border border-transparent
                        ${isSelected 
                          ? 'bg-indigo-600 text-white shadow-md transform scale-105 z-10' 
                          : badge.bg !== 'bg-transparent'
                            ? `${badge.bg} ${badge.text}` 
                            : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-slate-700/50'
                        }
                      `}>
                        <div className="font-bold text-lg">{d}</div>
                        <div className={`text-[10px] uppercase font-semibold ${isSelected ? 'opacity-90' : 'opacity-60'}`}>{weekdayShort(year, month, d)}</div>
                      </div>
                    </motion.th>
                  );
                })}

                {/* ⚠️ STICKY RIGHT HEADER PROGRESS */}
                <th className="p-4 text-center text-xs font-extrabold text-gray-500 uppercase tracking-wider border-b border-l border-gray-100 dark:border-slate-700 min-w-[150px] sticky right-0 z-30 bg-gray-50 dark:bg-slate-900 shadow-sm">
                  Progress
                </th>
              </tr>
            </thead>
            <tbody>
              {activities.map((a, idx) => {
                const { checkedCount, totalDays, percent } = getEfficiencyData(a);
                const current = getCurrentStreak(a);
                return (
                  <tr key={a.id} className="group">
                    {/* ⚠️ STICKY LEFT BODY # */}
                    <td className="p-4 border-b border-r border-gray-100 dark:border-slate-700 font-medium text-gray-400 text-center sticky left-0 z-20 shadow-sm transition-colors bg-gray-50 dark:bg-slate-900 group-hover:bg-gray-100 dark:group-hover:bg-black">
                      {idx + 1}
                    </td>
                    
                    {/* ⚠️ STICKY LEFT BODY ACTIVITY */}
                    <td className="p-4 border-b border-r border-gray-100 dark:border-slate-700 sticky left-16 z-20 shadow-sm transition-colors align-top bg-gray-50 dark:bg-slate-900 group-hover:bg-gray-100 dark:group-hover:bg-black">
                      <div className="font-bold text-gray-800 dark:text-gray-100 text-lg">{a.name}</div>
                      <div className="flex items-center gap-2 mt-2">
                        <div className="text-xs px-2 py-1 rounded-md bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300 font-medium flex items-center gap-1">
                          🔥 {current} streak
                        </div>
                        <button onClick={() => removeActivity(a.id)} className="text-xs text-gray-400 hover:text-rose-500 transition-colors px-1">Delete</button>
                      </div>
                    </td>

                    {/* Checkboxes */}
                    {shownDays.map(d => {
                      const checked = !!a.checks[dateString(year, month, d)];
                      const future = isFutureDay(d);
                      return (
                        <td key={d} className={`p-2 border-b border-r border-gray-100 dark:border-slate-700 text-center group-hover:bg-gray-50 dark:group-hover:bg-slate-700 transition-colors ${selectedDay === d ? 'bg-indigo-50/50 dark:bg-indigo-900/10' : ''}`}>
                          <motion.button 
                            whileTap={{ scale: 0.8 }} 
                            disabled={future}
                            onClick={() => toggleCheck(a.id, d)}
                            className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all duration-300 mx-auto ${future ? 'opacity-20 cursor-not-allowed bg-gray-100 dark:bg-slate-800' : checked ? 'bg-emerald-500 text-white shadow-md shadow-emerald-200 dark:shadow-none' : 'bg-gray-100 border-2 border-gray-200 dark:bg-slate-900 dark:border-slate-700 hover:border-indigo-400 dark:hover:border-indigo-500'}`}
                          >
                            {checked && <motion.svg initial={{ scale: 0 }} animate={{ scale: 1 }} className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></motion.svg>}
                          </motion.button>
                        </td>
                      );
                    })}
                    
                    {/* ⚠️ STICKY RIGHT BODY PROGRESS */}
                    <td className="p-4 border-b border-l border-gray-100 dark:border-slate-700 bg-gray-50 dark:bg-slate-900 group-hover:bg-gray-100 dark:group-hover:bg-black transition-colors sticky right-0 z-20">
                      
                      {/* NEW: Fraction display above the bar */}
                      <div className="text-xs font-semibold text-gray-500 dark:text-gray-400 text-right mb-1">
                        {checkedCount} / {totalDays} days
                      </div>

                      <div className="flex items-center gap-3">
                        <div className="flex-1 h-2.5 bg-gray-100 dark:bg-slate-700 rounded-full overflow-hidden">
                          <motion.div 
                            initial={{ width: 0 }} 
                            animate={{ width: `${percent}%` }} 
                            transition={{ duration: 1, ease: "circOut" }}
                            style={{ backgroundColor: percentColor(percent) }} 
                            className="h-full rounded-full" 
                          />
                        </div>
                        <div className="text-base font-extrabold w-12 text-right text-gray-800 dark:text-gray-100">{percent}%</div>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {activities.length === 0 && (
                <tr>
                  <td colSpan={shownDays.length + 3} className="p-12 text-center text-gray-400">
                    <div className="mb-2 text-4xl">✨</div>
                    Add a habit above to start your journey!
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Events Panel */}
        <AnimatePresence>
          {selectedDay && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden mt-4">
              <DayEventsEditor
                key={`${year}-${month}-${selectedDay}`}
                dateKey={dateString(year, month, selectedDay)}
                day={selectedDay}
                events={getEventsForDay(selectedDay)}
                onAdd={ev => addEvent(selectedDay, ev)}
                onUpdate={(id, patch) => updateEvent(selectedDay, id, patch)}
                onRemove={id => removeEvent(selectedDay, id)}
                onClose={() => setSelectedDay(null)}
              />
            </motion.div>
          )}
        </AnimatePresence>

        {lastRemoved && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }} className="fixed bottom-8 right-8 bg-gray-900 text-white px-6 py-3 rounded-xl shadow-2xl flex items-center gap-4 z-50">
            <span>Deleted "{lastRemoved.activity.name}"</span>
            <button onClick={undoRemove} className="text-indigo-400 font-bold hover:underline">Undo</button>
          </motion.div>
        )}

      </div>
    </div>
  );
}

// Sub-component: Event Editor
function DayEventsEditor({ dateKey, day, events = [], onAdd, onUpdate, onRemove, onClose }) {
  const [title, setTitle] = useState('');
  const [type, setType] = useState('General');
  const [priority, setPriority] = useState('Normal');
  const [localEvents, setLocalEvents] = useState(events.slice());

  useEffect(() => setLocalEvents(events.slice()), [events]);

  function handleAdd(e) {
    e?.preventDefault();
    const t = title.trim();
    if (!t) return;
    const ev = { title: t, type, priority };
    onAdd && onAdd(ev);
    setTitle(''); setType('General'); setPriority('Normal');
  }

  function handleUpdate(id, patch) {
    onUpdate && onUpdate(id, patch);
  }

  function handleRemove(id) {
    if (!confirm('Remove event?')) return;
    onRemove && onRemove(id);
  }

  return (
    <div className="p-4 rounded-xl border border-gray-100 dark:border-slate-700 bg-gray-50 dark:bg-slate-800">
      <div className="flex items-center justify-between mb-3">
        <div className="font-semibold text-gray-900 dark:text-white">Events — {dateKey}</div>
        <div className="flex items-center gap-2">
          <button onClick={onClose} className="text-sm text-gray-500 hover:text-indigo-600">Close</button>
        </div>
      </div>

      <form onSubmit={handleAdd} className="grid grid-cols-1 md:grid-cols-4 gap-2 mb-3">
        <input value={title} onChange={e => setTitle(e.target.value)} placeholder="Event title" className="col-span-2 p-2 rounded-md bg-white dark:bg-slate-700 border border-gray-200 dark:border-slate-600 outline-none text-gray-900 dark:text-white" />
        <select value={type} onChange={e => setType(e.target.value)} className="p-2 rounded-md bg-white dark:bg-slate-700 border border-gray-200 dark:border-slate-600 outline-none text-gray-900 dark:text-white">
          <option>General</option>
          <option>Exam</option>
          <option>Meeting</option>
        </select>
        <select value={priority} onChange={e => setPriority(e.target.value)} className="p-2 rounded-md bg-white dark:bg-slate-700 border border-gray-200 dark:border-slate-600 outline-none text-gray-900 dark:text-white">
          <option>Normal</option>
          <option>Important</option>
        </select>
        <div className="md:col-span-4">
          <button type="submit" className="px-3 py-2 mt-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700">Add Event</button>
        </div>
      </form>

      <div className="space-y-2">
        {localEvents.length === 0 && <div className="text-sm text-gray-500">No events for this day.</div>}
        {localEvents.map(ev => {
          let bgClass = "bg-white dark:bg-slate-700 border-gray-100 dark:border-slate-600";
          if (ev.priority === 'Important') {
            bgClass = "bg-amber-100 dark:bg-amber-900/40 border-amber-200 dark:border-amber-700";
          } else if (ev.type === 'Exam') {
             bgClass = "bg-purple-100 dark:bg-purple-900/40 border-purple-200 dark:border-purple-700";
          }

          return (
            <div key={ev.id} className={`flex items-center justify-between p-2 rounded-md border ${bgClass}`}>
              <div>
                <div className="font-medium text-gray-900 dark:text-white">{ev.title}</div>
                <div className="text-xs text-gray-500 dark:text-gray-400">{ev.type} • {ev.priority}</div>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => {
                  const newTitle = prompt('Edit title', ev.title);
                  if (newTitle != null) handleUpdate(ev.id, { title: String(newTitle) });
                }} className="text-sm text-gray-500 hover:text-indigo-600 dark:hover:text-indigo-400">Edit</button>
                <button onClick={() => handleRemove(ev.id)} className="text-sm text-rose-500 hover:text-rose-700">Remove</button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
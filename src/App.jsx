import React, { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

// Daily Goal Tracker - Final Master Version (fixed handlers + DayEventsEditor included)
// 🔑 IMPORTANT: PASTE YOUR GOOGLE GEMINI API KEY BELOW
const apiKey = "AIzaSyDuRA1JQXBg_e0jn4L-AsBJkrw2CCWqecU"; // <--- PASTE YOUR KEY HERE

// Helper: Call Gemini API with exponential backoff
async function callGemini(prompt, systemInstruction = "You are a helpful assistant.") {
  if (!apiKey) {
    alert("Please add your Gemini API Key in the code (src/App.jsx) to use AI features.");
    return "";
  }

  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key=${apiKey}`;
  const payload = {
    contents: [{ parts: [{ text: prompt }] }],
    systemInstruction: { parts: [{ text: systemInstruction }] }
  };

  let delay = 1000;
  for (let i = 0; i < 5; i++) {
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
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

export default function DailyGoalTracker() {
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());
  const [activities, setActivities] = useState([]);
  const [events, setEvents] = useState({});
  const [newActivityName, setNewActivityName] = useState('');
  const [lastRemoved, setLastRemoved] = useState(null);
  const [isDataLoaded, setIsDataLoaded] = useState(false);
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
  const [showLeftFade, setShowLeftFade] = useState(false);
  const [showRightFade, setShowRightFade] = useState(false);

  // Dark mode state
  const [darkMode, setDarkMode] = useState(() => {
    try { return localStorage.getItem('dg-dark-mode') === '1'; } catch (e) { return false; }
  });

  useEffect(() => {
    try { localStorage.setItem('dg-dark-mode', darkMode ? '1' : '0'); } catch (e) {}
    if (typeof document !== 'undefined') {
      if (darkMode) document.documentElement.classList.add('dark'); else document.documentElement.classList.remove('dark');
    }
  }, [darkMode]);

  const monthNames = ['January','February','March','April','May','June','July','August','September','October','November','December'];
  const monthKey = (y,m) => `${y}-${String(m+1).padStart(2,'0')}`;
  const daysInMonth = (y,m) => new Date(y, m+1, 0).getDate();
  const dateString = (y,m,d) => `${y}-${String(m+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
  const weekdayShort = (y,m,d) => ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'][new Date(y,m,d).getDay()];

  useEffect(() => {
    const mt = daysInMonth(year, month);
    setDayFrom(1);
    setDayTo(mt);
    setPendingFrom('1');
    setPendingTo(String(mt));
    setSelectedDay(null);
    setInsight(null);

    const actKey = `daily-goals-${monthKey(year, month)}`;
    const rawAct = localStorage.getItem(actKey);
    if (rawAct) {
      try { setActivities(JSON.parse(rawAct)); } catch (e) { console.warn('parse fail', e); }
    } else {
      setActivities([{ id: id(), name: 'Meditation', checks: {} }, { id: id(), name: 'Exercise', checks: {} }, { id: id(), name: 'Study', checks: {} }]);
    }

    const evKey = `daily-goals-events-${monthKey(year, month)}`;
    const rawEv = localStorage.getItem(evKey);
    if (rawEv) {
      try { setEvents(JSON.parse(rawEv)); } catch (e) { console.warn('events parse fail', e); }
    } else {
      setEvents({});
    }
    setIsDataLoaded(true);
  }, [year, month]);

  useEffect(() => {
    if (!isDataLoaded) return;
    const actKey = `daily-goals-${monthKey(year, month)}`;
    try { localStorage.setItem(actKey, JSON.stringify(activities)); } catch (e) { console.warn(e); }
    const evKey = `daily-goals-events-${monthKey(year, month)}`;
    try { localStorage.setItem(evKey, JSON.stringify(events)); } catch (e) { console.warn(e); }
  }, [activities, events, year, month, isDataLoaded]);

  useEffect(() => {
    if (!lastRemoved) return;
    const t = setTimeout(() => setLastRemoved(null), 7000);
    return () => clearTimeout(t);
  }, [lastRemoved]);

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

  function getEfficiencyData(act) {
    const mt = daysInMonth(year, month);
    const start = Math.max(1, Math.min(dayFrom, mt));
    const end = Math.max(1, Math.min(dayTo, mt));
    const from = Math.min(start, end);
    const to = Math.max(start, end);
    const len = Math.max(0, to - from + 1);
    let checked = 0;
    for (let d = from; d <= to; d++) if (act.checks[dateString(year, month, d)]) checked++;
    const percent = len === 0 ? 0 : Math.round((checked / len) * 100);
    return { checkedCount: checked, totalDays: len, percent };
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

  function getBestStreak(act) {
    const mt = daysInMonth(year, month);
    let best = 0, cur = 0;
    for (let d = 1; d <= mt; d++) {
      if (act.checks[dateString(year, month, d)]) { cur++; best = Math.max(best, cur); } else cur = 0;
    }
    return best;
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

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    function update() {
      setShowLeftFade(el.scrollLeft > 8);
      setShowRightFade(el.scrollLeft + el.clientWidth < el.scrollWidth - 8);
    }
    update();
    el.addEventListener('scroll', update, { passive: true });
    window.addEventListener('resize', update);
    return () => { el.removeEventListener('scroll', update); window.removeEventListener('resize', update); };
  }, [month, year, spanStart, spanEnd]);

  function goToTodayAndHighlight() {
    // Don't lock data loaded here, just update state
    const td = new Date();
    const d = td.getDate();
    const m = td.getMonth();
    const y = td.getFullYear();

    // We only need to update year/month if they are different
    if (year !== y || month !== m) {
      setIsDataLoaded(false); // Will trigger reload
      setYear(y);
      setMonth(m);
    }

    // Reset span to include today
    setDayFrom(1);
    setDayTo(daysInMonth(y, m));
    setPendingFrom('1');
    setPendingTo(String(daysInMonth(y, m)));

    // Highlight today
    setSelectedDay(d);
    setTimeout(() => setSelectedDay(null), 1500); // Longer highlight

    // Scroll to today
    if(scrollRef.current) {
       // Simple calculation for scroll position (approximate)
       // 64px is column width + padding
       const scrollPos = (d - 1) * 64; 
       scrollRef.current.scrollTo({ left: scrollPos, behavior: 'smooth' });
    }
  }

  function handleMonthChange(e) { setIsDataLoaded(false); setMonth(Number(e.target.value)); }
  function handleYearChange(e) { setIsDataLoaded(false); setYear(Number(e.target.value || today.getFullYear())); }

  function dayBadgeColor(eventsForDay) {
    if (!eventsForDay || eventsForDay.length === 0) return { bg: 'bg-transparent', text: 'text-gray-700 dark:text-gray-200' };
    const hasImportant = eventsForDay.some(e => e.priority === 'Important');
    const hasExam = eventsForDay.some(e => e.type === 'Exam');
    if (hasImportant) return { bg: 'bg-yellow-400', text: 'text-yellow-900' };
    if (hasExam) return { bg: 'bg-purple-400', text: 'text-purple-900' };
    return { bg: 'bg-gray-100 dark:bg-gray-700', text: 'text-gray-900 dark:text-gray-50' };
  }

  function exportMonth() {
    const payload = { year, month, activities, events };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `daily-goals-${monthKey(year, month)}.json`; a.click(); URL.revokeObjectURL(url);
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
          // include events that are on or after today
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
            <select value={month} onChange={handleMonthChange} className="bg-transparent font-medium text-gray-700 dark:text-gray-200 outline-none cursor-pointer hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">
              {monthNames.map((m, i) => (<option key={m} value={i}>{m}</option>))}
            </select>
            <input type="number" value={year} onChange={handleYearChange} className="w-16 bg-transparent text-center font-medium text-gray-700 dark:text-gray-200 outline-none" />
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
          <button onClick={() => { setDayFrom(1); setDayTo(daysInMonth(year, month)); setPendingFrom('1'); setPendingTo(String(daysInMonth(year, month))); }} className="px-3 py-1.5 text-sm text-gray-500 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">Reset Full Month</button>
          <div className="ml-2 text-xs font-medium text-rose-500">{spanError}</div>
        </div>

        {/* Main Grid */}
        <div ref={scrollRef} className="overflow-x-auto rounded-2xl border border-gray-100 dark:border-slate-700/50 shadow-sm bg-white dark:bg-slate-800 relative">
          <table className="w-full border-collapse">
            <thead>
              <tr>
                {/* Sticky # column - Solid Background to Hide Scrolled Content */}
                <th className="p-4 text-left text-xs font-bold text-gray-400 uppercase tracking-wider border-b border-r border-gray-100 dark:border-slate-700 sticky left-0 bg-white dark:bg-slate-800 z-30 w-16 min-w-[4rem] shadow-sm">#</th>
                {/* Sticky Activity column - Solid Background to Hide Scrolled Content */}
                <th className="p-4 text-left text-xs font-bold text-gray-400 uppercase tracking-wider border-b border-r border-gray-100 dark:border-slate-700 sticky left-16 bg-white dark:bg-slate-800 z-30 min-w-[180px] shadow-sm">ACTIVITY</th>
                
                {shownDays.map(d => {
                  const evs = getEventsForDay(d);
                  const badge = dayBadgeColor(evs);
                  return (
                    <motion.th key={d} onClick={() => setSelectedDay(prev => prev === d ? null : d)} className={`p-2 border-b border-r border-gray-100 dark:border-slate-700 min-w-[64px] cursor-pointer transition-colors ${selectedDay === d ? 'bg-indigo-50 dark:bg-indigo-900/20' : 'hover:bg-gray-50 dark:hover:bg-slate-700/50'}`}>
                      <div className={`flex flex-col items-center justify-center rounded-xl py-2 ${selectedDay === d ? 'text-indigo-600 dark:text-indigo-400' : 'text-gray-600 dark:text-gray-400'}`}>
                        <div className="font-bold text-lg">{d}</div>
                        <div className="text-[10px] uppercase font-semibold opacity-60">{weekdayShort(year, month, d)}</div>
                        {evs.length > 0 && <div className={`mt-1 w-1.5 h-1.5 rounded-full ${badge.bg === 'bg-yellow-400' ? 'bg-amber-400' : 'bg-indigo-400'}`}></div>}
                      </div>
                    </motion.th>
                  );
                })}
                <th className="p-4 text-center text-xs font-bold text-gray-400 uppercase tracking-wider border-b border-gray-100 dark:border-slate-700 min-w-[150px]">Progress</th>
              </tr>
            </thead>
            <tbody>
              {activities.map((a, idx) => {
                const { checkedCount, totalDays, percent } = getEfficiencyData(a);
                const current = getCurrentStreak(a);
                return (
                  <tr key={a.id} className="group">
                    {/* Sticky Number Column - Solid Background on Hover */}
                    <td className="p-4 border-b border-r border-gray-100 dark:border-slate-700 font-medium text-gray-400 text-center sticky left-0 z-20 shadow-sm transition-colors bg-white dark:bg-slate-800 group-hover:bg-gray-50 dark:group-hover:bg-slate-700">
                      {idx + 1}
                    </td>
                    
                    {/* Sticky Activity Name Column - Solid Background on Hover */}
                    <td className="p-4 border-b border-r border-gray-100 dark:border-slate-700 sticky left-16 z-20 shadow-sm transition-colors align-top bg-white dark:bg-slate-800 group-hover:bg-gray-50 dark:group-hover:bg-slate-700">
                      <div className="font-bold text-gray-800 dark:text-gray-100 text-lg">{a.name}</div>
                      <div className="flex items-center gap-2 mt-2">
                        <div className="text-xs px-2 py-1 rounded-md bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300 font-medium flex items-center gap-1">
                          🔥 {current} streak
                        </div>
                        <button onClick={() => removeActivity(a.id)} className="text-xs text-gray-400 hover:text-rose-500 transition-colors px-1">Delete</button>
                      </div>
                    </td>

                    {/* Scrolling Checkboxes - Matching Solid Background on Hover */}
                    {shownDays.map(d => {
                      const checked = !!a.checks[dateString(year, month, d)];
                      const future = isFutureDay(d);
                      return (
                        <td key={d} className={`p-2 border-b border-r border-gray-100 dark:border-slate-700 text-center group-hover:bg-gray-50 dark:group-hover:bg-slate-700 transition-colors ${selectedDay === d ? 'bg-indigo-50/50 dark:bg-indigo-900/10' : ''}`}>
                          <motion.button 
                            whileTap={{ scale: 0.8 }} 
                            disabled={future}
                            onClick={() => toggleCheck(a.id, d)}
                            // CHANGED HERE: Dark mode now uses bg-slate-900 (deep slot) to stand out from slate-800 row
                            className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all duration-300 mx-auto ${future ? 'opacity-20 cursor-not-allowed bg-gray-100 dark:bg-slate-800' : checked ? 'bg-emerald-500 text-white shadow-md shadow-emerald-200 dark:shadow-none' : 'bg-gray-100 border-2 border-gray-200 dark:bg-slate-900 dark:border-slate-700 hover:border-indigo-400 dark:hover:border-indigo-500'}`}
                          >
                            {checked && <motion.svg initial={{ scale: 0 }} animate={{ scale: 1 }} className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></motion.svg>}
                          </motion.button>
                        </td>
                      );
                    })}
                    <td className="p-4 border-b border-gray-100 dark:border-slate-700 group-hover:bg-gray-50 dark:group-hover:bg-slate-700 transition-colors">
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
                        <div className="text-sm font-bold w-10 text-right text-gray-600 dark:text-gray-300">{percent}%</div>
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

// ------------------------------------------------------------------
// DayEventsEditor: small self-contained component included so the file runs.
// UI matches the app styling and uses provided callbacks: onAdd, onUpdate, onRemove, onClose
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
        <div className="font-semibold">Events — {dateKey}</div>
        <div className="flex items-center gap-2">
          <button onClick={onClose} className="text-sm text-gray-500 hover:text-indigo-600">Close</button>
        </div>
      </div>

      <form onSubmit={handleAdd} className="grid grid-cols-1 md:grid-cols-4 gap-2 mb-3">
        <input value={title} onChange={e => setTitle(e.target.value)} placeholder="Event title" className="col-span-2 p-2 rounded-md bg-white dark:bg-slate-700 border border-gray-200 dark:border-slate-600 outline-none" />
        <select value={type} onChange={e => setType(e.target.value)} className="p-2 rounded-md bg-white dark:bg-slate-700 border border-gray-200 dark:border-slate-600 outline-none">
          <option>General</option>
          <option>Exam</option>
          <option>Meeting</option>
        </select>
        <select value={priority} onChange={e => setPriority(e.target.value)} className="p-2 rounded-md bg-white dark:bg-slate-700 border border-gray-200 dark:border-slate-600 outline-none">
          <option>Normal</option>
          <option>Important</option>
        </select>
        <div className="md:col-span-4">
          <button type="submit" className="px-3 py-2 mt-2 bg-indigo-600 text-white rounded-md">Add Event</button>
        </div>
      </form>

      <div className="space-y-2">
        {localEvents.length === 0 && <div className="text-sm text-gray-500">No events for this day.</div>}
        {localEvents.map(ev => (
          <div key={ev.id} className="flex items-center justify-between p-2 rounded-md bg-white dark:bg-slate-700 border border-gray-100 dark:border-slate-600">
            <div>
              <div className="font-medium">{ev.title}</div>
              <div className="text-xs text-gray-500">{ev.type} • {ev.priority}</div>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={() => {
                const newTitle = prompt('Edit title', ev.title);
                if (newTitle != null) handleUpdate(ev.id, { title: String(newTitle) });
              }} className="text-sm text-gray-500 hover:text-indigo-600">Edit</button>
              <button onClick={() => handleRemove(ev.id)} className="text-sm text-rose-500">Remove</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

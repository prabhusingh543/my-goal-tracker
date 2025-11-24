import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

// Notion-style Glow Variants
const eventCardVariants = {
  hidden: { opacity: 0, y: 10 },
  visible: { opacity: 1, y: 0 },
  hover: { 
    scale: 1.02,
    y: -2,
    boxShadow: "0px 10px 20px rgba(0,0,0,0.1), 0px 4px 6px rgba(0,0,0,0.05)",
    transition: { duration: 0.2, ease: "easeOut" }
  },
  tap: { scale: 0.98 }
};

export default function DayEventsEditor({ dateKey, day, events = [], onAdd, onUpdate, onRemove, onClose }) {
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

  // Dynamic Shadow Color based on Priority/Type
  const getGlowColor = (priority, type) => {
    if (priority === 'Important') return 'rgba(245, 158, 11, 0.4)'; // Amber Glow
    if (type === 'Exam') return 'rgba(168, 85, 247, 0.4)'; // Purple Glow
    return 'rgba(99, 102, 241, 0.3)'; // Indigo Glow (Default)
  };

  return (
    <div className="p-3 md:p-4 rounded-xl border border-gray-100 dark:border-slate-700 bg-gray-50 dark:bg-slate-800">
      <div className="flex items-center justify-between mb-3">
        <div className="font-semibold text-gray-900 dark:text-white text-sm md:text-base">Events — {dateKey}</div>
        <div className="flex items-center gap-2">
          <button onClick={onClose} className="text-xs md:text-sm text-gray-500 hover:text-indigo-600">Close</button>
        </div>
      </div>

      <form onSubmit={handleAdd} className="grid grid-cols-1 md:grid-cols-4 gap-2 mb-3">
        <input value={title} onChange={e => setTitle(e.target.value)} placeholder="Event title" className="col-span-1 md:col-span-2 p-2 rounded-md bg-white dark:bg-slate-700 border border-gray-200 dark:border-slate-600 outline-none text-gray-900 dark:text-white text-sm" />
        <select value={type} onChange={e => setType(e.target.value)} className="p-2 rounded-md bg-white dark:bg-slate-700 border border-gray-200 dark:border-slate-600 outline-none text-gray-900 dark:text-white text-sm">
          <option>General</option>
          <option>Exam</option>
          <option>Meeting</option>
        </select>
        <select value={priority} onChange={e => setPriority(e.target.value)} className="p-2 rounded-md bg-white dark:bg-slate-700 border border-gray-200 dark:border-slate-600 outline-none text-gray-900 dark:text-white text-sm">
          <option>Normal</option>
          <option>Important</option>
        </select>
        <div className="md:col-span-4">
          <button type="submit" className="w-full md:w-auto px-3 py-2 mt-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 text-sm font-medium">Add Event</button>
        </div>
      </form>

      <div className="space-y-2">
        {localEvents.length === 0 && <div className="text-sm text-gray-500">No events for this day.</div>}
        
        <AnimatePresence mode="popLayout">
          {localEvents.map(ev => {
            let bgClass = "bg-white dark:bg-slate-700 border-gray-200 dark:border-slate-600";
            if (ev.priority === 'Important') {
              bgClass = "bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-700/50";
            } else if (ev.type === 'Exam') {
              bgClass = "bg-purple-50 dark:bg-purple-900/20 border-purple-200 dark:border-purple-700/50";
            }

            const glowColor = getGlowColor(ev.priority, ev.type);

            return (
              <motion.div 
                key={ev.id} 
                layout
                variants={eventCardVariants}
                initial="hidden"
                animate="visible"
                exit="hidden"
                whileHover={{ 
                    ...eventCardVariants.hover,
                    boxShadow: `0px 12px 24px -8px ${glowColor}, 0px 4px 8px -4px rgba(0,0,0,0.1)` 
                }}
                whileTap="tap"
                className={`flex items-center justify-between p-3 rounded-lg border ${bgClass} cursor-default relative overflow-hidden group`}
              >
                {/* Subtle sheen effect on hover */}
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:animate-[shimmer_1.5s_infinite] pointer-events-none" />

                <div className="overflow-hidden mr-2 relative z-10">
                  <div className="font-medium text-gray-900 dark:text-white text-sm truncate">{ev.title}</div>
                  <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 flex items-center gap-2">
                    <span className={`px-1.5 py-0.5 rounded text-[10px] uppercase font-bold tracking-wider ${ev.type === 'Exam' ? 'bg-purple-100 text-purple-700' : 'bg-gray-100 text-gray-600 dark:bg-slate-600 dark:text-gray-300'}`}>
                        {ev.type}
                    </span>
                    {ev.priority === 'Important' && <span className="text-amber-500 font-semibold">★ Important</span>}
                  </div>
                </div>
                
                <div className="flex items-center gap-2 shrink-0 relative z-10 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                  <button onClick={() => {
                    const newTitle = prompt('Edit title', ev.title);
                    if (newTitle != null) handleUpdate(ev.id, { title: String(newTitle) });
                  }} className="p-1 hover:bg-black/5 dark:hover:bg-white/10 rounded text-gray-400 hover:text-indigo-500">
                     <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
                  </button>
                  <button onClick={() => handleRemove(ev.id)} className="p-1 hover:bg-black/5 dark:hover:bg-white/10 rounded text-gray-400 hover:text-rose-500">
                     <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                  </button>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>

      {/* Add Shimmer Animation Keyframes to global style if not using Tailwind config */}
      <style>{`
        @keyframes shimmer {
            0% { transform: translateX(-100%); }
            100% { transform: translateX(200%); }
        }
      `}</style>
    </div>
  );
}
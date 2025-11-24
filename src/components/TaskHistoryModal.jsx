import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { getAllEventsHistory } from '../utils/helpers';

export default function TaskHistoryModal({ onClose, onDataChange }) {
  const [history, setHistory] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');

  // Load data on mount
  useEffect(() => {
    setHistory(getAllEventsHistory());
  }, []);

  // Handle Deletion
  const handleDelete = (eventToDelete) => {
    if (!confirm(`Delete "${eventToDelete.title}"?`)) return;

    try {
      const raw = localStorage.getItem(eventToDelete.storageKey);
      if (raw) {
        const data = JSON.parse(raw);
        const dateKey = eventToDelete.date;

        if (data[dateKey]) {
          data[dateKey] = data[dateKey].filter(ev => ev.id !== eventToDelete.id);
          if (data[dateKey].length === 0) delete data[dateKey];

          localStorage.setItem(eventToDelete.storageKey, JSON.stringify(data));
          setHistory(prev => prev.filter(ev => ev.id !== eventToDelete.id));
          if (onDataChange) onDataChange();
        }
      }
    } catch (e) { console.error("Delete failed", e); }
  };

  // Filter based on search
  const filteredHistory = history.filter(ev => 
    ev.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    ev.date.includes(searchTerm)
  );

  return (
    <motion.div 
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
      onClick={onClose}
    >
      <motion.div 
        initial={{ scale: 0.95, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 20 }}
        onClick={e => e.stopPropagation()}
        className="w-full max-w-2xl bg-white dark:bg-slate-800 rounded-2xl shadow-2xl border border-white/20 flex flex-col max-h-[85vh] overflow-hidden"
      >
        {/* Header */}
        <div className="p-5 border-b border-gray-100 dark:border-slate-700 flex items-center justify-between bg-gray-50/50 dark:bg-slate-900/50">
          <div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <span>📜</span> Global Task History
            </h2>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">All notes from all months in one place.</p>
          </div>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-slate-700 text-gray-500 transition-colors">✕</button>
        </div>

        {/* Search Bar */}
        <div className="p-4 border-b border-gray-100 dark:border-slate-700">
          <input 
            type="text" 
            placeholder="Search by title or date (YYYY-MM-DD)..." 
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full px-4 py-2 rounded-xl bg-gray-100 dark:bg-slate-700/50 border-none outline-none text-gray-800 dark:text-gray-100 placeholder-gray-400 focus:ring-2 focus:ring-indigo-500 transition-all"
          />
        </div>

        {/* List */}
        <div className="overflow-y-auto p-4 custom-scrollbar space-y-3">
          {filteredHistory.length === 0 ? (
            <div className="text-center py-10 text-gray-400">No tasks found.</div>
          ) : (
            <AnimatePresence>
              {filteredHistory.map(ev => {
                
                // --- DYNAMIC STYLING LOGIC ---
                let cardStyle = "bg-white dark:bg-slate-700/30 border-gray-100 dark:border-slate-600"; // Default
                
                if (ev.priority === 'Important') {
                  // Amber Glow for Important
                  cardStyle = "bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-700/50";
                } else if (ev.type === 'Exam') {
                  // Purple Glow for Exam
                  cardStyle = "bg-purple-50 dark:bg-purple-900/20 border-purple-200 dark:border-purple-700/50";
                }
                // -----------------------------

                return (
                  <motion.div 
                    key={`${ev.id}-${ev.date}`}
                    layout
                    initial={{ opacity: 0, x: -20 }} 
                    animate={{ opacity: 1, x: 0 }} 
                    exit={{ opacity: 0, x: 20 }}
                    className={`group flex items-center justify-between p-4 border rounded-xl hover:shadow-md transition-all ${cardStyle}`}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-300">
                          {ev.date}
                        </span>
                        
                        {/* Chips */}
                        {ev.type === 'Exam' && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-purple-100 text-purple-700 dark:bg-purple-500/20 dark:text-purple-300 font-medium">
                            Exam
                          </span>
                        )}
                        {ev.priority === 'Important' && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300 font-bold flex items-center gap-1">
                            ★ Important
                          </span>
                        )}
                        {/* Show type if standard */}
                        {ev.type !== 'Exam' && ev.priority !== 'Important' && (
                           <span className="text-[10px] px-1.5 py-0.5 rounded bg-gray-100 text-gray-500 dark:bg-slate-600 dark:text-slate-300">
                             {ev.type}
                           </span>
                        )}
                      </div>
                      <h3 className="font-semibold text-gray-800 dark:text-gray-100 truncate">{ev.title}</h3>
                    </div>

                    <button 
                      onClick={() => handleDelete(ev)}
                      className="ml-3 p-2 text-gray-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/20 rounded-lg transition-colors"
                      title="Delete permanently"
                    >
                      <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                    </button>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}
import React, { useState, useEffect } from 'react';

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
        {localEvents.map(ev => {
          let bgClass = "bg-white dark:bg-slate-700 border-gray-100 dark:border-slate-600";
          if (ev.priority === 'Important') {
            bgClass = "bg-amber-100 dark:bg-amber-900/40 border-amber-200 dark:border-amber-700";
          } else if (ev.type === 'Exam') {
             bgClass = "bg-purple-100 dark:bg-purple-900/40 border-purple-200 dark:border-purple-700";
          }

          return (
            <div key={ev.id} className={`flex items-center justify-between p-2 rounded-md border ${bgClass}`}>
              <div className="overflow-hidden mr-2">
                <div className="font-medium text-gray-900 dark:text-white text-sm truncate">{ev.title}</div>
                <div className="text-xs text-gray-500 dark:text-gray-400">{ev.type} • {ev.priority}</div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button onClick={() => {
                  const newTitle = prompt('Edit title', ev.title);
                  if (newTitle != null) handleUpdate(ev.id, { title: String(newTitle) });
                }} className="text-xs text-gray-500 hover:text-indigo-600 dark:hover:text-indigo-400">Edit</button>
                <button onClick={() => handleRemove(ev.id)} className="text-xs text-rose-500 hover:text-rose-700">Remove</button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
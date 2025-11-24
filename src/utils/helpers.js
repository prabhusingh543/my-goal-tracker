export const monthNames = ['January','February','March','April','May','June','July','August','September','October','November','December'];

export const daysInMonth = (y, m) => new Date(y, m + 1, 0).getDate();
export const dateString = (y, m, d) => `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
export const weekdayShort = (y, m, d) => ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][new Date(y, m, d).getDay()];

export const getStorageKey = (type, year, month) => {
  const mKey = `${year}-${String(month + 1).padStart(2, '0')}`;
  return type === 'events' ? `daily-goals-events-${mKey}` : `daily-goals-${mKey}`;
};

export const loadInitialActivities = (year, month) => {
  try {
    const raw = localStorage.getItem(getStorageKey('activities', year, month));
    if (raw) return JSON.parse(raw);
  } catch (e) { console.warn(e); }
  return [
    { id: Math.random().toString(36).slice(2, 9), name: 'Meditation', checks: {} },
    { id: Math.random().toString(36).slice(2, 9), name: 'Exercise', checks: {} },
    { id: Math.random().toString(36).slice(2, 9), name: 'Study', checks: {} }
  ];
};

export const loadInitialEvents = (year, month) => {
  try {
    const raw = localStorage.getItem(getStorageKey('events', year, month));
    if (raw) return JSON.parse(raw);
  } catch (e) { console.warn(e); }
  return {};
};

export const dayBadgeColor = (eventsForDay) => {
  if (!eventsForDay || eventsForDay.length === 0) return { bg: 'bg-transparent', text: 'text-gray-700 dark:text-gray-200' };
  const hasImportant = eventsForDay.some(e => e.priority === 'Important');
  const hasExam = eventsForDay.some(e => e.type === 'Exam');
  if (hasImportant) return { bg: 'bg-amber-200 dark:bg-amber-400', text: 'text-amber-900 dark:text-amber-950' };
  if (hasExam) return { bg: 'bg-purple-200 dark:bg-purple-400', text: 'text-purple-900 dark:text-purple-950' };
  return { bg: 'bg-gray-200 dark:bg-gray-600', text: 'text-gray-900 dark:text-gray-50' };
};

export const getGradientStyle = (p) => {
  if (p >= 75) return 'linear-gradient(90deg, #10b981, #6ee7b7, #10b981)';
  if (p >= 40) return 'linear-gradient(90deg, #f59e0b, #fcd34d, #f59e0b)';
  return 'linear-gradient(90deg, #ef4444, #fca5a5, #ef4444)';
};
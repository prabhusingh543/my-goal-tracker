import React from 'react';
import { motion } from 'framer-motion';

const ThemeToggle = ({ darkMode, setDarkMode, className = "" }) => (
  <motion.button 
      whileHover={{ scale: 1.08, rotate: 5 }} 
      whileTap={{ scale: 0.95, rotate: 0 }}
      transition={{ type: 'spring', stiffness: 400, damping: 20 }}
      onClick={() => setDarkMode(!darkMode)} 
      className={`w-12 h-7 md:w-14 md:h-8 flex items-center rounded-full p-1 cursor-pointer transition-colors duration-300 outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 dark:focus:ring-offset-slate-900 ${darkMode ? 'bg-slate-700 justify-end' : 'bg-indigo-200 justify-start'} ${className}`} 
      title="Toggle Theme"
      aria-label={`Switch to ${darkMode ? 'light' : 'dark'} mode`}
  >
      <motion.div layout className="bg-white w-5 h-5 md:w-6 md:h-6 rounded-full shadow-md flex items-center justify-center text-xs select-none">
        {darkMode ? '🌙' : '☀️'}
      </motion.div>
  </motion.button>
);

export default ThemeToggle;
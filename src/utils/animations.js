// --- 1. FRAMER MOTION VARIANTS (Optimized for Clickability) ---

export const hoverCardVariants = {
  initial: { scale: 1, y: 0, boxShadow: '0 0 0 rgba(0,0,0,0)', zIndex: 1 },
  hover: {
    scale: 1.01,
    y: -4,
    zIndex: 50,
    boxShadow: '0 12px 30px rgba(16,24,40,0.12)',
    transition: { type: 'spring', stiffness: 300, damping: 24 }
  },
  tap: { scale: 0.99, transition: { type: 'spring', stiffness: 500, damping: 30 } }
};

export const hoverDayCell = {
  initial: { scale: 1 },
  hover: { scale: 1.15, transition: { type: 'spring', stiffness: 600, damping: 20 } },
  tap: { scale: 0.9, transition: { type: 'spring', stiffness: 800, damping: 30 } }
};

export const checkboxVisualVariants = {
  initial: { scale: 1 },
  hover: { scale: 1.15, transition: { type: 'spring', stiffness: 600, damping: 20 } },
  tap: { scale: 0.9, transition: { type: 'spring', stiffness: 800, damping: 30 } }
};

export const progressVariants = {
  initial: { scale: 1 },
  hover: { scale: 1.05, y: -2, transition: { type: 'spring', stiffness: 300, damping: 20 } }
};

export const checkmarkVariants = {
  hidden: { scale: 0, opacity: 0 },
  visible: { 
    scale: 1, 
    opacity: 1,
    transition: { type: 'spring', stiffness: 500, damping: 25 }
  }
};
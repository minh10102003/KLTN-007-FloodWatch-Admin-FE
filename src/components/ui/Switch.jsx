import React from 'react';
import { motion } from 'motion/react';

/** Radix/Animate UI style: track + thumb, dark theme, motion animation */
export function Switch({ checked, onCheckedChange, disabled }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onCheckedChange?.(!checked)}
      className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors focus:outline-none focus:ring-2 focus:ring-violet-500 focus:ring-offset-2 focus:ring-offset-dashboard-bg ${
        checked ? 'bg-violet-600' : 'bg-zinc-600'
      } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
    >
      <motion.span
        className="pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow ring-0"
        initial={false}
        animate={{ x: checked ? 20 : 4 }}
        transition={{ type: 'spring', stiffness: 500, damping: 30 }}
      />
    </button>
  );
}

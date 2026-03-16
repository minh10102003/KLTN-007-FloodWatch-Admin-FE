import { useEffect } from 'react';
import { motion } from 'motion/react';

export function Modal({ open, onClose, title, description, children, footer }) {
  useEffect(() => {
    if (open) document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, [open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="fixed inset-0 bg-black/60" onClick={onClose} aria-hidden />
      <motion.div
        className="relative z-50 w-full max-w-md mx-4 max-h-[90vh] overflow-auto rounded-2xl border border-dashboard-border bg-dashboard-card shadow-2xl"
        initial={{ opacity: 0, scale: 0.96, y: 8 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
      >
        <div className="flex items-start justify-between gap-3 border-b border-dashboard-border px-6 py-4">
          <div>
            <h2 className="text-base font-semibold text-zinc-50">{title}</h2>
            {description && (
              <p className="mt-1 text-sm text-zinc-400">
                {description}
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-1 text-zinc-500 hover:bg-white/5 hover:text-zinc-200"
            aria-label="Đóng"
          >
            ×
          </button>
        </div>
        <div className="px-6 py-4">
          {children}
        </div>
        {footer && (
          <div className="flex items-center justify-end gap-2 border-t border-dashboard-border px-6 py-4">
            {footer}
          </div>
        )}
      </motion.div>
    </div>
  );
}

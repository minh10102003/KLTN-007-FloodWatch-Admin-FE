import { useRef, useEffect, useLayoutEffect, useState } from 'react';
import { createPortal } from 'react-dom';

const MENU_WIDTH = 224; // w-56 = 14rem

export function Dropdown({ open, onOpenChange, trigger, children }) {
  const triggerRef = useRef(null);
  const menuRef = useRef(null);
  const [position, setPosition] = useState({ top: 0, left: 0 });

  useLayoutEffect(() => {
    if (!open || !triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    setPosition({
      top: rect.bottom + 4,
      left: rect.right - MENU_WIDTH,
    });
  }, [open]);

  useEffect(() => {
    if (!open) return;
    function handleClickOutside(e) {
      const inTrigger = triggerRef.current?.contains(e.target);
      const inMenu = menuRef.current?.contains(e.target);
      if (inTrigger || inMenu) return;
      onOpenChange?.(false);
    }
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, [onOpenChange, open]);

  return (
    <>
      <div className="relative inline-block" ref={triggerRef}>
        <div onClick={() => onOpenChange?.(!open)}>{trigger}</div>
      </div>
      {open &&
        createPortal(
          <div
            ref={menuRef}
            className="fixed z-[100] w-56 rounded-lg border border-dashboard-border bg-dashboard-card py-1 shadow-xl"
            style={{ top: position.top, left: position.left }}
          >
            {children}
          </div>,
          document.body
        )}
    </>
  );
}

export function DropdownItem({ children, onClick, className = '', disabled }) {
  return (
    <button
      type="button"
      className={`block w-full text-left px-4 py-2 text-sm text-zinc-200 hover:bg-white/10 disabled:opacity-50 disabled:cursor-not-allowed ${className}`}
      onClick={onClick}
      disabled={disabled}
    >
      {children}
    </button>
  );
}

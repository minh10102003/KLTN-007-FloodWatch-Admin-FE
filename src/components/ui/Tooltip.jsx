import React, { createContext, useContext, useState, useRef, useLayoutEffect, cloneElement, Children } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'motion/react';

const TooltipContext = createContext({ openDelay: 200, closeDelay: 100 });

export function TooltipProvider({ children, openDelay = 200, closeDelay = 100 }) {
  return (
    <TooltipContext.Provider value={{ openDelay, closeDelay }}>
      {children}
    </TooltipContext.Provider>
  );
}

function useTooltipContext() {
  return useContext(TooltipContext) || { openDelay: 200, closeDelay: 100 };
}

function getPosition(trigger, side, sideOffset, align) {
  const { left, top, width, height } = trigger;
  let styleLeft = left;
  let styleTop = top;
  let transform = '';

  if (side === 'top') {
    styleLeft = align === 'center' ? left + width / 2 : align === 'end' ? left + width : left;
    styleTop = top;
    transform = align === 'center' ? `translate(-50%, calc(-100% - ${sideOffset}px))` : align === 'end' ? `translate(-100%, calc(-100% - ${sideOffset}px))` : `translateY(calc(-100% - ${sideOffset}px))`;
  } else if (side === 'bottom') {
    styleLeft = align === 'center' ? left + width / 2 : align === 'end' ? left + width : left;
    styleTop = top + height;
    transform = align === 'center' ? `translate(-50%, ${sideOffset}px)` : align === 'end' ? `translate(-100%, ${sideOffset}px)` : `translateY(${sideOffset}px)`;
  } else if (side === 'left') {
    styleLeft = left;
    styleTop = align === 'center' ? top + height / 2 : align === 'end' ? top + height : top;
    transform = align === 'center' ? `translate(calc(-100% - ${sideOffset}px), -50%)` : align === 'end' ? `translate(calc(-100% - ${sideOffset}px), -100%)` : `translateX(calc(-100% - ${sideOffset}px))`;
  } else {
    styleLeft = left + width;
    styleTop = align === 'center' ? top + height / 2 : align === 'end' ? top + height : top;
    transform = align === 'center' ? `translate(${sideOffset}px, -50%)` : align === 'end' ? `translate(${sideOffset}px, -100%)` : `translateX(${sideOffset}px)`;
  }
  return { left: styleLeft, top: styleTop, transform };
}

export function Tooltip({
  children,
  side = 'top',
  sideOffset = 8,
  align = 'center',
  alignOffset = 0,
}) {
  const { openDelay, closeDelay } = useTooltipContext();
  const [open, setOpen] = useState(false);
  const triggerRef = useRef(null);
  const openTimerRef = useRef(null);
  const closeTimerRef = useRef(null);
  const [position, setPosition] = useState({ left: 0, top: 0, transform: '' });

  const handleEnter = () => {
    if (closeTimerRef.current) clearTimeout(closeTimerRef.current);
    openTimerRef.current = setTimeout(() => setOpen(true), openDelay);
  };

  const handleLeave = () => {
    if (openTimerRef.current) clearTimeout(openTimerRef.current);
    closeTimerRef.current = setTimeout(() => setOpen(false), closeDelay);
  };

  useLayoutEffect(() => {
    if (!open || !triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    setPosition(getPosition(rect, side, sideOffset, align));
  }, [open, side, sideOffset, align, alignOffset]);

  const arr = Children.toArray(children);
  const triggerChild = arr[0];
  const contentChild = arr[1];

  let triggerEl = triggerChild;
  const isTriggerWrapper = triggerChild?.type?.displayName === 'TooltipTrigger';
  if (triggerChild && isTriggerWrapper && triggerChild.props?.children) {
    const inner = Children.only(triggerChild.props.children);
    triggerEl = cloneElement(inner, {
      ref: triggerRef,
      onMouseEnter: (e) => { inner.props.onMouseEnter?.(e); handleEnter(); },
      onMouseLeave: (e) => { inner.props.onMouseLeave?.(e); handleLeave(); },
    });
  } else if (triggerChild && React.isValidElement(triggerChild)) {
    triggerEl = cloneElement(triggerChild, {
      ref: triggerRef,
      onMouseEnter: handleEnter,
      onMouseLeave: handleLeave,
    });
  }

  const content = contentChild?.type?.displayName === 'TooltipContent' ? contentChild.props.children : contentChild;

  return (
    <>
      {triggerEl}
      {content != null && createPortal(
        <AnimatePresence>
          {open && (
            <motion.div
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.96 }}
              transition={{ duration: 0.15 }}
              className="fixed z-[200] rounded-md border border-dashboard-border bg-dashboard-card px-3 py-2 text-sm text-zinc-200 shadow-xl whitespace-nowrap"
              style={{ left: position.left, top: position.top, transform: position.transform }}
              onMouseEnter={handleEnter}
              onMouseLeave={handleLeave}
            >
              {content}
            </motion.div>
          )}
        </AnimatePresence>,
        document.body
      )}
    </>
  );
}

export function TooltipTrigger({ children }) {
  return children;
}
TooltipTrigger.displayName = 'TooltipTrigger';

export function TooltipContent({ children }) {
  return children;
}
TooltipContent.displayName = 'TooltipContent';

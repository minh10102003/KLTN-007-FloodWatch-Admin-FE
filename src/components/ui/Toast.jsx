import { createContext, useContext, useState, useCallback, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { AppNotificationCard } from '../common/AppNotification';

const ToastContext = createContext(null);

const DEFAULT_MS = { success: 4500, error: 7000, info: 5000 };

function ToastViewport({ toasts, onDismiss, closeLabel }) {
  return (
    <div
      className="pointer-events-none fixed top-4 right-4 z-[200] flex max-h-[calc(100vh-2rem)] w-[min(100vw-2rem,24rem)] flex-col gap-2 overflow-y-auto pr-1"
      aria-live="polite"
      aria-relevant="additions text"
    >
      {toasts.map((t) => (
        <AppNotificationCard
          key={t.id}
          type={t.type}
          message={t.message}
          onDismiss={() => onDismiss(t.id)}
          closeLabel={closeLabel}
        />
      ))}
    </div>
  );
}

export function ToastProvider({ children }) {
  const { t } = useTranslation();
  const [toasts, setToasts] = useState([]);
  const timersRef = useRef(new Map());

  const dismiss = useCallback((id) => {
    const tid = timersRef.current.get(id);
    if (tid != null) {
      window.clearTimeout(tid);
      timersRef.current.delete(id);
    }
    setToasts((prev) => prev.filter((x) => x.id !== id));
  }, []);

  const toast = useCallback(
    (message, type = 'success') => {
      if (message == null || message === '') return;
      const id =
        typeof crypto !== 'undefined' && crypto.randomUUID
          ? crypto.randomUUID()
          : `toast-${Date.now()}-${Math.random().toString(16).slice(2)}`;
      setToasts((prev) => [...prev, { id, message: String(message), type }]);
      const ms = DEFAULT_MS[type] ?? DEFAULT_MS.info;
      const tid = window.setTimeout(() => dismiss(id), ms);
      timersRef.current.set(id, tid);
    },
    [dismiss]
  );

  const closeLabel = t('common.closeAria');

  return (
    <ToastContext.Provider value={{ toast, dismiss }}>
      {children}
      <ToastViewport toasts={toasts} onDismiss={dismiss} closeLabel={closeLabel} />
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx;
}

/** Alias — cùng hook, tên rõ cho thông báo app. */
export function useAppNotification() {
  return useToast();
}

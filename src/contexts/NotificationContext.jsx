import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  disconnectAdminSocket,
  isAdminSocketEnabled,
  refreshAdminSocketConnection,
} from '../services/adminSocket';
import { canAccessAdminApp, getToken, isAdmin } from '../utils/auth';
import {
  dispatchModerationRefresh,
  dispatchOpenModerationReport,
  shouldSuppressModerationSocketToast,
} from '../utils/moderationEvents';
import { canReceiveNotificationType } from '../utils/notificationPolicy';
import {
  loadNotificationsForCurrentUser,
  persistNotificationsForCurrentUser,
} from '../utils/notificationStorage';
import { getReportFocusPath } from '../utils/reportRoutes';
import { useToast } from '../components/ui/Toast';

const NotificationContext = createContext(null);

function normalizePayload(payload) {
  if (!payload || typeof payload !== 'object') return null;
  const type = payload.type || payload.event || 'generic';
  const id = payload.id || `${type}-${payload.reportId || payload.sensorId || Date.now()}`;
  return {
    id: String(id),
    type,
    reportId: payload.reportId ?? payload.report_id,
    sensorId: payload.sensorId ?? payload.sensor_id,
    read: false,
    createdAt: payload.createdAt || payload.created_at || new Date().toISOString(),
  };
}

export function NotificationProvider({ children }) {
  const { t } = useTranslation();
  const { toast } = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const [items, setItems] = useState([]);
  const [authVersion, setAuthVersion] = useState(0);

  const isAuthed = canAccessAdminApp();
  const socketEnabled = isAdminSocketEnabled();

  const reloadForCurrentUser = useCallback(() => {
    if (!canAccessAdminApp() || !getToken()) {
      setItems([]);
      return;
    }
    setItems(loadNotificationsForCurrentUser());
  }, []);

  const messageFor = useCallback(
    (item) => {
      if (item.type === 'report_pending') {
        return t('notifications.reportPending', { id: item.reportId ?? '—' });
      }
      if (item.type === 'report_approved') {
        return t('notifications.reportApproved', { id: item.reportId ?? '—' });
      }
      if (item.type === 'report_rejected') {
        return t('notifications.reportRejected', { id: item.reportId ?? '—' });
      }
      if (item.type === 'sensor_offline') {
        return t('notifications.sensorOffline', { sensorId: item.sensorId ?? '—' });
      }
      return item.message || item.type;
    },
    [t]
  );

  const pushNotification = useCallback(
    (payload, { showToast = true } = {}) => {
      const item = normalizePayload(payload);
      if (!item || !canReceiveNotificationType(item.type)) return;

      setItems((prev) => {
        if (prev.some((x) => x.id === item.id)) return prev;
        const next = [item, ...prev].slice(0, 50);
        persistNotificationsForCurrentUser(next);
        return next;
      });

      const skipToast =
        showToast &&
        (item.type === 'report_approved' || item.type === 'report_rejected') &&
        shouldSuppressModerationSocketToast(item.reportId, item.type);
      if (showToast && !skipToast) {
        const msg = messageFor(item);
        toast(msg, item.type === 'sensor_offline' ? 'error' : 'info');
      }

      if (
        item.type === 'report_pending' ||
        item.type === 'report_approved' ||
        item.type === 'report_rejected'
      ) {
        dispatchModerationRefresh(item.type);
      }
    },
    [messageFor, toast]
  );

  useEffect(() => {
    const bump = () => setAuthVersion((v) => v + 1);
    window.addEventListener('admin-auth-changed', bump);
    return () => window.removeEventListener('admin-auth-changed', bump);
  }, []);

  useEffect(() => {
    if (isAuthed && getToken()) {
      setAuthVersion((v) => v + 1);
    }
  }, [location.pathname, isAuthed]);

  useEffect(() => {
    reloadForCurrentUser();
  }, [authVersion, isAuthed, reloadForCurrentUser]);

  useEffect(() => {
    const onHandler = (payload) => pushNotification(payload, { showToast: true });

    if (!isAuthed) {
      disconnectAdminSocket();
      setItems([]);
      return undefined;
    }

    if (!socketEnabled) return undefined;

    refreshAdminSocketConnection(onHandler);

    return () => {
      disconnectAdminSocket();
    };
  }, [isAuthed, authVersion, pushNotification, socketEnabled]);

  const visibleItems = useMemo(
    () => items.filter((item) => canReceiveNotificationType(item.type)),
    [items]
  );

  const unreadCount = useMemo(() => visibleItems.filter((i) => !i.read).length, [visibleItems]);

  const markAllRead = useCallback(() => {
    setItems((prev) => {
      const next = prev.map((i) => ({ ...i, read: true }));
      persistNotificationsForCurrentUser(next);
      return next;
    });
  }, []);

  const markRead = useCallback((id) => {
    setItems((prev) => {
      const next = prev.map((i) => (i.id === id ? { ...i, read: true } : i));
      persistNotificationsForCurrentUser(next);
      return next;
    });
  }, []);

  const openNotification = useCallback(
    (item) => {
      markRead(item.id);
      if (item.type === 'sensor_offline') {
        if (isAdmin()) navigate('/device-health');
        return;
      }
      if (item.reportId != null && item.type?.startsWith('report_')) {
        const reportId = item.reportId;
        const path = getReportFocusPath();
        dispatchModerationRefresh('notification-open');
        dispatchOpenModerationReport(reportId);
        const target = `${path}?open=${reportId}`;
        if (location.pathname !== path) {
          navigate(target);
        } else {
          navigate(target, { replace: true });
        }
      }
    },
    [markRead, navigate, location.pathname]
  );

  const value = useMemo(
    () => ({
      items: visibleItems,
      unreadCount,
      pushNotification,
      markAllRead,
      markRead,
      openNotification,
      messageFor,
    }),
    [visibleItems, unreadCount, pushNotification, markAllRead, markRead, openNotification, messageFor]
  );

  return <NotificationContext.Provider value={value}>{children}</NotificationContext.Provider>;
}

export function useNotifications() {
  const ctx = useContext(NotificationContext);
  if (!ctx) throw new Error('useNotifications must be used within NotificationProvider');
  return ctx;
}

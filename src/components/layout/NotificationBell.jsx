import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Bell } from 'lucide-react';
import { MotionButton } from '../ui/MotionButton';
import { useNotifications } from '../../contexts/NotificationContext';
import { isAdmin } from '../../utils/auth';
import { formatAdminDateTime } from '../../utils/formatDateTime';

export default function NotificationBell() {
  const { t, i18n } = useTranslation();
  const { items, unreadCount, markAllRead, openNotification, messageFor } = useNotifications();
  const [open, setOpen] = useState(false);
  const dateLocale = i18n.language?.startsWith('en') ? 'en' : 'vi';

  return (
    <div className="relative">
      <MotionButton
        type="button"
        className="relative rounded-lg p-2 text-zinc-400 hover:bg-white/5 hover:text-zinc-200"
        aria-label={t('layout.notifications', { count: unreadCount })}
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        <Bell className="h-5 w-5" />
        {unreadCount > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-[1rem] items-center justify-center rounded-full bg-amber-500 px-1 text-[10px] font-bold text-black ring-2 ring-[var(--admin-bg)]">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </MotionButton>

      {open && (
        <>
          <button
            type="button"
            className="fixed inset-0 z-[85] cursor-default"
            aria-label={t('common.closeAria')}
            onClick={() => setOpen(false)}
          />
          <div className="absolute right-0 top-full z-[90] mt-2 w-[min(22rem,calc(100vw-2rem))] overflow-hidden rounded-xl border border-[var(--admin-border)] bg-[var(--admin-surface)] shadow-xl">
            <div className="flex items-center justify-between border-b border-[var(--admin-border)] px-3 py-2">
              <p className="text-sm font-semibold text-zinc-100">
                {t('layout.notifications', { count: unreadCount })}
              </p>
              {unreadCount > 0 && (
                <button
                  type="button"
                  className="text-xs text-violet-400 hover:text-violet-300"
                  onClick={markAllRead}
                >
                  {t('notifications.markAllRead')}
                </button>
              )}
            </div>
            <ul className="max-h-80 overflow-y-auto">
              {items.length === 0 ? (
                <li className="px-3 py-6 text-center text-sm text-zinc-500">{t('notifications.empty')}</li>
              ) : (
                items.map((item) => {
                  const isReport = item.type?.startsWith('report_') && item.reportId != null;
                  return (
                    <li key={item.id}>
                      <button
                        type="button"
                        className={`w-full px-3 py-2.5 text-left text-sm transition-colors hover:bg-violet-500/10 ${
                          item.read ? 'text-zinc-400' : 'bg-white/[0.03] text-zinc-100'
                        } ${isReport ? 'cursor-pointer' : ''}`}
                        onClick={() => {
                          openNotification(item);
                          setOpen(false);
                        }}
                      >
                        <p className={`font-medium leading-snug ${isReport ? 'text-violet-300' : ''}`}>
                          {messageFor(item)}
                        </p>
                        {isReport && (
                          <p className="mt-0.5 text-xs text-violet-400/80">
                            {isAdmin() ? t('notifications.clickToViewReport') : t('notifications.clickToModerate')}
                          </p>
                        )}
                        <p className="mt-0.5 text-xs text-zinc-500">
                          {formatAdminDateTime(item.createdAt, dateLocale)}
                        </p>
                      </button>
                    </li>
                  );
                })
              )}
            </ul>
          </div>
        </>
      )}
    </div>
  );
}

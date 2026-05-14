import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { getAuditLogs } from '../services/api';
import { FaClipboardList, FaArrowsRotate } from 'react-icons/fa6';
import { formatAdminDateTime } from '../utils/formatDateTime';
import { useToast } from '../components/ui/Toast';

function getActionLabel(action, t) {
  if (!action) return '—';
  const k = `audit.actions.${action}`;
  const translated = t(k);
  if (translated !== k) return translated;
  return action.replaceAll('_', ' ');
}

function getEntityLabel(entityType, entityId, t) {
  if (!entityType && !entityId) return '—';
  const label = entityType
    ? t(`audit.entities.${entityType}`, { defaultValue: entityType })
    : t('audit.colEntity');
  return entityId ? `${label} #${entityId}` : label;
}

function formatDetails(details, t) {
  if (details == null || details === '') return '—';

  const raw = typeof details === 'string' ? details : JSON.stringify(details);
  if (!raw) return '—';

  const normalized = raw.replaceAll('"', '');

  if (normalized.includes('is_active=true')) return t('audit.details.active');
  if (normalized.includes('is_active=false')) return t('audit.details.inactive');

  const roleMatch = normalized.match(/role=([a-z_]+)/i);
  if (roleMatch?.[1]) {
    const roleValue = roleMatch[1].toLowerCase();
    const roleLabel =
      roleValue === 'admin'
        ? t('layout.roleAdmin')
        : roleValue === 'moderator'
          ? t('layout.roleModerator')
          : roleValue === 'user'
            ? t('audit.entities.user')
            : roleValue;
    return t('audit.details.newRole', { role: roleLabel });
  }

  return normalized
    .replaceAll('location_name=', t('audit.details.location'))
    .replaceAll('sensor_id=', t('audit.details.sensorCode'))
    .replaceAll('warning_threshold=', t('audit.details.warnTh'))
    .replaceAll('danger_threshold=', t('audit.details.dangerTh'))
    .replaceAll(',', ' | ');
}

export default function AuditLogPage() {
  const { t, i18n } = useTranslation();
  const { toast } = useToast();
  const lng = i18n.language?.startsWith('en') ? 'en' : 'vi';
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [limit, setLimit] = useState(50);
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [actionFilter, setActionFilter] = useState('');
  const [entityFilter, setEntityFilter] = useState('');

  const load = async () => {
    setLoading(true);
    const params = { limit, offset: 0 };
    if (from) params.from = new Date(from).toISOString();
    if (to) params.to = new Date(to).toISOString();
    if (actionFilter) params.action = actionFilter;
    if (entityFilter) params.entity_type = entityFilter;
    const res = await getAuditLogs(params);
    setLoading(false);
    if (res.success && Array.isArray(res.data)) {
      setLogs(res.data);
    } else {
      setLogs([]);
      toast(res.error || t('audit.loadError'), 'error');
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold text-zinc-100">{t('audit.title')}</h1>
        <div className="flex flex-wrap items-end gap-3">
          <div className="flex flex-col gap-1">
            <div className="flex flex-wrap gap-2">
              <input
                type="datetime-local"
                value={from}
                onChange={(e) => setFrom(e.target.value)}
                className="rounded-xl border border-dashboard-border bg-dashboard-surface px-3 py-2 text-sm text-zinc-100"
              />
              <input
                type="datetime-local"
                value={to}
                onChange={(e) => setTo(e.target.value)}
                className="rounded-xl border border-dashboard-border bg-dashboard-surface px-3 py-2 text-sm text-zinc-100"
              />
            </div>
            <p className="text-[11px] leading-snug text-zinc-500">{t('audit.datetimeHint')}</p>
          </div>
          <input
            type="text"
            value={actionFilter}
            onChange={(e) => setActionFilter(e.target.value)}
            placeholder={t('audit.filterAction')}
            className="w-36 rounded-xl border border-dashboard-border bg-dashboard-surface px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-500"
          />
          <input
            type="text"
            value={entityFilter}
            onChange={(e) => setEntityFilter(e.target.value)}
            placeholder={t('audit.filterEntity')}
            className="w-36 rounded-xl border border-dashboard-border bg-dashboard-surface px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-500"
          />
          <button
            type="button"
            onClick={load}
            disabled={loading}
            className="flex items-center gap-2 rounded-xl border border-dashboard-border bg-dashboard-surface px-4 py-2 text-sm font-medium text-zinc-200 hover:bg-white/10 disabled:opacity-50"
          >
            <FaArrowsRotate /> {t('audit.refresh')}
          </button>
        </div>
      </div>
      {loading ? (
        <p className="text-zinc-400">{t('common.loading')}</p>
      ) : logs.length === 0 ? (
        <div className="rounded-xl border border-dashboard-border bg-dashboard-card p-12 text-center text-zinc-400">
          <FaClipboardList className="mx-auto mb-2 h-10 w-10 text-zinc-500" />
          <p className="font-medium">{t('audit.emptyTitle')}</p>
          <p className="text-sm">{t('audit.emptyHint')}</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-dashboard-border bg-dashboard-card">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b border-dashboard-border bg-dashboard-surface text-zinc-400">
              <tr>
                <th className="px-4 py-3 font-medium">{t('audit.colTime')}</th>
                <th className="px-4 py-3 font-medium">{t('audit.colUser')}</th>
                <th className="px-4 py-3 font-medium">{t('audit.colAction')}</th>
                <th className="px-4 py-3 font-medium">{t('audit.colEntity')}</th>
                <th className="px-4 py-3 font-medium">{t('audit.colDetails')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-dashboard-border">
              {logs.map((log, i) => (
                <tr key={log.id || i} className="hover:bg-white/5">
                  <td className="px-4 py-3 text-zinc-400">{formatAdminDateTime(log.created_at, lng)}</td>
                  <td className="px-4 py-3 text-zinc-300">
                    {log.user_id != null ? t('audit.userId', { id: log.user_id }) : '—'}
                  </td>
                  <td className="px-4 py-3 font-medium text-zinc-200">{getActionLabel(log.action, t)}</td>
                  <td className="px-4 py-3 text-zinc-300">{getEntityLabel(log.entity_type, log.entity_id, t)}</td>
                  <td className="max-w-xs truncate px-4 py-3 text-zinc-400">{formatDetails(log.details, t)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

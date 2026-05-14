import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FaArrowsRotate } from 'react-icons/fa6';
import { getAdminDevicesHealth } from '../services/api';
import { Table, TableBody, TableHead, TableRow, TableTh, TableTd } from '../components/ui/Table';
import { formatAdminDateTime } from '../utils/formatDateTime';
import { useToast } from '../components/ui/Toast';

const HEALTH_I18N_KEYS = {
  online: 'healthOnline',
  degraded: 'healthDegraded',
  offline: 'healthOffline',
  inactive: 'healthInactive',
  unknown: 'healthUnknown',
};

function healthLabel(key, t) {
  const sub = HEALTH_I18N_KEYS[key] || 'healthUnknown';
  return t(`deviceHealth.${sub}`);
}

function healthBadgeClass(h) {
  if (h === 'online') return 'bg-emerald-500/20 text-emerald-200 border-emerald-500/40';
  if (h === 'degraded') return 'bg-amber-500/20 text-amber-200 border-amber-500/40';
  if (h === 'offline') return 'bg-red-500/20 text-red-200 border-red-500/40';
  if (h === 'inactive') return 'bg-zinc-600/40 text-zinc-300 border-zinc-500/40';
  return 'bg-violet-500/20 text-violet-200 border-violet-500/40';
}

/** B1 — Sức khỏe thiết bị (chỉ Admin, JWT). */
export default function DeviceHealthPage() {
  const { t, i18n } = useTranslation();
  const { toast } = useToast();
  const dateLocale = i18n.language?.startsWith('en') ? 'en' : 'vi';
  const [rows, setRows] = useState([]);
  const [summary, setSummary] = useState(null);
  const [meta, setMeta] = useState(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');

  const load = useCallback(async () => {
    setLoading(true);
    const res = await getAdminDevicesHealth();
    setLoading(false);
    if (res.success) {
      setRows(res.data || []);
      setSummary(res.summary || null);
      setMeta(res.meta || null);
    } else {
      setRows([]);
      setSummary(null);
      setMeta(null);
      toast(res.error || t('deviceHealth.errLoad'), 'error');
    }
  }, [t, toast]);

  useEffect(() => {
    load();
  }, [load]);

  const filtered = useMemo(() => {
    if (filter === 'all') return rows;
    return rows.filter((r) => (r.health || '') === filter);
  }, [rows, filter]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-zinc-100">{t('deviceHealth.title')}</h1>
          <p className="mt-1 text-sm text-zinc-500">
            {t('deviceHealth.subtitle')}
          </p>
        </div>
        <button
          type="button"
          onClick={load}
          disabled={loading}
          className="inline-flex items-center gap-2 rounded-xl border border-dashboard-border bg-dashboard-surface px-4 py-2 text-sm text-zinc-200 hover:bg-white/10 disabled:opacity-50"
        >
          <FaArrowsRotate /> {t('deviceHealth.refresh')}
        </button>
      </div>

      {meta?.thresholds_minutes && (
        <p className="text-xs text-zinc-500">
          {t('deviceHealth.thresholdLine', {
            onlineMax: meta.thresholds_minutes.onlineMax,
            degradedMax: meta.thresholds_minutes.degradedMax,
          })}
        </p>
      )}

      {summary && (
        <div className="flex flex-wrap gap-2">
          {Object.entries(summary).map(([k, v]) => (
            <button
              key={k}
              type="button"
              onClick={() => setFilter(k === filter ? 'all' : k)}
              className={`rounded-lg border px-3 py-1.5 text-sm ${
                filter === k ? 'border-violet-500 bg-violet-500/20 text-violet-100' : 'border-dashboard-border bg-dashboard-card text-zinc-300'
              }`}
            >
              {healthLabel(k, t)}: <strong>{v}</strong>
            </button>
          ))}
          <button
            type="button"
            onClick={() => setFilter('all')}
            className={`rounded-lg border px-3 py-1.5 text-sm ${
              filter === 'all' ? 'border-violet-500 bg-violet-500/20' : 'border-dashboard-border bg-dashboard-card text-zinc-400'
            }`}
          >
            {t('deviceHealth.filterAll')}
          </button>
        </div>
      )}

      {loading ? (
        <p className="text-zinc-400">{t('common.loading')}</p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-dashboard-border bg-dashboard-card">
          <Table colWidths={[12, 18, 12, 12, 22, 24]}>
            <TableHead>
              <TableRow className="hover:bg-transparent">
                <TableTh>{t('deviceHealth.colSensor')}</TableTh>
                <TableTh>{t('deviceHealth.colLocation')}</TableTh>
                <TableTh>{t('deviceHealth.colStatus')}</TableTh>
                <TableTh>{t('deviceHealth.colMinutesSince')}</TableTh>
                <TableTh>{t('deviceHealth.colLastFlood')}</TableTh>
                <TableTh>{t('deviceHealth.colPower')}</TableTh>
              </TableRow>
            </TableHead>
            <TableBody>
              {filtered.map((r) => (
                <TableRow key={r.sensor_id}>
                  <TableTd className="font-mono text-sm text-zinc-200">{r.sensor_id}</TableTd>
                  <TableTd className="text-zinc-300">{r.location_name || '—'}</TableTd>
                  <TableTd>
                    <span
                      className={`inline-block rounded-full border px-2 py-0.5 text-xs font-medium ${healthBadgeClass(r.health)}`}
                    >
                      {healthLabel(r.health, t)}
                    </span>
                    {r.health_reason && (
                      <p className="mt-1 text-xs text-zinc-500" title={r.health_reason}>
                        {r.health_reason}
                      </p>
                    )}
                  </TableTd>
                  <TableTd className="text-zinc-300">
                    {r.minutes_since_data != null ? `${r.minutes_since_data}′` : '—'}
                  </TableTd>
                  <TableTd className="text-xs text-zinc-400">
                    {r.last_flood_log
                      ? `${r.last_flood_log.status || '—'} · ${r.last_flood_log.water_level_cm ?? '—'} cm · ${r.last_flood_log.created_at ? formatAdminDateTime(r.last_flood_log.created_at, dateLocale) : ''}`
                      : '—'}
                  </TableTd>
                  <TableTd className="text-xs text-zinc-400">
                    {r.power?.battery_level != null || r.power?.power_source
                      ? `${r.power?.power_source || '—'} · ${t('deviceHealth.battery')} ${r.power?.battery_level ?? '—'}${r.power?.last_energy_at ? ` · ${formatAdminDateTime(r.power.last_energy_at, dateLocale)}` : ''}`
                      : '—'}
                  </TableTd>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          {filtered.length === 0 && (
            <p className="p-6 text-center text-sm text-zinc-500">{t('deviceHealth.emptyFilter')}</p>
          )}
        </div>
      )}
    </div>
  );
}

import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FaArrowsRotate } from 'react-icons/fa6';
import { getEmergencyAlertsSummary } from '../services/api';
import { Table, TableBody, TableHead, TableRow, TableTh, TableTd } from '../components/ui/Table';
import { useToast } from '../components/ui/Toast';

export default function EmergencyAlertsSummaryPage() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [hours, setHours] = useState(24);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);

  const load = async () => {
    setLoading(true);
    const res = await getEmergencyAlertsSummary(hours);
    setLoading(false);
    if (res.success) {
      setData(res.data);
    } else {
      setData(null);
      toast(t('emergency.loadError'), 'error');
    }
  };

  const byKind = data?.by_alert_kind || [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-zinc-100">{t('emergency.title')}</h1>
        <p className="mt-1 text-sm text-zinc-500">{t('emergency.subtitle')}</p>
      </div>

      <div className="flex flex-wrap items-end gap-3 rounded-xl border border-dashboard-border bg-dashboard-card p-4">
        <label className="text-sm text-zinc-300">
          <span className="mb-1 block">{t('emergency.windowHours')}</span>
          <input
            type="number"
            min={1}
            max={168}
            value={hours}
            onChange={(e) => setHours(e.target.value)}
            className="mt-1 block w-32 rounded-lg border border-dashboard-border bg-dashboard-surface px-3 py-2 text-zinc-100"
          />
        </label>
        <button
          type="button"
          onClick={load}
          disabled={loading}
          className="rounded-lg bg-violet-600 px-4 py-2 text-sm font-medium text-white hover:bg-violet-700 disabled:opacity-50"
        >
          {loading ? t('common.loading') : t('emergency.loadStats')}
        </button>
        {data && (
          <button
            type="button"
            onClick={load}
            disabled={loading}
            className="inline-flex items-center gap-2 rounded-lg border border-dashboard-border px-3 py-2 text-sm text-zinc-300 hover:bg-white/5"
          >
            <FaArrowsRotate /> {t('common.retry')}
          </button>
        )}
      </div>

      {data && (
        <>
          <div className="rounded-xl border border-dashboard-border bg-dashboard-card p-4">
            <p className="text-sm text-zinc-500">{t('emergency.totalLabel')}</p>
            <p className="mt-1 text-3xl font-semibold text-zinc-100">{data.total ?? 0}</p>
            <p className="mt-2 text-xs text-zinc-500">{t('emergency.windowActual', { hours: data.hours ?? hours })}</p>
          </div>

          <div className="overflow-x-auto rounded-xl border border-dashboard-border bg-dashboard-card">
            <Table colWidths={[70, 30]}>
              <TableHead>
                <TableRow className="hover:bg-transparent">
                  <TableTh>{t('emergency.colKind')}</TableTh>
                  <TableTh>{t('emergency.colCount')}</TableTh>
                </TableRow>
              </TableHead>
              <TableBody>
                {byKind.length === 0 ? (
                  <TableRow>
                    <TableTd colSpan={2} className="text-center text-zinc-500">
                      {t('emergency.emptyWindow')}
                    </TableTd>
                  </TableRow>
                ) : (
                  byKind.map((row) => (
                    <TableRow key={String(row.alert_kind)}>
                      <TableTd className="font-mono text-sm text-zinc-200">{row.alert_kind}</TableTd>
                      <TableTd className="text-zinc-100">{row.send_count}</TableTd>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </>
      )}
    </div>
  );
}

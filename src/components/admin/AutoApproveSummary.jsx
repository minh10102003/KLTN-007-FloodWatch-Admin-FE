import React, { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { getReportsSummary } from '../../services/api';
import { normalizeReportsSummary } from '../../utils/reportAutoApprove';
import {
  dispatchFilterManualPending,
  REPORTS_SUMMARY_REFRESH,
} from '../../utils/reportFilterEvents';

const REFRESH_MS = 30_000;

function SummaryCard({ label, value, accent, children }) {
  return (
    <div
      className={`flex flex-col rounded-lg border px-4 py-3 ${
        accent || 'border-dashboard-border bg-dashboard-surface'
      }`}
    >
      <span className="text-2xl font-bold tabular-nums text-zinc-100">{value}</span>
      <span className="mt-1 text-xs text-zinc-400 leading-snug">{label}</span>
      {children}
    </div>
  );
}

/**
 * GET /api/reports/summary — 5 thẻ (sensor verified ≠ xác minh chéo trên từng báo cáo).
 */
export default function AutoApproveSummary({ onFilterManualPending }) {
  const { t } = useTranslation();
  const [summary, setSummary] = useState(() => normalizeReportsSummary(null));
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    setError(null);
    const res = await getReportsSummary();
    if (res.success) {
      setSummary(res.summary);
    } else {
      setError(res.error || t('autoApprove.summaryError'));
      setSummary(normalizeReportsSummary(null));
    }
    setLoading(false);
  }, [t]);

  useEffect(() => {
    load();
    const intervalId = window.setInterval(load, REFRESH_MS);
    const onRefresh = () => load();
    window.addEventListener(REPORTS_SUMMARY_REFRESH, onRefresh);
    return () => {
      window.clearInterval(intervalId);
      window.removeEventListener(REPORTS_SUMMARY_REFRESH, onRefresh);
    };
  }, [load]);

  const handleViewManual = () => {
    dispatchFilterManualPending();
    onFilterManualPending?.();
  };

  return (
    <section
      className="mb-6 rounded-xl border border-dashboard-border bg-dashboard-card p-5"
      aria-label={t('autoApprove.summaryTitle')}
    >
      <h2 className="mb-1 text-lg font-semibold text-zinc-100">{t('autoApprove.summaryTitle')}</h2>
      <p className="mb-4 text-xs text-zinc-500">{t('autoApprove.summarySensorNote')}</p>
      {error && (
        <p className="mb-3 text-sm text-amber-400" role="alert">
          {error}
        </p>
      )}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        <SummaryCard
          label={t('autoApprove.cardTotalActive')}
          value={loading ? '—' : summary.totalActive}
        />
        <SummaryCard
          label={t('autoApprove.cardAutoApproved')}
          value={loading ? '—' : summary.autoApproved}
          accent="border-violet-500/40 bg-violet-500/10"
        />
        <SummaryCard
          label={t('autoApprove.cardPendingManual')}
          value={loading ? '—' : summary.pendingManualReview}
          accent="border-amber-500/40 bg-amber-500/10"
        >
          {!loading && summary.pendingManualReview > 0 && (
            <button
              type="button"
              onClick={handleViewManual}
              className="mt-2 text-left text-xs font-medium text-violet-400 hover:text-violet-300"
            >
              {t('autoApprove.viewManualList')}
            </button>
          )}
        </SummaryCard>
        <SummaryCard
          label={t('autoApprove.cardSensorVerified')}
          value={loading ? '—' : summary.sensorVerified}
          accent="border-sky-500/40 bg-sky-500/10"
        />
        <SummaryCard
          label={t('autoApprove.cardPendingAutoApprove')}
          value={loading ? '—' : summary.pendingAutoApprove}
          accent="border-zinc-500/40 bg-zinc-500/10"
        />
      </div>
    </section>
  );
}

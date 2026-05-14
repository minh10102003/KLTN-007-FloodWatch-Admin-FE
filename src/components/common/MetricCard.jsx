import React from 'react';
import { useTranslation } from 'react-i18next';
import { TrendingDown, TrendingUp, HelpCircle } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipTrigger } from '../ui/Tooltip';

const fmt = (v, digits = 2) => (v == null || Number.isNaN(Number(v)) ? '—' : Number(v).toFixed(digits));

const HELP_KEYS = {
  mae: 'metric.maeHelp',
  rmse: 'metric.rmseHelp',
  bias: 'metric.biasHelp',
};

/** @param {'mae' | 'rmse' | 'bias'} metricHelp */
export function MetricCard({ label, baseline, fused, improvement, metricHelp }) {
  const { t } = useTranslation();
  const improved = improvement != null && improvement > 0;
  const worse = improvement != null && improvement < 0;
  const tip = metricHelp && HELP_KEYS[metricHelp] ? t(HELP_KEYS[metricHelp]) : '';

  return (
    <div className="rounded-xl border border-dashboard-border bg-dashboard-card p-4">
      <div className="flex items-start justify-between gap-2">
        <p className="text-xs font-medium text-zinc-500">{label}</p>
        {tip ? (
          <Tooltip side="left" align="end">
            <TooltipTrigger>
              <button
                type="button"
                className="inline-flex rounded p-0.5 text-zinc-500 hover:bg-white/5 hover:text-zinc-300"
                aria-label={t('metric.helpAria')}
              >
                <HelpCircle className="h-3.5 w-3.5" />
              </button>
            </TooltipTrigger>
            <TooltipContent>
              <p className="max-w-xs whitespace-normal text-left text-xs">{tip}</p>
            </TooltipContent>
          </Tooltip>
        ) : null}
      </div>
      <div className="mt-2 grid grid-cols-2 gap-3 text-sm">
        <div>
          <p className="text-zinc-500">{t('metric.baseline')}</p>
          <p className="font-medium text-zinc-100">{fmt(baseline)}</p>
        </div>
        <div>
          <p className="text-zinc-500">{t('metric.fused')}</p>
          <p className="font-medium text-zinc-100">{fmt(fused)}</p>
        </div>
      </div>
      <div
        className={`mt-3 flex items-center gap-1.5 rounded-lg border px-2 py-1.5 text-xs font-medium ${
          improvement == null
            ? 'border-amber-500/35 bg-amber-500/10 text-amber-200'
            : improved
              ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300'
              : worse
                ? 'border-zinc-600 bg-zinc-800/50 text-zinc-300'
                : 'border-zinc-600 bg-zinc-800/50 text-zinc-400'
        }`}
      >
        {improvement == null ? (
          <span>{t('metric.improvementNA')}</span>
        ) : (
          <span className="inline-flex items-center gap-1.5">
            {improved ? (
              <TrendingDown className="h-3.5 w-3.5 text-emerald-400" aria-hidden />
            ) : worse ? (
              <TrendingUp className="h-3.5 w-3.5 text-amber-400" aria-hidden />
            ) : null}
            {improved
              ? t('metric.improvementBetter', { pct: fmt(improvement) })
              : worse
                ? t('metric.improvementWorse', { pct: fmt(improvement) })
                : t('metric.improvementPct', { pct: fmt(improvement) })}
          </span>
        )}
      </div>
    </div>
  );
}

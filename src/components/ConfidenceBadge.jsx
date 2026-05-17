import React from 'react';
import { useTranslation } from 'react-i18next';
import { formatConfidenceBreakdownText } from '../utils/formatConfidenceBreakdown';

/** Lấy điểm tin cậy model (0–100) từ báo cáo — A2 roadmap. */
export function getReportConfidence(report) {
  if (report == null) return null;
  const v = report.confidence ?? report.confidence_score;
  if (v == null || v === '') return null;
  const n = Number(v);
  return Number.isFinite(n) ? Math.round(n) : null;
}

const TONE_ON_DARK = {
  high: 'bg-emerald-500/25 text-emerald-200 border-emerald-500/40',
  mid: 'bg-amber-500/25 text-amber-200 border-amber-500/40',
  low: 'bg-zinc-600/40 text-zinc-300 border-zinc-500/40',
};

const TONE_ON_LIGHT = {
  high: 'bg-emerald-100 text-emerald-900 border-emerald-400',
  mid: 'bg-amber-100 text-amber-900 border-amber-500',
  low: 'bg-zinc-200 text-zinc-800 border-zinc-400',
};

function toneForScore(score, variant) {
  const palette = variant === 'onLight' ? TONE_ON_LIGHT : TONE_ON_DARK;
  if (score >= 70) return palette.high;
  if (score >= 40) return palette.mid;
  return palette.low;
}

/**
 * Badge độ tin cậy báo cáo (Admin/Mod). Tooltip = confidence_breakdown nếu có.
 * @param {'onDark'|'onLight'} variant — onLight cho card nền pastel (kiểm duyệt)
 */
export default function ConfidenceBadge({ report, className = '', variant = 'onDark' }) {
  const { t } = useTranslation();
  const score = getReportConfidence(report);
  if (score == null) return null;
  const breakdownText = formatConfidenceBreakdownText(report.confidence_breakdown, t, { multiline: true });
  const tone = toneForScore(score, variant);
  const title = breakdownText
    ? `${t('reports.confidenceTooltip', { score })}\n${breakdownText}`
    : t('reports.confidenceTooltip', { score });
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${tone} ${className}`}
      title={title}
    >
      {t('reports.confidenceShort', { score })}
    </span>
  );
}

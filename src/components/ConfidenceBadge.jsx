import React from 'react';

/** Lấy điểm tin cậy model (0–100) từ báo cáo — A2 roadmap. */
export function getReportConfidence(report) {
  if (report == null) return null;
  const v = report.confidence ?? report.confidence_score;
  if (v == null || v === '') return null;
  const n = Number(v);
  return Number.isFinite(n) ? Math.round(n) : null;
}

/**
 * Badge độ tin cậy báo cáo (Admin/Mod). Tooltip = confidence_breakdown nếu có.
 */
export default function ConfidenceBadge({ report, className = '' }) {
  const score = getReportConfidence(report);
  if (score == null) return null;
  const breakdown =
    typeof report.confidence_breakdown === 'string'
      ? report.confidence_breakdown
      : report.confidence_breakdown != null
        ? JSON.stringify(report.confidence_breakdown)
        : null;
  const tone =
    score >= 70 ? 'bg-emerald-500/25 text-emerald-200 border-emerald-500/40'
      : score >= 40 ? 'bg-amber-500/25 text-amber-200 border-amber-500/40'
        : 'bg-zinc-600/40 text-zinc-300 border-zinc-500/40';
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${tone} ${className}`}
      title={breakdown || `Độ tin cậy model: ${score}/100`}
    >
      TC {score}
    </span>
  );
}

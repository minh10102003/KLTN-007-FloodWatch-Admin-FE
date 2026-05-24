import React from 'react';
import { useTranslation } from 'react-i18next';
import {
  getDisplayModeration,
  getDisplayValidation,
  getModerationBadgeClass,
  getValidationBadgeClass,
} from '../../utils/reportDisplayStatus';
import { isReportAutoApproved } from '../../utils/reportAutoApprove';

function BadgePill({ label, className, title }) {
  return (
    <span
      title={title || undefined}
      className={`inline-flex max-w-full items-center rounded-full px-2 py-0.5 text-[10px] font-medium leading-tight ${className}`}
    >
      {label}
    </span>
  );
}

/** Kiểm duyệt — dùng display_moderation.label từ BE. */
export function ModerationStatusBadge({ report, className = '' }) {
  const dm = getDisplayModeration(report);
  return (
    <BadgePill
      label={dm.label}
      className={`${getModerationBadgeClass(report)} ${className}`}
      title={dm.hint || undefined}
    />
  );
}

/** Xác minh chéo — tách khỏi sensor summary / tin cậy. */
export function ValidationStatusBadge({ report, className = '' }) {
  const dv = getDisplayValidation(report);
  return (
    <BadgePill
      label={dv.label}
      className={`${getValidationBadgeClass(report)} ${className}`}
    />
  );
}

/** Hai badge: kiểm duyệt + xác minh. */
export default function ReportStatusBadges({ report, className = '', showHint = false }) {
  const { t } = useTranslation();
  const dm = getDisplayModeration(report);

  return (
    <div className={`flex flex-col gap-1 ${className}`}>
      <div className="flex flex-wrap items-center gap-1">
        <span className="text-[10px] text-zinc-500 uppercase tracking-wide">
          {t('reports.colModeration')}
        </span>
        <ModerationStatusBadge report={report} />
      </div>
      <div className="flex flex-wrap items-center gap-1">
        <span className="text-[10px] text-zinc-500 uppercase tracking-wide">
          {t('reports.colValidation')}
        </span>
        <ValidationStatusBadge report={report} />
      </div>
      {showHint && dm.hint && !isReportAutoApproved(report) && (
        <p className="text-[10px] text-amber-600/90 leading-snug">{dm.hint}</p>
      )}
    </div>
  );
}

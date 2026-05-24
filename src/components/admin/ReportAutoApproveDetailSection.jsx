import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  getReportNeighborCount,
  isReportAutoApproved,
  isReportSensorVerified,
} from '../../utils/reportAutoApprove';

/**
 * Section auto-approve — append cuối modal chi tiết (không thay nút duyệt/từ chối cũ).
 */
export default function ReportAutoApproveDetailSection({
  report,
  onSkipAutoApprove,
  skipProcessing = false,
}) {
  const { t } = useTranslation();
  const [localSkipping, setLocalSkipping] = useState(false);
  const neighborCount = getReportNeighborCount(report);
  const autoApproved = isReportAutoApproved(report);
  const sensorVerified = isReportSensorVerified(report);

  const handleSkip = async () => {
    if (!onSkipAutoApprove || localSkipping || skipProcessing) return;
    setLocalSkipping(true);
    try {
      await onSkipAutoApprove(report.id);
    } finally {
      setLocalSkipping(false);
    }
  };

  const busy = localSkipping || skipProcessing;

  return (
    <div className="rounded-lg border border-violet-500/30 bg-violet-500/5 p-4 space-y-3">
      <p className="text-sm font-semibold text-violet-200">{t('autoApprove.detailTitle')}</p>
      <dl className="grid gap-2 text-sm">
        <div className="flex justify-between gap-3">
          <dt className="text-zinc-500">{t('autoApprove.neighborReports')}</dt>
          <dd className="font-medium text-zinc-100 tabular-nums">{neighborCount}</dd>
        </div>
        <div className="flex justify-between gap-3">
          <dt className="text-zinc-500">{t('autoApprove.sensorStatus')}</dt>
          <dd className="font-medium text-zinc-100">
            {sensorVerified ? t('autoApprove.sensorOk') : t('autoApprove.sensorMissing')}
          </dd>
        </div>
        <div className="flex justify-between gap-3">
          <dt className="text-zinc-500">{t('autoApprove.autoStatus')}</dt>
          <dd className="font-medium text-zinc-100">
            {autoApproved ? t('autoApprove.wasAutoApproved') : t('autoApprove.awaitingManual')}
          </dd>
        </div>
      </dl>
      {!autoApproved && onSkipAutoApprove && (
        <button
          type="button"
          disabled={busy}
          onClick={handleSkip}
          className="w-full rounded-lg border border-zinc-500 bg-zinc-700/50 px-3 py-2 text-sm font-medium text-zinc-100 hover:bg-zinc-600/50 disabled:opacity-50"
        >
          {t('autoApprove.skipAutoApprove')}
        </button>
      )}
    </div>
  );
}

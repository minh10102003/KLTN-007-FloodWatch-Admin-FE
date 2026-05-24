import React from 'react';
import { useTranslation } from 'react-i18next';
import { getAutoApproveBadgeVariant } from '../../utils/reportAutoApprove';

const VARIANT_CLASS = {
  auto_sensor: 'bg-emerald-600/90 text-white',
  auto_no_sensor: 'bg-amber-500/90 text-black',
  manual: 'bg-zinc-600 text-zinc-200',
};

/**
 * Badge auto-approve — chỉ thêm cạnh row/card, không đổi layout cha.
 */
export default function ReportAutoApproveBadge({ report, className = '' }) {
  const { t } = useTranslation();
  const variant = getAutoApproveBadgeVariant(report);
  const labelKey =
    variant === 'auto_sensor'
      ? 'autoApprove.badgeAutoWithSensor'
      : variant === 'auto_no_sensor'
        ? 'autoApprove.badgeAutoNoSensor'
        : 'autoApprove.badgeManual';

  return (
    <span
      className={`inline-flex max-w-full items-center rounded-full px-2 py-0.5 text-[10px] font-medium leading-tight ${VARIANT_CLASS[variant]} ${className}`}
    >
      {t(labelKey)}
    </span>
  );
}

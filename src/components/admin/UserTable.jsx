import React from 'react';
import { useTranslation } from 'react-i18next';
import { Pencil, Lock, Unlock, Trash2, KeyRound, Medal, RefreshCw } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipTrigger } from '../ui/Tooltip';
import { getReporterReliabilityTier } from '../../utils/reliabilityHelpers';
import { getInitials, getUserDisplayName, hueFromString, trustTierKeyFromScore } from '../../utils/formatters';
import { StatusBadge } from '../common/StatusBadge';

function RoleBadge({ role }) {
  const { t } = useTranslation();
  const styles = {
    admin: 'border-red-500/40 bg-red-500/15 text-red-200',
    moderator: 'border-amber-500/40 bg-amber-500/15 text-amber-100',
    user: 'border-sky-500/40 bg-sky-500/15 text-sky-100',
  };
  const cls = styles[role] || 'border-zinc-600 bg-zinc-800 text-zinc-300';
  const label = t(`users.roles.${role}`, { defaultValue: role });
  return (
    <span className={`inline-flex rounded-full border px-2.5 py-0.5 text-xs font-semibold ${cls}`}>{label}</span>
  );
}

function TrustCell({ score, onRecompute, recomputing }) {
  const { t } = useTranslation();
  if (score == null || Number.isNaN(Number(score))) {
    return <span className="text-xs text-zinc-500">—</span>;
  }
  const n = Number(score);
  const tier = getReporterReliabilityTier(n);
  const tierKey = trustTierKeyFromScore(n);
  const tierLabel = tierKey ? t(`users.trustTier.${tierKey}`) : tier.tier;
  const pct = Math.min(100, Math.max(0, n));

  return (
    <div className="flex min-w-[140px] items-center gap-2">
      <Medal className="h-4 w-4 shrink-0" style={{ color: tier.color }} aria-hidden />
      <div className="min-w-0 flex-1">
        <div className="mb-0.5 flex items-center justify-between gap-2 text-[11px] font-medium text-zinc-400">
          <span style={{ color: tier.color }}>{tierLabel}</span>
          <span>{n}</span>
        </div>
        <div className="h-1.5 overflow-hidden rounded-full bg-zinc-800">
          <div
            className="h-full rounded-full transition-all"
            style={{ width: `${pct}%`, backgroundColor: tier.color }}
          />
        </div>
      </div>
      <button
        type="button"
        onClick={onRecompute}
        disabled={recomputing}
        className="shrink-0 rounded-lg p-1.5 text-zinc-500 hover:bg-white/5 hover:text-amber-300 disabled:opacity-40"
        title={t('users.recomputeTrust')}
      >
        <RefreshCw className={`h-3.5 w-3.5 ${recomputing ? 'animate-spin' : ''}`} />
      </button>
    </div>
  );
}

function UserAvatar({ user }) {
  const initials = getInitials(user);
  const h = hueFromString(user?.username || user?.email || 'x');
  return (
    <div
      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white shadow-inner"
      style={{ backgroundColor: `hsl(${h} 42% 36%)` }}
    >
      {initials}
    </div>
  );
}

function IconAction({ title, onClick, disabled, className, children }) {
  return (
    <Tooltip>
      <TooltipTrigger>
        <button
          type="button"
          title={title}
          onClick={onClick}
          disabled={disabled}
          className={`rounded-lg p-2 transition-colors disabled:cursor-not-allowed disabled:opacity-35 ${className}`}
        >
          {children}
        </button>
      </TooltipTrigger>
      <TooltipContent>
        <p>{title}</p>
      </TooltipContent>
    </Tooltip>
  );
}

export default function UserTable({
  users,
  currentUserId,
  canCreateUser,
  recomputingId,
  onChangeRole,
  onRequestLock,
  onUnlock,
  onRequestDelete,
  onResetPassword,
  onRecompute,
}) {
  const { t } = useTranslation();
  return (
    <div className="overflow-x-auto rounded-xl border border-dashboard-border bg-dashboard-card">
      <table className="min-w-full text-left text-sm">
        <thead className="border-b border-dashboard-border bg-dashboard-surface/90 text-xs font-semibold uppercase tracking-wide text-zinc-500">
          <tr>
            <th className="px-4 py-3 font-medium">{t('users.tableUser')}</th>
            <th className="px-4 py-3 font-medium">{t('users.tableEmail')}</th>
            <th className="px-4 py-3 font-medium">{t('users.tableRole')}</th>
            <th className="px-4 py-3 font-medium">{t('users.tableReliability')}</th>
            <th className="px-4 py-3 font-medium">{t('users.tableStatus')}</th>
            <th className="px-4 py-3 font-medium text-right">{t('users.tableActions')}</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-dashboard-border">
          {users.map((u) => {
            const display = getUserDisplayName(u);
            const tip = t('users.tipUser', { id: u.id, username: u.username });
            return (
              <tr key={u.id} className="hover:bg-white/[0.03]">
                <td className="px-4 py-3">
                  <Tooltip>
                    <TooltipTrigger>
                      <div className="flex cursor-default items-center gap-3">
                        <UserAvatar user={u} />
                        <span className="font-medium text-zinc-100">{display}</span>
                      </div>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p className="max-w-xs whitespace-pre-wrap text-left text-xs">{tip}</p>
                    </TooltipContent>
                  </Tooltip>
                </td>
                <td className="max-w-[200px] truncate px-4 py-3 text-zinc-400" title={u.email || ''}>
                  {u.email || '—'}
                </td>
                <td className="px-4 py-3">
                  <RoleBadge role={u.role} />
                </td>
                <td className="px-4 py-3">
                  <TrustCell
                    score={u.reporter_reliability}
                    recomputing={recomputingId === u.id}
                    onRecompute={() => onRecompute(u.id)}
                  />
                </td>
                <td className="px-4 py-3">
                  <StatusBadge active={u.is_active} />
                </td>
                <td className="px-4 py-3">
                  <div className="flex flex-wrap items-center justify-end gap-1">
                    <IconAction
                      title={t('users.actionChangeRole')}
                      onClick={() => onChangeRole(u)}
                      className="text-sky-400 hover:bg-sky-500/10"
                    >
                      <Pencil className="h-4 w-4" />
                    </IconAction>
                    {u.id !== currentUserId && u.is_active && (
                      <IconAction
                        title={t('users.actionLock')}
                        onClick={() => onRequestLock(u)}
                        className="text-amber-400 hover:bg-amber-500/10"
                      >
                        <Lock className="h-4 w-4" />
                      </IconAction>
                    )}
                    {u.id !== currentUserId && !u.is_active && (
                      <IconAction
                        title={t('users.actionUnlock')}
                        onClick={() => onUnlock(u)}
                        className="text-amber-400 hover:bg-amber-500/10"
                      >
                        <Unlock className="h-4 w-4" />
                      </IconAction>
                    )}
                    {canCreateUser && u.id !== currentUserId && (
                      <IconAction
                        title={t('users.actionDelete')}
                        onClick={() => onRequestDelete(u)}
                        className="text-red-400 hover:bg-red-500/10"
                      >
                        <Trash2 className="h-4 w-4" />
                      </IconAction>
                    )}
                    <IconAction
                      title={t('users.actionResetPassword')}
                      onClick={() => onResetPassword(u.id)}
                      className="text-violet-400 hover:bg-violet-500/10"
                    >
                      <KeyRound className="h-4 w-4" />
                    </IconAction>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

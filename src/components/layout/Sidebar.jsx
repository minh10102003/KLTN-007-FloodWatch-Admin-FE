import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  Home,
  List,
  Search,
  BarChart3,
  Star,
  Users,
  Gauge,
  ClipboardList,
  Settings,
  LogOut,
  Activity,
  BellRing,
  Flame,
  Share2,
} from 'lucide-react';
import { AnimateIcon } from '../ui/AnimateIcon';
import { MotionButton } from '../ui/MotionButton';
import { Tooltip, TooltipContent, TooltipTrigger } from '../ui/Tooltip';
import { useSidebar } from './SidebarContext';
import { getCurrentUser, isAdmin, isModerator } from '../../utils/auth';
import { logout } from '../../services/api';

const NAV = [
  { path: '/', key: 'nav.home', icon: Home },
  { path: '/quan-ly-bao-cao', key: 'nav.reports', icon: List, adminOnly: true },
  { path: '/moderation', key: 'nav.moderation', icon: Search, moderatorOnly: true },
  { path: '/report-stats', key: 'nav.reportStats', icon: BarChart3, moderatorOnly: true },
  { path: '/research', key: 'nav.research', icon: BarChart3 },
  { path: '/heatmap', key: 'nav.heatmap', icon: Flame },
  { path: '/fusion', key: 'nav.fusion', icon: Share2 },
  { path: '/reliability-ranking', key: 'nav.reliability', icon: Star, moderatorOnly: true },
  { path: '/users', key: 'nav.users', icon: Users, adminOnly: true },
  { path: '/sensors', key: 'nav.sensors', icon: Gauge, adminOnly: true },
  { path: '/device-health', key: 'nav.deviceHealth', icon: Activity, adminOnly: true },
  { path: '/emergency-alerts', key: 'nav.emergencyAlerts', icon: BellRing, adminOnly: true },
  { path: '/audit', key: 'nav.audit', icon: ClipboardList, adminOnly: true },
  { path: '/settings', key: 'nav.settings', icon: Settings, adminOnly: true },
];

const APP_VERSION = 'v2.1.0';

export default function Sidebar() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { collapsed, mobileOpen, closeMobileDrawer } = useSidebar();
  const admin = isAdmin();
  const moderator = isModerator();
  const user = getCurrentUser();

  const handleLogout = async () => {
    closeMobileDrawer();
    await logout();
    navigate('/login');
  };

  const widthClass = collapsed ? 'w-[min(280px,88vw)] md:w-16' : 'w-[min(280px,88vw)] md:w-56';

  const roleLabel =
    user?.role === 'admin'
      ? t('layout.roleAdmin')
      : user?.role === 'moderator'
        ? t('layout.roleModerator')
        : user?.role || '—';

  return (
    <aside
      className={`fixed left-0 top-0 bottom-0 z-[100] flex flex-col border-r border-[var(--admin-border)] bg-gradient-to-b from-[#1a2332] via-[var(--admin-sidebar)] to-[#0f1218] shadow-[4px_0_24px_rgba(0,0,0,0.35)] transition-[width,transform] duration-200 ease-out md:shadow-[6px_0_32px_rgba(0,0,0,0.25)] ${widthClass} ${
        mobileOpen ? 'translate-x-0' : '-translate-x-full'
      } md:translate-x-0`}
    >
      <div
        className={`flex shrink-0 flex-col border-b border-[var(--admin-border)]/80 bg-black/10 ${collapsed ? 'items-center justify-center p-3' : 'p-4'}`}
      >
        {collapsed ? (
          <span className="text-xs font-bold tracking-tight text-[var(--admin-primary-fg)]" title={t('brand.title')}>
            FS
          </span>
        ) : (
          <>
            <span className="text-sm font-semibold tracking-tight text-[var(--admin-primary-fg)]">{t('brand.title')}</span>
            <p className="mt-1 text-xs text-[var(--admin-muted)]">{t('nav.subtitle')}</p>
          </>
        )}
      </div>
      <nav className="flex-1 space-y-0.5 overflow-y-auto overflow-x-hidden p-3">
        {NAV.map((item) => {
          if (item.adminOnly && !admin) return null;
          if (item.moderatorOnly && !moderator) return null;
          const Icon = item.icon;
          const label = t(item.key);
          const link = (
            <NavLink
              key={item.path}
              to={item.path}
              onClick={() => closeMobileDrawer()}
              className={({ isActive }) =>
                `relative flex items-center gap-2.5 rounded-lg text-sm font-medium transition-colors ${
                  collapsed ? 'justify-center px-2 py-2.5' : 'px-3 py-2.5'
                } ${
                  isActive
                    ? 'border-l-4 border-sky-400 bg-white/[0.08] text-white shadow-inner'
                    : 'border-l-4 border-transparent text-[var(--admin-muted)] hover:bg-white/[0.05] hover:text-zinc-100'
                }`
              }
            >
              <AnimateIcon size={18} className="shrink-0">
                <Icon className="h-4 w-4" size={18} />
              </AnimateIcon>
              {!collapsed && <span className="truncate">{label}</span>}
            </NavLink>
          );
          return collapsed ? (
            <Tooltip key={item.path} side="right" sideOffset={6}>
              <TooltipTrigger>
                {link}
              </TooltipTrigger>
              <TooltipContent>
                <p>{label}</p>
              </TooltipContent>
            </Tooltip>
          ) : (
            link
          );
        })}
      </nav>

      <div
        className={`shrink-0 space-y-2 border-t border-[var(--admin-border)]/80 bg-black/15 ${collapsed ? 'p-2' : 'p-3'}`}
      >
        {!collapsed && user && (
          <div className="flex items-center gap-3 rounded-xl border border-white/5 bg-white/[0.04] px-3 py-2.5">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[var(--admin-primary)] text-xs font-bold text-white">
              {(user.full_name || user.username || '?').toString().trim().charAt(0).toUpperCase()}
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-zinc-100">{user.full_name || user.username}</p>
              <p className="truncate text-xs text-zinc-500">{roleLabel}</p>
            </div>
          </div>
        )}
        {collapsed && user && (
          <Tooltip side="right" sideOffset={6}>
            <TooltipTrigger>
              <div className="mx-auto flex h-9 w-9 cursor-default items-center justify-center rounded-full bg-[var(--admin-primary)] text-xs font-bold text-white">
                {(user.full_name || user.username || '?').toString().trim().charAt(0).toUpperCase()}
              </div>
            </TooltipTrigger>
            <TooltipContent>
              <p className="font-medium">{user.full_name || user.username}</p>
              <p className="text-xs text-zinc-400">{roleLabel}</p>
            </TooltipContent>
          </Tooltip>
        )}
        {collapsed ? (
          <Tooltip side="right" sideOffset={6}>
            <TooltipTrigger>
              <MotionButton
                type="button"
                onClick={handleLogout}
                className="flex w-full items-center justify-center rounded-lg px-2 py-2.5 text-sm text-[var(--admin-muted)] transition-colors hover:bg-white/5 hover:text-zinc-100"
              >
                <AnimateIcon size={18} className="shrink-0">
                  <LogOut className="h-4 w-4" size={18} />
                </AnimateIcon>
              </MotionButton>
            </TooltipTrigger>
            <TooltipContent>
              <p>{t('layout.logout')}</p>
            </TooltipContent>
          </Tooltip>
        ) : (
          <MotionButton
            type="button"
            onClick={handleLogout}
            className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm text-[var(--admin-muted)] transition-colors hover:bg-white/5 hover:text-zinc-100"
          >
            <AnimateIcon size={18} className="shrink-0">
              <LogOut className="h-4 w-4" size={18} />
            </AnimateIcon>
            <span className="truncate">{t('layout.logout')}</span>
          </MotionButton>
        )}
        <p className={`text-center text-[10px] font-medium uppercase tracking-wider text-zinc-600 ${collapsed ? 'px-0' : ''}`}>
          {APP_VERSION}
        </p>
      </div>
    </aside>
  );
}

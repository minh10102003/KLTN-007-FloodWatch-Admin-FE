import React, { useEffect, useMemo } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Menu, UserCircle, Settings } from 'lucide-react';
import NotificationBell from './NotificationBell';
import { MotionButton } from '../ui/MotionButton';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../ui/Tooltip';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from '../ui/DropdownMenu';
import { SidebarProvider, useSidebar } from './SidebarContext';
import Sidebar from './Sidebar';
import SidebarTrigger from './SidebarTrigger';
import { getCurrentUser, isAdmin } from '../../utils/auth';
import { logout } from '../../services/api';
import { PATH_TO_NAV_KEY } from '../../utils/routeTitle';
import { persistLanguage } from '../../i18n/config';

function LayoutInner({ children }) {
  const { t, i18n } = useTranslation();
  const location = useLocation();
  const navigate = useNavigate();
  const user = getCurrentUser();
  const adminUser = isAdmin();
  const { collapsed, mobileOpen, openMobileDrawer, closeMobileDrawer } = useSidebar();

  const titleKey = PATH_TO_NAV_KEY[location.pathname];
  const title = titleKey ? t(titleKey) : t('layout.pageFallback');

  const crumbs = useMemo(() => {
    const c = [{ to: '/', label: t('layout.admin') }];
    if (location.pathname !== '/') {
      c.push({ to: location.pathname, label: title });
    }
    return c;
  }, [location.pathname, title, t]);

  useEffect(() => {
    closeMobileDrawer();
  }, [location.pathname, closeMobileDrawer]);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const setLang = (lng) => {
    void i18n.changeLanguage(lng);
    persistLanguage(lng);
  };

  return (
    <>
      {mobileOpen && (
        <button
          type="button"
          aria-label={t('layout.closeMenu')}
          className="fixed inset-0 z-[90] cursor-default border-none bg-black/50 p-0 md:hidden"
          onClick={closeMobileDrawer}
        />
      )}
      <Sidebar />
      <div
        className={`ml-0 flex min-h-screen flex-1 flex-col transition-[margin-left] duration-200 ease-out ${
          collapsed ? 'md:ml-16' : 'md:ml-56'
        }`}
      >
        <header className="sticky top-0 z-[80] flex items-center justify-between gap-3 border-b border-[var(--admin-border)] bg-[var(--admin-bg)]/95 px-3 py-3 backdrop-blur supports-[backdrop-filter]:bg-[var(--admin-bg)]/80 sm:px-5">
          <div className="flex min-w-0 flex-1 items-center gap-2">
            <MotionButton
              type="button"
              className="rounded-lg p-2 text-zinc-400 hover:bg-white/5 hover:text-zinc-200 md:hidden"
              aria-label={t('layout.openMenu')}
              onClick={openMobileDrawer}
            >
              <Menu className="h-5 w-5" />
            </MotionButton>
            <div className="hidden md:block">
              <Tooltip side="right" sideOffset={6}>
                <TooltipTrigger>
                  <SidebarTrigger />
                </TooltipTrigger>
                <TooltipContent>
                  <p>{t('layout.collapseSidebar')}</p>
                </TooltipContent>
              </Tooltip>
            </div>

            <nav aria-label="Breadcrumb" className="min-w-0 text-sm">
              <ol className="flex flex-wrap items-center gap-1.5">
                {crumbs.map((item, idx) => (
                  <li key={`${item.to}-${idx}`} className="flex items-center gap-1.5">
                    {idx > 0 && (
                      <span className="text-zinc-600" aria-hidden>
                        /
                      </span>
                    )}
                    {idx < crumbs.length - 1 ? (
                      <Link
                        to={item.to}
                        className="font-medium text-zinc-400 transition-colors hover:text-zinc-100"
                      >
                        {item.label}
                      </Link>
                    ) : (
                      <span className="truncate font-semibold tracking-tight text-zinc-100" title={item.label}>
                        {item.label}
                      </span>
                    )}
                  </li>
                ))}
              </ol>
            </nav>
          </div>

          <div className="flex flex-shrink-0 items-center gap-1 sm:gap-2">
            <span className="mr-1 hidden text-xs text-zinc-500 sm:inline">{t('layout.language')}</span>
            <div className="flex rounded-lg border border-[var(--admin-border)] bg-[var(--admin-surface)]/50 p-0.5">
              <button
                type="button"
                onClick={() => setLang('vi')}
                className={`rounded-md px-2 py-1 text-xs font-medium ${
                  i18n.language === 'vi' ? 'bg-violet-600 text-white' : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                VI
              </button>
              <button
                type="button"
                onClick={() => setLang('en')}
                className={`rounded-md px-2 py-1 text-xs font-medium ${
                  i18n.language === 'en' ? 'bg-violet-600 text-white' : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                EN
              </button>
            </div>

            <NotificationBell />

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  className="flex items-center gap-2 rounded-full border border-[var(--admin-border)] bg-[var(--admin-surface)]/40 py-1 pl-1 pr-2.5 text-left transition-colors hover:bg-white/5"
                  aria-label={t('layout.accountMenu')}
                >
                  <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--admin-primary)] text-xs font-bold text-white">
                    {(user?.full_name || user?.username || '?').toString().trim().charAt(0).toUpperCase()}
                  </span>
                  <span className="hidden max-w-[140px] truncate text-xs font-medium text-zinc-200 lg:inline">
                    {user?.full_name || user?.username || t('layout.accountFallback')}
                  </span>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="min-w-[13rem]">
                <DropdownMenuLabel>
                  <div className="truncate font-semibold text-zinc-100">{user?.full_name || user?.username}</div>
                  <div className="mt-0.5 truncate font-normal normal-case text-zinc-500">
                    {user?.role === 'admin'
                      ? t('layout.roleAdmin')
                      : user?.role === 'moderator'
                        ? t('layout.roleModerator')
                        : user?.role || '—'}
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onSelect={() => {
                    if (adminUser) navigate('/settings');
                    else navigate('/');
                  }}
                >
                  <UserCircle className="h-4 w-4" />
                  {t('layout.profile')}
                </DropdownMenuItem>
                {adminUser && (
                  <DropdownMenuItem onSelect={() => navigate('/settings')}>
                    <Settings className="h-4 w-4" />
                    {t('layout.settings')}
                  </DropdownMenuItem>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem variant="destructive" onSelect={handleLogout}>
                  {t('layout.logout')}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>
        <main className="admin-content flex-1 overflow-y-auto p-4 text-zinc-100 sm:p-6">{children}</main>
      </div>
    </>
  );
}

export default function Layout({ children }) {
  return (
    <TooltipProvider openDelay={200} closeDelay={100}>
      <SidebarProvider>
        <div className="flex min-h-screen bg-[var(--admin-bg)]">
          <LayoutInner>{children}</LayoutInner>
        </div>
      </SidebarProvider>
    </TooltipProvider>
  );
}

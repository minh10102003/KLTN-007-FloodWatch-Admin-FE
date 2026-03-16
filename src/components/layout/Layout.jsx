import React from 'react';
import { useLocation } from 'react-router-dom';
import { Search, LayoutGrid, Star, Sun, Bell, UserCircle, Folder } from 'lucide-react';
import { AnimateIcon } from '../ui/AnimateIcon';
import { MotionButton } from '../ui/MotionButton';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../ui/Tooltip';
import { SidebarProvider, useSidebar } from './SidebarContext';
import Sidebar from './Sidebar';
import SidebarTrigger from './SidebarTrigger';
import { getCurrentUser } from '../../utils/auth';

const pathLabels = {
  '/': 'Tổng quan',
  '/quan-ly-bao-cao': 'Quản lý báo cáo',
  '/moderation': 'Kiểm duyệt báo cáo',
  '/report-stats': 'Thống kê báo cáo',
  '/reliability-ranking': 'Xếp hạng tin cậy',
  '/users': 'Quản lý user',
  '/sensors': 'Quản lý Sensors',
  '/audit': 'Nhật ký hệ thống',
  '/settings': 'Cài đặt hệ thống',
};

function LayoutInner({ children }) {
  const location = useLocation();
  const user = getCurrentUser();
  const { collapsed } = useSidebar();
  const title = pathLabels[location.pathname] || 'Trang';

  return (
    <>
      <Sidebar />
      <div
        className={`flex-1 flex flex-col min-h-screen transition-[margin-left] duration-200 ease-out ${
          collapsed ? 'ml-16' : 'ml-56'
        }`}
      >
        <header className="sticky top-0 z-20 flex items-center justify-between gap-4 px-6 py-3 bg-dashboard-bg border-b border-dashboard-border">
          <div className="flex items-center gap-2">
            <Tooltip side="right" sideOffset={6}>
              <TooltipTrigger>
                <SidebarTrigger />
              </TooltipTrigger>
              <TooltipContent>
                <p>Thu gọn / Mở rộng sidebar</p>
              </TooltipContent>
            </Tooltip>
            <p className="text-sm text-zinc-400">
              Dashboards <span className="text-zinc-500">/</span> <span className="text-zinc-100 font-medium">{title}</span>
            </p>
          </div>
          <div className="flex items-center gap-2">
            <div className="relative flex items-center">
              <Search className="absolute left-3 h-4 w-4 text-zinc-500 pointer-events-none" />
              <input
                type="text"
                placeholder="Search"
                className="w-52 rounded-xl border border-dashboard-border bg-dashboard-surface pl-9 pr-8 py-2 text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500"
              />
              <span className="absolute right-2 flex h-5 w-5 items-center justify-center rounded-full bg-dashboard-card text-[10px] font-medium text-zinc-300">
                7
              </span>
            </div>
            <Tooltip side="bottom" sideOffset={6}>
              <TooltipTrigger>
                <MotionButton type="button" className="p-2 rounded-lg text-zinc-400 hover:bg-white/5 hover:text-zinc-200" aria-label="Apps">
                  <AnimateIcon size={18}><LayoutGrid className="h-4 w-4" /></AnimateIcon>
                </MotionButton>
              </TooltipTrigger>
              <TooltipContent><p>Apps</p></TooltipContent>
            </Tooltip>
            <Tooltip side="bottom" sideOffset={6}>
              <TooltipTrigger>
                <MotionButton type="button" className="p-2 rounded-lg text-zinc-400 hover:bg-white/5 hover:text-zinc-200" aria-label="Favorites">
                  <AnimateIcon size={18}><Star className="h-4 w-4" /></AnimateIcon>
                </MotionButton>
              </TooltipTrigger>
              <TooltipContent><p>Favorites</p></TooltipContent>
            </Tooltip>
            <Tooltip side="bottom" sideOffset={6}>
              <TooltipTrigger>
                <MotionButton type="button" className="p-2 rounded-lg text-zinc-400 hover:bg-white/5 hover:text-zinc-200" aria-label="Theme">
                  <AnimateIcon size={18}><Sun className="h-4 w-4" /></AnimateIcon>
                </MotionButton>
              </TooltipTrigger>
              <TooltipContent><p>Theme</p></TooltipContent>
            </Tooltip>
            <Tooltip side="bottom" sideOffset={6}>
              <TooltipTrigger>
                <MotionButton type="button" className="relative p-2 rounded-lg text-zinc-400 hover:bg-white/5 hover:text-zinc-200" aria-label="Notifications">
                  <AnimateIcon size={18}><Bell className="h-4 w-4" /></AnimateIcon>
                  <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-red-500" />
                </MotionButton>
              </TooltipTrigger>
              <TooltipContent><p>Notifications</p></TooltipContent>
            </Tooltip>
            <Tooltip side="bottom" sideOffset={6}>
              <TooltipTrigger>
                <MotionButton type="button" className="p-2 rounded-lg text-zinc-400 hover:bg-white/5 hover:text-zinc-200" aria-label="User">
                  <AnimateIcon size={18}><UserCircle className="h-5 w-5" /></AnimateIcon>
                </MotionButton>
              </TooltipTrigger>
              <TooltipContent><p>User</p></TooltipContent>
            </Tooltip>
            <Tooltip side="bottom" sideOffset={6}>
              <TooltipTrigger>
                <MotionButton type="button" className="p-2 rounded-lg text-zinc-400 hover:bg-white/5 hover:text-zinc-200" aria-label="Folder">
                  <AnimateIcon size={18}><Folder className="h-4 w-4" /></AnimateIcon>
                </MotionButton>
              </TooltipTrigger>
              <TooltipContent><p>Folder</p></TooltipContent>
            </Tooltip>
            {user && (
              <span className="ml-1 hidden sm:inline text-sm text-zinc-400">
                {user.full_name || user.username}
                <span className="text-zinc-500"> · </span>
                <span className="text-zinc-300">{user.role === 'admin' ? 'Admin' : user.role === 'moderator' ? 'Điều hành viên' : user.role}</span>
              </span>
            )}
          </div>
        </header>
        <main className="admin-content flex-1 overflow-y-auto p-6 text-zinc-100">
          {children}
        </main>
      </div>
    </>
  );
}

export default function Layout({ children }) {
  return (
    <TooltipProvider openDelay={200} closeDelay={100}>
      <SidebarProvider>
        <div className="min-h-screen bg-dashboard-bg flex">
          <LayoutInner>{children}</LayoutInner>
        </div>
      </SidebarProvider>
    </TooltipProvider>
  );
}

import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
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

const navItems = [
  { path: '/', label: 'Tổng quan', icon: Home },
  { path: '/quan-ly-bao-cao', label: 'Quản lý báo cáo', icon: List, adminOnly: true },
  { path: '/moderation', label: 'Kiểm duyệt báo cáo', icon: Search, moderatorOnly: true },
  { path: '/report-stats', label: 'Thống kê báo cáo', icon: BarChart3, moderatorOnly: true },
  { path: '/research', label: 'Research Analytics', icon: BarChart3 },
  { path: '/heatmap', label: 'Heatmap & timeline', icon: Flame },
  { path: '/fusion', label: 'Fusion điểm (A1)', icon: Share2 },
  { path: '/reliability-ranking', label: 'Xếp hạng tin cậy', icon: Star, moderatorOnly: true },
  { path: '/users', label: 'Quản lý user', icon: Users, adminOnly: true },
  { path: '/sensors', label: 'Quản lý Sensors', icon: Gauge, adminOnly: true },
  { path: '/device-health', label: 'Sức khỏe thiết bị', icon: Activity, adminOnly: true },
  { path: '/emergency-alerts', label: 'Thống kê cảnh báo', icon: BellRing, adminOnly: true },
  { path: '/audit', label: 'Nhật ký hệ thống', icon: ClipboardList, adminOnly: true },
  { path: '/settings', label: 'Cài đặt hệ thống', icon: Settings, adminOnly: true },
];

export default function Sidebar() {
  const navigate = useNavigate();
  const { collapsed } = useSidebar();
  const admin = isAdmin();
  const moderator = isModerator();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <aside
      className={`fixed left-0 top-0 bottom-0 z-20 flex flex-col bg-dashboard-sidebar border-r border-dashboard-border transition-[width] duration-200 ease-out ${
        collapsed ? 'w-16' : 'w-56'
      }`}
    >
      <div className={`flex shrink-0 flex-col border-b border-dashboard-border ${collapsed ? 'items-center justify-center p-3' : 'p-4'}`}>
        {collapsed ? (
          <span className="text-xs font-bold text-white" title="FLOODSIGHT Admin">F</span>
        ) : (
          <>
            <span className="text-sm font-semibold text-white">FLOODSIGHT Admin</span>
            <p className="mt-1 text-xs text-zinc-500">Dashboards / Default</p>
          </>
        )}
      </div>
      <nav className="flex-1 overflow-y-auto overflow-x-hidden p-3 space-y-0.5">
        {navItems.map((item) => {
          if (item.adminOnly && !admin) return null;
          if (item.moderatorOnly && !moderator) return null;
          const Icon = item.icon;
          const link = (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                `flex items-center gap-2.5 rounded-lg text-sm transition-colors ${
                  collapsed ? 'justify-center px-2 py-2.5' : 'px-3 py-2.5'
                } ${isActive ? 'bg-zinc-600 text-white' : 'text-zinc-400 hover:bg-white/5 hover:text-zinc-200'}`
              }
            >
              <AnimateIcon size={18} className="shrink-0">
                <Icon className="w-4 h-4" size={18} />
              </AnimateIcon>
              {!collapsed && <span className="truncate">{item.label}</span>}
            </NavLink>
          );
          return collapsed ? (
            <Tooltip key={item.path} side="right" sideOffset={6}>
              <TooltipTrigger>{link}</TooltipTrigger>
              <TooltipContent><p>{item.label}</p></TooltipContent>
            </Tooltip>
          ) : (
            link
          );
        })}
      </nav>
      <div className={`shrink-0 border-t border-dashboard-border ${collapsed ? 'p-2' : 'p-3'}`}>
        {collapsed ? (
          <Tooltip side="right" sideOffset={6}>
            <TooltipTrigger>
              <MotionButton
                type="button"
                onClick={handleLogout}
                className="flex w-full items-center justify-center rounded-lg px-2 py-2.5 text-sm text-zinc-400 hover:bg-white/5 hover:text-zinc-200 transition-colors"
              >
                <AnimateIcon size={18} className="shrink-0">
                  <LogOut className="w-4 h-4" size={18} />
                </AnimateIcon>
              </MotionButton>
            </TooltipTrigger>
            <TooltipContent><p>Đăng xuất</p></TooltipContent>
          </Tooltip>
        ) : (
          <MotionButton
            type="button"
            onClick={handleLogout}
            className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm text-zinc-400 hover:bg-white/5 hover:text-zinc-200 transition-colors"
          >
            <AnimateIcon size={18} className="shrink-0">
              <LogOut className="w-4 h-4" size={18} />
            </AnimateIcon>
            <span className="truncate">Đăng xuất</span>
          </MotionButton>
        )}
      </div>
    </aside>
  );
}

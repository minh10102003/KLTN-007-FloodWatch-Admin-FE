import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { FaHouse, FaUsers, FaMagnifyingGlass, FaRightFromBracket, FaStar, FaChartColumn, FaClipboardList } from 'react-icons/fa6';
import { getCurrentUser, isAdmin } from '../../utils/auth';
import { logout } from '../../services/api';

const navItems = [
  { path: '/', label: 'Tổng quan', icon: FaHouse },
  { path: '/moderation', label: 'Kiểm duyệt báo cáo', icon: FaMagnifyingGlass },
  { path: '/report-stats', label: 'Thống kê báo cáo', icon: FaChartColumn },
  { path: '/reliability-ranking', label: 'Xếp hạng tin cậy', icon: FaStar },
  { path: '/users', label: 'Quản lý user', icon: FaUsers, adminOnly: true },
  { path: '/audit', label: 'Nhật ký hệ thống', icon: FaClipboardList, adminOnly: true },
];

export default function Sidebar() {
  const navigate = useNavigate();
  const user = getCurrentUser();
  const admin = isAdmin();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <aside className="fixed left-0 top-0 bottom-0 z-20 w-56 flex flex-col bg-slate-800 text-white">
      <div className="p-4 border-b border-slate-700">
        <h1 className="font-semibold text-sm">FLOODSIGHT Admin</h1>
        {user && (
          <p className="text-xs text-slate-400 mt-1">
            {user.full_name || user.username} · {user.role === 'admin' ? 'Admin' : 'Điều hành'}
          </p>
        )}
      </div>
      <nav className="flex-1 p-2">
        {navItems.map((item) => {
          if (item.adminOnly && !admin) return null;
          return (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                `flex items-center gap-2 px-3 py-2 rounded-lg text-sm ${isActive ? 'bg-slate-600' : 'hover:bg-slate-700'}`
              }
            >
              <item.icon className="w-4 h-4" />
              {item.label}
            </NavLink>
          );
        })}
      </nav>
      <div className="p-2 border-t border-slate-700">
        <button
          type="button"
          onClick={handleLogout}
          className="flex items-center gap-2 w-full px-3 py-2 rounded-lg text-sm hover:bg-slate-700"
        >
          <FaRightFromBracket className="w-4 h-4" />
          Đăng xuất
        </button>
      </div>
    </aside>
  );
}

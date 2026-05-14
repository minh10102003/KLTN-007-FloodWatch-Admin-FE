import React, { createContext, useContext, useState, useCallback } from 'react';

const SidebarContext = createContext(null);

const STORAGE_KEY = 'admin_sidebar_collapsed';

export function SidebarProvider({ children }) {
  const [collapsed, setCollapsed] = useState(() => {
    try {
      return typeof localStorage !== 'undefined' && localStorage.getItem(STORAGE_KEY) === '1';
    } catch {
      return false;
    }
  });
  const [mobileOpen, setMobileOpen] = useState(false);

  const toggle = useCallback(() => {
    setCollapsed((c) => {
      const next = !c;
      try {
        localStorage.setItem(STORAGE_KEY, next ? '1' : '0');
      } catch {
        /* ignore */
      }
      return next;
    });
  }, []);

  const openMobileDrawer = useCallback(() => setMobileOpen(true), []);
  const closeMobileDrawer = useCallback(() => setMobileOpen(false), []);

  const value = {
    collapsed,
    setCollapsed,
    toggle,
    mobileOpen,
    setMobileOpen,
    openMobileDrawer,
    closeMobileDrawer,
  };
  return <SidebarContext.Provider value={value}>{children}</SidebarContext.Provider>;
}

export function useSidebar() {
  const ctx = useContext(SidebarContext);
  if (!ctx) throw new Error('useSidebar must be used inside SidebarProvider');
  return ctx;
}

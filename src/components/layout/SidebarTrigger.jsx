import React from 'react';
import { PanelLeftClose, PanelLeftOpen } from 'lucide-react';
import { MotionButton } from '../ui/MotionButton';
import { useSidebar } from './SidebarContext';

export const SidebarTrigger = React.forwardRef(function SidebarTrigger(props, ref) {
  const { collapsed, toggle } = useSidebar();
  return (
    <MotionButton
      ref={ref}
      type="button"
      onClick={toggle}
      aria-label={collapsed ? 'Mở rộng sidebar' : 'Thu gọn sidebar'}
      className="p-2 rounded-lg text-zinc-400 hover:bg-white/5 hover:text-zinc-200"
    >
      {collapsed ? <PanelLeftOpen className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}
    </MotionButton>
  );
});

export default SidebarTrigger;

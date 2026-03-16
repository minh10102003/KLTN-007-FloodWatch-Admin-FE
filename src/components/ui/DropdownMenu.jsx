import React from 'react';
import {
  DropdownMenu as DropdownMenuPrimitive,
  DropdownMenuTrigger as DropdownMenuTriggerPrimitive,
  DropdownMenuPortal,
  DropdownMenuContent as DropdownMenuContentPrimitive,
  DropdownMenuGroup as DropdownMenuGroupPrimitive,
  DropdownMenuLabel as DropdownMenuLabelPrimitive,
  DropdownMenuItem as DropdownMenuItemPrimitive,
  DropdownMenuSeparator as DropdownMenuSeparatorPrimitive,
  DropdownMenuSub as DropdownMenuSubPrimitive,
  DropdownMenuSubTrigger as DropdownMenuSubTriggerPrimitive,
  DropdownMenuSubContent as DropdownMenuSubContentPrimitive,
} from '@radix-ui/react-dropdown-menu';
const cn = (...args) => args.filter(Boolean).join(' ');

export const DropdownMenu = DropdownMenuPrimitive;
export const DropdownMenuTrigger = DropdownMenuTriggerPrimitive;

export function DropdownMenuContent({
  className = '',
  side = 'bottom',
  sideOffset = 4,
  align = 'end',
  alignOffset = 0,
  children,
  ...props
}) {
  return (
    <DropdownMenuPortal>
      <DropdownMenuContentPrimitive
        side={side}
        sideOffset={sideOffset}
        align={align}
        alignOffset={alignOffset}
        className={cn(
          'z-[100] min-w-[14rem] overflow-hidden rounded-md border border-dashboard-border bg-dashboard-card py-1 text-zinc-200 shadow-xl',
          className
        )}
        {...props}
      >
        {children}
      </DropdownMenuContentPrimitive>
    </DropdownMenuPortal>
  );
}

export const DropdownMenuGroup = DropdownMenuGroupPrimitive;

export function DropdownMenuLabel({ className = '', ...props }) {
  return (
    <DropdownMenuLabelPrimitive
      className={cn('px-3 py-1.5 text-xs font-medium text-zinc-500', className)}
      {...props}
    />
  );
}

export function DropdownMenuItem({
  className = '',
  variant,
  children,
  ...props
}) {
  return (
    <DropdownMenuItemPrimitive
      className={cn(
        'relative flex cursor-default select-none items-center gap-2 rounded-sm px-3 py-2 text-sm outline-none transition-colors',
        'focus:bg-white/10 focus:text-zinc-100',
        'data-[disabled]:pointer-events-none data-[disabled]:opacity-50',
        variant === 'destructive' && 'text-red-500 focus:bg-red-500/10 focus:text-red-400',
        className
      )}
      {...props}
    >
      {children}
    </DropdownMenuItemPrimitive>
  );
}

export function DropdownMenuShortcut({ className = '', ...props }) {
  return (
    <span
      className={cn('ml-auto text-xs tracking-widest text-zinc-500', className)}
      {...props}
    />
  );
}

export const DropdownMenuSeparator = React.forwardRef(({ className = '', ...props }, ref) => (
  <DropdownMenuSeparatorPrimitive
    ref={ref}
    className={cn('-mx-1 my-1 h-px bg-dashboard-border', className)}
    {...props}
  />
));
DropdownMenuSeparator.displayName = 'DropdownMenuSeparator';

export const DropdownMenuSub = DropdownMenuSubPrimitive;

export function DropdownMenuSubTrigger({ className = '', ...props }) {
  return (
    <DropdownMenuSubTriggerPrimitive
      className={cn(
        'flex cursor-default select-none items-center rounded-sm px-3 py-2 text-sm outline-none focus:bg-white/10 data-[state=open]:bg-white/10',
        className
      )}
      {...props}
    />
  );
}

export function DropdownMenuSubContent({ className = '', ...props }) {
  return (
    <DropdownMenuSubContentPrimitive
      className={cn(
        'z-[100] min-w-[8rem] overflow-hidden rounded-md border border-dashboard-border bg-dashboard-card py-1 text-zinc-200 shadow-xl',
        className
      )}
      {...props}
    />
  );
}

import React from 'react';
import {
  DropdownMenu as RootPrimitive,
  DropdownMenuTrigger as TriggerPrimitive,
  DropdownMenuPortal,
  DropdownMenuContent as ContentPrimitive,
  DropdownMenuGroup as GroupPrimitive,
  DropdownMenuLabel as LabelPrimitive,
  DropdownMenuItem as ItemPrimitive,
  DropdownMenuSeparator as SeparatorPrimitive,
  DropdownMenuSub as SubPrimitive,
  DropdownMenuSubTrigger as SubTriggerPrimitive,
  DropdownMenuSubContent as SubContentPrimitive,
} from '@radix-ui/react-dropdown-menu';

const cn = (...args) => args.filter(Boolean).join(' ');

/** Base Menu API (Animate UI style): Menu, MenuTrigger(render), MenuPanel, MenuGroup, MenuGroupLabel, MenuItem, MenuSeparator, MenuShortcut, MenuSubmenu, MenuSubmenuTrigger, MenuSubmenuPanel */

export const Menu = RootPrimitive;

/** Trigger: use render={<Button>Open</Button>} to pass the trigger element */
export function MenuTrigger({ render }) {
  return <TriggerPrimitive asChild>{render}</TriggerPrimitive>;
}

export function MenuPanel({
  className = '',
  side = 'bottom',
  sideOffset = 4,
  align = 'end',
  alignOffset = 0,
  children,
  ...props
}) {
  const sideNorm = side === 'inline-start' ? 'left' : side === 'inline-end' ? 'right' : side;
  return (
    <DropdownMenuPortal>
      <ContentPrimitive
        side={sideNorm}
        sideOffset={sideOffset}
        align={align}
        alignOffset={alignOffset}
        className={cn(
          'z-[100] w-[var(--radix-dropdown-menu-trigger-width)] min-w-[10rem] overflow-hidden rounded-md border border-dashboard-border bg-dashboard-card py-1 text-zinc-200 shadow-xl',
          className
        )}
        {...props}
      >
        {children}
      </ContentPrimitive>
    </DropdownMenuPortal>
  );
}

export const MenuGroup = GroupPrimitive;

export function MenuGroupLabel({ className = '', ...props }) {
  return (
    <LabelPrimitive
      className={cn('px-3 py-1.5 text-xs font-medium text-zinc-500', className)}
      {...props}
    />
  );
}

export function MenuItem({ className = '', variant, children, ...props }) {
  return (
    <ItemPrimitive
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
    </ItemPrimitive>
  );
}

export function MenuShortcut({ className = '', ...props }) {
  return (
    <span
      className={cn('ml-auto text-xs tracking-widest text-zinc-500', className)}
      {...props}
    />
  );
}

export const MenuSeparator = React.forwardRef(({ className = '', ...props }, ref) => (
  <SeparatorPrimitive
    ref={ref}
    className={cn('-mx-1 my-1 h-px bg-dashboard-border', className)}
    {...props}
  />
));
MenuSeparator.displayName = 'MenuSeparator';

export const MenuSubmenu = SubPrimitive;

export function MenuSubmenuTrigger({ className = '', ...props }) {
  return (
    <SubTriggerPrimitive
      className={cn(
        'flex cursor-default select-none items-center rounded-sm px-3 py-2 text-sm outline-none focus:bg-white/10 data-[state=open]:bg-white/10',
        className
      )}
      {...props}
    />
  );
}

export function MenuSubmenuPanel({ className = '', ...props }) {
  return (
    <SubContentPrimitive
      className={cn(
        'z-[100] min-w-[8rem] overflow-hidden rounded-md border border-dashboard-border bg-dashboard-card py-1 text-zinc-200 shadow-xl',
        className
      )}
      {...props}
    />
  );
}

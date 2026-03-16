import React from 'react';
import { Bug, UserPlus, Bell, Palette, Rocket, FileText, Trash2 } from 'lucide-react';
import { AnimateIcon } from '../ui/AnimateIcon';

/** Snow UI Kit: Notifications, Activities, Contacts - placeholder data */
const notifications = [
  { id: 1, icon: Bug, text: 'You fixed a bug', time: '2 min ago' },
  { id: 2, icon: UserPlus, text: 'New user registered', time: '1 hour ago' },
  { id: 3, icon: Bell, text: 'Andi Lane subscribed to you', time: '3 hours ago' },
];

const activities = [
  { id: 1, icon: Palette, text: 'Changed the style', time: '2 min ago' },
  { id: 2, icon: Rocket, text: 'Released a new version', time: '1 hour ago' },
  { id: 3, icon: Bug, text: 'Submitted a bug', time: '3 hours ago' },
  { id: 4, icon: FileText, text: 'Modified A data in Page X', time: '5 hours ago' },
  { id: 5, icon: Trash2, text: 'Deleted a page in Project X', time: '1 day ago' },
];

const contacts = [
  { id: 1, name: 'Natali Craig', initial: 'N' },
  { id: 2, name: 'Drew Cano', initial: 'D' },
  { id: 3, name: 'Andi Lane', initial: 'A' },
];

function ItemRow({ icon: Icon, text, time }) {
  return (
    <div className="flex gap-3 py-2.5">
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white/5 text-zinc-400">
        <AnimateIcon size={18} animateOnTap={false}>
          <Icon className="h-4 w-4" size={18} />
        </AnimateIcon>
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm text-zinc-300">{text}</p>
        <p className="text-xs text-zinc-500">{time}</p>
      </div>
    </div>
  );
}

export default function RightSidebar() {
  return (
    <aside className="fixed right-0 top-0 bottom-0 z-10 w-72 flex-shrink-0 border-l border-dashboard-border bg-dashboard-bg overflow-y-auto">
      <div className="p-4 space-y-6">
        <section>
          <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-500 mb-3">
            Notifications
          </h3>
          <div className="space-y-0">
            {notifications.map((n) => (
              <ItemRow key={n.id} icon={n.icon} text={n.text} time={n.time} />
            ))}
          </div>
        </section>
        <section>
          <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-500 mb-3">
            Activities
          </h3>
          <div className="space-y-0">
            {activities.map((a) => (
              <ItemRow key={a.id} icon={a.icon} text={a.text} time={a.time} />
            ))}
          </div>
        </section>
        <section>
          <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-500 mb-3">
            Contacts
          </h3>
          <div className="flex flex-wrap gap-2">
            {contacts.map((c) => (
              <div
                key={c.id}
                className="flex items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-white/5"
              >
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-violet-500/20 text-violet-300 text-sm font-medium">
                  {c.initial}
                </div>
                <span className="text-sm text-zinc-300 truncate max-w-[120px]">{c.name}</span>
              </div>
            ))}
          </div>
        </section>
      </div>
    </aside>
  );
}

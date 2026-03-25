import { AppSection } from './types';

type SidebarProps = {
  collapsed: boolean;
  activeSection: AppSection;
  unreadCount: number;
  onToggleCollapsed: () => void;
  onSelectSection: (section: AppSection) => void;
  darkMode: boolean;
  onToggleDarkMode: () => void;
};

const items: Array<{ id: AppSection; label: string; short: string }> = [
  { id: 'chats', label: 'Chats', short: 'C' },
  { id: 'calls', label: 'Calls', short: 'V' },
  { id: 'contacts', label: 'Contacts', short: 'P' },
  { id: 'settings', label: 'Settings', short: 'S' },
];

export function Sidebar(props: SidebarProps) {
  return (
    <aside
      className={`hidden h-full flex-col border-r backdrop-blur-xl transition-all duration-300 md:flex ${
        props.collapsed ? 'w-20' : 'w-72'
      } ${props.darkMode ? 'border-slate-800/90 bg-slate-950/90 text-slate-100' : 'border-slate-200/80 bg-white/85 text-slate-900'}`}
    >
      <div className="flex items-center justify-between px-4 pb-4 pt-6">
        <div className="flex items-center gap-3">
          <div className="grid h-10 w-10 place-items-center rounded-2xl bg-gradient-to-br from-sky-500 via-blue-600 to-indigo-700 text-sm font-bold text-white shadow-[0_10px_30px_rgba(37,99,235,0.35)]">
            IM
          </div>
          {!props.collapsed ? (
            <div>
              <p className="text-sm font-semibold tracking-tight">Internal Messenger</p>
              <p className={`text-[11px] ${props.darkMode ? 'text-slate-400' : 'text-slate-500'}`}>Enterprise Workspace</p>
            </div>
          ) : null}
        </div>
        <button
          type="button"
          onClick={props.onToggleCollapsed}
          className={`rounded-lg border px-2 py-1 text-xs font-semibold transition ${
            props.darkMode ? 'border-slate-700 hover:bg-slate-800' : 'border-slate-300 hover:bg-slate-100'
          }`}
        >
          {props.collapsed ? '>' : '<'}
        </button>
      </div>

      <nav className="space-y-1 px-3">
        {items.map((item) => {
          const active = item.id === props.activeSection;
          const hasBadge = item.id === 'chats' && props.unreadCount > 0;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => props.onSelectSection(item.id)}
              className={`btn-press flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-sm transition ${
                active
                  ? 'bg-gradient-to-r from-indigo-600 to-blue-600 text-white shadow-[0_12px_28px_rgba(37,99,235,0.32)]'
                  : props.darkMode
                    ? 'text-slate-300 hover:bg-slate-900'
                    : 'text-slate-700 hover:bg-slate-100'
              }`}
            >
              <span className="flex items-center gap-2">
                <span className="grid h-7 w-7 place-items-center rounded-lg border border-current/20 text-[11px] font-semibold">
                  {item.short}
                </span>
                {!props.collapsed ? item.label : null}
              </span>
              {!props.collapsed && hasBadge ? (
                <span className="rounded-full bg-emerald-500 px-2 py-0.5 text-[10px] font-semibold text-white shadow-[0_8px_18px_rgba(16,185,129,0.35)]">
                  {props.unreadCount}
                </span>
              ) : null}
            </button>
          );
        })}
      </nav>

      <div className="mt-auto p-4">
        <button
          type="button"
          onClick={props.onToggleDarkMode}
          className={`btn-press w-full rounded-xl border px-3 py-2.5 text-xs font-semibold transition ${
            props.darkMode
              ? 'border-slate-700 bg-slate-900 text-slate-100 hover:bg-slate-800'
              : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-100'
          }`}
        >
          {props.darkMode ? 'Light Mode' : 'Dark Mode'}
        </button>
      </div>
    </aside>
  );
}

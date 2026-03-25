import { AppSection } from './types';

interface SidebarProps {
  collapsed: boolean;
  activeSection: AppSection;
  unreadCount: number;
  onToggleCollapsed: () => void;
  onSelectSection: (section: AppSection) => void;
  darkMode: boolean;
  onToggleDarkMode: () => void;
}

const navItems: Array<{ id: AppSection; label: string; icon: React.ReactNode }> = [
  { 
    id: 'chats', 
    label: 'Chats', 
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
      </svg>
    )
  },
  { 
    id: 'calls', 
    label: 'Calls', 
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
      </svg>
    )
  },
  { 
    id: 'contacts', 
    label: 'Contacts', 
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
      </svg>
    )
  },
  { 
    id: 'settings', 
    label: 'Settings', 
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    )
  },
];

export function Sidebar(props: SidebarProps) {
  return (
    <aside
      className={`hidden h-full flex-col border-r transition-all duration-300 md:flex ${
        props.collapsed ? 'w-20' : 'w-64'
      } ${
        props.darkMode 
          ? 'border-slate-800/50 bg-slate-950/80 text-slate-200' 
          : 'border-slate-200/60 bg-white/80 text-slate-800'
      }`}
      style={{ backdropFilter: 'blur(20px)' }}
    >
      <div className="flex items-center justify-between px-5 pb-5 pt-6">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-11 h-11 rounded-xl bg-gradient-to-br from-blue-600 to-cyan-500 text-white text-sm font-bold shadow-lg shadow-blue-500/20">
            IM
          </div>
          {!props.collapsed && (
            <div className="space-y-0.5">
              <p className="text-sm font-semibold">Internal Messenger</p>
              <p className={`text-[11px] ${props.darkMode ? 'text-slate-500' : 'text-slate-400'}`}>Enterprise Workspace</p>
            </div>
          )}
        </div>
      </div>

      <nav className="flex-1 px-3 space-y-1.5">
        {navItems.map((item) => {
          const isActive = item.id === props.activeSection;
          const hasBadge = item.id === 'chats' && props.unreadCount > 0;
          
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => props.onSelectSection(item.id)}
              className={`group w-full flex items-center justify-between rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200 ${
                isActive
                  ? 'bg-gradient-to-r from-blue-600 to-cyan-500 text-white shadow-lg shadow-blue-500/25'
                  : props.darkMode
                    ? 'text-slate-400 hover:bg-slate-900/60 hover:text-slate-200'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
              }`}
            >
              <span className="flex items-center gap-3">
                <span className={`flex items-center justify-center w-8 h-8 rounded-lg transition-colors ${
                  isActive 
                    ? 'bg-white/20' 
                    : props.darkMode 
                      ? 'bg-slate-800 group-hover:bg-slate-700' 
                      : 'bg-slate-100 group-hover:bg-slate-200'
                }`}>
                  {item.icon}
                </span>
                {!props.collapsed && item.label}
              </span>
              {!props.collapsed && hasBadge && (
                <span className="rounded-full bg-emerald-500 px-2 py-0.5 text-[10px] font-semibold text-white shadow-sm">
                  {props.unreadCount}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      <div className="p-4 border-t border-slate-200/60 dark:border-slate-800/60">
        <button
          type="button"
          onClick={props.onToggleDarkMode}
          className={`w-full flex items-center justify-center gap-2 rounded-xl border px-3 py-2.5 text-xs font-medium transition-all duration-200 ${
            props.darkMode
              ? 'border-slate-700 bg-slate-900/60 text-slate-300 hover:bg-slate-800'
              : 'border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100'
          }`}
        >
          {props.darkMode ? (
            <>
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
              <span>Light Mode</span>
            </>
          ) : (
            <>
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
              </svg>
              <span>Dark Mode</span>
            </>
          )}
        </button>
      </div>
    </aside>
  );
}
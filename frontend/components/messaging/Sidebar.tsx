import { AppSection, Profile, UserStatus } from './types';

interface SidebarProps {
  collapsed: boolean;
  activeSection: AppSection;
  unreadCount: number;
  onToggleCollapsed: () => void;
  onSelectSection: (section: AppSection) => void;
  darkMode: boolean;
  onToggleDarkMode: () => void;
  profile: Profile;
  userStatus: UserStatus;
  onProfileClick: () => void;
}

const AVATAR_GRADIENTS = [
  'from-blue-500 to-indigo-600',
  'from-violet-500 to-purple-600',
  'from-emerald-500 to-teal-600',
  'from-rose-500 to-pink-600',
  'from-amber-500 to-orange-600',
  'from-cyan-500 to-sky-600',
  'from-fuchsia-500 to-violet-600',
];

function avatarGradient(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return AVATAR_GRADIENTS[Math.abs(hash) % AVATAR_GRADIENTS.length];
}

const navItems: Array<{ id: AppSection; label: string; icon: React.ReactNode }> = [
  {
    id: 'chats',
    label: 'Chats',
    icon: (
      <svg className="w-[18px] h-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
      </svg>
    ),
  },
  {
    id: 'calls',
    label: 'Calls',
    icon: (
      <svg className="w-[18px] h-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
      </svg>
    ),
  },
  {
    id: 'contacts',
    label: 'Contacts',
    icon: (
      <svg className="w-[18px] h-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
      </svg>
    ),
  },
  {
    id: 'settings',
    label: 'Settings',
    icon: (
      <svg className="w-[18px] h-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    ),
  },
];

function statusConfig(status: UserStatus) {
  if (status === 'available') return { dot: 'bg-emerald-500', label: 'Available' };
  if (status === 'dnd') return { dot: 'bg-rose-500', label: 'Do Not Disturb' };
  return { dot: 'bg-slate-400', label: 'Invisible' };
}

export function Sidebar(props: SidebarProps) {
  const { dot, label } = statusConfig(props.userStatus);
  const grad = avatarGradient(props.profile.username);

  return (
    <aside
      className={`hidden h-full flex-col border-r transition-all duration-300 md:flex ${
        props.collapsed ? 'w-[72px]' : 'w-60'
      } ${
        props.darkMode
          ? 'border-slate-800/50 bg-slate-950/90 text-slate-200'
          : 'border-slate-200/80 bg-white/90 text-slate-800'
      }`}
      style={{ backdropFilter: 'blur(24px)' }}
    >
      {/* Logo / Brand */}
      <div className={`flex items-center px-4 py-5 ${props.collapsed ? 'justify-center' : 'justify-between'}`}>
        <div className="flex items-center gap-3 min-w-0">
          <div className="relative flex-shrink-0 flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-blue-600 to-cyan-500 text-white text-sm font-bold shadow-lg shadow-blue-500/30">
            <span className="absolute inset-0 rounded-xl bg-white/10" />
            <span className="relative">IM</span>
          </div>
          {!props.collapsed && (
            <div className="min-w-0">
              <p className="text-sm font-bold tracking-tight truncate">Secureline</p>
              <p className={`text-[10px] font-medium tracking-wide ${props.darkMode ? 'text-slate-500' : 'text-slate-400'}`}>
                ENTERPRISE MESSAGING
              </p>
            </div>
          )}
        </div>
        {!props.collapsed && (
          <button
            type="button"
            onClick={props.onToggleCollapsed}
            className={`flex-shrink-0 flex items-center justify-center w-7 h-7 rounded-lg transition-colors ${
              props.darkMode
                ? 'text-slate-500 hover:text-slate-300 hover:bg-slate-800'
                : 'text-slate-400 hover:text-slate-600 hover:bg-slate-100'
            }`}
            title="Collapse sidebar"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
            </svg>
          </button>
        )}
        {props.collapsed && (
          <button
            type="button"
            onClick={props.onToggleCollapsed}
            className={`hidden md:flex items-center justify-center w-7 h-7 rounded-lg transition-colors mt-1 ${
              props.darkMode
                ? 'text-slate-500 hover:text-slate-300 hover:bg-slate-800'
                : 'text-slate-400 hover:text-slate-600 hover:bg-slate-100'
            }`}
            title="Expand sidebar"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13 5l7 7-7 7M5 5l7 7-7 7" />
            </svg>
          </button>
        )}
      </div>

      {/* Divider */}
      <div className={`mx-4 h-px ${props.darkMode ? 'bg-slate-800' : 'bg-slate-100'}`} />

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-1">
        {!props.collapsed && (
          <p className={`px-3 mb-3 text-[10px] font-semibold tracking-widest uppercase ${props.darkMode ? 'text-slate-600' : 'text-slate-400'}`}>
            Menu
          </p>
        )}
        {navItems.map((item) => {
          const isActive = item.id === props.activeSection;
          const hasBadge = item.id === 'chats' && props.unreadCount > 0;

          return (
            <button
              key={item.id}
              type="button"
              onClick={() => props.onSelectSection(item.id)}
              title={props.collapsed ? item.label : undefined}
              className={`group w-full flex items-center rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200 ${
                props.collapsed ? 'justify-center' : 'justify-between'
              } ${
                isActive
                  ? 'bg-gradient-to-r from-blue-600 to-cyan-500 text-white shadow-md shadow-blue-500/25'
                  : props.darkMode
                    ? 'text-slate-400 hover:bg-slate-800/80 hover:text-slate-100'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
              }`}
            >
              <span className={`flex items-center ${props.collapsed ? '' : 'gap-3'}`}>
                <span className={`flex items-center justify-center w-8 h-8 rounded-lg flex-shrink-0 transition-colors ${
                  isActive
                    ? 'bg-white/20'
                    : props.darkMode
                      ? 'bg-slate-800 group-hover:bg-slate-700'
                      : 'bg-slate-100 group-hover:bg-slate-200'
                }`}>
                  {item.icon}
                </span>
                {!props.collapsed && <span>{item.label}</span>}
              </span>
              {!props.collapsed && hasBadge && (
                <span className="min-w-[20px] h-5 flex items-center justify-center rounded-full bg-blue-500/20 px-1.5 text-[10px] font-bold text-blue-300 ring-1 ring-blue-500/30">
                  {props.unreadCount > 99 ? '99+' : props.unreadCount}
                </span>
              )}
              {props.collapsed && hasBadge && (
                <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-blue-500" />
              )}
            </button>
          );
        })}
      </nav>

      {/* Bottom section */}
      <div className={`p-3 space-y-2 border-t ${props.darkMode ? 'border-slate-800/60' : 'border-slate-100'}`}>
        {/* Profile */}
        <button
          type="button"
          onClick={props.onProfileClick}
          title={props.collapsed ? props.profile.username : undefined}
          className={`w-full flex items-center gap-3 rounded-xl px-3 py-2.5 transition-all duration-200 ${
            props.collapsed ? 'justify-center' : ''
          } ${
            props.darkMode ? 'hover:bg-slate-800/80' : 'hover:bg-slate-100'
          }`}
        >
          <div className="relative flex-shrink-0">
            <div className={`w-8 h-8 rounded-xl bg-gradient-to-br ${grad} flex items-center justify-center text-sm font-semibold text-white shadow-sm`}>
              {props.profile.username.charAt(0).toUpperCase()}
            </div>
            <span className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 ${
              props.darkMode ? 'border-slate-950' : 'border-white'
            } ${dot}`} />
          </div>
          {!props.collapsed && (
            <div className="min-w-0 flex-1 text-left">
              <p className="text-sm font-medium truncate">{props.profile.username}</p>
              <p className={`text-[11px] ${props.darkMode ? 'text-slate-500' : 'text-slate-400'}`}>{label}</p>
            </div>
          )}
        </button>

        {/* Dark mode toggle */}
        <button
          type="button"
          onClick={props.onToggleDarkMode}
          title={props.collapsed ? (props.darkMode ? 'Light Mode' : 'Dark Mode') : undefined}
          className={`w-full flex items-center gap-2 rounded-xl border px-3 py-2 text-xs font-medium transition-all duration-200 ${
            props.collapsed ? 'justify-center' : ''
          } ${
            props.darkMode
              ? 'border-slate-800 bg-slate-900/60 text-slate-400 hover:bg-slate-800 hover:text-slate-200'
              : 'border-slate-200 bg-slate-50 text-slate-500 hover:bg-slate-100 hover:text-slate-700'
          }`}
        >
          {props.darkMode ? (
            <>
              <svg className="w-3.5 h-3.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
              {!props.collapsed && 'Light Mode'}
            </>
          ) : (
            <>
              <svg className="w-3.5 h-3.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
              </svg>
              {!props.collapsed && 'Dark Mode'}
            </>
          )}
        </button>

        {/* Security badge */}
        {!props.collapsed && (
          <div className={`flex items-center justify-center gap-1.5 rounded-lg px-2 py-1.5 ${
            props.darkMode ? 'bg-emerald-500/5 text-emerald-500/70' : 'bg-emerald-50 text-emerald-600/70'
          }`}>
            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
            <span className="text-[10px] font-medium">End-to-End Encrypted</span>
          </div>
        )}
      </div>
    </aside>
  );
}

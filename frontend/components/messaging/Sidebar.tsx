'use client';

import React from 'react';
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

const navItems: Array<{ id: AppSection; label: string; icon: (active: boolean) => React.ReactNode }> = [
  {
    id: 'chats',
    label: 'Chats',
    icon: (active) => (
      <svg className="w-5 h-5" viewBox="0 0 24 24" fill={active ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth={active ? 0 : 1.75}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
      </svg>
    ),
  },
  {
    id: 'calls',
    label: 'Calls',
    icon: (active) => (
      <svg className="w-5 h-5" viewBox="0 0 24 24" fill={active ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth={active ? 0 : 1.75}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
      </svg>
    ),
  },
  {
    id: 'contacts',
    label: 'Contacts',
    icon: (active) => (
      <svg className="w-5 h-5" viewBox="0 0 24 24" fill={active ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth={active ? 0 : 1.75}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
      </svg>
    ),
  },
  {
    id: 'meetings',
    label: 'Meetings',
    icon: (active) => (
      <svg className="w-5 h-5" viewBox="0 0 24 24" fill={active ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth={active ? 0 : 1.75}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
      </svg>
    ),
  },
  {
    id: 'settings',
    label: 'Settings',
    icon: (active) => (
      <svg className="w-5 h-5" viewBox="0 0 24 24" fill={active ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth={active ? 0 : 1.75}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    ),
  },
];

function statusDotColor(status: UserStatus) {
  if (status === 'available') return 'bg-emerald-500';
  if (status === 'dnd') return 'bg-rose-500';
  return 'bg-slate-400';
}

export function Sidebar(props: SidebarProps) {
  const grad = avatarGradient(props.profile.username);
  const dot = statusDotColor(props.userStatus);

  return (
    <aside
      className={`hidden md:flex flex-col h-full w-[68px] shrink-0 border-r transition-colors duration-200 ${
        props.darkMode
          ? 'border-white/5 bg-slate-900'
          : 'border-slate-200 bg-white'
      }`}
    >
      {/* Logo */}
      <div className="flex items-center justify-center h-16 shrink-0">
        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-600 to-cyan-500 flex items-center justify-center shadow-lg shadow-blue-500/20">
          <span className="text-white text-sm font-bold tracking-tight">IM</span>
        </div>
      </div>

      {/* Divider */}
      <div className={`mx-4 h-px mb-2 ${props.darkMode ? 'bg-white/5' : 'bg-slate-100'}`} />

      {/* Nav items */}
      <nav className="flex-1 flex flex-col items-center gap-1 px-2 py-2">
        {navItems.map((item) => {
          const isActive = item.id === props.activeSection;
          const hasBadge = item.id === 'chats' && props.unreadCount > 0;

          return (
            <button
              key={item.id}
              type="button"
              onClick={() => props.onSelectSection(item.id)}
              title={item.label}
              className={`group relative w-full flex flex-col items-center justify-center gap-1 h-12 rounded-xl text-[10px] font-semibold transition-all duration-150 ${
                isActive
                  ? props.darkMode
                    ? 'bg-blue-500/15 text-blue-400'
                    : 'bg-blue-50 text-blue-600'
                  : props.darkMode
                    ? 'text-slate-500 hover:bg-white/5 hover:text-slate-300'
                    : 'text-slate-400 hover:bg-slate-50 hover:text-slate-600'
              }`}
            >
              {/* Active indicator bar */}
              {isActive && (
                <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-6 rounded-r-full bg-blue-500" />
              )}

              <span className="relative">
                {item.icon(isActive)}
                {hasBadge && (
                  <span className="absolute -top-1 -right-1 min-w-[16px] h-4 flex items-center justify-center rounded-full bg-blue-500 text-white text-[9px] font-bold px-0.5 shadow-sm">
                    {props.unreadCount > 99 ? '99+' : props.unreadCount}
                  </span>
                )}
              </span>
              <span className="leading-none">{item.label}</span>
            </button>
          );
        })}
      </nav>

      {/* Bottom section */}
      <div className={`flex flex-col items-center gap-2 px-2 py-3 border-t ${props.darkMode ? 'border-white/5' : 'border-slate-100'}`}>
        {/* Theme toggle */}
        <button
          type="button"
          onClick={props.onToggleDarkMode}
          title={props.darkMode ? 'Light mode' : 'Dark mode'}
          className={`w-10 h-10 flex items-center justify-center rounded-xl transition-all duration-150 ${
            props.darkMode
              ? 'text-slate-500 hover:bg-white/5 hover:text-slate-300'
              : 'text-slate-400 hover:bg-slate-50 hover:text-slate-600'
          }`}
        >
          {props.darkMode ? (
            <svg className="w-4.5 h-4.5 w-[18px] h-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
            </svg>
          ) : (
            <svg className="w-[18px] h-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
            </svg>
          )}
        </button>

        {/* Profile avatar */}
        <button
          type="button"
          onClick={props.onProfileClick}
          title={`${props.profile.username} — click to open settings`}
          className="relative w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-150 hover:ring-2 hover:ring-blue-500/40 focus:outline-none"
        >
          <div className={`w-9 h-9 rounded-xl bg-gradient-to-br ${grad} flex items-center justify-center text-sm font-bold text-white shadow-sm`}>
            {props.profile.username.charAt(0).toUpperCase()}
          </div>
          <span className={`absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border-2 ${
            props.darkMode ? 'border-slate-900' : 'border-white'
          } ${dot}`} />
        </button>
      </div>
    </aside>
  );
}

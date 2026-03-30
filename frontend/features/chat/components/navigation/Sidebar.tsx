'use client';

import React from 'react';
import Link from 'next/link';
import { AppSection, Profile, UserStatus } from '@/features/chat/types';
import { avatarGradient } from '@/lib/avatar';

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
      className={`hidden md:flex flex-col h-full w-[64px] shrink-0 border-r transition-colors duration-200 ${
        props.darkMode
          ? 'border-white/5 bg-[#111b21]'
          : 'border-slate-200 bg-[#f0f2f5]'
      }`}
    >
      {/* Nav items */}
      <nav className="flex-1 flex flex-col items-center gap-1 px-2 py-4">
        {navItems.map((item) => {
          const isActive = item.id === props.activeSection;
          const hasBadge = item.id === 'chats' && props.unreadCount > 0;

          return (
            <button
              key={item.id}
              type="button"
              onClick={() => props.onSelectSection(item.id)}
              title={item.label}
              className={`group relative w-full flex items-center justify-center h-10 rounded-xl transition-all duration-150 ${
                isActive
                  ? props.darkMode
                    ? 'bg-[#202c33] text-[#00a884]'
                    : 'bg-white text-[#00a884] shadow-sm'
                  : props.darkMode
                    ? 'text-slate-500 hover:bg-white/5 hover:text-slate-300'
                    : 'text-slate-500 hover:bg-white/70 hover:text-slate-700'
              }`}
            >
              {/* Active indicator bar */}
              {isActive && (
                <span
                  className={`absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-7 rounded-r-full ${
                    props.darkMode ? 'bg-[#00a884]' : 'bg-[#00a884]'
                  }`}
                />
              )}

              <span className="relative">
                {item.icon(isActive)}
                {hasBadge && (
                  <span className="absolute -top-1 -right-1 min-w-[16px] h-4 flex items-center justify-center rounded-full bg-[#00a884] text-white text-[9px] font-bold px-0.5">
                    {props.unreadCount > 99 ? '99+' : props.unreadCount}
                  </span>
                )}
              </span>
            </button>
          );
        })}
      </nav>

      {/* Bottom section */}
      <div
        className={`flex flex-col items-center gap-1 px-2 py-3 border-t ${
          props.darkMode ? 'border-white/5' : 'border-slate-200'
        }`}
      >
        {/* Admin button */}
        {props.profile.role === 'admin' && (
          <Link
            href="/admin"
            title="Admin Panel"
            className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-150 ${
              props.darkMode
                ? 'text-indigo-400 hover:bg-indigo-500/20'
                : 'text-indigo-600 hover:bg-indigo-50'
            }`}
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
          </Link>
        )}

        {/* Profile avatar */}
        <button
          type="button"
          onClick={props.onProfileClick}
          title={`${props.profile.username} — click to open settings`}
          className="relative w-10 h-10 rounded-full flex items-center justify-center transition-all duration-150 hover:opacity-80 focus:outline-none"
        >
          <div
            className={`w-10 h-10 rounded-full bg-gradient-to-br ${grad} flex items-center justify-center text-sm font-bold text-white`}
          >
            {props.profile.username.charAt(0).toUpperCase()}
          </div>
          <span
            className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 ${
              props.darkMode ? 'border-[#111b21]' : 'border-[#f0f2f5]'
            } ${dot}`}
          />
        </button>
      </div>
    </aside>
  );
}

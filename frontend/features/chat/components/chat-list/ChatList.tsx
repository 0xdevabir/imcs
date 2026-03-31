'use client';

import { useState } from 'react';
import { RoomItem } from '@/features/chat/types';
import { avatarGradient } from '@/lib/avatar';

interface ChatListProps {
  rooms: RoomItem[];
  activeRoomKey: string;
  searchQuery: string;
  onSearchQueryChange: (value: string) => void;
  onOpenRoom: (roomKey: string) => void;
  pinnedRoomKeys: string[];
  onTogglePin: (roomKey: string) => void;
  onOpenCreateGroup: () => void;
  darkMode: boolean;
}

type FilterTab = 'all' | 'unread' | 'groups';

export function ChatList(props: ChatListProps) {
  const [activeFilter, setActiveFilter] = useState<FilterTab>('all');

  const query = props.searchQuery.trim().toLowerCase();

  const unreadCount = props.rooms.filter((r) => r.unread > 0).length;
  const groupCount = props.rooms.filter((r) => !r.key.startsWith('dm_')).length;

  let filtered = query
    ? props.rooms.filter(
        (r) =>
          r.name.toLowerCase().includes(query) ||
          r.key.toLowerCase().includes(query) ||
          r.lastMessage.toLowerCase().includes(query),
      )
    : props.rooms;

  if (activeFilter === 'unread') filtered = filtered.filter((r) => r.unread > 0);
  if (activeFilter === 'groups') filtered = filtered.filter((r) => !r.key.startsWith('dm_'));

  const pinned = filtered.filter((r) => props.pinnedRoomKeys.includes(r.key));
  const others = filtered.filter((r) => !props.pinnedRoomKeys.includes(r.key));

  const filterTabs: { id: FilterTab; label: string }[] = [
    { id: 'all', label: 'All' },
    { id: 'unread', label: `Unread${unreadCount > 0 ? ` ${unreadCount}` : ''}` },
    { id: 'groups', label: `Groups${groupCount > 0 ? ` ${groupCount}` : ''}` },
  ];

  return (
    <section
      className={`h-full flex flex-col border-r ${
        props.darkMode ? 'border-white/5 bg-[#111b21]' : 'border-slate-200 bg-white'
      }`}
    >
      {/* Header */}
      <div
        className={`px-4 pt-3 pb-3 border-b ${
          props.darkMode ? 'border-white/5 bg-[#202c33]' : 'border-slate-100 bg-white'
        }`}
      >
        <div className="flex items-center justify-between mb-3">
          <h2
            className={`text-xl font-bold tracking-tight ${
              props.darkMode ? 'text-slate-100' : 'text-slate-900'
            }`}
          >
            Chats
          </h2>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={props.onOpenCreateGroup}
              title="New chat"
              className={`w-9 h-9 flex items-center justify-center rounded-full transition-all duration-150 active:scale-95 ${
                props.darkMode
                  ? 'text-slate-400 hover:bg-white/8 hover:text-slate-200'
                  : 'text-slate-500 hover:bg-slate-100 hover:text-slate-700'
              }`}
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
            </button>
          </div>
        </div>

        {/* Search bar */}
        <div
          className={`flex items-center gap-2.5 rounded-full px-4 py-2.5 ${
            props.darkMode ? 'bg-[#2a3942]' : 'bg-slate-100'
          }`}
        >
          <svg
            className={`w-4 h-4 flex-shrink-0 ${props.darkMode ? 'text-slate-400' : 'text-slate-400'}`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
          <input
            value={props.searchQuery}
            onChange={(e) => props.onSearchQueryChange(e.target.value)}
            placeholder="Search or start a new chat"
            className={`flex-1 bg-transparent text-sm outline-none ${
              props.darkMode
                ? 'text-slate-200 placeholder:text-slate-500'
                : 'text-slate-800 placeholder:text-slate-400'
            }`}
          />
          {props.searchQuery && (
            <button
              type="button"
              onClick={() => props.onSearchQueryChange('')}
              className={`flex-shrink-0 transition-colors ${
                props.darkMode ? 'text-slate-500 hover:text-slate-300' : 'text-slate-400 hover:text-slate-600'
              }`}
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>

        {/* Filter tabs */}
        <div className="flex items-center gap-2 mt-2 px-1.5 pt-1.5 pb-1.5 overflow-x-auto scrollbar-none">
          {filterTabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveFilter(tab.id)}
              className={`min-h-[36px] px-4 py-2 rounded-full text-xs font-semibold whitespace-nowrap flex-shrink-0 transition-all duration-150 active:scale-95 ${
                activeFilter === tab.id
                  ? props.darkMode
                    ? 'bg-[#00a884] text-white'
                    : 'bg-[#25d366] text-white'
                  : props.darkMode
                    ? 'bg-[#2a3942] text-slate-300 hover:bg-[#364952]'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Room list */}
      <div className="flex-1 overflow-y-auto pt-2">
        {pinned.length > 0 && (
          <div>
            <div className={`px-4 py-2 ${props.darkMode ? 'text-slate-500' : 'text-slate-400'}`}>
              <span className="text-[10px] font-bold uppercase tracking-widest flex items-center gap-1.5">
                <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
                </svg>
                Pinned
              </span>
            </div>
            {pinned.map((room) => (
              <ChatListItem
                key={room.key}
                room={room}
                active={room.key === props.activeRoomKey}
                onOpen={props.onOpenRoom}
                onTogglePin={props.onTogglePin}
                darkMode={props.darkMode}
                isPinned={true}
              />
            ))}
          </div>
        )}

        {others.length > 0 && (
          <div>
            {pinned.length > 0 && (
              <div className={`px-4 py-2 ${props.darkMode ? 'text-slate-500' : 'text-slate-400'}`}>
                <span className="text-[10px] font-bold uppercase tracking-widest">All Chats</span>
              </div>
            )}
            {others.map((room) => (
              <ChatListItem
                key={room.key}
                room={room}
                active={room.key === props.activeRoomKey}
                onOpen={props.onOpenRoom}
                onTogglePin={props.onTogglePin}
                darkMode={props.darkMode}
                isPinned={false}
              />
            ))}
          </div>
        )}

        {filtered.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 text-center px-6">
            <div
              className={`w-14 h-14 rounded-full flex items-center justify-center mb-4 ${
                props.darkMode ? 'bg-[#2a3942]' : 'bg-slate-100'
              }`}
            >
              <svg
                className={`w-7 h-7 ${props.darkMode ? 'text-slate-500' : 'text-slate-400'}`}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={1.5}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                />
              </svg>
            </div>
            <p
              className={`text-sm font-semibold ${props.darkMode ? 'text-slate-400' : 'text-slate-600'}`}
            >
              {query ? 'No results found' : activeFilter !== 'all' ? 'Nothing here' : 'No conversations yet'}
            </p>
            <p
              className={`text-xs mt-1 leading-relaxed ${
                props.darkMode ? 'text-slate-600' : 'text-slate-400'
              }`}
            >
              {query
                ? 'Try a different search term'
                : activeFilter === 'unread'
                  ? 'All caught up!'
                  : 'Start by creating a group chat'}
            </p>
          </div>
        )}
      </div>
    </section>
  );
}

interface ItemProps {
  room: RoomItem;
  active: boolean;
  onOpen: (roomKey: string) => void;
  onTogglePin: (roomKey: string) => void;
  darkMode: boolean;
  isPinned: boolean;
}

function ChatListItem(props: ItemProps) {
  const formatTime = (dateStr?: string) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    if (days === 0) return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    if (days === 1) return 'Yesterday';
    if (days < 7) return date.toLocaleDateString([], { weekday: 'short' });
    return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
  };

  const grad = avatarGradient(props.room.name);
  const isGroup = !props.room.key.startsWith('dm_');

  return (
    <button
      type="button"
      onClick={() => props.onOpen(props.room.key)}
      className={`group w-full text-left transition-colors duration-100 ${
        props.active
          ? props.darkMode
            ? 'bg-[#2a3942]'
            : 'bg-slate-100'
          : props.darkMode
            ? 'hover:bg-[#202c33]'
            : 'hover:bg-slate-50'
      }`}
    >
      <div className="flex items-center gap-3 px-3 py-3">
        {/* Avatar */}
        <div
          className={`relative flex-shrink-0 w-12 h-12 rounded-full bg-gradient-to-br ${grad} flex items-center justify-center text-base font-bold text-white`}
        >
          {props.room.name.charAt(0).toUpperCase()}
          {isGroup && (
            <span
              className={`absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full flex items-center justify-center text-[8px] font-bold ${
                props.darkMode ? 'bg-[#2a3942] text-slate-300' : 'bg-slate-200 text-slate-600'
              } ring-2 ${props.darkMode ? 'ring-[#111b21]' : 'ring-white'}`}
            >
              G
            </span>
          )}
        </div>

        {/* Content */}
          <div className="flex-1 min-w-0 py-0.5">
          <div className="flex items-baseline justify-between gap-2">
            <p
              className={`text-[15px] font-medium truncate leading-tight ${
                props.darkMode ? 'text-slate-100' : 'text-slate-900'
              }`}
            >
              {props.room.name}
            </p>
            <span
              className={`text-[11px] flex-shrink-0 tabular-nums ${
                props.room.unread > 0
                  ? props.darkMode
                    ? 'text-[#00a884] font-medium'
                    : 'text-[#25d366] font-medium'
                  : props.darkMode
                    ? 'text-slate-500'
                    : 'text-slate-400'
              }`}
            >
              {formatTime(props.room.lastAt)}
            </span>
          </div>
          <div className="flex items-center justify-between gap-1 mt-0.5">
            <p
              className={`text-sm truncate leading-relaxed ${
                props.darkMode ? 'text-slate-500' : 'text-slate-500'
              }`}
            >
              {props.room.lastMessage || 'No messages yet'}
            </p>
            <div className="flex items-center gap-1.5 flex-shrink-0">
              {props.room.unread > 0 && (
                <span
                  className={`min-w-[20px] h-5 flex items-center justify-center rounded-full px-1.5 text-[11px] font-bold text-white ${
                    props.darkMode ? 'bg-[#00a884]' : 'bg-[#25d366]'
                  }`}
                >
                  {props.room.unread > 99 ? '99+' : props.room.unread}
                </span>
              )}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  props.onTogglePin(props.room.key);
                }}
                className={`opacity-0 group-hover:opacity-100 transition-opacity duration-150 p-0.5 rounded ${
                  props.isPinned
                    ? props.darkMode
                      ? 'text-amber-500 hover:text-amber-400'
                      : 'text-amber-500 hover:text-amber-600'
                    : props.darkMode
                      ? 'text-slate-500 hover:text-slate-300'
                      : 'text-slate-400 hover:text-slate-600'
                }`}
                title={props.isPinned ? 'Unpin' : 'Pin'}
              >
                {props.isPinned ? (
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 2v6" />
                  </svg>
                ) : (
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
                  </svg>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </button>
  );
}

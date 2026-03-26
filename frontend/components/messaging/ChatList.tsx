import { RoomItem } from './types';

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

export function ChatList(props: ChatListProps) {
  const query = props.searchQuery.trim().toLowerCase();
  const filtered = query
    ? props.rooms.filter(
        (r) =>
          r.name.toLowerCase().includes(query) ||
          r.key.toLowerCase().includes(query) ||
          r.lastMessage.toLowerCase().includes(query),
      )
    : props.rooms;

  const pinned = filtered.filter((r) => props.pinnedRoomKeys.includes(r.key));
  const others = filtered.filter((r) => !props.pinnedRoomKeys.includes(r.key));

  return (
    <section
      className={`h-full flex flex-col border-r transition-all duration-300 ${
        props.darkMode
          ? 'border-slate-800/50 bg-slate-950/90 text-slate-200'
          : 'border-slate-200/80 bg-white/90 text-slate-800'
      }`}
      style={{ backdropFilter: 'blur(24px)' }}
    >
      {/* Header */}
      <div className={`px-4 pt-5 pb-4 border-b ${props.darkMode ? 'border-slate-800/60' : 'border-slate-100'}`}>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-base font-bold tracking-tight">Chats</h2>
            <p className={`text-xs mt-0.5 ${props.darkMode ? 'text-slate-500' : 'text-slate-400'}`}>
              {props.rooms.length} conversation{props.rooms.length !== 1 ? 's' : ''}
            </p>
          </div>
          <button
            type="button"
            onClick={props.onOpenCreateGroup}
            className="flex items-center gap-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 px-3 py-1.5 text-[11px] font-semibold text-white shadow-sm transition-all active:scale-95"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            New Group
          </button>
        </div>

        {/* Search */}
        <div className="relative">
          <svg
            className={`absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 ${props.darkMode ? 'text-slate-500' : 'text-slate-400'}`}
            fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            value={props.searchQuery}
            onChange={(e) => props.onSearchQueryChange(e.target.value)}
            placeholder="Search conversations..."
            className={`w-full rounded-lg border pl-9 pr-8 py-2 text-sm outline-none transition-all ${
              props.darkMode
                ? 'border-slate-700/80 bg-slate-900/80 text-slate-200 placeholder:text-slate-600 focus:border-blue-500/60 focus:ring-2 focus:ring-blue-500/10'
                : 'border-slate-200 bg-slate-50 text-slate-800 placeholder:text-slate-400 focus:border-blue-400 focus:ring-2 focus:ring-blue-500/10'
            }`}
          />
          {props.searchQuery && (
            <button
              type="button"
              onClick={() => props.onSearchQueryChange('')}
              className={`absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 rounded-full transition-colors ${
                props.darkMode ? 'text-slate-500 hover:text-slate-300' : 'text-slate-400 hover:text-slate-600'
              }`}
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* Room list */}
      <div className="flex-1 overflow-y-auto px-3 py-3 space-y-5">
        {pinned.length > 0 && (
          <div>
            <SectionLabel label="Pinned" darkMode={props.darkMode} />
            <div className="space-y-0.5">
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
          </div>
        )}

        {others.length > 0 && (
          <div>
            {pinned.length > 0 && <SectionLabel label="All Chats" darkMode={props.darkMode} />}
            <div className="space-y-0.5">
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
          </div>
        )}

        {filtered.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 text-center px-4">
            <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mb-4 ${
              props.darkMode ? 'bg-slate-800/80' : 'bg-slate-100'
            }`}>
              <svg className={`w-7 h-7 ${props.darkMode ? 'text-slate-600' : 'text-slate-400'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
              </svg>
            </div>
            <p className={`text-sm font-medium ${props.darkMode ? 'text-slate-400' : 'text-slate-600'}`}>
              {query ? 'No results' : 'No conversations yet'}
            </p>
            <p className={`text-xs mt-1 ${props.darkMode ? 'text-slate-600' : 'text-slate-400'}`}>
              {query ? 'Try a different search' : 'Create a group to get started'}
            </p>
          </div>
        )}
      </div>
    </section>
  );
}

function SectionLabel({ label, darkMode }: { label: string; darkMode: boolean }) {
  return (
    <p className={`px-2 py-1 mb-1 text-[10px] font-bold uppercase tracking-widest ${darkMode ? 'text-slate-600' : 'text-slate-400'}`}>
      {label}
    </p>
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
      className={`group w-full text-left rounded-xl px-3 py-2.5 transition-all duration-150 ${
        props.active
          ? props.darkMode
            ? 'bg-blue-600/20 ring-1 ring-blue-500/30'
            : 'bg-blue-50 ring-1 ring-blue-200'
          : props.darkMode
            ? 'hover:bg-slate-800/60'
            : 'hover:bg-slate-50'
      }`}
    >
      <div className="flex items-center gap-3">
        {/* Avatar */}
        <div className={`relative flex-shrink-0 w-10 h-10 rounded-xl bg-gradient-to-br ${grad} flex items-center justify-center text-sm font-bold text-white shadow-sm`}>
          {props.room.name.charAt(0).toUpperCase()}
          {isGroup && (
            <span className={`absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full flex items-center justify-center ${
              props.darkMode ? 'bg-slate-800 text-slate-400' : 'bg-white text-slate-500'
            } ring-1 ${props.darkMode ? 'ring-slate-700' : 'ring-slate-100'}`}>
              <svg className="w-2.5 h-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </span>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-baseline justify-between gap-1">
            <p className={`text-sm font-semibold truncate ${
              props.active
                ? props.darkMode ? 'text-blue-300' : 'text-blue-700'
                : props.darkMode ? 'text-slate-200' : 'text-slate-800'
            }`}>
              {props.room.name}
            </p>
            <span className={`text-[11px] flex-shrink-0 ${
              props.active
                ? props.darkMode ? 'text-blue-400' : 'text-blue-500'
                : props.darkMode ? 'text-slate-600' : 'text-slate-400'
            }`}>
              {formatTime(props.room.lastAt)}
            </span>
          </div>
          <div className="flex items-center justify-between gap-1 mt-0.5">
            <p className={`text-xs truncate ${
              props.darkMode ? 'text-slate-500' : 'text-slate-400'
            }`}>
              {props.room.lastMessage || 'No messages yet'}
            </p>
            <div className="flex items-center gap-1.5 flex-shrink-0">
              {props.room.unread > 0 && (
                <span className="min-w-[18px] h-[18px] flex items-center justify-center rounded-full bg-blue-600 px-1 text-[10px] font-bold text-white">
                  {props.room.unread > 99 ? '99+' : props.room.unread}
                </span>
              )}
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); props.onTogglePin(props.room.key); }}
                className={`opacity-0 group-hover:opacity-100 transition-all duration-150 p-0.5 rounded ${
                  props.isPinned
                    ? props.darkMode ? 'text-blue-400 opacity-100' : 'text-blue-500 opacity-100'
                    : props.darkMode ? 'text-slate-500 hover:text-slate-300' : 'text-slate-400 hover:text-slate-600'
                }`}
                title={props.isPinned ? 'Unpin' : 'Pin'}
              >
                <svg className="w-3 h-3" fill={props.isPinned ? 'currentColor' : 'none'} viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </div>
    </button>
  );
}

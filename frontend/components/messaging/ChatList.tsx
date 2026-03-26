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
      className={`h-full flex flex-col border-r ${
        props.darkMode
          ? 'border-white/5 bg-slate-900'
          : 'border-slate-200 bg-white'
      }`}
    >
      {/* Header */}
      <div className={`px-4 pt-4 pb-3 border-b ${props.darkMode ? 'border-white/5' : 'border-slate-100'}`}>
        <div className="flex items-center justify-between mb-3">
          <h2 className={`text-lg font-bold tracking-tight ${props.darkMode ? 'text-slate-100' : 'text-slate-900'}`}>
            Chats
          </h2>
          <button
            type="button"
            onClick={props.onOpenCreateGroup}
            title="New group"
            className={`w-8 h-8 flex items-center justify-center rounded-xl transition-all duration-150 active:scale-95 ${
              props.darkMode
                ? 'bg-blue-500/15 text-blue-400 hover:bg-blue-500/25'
                : 'bg-blue-50 text-blue-600 hover:bg-blue-100'
            }`}
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
          </button>
        </div>

        {/* Search bar */}
        <div className={`flex items-center gap-2 rounded-xl px-3 py-2 ${
          props.darkMode ? 'bg-slate-800' : 'bg-slate-100'
        }`}>
          <svg
            className={`w-4 h-4 flex-shrink-0 ${props.darkMode ? 'text-slate-500' : 'text-slate-400'}`}
            fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            value={props.searchQuery}
            onChange={(e) => props.onSearchQueryChange(e.target.value)}
            placeholder="Search..."
            className={`flex-1 bg-transparent text-sm outline-none ${
              props.darkMode
                ? 'text-slate-200 placeholder:text-slate-600'
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
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* Room list */}
      <div className="flex-1 overflow-y-auto">
        {pinned.length > 0 && (
          <div>
            <div className={`px-4 py-2 ${props.darkMode ? 'text-slate-600' : 'text-slate-400'}`}>
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
              <div className={`px-4 py-2 ${props.darkMode ? 'text-slate-600' : 'text-slate-400'}`}>
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
            <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mb-4 ${
              props.darkMode ? 'bg-slate-800' : 'bg-slate-100'
            }`}>
              <svg className={`w-7 h-7 ${props.darkMode ? 'text-slate-600' : 'text-slate-400'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
            </div>
            <p className={`text-sm font-semibold ${props.darkMode ? 'text-slate-400' : 'text-slate-600'}`}>
              {query ? 'No results found' : 'No conversations yet'}
            </p>
            <p className={`text-xs mt-1 leading-relaxed ${props.darkMode ? 'text-slate-600' : 'text-slate-400'}`}>
              {query ? 'Try a different search term' : 'Start by creating a group chat'}
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
      className={`group w-full text-left px-3 py-2 transition-colors duration-100 ${
        props.active
          ? props.darkMode
            ? 'bg-slate-800'
            : 'bg-slate-100'
          : props.darkMode
            ? 'hover:bg-slate-800/60'
            : 'hover:bg-slate-50'
      }`}
    >
      <div className="flex items-center gap-3">
        {/* Avatar */}
        <div className={`relative flex-shrink-0 w-11 h-11 rounded-full bg-gradient-to-br ${grad} flex items-center justify-center text-base font-bold text-white shadow-sm`}>
          {props.room.name.charAt(0).toUpperCase()}
          {isGroup && (
            <span className={`absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-bold ${
              props.darkMode ? 'bg-slate-700 text-slate-300' : 'bg-slate-200 text-slate-600'
            } ring-2 ${props.darkMode ? 'ring-slate-900' : 'ring-white'}`}>
              G
            </span>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-baseline justify-between gap-1">
            <p className={`text-sm font-semibold truncate ${
              props.darkMode ? 'text-slate-100' : 'text-slate-900'
            }`}>
              {props.room.name}
            </p>
            <span className={`text-[11px] flex-shrink-0 tabular-nums ${
              props.room.unread > 0
                ? 'text-blue-500 font-semibold'
                : props.darkMode ? 'text-slate-600' : 'text-slate-400'
            }`}>
              {formatTime(props.room.lastAt)}
            </span>
          </div>
          <div className="flex items-center justify-between gap-1 mt-0.5">
            <p className={`text-xs truncate leading-relaxed ${
              props.darkMode ? 'text-slate-500' : 'text-slate-500'
            }`}>
              {props.room.lastMessage || 'No messages yet'}
            </p>
            <div className="flex items-center gap-1.5 flex-shrink-0">
              {props.isPinned && props.room.unread === 0 && (
                <svg className={`w-3 h-3 ${props.darkMode ? 'text-slate-600' : 'text-slate-300'}`} fill="currentColor" viewBox="0 0 24 24">
                  <path d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
                </svg>
              )}
              {props.room.unread > 0 && (
                <span className="min-w-[18px] h-[18px] flex items-center justify-center rounded-full bg-blue-500 px-1 text-[10px] font-bold text-white">
                  {props.room.unread > 99 ? '99+' : props.room.unread}
                </span>
              )}
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); props.onTogglePin(props.room.key); }}
                className={`opacity-0 group-hover:opacity-100 transition-opacity duration-150 p-0.5 rounded ${
                  props.darkMode ? 'text-slate-500 hover:text-slate-300' : 'text-slate-400 hover:text-slate-600'
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

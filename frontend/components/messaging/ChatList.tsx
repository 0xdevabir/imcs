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

export function ChatList(props: ChatListProps) {
  const query = props.searchQuery.trim().toLowerCase();
  const filtered = query
    ? props.rooms.filter(
        (room) =>
          room.name.toLowerCase().includes(query) ||
          room.key.toLowerCase().includes(query) ||
          room.lastMessage.toLowerCase().includes(query),
      )
    : props.rooms;

  const pinned = filtered.filter((room) => props.pinnedRoomKeys.includes(room.key));
  const others = filtered.filter((room) => !props.pinnedRoomKeys.includes(room.key));

  return (
    <section
      className={`h-full flex flex-col border-r transition-all duration-300 ${
        props.darkMode 
          ? 'border-slate-800/50 bg-slate-900/60 text-slate-200' 
          : 'border-slate-200/60 bg-white/60 text-slate-800'
      }`}
      style={{ backdropFilter: 'blur(20px)' }}
    >
      <div className="p-4 border-b border-slate-200/60 dark:border-slate-800/60">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-semibold">Conversations</h2>
          <button
            type="button"
            onClick={props.onOpenCreateGroup}
            className="flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 px-3 py-1.5 text-[11px] font-medium text-white shadow-md shadow-blue-500/20 transition-all active:scale-95"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            New
          </button>
        </div>
        <div className="relative">
          <svg className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 ${props.darkMode ? 'text-slate-500' : 'text-slate-400'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            value={props.searchQuery}
            onChange={(event) => props.onSearchQueryChange(event.target.value)}
            placeholder="Search conversations..."
            className={`w-full rounded-xl border pl-9 pr-4 py-2.5 text-sm outline-none transition-all ${
              props.darkMode
                ? 'border-slate-700 bg-slate-800/50 text-slate-200 placeholder:text-slate-500 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10'
                : 'border-slate-200 bg-slate-50 text-slate-800 placeholder:text-slate-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10'
            }`}
          />
          {props.searchQuery && (
            <button
              type="button"
              onClick={() => props.onSearchQueryChange('')}
              className={`absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-full ${props.darkMode ? 'text-slate-500 hover:text-slate-300 hover:bg-slate-700' : 'text-slate-400 hover:text-slate-600 hover:bg-slate-100'}`}
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-3 py-2 space-y-4">
        {pinned.length > 0 && (
          <div>
            <p className="px-2 mb-2 text-[11px] font-semibold uppercase tracking-wider text-slate-400">Pinned</p>
            <div className="space-y-1">
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
            {pinned.length > 0 && <p className="px-2 mb-2 text-[11px] font-semibold uppercase tracking-wider text-slate-400">All Chats</p>}
            <div className="space-y-1">
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
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <div className={`p-3 rounded-full mb-3 ${props.darkMode ? 'bg-slate-800' : 'bg-slate-100'}`}>
              <svg className={`w-6 h-6 ${props.darkMode ? 'text-slate-500' : 'text-slate-400'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
              </svg>
            </div>
            <p className={`text-sm ${props.darkMode ? 'text-slate-500' : 'text-slate-500'}`}>No conversations found</p>
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
    
    if (days === 0) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } else if (days === 1) {
      return 'Yesterday';
    } else if (days < 7) {
      return date.toLocaleDateString([], { weekday: 'short' });
    }
    return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
  };

  return (
    <button
      type="button"
      onClick={() => props.onOpen(props.room.key)}
      className={`group w-full text-left rounded-xl border p-3 transition-all duration-200 ${
        props.active
          ? 'border-blue-500/50 bg-gradient-to-r from-blue-600 to-cyan-500 text-white shadow-lg shadow-blue-500/20'
          : props.darkMode
            ? 'border-transparent bg-slate-800/40 text-slate-200 hover:bg-slate-800/70 hover:border-slate-700'
            : 'border-transparent bg-white/60 text-slate-800 hover:bg-white hover:border-slate-200'
      }`}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-3 min-w-0">
          <div className={`flex items-center justify-center w-10 h-10 rounded-full text-sm font-semibold shrink-0 ${
            props.active 
              ? 'bg-white/20 text-white' 
              : props.darkMode 
                ? 'bg-slate-700 text-slate-300' 
                : 'bg-slate-200 text-slate-600'
          }`}>
            {props.room.name.charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold truncate">{props.room.name}</p>
            <p className={`text-xs truncate ${props.active ? 'text-blue-100' : props.darkMode ? 'text-slate-500' : 'text-slate-500'}`}>
              {props.room.lastMessage}
            </p>
          </div>
        </div>
        <div className="flex flex-col items-end gap-1 shrink-0">
          <p className={`text-[11px] ${props.active ? 'text-blue-100' : props.darkMode ? 'text-slate-500' : 'text-slate-400'}`}>
            {formatTime(props.room.lastAt)}
          </p>
          <div className="flex items-center gap-1.5">
            {props.room.unread > 0 && (
              <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-semibold ${
                props.active ? 'bg-white/20 text-white' : 'bg-emerald-500 text-white'
              }`}>
                {props.room.unread > 99 ? '99+' : props.room.unread}
              </span>
            )}
            <span className={`text-[10px] opacity-0 group-hover:opacity-100 transition-opacity ${
              props.active ? 'text-blue-100' : 'text-slate-400'
            }`}>
              {props.isPinned ? '📌' : '📍'}
            </span>
          </div>
        </div>
      </div>
    </button>
  );
}
import { RoomItem } from './types';

type ChatListProps = {
  rooms: RoomItem[];
  activeRoomKey: string;
  searchQuery: string;
  onSearchQueryChange: (value: string) => void;
  onOpenRoom: (roomKey: string) => void;
  pinnedRoomKeys: string[];
  onTogglePin: (roomKey: string) => void;
  onOpenCreateGroup: () => void;
  darkMode: boolean;
};

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
      className={`h-full border-r backdrop-blur-xl ${
        props.darkMode ? 'border-slate-800/90 bg-slate-900/90 text-slate-100' : 'border-slate-200/80 bg-slate-50/85 text-slate-900'
      }`}
    >
      <div className="border-b border-inherit p-4">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-base font-semibold tracking-tight">Conversations</h2>
          <button
            type="button"
            onClick={props.onOpenCreateGroup}
            className="btn-press rounded-lg bg-gradient-to-r from-indigo-600 to-blue-600 px-2.5 py-1.5 text-[11px] font-semibold text-white shadow-[0_10px_22px_rgba(37,99,235,0.28)] hover:from-indigo-500 hover:to-blue-500"
          >
            New Group
          </button>
        </div>
        <input
          value={props.searchQuery}
          onChange={(event) => props.onSearchQueryChange(event.target.value)}
          placeholder="Search chats"
          className={`focus-ring w-full rounded-xl border px-3 py-2.5 text-sm outline-none ${
            props.darkMode
              ? 'border-slate-700 bg-slate-950 text-slate-100 placeholder:text-slate-500 focus:border-indigo-400'
              : 'border-slate-300 bg-white text-slate-800 placeholder:text-slate-400 focus:border-indigo-500'
          }`}
        />
      </div>

      <div className="h-[calc(100%-5.2rem)] space-y-3 overflow-y-auto px-3 py-3">
        {pinned.length > 0 ? <p className="px-1 text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-400">Pinned</p> : null}
        {pinned.map((room) => (
          <ChatListItem key={room.key} room={room} active={room.key === props.activeRoomKey} onOpen={props.onOpenRoom} onTogglePin={props.onTogglePin} darkMode={props.darkMode} />
        ))}

        {others.length > 0 ? <p className="px-1 text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-400">All Chats</p> : null}
        {others.map((room) => (
          <ChatListItem key={room.key} room={room} active={room.key === props.activeRoomKey} onOpen={props.onOpenRoom} onTogglePin={props.onTogglePin} darkMode={props.darkMode} />
        ))}
      </div>
    </section>
  );
}

type ItemProps = {
  room: RoomItem;
  active: boolean;
  onOpen: (roomKey: string) => void;
  onTogglePin: (roomKey: string) => void;
  darkMode: boolean;
};

function ChatListItem(props: ItemProps) {
  return (
    <button
      type="button"
      onClick={() => props.onOpen(props.room.key)}
      className={`surface-card-hover mb-1 w-full rounded-2xl border px-3 py-3 text-left transition ${
        props.active
          ? 'border-indigo-400/40 bg-gradient-to-r from-indigo-600 to-blue-600 text-white shadow-[0_12px_30px_rgba(37,99,235,0.33)]'
          : props.darkMode
            ? 'border-slate-800 bg-slate-900/80 text-slate-100 hover:bg-slate-900'
            : 'border-slate-200 bg-white/90 text-slate-900 hover:bg-white'
      }`}
    >
      <div className="flex items-center justify-between gap-2">
        <p className="truncate text-sm font-semibold">{props.room.name}</p>
        <p className={`text-[11px] ${props.active ? 'text-indigo-100' : 'text-slate-400'}`}>
          {props.room.lastAt ? new Date(props.room.lastAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
        </p>
      </div>
      <div className="mt-1 flex items-center justify-between gap-2">
        <p className={`truncate text-xs ${props.active ? 'text-indigo-100' : 'text-slate-500'}`}>
          {props.room.lastMessage}
        </p>
        <div className="flex items-center gap-1">
          {props.room.unread > 0 ? (
            <span className="rounded-full bg-emerald-500 px-1.5 py-0.5 text-[10px] font-semibold text-white shadow-[0_8px_18px_rgba(16,185,129,0.35)]">
              {props.room.unread}
            </span>
          ) : null}
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              props.onTogglePin(props.room.key);
            }}
            className={`rounded px-1 text-[11px] ${props.active ? 'text-indigo-100' : 'text-slate-400 hover:text-slate-600'}`}
          >
            Pin
          </button>
        </div>
      </div>
    </button>
  );
}

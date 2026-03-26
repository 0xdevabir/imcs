import { OnlineUser, UserStatus } from './types';

interface ContactsPanelProps {
  onlineUsers: OnlineUser[];
  allUsers: SearchedUser[];
  searchQuery: string;
  onSearchQueryChange: (value: string) => void;
  onStartVoiceCall: (userId: number, username: string) => void;
  onStartVideoCall: (userId: number, username: string) => void;
  onContactClick: (userId: number, username: string) => void;
  darkMode: boolean;
  currentUserId: number;
}

export interface SearchedUser {
  userId: number;
  username: string;
  role: 'admin' | 'user';
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

function statusDot(status: UserStatus | undefined) {
  if (status === 'dnd') return 'bg-rose-500';
  if (status === 'available') return 'bg-emerald-500';
  return 'bg-slate-400';
}

function statusLabel(status: UserStatus | undefined, isOnline: boolean) {
  if (!isOnline) return 'Offline';
  if (status === 'dnd') return 'Do Not Disturb';
  if (status === 'available') return 'Available';
  return 'Online';
}

function statusTextColor(status: UserStatus | undefined, isOnline: boolean) {
  if (!isOnline) return 'text-slate-400';
  if (status === 'dnd') return 'text-rose-500';
  return 'text-emerald-500';
}

export function ContactsPanel(props: ContactsPanelProps) {
  const isOnline = (userId: number) => props.onlineUsers.some((u) => u.userId === userId);
  const getStatus = (userId: number) => props.onlineUsers.find((u) => u.userId === userId)?.status;
  const isSearching = props.searchQuery.trim().length >= 2;
  const otherUsers = props.allUsers.filter((u) => u.userId !== props.currentUserId);
  const onlineOthers = props.onlineUsers.filter((u) => u.userId !== props.currentUserId);
  const offlineOthers = otherUsers.filter((u) => !isOnline(u.userId));

  return (
    <section
      className={`h-full flex flex-col transition-all duration-300 ${
        props.darkMode
          ? 'bg-slate-950/90 text-slate-200'
          : 'bg-slate-50/80 text-slate-800'
      }`}
    >
      {/* Header */}
      <div className={`px-5 pt-6 pb-4 border-b ${props.darkMode ? 'border-slate-800/60' : 'border-slate-200/80'}`}>
        <div className="flex items-start justify-between mb-4">
          <div>
            <h1 className="text-xl font-bold tracking-tight">Contacts</h1>
            <p className={`text-sm mt-1 ${props.darkMode ? 'text-slate-500' : 'text-slate-400'}`}>
              {otherUsers.length} contact{otherUsers.length !== 1 ? 's' : ''} · {onlineOthers.length} online
            </p>
          </div>
        </div>

        {/* Search */}
        <div className="relative max-w-lg">
          <svg
            className={`absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 ${props.darkMode ? 'text-slate-500' : 'text-slate-400'}`}
            fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            value={props.searchQuery}
            onChange={(e) => props.onSearchQueryChange(e.target.value)}
            placeholder="Search contacts..."
            className={`w-full rounded-xl border pl-10 pr-4 py-2.5 text-sm outline-none transition-all ${
              props.darkMode
                ? 'border-slate-700/80 bg-slate-900 text-slate-200 placeholder:text-slate-600 focus:border-blue-500/60 focus:ring-2 focus:ring-blue-500/10'
                : 'border-slate-200 bg-white text-slate-800 placeholder:text-slate-400 focus:border-blue-400 focus:ring-2 focus:ring-blue-500/10'
            }`}
          />
          {props.searchQuery && (
            <button
              type="button"
              onClick={() => props.onSearchQueryChange('')}
              className={`absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-full transition-colors ${
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

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-4 py-4">
        {isSearching ? (
          <div>
            <SectionHeader
              label="Search Results"
              count={otherUsers.filter((u) => u.username.toLowerCase().includes(props.searchQuery.toLowerCase())).length}
              darkMode={props.darkMode}
            />
            {otherUsers.length === 0 ? (
              <EmptyMessage message="No users found" darkMode={props.darkMode} />
            ) : (
              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {otherUsers
                  .filter((u) => u.username.toLowerCase().includes(props.searchQuery.toLowerCase()))
                  .map((user) => (
                    <ContactCard
                      key={user.userId}
                      user={user}
                      isOnline={isOnline(user.userId)}
                      onlineStatus={getStatus(user.userId)}
                      onStartVoiceCall={() => props.onStartVoiceCall(user.userId, user.username)}
                      onStartVideoCall={() => props.onStartVideoCall(user.userId, user.username)}
                      onContactClick={() => props.onContactClick(user.userId, user.username)}
                      darkMode={props.darkMode}
                    />
                  ))}
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-8">
            {/* Online section */}
            {onlineOthers.length > 0 && (
              <div>
                <SectionHeader
                  label="Online"
                  count={onlineOthers.length}
                  accent="emerald"
                  darkMode={props.darkMode}
                />
                <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                  {onlineOthers.map((user) => (
                    <ContactCard
                      key={user.userId}
                      user={{ userId: user.userId, username: user.username, role: 'user' }}
                      isOnline={true}
                      onlineStatus={user.status}
                      onStartVoiceCall={() => props.onStartVoiceCall(user.userId, user.username)}
                      onStartVideoCall={() => props.onStartVideoCall(user.userId, user.username)}
                      onContactClick={() => props.onContactClick(user.userId, user.username)}
                      darkMode={props.darkMode}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* All contacts (offline) */}
            {offlineOthers.length > 0 && (
              <div>
                <SectionHeader
                  label="Offline"
                  count={offlineOthers.length}
                  darkMode={props.darkMode}
                />
                <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                  {offlineOthers.map((user) => (
                    <ContactCard
                      key={user.userId}
                      user={user}
                      isOnline={false}
                      onStartVoiceCall={() => props.onStartVoiceCall(user.userId, user.username)}
                      onStartVideoCall={() => props.onStartVideoCall(user.userId, user.username)}
                      onContactClick={() => props.onContactClick(user.userId, user.username)}
                      darkMode={props.darkMode}
                    />
                  ))}
                </div>
              </div>
            )}

            {otherUsers.length === 0 && (
              <div className="flex flex-col items-center justify-center py-20 text-center">
                <div className={`w-16 h-16 rounded-2xl flex items-center justify-center mb-5 ${
                  props.darkMode ? 'bg-slate-800' : 'bg-white shadow-sm'
                }`}>
                  <svg className={`w-8 h-8 ${props.darkMode ? 'text-slate-600' : 'text-slate-300'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                </div>
                <p className={`text-sm font-medium ${props.darkMode ? 'text-slate-400' : 'text-slate-500'}`}>No contacts yet</p>
              </div>
            )}
          </div>
        )}
      </div>
    </section>
  );
}

function SectionHeader({ label, count, accent, darkMode }: { label: string; count: number; accent?: string; darkMode: boolean }) {
  const dotColor = accent === 'emerald' ? 'bg-emerald-500' : darkMode ? 'bg-slate-600' : 'bg-slate-300';
  return (
    <div className="flex items-center gap-2 mb-3">
      <span className={`w-1.5 h-1.5 rounded-full ${dotColor}`} />
      <p className={`text-[11px] font-bold uppercase tracking-widest ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>
        {label}
      </p>
      <span className={`text-[10px] font-medium rounded-full px-1.5 py-0.5 ${darkMode ? 'bg-slate-800 text-slate-500' : 'bg-slate-100 text-slate-400'}`}>
        {count}
      </span>
    </div>
  );
}

function EmptyMessage({ message, darkMode }: { message: string; darkMode: boolean }) {
  return (
    <p className={`text-sm text-center py-8 ${darkMode ? 'text-slate-600' : 'text-slate-400'}`}>{message}</p>
  );
}

interface ContactCardProps {
  user: SearchedUser;
  isOnline: boolean;
  onlineStatus?: UserStatus;
  onStartVoiceCall: () => void;
  onStartVideoCall: () => void;
  onContactClick: (userId: number, username: string) => void;
  darkMode: boolean;
}

function ContactCard({ user, isOnline, onlineStatus, onStartVoiceCall, onStartVideoCall, onContactClick, darkMode }: ContactCardProps) {
  const grad = avatarGradient(user.username);

  return (
    <div
      onClick={() => onContactClick(user.userId, user.username)}
      className={`group relative flex flex-col items-center gap-3 rounded-2xl p-4 cursor-pointer transition-all duration-200 ${
        darkMode
          ? 'bg-slate-900/60 hover:bg-slate-800/80 ring-1 ring-slate-800 hover:ring-slate-700'
          : 'bg-white hover:shadow-md ring-1 ring-slate-100 hover:ring-slate-200'
      }`}
    >
      {/* Avatar */}
      <div className="relative">
        <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${grad} flex items-center justify-center text-xl font-bold text-white shadow-sm`}>
          {user.username.charAt(0).toUpperCase()}
        </div>
        {/* Online indicator */}
        <span className={`absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full border-2 ${darkMode ? 'border-slate-900' : 'border-white'} ${statusDot(onlineStatus)} ${!isOnline ? 'bg-slate-300' : ''}`} />
      </div>

      {/* Info */}
      <div className="text-center min-w-0 w-full">
        <p className="text-sm font-semibold truncate">{user.username}</p>
        <p className={`text-xs mt-0.5 ${statusTextColor(onlineStatus, isOnline)}`}>
          {statusLabel(onlineStatus, isOnline)}
        </p>
        {user.role === 'admin' && (
          <span className={`inline-block mt-1 text-[10px] font-semibold px-2 py-0.5 rounded-full ${
            darkMode ? 'bg-indigo-500/15 text-indigo-400' : 'bg-indigo-50 text-indigo-600'
          }`}>
            Admin
          </span>
        )}
      </div>

      {/* Actions (appear on hover) */}
      <div className="flex items-center gap-1.5 w-full opacity-0 group-hover:opacity-100 transition-all duration-200">
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); onContactClick(user.userId, user.username); }}
          className={`flex-1 flex items-center justify-center gap-1 py-1.5 rounded-lg text-xs font-medium transition-colors ${
            darkMode
              ? 'bg-slate-800 hover:bg-slate-700 text-slate-300'
              : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
          }`}
          title="Message"
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
          </svg>
        </button>
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); onStartVoiceCall(); }}
          className={`flex-1 flex items-center justify-center gap-1 py-1.5 rounded-lg text-xs font-medium transition-colors ${
            darkMode
              ? 'bg-slate-800 hover:bg-emerald-500/20 text-slate-300 hover:text-emerald-400'
              : 'bg-slate-100 hover:bg-emerald-50 text-slate-600 hover:text-emerald-600'
          }`}
          title="Voice call"
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
          </svg>
        </button>
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); onStartVideoCall(); }}
          className={`flex-1 flex items-center justify-center gap-1 py-1.5 rounded-lg text-xs font-medium transition-colors ${
            darkMode
              ? 'bg-slate-800 hover:bg-blue-500/20 text-slate-300 hover:text-blue-400'
              : 'bg-slate-100 hover:bg-blue-50 text-slate-600 hover:text-blue-600'
          }`}
          title="Video call"
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
          </svg>
        </button>
      </div>
    </div>
  );
}

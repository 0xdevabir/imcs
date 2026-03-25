import { OnlineUser } from './types';

interface ContactsPanelProps {
  onlineUsers: OnlineUser[];
  allUsers: SearchedUser[];
  searchQuery: string;
  onSearchQueryChange: (value: string) => void;
  onStartVoiceCall: (userId: number, username: string) => void;
  onStartVideoCall: (userId: number, username: string) => void;
  darkMode: boolean;
  currentUserId: number;
}

export interface SearchedUser {
  userId: number;
  username: string;
  role: 'admin' | 'user';
}

export function ContactsPanel(props: ContactsPanelProps) {
  const isOnline = (userId: number) => props.onlineUsers.some(u => u.userId === userId);

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
        <h2 className="text-base font-semibold mb-4">Contacts</h2>
        <div className="relative">
          <svg className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 ${props.darkMode ? 'text-slate-500' : 'text-slate-400'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            value={props.searchQuery}
            onChange={(e) => props.onSearchQueryChange(e.target.value)}
            placeholder="Search users..."
            className={`w-full rounded-xl border pl-9 pr-4 py-2.5 text-sm outline-none transition-all ${
              props.darkMode
                ? 'border-slate-700 bg-slate-800/50 text-slate-200 placeholder:text-slate-500 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10'
                : 'border-slate-200 bg-slate-50 text-slate-800 placeholder:text-slate-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10'
            }`}
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-3 py-2">
        {props.searchQuery.trim().length >= 2 ? (
          <div>
            <p className="px-2 mb-2 text-[11px] font-semibold uppercase tracking-wider text-slate-400">Search Results</p>
            {props.allUsers.length === 0 ? (
              <div className="text-center py-8">
                <p className={`text-sm ${props.darkMode ? 'text-slate-500' : 'text-slate-500'}`}>No users found</p>
              </div>
            ) : (
              <div className="space-y-1">
                {props.allUsers.filter(u => u.userId !== props.currentUserId).map((user) => (
                  <ContactItem 
                    key={user.userId} 
                    user={user} 
                    isOnline={isOnline(user.userId)}
                    onStartVoiceCall={() => props.onStartVoiceCall(user.userId, user.username)}
                    onStartVideoCall={() => props.onStartVideoCall(user.userId, user.username)}
                    darkMode={props.darkMode}
                  />
                ))}
              </div>
            )}
          </div>
        ) : (
          <>
            <div className="mb-4">
              <p className="px-2 mb-2 text-[11px] font-semibold uppercase tracking-wider text-emerald-500 flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                Online — {props.onlineUsers.length}
              </p>
              {props.onlineUsers.filter(u => u.userId !== props.currentUserId).length === 0 ? (
                <div className="text-center py-4">
                  <p className={`text-xs ${props.darkMode ? 'text-slate-500' : 'text-slate-500'}`}>No one online</p>
                </div>
              ) : (
                <div className="space-y-1">
                  {props.onlineUsers.filter(u => u.userId !== props.currentUserId).map((user) => (
                    <ContactItem 
                      key={user.userId} 
                      user={{ userId: user.userId, username: user.username, role: 'user' }}
                      isOnline={true}
                      onStartVoiceCall={() => props.onStartVoiceCall(user.userId, user.username)}
                      onStartVideoCall={() => props.onStartVideoCall(user.userId, user.username)}
                      darkMode={props.darkMode}
                    />
                  ))}
                </div>
              )}
            </div>

            <div>
              <p className="px-2 mb-2 text-[11px] font-semibold uppercase tracking-wider text-slate-400">All Contacts</p>
              {props.allUsers.filter(u => u.userId !== props.currentUserId && !isOnline(u.userId)).length === 0 ? (
                <div className="text-center py-4">
                  <p className={`text-xs ${props.darkMode ? 'text-slate-500' : 'text-slate-500'}`}>All contacts online</p>
                </div>
              ) : (
                <div className="space-y-1">
                  {props.allUsers.filter(u => u.userId !== props.currentUserId && !isOnline(u.userId)).map((user) => (
                    <ContactItem 
                      key={user.userId} 
                      user={user}
                      isOnline={false}
                      onStartVoiceCall={() => props.onStartVoiceCall(user.userId, user.username)}
                      onStartVideoCall={() => props.onStartVideoCall(user.userId, user.username)}
                      darkMode={props.darkMode}
                    />
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </section>
  );
}

interface ContactItemProps {
  user: SearchedUser;
  isOnline: boolean;
  onStartVoiceCall: () => void;
  onStartVideoCall: () => void;
  darkMode: boolean;
}

function ContactItem({ user, isOnline, onStartVoiceCall, onStartVideoCall, darkMode }: ContactItemProps) {
  return (
    <div className={`group flex items-center justify-between rounded-xl border p-3 transition-all duration-200 ${
      darkMode 
        ? 'border-transparent bg-slate-800/40 hover:bg-slate-800/70 hover:border-slate-700' 
        : 'border-transparent bg-white/60 hover:bg-white hover:border-slate-200'
    }`}>
      <div className="flex items-center gap-3 min-w-0">
        <div className="relative">
          <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-semibold ${
            darkMode ? 'bg-slate-700 text-slate-300' : 'bg-slate-200 text-slate-600'
          }`}>
            {user.username.charAt(0).toUpperCase()}
          </div>
          {isOnline && (
            <span className="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-emerald-500 border-2 border-white dark:border-slate-900" />
          )}
        </div>
        <div className="min-w-0">
          <p className="text-sm font-semibold truncate">{user.username}</p>
          <p className={`text-xs ${isOnline ? 'text-emerald-500' : 'text-slate-400'}`}>
            {isOnline ? 'Online' : 'Offline'}
          </p>
        </div>
      </div>
      
      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); onStartVoiceCall(); }}
          className={`p-2 rounded-lg transition-colors ${
            darkMode ? 'hover:bg-slate-700 text-slate-400 hover:text-slate-200' : 'hover:bg-slate-100 text-slate-400 hover:text-slate-600'
          }`}
          title="Voice call"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
          </svg>
        </button>
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); onStartVideoCall(); }}
          className={`p-2 rounded-lg transition-colors ${
            darkMode ? 'hover:bg-slate-700 text-slate-400 hover:text-slate-200' : 'hover:bg-slate-100 text-slate-400 hover:text-slate-600'
          }`}
          title="Video call"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
          </svg>
        </button>
      </div>
    </div>
  );
}
import { RefObject } from 'react';
import { MessageBubble } from './MessageBubble';
import { ChatMessage, GroupParticipant, Profile } from './types';

interface ChatWindowProps {
  profile: Profile;
  roomTitle: string;
  roomStatus: string;
  darkMode: boolean;
  messages: ChatMessage[];
  participants: GroupParticipant[];
  typingIndicator: string;
  messageEndRef: RefObject<HTMLDivElement>;
  onReact: (messageId: string, emoji: string) => void;
  onReply: (message: ChatMessage) => void;
  onStartEdit: (message: ChatMessage) => void;
  onDelete: (message: ChatMessage) => void;
  headerActions: React.ReactNode;
  composer: React.ReactNode;
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

function formatDateLabel(dateStr: string): string {
  const d = new Date(dateStr);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);

  if (d.toDateString() === today.toDateString()) return 'Today';
  if (d.toDateString() === yesterday.toDateString()) return 'Yesterday';

  const diff = Math.floor((today.getTime() - d.getTime()) / (1000 * 60 * 60 * 24));
  if (diff < 7) return d.toLocaleDateString([], { weekday: 'long' });
  return d.toLocaleDateString([], { month: 'long', day: 'numeric', year: diff > 365 ? 'numeric' : undefined });
}

export function ChatWindow(props: ChatWindowProps) {
  const grad = avatarGradient(props.roomTitle);
  const isGroup = props.participants.length > 2;

  return (
    <section className={`flex h-full flex-1 flex-col overflow-hidden ${props.darkMode ? 'bg-slate-950 text-slate-100' : 'bg-white text-slate-900'}`}>

      {/* Header */}
      <header
        className={`flex-shrink-0 flex items-center justify-between px-5 py-3.5 border-b transition-all duration-300 ${
          props.darkMode
            ? 'border-slate-800/50 bg-slate-950/95'
            : 'border-slate-100 bg-white/95'
        }`}
        style={{ backdropFilter: 'blur(20px)' }}
      >
        <div className="flex items-center gap-3.5 min-w-0">
          {/* Avatar */}
          <div className={`flex-shrink-0 w-9 h-9 rounded-xl bg-gradient-to-br ${grad} flex items-center justify-center text-sm font-bold text-white shadow-sm`}>
            {props.roomTitle.charAt(0).toUpperCase()}
          </div>

          {/* Room info */}
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-sm font-bold truncate">{props.roomTitle}</h2>
              <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold flex-shrink-0 ${
                props.darkMode
                  ? 'bg-emerald-500/10 text-emerald-400'
                  : 'bg-emerald-50 text-emerald-600'
              }`}>
                <svg className="w-2.5 h-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
                E2E Encrypted
              </span>
            </div>
            <p className={`text-xs truncate mt-0.5 ${props.darkMode ? 'text-slate-500' : 'text-slate-400'}`}>
              {isGroup
                ? `${props.participants.length} members`
                : props.roomStatus}
            </p>
          </div>
        </div>

        {/* Header actions */}
        <div className="flex items-center gap-1 flex-shrink-0 ml-2">
          {props.headerActions}
        </div>
      </header>

      {/* Messages area */}
      <div
        className={`flex-1 overflow-y-auto px-4 py-4 md:px-6 ${
          props.darkMode
            ? 'bg-slate-950'
            : 'bg-slate-50/60'
        }`}
      >
        {props.messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center px-8 select-none">
            <div className={`w-16 h-16 rounded-2xl flex items-center justify-center mb-5 shadow-inner ${
              props.darkMode ? 'bg-slate-800/60' : 'bg-white'
            }`}>
              <svg className={`w-8 h-8 ${props.darkMode ? 'text-slate-600' : 'text-slate-300'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
            </div>
            <p className={`text-sm font-semibold mb-1.5 ${props.darkMode ? 'text-slate-400' : 'text-slate-600'}`}>
              Start a secure conversation
            </p>
            <p className={`text-xs max-w-[220px] leading-relaxed ${props.darkMode ? 'text-slate-600' : 'text-slate-400'}`}>
              Messages in this chat are end-to-end encrypted. Only you and your recipients can read them.
            </p>
          </div>
        ) : (
          <div className="space-y-1">
            {props.messages.map((message, index) => {
              const msgDateStr = new Date(message.createdAt).toDateString();
              const prevDateStr = index > 0 ? new Date(props.messages[index - 1].createdAt).toDateString() : '';
              const showDate = msgDateStr !== prevDateStr;

              return (
                <div key={message.id}>
                  {showDate && (
                    <div className="flex items-center justify-center py-4">
                      <span className={`rounded-full px-3.5 py-1 text-[11px] font-medium shadow-sm ${
                        props.darkMode
                          ? 'bg-slate-800 text-slate-400 ring-1 ring-slate-700/50'
                          : 'bg-white text-slate-500 ring-1 ring-slate-200'
                      }`}>
                        {formatDateLabel(message.createdAt)}
                      </span>
                    </div>
                  )}
                  <MessageBubble
                    message={message}
                    profile={props.profile}
                    darkMode={props.darkMode}
                    participants={props.participants}
                    onReact={props.onReact}
                    onReply={props.onReply}
                    onStartEdit={props.onStartEdit}
                    onDelete={props.onDelete}
                  />
                </div>
              );
            })}

            {/* Typing indicator */}
            {props.typingIndicator && (
              <div className={`inline-flex items-center gap-2.5 rounded-2xl rounded-bl-sm px-4 py-2.5 text-xs max-w-[200px] mt-2 ${
                props.darkMode
                  ? 'bg-slate-800 text-slate-400'
                  : 'bg-white text-slate-500 shadow-sm ring-1 ring-slate-100'
              }`}>
                <span className="flex items-center gap-1">
                  <span className="typing-dot" />
                  <span className="typing-dot" />
                  <span className="typing-dot" />
                </span>
                <span className="truncate">{props.typingIndicator}</span>
              </div>
            )}

            <div ref={props.messageEndRef} className="h-2" />
          </div>
        )}
      </div>

      {/* Composer */}
      <footer
        className={`flex-shrink-0 border-t px-4 py-3.5 md:px-5 transition-all duration-300 ${
          props.darkMode
            ? 'border-slate-800/50 bg-slate-950/95'
            : 'border-slate-100 bg-white/95'
        }`}
        style={{ backdropFilter: 'blur(20px)' }}
      >
        {props.composer}
      </footer>
    </section>
  );
}

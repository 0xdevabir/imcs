import React, { RefObject, useMemo } from 'react';
import { MessageBubble } from '../message-bubble/MessageBubble';
import { ChatMessage, GroupParticipant, Profile } from '@/features/chat/types';

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
  onBack?: () => void;
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

const gradientCache = new Map<string, string>();
function avatarGradient(name: string): string {
  const cached = gradientCache.get(name);
  if (cached) return cached;
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  const result = AVATAR_GRADIENTS[Math.abs(hash) % AVATAR_GRADIENTS.length];
  gradientCache.set(name, result);
  return result;
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

type MessageRow =
  | { type: 'date'; label: string; key: string }
  | { type: 'message'; message: ChatMessage };

export const ChatWindow = React.memo(function ChatWindow(props: ChatWindowProps) {
  const grad = avatarGradient(props.roomTitle);
  const isGroup = props.participants.length > 2;

  const rows = useMemo<MessageRow[]>(() => {
    const result: MessageRow[] = [];
    let lastDateStr = '';
    for (const message of props.messages) {
      const msgDateStr = new Date(message.createdAt).toDateString();
      if (msgDateStr !== lastDateStr) {
        lastDateStr = msgDateStr;
        result.push({ type: 'date', label: formatDateLabel(message.createdAt), key: `date-${msgDateStr}` });
      }
      result.push({ type: 'message', message });
    }
    return result;
  }, [props.messages]);

  return (
    <section className={`flex h-full flex-1 flex-col overflow-hidden ${
      props.darkMode ? 'bg-[#0d1117]' : 'bg-[#f0f2f5]'
    }`}>

      {/* Header */}
      <header className={`flex-shrink-0 flex items-center justify-between px-4 py-3 border-b z-10 ${
        props.darkMode
          ? 'border-white/5 bg-[#202c33]'
          : 'border-slate-200 bg-[#f0f2f5]'
      }`}>
        <div className="flex items-center gap-3 min-w-0">
          {/* Back button – mobile only */}
          {props.onBack && (
            <button
              type="button"
              onClick={props.onBack}
              className={`md:hidden flex-shrink-0 -ml-1 flex items-center justify-center w-8 h-8 rounded-lg transition-colors ${
                props.darkMode ? 'text-slate-400 hover:text-slate-100 hover:bg-slate-800' : 'text-slate-500 hover:text-slate-800 hover:bg-slate-100'
              }`}
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
              </svg>
            </button>
          )}

          {/* Avatar */}
          <div className={`flex-shrink-0 w-10 h-10 rounded-full bg-gradient-to-br ${grad} flex items-center justify-center text-sm font-bold text-white shadow-sm`}>
            {props.roomTitle.charAt(0).toUpperCase()}
          </div>

          {/* Room info */}
          <div className="min-w-0">
            <h2 className={`text-sm font-semibold truncate leading-tight ${props.darkMode ? 'text-slate-100' : 'text-slate-900'}`}>
              {props.roomTitle}
            </h2>
            <p className={`text-xs truncate leading-tight mt-0.5 ${props.darkMode ? 'text-slate-500' : 'text-slate-500'}`}>
              {isGroup ? `${props.participants.length} members` : props.roomStatus}
            </p>
          </div>
        </div>

        {/* Header actions */}
        <div className="flex items-center gap-1 flex-shrink-0 ml-2">
          {props.headerActions}
        </div>
      </header>

      {/* Messages area */}
      <div className={`flex-1 overflow-y-auto px-4 py-3 md:px-6 ${props.darkMode ? 'chat-bg-dark' : 'chat-bg-light'}`}>
        {props.messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center px-8 select-none">
            <div className={`w-16 h-16 rounded-full flex items-center justify-center mb-5 shadow-sm ${
              props.darkMode ? 'bg-[#202c33]' : 'bg-white/90'
            }`}>
              <svg className={`w-8 h-8 ${props.darkMode ? 'text-slate-600' : 'text-slate-400'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
            </div>
            <div className={`rounded-2xl px-5 py-3 shadow-sm max-w-xs ${props.darkMode ? 'bg-[#202c33]/80' : 'bg-white/90'}`}>
              <p className={`text-sm font-medium mb-1 ${props.darkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                Start a secure conversation
              </p>
              <p className={`text-xs leading-relaxed ${props.darkMode ? 'text-slate-500' : 'text-slate-500'}`}>
                Messages are end-to-end encrypted. Only participants can read them.
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-0.5">
            {rows.map((row) =>
              row.type === 'date' ? (
                <div key={row.key} className="flex items-center justify-center py-4">
                  <span className={`rounded-full px-3 py-1 text-[11px] font-medium shadow-sm ${
                    props.darkMode
                      ? 'bg-[#182229] text-[#8696a0]'
                      : 'bg-[#e1f3fb] text-[#54656f]'
                  }`}>
                    {row.label}
                  </span>
                </div>
              ) : (
                <MessageBubble
                  key={row.message.id}
                  message={row.message}
                  profile={props.profile}
                  darkMode={props.darkMode}
                  participants={props.participants}
                  onReact={props.onReact}
                  onReply={props.onReply}
                  onStartEdit={props.onStartEdit}
                  onDelete={props.onDelete}
                />
              )
            )}

            {/* Typing indicator */}
            {props.typingIndicator && (
              <div className={`inline-flex items-center gap-2.5 rounded-2xl rounded-bl-sm px-4 py-2.5 text-xs max-w-[200px] mt-1 ${
                props.darkMode
                  ? 'bg-[#202c33] text-[#8696a0]'
                  : 'bg-white text-[#667781] shadow-sm'
              }`}>
                <span className="flex items-center gap-0.5">
                  <span className="typing-dot w-1.5 h-1.5 rounded-full bg-current" />
                  <span className="typing-dot w-1.5 h-1.5 rounded-full bg-current" style={{ animationDelay: '0.15s' }} />
                  <span className="typing-dot w-1.5 h-1.5 rounded-full bg-current" style={{ animationDelay: '0.3s' }} />
                </span>
                <span className="truncate">{props.typingIndicator}</span>
              </div>
            )}

            <div ref={props.messageEndRef} className="h-2" />
          </div>
        )}
      </div>

      {/* Composer */}
      <footer className={`flex-shrink-0 border-t px-4 py-3 md:px-5 ${
        props.darkMode
          ? 'border-white/5 bg-[#202c33]'
          : 'border-slate-200 bg-[#f0f2f5]'
      }`}>
        {props.composer}
      </footer>
    </section>
  );
});

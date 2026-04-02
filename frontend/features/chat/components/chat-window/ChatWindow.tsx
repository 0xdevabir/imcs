import React, { RefObject, useMemo, useState } from 'react';
import { MessageBubble } from '../message-bubble/MessageBubble';
import { ChatMessage, GroupParticipant, Profile } from '@/features/chat/types';
import { avatarGradient } from '@/lib/avatar';

interface ChatWindowProps {
  profile: Profile;
  roomKey: string;
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
  hasMoreMessages?: boolean;
  loadingMoreMessages?: boolean;
  onLoadMore?: () => void;
  headerActions: React.ReactNode;
  composer: React.ReactNode;
  onBack?: () => void;
  onlineUsers?: { userId: number; username: string; status: string }[];
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
  const isGroup = !props.roomKey.startsWith('dm_');
  const [messageSearch, setMessageSearch] = useState('');

  const filteredRows = useMemo<MessageRow[]>(() => {
    const result: MessageRow[] = [];
    let lastDateStr = '';
    const searchLower = messageSearch.toLowerCase().trim();
    for (const message of props.messages) {
      if (searchLower && !message.content.toLowerCase().includes(searchLower)) continue;
      const msgDateStr = new Date(message.createdAt).toDateString();
      if (msgDateStr !== lastDateStr) {
        lastDateStr = msgDateStr;
        result.push({ type: 'date', label: formatDateLabel(message.createdAt), key: `date-${msgDateStr}` });
      }
      result.push({ type: 'message', message });
    }
    return result;
  }, [props.messages, messageSearch]);

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
          {/* Message search */}
          <div className={`hidden sm:flex items-center gap-1.5 rounded-lg px-2 py-1 ${props.darkMode ? 'bg-[#2a3942]' : 'bg-slate-100'}`}>
            <svg className={`w-4 h-4 flex-shrink-0 ${props.darkMode ? 'text-slate-500' : 'text-slate-400'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              value={messageSearch}
              onChange={(e) => setMessageSearch(e.target.value)}
              placeholder="Search messages..."
              className={`w-32 bg-transparent text-xs outline-none ${props.darkMode ? 'text-slate-200 placeholder:text-slate-500' : 'text-slate-700 placeholder:text-slate-400'}`}
            />
            {messageSearch && (
              <button type="button" onClick={() => setMessageSearch('')} className={`flex-shrink-0 ${props.darkMode ? 'text-slate-500 hover:text-slate-300' : 'text-slate-400 hover:text-slate-600'}`}>
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>
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
            {/* Load more messages button */}
            {props.hasMoreMessages && (
              <div className="flex justify-center py-2">
                <button
                  type="button"
                  onClick={props.onLoadMore}
                  disabled={props.loadingMoreMessages}
                  className={`px-4 py-1.5 rounded-full text-xs font-medium transition-colors ${
                    props.darkMode
                      ? 'bg-[#2a3942] hover:bg-[#364952] text-slate-300'
                      : 'bg-slate-200 hover:bg-slate-300 text-slate-600'
                  } ${props.loadingMoreMessages ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  {props.loadingMoreMessages ? (
                    <span className="flex items-center gap-1.5">
                      <svg className="w-3 h-3 animate-spin" viewBox="0 0 24 24" fill="none">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                      </svg>
                      Loading...
                    </span>
                  ) : 'Load older messages'}
                </button>
              </div>
            )}
            {filteredRows.length === 0 && messageSearch ? (
              <div className="flex flex-col items-center justify-center py-10 text-center">
                <p className={`text-sm ${props.darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                  No messages found for "{messageSearch}"
                </p>
              </div>
            ) : filteredRows.map((row) =>
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
                  roomKey={props.roomKey}
                  participants={props.participants}
                  onReact={props.onReact}
                  onReply={props.onReply}
                  onStartEdit={props.onStartEdit}
                  onDelete={props.onDelete}
                  onlineUsers={props.onlineUsers}
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

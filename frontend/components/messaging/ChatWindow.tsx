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

export function ChatWindow(props: ChatWindowProps) {
  const dateSeparatorClass = props.darkMode
    ? 'border-slate-700 bg-slate-900 text-slate-400'
    : 'border-slate-200 bg-white text-slate-500';

  return (
    <section className={`flex h-full flex-1 flex-col ${props.darkMode ? 'bg-slate-950 text-slate-100' : 'bg-white text-slate-900'}`}>
      <header className={`flex items-center justify-between px-5 py-4 border-b transition-all duration-300 ${
        props.darkMode 
          ? 'border-slate-800/60 bg-slate-950/80' 
          : 'border-slate-200/60 bg-white/80'
      }`} style={{ backdropFilter: 'blur(20px)' }}>
        <div className="flex items-center gap-4">
          <div className={`flex items-center justify-center w-10 h-10 rounded-full text-sm font-semibold ${
            props.darkMode ? 'bg-slate-800 text-slate-300' : 'bg-slate-100 text-slate-600'
          }`}>
            {props.roomTitle.charAt(0).toUpperCase()}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <p className="text-base font-semibold">{props.roomTitle}</p>
              <span className="flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-medium text-emerald-600 dark:text-emerald-400">
                <svg className="w-2.5 h-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
                E2E Encrypted
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{props.roomStatus}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">{props.headerActions}</div>
      </header>

      <div className={`flex-1 overflow-y-auto px-4 py-5 md:px-6 ${
        props.darkMode ? 'bg-slate-900/50' : 'bg-slate-50/50'
      }`}>
        {props.messages.length === 0 ? (
          <div className={`flex flex-col items-center justify-center h-full text-center p-8`}>
            <div className={`w-16 h-16 rounded-2xl flex items-center justify-center mb-4 ${
              props.darkMode ? 'bg-slate-800' : 'bg-slate-100'
            }`}>
              <svg className={`w-8 h-8 ${props.darkMode ? 'text-slate-500' : 'text-slate-400'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
            </div>
            <p className={`text-sm font-medium mb-1 ${props.darkMode ? 'text-slate-400' : 'text-slate-500'}`}>No messages yet</p>
            <p className={`text-xs ${props.darkMode ? 'text-slate-500' : 'text-slate-400'}`}>Start a secure conversation</p>
          </div>
        ) : (
          <div className="space-y-3">
            {props.messages.map((message, index) => {
              const messageDate = new Date(message.createdAt).toDateString();
              const prevDate = index > 0 ? new Date(props.messages[index - 1].createdAt).toDateString() : '';
              const showDate = messageDate !== prevDate;

              return (
                <div key={message.id}>
                  {showDate && (
                    <div className="sticky top-2 z-10 mb-4 flex justify-center">
                      <span className={`rounded-full border px-3 py-1 text-[11px] font-medium ${dateSeparatorClass} shadow-sm`}>
                        {messageDate === new Date().toDateString() ? 'Today' : messageDate}
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

            {props.typingIndicator && (
              <div className={`inline-flex items-center gap-2 rounded-2xl border px-4 py-2.5 text-xs ${props.darkMode ? 'border-slate-700 bg-slate-900 text-slate-400' : 'border-slate-200 bg-white text-slate-500'} shadow-sm`}>
                <span className="flex gap-1">
                  <span className="typing-dot" />
                  <span className="typing-dot" style={{ animationDelay: '200ms' }} />
                  <span className="typing-dot" style={{ animationDelay: '400ms' }} />
                </span>
                <span className="ml-1">{props.typingIndicator}</span>
              </div>
            )}

            <div ref={props.messageEndRef} />
          </div>
        )}
      </div>

      <footer className={`border-t px-4 py-4 md:px-6 transition-all duration-300 ${
        props.darkMode 
          ? 'border-slate-800/60 bg-slate-950/80' 
          : 'border-slate-200/60 bg-white/80'
      }`} style={{ backdropFilter: 'blur(20px)' }}>
        {props.composer}
      </footer>
    </section>
  );
}
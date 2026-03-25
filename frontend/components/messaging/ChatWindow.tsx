import { RefObject } from 'react';
import { MessageBubble } from './MessageBubble';
import { ChatMessage, GroupParticipant, Profile } from './types';

type ChatWindowProps = {
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
};

export function ChatWindow(props: ChatWindowProps) {
  const dateSeparatorClass = props.darkMode
    ? 'border-slate-700 bg-slate-900/85 text-slate-300 shadow-[0_8px_24px_rgba(2,6,23,0.35)]'
    : 'border-slate-200 bg-white/90 text-slate-500 shadow-[0_8px_24px_rgba(15,23,42,0.09)]';

  return (
    <section className={`flex h-full flex-1 flex-col ${props.darkMode ? 'bg-slate-950 text-slate-100' : 'bg-white/70 text-slate-900'}`}>
      <header className={`flex items-center justify-between border-b px-5 py-4 backdrop-blur-xl ${props.darkMode ? 'border-slate-800/90 bg-slate-950/85' : 'border-slate-200/80 bg-white/85'}`}>
        <div>
          <p className="flex items-center gap-2 text-base font-semibold tracking-tight">
            {props.roomTitle}
            <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold text-emerald-600">Encrypted</span>
          </p>
          <p className="mt-0.5 text-xs text-slate-500">{props.roomStatus}</p>
        </div>
        <div className="flex items-center gap-2">{props.headerActions}</div>
      </header>

      <div className={`flex-1 overflow-y-auto px-4 py-5 md:px-7 ${props.darkMode ? 'bg-slate-900/85' : 'bg-slate-100/55'}`}>
        {props.messages.length === 0 ? (
          <div className={`rounded-2xl border px-4 py-4 text-center text-sm ${props.darkMode ? 'border-slate-800 bg-slate-900 text-slate-400' : 'border-slate-200 bg-white text-slate-500'} shadow-[0_12px_24px_rgba(15,23,42,0.08)]`}>
            No messages yet. Start a secure conversation.
          </div>
        ) : null}

        <div className="space-y-4">
          {props.messages.map((message, index) => {
            const messageDate = new Date(message.createdAt).toDateString();
            const prevDate = index > 0 ? new Date(props.messages[index - 1].createdAt).toDateString() : '';
            const showDate = messageDate !== prevDate;

            return (
              <div key={message.id}>
                {showDate ? (
                  <div className="sticky top-2 z-10 mb-3 flex justify-center">
                    <span className={`rounded-full border px-2.5 py-0.5 text-[11px] ${dateSeparatorClass}`}>{messageDate}</span>
                  </div>
                ) : null}
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

          {props.typingIndicator ? (
            <div className={`inline-flex items-center gap-1 rounded-full border px-3 py-1 text-xs ${props.darkMode ? 'border-slate-700 bg-slate-900 text-slate-300' : 'border-slate-200 bg-white text-slate-500'} shadow-sm`}>
              <span>{props.typingIndicator}</span>
              <span className="typing-dot" />
              <span className="typing-dot" style={{ animationDelay: '120ms' }} />
              <span className="typing-dot" style={{ animationDelay: '240ms' }} />
            </div>
          ) : null}

          <div ref={props.messageEndRef} />
        </div>
      </div>

      <footer className={`border-t px-4 py-4 md:px-6 ${props.darkMode ? 'border-slate-800/90 bg-slate-950/90' : 'border-slate-200/80 bg-white/90'} backdrop-blur-xl`}>
        {props.composer}
      </footer>
    </section>
  );
}

import React from 'react';
import { ChatMessage, GroupParticipant, Profile } from '@/features/chat/types';

const FILE_MESSAGE_PREFIX = '__FILE__:';

interface AttachmentPayload {
  kind: 'file';
  url: string;
  mimeType: string;
  fileName: string;
  originalName: string;
  size: number;
}

function parseAttachmentMessage(content: string): AttachmentPayload | null {
  if (!content.startsWith(FILE_MESSAGE_PREFIX)) return null;
  try {
    return JSON.parse(content.slice(FILE_MESSAGE_PREFIX.length)) as AttachmentPayload;
  } catch {
    return null;
  }
}

function formatFileSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
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

interface MessageBubbleProps {
  message: ChatMessage;
  profile: Profile;
  darkMode: boolean;
  participants: GroupParticipant[];
  onReact: (messageId: string, emoji: string) => void;
  onReply: (message: ChatMessage) => void;
  onStartEdit: (message: ChatMessage) => void;
  onDelete: (message: ChatMessage) => void;
}

const quickReactions = ['👍', '❤️', '😂', '🔥', '👏', '🎉'];

export function MessageBubble(props: MessageBubbleProps) {
  const isMine = props.message.sender.userId === props.profile.userId;
  const attachment = parseAttachmentMessage(props.message.content);
  const isGroup = props.participants.length > 2;
  const grad = avatarGradient(props.message.sender.username);

  const groupedReactions = (props.message.reactions ?? []).reduce<Record<string, { count: number; users: string[] }>>(
    (acc, item) => {
      if (!acc[item.emoji]) acc[item.emoji] = { count: 0, users: [] };
      acc[item.emoji].count += 1;
      if (!acc[item.emoji].users.includes(item.username)) acc[item.emoji].users.push(item.username);
      return acc;
    },
    {},
  );

  return (
    <div className={`message-appear group flex items-end gap-2 py-0.5 ${isMine ? 'flex-row-reverse' : 'flex-row'}`}>
      {/* Sender avatar (non-mine, group chats) */}
      {!isMine && isGroup && (
        <div className={`flex-shrink-0 w-7 h-7 rounded-full bg-gradient-to-br ${grad} flex items-center justify-center text-xs font-bold text-white self-end mb-5`}>
          {props.message.sender.username.charAt(0).toUpperCase()}
        </div>
      )}
      {/* Spacer to align non-group non-mine messages */}
      {!isMine && !isGroup && <div className="w-0" />}

      <div className={`flex flex-col ${isMine ? 'items-end' : 'items-start'} max-w-[80%] md:max-w-[65%]`}>
        {/* Sender name for group chats */}
        {!isMine && isGroup && (
          <p className={`text-[11px] font-semibold mb-1 ml-1 ${props.darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
            {props.message.sender.username}
          </p>
        )}

        {/* Bubble */}
        <div className="relative">
          {/* Hover action bar */}
          <div className={`absolute ${isMine ? 'right-0' : 'left-0'} -top-9 opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-all duration-150 z-10 pointer-events-none group-hover:pointer-events-auto group-focus-within:pointer-events-auto`}>
            <div className={`flex items-center gap-0.5 rounded-xl px-1.5 py-1 shadow-lg ring-1 ${
              props.darkMode
                ? 'bg-slate-800 ring-slate-700'
                : 'bg-white ring-slate-200'
            }`}>
              {quickReactions.map((emoji) => (
                <button
                  key={emoji}
                  type="button"
                  onClick={() => props.onReact(props.message.id, emoji)}
                  className="w-7 h-7 flex items-center justify-center rounded-lg text-sm hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors active:scale-90"
                >
                  {emoji}
                </button>
              ))}
              <div className={`w-px h-4 mx-0.5 ${props.darkMode ? 'bg-slate-700' : 'bg-slate-200'}`} />
              <button
                type="button"
                onClick={() => props.onReply(props.message)}
                className={`w-7 h-7 flex items-center justify-center rounded-lg transition-colors ${
                  props.darkMode ? 'text-slate-400 hover:bg-slate-700 hover:text-slate-200' : 'text-slate-500 hover:bg-slate-100 hover:text-slate-700'
                }`}
                title="Reply"
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
                </svg>
              </button>
              {isMine && !props.message.isDeleted && (
                <>
                  <button
                    type="button"
                    onClick={() => props.onStartEdit(props.message)}
                    className={`w-7 h-7 flex items-center justify-center rounded-lg transition-colors ${
                      props.darkMode ? 'text-slate-400 hover:bg-slate-700 hover:text-slate-200' : 'text-slate-500 hover:bg-slate-100 hover:text-slate-700'
                    }`}
                    title="Edit"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                  </button>
                  <button
                    type="button"
                    onClick={() => props.onDelete(props.message)}
                    className="w-7 h-7 flex items-center justify-center rounded-lg text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-500/10 transition-colors"
                    title="Delete"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </>
              )}
            </div>
          </div>

          {/* Main bubble */}
          <div className={`rounded-2xl overflow-hidden ${
            isMine
              ? 'rounded-br-md bg-gradient-to-br from-blue-600 to-blue-700 text-white shadow-md shadow-blue-600/20'
              : props.darkMode
                ? 'rounded-bl-md bg-slate-800 text-slate-100 shadow-sm ring-1 ring-slate-700/50'
                : 'rounded-bl-md bg-white text-slate-900 shadow-sm ring-1 ring-slate-200/80'
          }`}>

            {/* Reply quote */}
            {props.message.replyTo && (
              <div className={`px-3.5 pt-3 pb-0 ${isMine ? '' : ''}`}>
                <div className={`rounded-lg border-l-2 px-2.5 py-2 text-xs ${
                  isMine
                    ? 'border-white/40 bg-white/10'
                    : props.darkMode
                      ? 'border-blue-500/60 bg-blue-500/8'
                      : 'border-blue-400/60 bg-blue-50'
                }`}>
                  <p className={`font-semibold mb-0.5 ${isMine ? 'text-white/80' : props.darkMode ? 'text-blue-400' : 'text-blue-600'}`}>
                    {props.message.replyTo.senderUsername}
                  </p>
                  <p className={`truncate ${isMine ? 'text-white/60' : props.darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                    {props.message.replyTo.content}
                  </p>
                </div>
              </div>
            )}

            {/* Content */}
            <div className="px-3.5 pt-2.5 pb-1.5">
              {props.message.isDeleted ? (
                <p className={`text-sm italic flex items-center gap-1.5 ${isMine ? 'text-white/50' : props.darkMode ? 'text-slate-500' : 'text-slate-400'}`}>
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                  This message was deleted
                </p>
              ) : attachment ? (
                <AttachmentContent attachment={attachment} isMine={isMine} darkMode={props.darkMode} />
              ) : (
                <p className="text-sm leading-relaxed whitespace-pre-wrap break-words">{props.message.content}</p>
              )}
            </div>

            {/* Reactions */}
            {Object.keys(groupedReactions).length > 0 && (
              <div className="px-3 pb-2">
                <div className="flex flex-wrap gap-1">
                  {Object.entries(groupedReactions).map(([emoji, data]) => (
                    <button
                      key={emoji}
                      type="button"
                      onClick={() => props.onReact(props.message.id, emoji)}
                      title={data.users.join(', ')}
                      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs transition-all hover:scale-105 active:scale-95 ${
                        isMine
                          ? 'bg-white/15 hover:bg-white/25 text-white/90'
                          : props.darkMode
                            ? 'bg-slate-700 hover:bg-slate-600 text-slate-200'
                            : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                      }`}
                    >
                      <span className="text-xs">{emoji}</span>
                      <span className="font-semibold text-[10px]">{data.count}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Timestamp + status */}
            <div className={`flex items-center gap-1.5 px-3.5 pb-2.5 ${isMine ? 'justify-end' : 'justify-start'}`}>
              <span className={`text-[10px] ${isMine ? 'text-white/50' : props.darkMode ? 'text-slate-500' : 'text-slate-400'}`}>
                {new Date(props.message.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
              {props.message.isEdited && !props.message.isDeleted && (
                <span className={`text-[10px] italic ${isMine ? 'text-white/40' : props.darkMode ? 'text-slate-600' : 'text-slate-400'}`}>
                  edited
                </span>
              )}
              {isMine && (
                <span className={`${isMine ? 'text-white/60' : ''}`}>
                  {messageStatus(props.message, props.profile)}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function AttachmentContent({ attachment, isMine, darkMode }: { attachment: AttachmentPayload; isMine: boolean; darkMode: boolean }) {
  if (attachment.mimeType.startsWith('image/')) {
    return (
      <div className="rounded-xl overflow-hidden -mx-0.5">
        <img
          src={attachment.url}
          alt={attachment.originalName}
          className="max-h-72 w-full object-cover"
          loading="lazy"
        />
      </div>
    );
  }

  if (attachment.mimeType.startsWith('video/')) {
    return (
      <div className="rounded-xl overflow-hidden -mx-0.5">
        <video className="max-h-72 w-full" controls preload="metadata">
          <source src={attachment.url} type={attachment.mimeType} />
        </video>
      </div>
    );
  }

  if (attachment.mimeType === 'application/pdf') {
    return (
      <a
        href={attachment.url}
        target="_blank"
        rel="noreferrer"
        className={`flex items-center gap-3 rounded-xl p-3 transition-colors ${
          isMine ? 'bg-white/10 hover:bg-white/20' : darkMode ? 'bg-slate-700/60 hover:bg-slate-700' : 'bg-slate-50 hover:bg-slate-100'
        }`}
      >
        <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${
          isMine ? 'bg-white/20' : 'bg-red-500/15'
        }`}>
          <svg className={`w-5 h-5 ${isMine ? 'text-white' : 'text-red-500'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
          </svg>
        </div>
        <div className="min-w-0">
          <p className="text-sm font-medium truncate">{attachment.originalName}</p>
          <p className={`text-xs ${isMine ? 'text-white/60' : darkMode ? 'text-slate-500' : 'text-slate-400'}`}>
            PDF · {formatFileSize(attachment.size)}
          </p>
        </div>
      </a>
    );
  }

  return (
    <a
      href={attachment.url}
      target="_blank"
      rel="noreferrer"
      className={`flex items-center gap-3 rounded-xl p-3 transition-colors ${
        isMine ? 'bg-white/10 hover:bg-white/20' : darkMode ? 'bg-slate-700/60 hover:bg-slate-700' : 'bg-slate-50 hover:bg-slate-100'
      }`}
    >
      <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${
        isMine ? 'bg-white/20' : darkMode ? 'bg-slate-600' : 'bg-slate-200'
      }`}>
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
        </svg>
      </div>
      <div className="min-w-0">
        <p className="text-sm font-medium truncate">{attachment.originalName}</p>
        <p className={`text-xs ${isMine ? 'text-white/60' : darkMode ? 'text-slate-500' : 'text-slate-400'}`}>
          {formatFileSize(attachment.size)}
        </p>
      </div>
    </a>
  );
}

function messageStatus(message: ChatMessage, profile: Profile): React.ReactNode {
  const recipients = (message.receipts ?? []).filter((r) => r.userId !== profile.userId);
  const hasRead = recipients.some((r) => r.status === 'READ');
  const hasDelivered = recipients.some((r) => r.status === 'DELIVERED' || r.status === 'READ');

  // Double blue ticks (read)
  if (hasRead) {
    return (
      <svg className="w-4 h-4 text-blue-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l4 4 9-11" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M1.5 12.75l4 4" opacity="0.6" />
      </svg>
    );
  }

  // Double grey ticks (delivered)
  if (hasDelivered) {
    return (
      <svg className="w-4 h-4 text-white/50" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l4 4 9-11" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M1.5 12.75l4 4" opacity="0.5" />
      </svg>
    );
  }

  // Single tick (sent)
  return (
    <svg className="w-4 h-4 text-white/50" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l4 4 9-11" />
    </svg>
  );
}

import React from 'react';
import { ChatMessage, GroupParticipant, Profile } from './types';

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
  if (!content.startsWith(FILE_MESSAGE_PREFIX)) {
    return null;
  }

  try {
    return JSON.parse(content.slice(FILE_MESSAGE_PREFIX.length)) as AttachmentPayload;
  } catch {
    return null;
  }
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

const quickReactions = ['👍', '❤️', '😂', '👏', '🔥', '🎉'];

export function MessageBubble(props: MessageBubbleProps) {
  const isMine = props.message.sender.userId === props.profile.userId;
  const attachment = parseAttachmentMessage(props.message.content);

  const groupedReactions = (props.message.reactions ?? []).reduce<Record<string, { count: number; users: string[] }>>((acc, item) => {
    if (!acc[item.emoji]) {
      acc[item.emoji] = { count: 0, users: [] };
    }
    acc[item.emoji].count += 1;
    if (!acc[item.emoji].users.includes(item.username)) {
      acc[item.emoji].users.push(item.username);
    }
    return acc;
  }, {});

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className={`message-appear group flex ${isMine ? 'justify-end' : 'justify-start'}`}>
      <div
        className={`max-w-[85%] md:max-w-[70%] rounded-2xl transition-all duration-200 ${
          isMine
            ? 'rounded-br-md bg-gradient-to-br from-blue-600 to-cyan-500 text-white'
            : props.darkMode
              ? 'rounded-bl-md border border-slate-700/60 bg-slate-800/80 text-slate-100'
              : 'rounded-bl-md border border-slate-200 bg-white text-slate-900'
        }`}
      >
        {!isMine && (
          <div className="px-4 pt-3 pb-0">
            <p className="text-[11px] font-semibold uppercase tracking-wider opacity-75">{props.message.sender.username}</p>
          </div>
        )}

        {props.message.replyTo ? (
          <div className={`mx-4 mt-3 rounded-lg border-l-2 px-3 py-2 text-xs ${
            isMine ? 'border-white/30 bg-white/10' : 'border-blue-500/60 bg-blue-500/5'
          }`}>
            <p className="font-semibold opacity-75">Replying to {props.message.replyTo.senderUsername}</p>
            <p className="truncate opacity-70 mt-0.5">{props.message.replyTo.content}</p>
          </div>
        ) : null}

        <div className="px-4 py-3">
          {attachment ? (
            <div className="space-y-2">
              {attachment.mimeType.startsWith('image/') && (
                <div className="relative rounded-xl overflow-hidden">
                  <img 
                    src={attachment.url} 
                    alt={attachment.originalName} 
                    className="max-h-80 w-full object-cover" 
                    loading="lazy"
                  />
                </div>
              )}
              {attachment.mimeType.startsWith('video/') && (
                <div className="rounded-xl overflow-hidden">
                  <video 
                    className="max-h-80 w-full rounded-xl" 
                    controls 
                    preload="metadata"
                    poster={attachment.mimeType.startsWith('video/') ? undefined : undefined}
                  >
                    <source src={attachment.url} type={attachment.mimeType} />
                  </video>
                </div>
              )}
              {attachment.mimeType === 'application/pdf' && (
                <div className={`flex items-center gap-3 p-3 rounded-xl ${
                  isMine ? 'bg-white/10' : props.darkMode ? 'bg-slate-700/50' : 'bg-slate-100'
                }`}>
                  <div className={`p-2 rounded-lg ${isMine ? 'bg-white/20' : 'bg-red-500/20'}`}>
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{attachment.originalName}</p>
                    <p className={`text-xs ${isMine ? 'text-white/60' : 'text-slate-500'}`}>{formatFileSize(attachment.size)}</p>
                  </div>
                </div>
              )}
              {!attachment.mimeType.startsWith('image/') &&
              !attachment.mimeType.startsWith('video/') &&
              attachment.mimeType !== 'application/pdf' && (
                <a 
                  href={attachment.url} 
                  target="_blank" 
                  rel="noreferrer"
                  className={`flex items-center gap-2 p-3 rounded-xl text-sm ${
                    isMine ? 'bg-white/10 hover:bg-white/20' : 'bg-slate-100 dark:bg-slate-700/50 hover:bg-slate-200 dark:hover:bg-slate-700'
                  }`}
                >
                  <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                  </svg>
                  <span className="truncate">{attachment.originalName}</span>
                </a>
              )}
            </div>
          ) : (
            <p className={`text-sm leading-relaxed ${props.message.deletedLocal ? 'italic opacity-60' : ''}`}>
              {props.message.content}
            </p>
          )}
        </div>

        {Object.keys(groupedReactions).length > 0 && (
          <div className="px-4 pb-2">
            <div className="flex flex-wrap gap-1.5">
              {Object.entries(groupedReactions).map(([emoji, data]) => (
                <button
                  key={emoji}
                  type="button"
                  onClick={() => props.onReact(props.message.id, emoji)}
                  className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs transition-all hover:scale-105 ${
                    isMine 
                      ? 'border-white/20 bg-white/10 hover:bg-white/20' 
                      : props.darkMode
                        ? 'border-slate-600 bg-slate-700/50 hover:bg-slate-700'
                        : 'border-slate-200 bg-slate-100 hover:bg-slate-200'
                  }`}
                >
                  <span>{emoji}</span>
                  <span className={`font-medium ${isMine ? 'text-white/80' : 'text-slate-600'}`}>{data.count}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="flex items-center justify-between px-4 pb-3 gap-4">
          <div className="flex items-center gap-2 text-[11px] opacity-70">
            <span>{new Date(props.message.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
            {isMine && <span>{messageStatus(props.message, props.profile)}</span>}
          </div>
        </div>

        <div className="hidden group-hover:flex flex-wrap items-center gap-1 px-2 pb-2">
          {quickReactions.map((emoji) => (
            <button
              key={emoji}
              type="button"
              onClick={() => props.onReact(props.message.id, emoji)}
              className={`rounded-lg border px-2 py-1 text-sm transition-all hover:scale-110 active:scale-95 ${
                isMine ? 'border-white/20 bg-white/10 hover:bg-white/20' : 'border-slate-200 bg-white dark:border-slate-600 dark:bg-slate-700'
              }`}
            >
              {emoji}
            </button>
          ))}
          <div className={`w-px h-4 ${isMine ? 'bg-white/20' : 'bg-slate-200 dark:bg-slate-600'}`} />
          <button 
            type="button" 
            onClick={() => props.onReply(props.message)} 
            className={`rounded-lg border px-2 py-1 text-xs transition-all hover:scale-105 active:scale-95 ${
              isMine ? 'border-white/20 hover:bg-white/20' : 'border-slate-200 dark:border-slate-600'
            }`}
          >
            Reply
          </button>
          {isMine && !props.message.deletedLocal && (
            <>
              <button 
                type="button" 
                onClick={() => props.onStartEdit(props.message)} 
                className={`rounded-lg border px-2 py-1 text-xs transition-all hover:scale-105 active:scale-95 ${
                  isMine ? 'border-white/20 hover:bg-white/20' : 'border-slate-200 dark:border-slate-600'
                }`}
              >
                Edit
              </button>
              <button 
                type="button" 
                onClick={() => props.onDelete(props.message)} 
                className={`rounded-lg border px-2 py-1 text-xs transition-all hover:scale-105 active:scale-95 text-rose-400 hover:text-rose-300 ${
                  isMine ? 'border-white/20 hover:bg-white/20' : 'border-rose-200 dark:border-rose-800'
                }`}
              >
                Delete
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function messageStatus(message: ChatMessage, profile: Profile): React.ReactNode {
  const recipientReceipts = (message.receipts ?? []).filter((item) => item.userId !== profile.userId);
  const hasRead = recipientReceipts.some((item) => item.status === 'READ');
  const hasDelivered = recipientReceipts.some((item) => item.status === 'DELIVERED' || item.status === 'READ');

  if (hasRead) {
    return (
      <span className="inline-flex items-center gap-0.5">
        <svg className="w-3.5 h-3.5 text-blue-300" viewBox="0 0 16 16" fill="currentColor">
          <path d="M13.78 4.22a.75.75 0 010 1.06l-7.25 7.25a.75.75 0 01-1.06 0L2.22 9.28a.75.75 0 011.06-1.06L6 10.94l6.72-6.72a.75.75 0 011.06 0z"/>
          <path d="M15.28 4.22a.75.75 0 010 1.06l-7.25 7.25a.75.75 0 01-1.06 0L3.72 9.28a.75.75 0 011.06-1.06L7.5 10.94l6.72-6.72a.75.75 0 011.06 0z"/>
        </svg>
      </span>
    );
  }
  if (hasDelivered) {
    return (
      <span className="inline-flex items-center">
        <svg className="w-3.5 h-3.5" viewBox="0 0 16 16" fill="currentColor">
          <path d="M13.78 4.22a.75.75 0 010 1.06l-7.25 7.25a.75.75 0 01-1.06 0L2.22 9.28a.75.75 0 011.06-1.06L6 10.94l6.72-6.72a.75.75 0 011.06 0z"/>
        </svg>
        <svg className="w-3.5 h-3.5 -ml-1.5" viewBox="0 0 16 16" fill="currentColor">
          <path d="M13.78 4.22a.75.75 0 010 1.06l-7.25 7.25a.75.75 0 01-1.06 0L2.22 9.28a.75.75 0 011.06-1.06L6 10.94l6.72-6.72a.75.75 0 011.06 0z"/>
        </svg>
      </span>
    );
  }
  return (
    <span className="inline-flex items-center">
      <svg className="w-3.5 h-3.5" viewBox="0 0 16 16" fill="currentColor">
        <path d="M13.78 4.22a.75.75 0 010 1.06l-7.25 7.25a.75.75 0 01-1.06 0L2.22 9.28a.75.75 0 011.06-1.06L6 10.94l6.72-6.72a.75.75 0 011.06 0z"/>
      </svg>
    </span>
  );
}
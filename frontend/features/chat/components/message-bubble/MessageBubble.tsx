import React, { useRef, useState, useMemo } from 'react';
import { ChatMessage, GroupParticipant, Profile } from '@/features/chat/types';
import { avatarGradient } from '@/lib/avatar';

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

interface MessageBubbleProps {
  message: ChatMessage;
  profile: Profile;
  darkMode: boolean;
  roomKey: string;
  isGrouped?: boolean;
  participants: GroupParticipant[];
  onReact: (messageId: string, emoji: string) => void;
  onReply: (message: ChatMessage) => void;
  onStartEdit: (message: ChatMessage) => void;
  onDelete: (message: ChatMessage) => void;
  onlineUsers?: { userId: number; username: string; status: string }[];
  onScrollToMessage?: (messageId: string) => void;
  onRetry?: (message: ChatMessage) => void;
}

const quickReactions = ['👍', '❤️', '😂', '🔥', '👏', '🎉'];

function areEqual(prev: MessageBubbleProps, next: MessageBubbleProps): boolean {
  return (
    prev.message === next.message &&
    prev.profile.userId === next.profile.userId &&
    prev.darkMode === next.darkMode &&
    prev.roomKey === next.roomKey &&
    prev.isGrouped === next.isGrouped &&
    prev.participants === next.participants &&
    prev.onlineUsers === next.onlineUsers &&
    prev.onReact === next.onReact &&
    prev.onReply === next.onReply &&
    prev.onStartEdit === next.onStartEdit &&
    prev.onDelete === next.onDelete &&
    prev.onScrollToMessage === next.onScrollToMessage &&
    prev.onRetry === next.onRetry
  );
}

export const MessageBubble = React.memo(function MessageBubble(props: MessageBubbleProps) {
  const isMine = props.message.sender.userId === props.profile.userId;
  const isGroup = !props.roomKey.startsWith('dm_');
  const grouped = props.isGrouped ?? false;
  const grad = avatarGradient(props.message.sender.username);

  const [sheetOpen, setSheetOpen] = useState(false);
  const longPressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const touchMovedRef = useRef(false);

  const handleTouchStart = () => {
    touchMovedRef.current = false;
    longPressTimerRef.current = setTimeout(() => {
      if (!touchMovedRef.current) setSheetOpen(true);
    }, 500);
  };
  const handleTouchEnd = () => {
    if (longPressTimerRef.current) { clearTimeout(longPressTimerRef.current); longPressTimerRef.current = null; }
  };
  const handleTouchMove = () => {
    touchMovedRef.current = true;
    if (longPressTimerRef.current) { clearTimeout(longPressTimerRef.current); longPressTimerRef.current = null; }
  };

  const isSenderOnline = useMemo(() => {
    if (!props.onlineUsers) return false;
    return props.onlineUsers.some(u => u.userId === props.message.sender.userId);
  }, [props.onlineUsers, props.message.sender.userId]);

  const attachment = useMemo(
    () => parseAttachmentMessage(props.message.content),
    [props.message.content],
  );

  const groupedReactions = useMemo(
    () =>
      (props.message.reactions ?? []).reduce<Record<string, { count: number; users: string[] }>>(
        (acc, item) => {
          if (!acc[item.emoji]) acc[item.emoji] = { count: 0, users: [] };
          if (!acc[item.emoji].users.includes(item.username)) acc[item.emoji].users.push(item.username);
          acc[item.emoji].count = acc[item.emoji].users.length;
          return acc;
        },
        {},
      ),
    [props.message.reactions],
  );

  const timestamp = useMemo(
    () => new Date(props.message.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    [props.message.createdAt],
  );

  return (
    <div
      data-message-id={props.message.id}
      className={`message-appear flex items-end gap-2 ${grouped ? 'pt-0.5' : 'pt-1.5'} pb-0 ${isMine ? 'flex-row-reverse' : 'flex-row'}`}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      onTouchMove={handleTouchMove}
    >
      {/* Sender avatar (non-mine, group chats) — hidden for grouped follow-ups */}
      {!isMine && isGroup && !grouped && (
        <div className={`flex-shrink-0 w-7 h-7 rounded-full bg-gradient-to-br ${grad} flex items-center justify-center text-xs font-bold text-white self-end mb-5`}>
          {props.message.sender.username.charAt(0).toUpperCase()}
        </div>
      )}
      {/* Spacer that matches avatar width for aligned follow-up messages */}
      {!isMine && isGroup && grouped && <div className="flex-shrink-0 w-7" />}
      {/* Spacer to align non-group non-mine messages */}
      {!isMine && !isGroup && <div className="w-0" />}

      <div className={`flex flex-col ${isMine ? 'items-end' : 'items-start'} max-w-[80%] md:max-w-[65%]`}>
        {/* Sender name for group chats — hidden for grouped follow-ups */}
        {!isMine && isGroup && !grouped && (
          <p className={`text-[12px] font-semibold mb-1 ml-1 flex items-center gap-1.5 ${props.darkMode ? 'text-[#00a884]' : 'text-[#008069]'}`}>
            <span>{props.message.sender.username}</span>
            <span className={`w-2 h-2 rounded-full flex-shrink-0 ${isSenderOnline ? 'bg-emerald-500' : 'bg-slate-400'}`} />
          </p>
        )}

        {/* Bubble */}
        <div className="relative group">
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
                onClick={() => {
                  const text = props.message.content;
                  if (text && !props.message.isDeleted) {
                    navigator.clipboard.writeText(text).catch(() => {});
                  }
                }}
                className={`w-7 h-7 flex items-center justify-center rounded-lg transition-colors ${
                  props.darkMode ? 'text-slate-400 hover:bg-slate-700 hover:text-slate-200' : 'text-slate-500 hover:bg-slate-100 hover:text-slate-700'
                }`}
                title="Copy"
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
              </button>
              <button
                type="button"
                onClick={() => props.onReply(props.message)}
                disabled={props.message.isDeleted}
                className={`w-7 h-7 flex items-center justify-center rounded-lg transition-colors disabled:opacity-30 ${
                  props.darkMode ? 'text-slate-400 hover:bg-slate-700 hover:text-slate-200' : 'text-slate-500 hover:bg-slate-100 hover:text-slate-700'
                }`}
                title={props.message.isDeleted ? 'Cannot reply to deleted message' : 'Reply'}
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
              ? props.darkMode
                ? 'rounded-br-sm bg-[#005c4b] text-[#e9edef] shadow-sm'
                : 'rounded-br-sm bg-[#d9fdd3] text-[#111b21] shadow-sm'
              : props.darkMode
                ? 'rounded-bl-sm bg-[#202c33] text-[#e9edef] shadow-sm'
                : 'rounded-bl-sm bg-white text-[#111b21] shadow-sm'
          }`}>

            {/* Reply quote */}
            {props.message.replyTo && (
              <div className="px-3.5 pt-3 pb-0">
                <div
                  role={props.onScrollToMessage ? 'button' : undefined}
                  tabIndex={props.onScrollToMessage ? 0 : undefined}
                  onClick={props.onScrollToMessage ? () => props.onScrollToMessage!(props.message.replyTo!.id) : undefined}
                  onKeyDown={props.onScrollToMessage ? (e) => { if (e.key === 'Enter' || e.key === ' ') props.onScrollToMessage!(props.message.replyTo!.id); } : undefined}
                  className={`rounded-lg border-l-[3px] px-2.5 py-2 text-xs ${props.onScrollToMessage ? 'cursor-pointer hover:brightness-95 active:brightness-90 transition-all' : ''} ${
                  isMine
                    ? props.darkMode
                      ? 'border-[#00a884] bg-[#025144]'
                      : 'border-[#25d366] bg-[#c8f5c0]'
                    : props.darkMode
                      ? 'border-[#00a884] bg-[#182229]'
                      : 'border-[#25d366] bg-slate-50'
                }`}>
                  <p className={`font-semibold mb-0.5 ${
                    props.darkMode ? 'text-[#00a884]' : 'text-[#008069]'
                  }`}>
                    {props.message.replyTo.senderUsername}
                  </p>
                  <p className={`truncate ${
                    isMine
                      ? props.darkMode ? 'text-[#aebac1]' : 'text-[#54656f]'
                      : props.darkMode ? 'text-[#8696a0]' : 'text-[#54656f]'
                  }`}>
                    {props.message.replyTo.content}
                  </p>
                </div>
              </div>
            )}

            {/* Content */}
            <div className="px-3.5 pt-2.5 pb-1.5">
              {props.message.isDeleted ? (
                <p className={`text-sm italic flex items-center gap-1.5 ${props.darkMode ? 'text-[#8696a0]' : 'text-[#667781]'}`}>
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
                          ? props.darkMode
                            ? 'bg-[#182229] hover:bg-[#111b21] text-[#e9edef]'
                            : 'bg-[#c8f5c0] hover:bg-[#b5eaac] text-[#111b21]'
                          : props.darkMode
                            ? 'bg-[#182229] hover:bg-[#111b21] text-[#e9edef]'
                            : 'bg-slate-100 hover:bg-slate-200 text-[#111b21]'
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
              {props.message.failed ? (
                <button
                  type="button"
                  onClick={() => props.onRetry?.(props.message)}
                  className="flex items-center gap-1 text-[11px] text-rose-500 hover:text-rose-400 transition-colors"
                  title="Failed to send — tap to retry"
                >
                  <svg className="w-3.5 h-3.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
                  </svg>
                  Failed · Retry
                </button>
              ) : (
                <>
                  <span className={`text-[11px] ${
                    isMine
                      ? props.darkMode ? 'text-[#8696a0]' : 'text-[#54656f]'
                      : props.darkMode ? 'text-[#8696a0]' : 'text-[#667781]'
                  }`}>
                    {timestamp}
                  </span>
                  {props.message.isEdited && !props.message.isDeleted && (
                    <span className={`text-[10px] italic ${
                      props.darkMode ? 'text-[#8696a0]' : 'text-[#667781]'
                    }`}>
                      edited
                    </span>
                  )}
                  {isMine && (
                    <span>
                      {messageStatus(props.message, props.profile)}
                    </span>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Mobile long-press action sheet */}
      {sheetOpen && (
        <div className="fixed inset-0 z-50 flex items-end md:hidden" onClick={() => setSheetOpen(false)}>
          <div className="absolute inset-0 bg-black/40" />
          <div
            className={`relative w-full rounded-t-2xl pb-safe overflow-hidden animate-slide-up ${props.darkMode ? 'bg-[#1d2b32]' : 'bg-white'}`}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Quick reactions */}
            <div className={`flex items-center justify-around px-4 py-3 border-b ${props.darkMode ? 'border-white/5' : 'border-slate-100'}`}>
              {quickReactions.map((emoji) => (
                <button
                  key={emoji}
                  type="button"
                  onClick={() => { props.onReact(props.message.id, emoji); setSheetOpen(false); }}
                  className="text-2xl w-10 h-10 flex items-center justify-center rounded-full hover:bg-slate-100 dark:hover:bg-slate-700 active:scale-90 transition-all"
                >
                  {emoji}
                </button>
              ))}
            </div>
            {/* Action list */}
            <div className="py-1">
              {!props.message.isDeleted && (
                <button
                  type="button"
                  onClick={() => { props.onReply(props.message); setSheetOpen(false); }}
                  className={`w-full flex items-center gap-4 px-5 py-3.5 text-sm font-medium transition-colors ${props.darkMode ? 'text-slate-200 hover:bg-white/5' : 'text-slate-800 hover:bg-slate-50'}`}
                >
                  <svg className="w-5 h-5 flex-shrink-0 opacity-70" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
                  </svg>
                  Reply
                </button>
              )}
              {!props.message.isDeleted && (
                <button
                  type="button"
                  onClick={() => { navigator.clipboard.writeText(props.message.content).catch(() => {}); setSheetOpen(false); }}
                  className={`w-full flex items-center gap-4 px-5 py-3.5 text-sm font-medium transition-colors ${props.darkMode ? 'text-slate-200 hover:bg-white/5' : 'text-slate-800 hover:bg-slate-50'}`}
                >
                  <svg className="w-5 h-5 flex-shrink-0 opacity-70" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                  Copy
                </button>
              )}
              {isMine && !props.message.isDeleted && (
                <button
                  type="button"
                  onClick={() => { props.onStartEdit(props.message); setSheetOpen(false); }}
                  className={`w-full flex items-center gap-4 px-5 py-3.5 text-sm font-medium transition-colors ${props.darkMode ? 'text-slate-200 hover:bg-white/5' : 'text-slate-800 hover:bg-slate-50'}`}
                >
                  <svg className="w-5 h-5 flex-shrink-0 opacity-70" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                  Edit
                </button>
              )}
              {isMine && (
                <button
                  type="button"
                  onClick={() => { props.onDelete(props.message); setSheetOpen(false); }}
                  className="w-full flex items-center gap-4 px-5 py-3.5 text-sm font-medium text-rose-500 transition-colors hover:bg-rose-50 dark:hover:bg-rose-500/10"
                >
                  <svg className="w-5 h-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                  Delete
                </button>
              )}
            </div>
            {/* Cancel */}
            <div className={`border-t px-4 pt-1 pb-3 ${props.darkMode ? 'border-white/5' : 'border-slate-100'}`}>
              <button
                type="button"
                onClick={() => setSheetOpen(false)}
                className={`w-full py-3 rounded-xl text-sm font-semibold transition-colors ${props.darkMode ? 'bg-white/5 text-slate-300 hover:bg-white/10' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'}`}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}, areEqual);

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

  // Double teal ticks (read) — WhatsApp style
  if (hasRead) {
    return (
      <svg className="w-4 h-4 text-[#66d9ff]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l4 4 9-11" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M1.5 12.75l4 4" opacity="0.8" />
      </svg>
    );
  }

  // Double grey ticks (delivered)
  if (hasDelivered) {
    return (
      <svg className="w-4 h-4 text-[#c7d5db]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l4 4 9-11" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M1.5 12.75l4 4" opacity="0.7" />
      </svg>
    );
  }

  // Single tick (sent)
  return (
    <svg className="w-4 h-4 text-[#c7d5db]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l4 4 9-11" />
    </svg>
  );
}

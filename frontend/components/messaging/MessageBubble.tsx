import { ChatMessage, GroupParticipant, Profile } from './types';

const FILE_MESSAGE_PREFIX = '__FILE__:';

type AttachmentPayload = {
  kind: 'file';
  url: string;
  mimeType: string;
  fileName: string;
  originalName: string;
  size: number;
};

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

type MessageBubbleProps = {
  message: ChatMessage;
  profile: Profile;
  darkMode: boolean;
  participants: GroupParticipant[];
  onReact: (messageId: string, emoji: string) => void;
  onReply: (message: ChatMessage) => void;
  onStartEdit: (message: ChatMessage) => void;
  onDelete: (message: ChatMessage) => void;
};

const quickReactions = ['👍', '❤️', '😂', '👏'];

export function MessageBubble(props: MessageBubbleProps) {
  const mine = props.message.sender.userId === props.profile.userId;
  const attachment = parseAttachmentMessage(props.message.content);

  const groupedReactions = (props.message.reactions ?? []).reduce<Record<string, number>>((acc, item) => {
    acc[item.emoji] = (acc[item.emoji] ?? 0) + 1;
    return acc;
  }, {});

  return (
    <div className={`message-appear group flex ${mine ? 'justify-end' : 'justify-start'}`}>
      <div
        className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm shadow-[0_8px_24px_rgba(15,23,42,0.08)] md:max-w-[72%] ${
          mine
            ? 'rounded-br-md bg-gradient-to-br from-indigo-600 to-blue-600 text-white'
            : props.darkMode
              ? 'rounded-bl-md border border-slate-700 bg-slate-900 text-slate-100'
              : 'rounded-bl-md border border-slate-200 bg-white text-slate-900'
        }`}
      >
        {!mine ? <p className="mb-1 text-[11px] font-semibold uppercase tracking-[0.06em] opacity-80">{props.message.sender.username}</p> : null}

        {props.message.replyTo ? (
          <div className={`mb-2 rounded-lg border-l-2 px-2 py-1 text-xs ${mine ? 'border-indigo-200 bg-indigo-500/25' : 'border-indigo-500/60 bg-indigo-500/10'}`}>
            <p className="font-semibold">Replying to {props.message.replyTo.senderUsername}</p>
            <p className="truncate opacity-80">{props.message.replyTo.content}</p>
          </div>
        ) : null}

        {attachment ? (
          <div className="space-y-2">
            {attachment.mimeType.startsWith('image/') ? (
              <img src={attachment.url} alt={attachment.originalName} className="max-h-72 w-full rounded-xl object-cover" />
            ) : null}
            {attachment.mimeType.startsWith('video/') ? (
              <video className="max-h-72 w-full rounded-xl" controls preload="metadata">
                <source src={attachment.url} type={attachment.mimeType} />
              </video>
            ) : null}
            {attachment.mimeType === 'application/pdf' ? (
              <a href={attachment.url} target="_blank" rel="noreferrer" className="underline">
                Open PDF: {attachment.originalName}
              </a>
            ) : null}
            {!attachment.mimeType.startsWith('image/') &&
            !attachment.mimeType.startsWith('video/') &&
            attachment.mimeType !== 'application/pdf' ? (
              <a href={attachment.url} target="_blank" rel="noreferrer" className="underline">
                {attachment.originalName}
              </a>
            ) : null}
          </div>
        ) : (
          <p className={`leading-relaxed ${props.message.deletedLocal ? 'italic opacity-70' : ''}`}>
            {props.message.content}
          </p>
        )}

        <div className="mt-2 flex flex-wrap items-center gap-1.5">
          {Object.entries(groupedReactions).map(([emoji, count]) => (
            <button
              key={emoji}
              type="button"
              onClick={() => props.onReact(props.message.id, emoji)}
              className={`btn-press rounded-full border px-2 py-0.5 text-[11px] ${mine ? 'border-white/20 bg-indigo-500/35' : 'border-slate-300 bg-white/70'} `}
            >
              {emoji} {count}
            </button>
          ))}
        </div>

        <div className="mt-2 flex items-center justify-between gap-2 text-[10px] opacity-80">
          <span>{new Date(props.message.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
          <span>{mine ? messageStatus(props.message, props.profile) : ''}</span>
        </div>

        <div className="mt-2 hidden flex-wrap items-center gap-1.5 group-hover:flex">
          {quickReactions.map((emoji) => (
            <button
              key={emoji}
              type="button"
              onClick={() => props.onReact(props.message.id, emoji)}
              className={`btn-press rounded-md border px-1.5 py-0.5 text-[11px] ${
                mine ? 'border-white/30 bg-indigo-500/35' : 'border-slate-300 bg-white'
              }`}
            >
              {emoji}
            </button>
          ))}
          <button type="button" onClick={() => props.onReply(props.message)} className="btn-press rounded-md border px-2 py-0.5 text-[11px]">
            Reply
          </button>
          {mine && !props.message.deletedLocal ? (
            <>
              <button type="button" onClick={() => props.onStartEdit(props.message)} className="btn-press rounded-md border px-2 py-0.5 text-[11px]">
                Edit
              </button>
              <button type="button" onClick={() => props.onDelete(props.message)} className="btn-press rounded-md border px-2 py-0.5 text-[11px] text-rose-500">
                Delete
              </button>
            </>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function messageStatus(message: ChatMessage, profile: Profile): string {
  const recipientReceipts = (message.receipts ?? []).filter((item) => item.userId !== profile.userId);
  const hasRead = recipientReceipts.some((item) => item.status === 'READ');
  const hasDelivered = recipientReceipts.some((item) => item.status === 'DELIVERED' || item.status === 'READ');

  if (hasRead) return 'read';
  if (hasDelivered) return 'delivered';
  return 'sent';
}

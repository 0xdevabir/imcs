export type AppSection = 'chats' | 'calls' | 'contacts' | 'settings';

export type Profile = {
  userId: number;
  username: string;
  role: 'admin' | 'user';
};

export type Receipt = {
  id?: string;
  messageId?: string;
  userId: number;
  username: string;
  status: 'DELIVERED' | 'READ';
  createdAt?: string;
};

export type MessageReaction = {
  id?: string;
  messageId?: string;
  userId: number;
  username: string;
  emoji: string;
  createdAt?: string;
};

export type ReplyPreview = {
  id: string;
  senderUsername: string;
  content: string;
};

export type ChatMessage = {
  id: string;
  roomKey: string;
  sender: {
    userId: number;
    username: string;
  };
  content: string;
  createdAt: string;
  deliveredAt?: string | null;
  readAt?: string | null;
  receipts: Receipt[];
  reactions?: MessageReaction[];
  replyTo?: ReplyPreview | null;
  editedLocal?: boolean;
  deletedLocal?: boolean;
};

export type OnlineUser = {
  userId: number;
  username: string;
};

export type GroupParticipant = {
  userId: number;
  username: string;
  joinedAt: string;
  role: 'owner' | 'admin' | 'member';
};

export type GroupSummary = {
  key: string;
  name: string;
  participantCount: number;
};

export type RoomItem = {
  key: string;
  name: string;
  unread: number;
  lastMessage: string;
  lastAt?: string;
};

export type IncomingCall = {
  fromUserId: number;
  fromUsername: string;
  roomKey: string;
  callType: 'voice' | 'video';
};

export type UploadedFileResponse = {
  fileName: string;
  originalName: string;
  mimeType: string;
  size: number;
  url: string;
};

export type SearchedUser = {
  userId: number;
  username: string;
  role: 'admin' | 'user';
};

export type AttachmentPayload = {
  kind: 'file';
  url: string;
  mimeType: string;
  fileName: string;
  originalName: string;
  size: number;
};

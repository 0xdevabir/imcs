export type AppSection = 'chats' | 'calls' | 'contacts' | 'meetings' | 'settings';

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
  isEdited?: boolean;
  isDeleted?: boolean;
  createdAt: string;
  deliveredAt?: string | null;
  readAt?: string | null;
  receipts: Receipt[];
  reactions?: MessageReaction[];
  replyTo?: ReplyPreview | null;
  tempId?: string;
};

export type UserStatus = 'available' | 'dnd' | 'invisible';

export type OnlineUser = {
  userId: number;
  username: string;
  status: UserStatus;
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
  isGroupCall?: boolean;
};

export type CallPeer = {
  userId: number;
  username: string;
  stream: MediaStream | null;
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

export type CallHistoryItem = {
  id: string;
  peerUserId: number;
  peerUsername: string;
  callType: 'voice' | 'video';
  callStatus: 'missed' | 'completed' | 'incoming' | 'outgoing';
  duration: number;
  createdAt: string;
};

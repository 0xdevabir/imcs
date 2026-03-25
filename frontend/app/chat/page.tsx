'use client';

import { FormEvent, TouchEvent, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { io, Socket } from 'socket.io-client';
import { API_URL } from '@/lib/config';
import { CallUI } from '@/components/messaging/CallUI';
import { ChatList } from '@/components/messaging/ChatList';
import { ChatWindow } from '@/components/messaging/ChatWindow';
import { Sidebar } from '@/components/messaging/Sidebar';
import {
  AppSection,
  ChatMessage,
  GroupParticipant,
  GroupSummary,
  IncomingCall,
  OnlineUser,
  Profile,
  RoomItem,
  UploadedFileResponse,
} from '@/components/messaging/types';

const FILE_MESSAGE_PREFIX = '__FILE__:';
const CLIENT_MAX_FILE_BYTES = 10 * 1024 * 1024;
const RTC_CONFIG: RTCConfiguration = { iceServers: [] };

function encodeAttachmentMessage(file: UploadedFileResponse): string {
  return `${FILE_MESSAGE_PREFIX}${JSON.stringify({ kind: 'file', ...file })}`;
}

function summarizeMessage(content: string): string {
  if (content.startsWith(FILE_MESSAGE_PREFIX)) {
    try {
      const parsed = JSON.parse(content.slice(FILE_MESSAGE_PREFIX.length)) as { originalName?: string };
      return `File: ${parsed.originalName ?? 'Attachment'}`;
    } catch {
      return 'Attachment';
    }
  }

  return content;
}

export default function ChatPage() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [status, setStatus] = useState('Checking secure session...');

  const [darkMode, setDarkMode] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [activeSection, setActiveSection] = useState<AppSection>('chats');
  const [mobileSection, setMobileSection] = useState<AppSection>('chats');
  const [mobileChatOpen, setMobileChatOpen] = useState(false);

  const [searchQuery, setSearchQuery] = useState('');
  const [pinnedRoomKeys, setPinnedRoomKeys] = useState<string[]>(['general']);

  const [rooms, setRooms] = useState<RoomItem[]>([]);
  const [groups, setGroups] = useState<GroupSummary[]>([]);
  const [activeRoomKey, setActiveRoomKey] = useState('general');

  const [participants, setParticipants] = useState<GroupParticipant[]>([]);
  const [canManageMembers, setCanManageMembers] = useState(false);
  const [memberUsernameInput, setMemberUsernameInput] = useState('');

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState('');
  const [replyTo, setReplyTo] = useState<ChatMessage | null>(null);
  const [editingMessage, setEditingMessage] = useState<ChatMessage | null>(null);
  const [typingUsers, setTypingUsers] = useState<Record<number, string>>({});

  const [isCreateGroupModalOpen, setIsCreateGroupModalOpen] = useState(false);
  const [newGroupKey, setNewGroupKey] = useState('');
  const [newGroupName, setNewGroupName] = useState('');
  const [newGroupUsers, setNewGroupUsers] = useState('');

  const [onlineUsers, setOnlineUsers] = useState<OnlineUser[]>([]);

  const [uploadState, setUploadState] = useState<'idle' | 'uploading'>('idle');
  const [uploadProgress, setUploadProgress] = useState(0);

  const [callTargetUserId, setCallTargetUserId] = useState('');
  const [incomingCall, setIncomingCall] = useState<IncomingCall | null>(null);
  const [activeCallUserId, setActiveCallUserId] = useState<number | null>(null);
  const [activeCallType, setActiveCallType] = useState<'voice' | 'video'>('video');
  const [callStatus, setCallStatus] = useState('idle');
  const [callStartedAt, setCallStartedAt] = useState<number | null>(null);
  const [callTicker, setCallTicker] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [isCameraOff, setIsCameraOff] = useState(false);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [participantsPanelOpen, setParticipantsPanelOpen] = useState(false);

  const socketRef = useRef<Socket | null>(null);
  const activeRoomRef = useRef('general');
  const typingDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const typingClearTimersRef = useRef<Record<number, ReturnType<typeof setTimeout>>>({});
  const messageEndRef = useRef<HTMLDivElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const touchStartX = useRef<number | null>(null);
  const peerRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const remoteStreamRef = useRef<MediaStream | null>(null);
  const pendingCandidatesRef = useRef<RTCIceCandidateInit[]>([]);
  const localVideoRef = useRef<HTMLVideoElement | null>(null);
  const remoteVideoRef = useRef<HTMLVideoElement | null>(null);
  const activeCallTypeRef = useRef<'voice' | 'video'>('video');
  const cameraTrackRef = useRef<MediaStreamTrack | null>(null);

  const unreadTotal = useMemo(() => rooms.reduce((sum, room) => sum + room.unread, 0), [rooms]);

  const callDurationLabel = useMemo(() => {
    if (!callStartedAt) {
      return '00:00';
    }

    const seconds = Math.max(0, Math.floor((Date.now() - callStartedAt) / 1000));
    const mins = String(Math.floor(seconds / 60)).padStart(2, '0');
    const secs = String(seconds % 60).padStart(2, '0');
    return `${mins}:${secs}`;
  }, [callStartedAt, callStatus, callTicker]);

  useEffect(() => {
    if (!callStartedAt) {
      return;
    }

    const timer = setInterval(() => {
      setCallTicker((value) => value + 1);
    }, 1000);

    return () => clearInterval(timer);
  }, [callStartedAt]);

  const typingIndicator = useMemo(() => {
    const values = Object.values(typingUsers);
    if (values.length === 0) return '';
    return `${values.join(', ')} typing...`;
  }, [typingUsers]);

  const activeRoomName = useMemo(() => {
    const room = rooms.find((item) => item.key === activeRoomKey);
    return room?.name ?? activeRoomKey;
  }, [rooms, activeRoomKey]);

  const mentionCandidates = useMemo(() => {
    const mentionMatch = draft.match(/@([a-zA-Z0-9_]*)$/);
    if (!mentionMatch) {
      return [];
    }

    const query = mentionMatch[1].toLowerCase();
    return participants
      .filter((participant) => participant.username.toLowerCase().includes(query))
      .slice(0, 6);
  }, [draft, participants]);

  const canSend = useMemo(() => draft.trim().length > 0 && activeRoomKey.trim().length > 0, [draft, activeRoomKey]);

  useEffect(() => {
    const loadProfile = async () => {
      const response = await fetch(`${API_URL}/auth/profile`, { credentials: 'include' });
      if (!response.ok) {
        setStatus('Please sign in first.');
        return;
      }

      const profileData = (await response.json()) as Profile;
      setProfile(profileData);
      setStatus('Secure session active.');
    };

    loadProfile().catch(() => setStatus('Unable to verify profile'));
  }, []);

  useEffect(() => {
    activeRoomRef.current = activeRoomKey;
  }, [activeRoomKey]);

  useEffect(() => {
    activeCallTypeRef.current = activeCallType;
  }, [activeCallType]);

  useEffect(() => {
    messageEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, activeRoomKey, typingIndicator]);

  useEffect(() => {
    if (!profile) {
      return;
    }

    const loadGroups = async () => {
      const mineResponse = await fetch(`${API_URL}/groups/mine`, { credentials: 'include' });
      if (!mineResponse.ok) {
        return;
      }

      let mineData = (await mineResponse.json()) as GroupSummary[];
      if (mineData.length === 0) {
        await fetch(`${API_URL}/groups`, {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ key: 'general', name: 'General' }),
        });

        const afterCreate = await fetch(`${API_URL}/groups/mine`, { credentials: 'include' });
        if (afterCreate.ok) {
          mineData = (await afterCreate.json()) as GroupSummary[];
        }
      }

      setGroups(mineData);
      setRooms((prev) =>
        mineData.map((group) => {
          const existing = prev.find((room) => room.key === group.key);
          return {
            key: group.key,
            name: group.name || group.key,
            unread: existing?.unread ?? 0,
            lastMessage: existing?.lastMessage ?? 'No messages yet',
            lastAt: existing?.lastAt,
          };
        }),
      );

      const selected = mineData.some((group) => group.key === activeRoomRef.current)
        ? activeRoomRef.current
        : mineData[0]?.key ?? 'general';

      setActiveRoomKey(selected);
      activeRoomRef.current = selected;
      socketRef.current?.emit('join_room', { roomKey: selected });
    };

    loadGroups().catch(() => undefined);
  }, [profile]);

  useEffect(() => {
    if (!profile || !activeRoomKey) {
      return;
    }

    const loadParticipants = async () => {
      const response = await fetch(`${API_URL}/groups/${activeRoomKey}/participants`, {
        credentials: 'include',
      });

      if (!response.ok) {
        setParticipants([]);
        setCanManageMembers(false);
        return;
      }

      const payload = (await response.json()) as {
        participants: GroupParticipant[];
        canManageMembers: boolean;
      };
      setParticipants(payload.participants);
      setCanManageMembers(payload.canManageMembers);
    };

    loadParticipants().catch(() => undefined);
  }, [profile, activeRoomKey]);

  const cleanupCall = () => {
    if (peerRef.current) {
      peerRef.current.ontrack = null;
      peerRef.current.onicecandidate = null;
      peerRef.current.close();
      peerRef.current = null;
    }

    if (localStreamRef.current) {
      for (const track of localStreamRef.current.getTracks()) {
        track.stop();
      }
      localStreamRef.current = null;
    }

    if (remoteStreamRef.current) {
      for (const track of remoteStreamRef.current.getTracks()) {
        track.stop();
      }
      remoteStreamRef.current = null;
    }

    if (localVideoRef.current) {
      localVideoRef.current.srcObject = null;
    }
    if (remoteVideoRef.current) {
      remoteVideoRef.current.srcObject = null;
    }

    pendingCandidatesRef.current = [];
    setActiveCallUserId(null);
    setIncomingCall(null);
    setCallStatus('idle');
    setCallStartedAt(null);
    setIsMuted(false);
    setIsCameraOff(false);
    setIsScreenSharing(false);
  };

  const ensureLocalStream = async (type: 'voice' | 'video') => {
    if (!localStreamRef.current) {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: type === 'video' });
      localStreamRef.current = stream;
      cameraTrackRef.current = stream.getVideoTracks()[0] ?? null;
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }
    }

    return localStreamRef.current;
  };

  const ensurePeer = (targetUserId: number) => {
    if (peerRef.current) {
      return peerRef.current;
    }

    const peer = new RTCPeerConnection(RTC_CONFIG);
    remoteStreamRef.current = new MediaStream();

    peer.ontrack = (event) => {
      if (!remoteStreamRef.current) {
        remoteStreamRef.current = new MediaStream();
      }

      for (const track of event.streams[0].getTracks()) {
        remoteStreamRef.current.addTrack(track);
      }

      if (remoteVideoRef.current) {
        remoteVideoRef.current.srcObject = remoteStreamRef.current;
      }
    };

    peer.onicecandidate = (event) => {
      if (!event.candidate) {
        return;
      }

      socketRef.current?.emit('ice_candidate', {
        targetUserId,
        candidate: event.candidate.toJSON(),
      });
    };

    if (localStreamRef.current) {
      for (const track of localStreamRef.current.getTracks()) {
        peer.addTrack(track, localStreamRef.current);
      }
    }

    peerRef.current = peer;
    return peer;
  };

  useEffect(() => {
    if (!profile) {
      return;
    }

    const socket = io(API_URL, {
      transports: ['websocket'],
      withCredentials: true,
    });

    socketRef.current = socket;

    socket.on('connected', () => {
      setStatus('Connected with encrypted channel.');
      socket.emit('join_room', { roomKey: activeRoomRef.current });
    });

    socket.on('online_users', (payload: { users?: OnlineUser[] }) => {
      const users = Array.isArray(payload.users) ? payload.users : [];
      setOnlineUsers(users.filter((item) => item.userId !== profile.userId));
    });

    socket.on('room_joined', (payload: { room: { key: string; name?: string }; messages: ChatMessage[] }) => {
      setActiveRoomKey(payload.room.key);
      setMessages(payload.messages);
      setTypingUsers({});
      setStatus(`Connected to ${payload.room.name ?? payload.room.key}`);

      setRooms((prev) => {
        const current = prev.find((room) => room.key === payload.room.key);
        const next: RoomItem = {
          key: payload.room.key,
          name: payload.room.name || current?.name || payload.room.key,
          unread: 0,
          lastMessage:
            payload.messages.length > 0
              ? summarizeMessage(payload.messages[payload.messages.length - 1].content)
              : current?.lastMessage ?? 'No messages yet',
          lastAt:
            payload.messages.length > 0
              ? payload.messages[payload.messages.length - 1].createdAt
              : current?.lastAt,
        };
        return [next, ...prev.filter((room) => room.key !== payload.room.key)];
      });
    });

    socket.on('receive_message', (message: ChatMessage) => {
      setMessages((prev) => {
        if (prev.some((item) => item.id === message.id)) {
          return prev;
        }
        return [...prev, message];
      });

      setRooms((prev) => {
        const current = prev.find((room) => room.key === message.roomKey);
        const nextRoom: RoomItem = {
          key: message.roomKey,
          name: current?.name ?? message.roomKey,
          unread:
            message.roomKey === activeRoomRef.current || message.sender.userId === profile.userId
              ? 0
              : (current?.unread ?? 0) + 1,
          lastMessage: summarizeMessage(message.content),
          lastAt: message.createdAt,
        };

        return [nextRoom, ...prev.filter((room) => room.key !== message.roomKey)];
      });

      if (message.sender.userId !== profile.userId) {
        socket.emit('read_receipt', { messageId: message.id, status: 'DELIVERED' });
        setTimeout(() => {
          socket.emit('read_receipt', { messageId: message.id, status: 'READ' });
        }, 350);
      }
    });

    socket.on('typing', (payload: { roomKey: string; isTyping: boolean; user: { userId: number; username: string } }) => {
      if (payload.roomKey !== activeRoomRef.current || payload.user.userId === profile.userId) {
        return;
      }

      setTypingUsers((current) => {
        const next = { ...current };
        if (payload.isTyping) {
          next[payload.user.userId] = payload.user.username;
        } else {
          delete next[payload.user.userId];
        }
        return next;
      });

      if (typingClearTimersRef.current[payload.user.userId]) {
        clearTimeout(typingClearTimersRef.current[payload.user.userId]);
      }

      typingClearTimersRef.current[payload.user.userId] = setTimeout(() => {
        setTypingUsers((current) => {
          const next = { ...current };
          delete next[payload.user.userId];
          return next;
        });
      }, 1200);
    });

    socket.on('read_receipt', (payload: { messageId: string; userId: number; status: 'DELIVERED' | 'READ'; username: string }) => {
      setMessages((prev) =>
        prev.map((message) => {
          if (message.id !== payload.messageId) {
            return message;
          }

          const exists = message.receipts.some(
            (receipt) => receipt.userId === payload.userId && receipt.status === payload.status,
          );
          if (exists) {
            return message;
          }

          return {
            ...message,
            receipts: [...message.receipts, payload],
          };
        }),
      );
    });

    socket.on('reaction_update', (payload: { messageId: string; reactions: ChatMessage['reactions'] }) => {
      setMessages((prev) => prev.map((item) => (item.id === payload.messageId ? { ...item, reactions: payload.reactions ?? [] } : item)));
    });

    socket.on('receive_call', (payload: IncomingCall) => {
      setIncomingCall(payload);
      setCallStatus(`Incoming ${payload.callType} call`);
      setActiveCallType(payload.callType);
    });

    socket.on('accept_call', async (payload: { fromUserId: number }) => {
      setActiveCallUserId(payload.fromUserId);
      setCallStatus('Call accepted. Negotiating...');

      try {
        await ensureLocalStream(activeCallTypeRef.current);
        const peer = ensurePeer(payload.fromUserId);
        const offer = await peer.createOffer();
        await peer.setLocalDescription(offer);
        socket.emit('offer', { targetUserId: payload.fromUserId, sdp: offer });
      } catch {
        setCallStatus('Could not start call media');
      }
    });

    socket.on('reject_call', (payload: { reason?: string }) => {
      cleanupCall();
      setCallStatus(payload.reason ?? 'Call ended');
    });

    socket.on('offer', async (payload: { fromUserId: number; sdp: RTCSessionDescriptionInit }) => {
      setActiveCallUserId(payload.fromUserId);
      setCallStatus('Connecting...');

      try {
        await ensureLocalStream(activeCallTypeRef.current);
        const peer = ensurePeer(payload.fromUserId);
        await peer.setRemoteDescription(new RTCSessionDescription(payload.sdp));

        for (const candidate of pendingCandidatesRef.current) {
          await peer.addIceCandidate(new RTCIceCandidate(candidate));
        }
        pendingCandidatesRef.current = [];

        const answer = await peer.createAnswer();
        await peer.setLocalDescription(answer);
        socket.emit('answer', { targetUserId: payload.fromUserId, sdp: answer });
        setCallStatus('In call');
        setCallStartedAt(Date.now());
      } catch {
        setCallStatus('Failed to answer call');
      }
    });

    socket.on('answer', async (payload: { sdp: RTCSessionDescriptionInit }) => {
      if (!peerRef.current) {
        return;
      }

      try {
        await peerRef.current.setRemoteDescription(new RTCSessionDescription(payload.sdp));
        setCallStatus('In call');
        setCallStartedAt(Date.now());
      } catch {
        setCallStatus('Failed to finalize call');
      }
    });

    socket.on('ice_candidate', async (payload: { candidate: RTCIceCandidateInit }) => {
      if (peerRef.current?.remoteDescription) {
        try {
          await peerRef.current.addIceCandidate(new RTCIceCandidate(payload.candidate));
        } catch {
          setStatus('Failed to process ICE candidate');
        }
      } else {
        pendingCandidatesRef.current.push(payload.candidate);
      }
    });

    socket.on('error', (message: string) => {
      setStatus(message);
    });

    socket.on('disconnect', () => {
      setStatus('Disconnected');
      cleanupCall();
    });

    return () => {
      cleanupCall();
      socket.disconnect();
      socketRef.current = null;
    };
  }, [profile]);

  const openRoom = (roomKey: string) => {
    setActiveSection('chats');
    setMobileSection('chats');
    setMobileChatOpen(true);
    setActiveRoomKey(roomKey);
    setRooms((prev) => prev.map((room) => (room.key === roomKey ? { ...room, unread: 0 } : room)));
    socketRef.current?.emit('join_room', { roomKey });
  };

  const togglePin = (roomKey: string) => {
    setPinnedRoomKeys((prev) => (prev.includes(roomKey) ? prev.filter((item) => item !== roomKey) : [roomKey, ...prev]));
  };

  const createGroup = async () => {
    const key = newGroupKey.trim().toLowerCase();
    if (!key) {
      setStatus('Group key is required');
      return;
    }

    const participantUsernames = newGroupUsers
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean);

    const response = await fetch(`${API_URL}/groups`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ key, name: newGroupName.trim() || undefined, participantUsernames }),
    });

    if (!response.ok) {
      setStatus('Could not create group');
      return;
    }

    setIsCreateGroupModalOpen(false);
    setNewGroupKey('');
    setNewGroupName('');
    setNewGroupUsers('');
    setStatus(`Group ${key} created`);

    const mineResponse = await fetch(`${API_URL}/groups/mine`, { credentials: 'include' });
    if (mineResponse.ok) {
      const mineData = (await mineResponse.json()) as GroupSummary[];
      setGroups(mineData);
      setRooms(
        mineData.map((group) => ({
          key: group.key,
          name: group.name || group.key,
          unread: 0,
          lastMessage: 'No messages yet',
        })),
      );
    }

    openRoom(key);
  };

  const addMember = async () => {
    const username = memberUsernameInput.trim();
    if (!username) {
      return;
    }

    const response = await fetch(`${API_URL}/groups/${activeRoomKey}/users`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username }),
    });

    if (!response.ok) {
      setStatus('Could not add member');
      return;
    }

    const payload = (await response.json()) as { participants: GroupParticipant[]; canManageMembers: boolean };
    setParticipants(payload.participants);
    setCanManageMembers(payload.canManageMembers);
    setMemberUsernameInput('');
  };

  const removeMember = async (username: string) => {
    const response = await fetch(`${API_URL}/groups/${activeRoomKey}/users/${username}`, {
      method: 'DELETE',
      credentials: 'include',
    });

    if (!response.ok) {
      setStatus('Could not remove member');
      return;
    }

    const payload = (await response.json()) as { participants: GroupParticipant[]; canManageMembers: boolean };
    setParticipants(payload.participants);
    setCanManageMembers(payload.canManageMembers);
  };

  const sendMessage = (event: FormEvent) => {
    event.preventDefault();
    if (!canSend || !socketRef.current) {
      return;
    }

    if (editingMessage) {
      setMessages((prev) =>
        prev.map((message) =>
          message.id === editingMessage.id
            ? { ...message, content: draft.trim(), editedLocal: true }
            : message,
        ),
      );
      setEditingMessage(null);
      setDraft('');
      return;
    }

    socketRef.current.emit('send_message', {
      roomKey: activeRoomKey,
      content: draft,
      replyToMessageId: replyTo?.id,
    });

    setDraft('');
    setReplyTo(null);
    socketRef.current.emit('typing', { roomKey: activeRoomKey, isTyping: false });
  };

  const handleDraftChange = (value: string) => {
    setDraft(value);
    if (!socketRef.current) {
      return;
    }

    socketRef.current.emit('typing', { roomKey: activeRoomKey, isTyping: true });
    if (typingDebounceRef.current) {
      clearTimeout(typingDebounceRef.current);
    }

    typingDebounceRef.current = setTimeout(() => {
      socketRef.current?.emit('typing', { roomKey: activeRoomKey, isTyping: false });
    }, 650);
  };

  const handleMentionInsert = (username: string) => {
    setDraft((current) => current.replace(/@([a-zA-Z0-9_]*)$/, `@${username} `));
  };

  const uploadFile = async (file: File) => {
    if (!socketRef.current) {
      setStatus('Socket unavailable');
      return;
    }

    if (file.size > CLIENT_MAX_FILE_BYTES) {
      setStatus('File exceeds 10MB');
      return;
    }

    if (!(file.type.startsWith('image/') || file.type.startsWith('video/') || file.type === 'application/pdf')) {
      setStatus('Only image, video, and PDF are allowed');
      return;
    }

    const formData = new FormData();
    formData.append('file', file);
    setUploadState('uploading');
    setUploadProgress(15);

    try {
      const response = await fetch(`${API_URL}/files/upload`, {
        method: 'POST',
        credentials: 'include',
        body: formData,
      });

      setUploadProgress(85);

      if (!response.ok) {
        setStatus('Upload failed');
        return;
      }

      const uploaded = (await response.json()) as UploadedFileResponse;
      socketRef.current.emit('send_message', {
        roomKey: activeRoomKey,
        content: encodeAttachmentMessage(uploaded),
      });
      setUploadProgress(100);
    } catch {
      setStatus('Upload failed');
    } finally {
      setTimeout(() => {
        setUploadState('idle');
        setUploadProgress(0);
      }, 250);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const onReact = (messageId: string, emoji: string) => {
    socketRef.current?.emit('add_reaction', { messageId, emoji });
  };

  const onReply = (message: ChatMessage) => {
    setReplyTo(message);
    setEditingMessage(null);
  };

  const onStartEdit = (message: ChatMessage) => {
    setEditingMessage(message);
    setReplyTo(null);
    setDraft(message.content);
  };

  const onDelete = (message: ChatMessage) => {
    setMessages((prev) =>
      prev.map((item) =>
        item.id === message.id
          ? { ...item, content: 'Message deleted', deletedLocal: true }
          : item,
      ),
    );
  };

  const startCall = async (type: 'voice' | 'video', targetOverride?: number) => {
    if (!socketRef.current) {
      setCallStatus('Socket not connected');
      return;
    }

    const targetUserId = targetOverride ?? Number(callTargetUserId);
    if (!Number.isInteger(targetUserId) || targetUserId <= 0) {
      setCallStatus('Select a valid target user');
      return;
    }

    cleanupCall();
    setActiveCallType(type);
    activeCallTypeRef.current = type;

    try {
      await ensureLocalStream(type);
      setActiveCallUserId(targetUserId);
      socketRef.current.emit('call_user', {
        targetUserId,
        roomKey: activeRoomKey,
        callType: type,
      });
      setCallStatus(`Calling user ${targetUserId}`);
    } catch {
      setCallStatus('Could not access media devices');
    }
  };

  const acceptCall = async () => {
    if (!incomingCall || !socketRef.current) {
      return;
    }

    try {
      await ensureLocalStream(incomingCall.callType);
      setActiveCallType(incomingCall.callType);
      activeCallTypeRef.current = incomingCall.callType;
      setActiveCallUserId(incomingCall.fromUserId);
      socketRef.current.emit('accept_call', { targetUserId: incomingCall.fromUserId });
      setCallStatus('Accepted. Waiting for stream...');
      setIncomingCall(null);
    } catch {
      setCallStatus('Could not access media');
    }
  };

  const rejectCall = () => {
    if (!incomingCall || !socketRef.current) {
      return;
    }

    socketRef.current.emit('reject_call', {
      targetUserId: incomingCall.fromUserId,
      reason: 'Call rejected',
    });
    setIncomingCall(null);
    setCallStatus('Call rejected');
  };

  const endCall = () => {
    if (socketRef.current && activeCallUserId) {
      socketRef.current.emit('reject_call', {
        targetUserId: activeCallUserId,
        reason: 'Call ended',
      });
    }

    cleanupCall();
    setCallStatus('Call ended');
  };

  const toggleMute = () => {
    if (!localStreamRef.current) {
      return;
    }

    const next = !isMuted;
    localStreamRef.current.getAudioTracks().forEach((track) => {
      track.enabled = !next;
    });
    setIsMuted(next);
  };

  const toggleCamera = () => {
    if (!localStreamRef.current) {
      return;
    }

    const next = !isCameraOff;
    localStreamRef.current.getVideoTracks().forEach((track) => {
      track.enabled = !next;
    });
    setIsCameraOff(next);
  };

  const toggleScreenShare = async () => {
    if (!peerRef.current || !localStreamRef.current) {
      return;
    }

    try {
      if (!isScreenSharing) {
        const displayStream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: false });
        const displayTrack = displayStream.getVideoTracks()[0];
        const sender = peerRef.current.getSenders().find((item) => item.track?.kind === 'video');
        await sender?.replaceTrack(displayTrack);

        if (localVideoRef.current) {
          localVideoRef.current.srcObject = displayStream;
        }

        displayTrack.onended = async () => {
          const fallback = cameraTrackRef.current;
          if (fallback) {
            await sender?.replaceTrack(fallback);
            if (localStreamRef.current && localVideoRef.current) {
              localVideoRef.current.srcObject = localStreamRef.current;
            }
          }
          setIsScreenSharing(false);
        };

        setIsScreenSharing(true);
      } else {
        const sender = peerRef.current.getSenders().find((item) => item.track?.kind === 'video');
        const fallback = cameraTrackRef.current;
        if (fallback) {
          await sender?.replaceTrack(fallback);
        }
        if (localStreamRef.current && localVideoRef.current) {
          localVideoRef.current.srcObject = localStreamRef.current;
        }
        setIsScreenSharing(false);
      }
    } catch {
      setStatus('Screen share unavailable');
    }
  };

  const roleBadgeClass = (role: GroupParticipant['role']) => {
    if (role === 'owner') return 'bg-amber-100 text-amber-800';
    if (role === 'admin') return 'bg-indigo-100 text-indigo-800';
    return 'bg-slate-100 text-slate-700';
  };

  const handleTouchStart = (event: TouchEvent) => {
    touchStartX.current = event.touches[0]?.clientX ?? null;
  };

  const handleTouchEnd = (event: TouchEvent) => {
    const start = touchStartX.current;
    if (start === null) {
      return;
    }

    const endX = event.changedTouches[0]?.clientX ?? start;
    const delta = endX - start;
    if (delta > 65) {
      setMobileChatOpen(false);
    }
    touchStartX.current = null;
  };

  if (!profile) {
    return (
      <main className="mx-auto flex min-h-screen max-w-xl flex-col justify-center gap-4 px-6">
        <h1 className="text-3xl font-bold">Secure Messaging</h1>
        <p className="text-sm text-slate-600">{status}</p>
        <Link href="/login" className="w-fit rounded-md bg-slate-900 px-4 py-2 text-white hover:bg-slate-700">
          Go to Login
        </Link>
      </main>
    );
  }

  return (
    <main className={`${darkMode ? 'dark' : ''}`}>
      <div className={`h-screen w-full ${darkMode ? 'bg-slate-950 text-slate-100' : 'bg-slate-100 text-slate-900'}`}>
        <div className="mx-auto flex h-full max-w-[1700px] px-2 py-2 md:px-4 md:py-4">
          <Sidebar
            collapsed={sidebarCollapsed}
            activeSection={activeSection}
            unreadCount={unreadTotal}
            onToggleCollapsed={() => setSidebarCollapsed((current) => !current)}
            onSelectSection={setActiveSection}
            darkMode={darkMode}
            onToggleDarkMode={() => setDarkMode((current) => !current)}
          />

          <div className="hidden h-full w-[380px] md:block">
            <ChatList
              rooms={rooms}
              activeRoomKey={activeRoomKey}
              searchQuery={searchQuery}
              onSearchQueryChange={setSearchQuery}
              onOpenRoom={openRoom}
              pinnedRoomKeys={pinnedRoomKeys}
              onTogglePin={togglePin}
              onOpenCreateGroup={() => setIsCreateGroupModalOpen(true)}
              darkMode={darkMode}
            />
          </div>

          <div className="flex h-full flex-1 flex-col overflow-hidden rounded-3xl md:ml-3" onTouchStart={handleTouchStart} onTouchEnd={handleTouchEnd}>
            {activeSection !== 'chats' ? (
              <section className="grid h-full place-items-center">
                <div className={`rounded-3xl border p-10 text-center shadow-[0_18px_44px_rgba(15,23,42,0.18)] ${darkMode ? 'border-slate-800 bg-slate-900' : 'border-slate-200 bg-white'}`}>
                  <p className="mb-2 text-xl font-semibold capitalize tracking-tight">{activeSection}</p>
                  <p className="text-sm text-slate-500">Enterprise module view is ready for expansion.</p>
                </div>
              </section>
            ) : (
              <>
                <div className="md:hidden">
                  {!mobileChatOpen ? (
                    <ChatList
                      rooms={rooms}
                      activeRoomKey={activeRoomKey}
                      searchQuery={searchQuery}
                      onSearchQueryChange={setSearchQuery}
                      onOpenRoom={(roomKey) => {
                        openRoom(roomKey);
                        setMobileChatOpen(true);
                      }}
                      pinnedRoomKeys={pinnedRoomKeys}
                      onTogglePin={togglePin}
                      onOpenCreateGroup={() => setIsCreateGroupModalOpen(true)}
                      darkMode={darkMode}
                    />
                  ) : null}
                </div>

                <div className={`${mobileChatOpen ? 'flex' : 'hidden'} h-full flex-1 flex-col md:flex`}>
                  <ChatWindow
                    profile={profile}
                    roomTitle={activeRoomName}
                    roomStatus={status}
                    darkMode={darkMode}
                    messages={messages}
                    participants={participants}
                    typingIndicator={typingIndicator}
                    messageEndRef={messageEndRef}
                    onReact={onReact}
                    onReply={onReply}
                    onStartEdit={onStartEdit}
                    onDelete={onDelete}
                    headerActions={
                      <>
                        <span className="rounded-full bg-emerald-500/10 px-2 py-1 text-[10px] font-semibold text-emerald-600">
                          E2E Encrypted
                        </span>
                        <input
                          value={callTargetUserId}
                          onChange={(event) => setCallTargetUserId(event.target.value)}
                          className={`focus-ring hidden rounded-lg border px-2 py-1.5 text-xs outline-none md:block ${
                            darkMode ? 'border-slate-700 bg-slate-900 text-slate-100' : 'border-slate-300 bg-white text-slate-800'
                          }`}
                          placeholder="User ID"
                        />
                        <button
                          type="button"
                          onClick={() => startCall('voice')}
                          className="btn-press rounded-lg border border-slate-300 px-2.5 py-1.5 text-xs font-semibold hover:bg-slate-100 hover:text-slate-900"
                        >
                          Voice
                        </button>
                        <button
                          type="button"
                          onClick={() => startCall('video')}
                          className="btn-press rounded-lg border border-slate-300 px-2.5 py-1.5 text-xs font-semibold hover:bg-slate-100 hover:text-slate-900"
                        >
                          Video
                        </button>
                        {profile.role === 'admin' ? (
                          <Link href="/admin" className="btn-press rounded-lg border border-slate-300 px-2.5 py-1.5 text-xs font-semibold hover:bg-slate-100 hover:text-slate-900">
                            Admin
                          </Link>
                        ) : null}
                      </>
                    }
                    composer={
                      <div>
                        {replyTo ? (
                          <div className={`mb-2 flex items-center justify-between rounded-xl border px-3 py-2 text-xs ${darkMode ? 'border-slate-700 bg-slate-900 text-slate-200' : 'border-slate-200 bg-white text-slate-700'}`}>
                            <p>
                              Replying to <span className="font-semibold">{replyTo.sender.username}</span>
                            </p>
                            <button type="button" onClick={() => setReplyTo(null)} className="text-slate-500 hover:text-slate-300">
                              Cancel
                            </button>
                          </div>
                        ) : null}

                        {editingMessage ? (
                          <div className={`mb-2 flex items-center justify-between rounded-xl border px-3 py-2 text-xs ${darkMode ? 'border-indigo-500/40 bg-indigo-500/10 text-indigo-100' : 'border-indigo-200 bg-indigo-50 text-indigo-700'}`}>
                            <p>Editing message</p>
                            <button type="button" onClick={() => { setEditingMessage(null); setDraft(''); }}>
                              Cancel
                            </button>
                          </div>
                        ) : null}

                        <form className="flex items-end gap-2" onSubmit={sendMessage}>
                          <input
                            ref={fileInputRef}
                            type="file"
                            className="hidden"
                            accept="image/*,video/*,application/pdf"
                            onChange={(event) => {
                              const file = event.target.files?.[0];
                              if (file) uploadFile(file);
                            }}
                          />

                          <button
                            type="button"
                            onClick={() => fileInputRef.current?.click()}
                            className={`btn-press rounded-2xl border px-3 py-2 text-sm font-semibold ${
                              darkMode ? 'border-slate-700 bg-slate-900 text-slate-200' : 'border-slate-300 bg-white text-slate-700'
                            }`}
                          >
                            Attach
                          </button>

                          <button
                            type="button"
                            onClick={() => setDraft((current) => `${current} 😊`)}
                            className={`btn-press rounded-2xl border px-3 py-2 text-sm font-semibold ${
                              darkMode ? 'border-slate-700 bg-slate-900 text-slate-200' : 'border-slate-300 bg-white text-slate-700'
                            }`}
                          >
                            Emoji
                          </button>

                          <div className="relative w-full">
                            <input
                              value={draft}
                              onChange={(event) => handleDraftChange(event.target.value)}
                              placeholder="Type a secure message..."
                              className={`focus-ring w-full rounded-2xl border px-4 py-2.5 text-sm outline-none ${
                                darkMode
                                  ? 'border-slate-700 bg-slate-900 text-slate-100 placeholder:text-slate-500 focus:border-indigo-400'
                                  : 'border-slate-300 bg-white text-slate-800 placeholder:text-slate-400 focus:border-indigo-500'
                              }`}
                            />

                            {mentionCandidates.length > 0 ? (
                              <div className={`absolute bottom-12 left-0 w-60 rounded-xl border shadow-2xl ${darkMode ? 'border-slate-700 bg-slate-900' : 'border-slate-200 bg-white'}`}>
                                {mentionCandidates.map((candidate) => (
                                  <button
                                    key={candidate.userId}
                                    type="button"
                                    onClick={() => handleMentionInsert(candidate.username)}
                                    className={`block w-full px-3 py-2 text-left text-xs font-semibold ${darkMode ? 'hover:bg-slate-800' : 'hover:bg-slate-100'}`}
                                  >
                                    @{candidate.username}
                                  </button>
                                ))}
                              </div>
                            ) : null}
                          </div>

                          <button
                            type="submit"
                            disabled={!canSend}
                            className="btn-press rounded-2xl bg-gradient-to-r from-indigo-600 to-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-[0_12px_26px_rgba(37,99,235,0.32)] hover:from-indigo-500 hover:to-blue-500 disabled:bg-slate-400 disabled:shadow-none"
                          >
                            Send
                          </button>
                        </form>

                        {uploadState === 'uploading' ? (
                          <div className={`mt-2 h-1.5 w-full overflow-hidden rounded-full ${darkMode ? 'bg-slate-800' : 'bg-slate-200'}`}>
                            <div
                              className="h-full rounded-full bg-indigo-500 transition-all duration-300"
                              style={{ width: `${uploadProgress}%` }}
                            />
                          </div>
                        ) : null}
                      </div>
                    }
                  />
                </div>

                <div className={`hidden border-l px-4 py-4 xl:block ${darkMode ? 'border-slate-800 bg-slate-900/90' : 'border-slate-200 bg-white/90'} backdrop-blur-xl`}>
                  <p className="mb-3 text-xs font-semibold uppercase tracking-[0.08em] text-slate-400">Participants</p>
                  <div className="space-y-2">
                    {participants.map((participant) => (
                      <div key={participant.userId} className={`surface-card-hover flex items-center justify-between rounded-xl border px-3 py-2 ${darkMode ? 'border-slate-800 bg-slate-950/80' : 'border-slate-200 bg-slate-50/90'}`}>
                        <div>
                          <p className="text-sm font-semibold">{participant.username}</p>
                          <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-semibold ${roleBadgeClass(participant.role)}`}>
                            {participant.role}
                          </span>
                        </div>
                        {canManageMembers && participant.role !== 'owner' && participant.username !== profile.username ? (
                          <button type="button" onClick={() => removeMember(participant.username)} className="text-xs text-rose-500">
                            Remove
                          </button>
                        ) : null}
                      </div>
                    ))}
                  </div>

                  {canManageMembers ? (
                    <div className="mt-3 flex gap-2">
                      <input
                        value={memberUsernameInput}
                        onChange={(event) => setMemberUsernameInput(event.target.value)}
                        placeholder="add username"
                        className={`focus-ring w-full rounded-lg border px-2.5 py-1.5 text-xs ${
                          darkMode ? 'border-slate-700 bg-slate-950 text-slate-100' : 'border-slate-300 bg-white text-slate-800'
                        }`}
                      />
                      <button type="button" onClick={addMember} className="btn-press rounded-lg bg-gradient-to-r from-indigo-600 to-blue-600 px-2.5 py-1.5 text-xs font-semibold text-white">
                        Add
                      </button>
                    </div>
                  ) : null}
                </div>

                <button
                  type="button"
                  onClick={() => startCall('voice')}
                  className="fixed bottom-20 right-4 z-20 rounded-full bg-gradient-to-r from-emerald-600 to-teal-500 px-4 py-3 text-xs font-semibold text-white shadow-[0_14px_28px_rgba(16,185,129,0.35)] md:hidden"
                >
                  Call
                </button>
              </>
            )}
          </div>
        </div>

        <div className={`fixed bottom-0 left-0 right-0 z-20 grid grid-cols-4 border-t backdrop-blur-xl md:hidden ${darkMode ? 'border-slate-800 bg-slate-950/95' : 'border-slate-200 bg-white/95'}`}>
          {(['chats', 'calls', 'contacts', 'settings'] as AppSection[]).map((section) => (
            <button
              key={section}
              type="button"
              onClick={() => {
                setMobileSection(section);
                setActiveSection(section);
                if (section !== 'chats') {
                  setMobileChatOpen(false);
                }
              }}
              className={`px-2 py-3 text-xs font-semibold capitalize transition ${
                mobileSection === section ? 'text-indigo-600' : 'text-slate-500'
              }`}
            >
              {section}
            </button>
          ))}
        </div>
      </div>

      <CallUI
        visible={Boolean(activeCallUserId || incomingCall)}
        callType={activeCallType}
        callStatus={callStatus}
        incomingCall={incomingCall}
        callDurationLabel={callDurationLabel}
        localVideoRef={localVideoRef}
        remoteVideoRef={remoteVideoRef}
        participantsOpen={participantsPanelOpen}
        participants={onlineUsers}
        activeSpeaker={remoteStreamRef.current ? 'remote' : 'local'}
        isMuted={isMuted}
        isCameraOff={isCameraOff}
        isScreenSharing={isScreenSharing}
        onAcceptCall={acceptCall}
        onRejectCall={rejectCall}
        onToggleMute={toggleMute}
        onToggleCamera={toggleCamera}
        onToggleScreenShare={toggleScreenShare}
        onToggleParticipants={() => setParticipantsPanelOpen((current) => !current)}
        onEndCall={endCall}
      />

      {isCreateGroupModalOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/45 p-4 backdrop-blur-sm">
          <div className={`w-full max-w-md rounded-2xl border p-5 shadow-[0_28px_60px_rgba(15,23,42,0.4)] ${darkMode ? 'border-slate-700 bg-slate-900 text-slate-100' : 'border-slate-200 bg-white text-slate-900'}`}>
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-bold">Create Group</h2>
              <button type="button" onClick={() => setIsCreateGroupModalOpen(false)} className="btn-press rounded-lg border border-slate-300 px-2.5 py-1.5 text-xs font-semibold">
                Close
              </button>
            </div>

            <div className="space-y-3">
              <input value={newGroupKey} onChange={(event) => setNewGroupKey(event.target.value)} placeholder="group key" className={`focus-ring w-full rounded-lg border px-3 py-2.5 text-sm ${darkMode ? 'border-slate-700 bg-slate-950 text-slate-100' : 'border-slate-300 bg-white text-slate-800'}`} />
              <input value={newGroupName} onChange={(event) => setNewGroupName(event.target.value)} placeholder="group name" className={`focus-ring w-full rounded-lg border px-3 py-2.5 text-sm ${darkMode ? 'border-slate-700 bg-slate-950 text-slate-100' : 'border-slate-300 bg-white text-slate-800'}`} />
              <input value={newGroupUsers} onChange={(event) => setNewGroupUsers(event.target.value)} placeholder="participants: user1,user2" className={`focus-ring w-full rounded-lg border px-3 py-2.5 text-sm ${darkMode ? 'border-slate-700 bg-slate-950 text-slate-100' : 'border-slate-300 bg-white text-slate-800'}`} />

              <button type="button" onClick={createGroup} className="btn-press w-full rounded-lg bg-gradient-to-r from-indigo-600 to-blue-600 px-3 py-2.5 text-sm font-semibold text-white shadow-[0_12px_30px_rgba(37,99,235,0.3)] hover:from-indigo-500 hover:to-blue-500">
                Create Group
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </main>
  );
}

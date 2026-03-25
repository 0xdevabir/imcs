'use client';

import { FormEvent, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { io, Socket } from 'socket.io-client';
import { API_URL } from '@/lib/config';

type Profile = {
  userId: number;
  username: string;
  role: 'admin' | 'user';
};

type Receipt = {
  id?: string;
  messageId?: string;
  userId: number;
  username: string;
  status: 'DELIVERED' | 'READ';
  createdAt?: string;
};

type ChatMessage = {
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
};

type UploadedFileResponse = {
  fileName: string;
  originalName: string;
  mimeType: string;
  size: number;
  url: string;
};

type AttachmentPayload = {
  kind: 'file';
  url: string;
  mimeType: string;
  fileName: string;
  originalName: string;
  size: number;
};

type IncomingCall = {
  fromUserId: number;
  fromUsername: string;
  roomKey: string;
  callType: 'voice' | 'video';
};

type OnlineUser = {
  userId: number;
  username: string;
};

type GroupParticipant = {
  userId: number;
  username: string;
  joinedAt: string;
  role: 'owner' | 'admin' | 'member';
};

type GroupSummary = {
  key: string;
  name: string;
  participantCount: number;
};

const FILE_MESSAGE_PREFIX = '__FILE__:';
const CLIENT_MAX_FILE_BYTES = 10 * 1024 * 1024;
const RTC_CONFIG: RTCConfiguration = {
  iceServers: [],
};

function encodeAttachmentMessage(file: UploadedFileResponse): string {
  const payload: AttachmentPayload = {
    kind: 'file',
    url: file.url,
    mimeType: file.mimeType,
    fileName: file.fileName,
    originalName: file.originalName,
    size: file.size,
  };

  return `${FILE_MESSAGE_PREFIX}${JSON.stringify(payload)}`;
}

function parseAttachmentMessage(content: string): AttachmentPayload | null {
  if (!content.startsWith(FILE_MESSAGE_PREFIX)) {
    return null;
  }

  const raw = content.slice(FILE_MESSAGE_PREFIX.length);
  try {
    const parsed = JSON.parse(raw) as AttachmentPayload;
    if (parsed?.kind !== 'file' || !parsed.url || !parsed.mimeType) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

function summarizeMessage(content: string): string {
  const attachment = parseAttachmentMessage(content);
  if (!attachment) {
    return content;
  }
  return `File: ${attachment.originalName}`;
}

type RoomItem = {
  key: string;
  name: string;
  unread: number;
  lastMessage: string;
  lastAt?: string;
};

export default function ChatPage() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [status, setStatus] = useState('Checking session...');
  const [roomKeyInput, setRoomKeyInput] = useState('general');
  const [newGroupKey, setNewGroupKey] = useState('');
  const [newGroupName, setNewGroupName] = useState('');
  const [newGroupUsers, setNewGroupUsers] = useState('');
  const [isCreateGroupModalOpen, setIsCreateGroupModalOpen] = useState(false);
  const [activeRoomKey, setActiveRoomKey] = useState('general');
  const [draft, setDraft] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [typingUsers, setTypingUsers] = useState<Record<number, string>>({});
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [uploadState, setUploadState] = useState<'idle' | 'uploading'>('idle');
  const [rooms, setRooms] = useState<RoomItem[]>([
    {
      key: 'general',
      name: 'General',
      unread: 0,
      lastMessage: 'Welcome to the room',
    },
  ]);

  const [callTargetUserId, setCallTargetUserId] = useState('');
  const [incomingCall, setIncomingCall] = useState<IncomingCall | null>(null);
  const [callStatus, setCallStatus] = useState('idle');
  const [activeCallUserId, setActiveCallUserId] = useState<number | null>(null);
  const [activeCallType, setActiveCallType] = useState<'voice' | 'video'>('video');
  const [isMuted, setIsMuted] = useState(false);
  const [isCameraOff, setIsCameraOff] = useState(false);
  const [onlineUsers, setOnlineUsers] = useState<OnlineUser[]>([]);
  const [groups, setGroups] = useState<GroupSummary[]>([]);
  const [participants, setParticipants] = useState<GroupParticipant[]>([]);
  const [canManageMembers, setCanManageMembers] = useState(false);
  const [memberUsernameInput, setMemberUsernameInput] = useState('');

  const socketRef = useRef<Socket | null>(null);
  const activeRoomRef = useRef('general');
  const activeCallTypeRef = useRef<'voice' | 'video'>('video');
  const typingDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const typingClearTimersRef = useRef<Record<number, ReturnType<typeof setTimeout>>>({});
  const messageEndRef = useRef<HTMLDivElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const peerRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const remoteStreamRef = useRef<MediaStream | null>(null);
  const pendingCandidatesRef = useRef<RTCIceCandidateInit[]>([]);
  const localVideoRef = useRef<HTMLVideoElement | null>(null);
  const remoteVideoRef = useRef<HTMLVideoElement | null>(null);

  const canSend = useMemo(
    () => draft.trim().length > 0 && activeRoomKey.trim().length > 0,
    [draft, activeRoomKey],
  );

  const unreadTotal = useMemo(() => rooms.reduce((sum, room) => sum + room.unread, 0), [rooms]);

  const visibleRooms = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) {
      return rooms;
    }

    return rooms.filter(
      (room) =>
        room.name.toLowerCase().includes(query) ||
        room.key.toLowerCase().includes(query) ||
        room.lastMessage.toLowerCase().includes(query),
    );
  }, [rooms, searchQuery]);

  useEffect(() => {
    const loadProfile = async () => {
      const response = await fetch(`${API_URL}/auth/profile`, {
        credentials: 'include',
      });

      if (!response.ok) {
        setStatus('Please sign in first.');
        return;
      }

      const data = (await response.json()) as Profile;
      setProfile(data);
      setStatus('Authenticated. Connecting socket...');
    };

    loadProfile().catch(() => setStatus('Unable to load profile'));
  }, []);

  useEffect(() => {
    activeRoomRef.current = activeRoomKey;
  }, [activeRoomKey]);

  useEffect(() => {
    activeCallTypeRef.current = activeCallType;
  }, [activeCallType]);

  useEffect(() => {
    if (!profile) {
      return;
    }

    const loadGroups = async () => {
      const fetchMine = () =>
        fetch(`${API_URL}/groups/mine`, {
          credentials: 'include',
        });

      let response = await fetchMine();
      if (!response.ok) {
        return;
      }

      let data = (await response.json()) as Array<{
        key: string;
        name: string;
        participantCount: number;
      }>;

      if (data.length === 0) {
        await fetch(`${API_URL}/groups`, {
          method: 'POST',
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ key: 'general', name: 'General' }),
        });

        response = await fetchMine();
        if (response.ok) {
          data = (await response.json()) as Array<{
            key: string;
            name: string;
            participantCount: number;
          }>;
        }
      }

      setGroups(data);
      if (data.length > 0) {
        const selectedKey = data.some((group) => group.key === activeRoomRef.current)
          ? activeRoomRef.current
          : data[0].key;
        setActiveRoomKey(selectedKey);
        activeRoomRef.current = selectedKey;
        socketRef.current?.emit('join_room', { roomKey: selectedKey });
        setRooms((prev) => {
          const fromGroups = data.map((group) => {
            const existing = prev.find((room) => room.key === group.key);
            return {
              key: group.key,
              name: group.name || group.key,
              unread: existing?.unread ?? 0,
              lastMessage: existing?.lastMessage ?? 'No messages yet',
              lastAt: existing?.lastAt,
            };
          });

          return fromGroups;
        });
      }
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

      const data = (await response.json()) as {
        participants: GroupParticipant[];
        canManageMembers: boolean;
      };

      setParticipants(data.participants);
      setCanManageMembers(data.canManageMembers);
    };

    loadParticipants().catch(() => undefined);
  }, [profile, activeRoomKey]);

  useEffect(() => {
    messageEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, activeRoomKey]);

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
    setCallStatus('idle');
    setIncomingCall(null);
    setIsMuted(false);
    setIsCameraOff(false);
  };

  const ensureLocalStream = async (callType: 'voice' | 'video') => {
    if (!localStreamRef.current) {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: callType === 'video',
      });
      localStreamRef.current = stream;
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
      setStatus('Connected');
      socket.emit('join_room', { roomKey: activeRoomRef.current });
    });

    socket.on('online_users', (payload: { users?: OnlineUser[] }) => {
      const users = Array.isArray(payload?.users) ? payload.users : [];
      setOnlineUsers(users.filter((user) => user.userId !== profile.userId));
    });

    socket.on('room_joined', (payload: { room: { key: string }; messages: ChatMessage[] }) => {
      setActiveRoomKey(payload.room.key);
      setMessages(payload.messages);
      setTypingUsers({});
      setStatus(`Joined room: ${payload.room.key}`);

      setRooms((prev) => {
        const roomName = payload.room.key
          .split(/[-_]/g)
          .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
          .join(' ');

        const existing = prev.find((room) => room.key === payload.room.key);
        const top: RoomItem = {
          key: payload.room.key,
          name: roomName,
          unread: 0,
          lastMessage:
            payload.messages.length > 0
              ? summarizeMessage(payload.messages[payload.messages.length - 1].content)
              : existing?.lastMessage ?? 'No messages yet',
          lastAt:
            payload.messages.length > 0
              ? payload.messages[payload.messages.length - 1].createdAt
              : existing?.lastAt,
        };

        return [top, ...prev.filter((room) => room.key !== payload.room.key)];
      });

      setIsSidebarOpen(false);
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
          name:
            current?.name ??
            message.roomKey
              .split(/[-_]/g)
              .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
              .join(' '),
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
        }, 450);
      }
    });

    socket.on(
      'typing',
      (payload: { roomKey: string; isTyping: boolean; user: { userId: number; username: string } }) => {
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
        }, 1300);
      },
    );

    socket.on(
      'read_receipt',
      (payload: { messageId: string; userId: number; username: string; status: 'DELIVERED' | 'READ' }) => {
        setMessages((prev) =>
          prev.map((item) => {
            if (item.id !== payload.messageId) {
              return item;
            }

            const alreadyExists = item.receipts.some(
              (receipt) => receipt.userId === payload.userId && receipt.status === payload.status,
            );
            if (alreadyExists) {
              return item;
            }

            return {
              ...item,
              receipts: [...item.receipts, payload],
            };
          }),
        );
      },
    );

    socket.on('receive_call', (payload: IncomingCall) => {
      setIncomingCall(payload);
      setCallStatus(`Incoming ${payload.callType} call from ${payload.fromUsername}`);
      setActiveCallType(payload.callType);
    });

    socket.on('accept_call', async (payload: { fromUserId: number }) => {
      if (!profile) {
        return;
      }

      setActiveCallUserId(payload.fromUserId);
      setCallStatus('Call accepted. Creating offer...');

      try {
        await ensureLocalStream(activeCallTypeRef.current);
        const peer = ensurePeer(payload.fromUserId);
        const offer = await peer.createOffer();
        await peer.setLocalDescription(offer);
        socket.emit('offer', {
          targetUserId: payload.fromUserId,
          sdp: offer,
        });
      } catch {
        setCallStatus('Failed to start call media');
      }
    });

    socket.on('reject_call', (payload: { fromUserId?: number; reason?: string }) => {
      cleanupCall();
      setCallStatus(payload.reason ?? 'Call rejected');
    });

    socket.on('offer', async (payload: { fromUserId: number; sdp: RTCSessionDescriptionInit }) => {
      setActiveCallUserId(payload.fromUserId);
      setCallStatus('Connecting call...');

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
        socket.emit('answer', {
          targetUserId: payload.fromUserId,
          sdp: answer,
        });

        setCallStatus('In call');
      } catch {
        setCallStatus('Failed to answer call');
      }
    });

    socket.on('answer', async (payload: { fromUserId: number; sdp: RTCSessionDescriptionInit }) => {
      if (!peerRef.current) {
        return;
      }

      try {
        await peerRef.current.setRemoteDescription(new RTCSessionDescription(payload.sdp));
        setCallStatus('In call');
      } catch {
        setCallStatus('Failed to finalize call');
      }
    });

    socket.on('ice_candidate', async (payload: { fromUserId: number; candidate: RTCIceCandidateInit }) => {
      if (peerRef.current?.remoteDescription) {
        try {
          await peerRef.current.addIceCandidate(new RTCIceCandidate(payload.candidate));
        } catch {
          setStatus('Failed to add ICE candidate');
        }
      } else {
        pendingCandidatesRef.current.push(payload.candidate);
      }
    });

    socket.on('error', (message: string) => {
      setStatus(`Socket error: ${message}`);
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

  const joinRoom = () => {
    const roomKey = roomKeyInput.trim();
    if (!roomKey || !socketRef.current) {
      return;
    }

    setStatus(`Joining room: ${roomKey}...`);
    socketRef.current.emit('join_room', { roomKey });
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
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        key,
        name: newGroupName.trim() || undefined,
        participantUsernames,
      }),
    });

    if (!response.ok) {
      setStatus('Could not create group');
      return;
    }

    setStatus(`Created group ${key}`);
    setNewGroupKey('');
    setNewGroupName('');
    setNewGroupUsers('');
    setIsCreateGroupModalOpen(false);
    setRoomKeyInput(key);

    const refreshed = await fetch(`${API_URL}/groups/mine`, {
      credentials: 'include',
    });
    if (refreshed.ok) {
      const groupsData = (await refreshed.json()) as GroupSummary[];
      setGroups(groupsData);
      setRooms(
        groupsData.map((group) => ({
          key: group.key,
          name: group.name || group.key,
          unread: 0,
          lastMessage: 'No messages yet',
        })),
      );
    }

    socketRef.current?.emit('join_room', { roomKey: key });
  };

  const addMember = async () => {
    const username = memberUsernameInput.trim();
    if (!username) {
      return;
    }

    const response = await fetch(`${API_URL}/groups/${activeRoomKey}/users`, {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ username }),
    });

    if (!response.ok) {
      setStatus('Failed to add user to group');
      return;
    }

    const data = (await response.json()) as {
      participants: GroupParticipant[];
      canManageMembers: boolean;
    };
    setParticipants(data.participants);
    setCanManageMembers(data.canManageMembers);
    setMemberUsernameInput('');
  };

  const removeMember = async (username: string) => {
    const response = await fetch(`${API_URL}/groups/${activeRoomKey}/users/${username}`, {
      method: 'DELETE',
      credentials: 'include',
    });

    if (!response.ok) {
      setStatus('Failed to remove user from group');
      return;
    }

    const data = (await response.json()) as {
      participants: GroupParticipant[];
      canManageMembers: boolean;
    };
    setParticipants(data.participants);
    setCanManageMembers(data.canManageMembers);
  };

  const sendMessage = (event: FormEvent) => {
    event.preventDefault();
    if (!canSend || !socketRef.current) {
      return;
    }

    socketRef.current.emit('send_message', {
      roomKey: activeRoomKey,
      content: draft,
    });

    setDraft('');
    socketRef.current.emit('typing', { roomKey: activeRoomKey, isTyping: false });
  };

  const uploadFile = async (file: File) => {
    if (!socketRef.current) {
      setStatus('Socket is not connected');
      return;
    }

    if (file.size > CLIENT_MAX_FILE_BYTES) {
      setStatus('File exceeds 10MB size limit');
      return;
    }

    const isAllowedType =
      file.type.startsWith('image/') ||
      file.type.startsWith('video/') ||
      file.type === 'application/pdf';

    if (!isAllowedType) {
      setStatus('Only image, video, or PDF files are allowed');
      return;
    }

    const formData = new FormData();
    formData.append('file', file);

    setUploadState('uploading');
    setStatus('Uploading file...');

    try {
      const response = await fetch(`${API_URL}/files/upload`, {
        method: 'POST',
        credentials: 'include',
        body: formData,
      });

      if (!response.ok) {
        setStatus('Upload failed');
        return;
      }

      const uploaded = (await response.json()) as UploadedFileResponse;
      socketRef.current.emit('send_message', {
        roomKey: activeRoomKey,
        content: encodeAttachmentMessage(uploaded),
      });
      setStatus(`Uploaded ${uploaded.originalName}`);
    } catch {
      setStatus('Upload failed');
    } finally {
      setUploadState('idle');
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
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

  const formatStatus = (message: ChatMessage): string => {
    if (!profile || message.sender.userId !== profile.userId) {
      return '';
    }

    const recipientReceipts = message.receipts.filter((receipt) => receipt.userId !== profile.userId);
    const hasRead = recipientReceipts.some((receipt) => receipt.status === 'READ');
    const hasDelivered = recipientReceipts.some(
      (receipt) => receipt.status === 'DELIVERED' || receipt.status === 'READ',
    );

    if (hasRead) return 'read';
    if (hasDelivered) return 'delivered';
    return 'sent';
  };

  const typingIndicator = Object.values(typingUsers).join(', ');

  const openRoom = (roomKey: string) => {
    setRoomKeyInput(roomKey);
    socketRef.current?.emit('join_room', { roomKey });
  };

  const prettyTime = (value?: string) => {
    if (!value) return '';
    return new Date(value).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const participantRoleBadge = (role: GroupParticipant['role']) => {
    if (role === 'owner') {
      return 'bg-amber-100 text-amber-800';
    }
    if (role === 'admin') {
      return 'bg-indigo-100 text-indigo-800';
    }
    return 'bg-slate-100 text-slate-700';
  };

  const startCall = async (type: 'voice' | 'video', targetUserIdOverride?: number) => {
    if (!socketRef.current) {
      setCallStatus('Socket is not connected');
      return;
    }

    const targetUserId = targetUserIdOverride ?? Number(callTargetUserId);
    if (!Number.isInteger(targetUserId) || targetUserId <= 0) {
      setCallStatus('Enter a valid target user ID');
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
      setCallStatus(`Calling user ${targetUserId}...`);
    } catch {
      setCallStatus('Could not access camera/microphone');
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
      setCallStatus('Accepted. Waiting for offer...');
      setIncomingCall(null);
    } catch {
      setCallStatus('Could not access camera/microphone');
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

    const nextMuted = !isMuted;
    for (const track of localStreamRef.current.getAudioTracks()) {
      track.enabled = !nextMuted;
    }
    setIsMuted(nextMuted);
  };

  const toggleCamera = () => {
    if (!localStreamRef.current) {
      return;
    }

    const nextCameraOff = !isCameraOff;
    for (const track of localStreamRef.current.getVideoTracks()) {
      track.enabled = !nextCameraOff;
    }
    setIsCameraOff(nextCameraOff);
  };

  if (!profile) {
    return (
      <main className="mx-auto flex min-h-screen w-full max-w-2xl flex-col items-start justify-center gap-4 px-6 py-10">
        <h1 className="text-3xl font-bold">Group Chat</h1>
        <p className="text-sm text-slate-600">{status}</p>
        <Link href="/login" className="rounded-md bg-slate-900 px-4 py-2 text-white hover:bg-slate-700">
          Go to Login
        </Link>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gradient-to-b from-slate-100 to-slate-200 p-0 md:p-5">
      {isSidebarOpen ? (
        <div
          className="fixed inset-0 z-0 bg-slate-900/20 backdrop-blur-[1px] md:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      ) : null}
      <section className="mx-auto flex h-screen w-full max-w-6xl overflow-hidden border border-slate-200 bg-white shadow-2xl md:h-[calc(100vh-2.5rem)] md:rounded-2xl">
        <aside className={`${isSidebarOpen ? 'flex' : 'hidden'} w-full flex-col border-r border-slate-200 bg-slate-50 md:flex md:w-80`}>
          <div className="border-b border-slate-200 px-4 py-4">
            <div className="flex items-center justify-between">
              <h1 className="text-lg font-bold text-slate-900">Messages</h1>
              <div className="flex items-center gap-2">
                {unreadTotal > 0 ? (
                  <span className="rounded-full bg-teal-600 px-2 py-0.5 text-[11px] font-bold text-white">
                    {unreadTotal}
                  </span>
                ) : null}
                <button
                  type="button"
                  onClick={() => setIsCreateGroupModalOpen(true)}
                  className="rounded-md border border-slate-300 bg-white px-2 py-1 text-[11px] font-semibold text-slate-700 hover:bg-slate-100"
                >
                  + Group
                </button>
              </div>
            </div>
            <p className="mt-1 text-xs text-slate-500">Signed in as {profile.username} (ID {profile.userId})</p>

            <input
              className="mt-3 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-teal-500"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="Search chats"
            />

            <form
              className="mt-3 flex gap-2"
              onSubmit={(event) => {
                event.preventDefault();
                joinRoom();
              }}
            >
              <input
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-teal-500"
                value={roomKeyInput}
                onChange={(event) => setRoomKeyInput(event.target.value)}
                placeholder="Room key"
              />
              <button
                className="rounded-lg bg-teal-600 px-3 py-2 text-sm font-semibold text-white hover:bg-teal-500"
                type="submit"
              >
                Join
              </button>
            </form>

          </div>

          <div className="flex-1 overflow-y-auto">
            <div className="border-b border-slate-200 px-4 py-3">
              <div className="mb-2 flex items-center justify-between">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Online Users</p>
                <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-semibold text-emerald-700">
                  {onlineUsers.length}
                </span>
              </div>
              {onlineUsers.length === 0 ? (
                <p className="text-xs text-slate-400">No other users online</p>
              ) : (
                <div className="space-y-1.5">
                  {onlineUsers.map((user) => (
                    <div key={user.userId} className="flex items-center justify-between rounded-md bg-white px-2 py-1.5">
                      <button
                        type="button"
                        onClick={() => setCallTargetUserId(String(user.userId))}
                        className="min-w-0 text-left"
                      >
                        <p className="truncate text-xs font-semibold text-slate-800">{user.username}</p>
                        <p className="text-[11px] text-slate-500">#{user.userId}</p>
                      </button>
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => {
                            setCallTargetUserId(String(user.userId));
                            startCall('voice', user.userId);
                          }}
                          className="rounded border border-slate-300 px-1.5 py-1 text-[11px] text-slate-700 hover:bg-slate-100"
                        >
                          Voice
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setCallTargetUserId(String(user.userId));
                            startCall('video', user.userId);
                          }}
                          className="rounded border border-slate-300 px-1.5 py-1 text-[11px] text-slate-700 hover:bg-slate-100"
                        >
                          Video
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {visibleRooms.map((room) => {
              const active = room.key === activeRoomKey;
              return (
                <button
                  key={room.key}
                  onClick={() => openRoom(room.key)}
                  type="button"
                  className={`w-full border-b border-slate-200 px-4 py-3 text-left transition ${
                    active ? 'bg-white' : 'hover:bg-slate-100'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <p className="truncate text-sm font-semibold text-slate-900">{room.name}</p>
                    <p className="text-[11px] text-slate-500">{prettyTime(room.lastAt)}</p>
                  </div>
                  <div className="mt-1 flex items-center justify-between gap-2">
                    <p className="truncate text-xs text-slate-500">{room.lastMessage}</p>
                    {room.unread > 0 ? (
                      <span className="rounded-full bg-teal-600 px-2 py-0.5 text-[11px] font-bold text-white">
                        {room.unread}
                      </span>
                    ) : null}
                  </div>
                </button>
              );
            })}
          </div>
        </aside>

        <section className={`${isSidebarOpen ? 'hidden' : 'flex'} w-full flex-1 flex-col md:flex`}>
          <header className="border-b border-slate-200 bg-white px-3 py-3 md:px-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setIsSidebarOpen(true)}
                  className="rounded-md border border-slate-300 px-2 py-1 text-xs text-slate-700 md:hidden"
                  type="button"
                >
                  Chats
                </button>
                <div>
                  <p className="text-sm font-semibold text-slate-900">{activeRoomKey}</p>
                  <p className="text-xs text-slate-500">{typingIndicator || status}</p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <input
                  value={callTargetUserId}
                  onChange={(event) => setCallTargetUserId(event.target.value)}
                  className="w-28 rounded-md border border-slate-300 px-2 py-1 text-xs outline-none focus:border-teal-500"
                  placeholder="User ID"
                />
                <button
                  type="button"
                  onClick={() => startCall('voice')}
                  className="rounded-md border border-slate-300 px-2 py-1 text-xs text-slate-700 hover:bg-slate-100"
                >
                  Voice
                </button>
                <button
                  type="button"
                  onClick={() => startCall('video')}
                  className="rounded-md border border-slate-300 px-2 py-1 text-xs text-slate-700 hover:bg-slate-100"
                >
                  Video
                </button>
                <button
                  type="button"
                  onClick={toggleMute}
                  className="rounded-md border border-slate-300 px-2 py-1 text-xs text-slate-700 hover:bg-slate-100"
                >
                  {isMuted ? 'Unmute' : 'Mute'}
                </button>
                <button
                  type="button"
                  onClick={toggleCamera}
                  disabled={activeCallType === 'voice'}
                  className="rounded-md border border-slate-300 px-2 py-1 text-xs text-slate-700 hover:bg-slate-100 disabled:opacity-50"
                >
                  {isCameraOff ? 'Camera On' : 'Camera Off'}
                </button>
                <button
                  type="button"
                  onClick={endCall}
                  className="rounded-md bg-rose-600 px-2 py-1 text-xs text-white hover:bg-rose-500"
                >
                  End
                </button>
                <Link href="/login" className="rounded-md border border-slate-300 px-2 py-1 text-xs text-slate-600 hover:bg-slate-100">
                  Account
                </Link>
              </div>
            </div>
            <p className="mt-2 text-xs text-slate-500">Call status: {callStatus}</p>
            <div className="mt-2 rounded-lg border border-slate-200 bg-slate-50 p-2">
              <div className="mb-2 flex items-center justify-between">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                  Participants ({participants.length})
                </p>
                {groups.length > 0 ? (
                  <span className="text-[11px] text-slate-500">My groups: {groups.length}</span>
                ) : null}
              </div>

              {participants.length === 0 ? (
                <p className="text-xs text-slate-500">No participants loaded for this group.</p>
              ) : (
                <div className="flex flex-wrap gap-1.5">
                  {participants.map((participant) => (
                    <span key={participant.userId} className="inline-flex items-center gap-1 rounded-full bg-white px-2 py-1 text-[11px] text-slate-700">
                      {participant.username}
                      <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-semibold ${participantRoleBadge(participant.role)}`}>
                        {participant.role}
                      </span>
                      {canManageMembers && participant.role !== 'owner' && participant.username !== profile.username ? (
                        <button
                          type="button"
                          className="rounded px-1 text-rose-600 hover:bg-rose-50"
                          onClick={() => removeMember(participant.username)}
                        >
                          x
                        </button>
                      ) : null}
                    </span>
                  ))}
                </div>
              )}

              {canManageMembers ? (
                <div className="mt-2 flex gap-2">
                  <input
                    className="w-full rounded-md border border-slate-300 px-2 py-1 text-xs outline-none focus:border-teal-500"
                    value={memberUsernameInput}
                    onChange={(event) => setMemberUsernameInput(event.target.value)}
                    placeholder="username to add"
                  />
                  <button
                    type="button"
                    onClick={addMember}
                    className="rounded-md bg-teal-600 px-2 py-1 text-xs font-semibold text-white hover:bg-teal-500"
                  >
                    Add
                  </button>
                </div>
              ) : null}
            </div>
            {incomingCall ? (
              <div className="mt-2 flex items-center gap-2 rounded-lg border border-teal-200 bg-teal-50 px-3 py-2">
                <p className="text-xs text-teal-800">
                  Incoming {incomingCall.callType} call from {incomingCall.fromUsername} (#{incomingCall.fromUserId})
                </p>
                <button
                  type="button"
                  onClick={acceptCall}
                  className="rounded bg-teal-600 px-2 py-1 text-xs font-semibold text-white"
                >
                  Accept
                </button>
                <button
                  type="button"
                  onClick={rejectCall}
                  className="rounded bg-rose-600 px-2 py-1 text-xs font-semibold text-white"
                >
                  Reject
                </button>
              </div>
            ) : null}
          </header>

          <div className="grid gap-2 border-b border-slate-200 bg-slate-100 p-2 md:grid-cols-2">
            <div className="overflow-hidden rounded-lg border border-slate-300 bg-slate-900">
              <video ref={localVideoRef} autoPlay playsInline muted className="h-36 w-full object-cover md:h-44" />
              <p className="px-2 py-1 text-[11px] text-slate-200">Local ({profile.username})</p>
            </div>
            <div className="overflow-hidden rounded-lg border border-slate-300 bg-slate-900">
              <video ref={remoteVideoRef} autoPlay playsInline className="h-36 w-full object-cover md:h-44" />
              <p className="px-2 py-1 text-[11px] text-slate-200">
                Remote {activeCallUserId ? `(User #${activeCallUserId})` : ''}
              </p>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto bg-[linear-gradient(180deg,#f8fafc_0%,#f1f5f9_100%)] px-3 py-4 md:px-6">
            <div className="space-y-2">
              {messages.length === 0 ? (
                <div className="rounded-xl bg-white/80 p-4 text-center text-sm text-slate-500 shadow-sm">
                  No messages yet. Say hello.
                </div>
              ) : null}

              {messages.map((message) => {
                const mine = profile.userId === message.sender.userId;
                const attachment = parseAttachmentMessage(message.content);
                return (
                  <div key={message.id} className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
                    <div
                      className={`max-w-[82%] rounded-2xl px-3 py-2 text-sm shadow-sm md:max-w-[72%] ${
                        mine
                          ? 'rounded-br-md bg-teal-600 text-white'
                          : 'rounded-bl-md border border-slate-200 bg-white text-slate-900'
                      }`}
                    >
                      {!mine ? (
                        <p className="mb-1 text-[11px] font-semibold text-slate-500">{message.sender.username}</p>
                      ) : null}
                      {attachment ? (
                        <div className="space-y-2">
                          {attachment.mimeType.startsWith('image/') ? (
                            <img
                              src={attachment.url}
                              alt={attachment.originalName}
                              className="max-h-64 w-full rounded-xl object-cover"
                            />
                          ) : null}

                          {attachment.mimeType.startsWith('video/') ? (
                            <video className="max-h-72 w-full rounded-xl" controls preload="metadata">
                              <source src={attachment.url} type={attachment.mimeType} />
                            </video>
                          ) : null}

                          {attachment.mimeType === 'application/pdf' ? (
                            <object
                              data={attachment.url}
                              type="application/pdf"
                              className="h-64 w-full rounded-xl border border-slate-200 bg-white"
                            >
                              <a href={attachment.url} target="_blank" rel="noreferrer" className="underline">
                                Open PDF
                              </a>
                            </object>
                          ) : null}

                          <a
                            href={attachment.url}
                            target="_blank"
                            rel="noreferrer"
                            className={`block text-xs underline ${mine ? 'text-teal-50' : 'text-slate-600'}`}
                          >
                            {attachment.originalName}
                          </a>
                        </div>
                      ) : (
                        <p className="leading-relaxed">{message.content}</p>
                      )}
                      <div
                        className={`mt-1 flex items-center justify-end gap-1 text-[10px] ${
                          mine ? 'text-teal-100' : 'text-slate-500'
                        }`}
                      >
                        <span>{prettyTime(message.createdAt)}</span>
                        {mine ? <span className="capitalize">{formatStatus(message)}</span> : null}
                      </div>
                    </div>
                  </div>
                );
              })}
              <div ref={messageEndRef} />
            </div>
          </div>

          <footer className="border-t border-slate-200 bg-white px-3 py-3 md:px-5">
            <form className="flex items-end gap-2" onSubmit={sendMessage}>
              <input
                ref={fileInputRef}
                type="file"
                className="hidden"
                accept="image/*,video/*,application/pdf"
                onChange={(event) => {
                  const selected = event.target.files?.[0];
                  if (!selected) {
                    return;
                  }
                  uploadFile(selected);
                }}
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploadState === 'uploading'}
                className="rounded-2xl border border-slate-300 px-3 py-2 text-sm text-slate-500 hover:bg-slate-100 disabled:opacity-60"
              >
                {uploadState === 'uploading' ? 'Uploading' : 'Attach'}
              </button>
              <input
                className="w-full rounded-2xl border border-slate-300 px-4 py-2 text-sm outline-none focus:border-teal-500"
                value={draft}
                onChange={(event) => handleDraftChange(event.target.value)}
                placeholder="Type a message"
              />
              <button
                type="submit"
                disabled={!canSend}
                className="rounded-2xl bg-teal-600 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-500 disabled:bg-slate-300"
              >
                Send
              </button>
            </form>
          </footer>
        </section>
      </section>

      {isCreateGroupModalOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4">
          <div className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-4 shadow-2xl">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-lg font-bold text-slate-900">Create Group</h2>
              <button
                type="button"
                onClick={() => setIsCreateGroupModalOpen(false)}
                className="rounded-md border border-slate-300 px-2 py-1 text-xs text-slate-600 hover:bg-slate-100"
              >
                Close
              </button>
            </div>

            <div className="space-y-2">
              <input
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-teal-500"
                value={newGroupKey}
                onChange={(event) => setNewGroupKey(event.target.value)}
                placeholder="group key (e.g. team_alpha)"
              />
              <input
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-teal-500"
                value={newGroupName}
                onChange={(event) => setNewGroupName(event.target.value)}
                placeholder="group name (optional)"
              />
              <input
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-teal-500"
                value={newGroupUsers}
                onChange={(event) => setNewGroupUsers(event.target.value)}
                placeholder="participants (comma-separated usernames)"
              />
              <button
                type="button"
                onClick={createGroup}
                className="w-full rounded-md bg-teal-600 px-3 py-2 text-sm font-semibold text-white hover:bg-teal-500"
              >
                Create Group
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </main>
  );
}

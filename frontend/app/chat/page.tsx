'use client';

import React, { FormEvent, TouchEvent, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { io, Socket } from 'socket.io-client';
import { API_URL, SOCKET_URL, authFetch, getAuthToken, clearAuthTokenCookie } from '@/lib/config';
import { CallUI } from '@/features/calls/components/CallUI';
import { CallsPanel } from '@/features/calls/components/CallsPanel';
import { ChatList } from '@/features/chat/components/chat-list/ChatList';
import { ChatWindow } from '@/features/chat/components/chat-window/ChatWindow';
import { Sidebar } from '@/features/chat/components/navigation/Sidebar';
import { ContactsPanel } from '@/features/contacts/components/ContactsPanel';
import { ProfileView } from '@/features/settings/components/ProfileView';
import { SettingsView } from '@/features/settings/components/SettingsView';
import { MeetingsPanel } from '@/features/meetings/components/MeetingsPanel';
import { CreateGroupModal } from '@/features/chat/components/create-group-modal/CreateGroupModal';
import {
  AppSection,
  CallHistoryItem,
  CallPeer,
  ChatMessage,
  GroupParticipant,
  GroupSummary,
  SearchedUser,
  IncomingCall,
  OnlineUser,
  Profile,
  RoomItem,
  UploadedFileResponse,
  UserStatus,
} from '@/features/chat/types';

const FILE_MESSAGE_PREFIX = '__FILE__:';
const CLIENT_MAX_FILE_BYTES = 20 * 1024 * 1024;
const QUICK_USERS_FALLBACK: SearchedUser[] = [];
function buildRtcConfig(): RTCConfiguration {
  const iceServers: RTCIceServer[] = [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' },
    { urls: 'stun:stun3.l.google.com:19302' },
    { urls: 'stun:stun4.l.google.com:19302' },
    { urls: 'stun:stun.cloudflare.com:3478' },
  ];
  const turnUrl = process.env.NEXT_PUBLIC_TURN_URL;
  const turnUsername = process.env.NEXT_PUBLIC_TURN_USERNAME;
  const turnCredential = process.env.NEXT_PUBLIC_TURN_CREDENTIAL;
  if (turnUrl && turnUsername && turnCredential) {
    iceServers.push({ urls: turnUrl, username: turnUsername, credential: turnCredential });
  }
  return {
    iceServers,
    iceCandidatePoolSize: 10,
    bundlePolicy: 'max-bundle',
    rtcpMuxPolicy: 'require',
  };
}
const RTC_CONFIG = buildRtcConfig();

function encodeAttachmentMessage(file: UploadedFileResponse): string {
  return `${FILE_MESSAGE_PREFIX}${JSON.stringify({ kind: 'file', ...file })}`;
}

function dedupeParticipants(arr: GroupParticipant[]): GroupParticipant[] {
  return arr.filter((p, i, self) => self.findIndex((x) => x.userId === p.userId) === i);
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

  const [darkMode, setDarkMode] = useState<boolean>(() => {
    if (typeof window === 'undefined') return true;
    const stored = localStorage.getItem('imcs_theme');
    if (stored === 'dark') return true;
    if (stored === 'light') return false;
    return true;
  });
  const [sessionKicked, setSessionKicked] = useState(false);
  const [isNavModalOpen, setIsNavModalOpen] = useState(false);
  const [showGroupInfo, setShowGroupInfo] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [activeSection, setActiveSection] = useState<AppSection>('chats');
  const [prevSection, setPrevSection] = useState<AppSection | null>(null);
  const [slideDir, setSlideDir] = useState<1 | -1>(1); // 1 = entering from right, -1 = entering from left
  const [mobileSection, setMobileSection] = useState<AppSection>('chats');
  const [mobileChatOpen, setMobileChatOpen] = useState(false);
  const [mobileTransitioning, setMobileTransitioning] = useState(false);
  const [mobilePrevSection, setMobilePrevSection] = useState<AppSection | null>(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [pinnedRoomKeys, setPinnedRoomKeys] = useState<string[]>(['general']);

  const [rooms, setRooms] = useState<RoomItem[]>([]);
  const [activeRoomKey, setActiveRoomKey] = useState('general');

  const [participants, setParticipants] = useState<GroupParticipant[]>([]);
  const [canManageMembers, setCanManageMembers] = useState(false);
  const [memberUsernameInput, setMemberUsernameInput] = useState('');

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [hasMoreMessages, setHasMoreMessages] = useState(false);
  const [loadingMoreMessages, setLoadingMoreMessages] = useState(false);
  const [draft, setDraft] = useState('');
  const [replyTo, setReplyTo] = useState<ChatMessage | null>(null);
  const [editingMessage, setEditingMessage] = useState<ChatMessage | null>(null);
  const [typingUsers, setTypingUsers] = useState<Record<number, string>>({});

  const [isCreateGroupModalOpen, setIsCreateGroupModalOpen] = useState(false);

  const [onlineUsers, setOnlineUsers] = useState<OnlineUser[]>([]);
  const [allUsers, setAllUsers] = useState<SearchedUser[]>([]);
  const [contactSearchQuery, setContactSearchQuery] = useState('');

  const [uploadState, setUploadState] = useState<'idle' | 'uploading'>('idle');
  const [uploadProgress, setUploadProgress] = useState(0);
  const [userStatus, setUserStatus] = useState<UserStatus>('available');

  const [incomingCall, setIncomingCall] = useState<IncomingCall | null>(null);
  const [callPeers, setCallPeers] = useState<CallPeer[]>([]);
  const [activeCallRoomKey, setActiveCallRoomKey] = useState<string | null>(null);
  const [isCallActive, setIsCallActive] = useState(false);
  const [activeCallType, setActiveCallType] = useState<'voice' | 'video'>('video');
  const [callStatus, setCallStatus] = useState('idle');
  const [callStartedAt, setCallStartedAt] = useState<number | null>(null);
  const [callTicker, setCallTicker] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [isCameraOff, setIsCameraOff] = useState(false);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [participantsPanelOpen, setParticipantsPanelOpen] = useState(false);
  const [callHistory, setCallHistory] = useState<CallHistoryItem[]>([]);
  const [showMeetingPrompt, setShowMeetingPrompt] = useState(false);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);

  const socketRef = useRef<Socket | null>(null);
  const activeRoomRef = useRef('general');
  const ringTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const typingDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const typingClearTimersRef = useRef<Record<number, ReturnType<typeof setTimeout>>>({});
  const messageEndRef = useRef<HTMLDivElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const pendingOptimisticsRef = useRef<string[]>([]); // FIFO queue of __temp__ IDs waiting for server confirmation
  const resolvedOptimisticsRef = useRef<Set<string>>(new Set()); // tempIds the server already confirmed before React flushed them

  const touchStartX = useRef<number | null>(null);
  // One RTCPeerConnection per remote participant (key = userId)
  const peersRef = useRef<Map<number, RTCPeerConnection>>(new Map());
  // One MediaStream per remote participant
  const remoteStreamsRef = useRef<Map<number, MediaStream>>(new Map());
  // Buffered ICE candidates per participant (before remote description is set)
  const pendingCandidatesRef = useRef<Map<number, RTCIceCandidateInit[]>>(new Map());
  const localStreamRef = useRef<MediaStream | null>(null);
  const localVideoRef = useRef<HTMLVideoElement | null>(null);
  const activeCallTypeRef = useRef<'voice' | 'video'>('video');
  const activeCallRoomKeyRef = useRef<string | null>(null);
  const cameraTrackRef = useRef<MediaStreamTrack | null>(null);
  const displayStreamRef = useRef<MediaStream | null>(null);
  const processedPeerIdsRef = useRef<Set<number>>(new Set());

  const unreadTotal = useMemo(() => rooms.reduce((sum, room) => sum + room.unread, 0), [rooms]);

  const callDurationLabel = useMemo(() => {
    if (!callStartedAt) return '00:00';
    const seconds = Math.max(0, Math.floor((Date.now() - callStartedAt) / 1000));
    const mins = String(Math.floor(seconds / 60)).padStart(2, '0');
    const secs = String(seconds % 60).padStart(2, '0');
    return `${mins}:${secs}`;
  }, [callStartedAt, callStatus, callTicker]);

  useEffect(() => {
    localStorage.setItem('imcs_theme', darkMode ? 'dark' : 'light');
  }, [darkMode]);

  useEffect(() => {
    if (!callStartedAt) return;
    const timer = setInterval(() => setCallTicker((v) => v + 1), 1000);
    return () => clearInterval(timer);
  }, [callStartedAt]);

  const typingIndicator = useMemo(() => {
    const values = Object.values(typingUsers);
    if (values.length === 0) return '';
    return `${values.join(', ')} typing...`;
  }, [typingUsers]);

  const activeRoomName = useMemo(() => {
    if (activeRoomKey.startsWith('dm_') && profile && participants.length > 0) {
      const other = participants.find((p) => Number(p.userId) !== Number(profile.userId));
      if (other) return other.username;
    }
    const room = rooms.find((item) => item.key === activeRoomKey);
    return room?.name ?? activeRoomKey;
  }, [rooms, activeRoomKey, participants, profile]);

  const mentionCandidates = useMemo(() => {
    const mentionMatch = draft.match(/@([a-zA-Z0-9_]*)$/);
    if (!mentionMatch) return [];
    const query = mentionMatch[1].toLowerCase();
    return participants.filter((p) => p.username.toLowerCase().includes(query)).slice(0, 6);
  }, [draft, participants]);

  const canSend = useMemo(() => draft.trim().length > 0 && activeRoomKey.trim().length > 0, [draft, activeRoomKey]);

  useEffect(() => {
    const loadProfile = async () => {
      const token = getAuthToken();
      if (token) {
        const response = await authFetch(`${API_URL}/auth/profile`, { method: 'GET' });
        if (response.ok) {
          const profileData = (await response.json()) as Profile;
          setProfile(profileData);
          setStatus('Secure session active.');
          return;
        }
      }
      // Prototype fallback: use mock user from localStorage
      const mockUserStr = typeof window !== 'undefined' ? localStorage.getItem('mockUser') : null;
      if (mockUserStr) {
        try {
          const mockProfile = JSON.parse(mockUserStr) as Profile;
          setProfile(mockProfile);
          setStatus('Demo mode');
          return;
        } catch {
          // invalid stored data — fall through
        }
      }
      setStatus('Please sign in first.');
    };
    loadProfile().catch(() => setStatus('Unable to verify profile'));
  }, []);

  useEffect(() => {
    if (!profile) return;
    const loadUsers = async () => {
      try {
        const response = await authFetch(`${API_URL}/users/all`);
        if (response.ok) {
          const users = (await response.json()) as SearchedUser[];
          if (users.length > 0) {
            setAllUsers(users);
            return;
          }
        }
        setAllUsers(QUICK_USERS_FALLBACK);
      } catch (err) {
        console.error('Failed to load users', err);
        setAllUsers(QUICK_USERS_FALLBACK);
      }
    };
    loadUsers();
  }, [profile]);

  useEffect(() => {
    if (!profile || contactSearchQuery.trim().length < 2) {
      if (contactSearchQuery.trim().length === 0 && allUsers.length === 0) {
        return;
      }
      return;
    }
    const searchUsers = async () => {
      try {
        const response = await authFetch(`${API_URL}/users/search?q=${encodeURIComponent(contactSearchQuery)}`);
        if (response.ok) {
          const users = (await response.json()) as SearchedUser[];
          setAllUsers(users);
        }
      } catch (err) {
        console.error('Failed to search users', err);
      }
    };
    const timeout = setTimeout(searchUsers, 300);
    return () => clearTimeout(timeout);
  }, [contactSearchQuery]);

  useEffect(() => { activeRoomRef.current = activeRoomKey; }, [activeRoomKey]);
  useEffect(() => { activeCallTypeRef.current = activeCallType; }, [activeCallType]);
  const prevScrollRoomRef = useRef(activeRoomKey);
  useEffect(() => {
    const switched = prevScrollRoomRef.current !== activeRoomKey;
    prevScrollRoomRef.current = activeRoomKey;
    messageEndRef.current?.scrollIntoView({ behavior: switched ? 'instant' : 'smooth' });
  }, [messages, activeRoomKey, typingIndicator]);

  useEffect(() => {
    if (!profile) return;
    const loadGroups = async () => {
      const mineResponse = await authFetch(`${API_URL}/groups/mine`);
      if (!mineResponse.ok) return;
      let mineData = (await mineResponse.json()) as GroupSummary[];
      if (mineData.length === 0) {
        await authFetch(`${API_URL}/groups`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ key: 'general', name: 'General' }),
        });
        const afterCreate = await authFetch(`${API_URL}/groups/mine`);
        if (afterCreate.ok) mineData = (await afterCreate.json()) as GroupSummary[];
      }
      setGroups(mineData);
      setRooms((prev) => mineData.map((group) => {
        const existing = prev.find((room) => room.key === group.key);
        return { key: group.key, name: group.name || group.key, unread: existing?.unread ?? 0, lastMessage: existing?.lastMessage ?? 'No messages yet', lastAt: existing?.lastAt };
      }));
      const selected = mineData.some((g) => g.key === activeRoomRef.current) ? activeRoomRef.current : mineData[0]?.key ?? 'general';
      setActiveRoomKey(selected);
      activeRoomRef.current = selected;
      socketRef.current?.emit('join_room', { roomKey: selected });
    };
    loadGroups().catch(() => undefined);
  }, [profile]);

  useEffect(() => {
    if (!profile || !activeRoomKey) return;
    const loadParticipants = async () => {
      const response = await authFetch(`${API_URL}/groups/${activeRoomKey}/participants`);
      if (!response.ok) { setParticipants([]); setCanManageMembers(false); return; }
      const payload = (await response.json()) as { participants: GroupParticipant[]; canManageMembers: boolean };
      const deduped = dedupeParticipants(payload.participants);
      setParticipants(deduped);
      setCanManageMembers(payload.canManageMembers);
      if (activeRoomKey.startsWith('dm_')) {
        const other = deduped.find((p) => p.userId !== profile.userId);
        if (other) setRooms((prev) => prev.map((r) => r.key === activeRoomKey ? { ...r, name: other.username } : r));
      }
    };
    loadParticipants().catch(() => undefined);
  }, [profile, activeRoomKey]);

  const cleanupCall = () => {
    if (ringTimeoutRef.current) { clearTimeout(ringTimeoutRef.current); ringTimeoutRef.current = null; }
    Array.from(peersRef.current.values()).forEach(peer => {
      peer.ontrack = null; peer.onicecandidate = null;
      peer.onconnectionstatechange = null; peer.oniceconnectionstatechange = null;
      peer.close();
    });
    peersRef.current.clear();
    Array.from(remoteStreamsRef.current.values()).forEach(stream => stream.getTracks().forEach((t: MediaStreamTrack) => t.stop()));
    remoteStreamsRef.current.clear();
    pendingCandidatesRef.current.clear();
    processedPeerIdsRef.current.clear();
    if (localStreamRef.current) { localStreamRef.current.getTracks().forEach(t => t.stop()); localStreamRef.current = null; }
    if (displayStreamRef.current) { displayStreamRef.current.getTracks().forEach(t => t.stop()); displayStreamRef.current = null; }
    if (localVideoRef.current) localVideoRef.current.srcObject = null;
    cameraTrackRef.current = null;
    setLocalStream(null);
    setCallPeers([]);
    setActiveCallRoomKey(null);
    activeCallRoomKeyRef.current = null;
    setIsCallActive(false);
    setIncomingCall(null);
    setCallStatus('idle');
    setIsMuted(false);
    setIsCameraOff(false);
    setIsScreenSharing(false);
    setCallStartedAt(null);
    setCallTicker(0);
  };

  const removePeer = (userId: number) => {
    const peer = peersRef.current.get(userId);
    if (peer) {
      peer.ontrack = null; peer.onicecandidate = null;
      peer.onconnectionstatechange = null; peer.oniceconnectionstatechange = null;
      peer.close(); peersRef.current.delete(userId);
    }
    const stream = remoteStreamsRef.current.get(userId);
    if (stream) { stream.getTracks().forEach(t => t.stop()); remoteStreamsRef.current.delete(userId); }
    pendingCandidatesRef.current.delete(userId);
    processedPeerIdsRef.current.delete(userId);
    setCallPeers(prev => prev.filter(p => p.userId !== userId));
  };

  const ensureLocalStream = async (type: 'voice' | 'video') => {
    const needsVideo = type === 'video';
    const currentStream = localStreamRef.current;
    
    if (currentStream) {
      const hasVideoTrack = currentStream.getVideoTracks().length > 0;
      if (needsVideo && hasVideoTrack) {
        return currentStream;
      }
      if (!needsVideo && !hasVideoTrack) {
        return currentStream;
      }
      currentStream.getTracks().forEach(t => t.stop());
      localStreamRef.current = null;
    }
    
    const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;
    const videoConstraints: boolean | MediaTrackConstraints = needsVideo ? (isMobile ? {
      facingMode: 'user',
      width: { ideal: 640 },
      height: { ideal: 480 }
    } : {
      width: { ideal: 1280 },
      height: { ideal: 720 }
    }) : false;
    
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: videoConstraints });
    localStreamRef.current = stream;
    cameraTrackRef.current = stream.getVideoTracks()[0] ?? null;
    setLocalStream(stream);
    return stream;
  };

  const ensurePeer = (targetUserId: number, targetUsername?: string) => {
    const existingPeer = peersRef.current.get(targetUserId);
    if (existingPeer) {
      const state = existingPeer.connectionState;
      if (state !== 'closed' && state !== 'failed' && state !== 'disconnected') {
        if (localStreamRef.current) {
          const senders = existingPeer.getSenders();
          const streamTracks = localStreamRef.current.getTracks();
          const isVideo = activeCallTypeRef.current === 'video';
          streamTracks.forEach(track => {
            // Only add relevant tracks based on call type
            if (!isVideo && track.kind !== 'audio') return;
            const existingSender = senders.find(s => s.track?.kind === track.kind);
            if (existingSender && existingSender.track !== track) {
              existingSender.replaceTrack(track).catch(() => {
                existingPeer.removeTrack(existingSender);
                if (isVideo || track.kind === 'audio') {
                  existingPeer.addTrack(track, localStreamRef.current!);
                }
              });
            } else if (!existingSender && (isVideo || track.kind === 'audio')) {
              existingPeer.addTrack(track, localStreamRef.current!);
            }
          });
        }
        return existingPeer;
      }
      removePeer(targetUserId);
    }
    const peer = new RTCPeerConnection(RTC_CONFIG);
    const remoteStream = new MediaStream();
    remoteStreamsRef.current.set(targetUserId, remoteStream);

    peer.ontrack = (event) => {
      const stream = remoteStreamsRef.current.get(targetUserId);
      if (!stream) return;
      const src = event.streams?.[0];
      if (src) {
        src.getTracks().forEach(t => { if (!stream.getTracks().includes(t)) stream.addTrack(t); });
      } else {
        if (!stream.getTracks().includes(event.track)) stream.addTrack(event.track);
      }
      setCallPeers(prev => {
        const exists = prev.some(p => p.userId === targetUserId);
        if (!exists) {
          processedPeerIdsRef.current.add(targetUserId);
          return [...prev, { userId: targetUserId, username: targetUsername ?? `User ${targetUserId}`, stream }];
        }
        return prev.map(p => p.userId === targetUserId ? { ...p, stream } : p);
      });
    };
    peer.onicecandidate = (event) => {
      if (!event.candidate) return;
      socketRef.current?.emit('ice_candidate', { targetUserId, candidate: event.candidate.toJSON() });
    };
    peer.onconnectionstatechange = () => {
      const state = peer.connectionState;
      if (state === 'connected') {
        setCallStatus('In call');
        setCallStartedAt(prev => prev ?? Date.now());
      }
      if (state === 'failed') {
        setCallStatus('Reconnecting...');
        try { peer.restartIce(); } catch { removePeer(targetUserId); }
      }
      if (state === 'disconnected') { setCallStatus('Connection interrupted...'); }
    };
    peer.oniceconnectionstatechange = () => {
      if (peer.iceConnectionState === 'failed') { try { peer.restartIce(); } catch { /* no-op */ } }
    };
    // Only add audio track for voice calls, all tracks for video calls
    if (localStreamRef.current) {
      const isVideo = activeCallTypeRef.current === 'video';
      localStreamRef.current.getTracks().forEach(t => {
        if (isVideo || t.kind === 'audio') {
          peer.addTrack(t, localStreamRef.current!);
        }
      });
    }
    peersRef.current.set(targetUserId, peer);
    if (targetUsername && !processedPeerIdsRef.current.has(targetUserId)) {
      processedPeerIdsRef.current.add(targetUserId);
      setCallPeers(prev => prev.some(p => p.userId === targetUserId) ? prev : [...prev, { userId: targetUserId, username: targetUsername, stream: null }]);
    }
    return peer;
  };

  const [groups, setGroups] = useState<GroupSummary[]>([]);


  useEffect(() => {
    if (!profile) return;
    const token = getAuthToken();
    const socket = io(SOCKET_URL, { transports: ['websocket'], withCredentials: true, auth: { token } });
    socketRef.current = socket;
    socket.on('connected', () => { setStatus('Connected with encrypted channel.'); socket.emit('join_room', { roomKey: activeRoomRef.current }); });
    socket.on('online_users', (payload: { users?: OnlineUser[] }) => { const users = Array.isArray(payload.users) ? payload.users : []; setOnlineUsers(users.filter((u) => u.userId !== profile.userId)); });
    socket.on('room_joined', (payload: { room: { key: string; name?: string }; messages: ChatMessage[] }) => {
      setActiveRoomKey(payload.room.key);
      setMessages(payload.messages);
      setTypingUsers({});
      setStatus(`Connected to ${payload.room.name ?? payload.room.key}`);
      setRooms((prev) => {
        const current = prev.find((room) => room.key === payload.room.key);
        let roomName = payload.room.name || current?.name || payload.room.key;
        // For DMs, derive name from the other participant in messages
        if (payload.room.key.startsWith('dm_')) {
          const otherParticipant = payload.messages.find((m) => Number(m.sender.userId) !== Number(profile.userId));
          if (otherParticipant) {
            roomName = otherParticipant.sender.username;
          }
        }
        const next: RoomItem = {
          key: payload.room.key,
          name: roomName,
          unread: 0,
          lastMessage: payload.messages.length > 0 ? summarizeMessage(payload.messages[payload.messages.length - 1].content) : current?.lastMessage ?? 'No messages yet',
          lastAt: payload.messages.length > 0 ? payload.messages[payload.messages.length - 1].createdAt : current?.lastAt,
        };
        if (!current) return [...prev, next];
        return prev.map((room) => (room.key === payload.room.key ? next : room));
      });
    });
    socket.on('receive_message', (message: ChatMessage) => {
      const isFromMe = Number(message.sender.userId) === Number(profile.userId);
      const tempId = isFromMe && pendingOptimisticsRef.current.length > 0
        ? pendingOptimisticsRef.current.shift()!
        : null;

      setMessages((prev) => {
        if (prev.some((item) => item.id === message.id)) return prev;
        if (tempId) {
          const idx = prev.findIndex((item) => item.id === tempId);
          if (idx !== -1) {
            const updated = [...prev];
            updated[idx] = message;
            return updated;
          }
          // Optimistic not in state yet — server beat React's flush.
          // Add the real message now; mark tempId resolved so the pending setMessages skips it.
          resolvedOptimisticsRef.current.add(tempId);
        }
        return [...prev, message];
      });
      setRooms((prev) => {
        const current = prev.find((room) => room.key === message.roomKey);
        let name = current?.name;
        // For DM rooms, always use the other participant's name (correct it if needed)
        if (message.roomKey.startsWith('dm_')) {
          name = message.sender.userId !== profile.userId
            ? message.sender.username
            : current?.name ?? message.roomKey;
        } else if (!name || name === message.roomKey) {
          name = current?.name ?? message.roomKey;
        }
        const nextRoom: RoomItem = {
          key: message.roomKey,
          name,
          unread: message.roomKey === activeRoomRef.current || message.sender.userId === profile.userId ? 0 : (current?.unread ?? 0) + 1,
          lastMessage: summarizeMessage(message.content),
          lastAt: message.createdAt,
        };
        return [nextRoom, ...prev.filter((room) => room.key !== message.roomKey)];
      });
      if (message.sender.userId !== profile.userId) {
        socket.emit('read_receipt', { messageId: message.id, status: 'DELIVERED' });
        setTimeout(() => socket.emit('read_receipt', { messageId: message.id, status: 'READ' }), 350);
      }
    });
    socket.on('typing', (payload: { roomKey: string; isTyping: boolean; user: { userId: number; username: string } }) => {
      if (payload.roomKey !== activeRoomRef.current || payload.user.userId === profile.userId) return;
      setTypingUsers((current) => {
        const next = { ...current };
        payload.isTyping ? (next[payload.user.userId] = payload.user.username) : delete next[payload.user.userId];
        return next;
      });
      if (typingClearTimersRef.current[payload.user.userId]) clearTimeout(typingClearTimersRef.current[payload.user.userId]);
      typingClearTimersRef.current[payload.user.userId] = setTimeout(() => {
        setTypingUsers((current) => { const next = { ...current }; delete next[payload.user.userId]; return next; });
      }, 1200);
    });
    socket.on('read_receipt', (payload: { messageId: string; userId: number; status: 'DELIVERED' | 'READ'; username: string }) => {
      setMessages((prev) => prev.map((message) => {
        if (message.id !== payload.messageId) return message;
        const exists = message.receipts.some((r) => r.userId === payload.userId && r.status === payload.status);
        if (exists) return message;
        return { ...message, receipts: [...message.receipts, payload] };
      }));
    });
    socket.on('reaction_update', (payload: { messageId: string; reactions: ChatMessage['reactions'] }) => {
      setMessages((prev) => prev.map((item) => (item.id === payload.messageId ? { ...item, reactions: payload.reactions ?? [] } : item)));
    });
    socket.on('message_edited', (payload: { messageId: string; content: string; isEdited: boolean }) => {
      setMessages((prev) => prev.map((item) => item.id === payload.messageId ? { ...item, content: payload.content, isEdited: true } : item));
    });
    socket.on('message_deleted', (payload: { messageId: string }) => {
      setMessages((prev) => prev.map((item) => item.id === payload.messageId ? { ...item, content: 'This message was deleted.', isDeleted: true } : item));
    });
    socket.on('receive_call', (payload: IncomingCall) => {
      setIncomingCall(payload);
      setCallStatus(`Incoming ${payload.callType} call`);
      setActiveCallType(payload.callType);
      if (typeof window !== 'undefined' && window.innerWidth < 768) {
        setActiveSection('calls');
        setMobileSection('calls');
        setMobileChatOpen(false);
      }
    });
    // Legacy 1-to-1 accept_call (kept for backward compat)
    socket.on('accept_call', async (payload: { fromUserId: number; fromUsername?: string }) => {
      if (ringTimeoutRef.current) { clearTimeout(ringTimeoutRef.current); ringTimeoutRef.current = null; }
      if (payload.fromUserId === profile.userId) return;
      if (processedPeerIdsRef.current.has(payload.fromUserId)) return;
      const username = payload.fromUsername ?? `User ${payload.fromUserId}`;
      setCallStatus('Negotiating...');
      try {
        await ensureLocalStream(activeCallTypeRef.current);
        const peer = ensurePeer(payload.fromUserId, username);
        const isVideo = activeCallTypeRef.current === 'video';
        const offer = await peer.createOffer({ offerToReceiveAudio: true, offerToReceiveVideo: isVideo });
        await peer.setLocalDescription(offer);
        socket.emit('offer', { targetUserId: payload.fromUserId, sdp: offer });
      } catch { setCallStatus('Could not start call media'); }
    });

    socket.on('reject_call', (payload: { reason?: string }) => { cleanupCall(); setCallStatus(payload.reason ?? 'Call ended'); });

    // An existing participant creates an offer when a new user joins
    socket.on('user_joined_call', async (payload: { userId: number; username: string; callType: 'voice' | 'video' }) => {
      if (ringTimeoutRef.current) { clearTimeout(ringTimeoutRef.current); ringTimeoutRef.current = null; }
      const { userId, username } = payload;
      if (userId === profile.userId) return;
      if (processedPeerIdsRef.current.has(userId)) return;
      processedPeerIdsRef.current.add(userId);
      setCallStatus('Connecting...');
      try {
        await ensureLocalStream(activeCallTypeRef.current);
        await new Promise(resolve => setTimeout(resolve, 50));
        const peer = ensurePeer(userId, username);
        const isVideo = activeCallTypeRef.current === 'video';
        const offer = await peer.createOffer({ offerToReceiveAudio: true, offerToReceiveVideo: isVideo });
        await peer.setLocalDescription(offer);
        socket.emit('offer', { targetUserId: userId, sdp: offer });
      } catch { setCallStatus('Could not connect to ' + username); }
    });

    // Who's already in the call when we join
    socket.on('call_participants', (payload: { participants: { userId: number; username: string }[] }) => {
      if (ringTimeoutRef.current) { clearTimeout(ringTimeoutRef.current); ringTimeoutRef.current = null; }
      const myUserId = profile.userId;
      for (const { userId, username } of payload.participants) {
        if (userId === myUserId) continue;
        if (processedPeerIdsRef.current.has(userId)) continue;
        processedPeerIdsRef.current.add(userId);
        setCallPeers(prev => prev.some(p => p.userId === userId) ? prev : [...prev, { userId, username, stream: null }]);
      }
    });

    socket.on('user_left_call', (payload: { userId: number }) => { 
      if (payload.userId === profile.userId) return;
      removePeer(payload.userId); 
    });

    socket.on('offer', async (payload: { fromUserId: number; fromUsername?: string; sdp: RTCSessionDescriptionInit }) => {
      if (ringTimeoutRef.current) { clearTimeout(ringTimeoutRef.current); ringTimeoutRef.current = null; }
      if (payload.fromUserId === profile.userId) return;
      const { fromUserId, fromUsername, sdp } = payload;
      setCallStatus('Connecting...');
      try {
        await ensureLocalStream(activeCallTypeRef.current);
        await new Promise(resolve => setTimeout(resolve, 50));
        const peer = ensurePeer(fromUserId, fromUsername);
        await peer.setRemoteDescription(new RTCSessionDescription(sdp));
        const pending = pendingCandidatesRef.current.get(fromUserId) ?? [];
        for (const c of pending) { try { await peer.addIceCandidate(new RTCIceCandidate(c)); } catch { /* stale */ } }
        pendingCandidatesRef.current.delete(fromUserId);
        const answer = await peer.createAnswer();
        await peer.setLocalDescription(answer);
        socket.emit('answer', { targetUserId: fromUserId, sdp: answer });
        setCallStatus('In call');
        setCallStartedAt(prev => prev ?? Date.now());
      } catch { setCallStatus('Failed to answer call'); }
    });

    socket.on('answer', async (payload: { fromUserId: number; sdp: RTCSessionDescriptionInit }) => {
      if (payload.fromUserId === profile.userId) return;
      const { fromUserId, sdp } = payload;
      const peer = peersRef.current.get(fromUserId);
      if (!peer) return;
      try {
        await peer.setRemoteDescription(new RTCSessionDescription(sdp));
        const pending = pendingCandidatesRef.current.get(fromUserId) ?? [];
        for (const c of pending) { try { await peer.addIceCandidate(new RTCIceCandidate(c)); } catch { /* stale */ } }
        pendingCandidatesRef.current.delete(fromUserId);
        setCallStatus('In call');
        setCallStartedAt(prev => prev ?? Date.now());
      } catch { setCallStatus('Failed to finalize call'); }
    });

    socket.on('ice_candidate', async (payload: { fromUserId: number; candidate: RTCIceCandidateInit }) => {
      if (payload.fromUserId === profile.userId) return;
      const { fromUserId, candidate } = payload;
      const peer = peersRef.current.get(fromUserId);
      if (peer?.remoteDescription) {
        try { await peer.addIceCandidate(new RTCIceCandidate(candidate)); } catch { /* stale */ }
      } else {
        if (!pendingCandidatesRef.current.has(fromUserId)) pendingCandidatesRef.current.set(fromUserId, []);
        pendingCandidatesRef.current.get(fromUserId)!.push(candidate);
      }
    });
    socket.on('error', (message: string) => { setStatus(message); });
    socket.on('session_invalidated', () => { cleanupCall(); setSessionKicked(true); });
    socket.on('disconnect', () => { setStatus('Disconnected'); cleanupCall(); });
    socket.on('call_ended', (payload: { roomKey: string; reason?: string }) => { cleanupCall(); setCallStatus(payload.reason ?? 'Call ended'); });
    socket.on('group_created', async (payload: GroupSummary) => {
      setGroups((prev) => { if (prev.some((g) => g.key === payload.key)) return prev; return [...prev, payload]; });
      setRooms((prev) => { if (prev.some((r) => r.key === payload.key)) return prev; return [...prev, { key: payload.key, name: payload.name || payload.key, unread: 0, lastMessage: 'No messages yet' }]; });
    });
    socket.on('group_member_added', async () => {
      const mineResponse = await authFetch(`${API_URL}/groups/mine`);
      if (mineResponse.ok) {
        const mineData = (await mineResponse.json()) as GroupSummary[];
        setGroups(mineData);
        setRooms((prev) => {
          const dmRooms = prev.filter((r) => r.key.startsWith('dm_'));
          const groupKeys = new Set(mineData.map((g) => g.key));
          const updatedGroups = mineData.map((g) => {
            const existing = prev.find((r) => r.key === g.key);
            return { key: g.key, name: g.name || g.key, unread: existing?.unread ?? 0, lastMessage: existing?.lastMessage ?? 'No messages yet', lastAt: existing?.lastAt };
          });
          return [...dmRooms, ...updatedGroups].filter((r, i, self) => self.findIndex((x) => x.key === r.key) === i);
        });
      }
    });
    socket.on('group_member_removed', async () => {
      const mineResponse = await authFetch(`${API_URL}/groups/mine`);
      if (mineResponse.ok) {
        const mineData = (await mineResponse.json()) as GroupSummary[];
        setGroups(mineData);
        setRooms(prev => {
          const existingKeys = new Set(mineData.map(g => g.key));
          const filtered = prev.filter(r => existingKeys.has(r.key) || r.key.startsWith('dm_'));
          const updatedGroups = mineData.map((g) => {
            const existing = filtered.find(r => r.key === g.key);
            return { key: g.key, name: g.name || g.key, unread: existing?.unread ?? 0, lastMessage: existing?.lastMessage ?? 'No messages yet', lastAt: existing?.lastAt };
          });
          const dmRooms = filtered.filter(r => !mineData.some(g => g.key === r.key));
          return [...updatedGroups, ...dmRooms].filter((r, i, self) => self.findIndex((x) => x.key === r.key) === i);
        });
      }
    });
    return () => {
      cleanupCall();
      socket.removeAllListeners();
      socket.disconnect();
      socketRef.current = null;
    };
  }, [profile]);

  const openRoom = (roomKey: string) => { setActiveSection('chats'); setMobileSection('chats'); setMobileChatOpen(true); setActiveRoomKey(roomKey); setShowGroupInfo(false); setRooms((prev) => prev.map((room) => (room.key === roomKey ? { ...room, unread: 0 } : room))); socketRef.current?.emit('join_room', { roomKey }); };
  const togglePin = (roomKey: string) => { setPinnedRoomKeys((prev) => (prev.includes(roomKey) ? prev.filter((item) => item !== roomKey) : [roomKey, ...prev])); };
  const bumpRoomToTop = (roomKey: string) => {
    setRooms((prev) => {
      const target = prev.find((room) => room.key === roomKey);
      if (!target) return prev;
      return [target, ...prev.filter((room) => room.key !== roomKey)];
    });
  };

  const createGroup = async (data: { key: string; name: string; participantUsernames: string[] }) => {
    const key = data.key.trim().toLowerCase();
    if (!key) { setStatus('Group key is required'); return; }
    const participantUsernames = data.participantUsernames.filter((u, i, arr) => arr.indexOf(u) === i);
    const response = await authFetch(`${API_URL}/groups`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ key, name: data.name || undefined, participantUsernames }),
    });
    if (!response.ok) { setStatus('Could not create group'); return; }
    setIsCreateGroupModalOpen(false); setStatus(`Group ${key} created`);
    const mineResponse = await authFetch(`${API_URL}/groups/mine`);
    if (mineResponse.ok) { 
      const mineData = (await mineResponse.json()) as GroupSummary[]; 
      setGroups(mineData); 
      setRooms((prev) => {
        const dmRooms = prev.filter((r) => r.key.startsWith('dm_'));
        const updatedGroups = mineData.map((g) => ({ key: g.key, name: g.name || g.key, unread: 0, lastMessage: 'No messages yet' }));
        return [...dmRooms, ...updatedGroups];
      }); 
    }
    openRoom(key);
  };

  const addMember = async () => {
    const username = memberUsernameInput.trim();
    if (!username) return;
    const response = await authFetch(`${API_URL}/groups/${activeRoomKey}/users`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username }),
    });
    if (!response.ok) { setStatus('Could not add member'); return; }
    const payload = (await response.json()) as { participants: GroupParticipant[]; canManageMembers: boolean };
    setParticipants(dedupeParticipants(payload.participants)); setCanManageMembers(payload.canManageMembers); setMemberUsernameInput('');
  };

  const removeMember = async (username: string) => {
    const response = await authFetch(`${API_URL}/groups/${activeRoomKey}/users/${username}`, {
      method: 'DELETE',
    });
    if (!response.ok) { setStatus('Could not remove member'); return; }
    const payload = (await response.json()) as { participants: GroupParticipant[]; canManageMembers: boolean };
    setParticipants(dedupeParticipants(payload.participants)); setCanManageMembers(payload.canManageMembers);
  };

  const leaveGroup = async () => {
    if (!profile || activeRoomKey.startsWith('dm_')) return;
    const response = await authFetch(`${API_URL}/groups/${activeRoomKey}/users/${profile.username}`, {
      method: 'DELETE',
    });
    if (!response.ok) { setStatus('Could not leave group'); return; }
    setStatus('Left the group');
    setShowGroupInfo(false);
    // Navigate to general or first available room
    const availableRoom = rooms.find(r => r.key !== activeRoomKey && !r.key.startsWith('dm_'));
    if (availableRoom) {
      openRoom(availableRoom.key);
    } else {
      openRoom('general');
    }
  };

  const sendMessage = (event: FormEvent) => {
    event.preventDefault();
    if (!canSend || !socketRef.current || !profile) return;
    if (editingMessage) {
      socketRef.current.emit('edit_message', { messageId: editingMessage.id, content: draft.trim() });
      setEditingMessage(null); setDraft(''); return;
    }
    const tempId = `__temp__${Date.now()}`;
    const optimisticMsg: ChatMessage = {
      id: tempId,
      roomKey: activeRoomKey,
      sender: { userId: profile.userId, username: profile.username },
      content: draft.trim(),
      createdAt: new Date().toISOString(),
      receipts: [],
      reactions: [],
      replyTo: replyTo ? { id: replyTo.id, senderUsername: replyTo.sender.username, content: replyTo.content } : null,
    };
    pendingOptimisticsRef.current.push(tempId);
    setMessages((prev) => {
      // Server already confirmed this message before React flushed this update — skip adding the optimistic
      if (resolvedOptimisticsRef.current.has(tempId)) {
        resolvedOptimisticsRef.current.delete(tempId);
        return prev;
      }
      return [...prev, optimisticMsg];
    });
    socketRef.current.emit('send_message', { roomKey: activeRoomKey, content: draft, replyToMessageId: replyTo?.id });
    setDraft(''); setReplyTo(null); socketRef.current.emit('typing', { roomKey: activeRoomKey, isTyping: false });
  };

  const loadOlderMessages = async () => {
    if (!activeRoomKey || loadingMoreMessages || messages.length === 0) return;
    setLoadingMoreMessages(true);
    try {
      const oldestMessage = messages[0];
      const response = await authFetch(`${API_URL}/groups/${activeRoomKey}/messages?before=${encodeURIComponent(oldestMessage.createdAt)}&limit=50`);
      if (response.ok) {
        const olderMessages = (await response.json()) as ChatMessage[];
        if (olderMessages.length > 0) {
          setMessages(prev => [...olderMessages.reverse(), ...prev]);
          setHasMoreMessages(olderMessages.length === 50);
        } else {
          setHasMoreMessages(false);
        }
      }
    } catch {
      // Silently fail
    }
    setLoadingMoreMessages(false);
  };

  const handleDraftChange = (value: string) => {
    setDraft(value);
    if (!socketRef.current) return;
    socketRef.current.emit('typing', { roomKey: activeRoomRef.current, isTyping: true });
    if (typingDebounceRef.current) clearTimeout(typingDebounceRef.current);
    typingDebounceRef.current = setTimeout(() => socketRef.current?.emit('typing', { roomKey: activeRoomRef.current, isTyping: false }), 650);
  };

  const handleMentionInsert = (username: string) => { setDraft((current) => current.replace(/@([a-zA-Z0-9_]*)$/, `@${username} `)); };

  const uploadFile = async (file: File) => {
    if (!socketRef.current) { setStatus('Socket unavailable'); return; }
    if (file.size > CLIENT_MAX_FILE_BYTES) { setStatus('File exceeds 20MB limit'); return; }
    if (!['image/', 'video/', 'application/pdf'].some((t) => file.type.startsWith(t) || file.type === t)) { setStatus('Only image, video, and PDF are allowed'); return; }
    const formData = new FormData(); formData.append('file', file);
    setUploadState('uploading'); setUploadProgress(15);
    try {
      const response = await authFetch(`${API_URL}/files/upload`, { method: 'POST', body: formData });
      setUploadProgress(85);
      if (!response.ok) { setStatus('Upload failed'); return; }
      const uploaded = (await response.json()) as UploadedFileResponse;
      socketRef.current.emit('send_message', { roomKey: activeRoomKey, content: encodeAttachmentMessage(uploaded) });
      setUploadProgress(100);
    } catch { setStatus('Upload failed'); }
    finally { setTimeout(() => { setUploadState('idle'); setUploadProgress(0); }, 250); if (fileInputRef.current) fileInputRef.current.value = ''; }
  };

  const onReact = useCallback((messageId: string, emoji: string) => { socketRef.current?.emit('add_reaction', { messageId, emoji }); }, []);
  const onReply = useCallback((message: ChatMessage) => { setReplyTo(message); setEditingMessage(null); }, []);
  const onStartEdit = useCallback((message: ChatMessage) => { setEditingMessage(message); setReplyTo(null); setDraft(message.content); }, []);
  const onDelete = useCallback((message: ChatMessage) => { socketRef.current?.emit('delete_message', { messageId: message.id }); }, []);

  const updateStatus = (status: UserStatus) => {
    setUserStatus(status);
    socketRef.current?.emit('update_status', { status });
  };

  const ensureDirectRoomForTarget = async (targetUserId: number, targetUsername: string) => {
    if (!profile) return null;
    const roomKey = `dm_${Math.min(targetUserId, profile.userId)}_${Math.max(targetUserId, profile.userId)}`;
    const exists = rooms.some((r) => r.key === roomKey);

    if (!exists) {
      const createResponse = await authFetch(`${API_URL}/groups`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key: roomKey, name: targetUsername, participantUsernames: [targetUsername] }),
      });
      if (!createResponse.ok) return null;

      const mineResponse = await authFetch(`${API_URL}/groups/mine`);
      if (mineResponse.ok) {
        const mineData = (await mineResponse.json()) as GroupSummary[];
        setGroups(mineData);
        setRooms((prev) => {
          const dmRooms = prev.filter((r) => r.key.startsWith('dm_'));
          const groupKeys = new Set(mineData.map((g) => g.key));
          const nonDmRooms = prev.filter((r) => !r.key.startsWith('dm_') && groupKeys.has(r.key));
          const updatedGroups = mineData.map((g) => {
            const existingRoom = prev.find((r) => r.key === g.key);
            return {
              key: g.key,
              name: g.name || g.key,
              unread: existingRoom?.unread ?? 0,
              lastMessage: existingRoom?.lastMessage ?? 'No messages yet',
              lastAt: existingRoom?.lastAt,
            };
          });
          return [...dmRooms, ...updatedGroups];
        });
      }
    }

    return roomKey;
  };

  const handleVoiceCall = async (userId: number, username: string) => {
    if (!socketRef.current) { setCallStatus('Socket not connected'); return; }
    if (isCallActive || incomingCall) {
      setCallStatus('Already in a call');
      return;
    }
    let roomKey = activeRoomRef.current;
    if (activeSection === 'contacts') {
      const dmRoom = await ensureDirectRoomForTarget(userId, username);
      if (!dmRoom) {
        setCallStatus('Could not prepare direct call room');
        return;
      }
      roomKey = dmRoom;
      setActiveRoomKey(dmRoom);
      activeRoomRef.current = dmRoom;
      socketRef.current.emit('join_room', { roomKey: dmRoom });
    }
    bumpRoomToTop(roomKey);

    cleanupCall();
    setActiveCallType('voice');
    activeCallTypeRef.current = 'voice';
    
    await new Promise(resolve => setTimeout(resolve, 50));
    
    ensureLocalStream('voice').then(() => {
      setActiveCallRoomKey(roomKey); activeCallRoomKeyRef.current = roomKey;
      setIsCallActive(true);
      setCallStatus(`Calling...`);
      socketRef.current!.emit('group_call_start', { roomKey, callType: 'voice' });
      socketRef.current!.emit('join_group_call', { roomKey, callType: 'voice' });
      if (ringTimeoutRef.current) clearTimeout(ringTimeoutRef.current);
      ringTimeoutRef.current = setTimeout(() => {
        if (ringTimeoutRef.current) {
          ringTimeoutRef.current = null;
          endCall();
          setCallStatus('No answer');
        }
      }, 30000);
    }).catch(() => { cleanupCall(); setCallStatus('Could not access media devices'); });
  };

  const handleVideoCall = async (userId: number, username: string) => {
    if (!socketRef.current) { setCallStatus('Socket not connected'); return; }
    if (isCallActive || incomingCall) {
      setCallStatus('Already in a call');
      return;
    }
    let roomKey = activeRoomRef.current;
    if (activeSection === 'contacts') {
      const dmRoom = await ensureDirectRoomForTarget(userId, username);
      if (!dmRoom) {
        setCallStatus('Could not prepare direct call room');
        return;
      }
      roomKey = dmRoom;
      setActiveRoomKey(dmRoom);
      activeRoomRef.current = dmRoom;
      socketRef.current.emit('join_room', { roomKey: dmRoom });
    }
    bumpRoomToTop(roomKey);

    cleanupCall();
    setActiveCallType('video');
    activeCallTypeRef.current = 'video';
    
    await new Promise(resolve => setTimeout(resolve, 50));
    
    ensureLocalStream('video').then(() => {
      setActiveCallRoomKey(roomKey); activeCallRoomKeyRef.current = roomKey;
      setIsCallActive(true);
      setCallStatus(`Calling...`);
      socketRef.current!.emit('group_call_start', { roomKey, callType: 'video' });
      socketRef.current!.emit('join_group_call', { roomKey, callType: 'video' });
      if (ringTimeoutRef.current) clearTimeout(ringTimeoutRef.current);
      ringTimeoutRef.current = setTimeout(() => {
        if (ringTimeoutRef.current) {
          ringTimeoutRef.current = null;
          endCall();
          setCallStatus('No answer');
        }
      }, 30000);
    }).catch(() => { cleanupCall(); setCallStatus('Could not access media devices'); });
  };

  const handleContactClick = async (userId: number, username: string) => {
    if (!profile) return;
    const roomKey = `dm_${Math.min(userId, profile.userId)}_${Math.max(userId, profile.userId)}`;
    
    // Open the room immediately (optimistic update)
    activeRoomRef.current = roomKey;
    setActiveSection('chats');
    setMobileSection('chats');
    setMobileChatOpen(true);
    setActiveRoomKey(roomKey);
    setMessages([]); // Clear messages while loading
    
    // Ensure room exists in local state (use callback to avoid stale state)
    setRooms(prev => {
      if (prev.some(r => r.key === roomKey)) return prev;
      return [...prev, { key: roomKey, name: username, unread: 0, lastMessage: 'No messages yet' }];
    });
    
    // If room doesn't exist on server, create it (do this after state update)
    try {
      const response = await authFetch(`${API_URL}/groups/${roomKey}`);
      if (response.status === 404) {
        await authFetch(`${API_URL}/groups`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ key: roomKey, name: username, participantUsernames: [username] }),
        });
      }
    } catch (err) {
      console.error('Failed to ensure DM room exists', err);
    }
    
    socketRef.current?.emit('join_room', { roomKey });
  };

  const acceptCall = async () => {
    if (!incomingCall || !socketRef.current) return;
    if (isCallActive) {
      setCallStatus('Already in a call');
      socketRef.current.emit('reject_call', { targetUserId: incomingCall.fromUserId, reason: 'Busy' });
      setIncomingCall(null);
      return;
    }
    cleanupCall();
    try {
      await ensureLocalStream(incomingCall.callType);
      setActiveCallType(incomingCall.callType);
      activeCallTypeRef.current = incomingCall.callType;
      const roomKey = incomingCall.roomKey;
      setActiveCallRoomKey(roomKey); activeCallRoomKeyRef.current = roomKey;
      setIsCallActive(true);
      setCallStatus('Joining call...');
      bumpRoomToTop(roomKey);
      setIncomingCall(null);
      socketRef.current.emit('join_group_call', { roomKey, callType: incomingCall.callType });
    } catch { cleanupCall(); setCallStatus('Could not access media'); }
  };

  const rejectCall = () => {
    if (!incomingCall || !socketRef.current) return;
    socketRef.current.emit('reject_call', { targetUserId: incomingCall.fromUserId, reason: 'Call rejected' });
    setIncomingCall(null); setCallStatus('Call rejected');
  };

  const endCall = () => {
    const roomKey = activeCallRoomKeyRef.current;
    if (socketRef.current && roomKey) {
      socketRef.current.emit('leave_group_call', { roomKey });
    }
    if (callStartedAt && callPeers.length > 0) {
      const duration = Math.floor((Date.now() - callStartedAt) / 1000);
      callPeers.forEach(peer => {
        const newCall: CallHistoryItem = {
          id: `call_${Date.now()}_${peer.userId}`,
          peerUserId: peer.userId,
          peerUsername: peer.username,
          callType: activeCallType,
          callStatus: duration > 0 ? 'completed' : 'missed',
          duration,
          createdAt: new Date().toISOString(),
        };
        setCallHistory(prev => [newCall, ...prev].slice(0, 50));
      });
    }
    cleanupCall();
    setCallStartedAt(null);
    setCallStatus('Call ended');
  };

  const toggleMute = () => {
    if (!localStreamRef.current) return;
    const next = !isMuted; localStreamRef.current.getAudioTracks().forEach((t) => { t.enabled = !next; }); setIsMuted(next);
  };

  const toggleCamera = () => {
    if (!localStreamRef.current) return;
    const next = !isCameraOff; localStreamRef.current.getVideoTracks().forEach((t) => { t.enabled = !next; }); setIsCameraOff(next);
  };

  const toggleScreenShare = async () => {
    if (peersRef.current.size === 0 || !localStreamRef.current) return;
    try {
      if (!isScreenSharing) {
        const displayStream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: false });
        displayStreamRef.current = displayStream;
        const displayTrack = displayStream.getVideoTracks()[0];
        for (const peer of Array.from(peersRef.current.values())) {
          const sender = peer.getSenders().find((s: RTCRtpSender) => s.track?.kind === 'video');
          await sender?.replaceTrack(displayTrack);
        }
        if (localVideoRef.current) localVideoRef.current.srcObject = displayStream;
        setLocalStream(displayStream);
        displayTrack.onended = async () => {
          const fallback = cameraTrackRef.current;
          for (const peer of Array.from(peersRef.current.values())) {
            const sender = peer.getSenders().find((s: RTCRtpSender) => s.track?.kind === 'video');
            if (fallback) await sender?.replaceTrack(fallback);
          }
          if (displayStreamRef.current) {
            displayStreamRef.current.getTracks().forEach(t => t.stop());
            displayStreamRef.current = null;
          }
          if (localStreamRef.current && localVideoRef.current) localVideoRef.current.srcObject = localStreamRef.current;
          setLocalStream(localStreamRef.current);
          setIsScreenSharing(false);
        };
        setIsScreenSharing(true);
      } else {
        if (displayStreamRef.current) {
          displayStreamRef.current.getTracks().forEach(t => t.stop());
          displayStreamRef.current = null;
        }
        const fallback = cameraTrackRef.current;
        for (const peer of Array.from(peersRef.current.values())) {
          const sender = peer.getSenders().find((s: RTCRtpSender) => s.track?.kind === 'video');
          if (fallback) await sender?.replaceTrack(fallback);
        }
        if (localStreamRef.current && localVideoRef.current) localVideoRef.current.srcObject = localStreamRef.current;
        if (localStreamRef.current) setLocalStream(localStreamRef.current);
        setIsScreenSharing(false);
      }
    } catch { setStatus('Screen share unavailable'); }
  };

  const roleBadgeClass = (role: GroupParticipant['role']) => {
    if (role === 'owner') return 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300';
    if (role === 'admin') return 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/40 dark:text-indigo-300';
    return 'bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-300';
  };

  const handleTouchStart = (event: TouchEvent) => { touchStartX.current = event.touches[0]?.clientX ?? null; };
  const handleTouchEnd = (event: TouchEvent) => {
    const start = touchStartX.current; if (start === null) return;
    const endX = event.changedTouches[0]?.clientX ?? start;
    if (endX - start > 65) setMobileChatOpen(false);
    touchStartX.current = null;
  };

  const SECTION_ORDER: AppSection[] = ['chats', 'calls', 'contacts', 'meetings', 'settings'];

  const goToSection = (section: AppSection) => {
    if (section !== 'settings') setShowSettings(false);
    if (section === activeSection) return;
    const fromIdx = SECTION_ORDER.indexOf(activeSection);
    const toIdx = SECTION_ORDER.indexOf(section);
    setSlideDir(toIdx > fromIdx ? 1 : -1);
    setPrevSection(activeSection);
    setActiveSection(section);
    // Clear prevSection after the transition finishes so it stops rendering
    setTimeout(() => setPrevSection(null), 320);
  };

  useEffect(() => {
    if (activeSection !== 'settings' && showSettings) {
      setShowSettings(false);
    }
  }, [activeSection, showSettings]);

  const openSectionFromNavMenu = (section: AppSection) => {
    goToSection(section);
    setMobileSection(section);
    setMobileChatOpen(false);
    setIsNavModalOpen(false);
  };

  const handleLogout = async () => {
    await authFetch(`${API_URL}/auth/logout`, { method: 'POST' }).catch(() => undefined);
    clearAuthTokenCookie();
    window.location.href = '/login';
  };

  if (!profile) {
    return (
      <main className={`min-h-screen flex items-center justify-center ${darkMode ? 'bg-slate-950' : 'bg-slate-100'}`}>
        <div className={`text-center p-8 rounded-2xl border ${darkMode ? 'border-slate-800 bg-slate-900' : 'border-slate-200 bg-white'} shadow-xl`}>
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-600 to-cyan-500 flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
          <h1 className="text-xl font-semibold mb-2">Secure Messaging</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">{status}</p>
          <Link href="/login" className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 text-white font-medium px-4 py-2.5 transition-all">
            Go to Login
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3" />
            </svg>
          </Link>
        </div>
      </main>
    );
  }

  /* ── Session kicked overlay ──────────────────────────────────────────── */
  if (sessionKicked) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950 px-4">
        <div className="w-full max-w-sm text-center">
          {/* Animated icon */}
          <div className="mx-auto mb-6 w-20 h-20 rounded-full bg-rose-500/10 border-2 border-rose-500/30 flex items-center justify-center">
            <svg className="w-10 h-10 text-rose-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15m3 0l3-3m0 0l-3-3m3 3H9" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-white mb-2">You've been signed out</h2>
          <p className="text-slate-400 text-sm leading-relaxed mb-8">
            Your account was signed in on another device or browser, so this session has been ended.
          </p>
          <Link
            href="/login"
            className="inline-flex items-center justify-center gap-2 w-full rounded-xl bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-blue-500/25 transition-all active:scale-[0.98]"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M11 16l-4-4m0 0l4-4m-4 4h14" /></svg>
            Back to Login
          </Link>
        </div>
      </div>
    );
  }

  return (
    <main className={`${darkMode ? 'dark' : ''}`}>
      <div className={`h-[calc(100vh-60px)] md:h-screen w-full ${darkMode ? 'bg-slate-950 text-slate-100' : 'bg-slate-200 text-slate-900'}`}>
        <div className="flex h-full">
          {/* Left nav sidebar — always visible on desktop */}
          <Sidebar
            collapsed={false}
            activeSection={activeSection}
            unreadCount={unreadTotal}
            onToggleCollapsed={() => {}}
            onSelectSection={(section) => {
              goToSection(section);
              setMobileSection(section);
              if (section !== 'chats') setMobileChatOpen(false);
            }}
            darkMode={darkMode}
            onToggleDarkMode={() => setDarkMode(!darkMode)}
            profile={profile ?? { userId: 0, username: '', role: 'user' }}
            userStatus={userStatus}
            onProfileClick={() => {
              goToSection('settings');
              setMobileSection('settings');
              setMobileChatOpen(false);
            }}
          />

          {/* ── Desktop sliding middle panel (360px) ─────────────────────── */}
          {(() => {
            const PANELS: AppSection[] = ['chats', 'calls', 'contacts', 'settings', 'meetings'];
            // For each panel: active → 0, leaving (prev) → exit direction, everything else → hidden off-screen (no transition)
            const panelStyle = (panel: AppSection): React.CSSProperties => {
              if (panel === activeSection) {
                return { transform: 'translateX(0%)', transition: 'transform 300ms cubic-bezier(0.4,0,0.2,1)' };
              }
              if (panel === prevSection) {
                // slide out opposite to where the new panel came from
                return { transform: `translateX(${-slideDir * 100}%)`, transition: 'transform 300ms cubic-bezier(0.4,0,0.2,1)' };
              }
              // Idle panels: park them off-screen (same side as their eventual entry) with no transition
              const panelIdx = PANELS.indexOf(panel);
              const activeIdx = PANELS.indexOf(activeSection);
              const side = panelIdx > activeIdx ? 1 : -1;
              return { transform: `translateX(${side * 100}%)`, transition: 'none' };
            };
            const panelCls = 'absolute inset-0 h-full will-change-transform overflow-hidden';
            return (
              <div className={`hidden md:block relative w-[360px] shrink-0 overflow-hidden border-r ${darkMode ? 'border-white/5' : 'border-slate-200'}`}>
                {/* Chats */}
                <div className={panelCls} style={panelStyle('chats')}>
                  <ChatList
                    rooms={rooms}
                    activeRoomKey={activeRoomKey}
                    searchQuery={searchQuery}
                    onSearchQueryChange={setSearchQuery}
                    onOpenRoom={openRoom}
                    pinnedRoomKeys={pinnedRoomKeys}
                    onTogglePin={togglePin}
                    onOpenCreateGroup={() => setIsCreateGroupModalOpen(true)}
                    onOpenNavMenu={() => setIsNavModalOpen(true)}
                    darkMode={darkMode}
                  />
                </div>
                {/* Calls */}
                <div className={panelCls} style={panelStyle('calls')}>
                  <CallsPanel
                    callHistory={callHistory}
                    darkMode={darkMode}
                    onStartVoiceCall={handleVoiceCall}
                    onStartVideoCall={handleVideoCall}
                  />
                </div>
                {/* Contacts */}
                <div className={panelCls} style={panelStyle('contacts')}>
                  <ContactsPanel
                    apiUrl={API_URL}
                    onlineUsers={onlineUsers}
                    allUsers={allUsers}
                    searchQuery={contactSearchQuery}
                    onSearchQueryChange={setContactSearchQuery}
                    onStartVoiceCall={handleVoiceCall}
                    onStartVideoCall={handleVideoCall}
                    onContactClick={handleContactClick}
                    darkMode={darkMode}
                    currentUserId={profile?.userId ?? 0}
                  />
                </div>
                {/* Settings — profile overview in middle panel */}
                <div className={panelCls} style={panelStyle('settings')}>
                  <ProfileView
                    profile={profile ?? { userId: 0, username: '', role: 'user' }}
                    darkMode={darkMode}
                    onOpenSettings={() => setShowSettings(true)}
                    onLogout={handleLogout}
                  />
                </div>
                {/* Meetings */}
                <div className={panelCls} style={panelStyle('meetings')}>
                  <MeetingsPanel darkMode={darkMode} />
                </div>
              </div>
            );
          })()}

          {/* ── Right area ────────────────────────────────────────────────── */}
          <div className="relative flex-1 flex overflow-hidden" onTouchStart={handleTouchStart} onTouchEnd={handleTouchEnd}>

            {/* Mobile-only: non-chat section full-screen views with sliding animation */}
            {activeSection !== 'chats' && (
              <div className={`flex md:hidden absolute inset-0 z-10 flex-col ${
                mobileTransitioning
                  ? slideDir === 1
                    ? 'animate-slide-in-right'
                    : 'animate-slide-in-left'
                  : ''
              }`}>
                {activeSection === 'contacts' ? (
                  <ContactsPanel
                    apiUrl={API_URL}
                    onlineUsers={onlineUsers}
                    allUsers={allUsers}
                    searchQuery={contactSearchQuery}
                    onSearchQueryChange={setContactSearchQuery}
                    onStartVoiceCall={handleVoiceCall}
                    onStartVideoCall={handleVideoCall}
                    onContactClick={handleContactClick}
                    darkMode={darkMode}
                    currentUserId={profile?.userId ?? 0}
                  />
                ) : activeSection === 'meetings' ? (
                  <MeetingsPanel darkMode={darkMode} />
                ) : activeSection === 'settings' ? (
                  <div className="relative h-full overflow-hidden">
                    <div
                      className={`absolute inset-0 transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] ${
                        showSettings
                          ? '-translate-x-8 opacity-0 pointer-events-none'
                          : 'translate-x-0 opacity-100'
                      }`}
                    >
                      <ProfileView
                        profile={profile ?? { userId: 0, username: '', role: 'user' }}
                        darkMode={darkMode}
                        onOpenSettings={() => setShowSettings(true)}
                        onLogout={handleLogout}
                      />
                    </div>
                    <div
                      className={`absolute inset-0 transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] ${
                        showSettings
                          ? 'translate-x-0 opacity-100'
                          : 'translate-x-full opacity-0 pointer-events-none'
                      }`}
                    >
                      <SettingsView
                        darkMode={darkMode}
                        onToggleDarkMode={() => setDarkMode(!darkMode)}
                        onBack={() => setShowSettings(false)}
                        profile={profile ?? { username: '', userId: 0, role: 'user' }}
                        userStatus={userStatus}
                        onStatusChange={updateStatus}
                        onUsernameChange={(newUsername) => setProfile((p) => p ? { ...p, username: newUsername } : p)}
                        apiUrl={API_URL}
                      />
                    </div>
                  </div>
                ) : activeSection === 'calls' ? (
                  <CallsPanel
                    callHistory={callHistory}
                    darkMode={darkMode}
                    onStartVoiceCall={handleVoiceCall}
                    onStartVideoCall={handleVideoCall}
                  />
                ) : null}
              </div>
            )}

            {/* Desktop settings overlay — slides in over the ChatWindow */}
            <div
              className={`hidden md:flex absolute inset-0 z-20 flex-col transform transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] will-change-transform ${
                showSettings
                  ? 'translate-x-0 opacity-100'
                  : 'translate-x-full opacity-0 pointer-events-none'
              }`}
            >
              <SettingsView
                darkMode={darkMode}
                onToggleDarkMode={() => setDarkMode(!darkMode)}
                onBack={() => setShowSettings(false)}
                profile={profile ?? { username: '', userId: 0, role: 'user' }}
                userStatus={userStatus}
                onStatusChange={updateStatus}
                onUsernameChange={(newUsername) => setProfile((p) => p ? { ...p, username: newUsername } : p)}
                apiUrl={API_URL}
              />
            </div>

            {/* Chat area: desktop = always flex, mobile = only when section=chats */}
            <div className={`${activeSection !== 'chats' ? 'hidden md:flex' : 'flex'} flex-1 flex-col overflow-hidden`}>
              {/* Mobile chat list – shown on small screens when no conversation is open */}
              <div className={`${!mobileChatOpen ? 'flex' : 'hidden'} h-full flex-col md:hidden`}>
                <ChatList
                  rooms={rooms}
                  activeRoomKey={activeRoomKey}
                  searchQuery={searchQuery}
                  onSearchQueryChange={setSearchQuery}
                  onOpenRoom={openRoom}
                  pinnedRoomKeys={pinnedRoomKeys}
                  onTogglePin={togglePin}
                  onOpenCreateGroup={() => setIsCreateGroupModalOpen(true)}
                  onOpenNavMenu={() => setIsNavModalOpen(true)}
                  darkMode={darkMode}
                />
              </div>

              {/* ChatWindow: desktop always, mobile when chat open */}
              <div className={`${mobileChatOpen ? 'flex animate-slide-in-right' : 'hidden'} md:flex flex-1 flex-col overflow-hidden`}>
                  <ChatWindow
                    profile={profile}
                    roomTitle={activeRoomName}
                    roomStatus={status}
                    darkMode={darkMode}
                    onBack={() => setMobileChatOpen(false)}
                    messages={messages}
                    participants={participants}
                    typingIndicator={typingIndicator}
                    messageEndRef={messageEndRef}
                    onReact={onReact}
                    onReply={onReply}
                    onStartEdit={onStartEdit}
                    onDelete={onDelete}
                    hasMoreMessages={hasMoreMessages}
                    loadingMoreMessages={loadingMoreMessages}
                    onLoadMore={loadOlderMessages}
                    headerActions={
                      <>
                        {(() => {
                          const others = participants.filter(p => p.userId !== profile.userId);
                          if (others.length === 0) return null;
                          const isGroup = others.length > 1;
                          const callTarget = others[0];
                          return (
                            <div className="flex items-center gap-0.5 md:gap-1">
                              <button
                                type="button"
                                onClick={() => handleVoiceCall(callTarget.userId, callTarget.username)}
                                className={`p-1.5 md:p-2 rounded-full transition-colors ${darkMode ? 'text-[#aebac1] hover:bg-[#2a3942]' : 'text-[#54656f] hover:bg-slate-100'}`}
                                title={isGroup ? 'Start group voice call' : `Voice call ${callTarget.username}`}
                              >
                                <svg className="w-4 h-4 md:w-5 md:h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                                </svg>
                              </button>
                              <button
                                type="button"
                                onClick={() => isGroup ? setShowMeetingPrompt(true) : handleVideoCall(callTarget.userId, callTarget.username)}
                                className={`p-1.5 md:p-2 rounded-full transition-colors ${darkMode ? 'text-[#aebac1] hover:bg-[#2a3942]' : 'text-[#54656f] hover:bg-slate-100'}`}
                                title={isGroup ? 'Join meeting' : `Video call ${callTarget.username}`}
                              >
                                <svg className="w-4 h-4 md:w-5 md:h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                </svg>
                              </button>
                            </div>
                          );
                        })()}
                        {/* Info button - show for all chats */}
                        <button
                          type="button"
                          onClick={() => setShowGroupInfo((v) => !v)}
                          className={`p-2 rounded-full transition-colors ${showGroupInfo ? (darkMode ? 'bg-[#2a3942] text-[#00a884]' : 'bg-slate-100 text-[#00a884]') : (darkMode ? 'text-[#aebac1] hover:bg-[#2a3942]' : 'text-[#54656f] hover:bg-slate-100')}`}
                          title={activeRoomKey.startsWith('dm_') ? 'Chat info' : 'Group info'}
                        >
                          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                        </button>
                      </>
                    }
                    composer={
                      <div>
                        {/* Reply banner */}
                        {replyTo && (
                          <div className={`mb-2 flex items-center gap-2 rounded-xl border px-3 py-2 text-xs ${darkMode ? 'border-blue-500/20 bg-blue-500/8 text-blue-300' : 'border-blue-200 bg-blue-50 text-blue-700'}`}>
                            <svg className="w-3.5 h-3.5 flex-shrink-0 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
                            </svg>
                            <p className="flex-1 truncate">Replying to <span className="font-semibold">{replyTo.sender.username}</span></p>
                            <button type="button" onClick={() => setReplyTo(null)} className="flex-shrink-0 p-0.5 rounded hover:opacity-70">
                              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                              </svg>
                            </button>
                          </div>
                        )}
                        {/* Edit banner */}
                        {editingMessage && (
                          <div className={`mb-2 flex items-center gap-2 rounded-xl border px-3 py-2 text-xs ${darkMode ? 'border-amber-500/20 bg-amber-500/8 text-amber-300' : 'border-amber-200 bg-amber-50 text-amber-700'}`}>
                            <svg className="w-3.5 h-3.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                            <p className="flex-1">Editing message</p>
                            <button type="button" onClick={() => { setEditingMessage(null); setDraft(''); }} className="flex-shrink-0 p-0.5 rounded hover:opacity-70">
                              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                              </svg>
                            </button>
                          </div>
                        )}
                        {/* Input row */}
                        <form className="flex items-end gap-2" onSubmit={sendMessage}>
                          <input ref={fileInputRef} type="file" className="hidden" accept="image/*,video/*,application/pdf" onChange={(e) => { const file = e.target.files?.[0]; if (file) uploadFile(file); }} />
                          <button
                            type="button"
                            onClick={() => fileInputRef.current?.click()}
                            className={`w-10 h-10 flex-shrink-0 flex items-center justify-center rounded-xl border transition-colors ${darkMode ? 'border-slate-700/80 bg-slate-900 text-slate-400 hover:text-slate-200 hover:bg-slate-800' : 'border-slate-200 bg-white text-slate-500 hover:text-slate-700 hover:bg-slate-50'}`}
                          >
                            <svg className="w-4.5 h-4.5" style={{width:'18px',height:'18px'}} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                            </svg>
                          </button>
                          <div className="relative flex-1">
                            <input
                              value={draft}
                              onChange={(e) => handleDraftChange(e.target.value)}
                              placeholder="Type a secure message..."
                              className={`w-full rounded-xl border px-4 py-2.5 text-sm outline-none transition-all ${darkMode ? 'border-slate-700/80 bg-slate-900 text-slate-100 placeholder:text-slate-600 focus:border-blue-500/60 focus:ring-2 focus:ring-blue-500/10' : 'border-slate-200 bg-white text-slate-800 placeholder:text-slate-400 focus:border-blue-400 focus:ring-2 focus:ring-blue-500/10'}`}
                            />
                            {mentionCandidates.length > 0 && (
                              <div className={`absolute bottom-full left-0 w-56 mb-2 rounded-xl border shadow-2xl overflow-hidden ${darkMode ? 'border-slate-700 bg-slate-900' : 'border-slate-200 bg-white'}`}>
                                {mentionCandidates.map((candidate) => (
                                  <button key={candidate.userId} type="button" onClick={() => handleMentionInsert(candidate.username)} className={`flex items-center gap-2 w-full px-3 py-2.5 text-left text-sm transition-colors ${darkMode ? 'hover:bg-slate-800' : 'hover:bg-slate-50'}`}>
                                    <span className={`w-6 h-6 rounded-lg flex items-center justify-center text-xs font-bold text-white bg-gradient-to-br from-blue-500 to-indigo-600 flex-shrink-0`}>
                                      {candidate.username.charAt(0).toUpperCase()}
                                    </span>
                                    <span className="font-medium">@{candidate.username}</span>
                                  </button>
                                ))}
                              </div>
                            )}
                          </div>
                          <button
                            type="submit"
                            disabled={!canSend}
                            className={`w-10 h-10 flex-shrink-0 flex items-center justify-center rounded-xl transition-all active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed ${canSend ? 'bg-blue-600 hover:bg-blue-500 text-white shadow-md shadow-blue-500/20' : darkMode ? 'bg-slate-800 text-slate-600' : 'bg-slate-100 text-slate-400'}`}
                          >
                            <svg className="w-4.5 h-4.5" style={{width:'18px',height:'18px'}} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                            </svg>
                          </button>
                        </form>
                        {/* Upload progress */}
                        {uploadState === 'uploading' && (
                          <div className={`mt-2 h-1 w-full overflow-hidden rounded-full ${darkMode ? 'bg-slate-800' : 'bg-slate-200'}`}>
                            <div className="h-full rounded-full bg-blue-600 transition-all duration-300" style={{ width: `${uploadProgress}%` }} />
                          </div>
                        )}
                      </div>
                    }
                  />
                </div>

                {/* Group info / settings slide-in panel - only show for groups, not DMs */}
                <div
                  className={`hidden md:flex flex-col w-72 border-l shrink-0 overflow-hidden absolute right-0 top-0 bottom-0 transform transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] ${
                    showGroupInfo
                      ? 'translate-x-0 opacity-100'
                      : 'translate-x-full opacity-0 pointer-events-none'
                  } ${darkMode ? 'border-white/5 bg-[#111b21]' : 'border-slate-200 bg-white'}`}
                >
                    {/* Panel header */}
                    <div className={`flex items-center gap-3 px-4 py-4 border-b ${darkMode ? 'border-white/5 bg-[#202c33]' : 'border-slate-100 bg-[#f0f2f5]'}`}>
                      <button
                        type="button"
                        onClick={() => setShowGroupInfo(false)}
                        className={`p-1 rounded-full transition-colors ${darkMode ? 'text-[#aebac1] hover:bg-[#2a3942]' : 'text-[#54656f] hover:bg-slate-100'}`}
                      >
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                      <h3 className={`text-sm font-semibold ${darkMode ? 'text-[#e9edef]' : 'text-[#111b21]'}`}>
                        {activeRoomKey.startsWith('dm_') ? 'Chat Info' : 'Group Info'}
                      </h3>
                    </div>

                    {/* DM: User info */}
                    {activeRoomKey.startsWith('dm_') ? (
                      <>
                        {/* User avatar + name */}
                        <div className={`flex flex-col items-center py-6 px-4 border-b ${darkMode ? 'border-white/5 bg-[#202c33]' : 'border-slate-100 bg-[#f0f2f5]'}`}>
                          <div className={`w-20 h-20 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-2xl font-bold text-white mb-3`}>
                            {activeRoomName.charAt(0).toUpperCase()}
                          </div>
                          <p className={`text-base font-semibold ${darkMode ? 'text-[#e9edef]' : 'text-[#111b21]'}`}>{activeRoomName}</p>
                          <p className={`text-xs mt-0.5 ${darkMode ? 'text-[#8696a0]' : 'text-[#667781]'}`}>Direct Message</p>
                        </div>

                        {/* Delete chat option */}
                        <div className="flex-1 overflow-y-auto">
                          <div className={`px-4 py-3 ${darkMode ? 'text-[#8696a0]' : 'text-[#667781]'}`}>
                            <span className="text-[11px] font-bold uppercase tracking-widest">Options</span>
                          </div>
                          <div className={`px-4 py-2.5 ${darkMode ? 'text-[#8696a0]' : 'text-[#667781]'}`}>
                            <p className={`text-xs ${darkMode ? 'text-[#8696a0]' : 'text-[#667781]'}`}>Delete this chat from your list. Messages will not be deleted for the other person.</p>
                          </div>
                        </div>

                        {/* Delete chat button */}
                        <div className={`p-4 border-t ${darkMode ? 'border-white/5' : 'border-slate-100'}`}>
                          <button
                            type="button"
                            onClick={() => {
                              setRooms(prev => prev.filter(r => r.key !== activeRoomKey));
                              setShowGroupInfo(false);
                              setActiveRoomKey('');
                              setMessages([]);
                            }}
                            className={`w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold border transition-colors ${
                              darkMode
                                ? 'border-rose-500/30 text-rose-400 hover:bg-rose-500/10'
                                : 'border-rose-200 text-rose-600 hover:bg-rose-50'
                            }`}
                          >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                            Delete Chat
                          </button>
                        </div>
                      </>
                    ) : (
                      <>
                        {/* Group avatar + name */}
                        <div className={`flex flex-col items-center py-6 px-4 border-b ${darkMode ? 'border-white/5 bg-[#202c33]' : 'border-slate-100 bg-[#f0f2f5]'}`}>
                          <div className={`w-20 h-20 rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-2xl font-bold text-white mb-3`}>
                            {activeRoomName.charAt(0).toUpperCase()}
                          </div>
                          <p className={`text-base font-semibold ${darkMode ? 'text-[#e9edef]' : 'text-[#111b21]'}`}>{activeRoomName}</p>
                          <p className={`text-xs mt-0.5 ${darkMode ? 'text-[#8696a0]' : 'text-[#667781]'}`}>{participants.length} member{participants.length !== 1 ? 's' : ''}</p>
                        </div>

                        {/* Members list */}
                        <div className="flex-1 overflow-y-auto">
                          <div className={`px-4 py-3 ${darkMode ? 'text-[#8696a0]' : 'text-[#667781]'}`}>
                            <span className="text-[11px] font-bold uppercase tracking-widest">{participants.length} Member{participants.length !== 1 ? 's' : ''}</span>
                          </div>
                          {participants.map((p) => (
                            <div key={p.userId} className={`flex items-center justify-between px-4 py-2.5 transition-colors ${darkMode ? 'hover:bg-[#202c33]' : 'hover:bg-slate-50'}`}>
                              <div className="flex items-center gap-3 min-w-0">
                                <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold text-white bg-gradient-to-br ${['from-blue-500 to-indigo-600','from-violet-500 to-purple-600','from-emerald-500 to-teal-600','from-rose-500 to-pink-600','from-amber-500 to-orange-600'][Math.abs(p.username.charCodeAt(0)) % 5]} flex-shrink-0`}>
                                  {p.username.charAt(0).toUpperCase()}
                                </div>
                                <div className="min-w-0">
                                  <p className={`text-sm font-medium truncate ${darkMode ? 'text-[#e9edef]' : 'text-[#111b21]'}`}>{p.username}</p>
                                  <span className={`text-[11px] font-semibold capitalize px-1.5 py-0.5 rounded-md ${roleBadgeClass(p.role)}`}>{p.role}</span>
                                </div>
                              </div>
                              {canManageMembers && p.role !== 'owner' && p.username !== profile.username && (
                                <button type="button" onClick={() => removeMember(p.username)} className="text-rose-500 hover:text-rose-400 flex-shrink-0 ml-2 p-1 rounded-full hover:bg-rose-500/10 transition-colors">
                                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M13 7a4 4 0 11-8 0 4 4 0 018 0zM9 14a6 6 0 00-6 6v1h12v-1a6 6 0 00-6-6zM21 12h-6" />
                                  </svg>
                                </button>
                              )}
                            </div>
                          ))}
                        </div>

                        {/* Add member */}
                        {canManageMembers && (
                          <div className={`p-4 border-t ${darkMode ? 'border-white/5' : 'border-slate-100'}`}>
                            <p className={`text-[11px] font-bold uppercase tracking-widest mb-2 ${darkMode ? 'text-[#8696a0]' : 'text-[#667781]'}`}>Add Member</p>
                            <div className="flex gap-2">
                              <input
                                value={memberUsernameInput}
                                onChange={(e) => setMemberUsernameInput(e.target.value)}
                                placeholder="Username..."
                                className={`flex-1 rounded-lg border px-3 py-2 text-sm outline-none transition-colors ${darkMode ? 'border-white/10 bg-[#2a3942] text-[#e9edef] placeholder:text-[#8696a0] focus:border-[#00a884]/60' : 'border-slate-200 bg-slate-50 placeholder:text-slate-400 focus:border-[#00a884]'}`}
                              />
                              <button type="button" onClick={addMember} className="rounded-lg bg-[#00a884] hover:bg-[#02be9a] px-3 py-2 text-sm font-semibold text-white transition-colors">
                                Add
                              </button>
                            </div>
                          </div>
                        )}

                        {/* Leave group */}
                        {activeRoomKey !== 'general' && (
                          <div className={`p-4 border-t ${darkMode ? 'border-white/5' : 'border-slate-100'}`}>
                            <button
                              type="button"
                              onClick={leaveGroup}
                              className={`w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold border transition-colors ${
                                darkMode
                                  ? 'border-rose-500/30 text-rose-400 hover:bg-rose-500/10'
                                  : 'border-rose-200 text-rose-600 hover:bg-rose-50'
                              }`}
                            >
                              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                              </svg>
                              Leave Group
                            </button>
                          </div>
                        )}
                      </>
                    )}
                  </div>

                {participants.some((p) => p.userId !== profile.userId) && (
                  <button
                    type="button"
                    onClick={() => {
                      const others = participants.filter((p) => p.userId !== profile.userId);
                      if (others.length > 1) { setShowMeetingPrompt(true); return; }
                      if (others[0]) handleVideoCall(others[0].userId, others[0].username);
                    }}
                    className="fixed bottom-20 right-4 z-20 rounded-full bg-gradient-to-r from-blue-500 to-indigo-500 p-3.5 text-white shadow-lg shadow-blue-500/30 md:hidden active:scale-95"
                    title="Start video call"
                  >
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                    </svg>
                  </button>
                )}
            </div>{/* end chat area */}
          </div>{/* end right area */}
        </div>{/* end max-w-[1800px] */}

        {/* Mobile bottom navigation — Telegram-style, 5 tabs */}
        <nav
          className={`fixed bottom-0 left-0 right-0 z-20 flex items-stretch border-t md:hidden ${
            darkMode ? 'border-white/5 bg-slate-950/98' : 'border-slate-200 bg-white'
          }`}
          style={{ backdropFilter: 'blur(24px)', paddingBottom: 'env(safe-area-inset-bottom)' }}
        >
          {([
            {
              id: 'chats' as AppSection,
              label: 'Chats',
              icon: (active: boolean) => (
                <svg className="w-6 h-6" viewBox="0 0 24 24" fill={active ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth={active ? 0 : 1.75}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
              ),
            },
            {
              id: 'calls' as AppSection,
              label: 'Calls',
              icon: (active: boolean) => (
                <svg className="w-6 h-6" viewBox="0 0 24 24" fill={active ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth={active ? 0 : 1.75}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                </svg>
              ),
            },
            {
              id: 'contacts' as AppSection,
              label: 'Contacts',
              icon: (active: boolean) => (
                <svg className="w-6 h-6" viewBox="0 0 24 24" fill={active ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth={active ? 0 : 1.75}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              ),
            },
            {
              id: 'meetings' as AppSection,
              label: 'Meetings',
              icon: (active: boolean) => (
                <svg className="w-6 h-6" viewBox="0 0 24 24" fill={active ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth={active ? 0 : 1.75}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
              ),
            },
            {
              id: 'settings' as AppSection,
              label: 'Profile',
              icon: (active: boolean, profileData?: { username: string }) => {
                const name = profileData?.username || 'U';
                const grad = `from-blue-500 to-indigo-600`;
                return (
                  <div className={`w-6 h-6 rounded-full bg-gradient-to-br ${grad} flex items-center justify-center text-[10px] font-bold text-white`}>
                    {name.charAt(0).toUpperCase()}
                  </div>
                );
              },
              isProfile: true,
            },
          ] as Array<{ id: AppSection; label: string; icon: (active: boolean, profileData?: { username: string }) => React.ReactNode; isProfile?: boolean }>).map(({ id, label, icon, isProfile }) => {
            const isActive = mobileSection === id;
            return (
              <button
                key={id}
                type="button"
                onClick={() => {
                  if (id === mobileSection && id !== 'chats') return;
                  if (id === mobileSection) return;
                  const fromIdx = SECTION_ORDER.indexOf(mobileSection);
                  const toIdx = SECTION_ORDER.indexOf(id);
                  const direction = toIdx > fromIdx ? 1 : -1;
                  setSlideDir(direction);
                  setMobilePrevSection(mobileSection);
                  setMobileTransitioning(true);
                  setTimeout(() => {
                    setMobileSection(id);
                    setActiveSection(id);
                    if (id !== 'chats') setMobileChatOpen(false);
                    setMobileTransitioning(false);
                  }, 200);
                }}
                className={`relative flex-1 flex flex-col items-center justify-center gap-0.5 pt-2 pb-1 text-[10px] font-semibold tracking-tight transition-colors duration-150 ${
                  isActive
                    ? darkMode ? 'text-blue-400' : 'text-blue-600'
                    : darkMode ? 'text-slate-600' : 'text-slate-400'
                }`}
              >
                {/* Active top line indicator */}
                {isActive && (
                  <span className="absolute top-0 left-1/2 -translate-x-1/2 w-6 h-0.5 rounded-full bg-blue-500" />
                )}
                {/* Unread badge */}
                {id === 'chats' && unreadTotal > 0 && !isActive && (
                  <span className="absolute top-1.5 left-1/2 ml-2 min-w-[16px] h-4 flex items-center justify-center rounded-full bg-blue-500 text-white text-[9px] font-bold px-0.5">
                    {unreadTotal > 9 ? '9+' : unreadTotal}
                  </span>
                )}
                <span className="relative">{isProfile ? icon(isActive, profile ?? undefined) : icon(isActive)}</span>
                <span>{label}</span>
              </button>
            );
          })}
        </nav>
      </div>

      {isNavModalOpen && (
        <div className="fixed inset-0 z-40 flex">
          <div className="absolute inset-0 bg-black/45 backdrop-blur-sm" onClick={() => setIsNavModalOpen(false)} />
          <div className={`relative m-3 h-[calc(100%-1.5rem)] w-full max-w-xs rounded-2xl border shadow-2xl ${darkMode ? 'border-slate-700/80 bg-slate-900' : 'border-slate-200 bg-white'}`}>
            <div className={`flex items-center justify-between border-b px-4 py-3 ${darkMode ? 'border-slate-800' : 'border-slate-100'}`}>
              <div className="flex items-center gap-2">
                <span className={`h-7 w-7 rounded-lg flex items-center justify-center ${darkMode ? 'bg-slate-800 text-slate-300' : 'bg-slate-100 text-slate-600'}`}>
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 7h16M4 12h16M4 17h16" />
                  </svg>
                </span>
                <p className="text-sm font-semibold">Navigation</p>
              </div>
              <button
                type="button"
                onClick={() => setIsNavModalOpen(false)}
                className={`h-8 w-8 rounded-lg transition-colors ${darkMode ? 'text-slate-500 hover:bg-slate-800 hover:text-slate-300' : 'text-slate-400 hover:bg-slate-100 hover:text-slate-600'}`}
                title="Close"
              >
                <svg className="mx-auto h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <nav className="space-y-1 p-2">
              {([
                { id: 'chats', label: 'Chats', helper: 'All chats' },
                { id: 'calls', label: 'Calls', helper: 'Call history and actions' },
                { id: 'contacts', label: 'Contacts', helper: 'Manage people' },
                { id: 'meetings', label: 'Meetings', helper: 'Meetings dashboard' },
              ] as Array<{ id: AppSection; label: string; helper: string }>).map((item) => {
                const isActive = activeSection === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => openSectionFromNavMenu(item.id)}
                    className={`w-full rounded-xl px-3 py-2.5 text-left transition-colors ${
                      isActive
                        ? darkMode
                          ? 'bg-blue-500/15 text-blue-300'
                          : 'bg-blue-50 text-blue-700'
                        : darkMode
                          ? 'text-slate-300 hover:bg-slate-800'
                          : 'text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <p className="text-sm font-semibold">{item.label}</p>
                    <p className={`text-[11px] ${isActive ? (darkMode ? 'text-blue-300/80' : 'text-blue-600/80') : (darkMode ? 'text-slate-500' : 'text-slate-400')}`}>
                      {item.helper}
                    </p>
                  </button>
                );
              })}
            </nav>

            <div className={`absolute bottom-0 left-0 right-0 border-t px-3 py-3 ${darkMode ? 'border-slate-800 bg-slate-900/95' : 'border-slate-100 bg-white/95'}`}>
              <button
                type="button"
                onClick={() => setDarkMode((current) => !current)}
                className={`w-full rounded-xl px-3 py-2 text-left text-sm font-medium transition-colors ${darkMode ? 'bg-slate-800 text-slate-300 hover:bg-slate-700' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'}`}
              >
                {darkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
              </button>
            </div>
          </div>
        </div>
      )}

      <CallUI
        visible={isCallActive || Boolean(incomingCall)}
        callType={activeCallType}
        callStatus={callStatus}
        incomingCall={incomingCall}
        callDurationLabel={callDurationLabel}
        localVideoRef={localVideoRef}
        localStream={localStream}
        callPeers={callPeers}
        participantsOpen={participantsPanelOpen}
        isMuted={isMuted}
        isCameraOff={isCameraOff}
        isScreenSharing={isScreenSharing}
        onAcceptCall={acceptCall}
        onRejectCall={rejectCall}
        onToggleMute={toggleMute}
        onToggleCamera={toggleCamera}
        onToggleScreenShare={toggleScreenShare}
        onToggleParticipants={() => setParticipantsPanelOpen((c) => !c)}
        onEndCall={endCall}
      />

      {showMeetingPrompt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setShowMeetingPrompt(false)} />
          <div className={`relative w-full max-w-sm rounded-2xl border shadow-2xl scale-in ${darkMode ? 'border-slate-700/80 bg-slate-900' : 'border-slate-200 bg-white'}`}>
            <div className={`flex items-center justify-between px-5 py-4 border-b ${darkMode ? 'border-slate-800' : 'border-slate-100'}`}>
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-emerald-600/15 flex items-center justify-center flex-shrink-0">
                  <svg className="w-5 h-5 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                </div>
                <div>
                  <h2 className="text-sm font-bold">Start or join a meeting</h2>
                  <p className={`text-xs ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>Group video calls use Meetings</p>
                </div>
              </div>
              <button type="button" onClick={() => setShowMeetingPrompt(false)} className={`w-8 h-8 flex items-center justify-center rounded-lg transition-colors ${darkMode ? 'hover:bg-slate-800 text-slate-400' : 'hover:bg-slate-100 text-slate-500'}`}>
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="px-5 py-5 space-y-3">
              <p className={`text-sm leading-relaxed ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                Use the <span className="font-semibold">Meetings tab</span> to schedule or join a video meeting for this group.
              </p>
              <div className="flex gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => { setShowMeetingPrompt(false); setActiveSection('meetings'); setMobileSection('meetings'); setMobileChatOpen(false); }}
                  className="flex-1 rounded-xl bg-emerald-600 hover:bg-emerald-500 px-3.5 py-2.5 text-sm font-semibold text-white shadow-md shadow-emerald-500/20 transition-all active:scale-[0.98]"
                >
                  Go to Meetings
                </button>
                <button
                  type="button"
                  onClick={() => setShowMeetingPrompt(false)}
                  className={`flex-1 rounded-xl border px-3.5 py-2.5 text-sm font-semibold transition-all active:scale-[0.98] ${darkMode ? 'border-slate-700 text-slate-300 hover:bg-slate-800' : 'border-slate-200 text-slate-700 hover:bg-slate-50'}`}
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {isCreateGroupModalOpen && (
        <CreateGroupModal
          darkMode={darkMode}
          onClose={() => setIsCreateGroupModalOpen(false)}
          onCreate={createGroup}
        />
      )}
    </main>
  );
}
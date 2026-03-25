'use client';

import { FormEvent, TouchEvent, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { io, Socket } from 'socket.io-client';
import { API_URL, SOCKET_URL, authFetch, getAuthToken } from '@/lib/config';
import { CallUI } from '@/components/messaging/CallUI';
import { ChatList } from '@/components/messaging/ChatList';
import { ChatWindow } from '@/components/messaging/ChatWindow';
import { Sidebar } from '@/components/messaging/Sidebar';
import { ContactsPanel } from '@/components/messaging/ContactsPanel';
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
  SearchedUser,
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
  const [allUsers, setAllUsers] = useState<SearchedUser[]>([]);
  const [contactSearchQuery, setContactSearchQuery] = useState('');

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
    if (!callStartedAt) return '00:00';
    const seconds = Math.max(0, Math.floor((Date.now() - callStartedAt) / 1000));
    const mins = String(Math.floor(seconds / 60)).padStart(2, '0');
    const secs = String(seconds % 60).padStart(2, '0');
    return `${mins}:${secs}`;
  }, [callStartedAt, callStatus, callTicker]);

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
    const room = rooms.find((item) => item.key === activeRoomKey);
    return room?.name ?? activeRoomKey;
  }, [rooms, activeRoomKey]);

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
      if (!token) {
        setStatus('Please sign in first.');
        return;
      }
      const response = await authFetch(`${API_URL}/auth/profile`, { method: 'GET' });
      if (!response.ok) { setStatus('Please sign in first.'); return; }
      const profileData = (await response.json()) as Profile;
      setProfile(profileData);
      setStatus('Secure session active.');
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
          setAllUsers(users);
        }
      } catch (err) {
        console.error('Failed to load users', err);
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
  useEffect(() => { messageEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages, activeRoomKey, typingIndicator]);

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
      setParticipants(payload.participants);
      setCanManageMembers(payload.canManageMembers);
    };
    loadParticipants().catch(() => undefined);
  }, [profile, activeRoomKey]);

  const cleanupCall = () => {
    if (peerRef.current) { peerRef.current.ontrack = null; peerRef.current.onicecandidate = null; peerRef.current.close(); peerRef.current = null; }
    if (localStreamRef.current) { localStreamRef.current.getTracks().forEach(t => t.stop()); localStreamRef.current = null; }
    if (remoteStreamRef.current) { remoteStreamRef.current.getTracks().forEach(t => t.stop()); remoteStreamRef.current = null; }
    if (localVideoRef.current) localVideoRef.current.srcObject = null;
    if (remoteVideoRef.current) remoteVideoRef.current.srcObject = null;
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
      if (localVideoRef.current) localVideoRef.current.srcObject = stream;
    }
    return localStreamRef.current;
  };

  const ensurePeer = (targetUserId: number) => {
    if (peerRef.current) return peerRef.current;
    const peer = new RTCPeerConnection(RTC_CONFIG);
    remoteStreamRef.current = new MediaStream();
    peer.ontrack = (event) => {
      if (!remoteStreamRef.current) remoteStreamRef.current = new MediaStream();
      event.streams[0].getTracks().forEach(t => remoteStreamRef.current!.addTrack(t));
      if (remoteVideoRef.current) remoteVideoRef.current.srcObject = remoteStreamRef.current;
    };
    peer.onicecandidate = (event) => {
      if (!event.candidate) return;
      socketRef.current?.emit('ice_candidate', { targetUserId, candidate: event.candidate.toJSON() });
    };
    if (localStreamRef.current) localStreamRef.current.getTracks().forEach(t => peer.addTrack(t, localStreamRef.current!));
    peerRef.current = peer;
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
        const next: RoomItem = {
          key: payload.room.key,
          name: payload.room.name || current?.name || payload.room.key,
          unread: 0,
          lastMessage: payload.messages.length > 0 ? summarizeMessage(payload.messages[payload.messages.length - 1].content) : current?.lastMessage ?? 'No messages yet',
          lastAt: payload.messages.length > 0 ? payload.messages[payload.messages.length - 1].createdAt : current?.lastAt,
        };
        return [next, ...prev.filter((room) => room.key !== payload.room.key)];
      });
    });
    socket.on('receive_message', (message: ChatMessage) => {
      setMessages((prev) => (prev.some((item) => item.id === message.id) ? prev : [...prev, message]));
      setRooms((prev) => {
        const current = prev.find((room) => room.key === message.roomKey);
        const nextRoom: RoomItem = {
          key: message.roomKey,
          name: current?.name ?? message.roomKey,
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
    socket.on('receive_call', (payload: IncomingCall) => { setIncomingCall(payload); setCallStatus(`Incoming ${payload.callType} call`); setActiveCallType(payload.callType); });
    socket.on('accept_call', async (payload: { fromUserId: number }) => {
      setActiveCallUserId(payload.fromUserId);
      setCallStatus('Call accepted. Negotiating...');
      try { await ensureLocalStream(activeCallTypeRef.current); const peer = ensurePeer(payload.fromUserId); const offer = await peer.createOffer(); await peer.setLocalDescription(offer); socket.emit('offer', { targetUserId: payload.fromUserId, sdp: offer }); } catch { setCallStatus('Could not start call media'); }
    });
    socket.on('reject_call', (payload: { reason?: string }) => { cleanupCall(); setCallStatus(payload.reason ?? 'Call ended'); });
    socket.on('offer', async (payload: { fromUserId: number; sdp: RTCSessionDescriptionInit }) => {
      setActiveCallUserId(payload.fromUserId);
      setCallStatus('Connecting...');
      try { await ensureLocalStream(activeCallTypeRef.current); const peer = ensurePeer(payload.fromUserId); await peer.setRemoteDescription(new RTCSessionDescription(payload.sdp)); for (const c of pendingCandidatesRef.current) await peer.addIceCandidate(new RTCIceCandidate(c)); pendingCandidatesRef.current = []; const answer = await peer.createAnswer(); await peer.setLocalDescription(answer); socket.emit('answer', { targetUserId: payload.fromUserId, sdp: answer }); setCallStatus('In call'); setCallStartedAt(Date.now()); } catch { setCallStatus('Failed to answer call'); }
    });
    socket.on('answer', async (payload: { sdp: RTCSessionDescriptionInit }) => {
      if (!peerRef.current) return;
      try { await peerRef.current.setRemoteDescription(new RTCSessionDescription(payload.sdp)); setCallStatus('In call'); setCallStartedAt(Date.now()); } catch { setCallStatus('Failed to finalize call'); }
    });
    socket.on('ice_candidate', async (payload: { candidate: RTCIceCandidateInit }) => {
      if (peerRef.current?.remoteDescription) { try { await peerRef.current.addIceCandidate(new RTCIceCandidate(payload.candidate)); } catch { setStatus('Failed to process ICE candidate'); } } else { pendingCandidatesRef.current.push(payload.candidate); }
    });
    socket.on('error', (message: string) => { setStatus(message); });
    socket.on('disconnect', () => { setStatus('Disconnected'); cleanupCall(); });
    socket.on('group_created', async (payload: GroupSummary) => {
      setGroups((prev) => { if (prev.some((g) => g.key === payload.key)) return prev; return [...prev, payload]; });
      setRooms((prev) => { if (prev.some((r) => r.key === payload.key)) return prev; return [...prev, { key: payload.key, name: payload.name || payload.key, unread: 0, lastMessage: 'No messages yet' }]; });
    });
    socket.on('group_member_added', async () => {
      const mineResponse = await authFetch(`${API_URL}/groups/mine`);
      if (mineResponse.ok) { const mineData = (await mineResponse.json()) as GroupSummary[]; setGroups(mineData); }
    });
    socket.on('group_member_removed', async () => {
      const mineResponse = await authFetch(`${API_URL}/groups/mine`);
      if (mineResponse.ok) { const mineData = (await mineResponse.json()) as GroupSummary[]; setGroups(mineData); setRooms(mineData.map((g) => ({ key: g.key, name: g.name || g.key, unread: 0, lastMessage: 'No messages yet' }))); }
    });
    return () => { cleanupCall(); socket.disconnect(); socketRef.current = null; };
  }, [profile]);

  const openRoom = (roomKey: string) => { setActiveSection('chats'); setMobileSection('chats'); setMobileChatOpen(true); setActiveRoomKey(roomKey); setRooms((prev) => prev.map((room) => (room.key === roomKey ? { ...room, unread: 0 } : room))); socketRef.current?.emit('join_room', { roomKey }); };
  const togglePin = (roomKey: string) => { setPinnedRoomKeys((prev) => (prev.includes(roomKey) ? prev.filter((item) => item !== roomKey) : [roomKey, ...prev])); };

  const createGroup = async () => {
    const key = newGroupKey.trim().toLowerCase();
    if (!key) { setStatus('Group key is required'); return; }
    const participantUsernames = newGroupUsers.split(',').map((item) => item.trim()).filter(Boolean);
    const response = await authFetch(`${API_URL}/groups`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ key, name: newGroupName.trim() || undefined, participantUsernames }),
    });
    if (!response.ok) { setStatus('Could not create group'); return; }
    setIsCreateGroupModalOpen(false); setNewGroupKey(''); setNewGroupName(''); setNewGroupUsers(''); setStatus(`Group ${key} created`);
    const mineResponse = await authFetch(`${API_URL}/groups/mine`);
    if (mineResponse.ok) { const mineData = (await mineResponse.json()) as GroupSummary[]; setGroups(mineData); setRooms(mineData.map((g) => ({ key: g.key, name: g.name || g.key, unread: 0, lastMessage: 'No messages yet' }))); }
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
    setParticipants(payload.participants); setCanManageMembers(payload.canManageMembers); setMemberUsernameInput('');
  };

  const removeMember = async (username: string) => {
    const response = await authFetch(`${API_URL}/groups/${activeRoomKey}/users/${username}`, {
      method: 'DELETE',
    });
    if (!response.ok) { setStatus('Could not remove member'); return; }
    const payload = (await response.json()) as { participants: GroupParticipant[]; canManageMembers: boolean };
    setParticipants(payload.participants); setCanManageMembers(payload.canManageMembers);
  };

  const sendMessage = (event: FormEvent) => {
    event.preventDefault();
    if (!canSend || !socketRef.current) return;
    if (editingMessage) {
      setMessages((prev) => prev.map((m) => (m.id === editingMessage.id ? { ...m, content: draft.trim(), editedLocal: true } : m)));
      setEditingMessage(null); setDraft(''); return;
    }
    socketRef.current.emit('send_message', { roomKey: activeRoomKey, content: draft, replyToMessageId: replyTo?.id });
    setDraft(''); setReplyTo(null); socketRef.current.emit('typing', { roomKey: activeRoomKey, isTyping: false });
  };

  const handleDraftChange = (value: string) => {
    setDraft(value);
    if (!socketRef.current) return;
    socketRef.current.emit('typing', { roomKey: activeRoomKey, isTyping: true });
    if (typingDebounceRef.current) clearTimeout(typingDebounceRef.current);
    typingDebounceRef.current = setTimeout(() => socketRef.current?.emit('typing', { roomKey: activeRoomKey, isTyping: false }), 650);
  };

  const handleMentionInsert = (username: string) => { setDraft((current) => current.replace(/@([a-zA-Z0-9_]*)$/, `@${username} `)); };

  const uploadFile = async (file: File) => {
    if (!socketRef.current) { setStatus('Socket unavailable'); return; }
    if (file.size > CLIENT_MAX_FILE_BYTES) { setStatus('File exceeds 10MB'); return; }
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

  const onReact = (messageId: string, emoji: string) => { socketRef.current?.emit('add_reaction', { messageId, emoji }); };
  const onReply = (message: ChatMessage) => { setReplyTo(message); setEditingMessage(null); };
  const onStartEdit = (message: ChatMessage) => { setEditingMessage(message); setReplyTo(null); setDraft(message.content); };
  const onDelete = (message: ChatMessage) => { setMessages((prev) => prev.map((item) => (item.id === message.id ? { ...item, content: 'Message deleted', deletedLocal: true } : item))); };

  const startCall = async (type: 'voice' | 'video', targetOverride?: number) => {
    if (!socketRef.current) { setCallStatus('Socket not connected'); return; }
    const targetUserId = targetOverride ?? Number(callTargetUserId);
    if (!Number.isInteger(targetUserId) || targetUserId <= 0) { setCallStatus('Select a valid target user'); return; }
    cleanupCall(); setActiveCallType(type); activeCallTypeRef.current = type;
    try { await ensureLocalStream(type); setActiveCallUserId(targetUserId); socketRef.current.emit('call_user', { targetUserId, roomKey: activeRoomKey, callType: type }); setCallStatus(`Calling user ${targetUserId}`); } catch { setCallStatus('Could not access media devices'); }
  };

  const startCallByUsername = async (type: 'voice' | 'video', username: string, userId: number) => {
    if (!socketRef.current) { setCallStatus('Socket not connected'); return; }
    cleanupCall(); setActiveCallType(type); activeCallTypeRef.current = type;
    try { 
      await ensureLocalStream(type); 
      setActiveCallUserId(userId); 
      socketRef.current.emit('call_user', { targetUsername: username, targetUserId: userId, roomKey: activeRoomKey, callType: type }); 
      setCallStatus(`Calling ${username}...`); 
    } catch { setCallStatus('Could not access media devices'); }
  };

  const handleVoiceCall = (userId: number, username: string) => {
    startCallByUsername('voice', username, userId);
  };

  const handleVideoCall = (userId: number, username: string) => {
    startCallByUsername('video', username, userId);
  };

  const acceptCall = async () => {
    if (!incomingCall || !socketRef.current) return;
    try { await ensureLocalStream(incomingCall.callType); setActiveCallType(incomingCall.callType); activeCallTypeRef.current = incomingCall.callType; setActiveCallUserId(incomingCall.fromUserId); socketRef.current.emit('accept_call', { targetUserId: incomingCall.fromUserId }); setCallStatus('Accepted. Waiting for stream...'); setIncomingCall(null); } catch { setCallStatus('Could not access media'); }
  };

  const rejectCall = () => {
    if (!incomingCall || !socketRef.current) return;
    socketRef.current.emit('reject_call', { targetUserId: incomingCall.fromUserId, reason: 'Call rejected' });
    setIncomingCall(null); setCallStatus('Call rejected');
  };

  const endCall = () => {
    if (socketRef.current && activeCallUserId) socketRef.current.emit('reject_call', { targetUserId: activeCallUserId, reason: 'Call ended' });
    cleanupCall(); setCallStatus('Call ended');
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
    if (!peerRef.current || !localStreamRef.current) return;
    try {
      if (!isScreenSharing) {
        const displayStream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: false });
        const displayTrack = displayStream.getVideoTracks()[0];
        const sender = peerRef.current.getSenders().find((s) => s.track?.kind === 'video');
        await sender?.replaceTrack(displayTrack);
        if (localVideoRef.current) localVideoRef.current.srcObject = displayStream;
        displayTrack.onended = async () => { const fallback = cameraTrackRef.current; if (fallback) { await sender?.replaceTrack(fallback); if (localStreamRef.current && localVideoRef.current) localVideoRef.current.srcObject = localStreamRef.current; } setIsScreenSharing(false); };
        setIsScreenSharing(true);
      } else {
        const sender = peerRef.current.getSenders().find((s) => s.track?.kind === 'video');
        const fallback = cameraTrackRef.current; if (fallback) await sender?.replaceTrack(fallback);
        if (localStreamRef.current && localVideoRef.current) localVideoRef.current.srcObject = localStreamRef.current;
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

  return (
    <main className={`${darkMode ? 'dark' : ''}`}>
      <div className={`h-screen w-full ${darkMode ? 'bg-slate-950 text-slate-100' : 'bg-slate-100 text-slate-900'}`}>
        <div className="mx-auto flex h-full max-w-[1800px]">
          <Sidebar
            collapsed={sidebarCollapsed}
            activeSection={activeSection}
            unreadCount={unreadTotal}
            onToggleCollapsed={() => setSidebarCollapsed((c) => !c)}
            onSelectSection={setActiveSection}
            darkMode={darkMode}
            onToggleDarkMode={() => setDarkMode((c) => !c)}
          />

          <div className="hidden md:flex h-full w-[380px] lg:w-[400px] shrink-0">
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

          <div className="flex-1 flex flex-col overflow-hidden md:ml-3" onTouchStart={handleTouchStart} onTouchEnd={handleTouchEnd}>
            {activeSection === 'contacts' ? (
              <div className="h-full flex">
                <ContactsPanel
                  onlineUsers={onlineUsers}
                  allUsers={allUsers}
                  searchQuery={contactSearchQuery}
                  onSearchQueryChange={setContactSearchQuery}
                  onStartVoiceCall={handleVoiceCall}
                  onStartVideoCall={handleVideoCall}
                  darkMode={darkMode}
                  currentUserId={profile?.userId ?? 0}
                />
              </div>
            ) : activeSection !== 'chats' ? (
              <div className="flex-1 flex items-center justify-center p-8">
                <div className={`rounded-2xl border p-10 text-center max-w-md ${darkMode ? 'border-slate-800 bg-slate-900' : 'border-slate-200 bg-white'} shadow-xl`}>
                  <div className={`w-16 h-16 rounded-2xl mx-auto mb-4 flex items-center justify-center ${darkMode ? 'bg-slate-800' : 'bg-slate-100'}`}>
                    {activeSection === 'calls' && (
                      <svg className={`w-8 h-8 ${darkMode ? 'text-slate-500' : 'text-slate-400'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                      </svg>
                    )}
                    {activeSection === 'settings' && (
                      <svg className={`w-8 h-8 ${darkMode ? 'text-slate-500' : 'text-slate-400'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                    )}
                  </div>
                  <p className="text-lg font-semibold capitalize mb-1">{activeSection}</p>
                  <p className={`text-sm ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>Enterprise module ready for expansion</p>
                </div>
              </div>
            ) : (
              <>
                <div className="md:hidden">
                  {!mobileChatOpen ? (
                    <ChatList
                      rooms={rooms}
                      activeRoomKey={activeRoomKey}
                      searchQuery={searchQuery}
                      onSearchQueryChange={setSearchQuery}
                      onOpenRoom={(roomKey) => { openRoom(roomKey); setMobileChatOpen(true); }}
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
                        <div className="hidden lg:flex items-center gap-2">
                          <input
                            value={callTargetUserId}
                            onChange={(e) => setCallTargetUserId(e.target.value)}
                            className={`w-20 rounded-lg border px-2 py-1.5 text-xs outline-none ${darkMode ? 'border-slate-700 bg-slate-900 text-slate-100' : 'border-slate-300 bg-white text-slate-800'}`}
                            placeholder="User ID"
                          />
                          <button type="button" onClick={() => startCall('voice')} className={`p-2 rounded-lg ${darkMode ? 'hover:bg-slate-800' : 'hover:bg-slate-100'}`} title="Voice Call">
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                            </svg>
                          </button>
                          <button type="button" onClick={() => startCall('video')} className={`p-2 rounded-lg ${darkMode ? 'hover:bg-slate-800' : 'hover:bg-slate-100'}`} title="Video Call">
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                            </svg>
                          </button>
                        </div>
                        {profile.role === 'admin' && (
                          <Link href="/admin" className={`p-2 rounded-lg ${darkMode ? 'hover:bg-slate-800' : 'hover:bg-slate-100'}`} title="Admin">
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                              <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            </svg>
                          </Link>
                        )}
                      </>
                    }
                    composer={
                      <div>
                        {replyTo && (
                          <div className={`mb-3 flex items-center justify-between rounded-xl border px-3 py-2 text-xs ${darkMode ? 'border-slate-700 bg-slate-900' : 'border-slate-200 bg-slate-50'}`}>
                            <div className="flex items-center gap-2">
                              <svg className="w-3 h-3 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
                              </svg>
                              <p>Replying to <span className="font-semibold">{replyTo.sender.username}</span></p>
                            </div>
                            <button type="button" onClick={() => setReplyTo(null)} className={`p-1 rounded ${darkMode ? 'hover:bg-slate-800' : 'hover:bg-slate-200'}`}>
                              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                              </svg>
                            </button>
                          </div>
                        )}
                        {editingMessage && (
                          <div className={`mb-3 flex items-center justify-between rounded-xl border px-3 py-2 text-xs ${darkMode ? 'border-indigo-500/40 bg-indigo-500/10' : 'border-indigo-200 bg-indigo-50'} ${darkMode ? 'text-indigo-100' : 'text-indigo-700'}`}>
                            <div className="flex items-center gap-2">
                              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                              </svg>
                              <p>Editing message</p>
                            </div>
                            <button type="button" onClick={() => { setEditingMessage(null); setDraft(''); }} className={`p-1 rounded ${darkMode ? 'hover:bg-indigo-500/20' : 'hover:bg-indigo-200'}`}>
                              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                              </svg>
                            </button>
                          </div>
                        )}
                        <form className="flex items-end gap-2" onSubmit={sendMessage}>
                          <input ref={fileInputRef} type="file" className="hidden" accept="image/*,video/*,application/pdf" onChange={(e) => { const file = e.target.files?.[0]; if (file) uploadFile(file); }} />
                          <button type="button" onClick={() => fileInputRef.current?.click()} className={`p-2.5 rounded-xl border ${darkMode ? 'border-slate-700 bg-slate-900 text-slate-300 hover:bg-slate-800' : 'border-slate-300 bg-white text-slate-600 hover:bg-slate-50'}`}>
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                            </svg>
                          </button>
                          <div className="relative flex-1">
                            <input value={draft} onChange={(e) => handleDraftChange(e.target.value)} placeholder="Type a secure message..." className={`w-full rounded-2xl border px-4 py-2.5 text-sm outline-none ${darkMode ? 'border-slate-700 bg-slate-900 text-slate-100 placeholder:text-slate-500 focus:border-blue-500' : 'border-slate-300 bg-white text-slate-800 placeholder:text-slate-400 focus:border-blue-500'}`} />
                            {mentionCandidates.length > 0 && (
                              <div className={`absolute bottom-full left-0 w-60 mb-2 rounded-xl border shadow-xl ${darkMode ? 'border-slate-700 bg-slate-900' : 'border-slate-200 bg-white'}`}>
                                {mentionCandidates.map((candidate) => (
                                  <button key={candidate.userId} type="button" onClick={() => handleMentionInsert(candidate.username)} className={`block w-full px-3 py-2 text-left text-sm ${darkMode ? 'hover:bg-slate-800' : 'hover:bg-slate-100'}`}>
                                    @{candidate.username}
                                  </button>
                                ))}
                              </div>
                            )}
                          </div>
                          <button type="submit" disabled={!canSend} className="rounded-2xl bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 px-4 py-2.5 text-sm font-medium text-white shadow-lg shadow-blue-500/25 transition-all disabled:opacity-50 disabled:cursor-not-allowed active:scale-95">
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                            </svg>
                          </button>
                        </form>
                        {uploadState === 'uploading' && (
                          <div className={`mt-2 h-1.5 w-full overflow-hidden rounded-full ${darkMode ? 'bg-slate-800' : 'bg-slate-200'}`}>
                            <div className="h-full rounded-full bg-gradient-to-r from-blue-600 to-cyan-500 transition-all" style={{ width: `${uploadProgress}%` }} />
                          </div>
                        )}
                      </div>
                    }
                  />
                </div>

                <div className={`hidden xl:flex flex-col w-72 border-l shrink-0 ${darkMode ? 'border-slate-800 bg-slate-900/80' : 'border-slate-200 bg-white/80'}`} style={{ backdropFilter: 'blur(20px)' }}>
                  <div className="p-4 border-b border-slate-200 dark:border-slate-800">
                    <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Participants ({participants.length})</p>
                  </div>
                  <div className="flex-1 overflow-y-auto p-3 space-y-2">
                    {participants.map((p) => (
                      <div key={p.userId} className={`flex items-center justify-between rounded-xl border px-3 py-2 ${darkMode ? 'border-slate-800 bg-slate-900/50' : 'border-slate-100 bg-slate-50'}`}>
                        <div className="flex items-center gap-3">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold ${darkMode ? 'bg-slate-700 text-slate-300' : 'bg-slate-200 text-slate-600'}`}>
                            {p.username.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <p className="text-sm font-medium">{p.username}</p>
                            <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-medium ${roleBadgeClass(p.role)}`}>{p.role}</span>
                          </div>
                        </div>
                        {canManageMembers && p.role !== 'owner' && p.username !== profile.username && (
                          <button type="button" onClick={() => removeMember(p.username)} className="text-xs text-rose-500 hover:text-rose-400">Remove</button>
                        )}
                      </div>
                    ))}
                  </div>
                  {canManageMembers && (
                    <div className="p-3 border-t border-slate-200 dark:border-slate-800">
                      <div className="flex gap-2">
                        <input value={memberUsernameInput} onChange={(e) => setMemberUsernameInput(e.target.value)} placeholder="add username" className={`flex-1 rounded-lg border px-2.5 py-1.5 text-xs outline-none ${darkMode ? 'border-slate-700 bg-slate-900' : 'border-slate-300 bg-white'}`} />
                        <button type="button" onClick={addMember} className="rounded-lg bg-gradient-to-r from-blue-600 to-cyan-500 px-2.5 py-1.5 text-xs font-medium text-white">Add</button>
                      </div>
                    </div>
                  )}
                </div>

                <button type="button" onClick={() => startCall('voice')} className="fixed bottom-20 right-4 z-20 rounded-full bg-gradient-to-r from-emerald-500 to-teal-500 p-3.5 text-white shadow-lg shadow-emerald-500/30 md:hidden active:scale-95">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                  </svg>
                </button>
              </>
            )}
          </div>
        </div>

        <div className={`fixed bottom-0 left-0 right-0 z-20 grid grid-cols-4 border-t md:hidden ${darkMode ? 'border-slate-800 bg-slate-950/95' : 'border-slate-200 bg-white/95'}`} style={{ backdropFilter: 'blur(20px)' }}>
          {(['chats', 'calls', 'contacts', 'settings'] as AppSection[]).map((section) => (
            <button key={section} type="button" onClick={() => { setMobileSection(section); setActiveSection(section); if (section !== 'chats') setMobileChatOpen(false); }} className={`flex flex-col items-center gap-1 py-3 text-xs font-medium transition-colors ${mobileSection === section ? 'text-blue-600 dark:text-blue-400' : 'text-slate-500'}`}>
              {section === 'chats' && <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>}
              {section === 'calls' && <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" /></svg>}
              {section === 'contacts' && <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></svg>}
              {section === 'settings' && <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>}
              <span className="capitalize">{section}</span>
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
        activeCallUserId={activeCallUserId}
        onAcceptCall={acceptCall}
        onRejectCall={rejectCall}
        onToggleMute={toggleMute}
        onToggleCamera={toggleCamera}
        onToggleScreenShare={toggleScreenShare}
        onToggleParticipants={() => setParticipantsPanelOpen((c) => !c)}
        onEndCall={endCall}
      />

      {isCreateGroupModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setIsCreateGroupModalOpen(false)} />
          <div className={`relative w-full max-w-md rounded-2xl border p-5 shadow-2xl ${darkMode ? 'border-slate-700 bg-slate-900' : 'border-slate-200 bg-white'}`}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">Create Group</h2>
              <button type="button" onClick={() => setIsCreateGroupModalOpen(false)} className={`p-1.5 rounded-lg ${darkMode ? 'hover:bg-slate-800' : 'hover:bg-slate-100'}`}>
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="space-y-3">
              <input value={newGroupKey} onChange={(e) => setNewGroupKey(e.target.value)} placeholder="Group key (unique)" className={`w-full rounded-xl border px-3 py-2.5 text-sm outline-none ${darkMode ? 'border-slate-700 bg-slate-950 text-slate-100' : 'border-slate-300 bg-slate-50'}`} />
              <input value={newGroupName} onChange={(e) => setNewGroupName(e.target.value)} placeholder="Group name (optional)" className={`w-full rounded-xl border px-3 py-2.5 text-sm outline-none ${darkMode ? 'border-slate-700 bg-slate-950 text-slate-100' : 'border-slate-300 bg-slate-50'}`} />
              <input value={newGroupUsers} onChange={(e) => setNewGroupUsers(e.target.value)} placeholder="Participants: user1, user2" className={`w-full rounded-xl border px-3 py-2.5 text-sm outline-none ${darkMode ? 'border-slate-700 bg-slate-950 text-slate-100' : 'border-slate-300 bg-slate-50'}`} />
              <button type="button" onClick={createGroup} className="w-full rounded-xl bg-gradient-to-r from-blue-600 to-cyan-500 px-3 py-2.5 text-sm font-medium text-white shadow-lg shadow-blue-500/25 hover:from-blue-500 hover:to-cyan-400 transition-all">
                Create Group
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
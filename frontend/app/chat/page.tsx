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

export default function ChatPage() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [status, setStatus] = useState('Checking session...');
  const [roomKeyInput, setRoomKeyInput] = useState('general');
  const [activeRoomKey, setActiveRoomKey] = useState('general');
  const [draft, setDraft] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [typingUsers, setTypingUsers] = useState<Record<number, string>>({});

  const socketRef = useRef<Socket | null>(null);
  const activeRoomRef = useRef('general');
  const typingDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const typingClearTimersRef = useRef<Record<number, ReturnType<typeof setTimeout>>>({});

  const canSend = useMemo(
    () => draft.trim().length > 0 && activeRoomKey.trim().length > 0,
    [draft, activeRoomKey],
  );

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

    socket.on('room_joined', (payload: { room: { key: string }; messages: ChatMessage[] }) => {
      setActiveRoomKey(payload.room.key);
      setMessages(payload.messages);
      setTypingUsers({});
      setStatus(`Joined room: ${payload.room.key}`);
    });

    socket.on('receive_message', (message: ChatMessage) => {
      setMessages((prev) => {
        if (prev.some((item) => item.id === message.id)) {
          return prev;
        }
        return [...prev, message];
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

    socket.on('error', (message: string) => {
      setStatus(`Socket error: ${message}`);
    });

    socket.on('disconnect', () => {
      setStatus('Disconnected');
    });

    return () => {
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
    const hasDelivered = recipientReceipts.some((receipt) => receipt.status === 'DELIVERED' || receipt.status === 'READ');

    if (hasRead) return 'read';
    if (hasDelivered) return 'delivered';
    return 'sent';
  };

  const typingIndicator = Object.values(typingUsers).join(', ');

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
    <main className="mx-auto flex min-h-screen w-full max-w-4xl flex-col gap-4 px-4 py-6 md:px-6">
      <header className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h1 className="text-2xl font-bold">Realtime Group Messaging</h1>
          <p className="text-sm text-slate-600">Signed in as {profile.username}</p>
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-2">
          <input
            className="rounded-md border border-slate-300 px-3 py-2 text-sm"
            value={roomKeyInput}
            onChange={(event) => setRoomKeyInput(event.target.value)}
            placeholder="Room key"
          />
          <button className="rounded-md bg-indigo-600 px-3 py-2 text-sm text-white hover:bg-indigo-500" onClick={joinRoom}>
            Join Room
          </button>
          <span className="text-sm text-slate-500">Active room: {activeRoomKey}</span>
        </div>
        <p className="mt-2 text-xs text-slate-500">{status}</p>
      </header>

      <section className="flex min-h-[420px] flex-col rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="flex-1 space-y-2 overflow-y-auto p-4">
          {messages.length === 0 ? (
            <p className="text-sm text-slate-500">No messages yet. Start the conversation.</p>
          ) : null}

          {messages.map((message) => {
            const mine = profile.userId === message.sender.userId;
            return (
              <div key={message.id} className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
                <div
                  className={`max-w-[82%] rounded-lg px-3 py-2 text-sm ${
                    mine ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-900'
                  }`}
                >
                  <p className="mb-1 text-xs opacity-80">{message.sender.username}</p>
                  <p>{message.content}</p>
                  <div className="mt-1 flex items-center justify-between gap-3 text-[11px] opacity-80">
                    <span>{new Date(message.createdAt).toLocaleTimeString()}</span>
                    {mine ? <span>{formatStatus(message)}</span> : null}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <div className="border-t border-slate-200 p-3">
          <p className="mb-2 min-h-5 text-xs text-slate-500">{typingIndicator ? `${typingIndicator} typing...` : ''}</p>
          <form className="flex gap-2" onSubmit={sendMessage}>
            <input
              className="flex-1 rounded-md border border-slate-300 px-3 py-2 text-sm"
              value={draft}
              onChange={(event) => handleDraftChange(event.target.value)}
              placeholder="Write a message"
            />
            <button
              type="submit"
              disabled={!canSend}
              className="rounded-md bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-500 disabled:bg-slate-300"
            >
              Send
            </button>
          </form>
        </div>
      </section>
    </main>
  );
}

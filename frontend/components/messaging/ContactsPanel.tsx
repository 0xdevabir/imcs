'use client';

import React, { useEffect, useRef, useState } from 'react';
import { authFetch } from '@/lib/config';
import { OnlineUser, SearchedUser, UserStatus } from './types';

const AVATAR_GRADIENTS = [
  'from-blue-500 to-indigo-600',
  'from-violet-500 to-purple-600',
  'from-emerald-500 to-teal-600',
  'from-rose-500 to-pink-600',
  'from-amber-500 to-orange-600',
  'from-cyan-500 to-sky-600',
  'from-fuchsia-500 to-violet-600',
];

function avatarGradient(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return AVATAR_GRADIENTS[Math.abs(hash) % AVATAR_GRADIENTS.length];
}

function statusDot(status: UserStatus | undefined) {
  if (status === 'dnd') return 'bg-rose-500';
  if (status === 'available') return 'bg-emerald-500';
  return 'bg-slate-400';
}

function statusLabel(status: UserStatus | undefined, isOnline: boolean) {
  if (!isOnline) return 'Offline';
  if (status === 'dnd') return 'Do Not Disturb';
  if (status === 'available') return 'Available';
  return 'Online';
}

function statusTextColor(status: UserStatus | undefined, isOnline: boolean) {
  if (!isOnline) return 'text-slate-400';
  if (status === 'dnd') return 'text-rose-500';
  return 'text-emerald-500';
}

interface ContactsPanelProps {
  apiUrl: string;
  onlineUsers: OnlineUser[];
  allUsers: SearchedUser[];
  searchQuery: string;
  onSearchQueryChange: (value: string) => void;
  onStartVoiceCall: (userId: number, username: string) => void;
  onStartVideoCall: (userId: number, username: string) => void;
  onContactClick: (userId: number, username: string) => void;
  darkMode: boolean;
  currentUserId: number;
}

export function ContactsPanel(props: ContactsPanelProps) {
  const [contacts, setContacts] = useState<SearchedUser[]>([]);
  const [addedIds, setAddedIds] = useState<number[]>([]);
  const [hasFetchedContacts, setHasFetchedContacts] = useState(false);
  const [hasBootstrappedDefaults, setHasBootstrappedDefaults] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    authFetch(`${props.apiUrl}/users/contacts`)
      .then((r) => (r.ok ? r.json() : []))
      .then((data: SearchedUser[]) => {
        setContacts(data);
        setAddedIds(data.map((u) => u.userId));
        setHasFetchedContacts(true);
      })
      .catch(() => setHasFetchedContacts(true));
  }, [props.apiUrl]);

  useEffect(() => {
    if (!hasFetchedContacts || hasBootstrappedDefaults || contacts.length > 0) return;
    const defaults = props.allUsers.filter((u) => u.userId !== props.currentUserId);
    if (defaults.length === 0) return;
    setContacts(defaults);
    setAddedIds(defaults.map((u) => u.userId));
    setHasBootstrappedDefaults(true);
  }, [hasFetchedContacts, hasBootstrappedDefaults, contacts.length, props.allUsers, props.currentUserId]);

  const showToast = (msg: string) => {
    setToast(msg);
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    toastTimerRef.current = setTimeout(() => setToast(null), 3000);
  };

  const handleAdd = async (user: SearchedUser) => {
    if (addedIds.includes(user.userId)) return;
    const res = await authFetch(`${props.apiUrl}/users/contacts`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contactUserId: user.userId }),
    });
    if (!res.ok) { showToast('Failed to add contact'); return; }
    setContacts((prev) => [...prev, user]);
    setAddedIds((prev) => [...prev, user.userId]);
    setModalOpen(false);
    showToast(`${user.username} added to contacts`);
  };

  const handleRemove = async (userId: number, username: string) => {
    const res = await authFetch(`${props.apiUrl}/users/contacts/${userId}`, { method: 'DELETE' });
    if (!res.ok) { showToast('Failed to remove contact'); return; }
    setContacts((prev) => prev.filter((u) => u.userId !== userId));
    setAddedIds((prev) => prev.filter((id) => id !== userId));
    showToast(`${username} removed`);
  };

  const isOnline = (userId: number) => props.onlineUsers.some((u) => u.userId === userId);
  const getStatus = (userId: number) => props.onlineUsers.find((u) => u.userId === userId)?.status;

  const isSearching = props.searchQuery.trim().length >= 1;
  const otherUsers = props.allUsers.filter((u) => u.userId !== props.currentUserId);
  const onlineOthers = props.onlineUsers.filter((u) => u.userId !== props.currentUserId && !addedIds.includes(u.userId));
  const offlineOthers = otherUsers.filter((u) => !isOnline(u.userId) && !addedIds.includes(u.userId));

  const onlineContactCount = contacts.filter((c) => isOnline(c.userId)).length;

  return (
    <section className={`h-full flex flex-col ${
      props.darkMode ? 'bg-slate-950 text-slate-100' : 'bg-slate-50 text-slate-900'
    }`}>
      {/* Header */}
      <div className={`px-5 pt-5 pb-4 border-b ${
        props.darkMode ? 'border-white/5 bg-slate-900' : 'border-slate-200 bg-white'
      }`}>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className={`text-lg font-bold tracking-tight ${props.darkMode ? 'text-slate-100' : 'text-slate-900'}`}>
              Contacts
            </h1>
            <p className={`text-xs mt-0.5 ${props.darkMode ? 'text-slate-500' : 'text-slate-500'}`}>
              {contacts.length} saved
              {onlineContactCount > 0 && (
                <span className="inline-flex items-center gap-1 ml-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                  {onlineContactCount} online
                </span>
              )}
            </p>
          </div>

          <button
            type="button"
            onClick={() => setModalOpen(true)}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl text-sm font-semibold text-white bg-blue-600 hover:bg-blue-500 transition-all duration-150 active:scale-95 shadow-sm shadow-blue-500/25"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            <span className="hidden sm:inline">Add Contact</span>
          </button>
        </div>

        {/* Search */}
        <div className={`flex items-center gap-2 rounded-xl px-3 py-2 ${
          props.darkMode ? 'bg-slate-800' : 'bg-slate-100'
        }`}>
          <svg className={`w-4 h-4 flex-shrink-0 ${props.darkMode ? 'text-slate-500' : 'text-slate-400'}`}
            fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            value={props.searchQuery}
            onChange={(e) => props.onSearchQueryChange(e.target.value)}
            placeholder="Search by username..."
            className={`flex-1 bg-transparent text-sm outline-none ${
              props.darkMode ? 'text-slate-200 placeholder:text-slate-600' : 'text-slate-800 placeholder:text-slate-400'
            }`}
          />
          {props.searchQuery && (
            <button type="button" onClick={() => props.onSearchQueryChange('')}
              className={`flex-shrink-0 transition-colors ${props.darkMode ? 'text-slate-500 hover:text-slate-300' : 'text-slate-400 hover:text-slate-600'}`}>
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {isSearching ? (
          <div className="px-4 py-3">
            <SectionLabel label="Results" darkMode={props.darkMode} />
            {otherUsers
              .filter((u) => u.username.toLowerCase().includes(props.searchQuery.toLowerCase()))
              .length === 0 ? (
              <div className="text-center py-10">
                <p className={`text-sm ${props.darkMode ? 'text-slate-500' : 'text-slate-400'}`}>No users match "{props.searchQuery}"</p>
              </div>
            ) : (
              otherUsers
                .filter((u) => u.username.toLowerCase().includes(props.searchQuery.toLowerCase()))
                .map((user) => (
                  <ContactRow
                    key={user.userId}
                    user={user}
                    isOnline={isOnline(user.userId)}
                    onlineStatus={getStatus(user.userId)}
                    isAdded={addedIds.includes(user.userId)}
                    darkMode={props.darkMode}
                    onMessage={() => props.onContactClick(user.userId, user.username)}
                    onVoiceCall={() => props.onStartVoiceCall(user.userId, user.username)}
                    onVideoCall={() => props.onStartVideoCall(user.userId, user.username)}
                    onRemove={addedIds.includes(user.userId) ? () => handleRemove(user.userId, user.username) : undefined}
                  />
                ))
            )}
          </div>
        ) : (
          <div>
            {/* My Contacts */}
            {contacts.length > 0 && (
              <div>
                <div className="px-4 pt-4 pb-1">
                  <SectionLabel label={`Contacts · ${contacts.length}`} darkMode={props.darkMode} />
                </div>
                {contacts.map((user) => (
                  <ContactRow
                    key={user.userId}
                    user={user}
                    isOnline={isOnline(user.userId)}
                    onlineStatus={getStatus(user.userId)}
                    isAdded={true}
                    darkMode={props.darkMode}
                    onMessage={() => props.onContactClick(user.userId, user.username)}
                    onVoiceCall={() => props.onStartVoiceCall(user.userId, user.username)}
                    onVideoCall={() => props.onStartVideoCall(user.userId, user.username)}
                    onRemove={() => handleRemove(user.userId, user.username)}
                  />
                ))}
              </div>
            )}

            {/* Online (not in contacts) */}
            {onlineOthers.length > 0 && (
              <div>
                <div className="px-4 pt-4 pb-1">
                  <SectionLabel label={`Online Now · ${onlineOthers.length}`} accent="emerald" darkMode={props.darkMode} />
                </div>
                {onlineOthers.map((u) => (
                  <ContactRow
                    key={u.userId}
                    user={{ userId: u.userId, username: u.username, role: 'user' }}
                    isOnline={true}
                    onlineStatus={u.status}
                    isAdded={false}
                    darkMode={props.darkMode}
                    onMessage={() => props.onContactClick(u.userId, u.username)}
                    onVoiceCall={() => props.onStartVoiceCall(u.userId, u.username)}
                    onVideoCall={() => props.onStartVideoCall(u.userId, u.username)}
                  />
                ))}
              </div>
            )}

            {/* Offline */}
            {offlineOthers.length > 0 && (
              <div>
                <div className="px-4 pt-4 pb-1">
                  <SectionLabel label={`Offline · ${offlineOthers.length}`} darkMode={props.darkMode} />
                </div>
                {offlineOthers.map((user) => (
                  <ContactRow
                    key={user.userId}
                    user={user}
                    isOnline={false}
                    isAdded={addedIds.includes(user.userId)}
                    darkMode={props.darkMode}
                    onMessage={() => props.onContactClick(user.userId, user.username)}
                    onVoiceCall={() => props.onStartVoiceCall(user.userId, user.username)}
                    onVideoCall={() => props.onStartVideoCall(user.userId, user.username)}
                  />
                ))}
              </div>
            )}

            {otherUsers.length === 0 && contacts.length === 0 && (
              <div className="flex flex-col items-center justify-center py-20 text-center px-8">
                <div className={`w-16 h-16 rounded-2xl flex items-center justify-center mb-5 ${
                  props.darkMode ? 'bg-slate-800' : 'bg-white shadow-sm'
                }`}>
                  <svg className={`w-8 h-8 ${props.darkMode ? 'text-slate-600' : 'text-slate-300'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                </div>
                <p className={`text-sm font-semibold mb-1 ${props.darkMode ? 'text-slate-400' : 'text-slate-600'}`}>No contacts yet</p>
                <p className={`text-xs leading-relaxed ${props.darkMode ? 'text-slate-600' : 'text-slate-400'}`}>
                  Click Add Contact to find people by username
                </p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Add Contact Modal */}
      {modalOpen && (
        <AddContactModal
          darkMode={props.darkMode}
          addedIds={addedIds}
          currentUserId={props.currentUserId}
          apiUrl={props.apiUrl}
          onAdd={handleAdd}
          onClose={() => setModalOpen(false)}
        />
      )}

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[60] pointer-events-none">
          <div className={`flex items-center gap-2.5 px-4 py-2.5 rounded-xl shadow-xl text-sm font-medium ${
            props.darkMode ? 'bg-slate-800 text-white ring-1 ring-slate-700' : 'bg-slate-900 text-white'
          }`}>
            <span className="w-5 h-5 rounded-full bg-emerald-500 flex items-center justify-center flex-shrink-0">
              <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            </span>
            {toast}
          </div>
        </div>
      )}
    </section>
  );
}

// ─── ContactRow ───────────────────────────────────────────────────────────────
interface ContactRowProps {
  user: SearchedUser;
  isOnline: boolean;
  onlineStatus?: UserStatus;
  isAdded: boolean;
  darkMode: boolean;
  onMessage: () => void;
  onVoiceCall: () => void;
  onVideoCall: () => void;
  onRemove?: () => void;
}

function ContactRow(props: ContactRowProps) {
  const grad = avatarGradient(props.user.username);

  return (
    <div className={`group flex items-center gap-3 px-4 py-3 transition-colors duration-100 ${
      props.darkMode ? 'hover:bg-slate-800/50' : 'hover:bg-slate-50'
    }`}>
      {/* Avatar + status */}
      <div className="relative flex-shrink-0">
        <button
          type="button"
          onClick={props.onMessage}
          className={`w-11 h-11 rounded-full bg-gradient-to-br ${grad} flex items-center justify-center text-sm font-bold text-white shadow-sm`}
        >
          {props.user.username.charAt(0).toUpperCase()}
        </button>
        <span className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 ${
          props.darkMode ? 'border-slate-950' : 'border-white'
        } ${props.isOnline ? statusDot(props.onlineStatus) : 'bg-slate-300'}`} />
      </div>

      {/* Info */}
      <button
        type="button"
        onClick={props.onMessage}
        className="flex-1 min-w-0 text-left"
      >
        <div className="flex items-center gap-2">
          <p className={`text-sm font-semibold truncate ${props.darkMode ? 'text-slate-100' : 'text-slate-900'}`}>
            {props.user.username}
          </p>
          {props.user.role === 'admin' && (
            <span className={`flex-shrink-0 text-[10px] font-bold rounded px-1.5 py-0.5 ${
              props.darkMode ? 'bg-indigo-500/15 text-indigo-400' : 'bg-indigo-50 text-indigo-600'
            }`}>ADMIN</span>
          )}
        </div>
        <p className={`text-xs mt-0.5 flex items-center gap-1.5 ${statusTextColor(props.onlineStatus, props.isOnline)}`}>
          <span className={`w-1.5 h-1.5 rounded-full ${props.isOnline ? statusDot(props.onlineStatus) : 'bg-slate-400'}`} />
          {statusLabel(props.onlineStatus, props.isOnline)}
        </p>
      </button>

      {/* Actions (show on hover) */}
      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-150">
        <ActionBtn title="Message" onClick={props.onMessage} darkMode={props.darkMode}>
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
          </svg>
        </ActionBtn>
        <ActionBtn title="Voice call" onClick={props.onVoiceCall} darkMode={props.darkMode}>
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
          </svg>
        </ActionBtn>
        <ActionBtn title="Video call" onClick={props.onVideoCall} darkMode={props.darkMode}>
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
          </svg>
        </ActionBtn>
        {props.onRemove && (
          <ActionBtn title="Remove" onClick={props.onRemove} darkMode={props.darkMode} danger>
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13 7a4 4 0 11-8 0 4 4 0 018 0zM9 14a6 6 0 00-6 6v1h12v-1a6 6 0 00-6-6zM21 12h-6" />
            </svg>
          </ActionBtn>
        )}
      </div>
    </div>
  );
}

function ActionBtn({
  children, title, onClick, darkMode, danger,
}: {
  children: React.ReactNode;
  title: string;
  onClick: () => void;
  darkMode: boolean;
  danger?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      className={`w-8 h-8 flex items-center justify-center rounded-lg transition-colors duration-100 ${
        danger
          ? darkMode
            ? 'text-slate-500 hover:text-rose-400 hover:bg-rose-500/10'
            : 'text-slate-400 hover:text-rose-600 hover:bg-rose-50'
          : darkMode
            ? 'text-slate-500 hover:text-slate-200 hover:bg-slate-700'
            : 'text-slate-400 hover:text-slate-700 hover:bg-slate-100'
      }`}
    >
      {children}
    </button>
  );
}

function SectionLabel({ label, accent, darkMode }: { label: string; accent?: string; darkMode: boolean }) {
  const dotColor = accent === 'emerald' ? 'bg-emerald-500' : darkMode ? 'bg-slate-700' : 'bg-slate-300';
  return (
    <div className="flex items-center gap-2 mb-1">
      <span className={`w-1.5 h-1.5 rounded-full ${dotColor}`} />
      <p className={`text-[10px] font-bold uppercase tracking-widest ${darkMode ? 'text-slate-600' : 'text-slate-400'}`}>
        {label}
      </p>
    </div>
  );
}

// ─── AddContactModal ──────────────────────────────────────────────────────────
interface AddContactModalProps {
  darkMode: boolean;
  addedIds: number[];
  currentUserId: number;
  apiUrl: string;
  onAdd: (user: SearchedUser) => void;
  onClose: () => void;
}

function AddContactModal({ darkMode, addedIds, currentUserId, apiUrl, onAdd, onClose }: AddContactModalProps) {
  const [query, setQuery] = useState('');
  const [result, setResult] = useState<SearchedUser | null | 'not-found'>(null);
  const [searching, setSearching] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inputRef = useRef<HTMLInputElement>(null as unknown as HTMLInputElement);

  useEffect(() => {
    const t = setTimeout(() => inputRef.current?.focus(), 50);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  const handleQueryChange = (value: string) => {
    setQuery(value);
    setResult(null);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    const trimmed = value.trim().replace(/^@/, '');
    if (!trimmed) { setSearching(false); return; }
    setSearching(true);
    debounceRef.current = setTimeout(async () => {
      try {
        const res = await authFetch(`${apiUrl}/users/search?q=${encodeURIComponent(trimmed)}`);
        if (!res.ok) { setResult('not-found'); setSearching(false); return; }
        const users = (await res.json()) as SearchedUser[];
        const found = users.find((u) => u.username.toLowerCase() === trimmed.toLowerCase() && u.userId !== currentUserId);
        setResult(found ?? 'not-found');
      } catch {
        setResult('not-found');
      }
      setSearching(false);
    }, 400);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4"
      style={{ background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)' }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className={`w-full sm:max-w-sm rounded-t-2xl sm:rounded-2xl shadow-2xl overflow-hidden ${
        darkMode ? 'bg-slate-900 ring-1 ring-white/10' : 'bg-white ring-1 ring-slate-200'
      }`}>
        {/* Header */}
        <div className={`flex items-center justify-between px-5 py-4 border-b ${darkMode ? 'border-white/5' : 'border-slate-100'}`}>
          <div className="flex items-center gap-3">
            <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${darkMode ? 'bg-blue-500/15' : 'bg-blue-50'}`}>
              <svg className="w-4 h-4 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
              </svg>
            </div>
            <h2 className={`text-sm font-bold ${darkMode ? 'text-white' : 'text-slate-900'}`}>Add Contact</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className={`w-7 h-7 flex items-center justify-center rounded-lg transition-colors ${
              darkMode ? 'text-slate-500 hover:text-slate-300 hover:bg-slate-800' : 'text-slate-400 hover:text-slate-600 hover:bg-slate-100'
            }`}
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="px-5 py-5 space-y-4">
          {/* Input */}
          <div>
            <label className={`block text-xs font-semibold mb-2 ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>
              Username
            </label>
            <div className={`flex items-center gap-0 rounded-xl border overflow-hidden transition-colors ${
              darkMode
                ? 'border-slate-700 bg-slate-800 focus-within:border-blue-500'
                : 'border-slate-200 bg-slate-50 focus-within:border-blue-400 focus-within:bg-white'
            }`}>
              <span className={`pl-3.5 text-sm font-semibold select-none ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>@</span>
              <input
                ref={inputRef}
                type="text"
                value={query.startsWith('@') ? query.slice(1) : query}
                onChange={(e) => handleQueryChange(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && result && result !== 'not-found') onAdd(result);
                }}
                placeholder="username"
                autoComplete="off"
                spellCheck={false}
                className={`flex-1 bg-transparent px-2 py-2.5 text-sm outline-none ${
                  darkMode ? 'text-slate-100 placeholder:text-slate-600' : 'text-slate-900 placeholder:text-slate-400'
                }`}
              />
              {searching && (
                <div className="pr-3">
                  <svg className={`animate-spin w-4 h-4 ${darkMode ? 'text-slate-500' : 'text-slate-400'}`} viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                </div>
              )}
            </div>
          </div>

          {/* Result */}
          <div className="min-h-[80px]">
            {!searching && result === 'not-found' && (
              <div className={`flex items-center gap-3 rounded-xl px-4 py-3 ${
                darkMode ? 'bg-rose-500/8 ring-1 ring-rose-500/15' : 'bg-rose-50 ring-1 ring-rose-200'
              }`}>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                  darkMode ? 'bg-rose-500/15' : 'bg-rose-100'
                }`}>
                  <svg className="w-4 h-4 text-rose-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </div>
                <div>
                  <p className={`text-sm font-semibold ${darkMode ? 'text-rose-400' : 'text-rose-700'}`}>User not found</p>
                  <p className={`text-xs ${darkMode ? 'text-rose-400/60' : 'text-rose-500'}`}>Check the username and try again</p>
                </div>
              </div>
            )}

            {!searching && result && result !== 'not-found' && (
              <div className={`flex items-center gap-3 rounded-xl px-4 py-3 ${
                darkMode ? 'bg-slate-800 ring-1 ring-white/5' : 'bg-slate-50 ring-1 ring-slate-200'
              }`}>
                <div className={`w-10 h-10 rounded-full bg-gradient-to-br ${avatarGradient(result.username)} flex items-center justify-center text-sm font-bold text-white flex-shrink-0`}>
                  {result.username.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-semibold ${darkMode ? 'text-slate-100' : 'text-slate-900'}`}>
                    {result.username}
                  </p>
                  <p className={`text-xs ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>
                    @{result.username.toLowerCase()}
                    {result.role === 'admin' && (
                      <span className={`ml-2 font-semibold ${darkMode ? 'text-amber-400' : 'text-amber-600'}`}>· Admin</span>
                    )}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => onAdd(result as SearchedUser)}
                  disabled={addedIds.includes(result.userId)}
                  className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all active:scale-95 ${
                    addedIds.includes(result.userId)
                      ? darkMode ? 'bg-slate-700 text-slate-500 cursor-not-allowed' : 'bg-slate-100 text-slate-400 cursor-not-allowed'
                      : 'bg-blue-600 hover:bg-blue-500 text-white shadow-sm'
                  }`}
                >
                  {addedIds.includes(result.userId) ? (
                    <>
                      <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                      Added
                    </>
                  ) : (
                    <>
                      <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                      </svg>
                      Add
                    </>
                  )}
                </button>
              </div>
            )}
          </div>

          <p className={`text-[11px] ${darkMode ? 'text-slate-600' : 'text-slate-400'}`}>
            Try <span className={`font-mono font-semibold ${darkMode ? 'text-slate-500' : 'text-slate-500'}`}>@abir</span>,{' '}
            <span className={`font-mono font-semibold ${darkMode ? 'text-slate-500' : 'text-slate-500'}`}>@rayat</span>,{' '}
            or any team member&apos;s username.
          </p>
        </div>
      </div>
    </div>
  );
}

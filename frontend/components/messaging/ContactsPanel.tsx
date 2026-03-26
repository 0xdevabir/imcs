'use client';

import { useEffect, useRef, useState } from 'react';
import { authFetch } from '@/lib/config';
import { OnlineUser, SearchedUser, UserStatus } from './types';

// ─── Shared helpers ───────────────────────────────────────────────────────────
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

// ─── Props ────────────────────────────────────────────────────────────────────
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

// ─── Main panel ───────────────────────────────────────────────────────────────
export function ContactsPanel(props: ContactsPanelProps) {
  const [contacts, setContacts] = useState<SearchedUser[]>([]);
  const [addedIds, setAddedIds] = useState<number[]>([]);
  const [hasFetchedContacts, setHasFetchedContacts] = useState(false);
  const [hasBootstrappedDefaults, setHasBootstrappedDefaults] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Load contacts from backend
  useEffect(() => {
    authFetch(`${props.apiUrl}/users/contacts`)
      .then((r) => (r.ok ? r.json() : []))
      .then((data: SearchedUser[]) => {
        setContacts(data);
        setAddedIds(data.map((u) => u.userId));
        setHasFetchedContacts(true);
      })
      .catch(() => {
        setHasFetchedContacts(true);
      });
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
    showToast(`${username} removed from contacts`);
  };

  const isOnline = (userId: number) => props.onlineUsers.some((u) => u.userId === userId);
  const getStatus = (userId: number) => props.onlineUsers.find((u) => u.userId === userId)?.status;
  const isSearching = props.searchQuery.trim().length >= 2;
  const otherUsers = props.allUsers.filter((u) => u.userId !== props.currentUserId);
  const onlineOthers = props.onlineUsers.filter((u) => u.userId !== props.currentUserId && !addedIds.includes(u.userId));
  const offlineOthers = otherUsers.filter((u) => !isOnline(u.userId) && !addedIds.includes(u.userId));

  return (
    <section
      className={`h-full flex flex-col transition-all duration-300 ${
        props.darkMode ? 'bg-slate-950/90 text-slate-200' : 'bg-slate-50/80 text-slate-800'
      }`}
    >
      {/* Header */}
      <div className={`px-5 pt-6 pb-4 border-b ${props.darkMode ? 'border-slate-800/60' : 'border-slate-200/80'}`}>
        <div className="flex items-start justify-between mb-4">
          <div>
            <h1 className="text-xl font-bold tracking-tight">Contacts</h1>
            <p className={`text-sm mt-1 ${props.darkMode ? 'text-slate-500' : 'text-slate-400'}`}>
              {contacts.length} saved · {onlineOthers.length + props.onlineUsers.filter(u => addedIds.includes(u.userId) && u.userId !== props.currentUserId).length} online
            </p>
          </div>

          {/* Add Contact button */}
          <AddContactButton darkMode={props.darkMode} onClick={() => setModalOpen(true)} />
        </div>

        {/* Search */}
        <div className="relative max-w-lg">
          <svg
            className={`absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 ${props.darkMode ? 'text-slate-500' : 'text-slate-400'}`}
            fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            value={props.searchQuery}
            onChange={(e) => props.onSearchQueryChange(e.target.value)}
            placeholder="Search contacts..."
            className={`w-full rounded-xl border pl-10 pr-4 py-2.5 text-sm outline-none transition-all ${
              props.darkMode
                ? 'border-slate-700/80 bg-slate-900 text-slate-200 placeholder:text-slate-600 focus:border-blue-500/60 focus:ring-2 focus:ring-blue-500/10'
                : 'border-slate-200 bg-white text-slate-800 placeholder:text-slate-400 focus:border-blue-400 focus:ring-2 focus:ring-blue-500/10'
            }`}
          />
          {props.searchQuery && (
            <button
              type="button"
              onClick={() => props.onSearchQueryChange('')}
              className={`absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-full transition-colors ${
                props.darkMode ? 'text-slate-500 hover:text-slate-300' : 'text-slate-400 hover:text-slate-600'
              }`}
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-4 py-4">
        {isSearching ? (
          <div>
            <SectionHeader
              label="Search Results"
              count={otherUsers.filter((u) => u.username.toLowerCase().includes(props.searchQuery.toLowerCase())).length}
              darkMode={props.darkMode}
            />
            {otherUsers.length === 0 ? (
              <EmptyMessage message="No users found" darkMode={props.darkMode} />
            ) : (
              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {otherUsers
                  .filter((u) => u.username.toLowerCase().includes(props.searchQuery.toLowerCase()))
                  .map((user) => (
                    <ContactCard
                      key={user.userId}
                      user={user}
                      isOnline={isOnline(user.userId)}
                      onlineStatus={getStatus(user.userId)}
                      isAdded={addedIds.includes(user.userId)}
                      onStartVoiceCall={() => props.onStartVoiceCall(user.userId, user.username)}
                      onStartVideoCall={() => props.onStartVideoCall(user.userId, user.username)}
                      onContactClick={() => props.onContactClick(user.userId, user.username)}
                      darkMode={props.darkMode}
                    />
                  ))}
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-8">
            {/* My Contacts section */}
            {contacts.length > 0 && (
              <div>
                <SectionHeader label="My Contacts" count={contacts.length} accent="blue" darkMode={props.darkMode} />
                <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                  {contacts.map((user) => (
                    <ContactCard
                      key={user.userId}
                      user={user}
                      isOnline={isOnline(user.userId)}
                      onlineStatus={getStatus(user.userId)}
                      isAdded={true}
                      onStartVoiceCall={() => props.onStartVoiceCall(user.userId, user.username)}
                      onStartVideoCall={() => props.onStartVideoCall(user.userId, user.username)}
                      onContactClick={() => props.onContactClick(user.userId, user.username)}
                      onRemove={() => handleRemove(user.userId, user.username)}
                      darkMode={props.darkMode}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Online section (users not in contacts) */}
            {onlineOthers.length > 0 && (
              <div>
                <SectionHeader label="Online" count={onlineOthers.length} accent="emerald" darkMode={props.darkMode} />
                <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                  {onlineOthers.map((user) => (
                    <ContactCard
                      key={user.userId}
                      user={{ userId: user.userId, username: user.username, role: 'user' }}
                      isOnline={true}
                      onlineStatus={user.status}
                      isAdded={false}
                      onStartVoiceCall={() => props.onStartVoiceCall(user.userId, user.username)}
                      onStartVideoCall={() => props.onStartVideoCall(user.userId, user.username)}
                      onContactClick={() => props.onContactClick(user.userId, user.username)}
                      darkMode={props.darkMode}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Offline section */}
            {offlineOthers.length > 0 && (
              <div>
                <SectionHeader label="Offline" count={offlineOthers.length} darkMode={props.darkMode} />
                <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                  {offlineOthers.map((user) => (
                    <ContactCard
                      key={user.userId}
                      user={user}
                      isOnline={false}
                      isAdded={addedIds.includes(user.userId)}
                      onStartVoiceCall={() => props.onStartVoiceCall(user.userId, user.username)}
                      onStartVideoCall={() => props.onStartVideoCall(user.userId, user.username)}
                      onContactClick={() => props.onContactClick(user.userId, user.username)}
                      darkMode={props.darkMode}
                    />
                  ))}
                </div>
              </div>
            )}

            {otherUsers.length === 0 && (
              <div className="flex flex-col items-center justify-center py-20 text-center">
                <div className={`w-16 h-16 rounded-2xl flex items-center justify-center mb-5 ${
                  props.darkMode ? 'bg-slate-800' : 'bg-white shadow-sm'
                }`}>
                  <svg className={`w-8 h-8 ${props.darkMode ? 'text-slate-600' : 'text-slate-300'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                </div>
                <p className={`text-sm font-medium mb-1 ${props.darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                  No contacts yet
                </p>
                <p className={`text-xs ${props.darkMode ? 'text-slate-600' : 'text-slate-400'}`}>
                  Click <span className="font-semibold">+ Add Contact</span> to get started
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
      {toast && <Toast message={toast} darkMode={props.darkMode} />}
    </section>
  );
}

// ─── AddContactButton ─────────────────────────────────────────────────────────
function AddContactButton({ darkMode, onClick }: { darkMode: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-semibold transition-all duration-150 active:scale-95 ${
        darkMode
          ? 'bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-900/40'
          : 'bg-blue-600 hover:bg-blue-500 text-white shadow-md shadow-blue-500/25'
      }`}
    >
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
      </svg>
      <span className="hidden sm:inline">Add Contact</span>
    </button>
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

  // Focus input on open
  useEffect(() => {
    const t = setTimeout(() => inputRef.current?.focus(), 50);
    return () => clearTimeout(t);
  }, []);

  // Close on Escape
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
    }, 450);
  };

  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6"
      style={{ background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(4px)' }}
      onClick={handleBackdropClick}
    >
      <div
        className={`w-full max-w-sm rounded-2xl shadow-2xl overflow-hidden scale-in ${
          darkMode ? 'bg-slate-900 ring-1 ring-slate-700' : 'bg-white ring-1 ring-slate-100'
        }`}
      >
        {/* Modal header */}
        <div className={`flex items-center justify-between px-5 py-4 border-b ${darkMode ? 'border-slate-800' : 'border-slate-100'}`}>
          <div className="flex items-center gap-2.5">
            <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${darkMode ? 'bg-blue-500/15' : 'bg-blue-50'}`}>
              <svg className="w-4 h-4 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
              </svg>
            </div>
            <h2 className={`text-sm font-bold ${darkMode ? 'text-white' : 'text-slate-900'}`}>Add New Contact</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className={`p-1.5 rounded-lg transition-colors ${darkMode ? 'text-slate-500 hover:text-slate-300 hover:bg-slate-800' : 'text-slate-400 hover:text-slate-600 hover:bg-slate-100'}`}
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="px-5 py-5 space-y-4">
          {/* Username input */}
          <UsernameInput
            value={query}
            onChange={handleQueryChange}
            darkMode={darkMode}
            inputRef={inputRef}
          />

          {/* Result area */}
          <div className="min-h-[4rem]">
            {searching && (
              <div className="flex items-center justify-center py-6">
                <svg className={`animate-spin w-5 h-5 ${darkMode ? 'text-slate-500' : 'text-slate-400'}`} viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
              </div>
            )}

            {!searching && result === 'not-found' && (
              <UserNotFound darkMode={darkMode} />
            )}

            {!searching && result && result !== 'not-found' && (
              <UserSearchResult
                user={result}
                isAdded={addedIds.includes(result.userId)}
                onAdd={() => onAdd(result as SearchedUser)}
                darkMode={darkMode}
              />
            )}

            {!searching && !result && query.trim() && (
              /* typed something but debounce hasn't fired yet — show nothing */ null
            )}
          </div>
        </div>

        {/* Footer hint */}
        <div className={`px-5 pb-4`}>
          <p className={`text-[11px] ${darkMode ? 'text-slate-600' : 'text-slate-400'}`}>
            Tip: try <span className={`font-semibold ${darkMode ? 'text-slate-500' : 'text-slate-500'}`}>@abir</span>, <span className={`font-semibold ${darkMode ? 'text-slate-500' : 'text-slate-500'}`}>@rayat</span>, or any team member&apos;s username.
          </p>
        </div>
      </div>
    </div>
  );
}

// ─── UsernameInput ────────────────────────────────────────────────────────────
interface UsernameInputProps {
  value: string;
  onChange: (v: string) => void;
  darkMode: boolean;
  inputRef: React.RefObject<HTMLInputElement>;
}

function UsernameInput({ value, onChange, darkMode, inputRef }: UsernameInputProps) {
  return (
    <div>
      <label className={`block text-xs font-semibold mb-1.5 ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>
        Username
      </label>
      <div className="relative">
        <span className={`absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-semibold select-none ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>
          @
        </span>
        <input
          ref={inputRef}
          type="text"
          value={value.startsWith('@') ? value.slice(1) : value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="username"
          autoComplete="off"
          spellCheck={false}
          className={`w-full rounded-xl border pl-8 pr-4 py-2.5 text-sm outline-none transition-all duration-150 ${
            darkMode
              ? 'border-slate-700 bg-slate-800 text-slate-100 placeholder:text-slate-600 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/15'
              : 'border-slate-200 bg-slate-50 text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10'
          }`}
        />
      </div>
    </div>
  );
}

// ─── UserSearchResult ─────────────────────────────────────────────────────────
interface UserSearchResultProps {
  user: SearchedUser;
  isAdded: boolean;
  onAdd: () => void;
  darkMode: boolean;
}

function UserSearchResult({ user, isAdded, onAdd, darkMode }: UserSearchResultProps) {
  const grad = avatarGradient(user.username);

  return (
    <div className={`flex items-center gap-3 rounded-xl px-3.5 py-3 slide-up ${
      darkMode ? 'bg-slate-800 ring-1 ring-slate-700' : 'bg-slate-50 ring-1 ring-slate-100'
    }`}>
      {/* Avatar */}
      <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${grad} flex items-center justify-center text-sm font-bold text-white flex-shrink-0 shadow-sm`}>
        {user.username.charAt(0).toUpperCase()}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <p className={`text-sm font-semibold truncate ${darkMode ? 'text-white' : 'text-slate-900'}`}>
          {user.username}
        </p>
        <p className={`text-xs truncate ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>
          @{user.username.toLowerCase()}
          {user.role === 'admin' && (
            <span className={`ml-2 font-medium ${darkMode ? 'text-amber-400' : 'text-amber-600'}`}>· Admin</span>
          )}
        </p>
      </div>

      {/* Add button */}
      <button
        type="button"
        onClick={onAdd}
        disabled={isAdded}
        className={`flex-shrink-0 flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-150 active:scale-95 ${
          isAdded
            ? darkMode
              ? 'bg-slate-700 text-slate-500 cursor-not-allowed'
              : 'bg-slate-100 text-slate-400 cursor-not-allowed'
            : darkMode
            ? 'bg-blue-600 hover:bg-blue-500 text-white shadow-sm shadow-blue-900/40'
            : 'bg-blue-600 hover:bg-blue-500 text-white shadow-sm shadow-blue-500/25'
        }`}
      >
        {isAdded ? (
          <>
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
            Added
          </>
        ) : (
          <>
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            Add
          </>
        )}
      </button>
    </div>
  );
}

// ─── UserNotFound ─────────────────────────────────────────────────────────────
function UserNotFound({ darkMode }: { darkMode: boolean }) {
  return (
    <div className={`flex flex-col items-center justify-center py-5 rounded-xl fade-in ${
      darkMode ? 'bg-slate-800/50' : 'bg-slate-50'
    }`}>
      <div className={`w-8 h-8 rounded-full flex items-center justify-center mb-2 ${darkMode ? 'bg-slate-700' : 'bg-slate-100'}`}>
        <svg className={`w-4 h-4 ${darkMode ? 'text-slate-500' : 'text-slate-400'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
        </svg>
      </div>
      <p className={`text-sm font-medium ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
        User not found
      </p>
      <p className={`text-xs mt-0.5 ${darkMode ? 'text-slate-600' : 'text-slate-400'}`}>
        Check the username and try again
      </p>
    </div>
  );
}

// ─── Toast ────────────────────────────────────────────────────────────────────
function Toast({ message, darkMode }: { message: string; darkMode: boolean }) {
  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[60] pointer-events-none slide-up">
      <div className={`flex items-center gap-2.5 px-4 py-2.5 rounded-xl shadow-xl text-sm font-medium ${
        darkMode
          ? 'bg-slate-800 text-white ring-1 ring-slate-700'
          : 'bg-slate-900 text-white'
      }`}>
        <span className="flex-shrink-0 w-5 h-5 rounded-full bg-emerald-500 flex items-center justify-center">
          <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        </span>
        {message}
      </div>
    </div>
  );
}

// ─── Sub-components shared within panel ───────────────────────────────────────
function SectionHeader({ label, count, accent, darkMode }: { label: string; count: number; accent?: string; darkMode: boolean }) {
  const dotColor = accent === 'emerald' ? 'bg-emerald-500' : darkMode ? 'bg-slate-600' : 'bg-slate-300';
  return (
    <div className="flex items-center gap-2 mb-3">
      <span className={`w-1.5 h-1.5 rounded-full ${dotColor}`} />
      <p className={`text-[11px] font-bold uppercase tracking-widest ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>
        {label}
      </p>
      <span className={`text-[10px] font-medium rounded-full px-1.5 py-0.5 ${darkMode ? 'bg-slate-800 text-slate-500' : 'bg-slate-100 text-slate-400'}`}>
        {count}
      </span>
    </div>
  );
}

function EmptyMessage({ message, darkMode }: { message: string; darkMode: boolean }) {
  return (
    <p className={`text-sm text-center py-8 ${darkMode ? 'text-slate-600' : 'text-slate-400'}`}>{message}</p>
  );
}

interface ContactCardProps {
  user: SearchedUser;
  isOnline: boolean;
  onlineStatus?: UserStatus;
  isAdded: boolean;
  onStartVoiceCall: () => void;
  onStartVideoCall: () => void;
  onContactClick: (userId: number, username: string) => void;
  onRemove?: () => void;
  darkMode: boolean;
}

function ContactCard({ user, isOnline, onlineStatus, isAdded, onStartVoiceCall, onStartVideoCall, onContactClick, onRemove, darkMode }: ContactCardProps) {
  const grad = avatarGradient(user.username);

  return (
    <div
      onClick={() => onContactClick(user.userId, user.username)}
      className={`group relative flex flex-col items-center gap-3 rounded-2xl p-4 cursor-pointer transition-all duration-200 ${
        darkMode
          ? 'bg-slate-900/60 hover:bg-slate-800/80 ring-1 ring-slate-800 hover:ring-slate-700'
          : 'bg-white hover:shadow-md ring-1 ring-slate-100 hover:ring-slate-200'
      }`}
    >
      {/* "In contacts" badge */}
      {isAdded && (
        <div className={`absolute top-2.5 right-2.5 w-5 h-5 rounded-full flex items-center justify-center ${
          darkMode ? 'bg-emerald-500/20 text-emerald-400' : 'bg-emerald-50 text-emerald-500'
        }`} title="In your contacts">
          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        </div>
      )}

      {/* Avatar */}
      <div className="relative">
        <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${grad} flex items-center justify-center text-xl font-bold text-white shadow-sm`}>
          {user.username.charAt(0).toUpperCase()}
        </div>
        <span className={`absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full border-2 ${darkMode ? 'border-slate-900' : 'border-white'} ${isOnline ? statusDot(onlineStatus) : 'bg-slate-300'}`} />
      </div>

      {/* Info */}
      <div className="text-center min-w-0 w-full">
        <p className="text-sm font-semibold truncate">{user.username}</p>
        <p className={`text-xs mt-0.5 ${statusTextColor(onlineStatus, isOnline)}`}>
          {statusLabel(onlineStatus, isOnline)}
        </p>
        {user.role === 'admin' && (
          <span className={`inline-block mt-1 text-[10px] font-semibold px-2 py-0.5 rounded-full ${
            darkMode ? 'bg-indigo-500/15 text-indigo-400' : 'bg-indigo-50 text-indigo-600'
          }`}>
            Admin
          </span>
        )}
      </div>

      {/* Hover actions */}
      <div className="flex items-center gap-1.5 w-full opacity-0 group-hover:opacity-100 transition-all duration-200">
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); onContactClick(user.userId, user.username); }}
          className={`flex-1 flex items-center justify-center gap-1 py-1.5 rounded-lg text-xs font-medium transition-colors ${
            darkMode ? 'bg-slate-800 hover:bg-slate-700 text-slate-300' : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
          }`}
          title="Message"
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
          </svg>
        </button>
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); onStartVoiceCall(); }}
          className={`flex-1 flex items-center justify-center gap-1 py-1.5 rounded-lg text-xs font-medium transition-colors ${
            darkMode ? 'bg-slate-800 hover:bg-emerald-500/20 text-slate-300 hover:text-emerald-400' : 'bg-slate-100 hover:bg-emerald-50 text-slate-600 hover:text-emerald-600'
          }`}
          title="Voice call"
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
          </svg>
        </button>
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); onStartVideoCall(); }}
          className={`flex-1 flex items-center justify-center gap-1 py-1.5 rounded-lg text-xs font-medium transition-colors ${
            darkMode ? 'bg-slate-800 hover:bg-blue-500/20 text-slate-300 hover:text-blue-400' : 'bg-slate-100 hover:bg-blue-50 text-slate-600 hover:text-blue-600'
          }`}
          title="Video call"
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
          </svg>
        </button>
        {onRemove && (
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onRemove(); }}
            className={`flex-1 flex items-center justify-center gap-1 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              darkMode ? 'bg-slate-800 hover:bg-rose-500/20 text-slate-300 hover:text-rose-400' : 'bg-slate-100 hover:bg-rose-50 text-slate-600 hover:text-rose-500'
            }`}
            title="Remove contact"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13 7a4 4 0 11-8 0 4 4 0 018 0zM9 14a6 6 0 00-6 6v1h12v-1a6 6 0 00-6-6zM21 12h-6" />
            </svg>
          </button>
        )}
      </div>
    </div>
  );
}

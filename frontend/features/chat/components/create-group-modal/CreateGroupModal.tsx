'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { authFetch } from '@/lib/config';
import { SearchedUser } from '@/features/chat/types';

interface CreateGroupModalProps {
  darkMode: boolean;
  apiUrl: string;
  currentUserId: number;
  onClose: () => void;
  onCreate: (data: { key: string; name: string; participantUsernames: string[] }) => void;
}

function slugify(str: string): string {
  return str.trim().toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '').slice(0, 40);
}

function AvatarCircle({ username, size = 'sm' }: { username: string; size?: 'sm' | 'md' }) {
  const colors = [
    'from-blue-500 to-indigo-600', 'from-violet-500 to-purple-600', 'from-rose-500 to-pink-600',
    'from-emerald-500 to-teal-600', 'from-amber-500 to-orange-600', 'from-cyan-500 to-sky-600',
  ];
  const color = colors[username.charCodeAt(0) % colors.length];
  const dim = size === 'sm' ? 'w-7 h-7 text-xs' : 'w-9 h-9 text-sm';
  return (
    <div className={`${dim} rounded-full bg-gradient-to-br ${color} flex items-center justify-center font-semibold text-white flex-shrink-0`}>
      {username.charAt(0).toUpperCase()}
    </div>
  );
}

export function CreateGroupModal({ darkMode, apiUrl, currentUserId, onClose, onCreate }: CreateGroupModalProps) {
  const [name, setName] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchedUser[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [selected, setSelected] = useState<SearchedUser[]>([]);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const [submitting, setSubmitting] = useState(false);

  const searchRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Clear pending debounce on unmount
  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  const runSearch = useCallback(async (q: string) => {
    if (q.trim().length < 1) { setSearchResults([]); setDropdownOpen(false); return; }
    setIsSearching(true);
    try {
      const res = await authFetch(`${apiUrl}/users/search?q=${encodeURIComponent(q.trim())}`);
      if (res.ok) {
        const users = (await res.json()) as SearchedUser[];
        const filtered = users.filter(u => u.userId !== currentUserId && !selected.some(s => s.userId === u.userId));
        setSearchResults(filtered.slice(0, 8));
        setDropdownOpen(filtered.length > 0);
        setHighlightedIndex(-1);
      }
    } finally {
      setIsSearching(false);
    }
  }, [apiUrl, currentUserId, selected]);

  const handleSearchChange = (value: string) => {
    setSearchQuery(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!value.trim()) { setSearchResults([]); setDropdownOpen(false); return; }
    debounceRef.current = setTimeout(() => runSearch(value), 280);
  };

  const addUser = (user: SearchedUser) => {
    if (selected.some(s => s.userId === user.userId)) return;
    setSelected(prev => [...prev, user]);
    setSearchQuery('');
    setSearchResults([]);
    setDropdownOpen(false);
    searchRef.current?.focus();
  };

  const removeUser = (userId: number) => setSelected(prev => prev.filter(u => u.userId !== userId));

  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!dropdownOpen || searchResults.length === 0) {
      if (e.key === 'Backspace' && !searchQuery && selected.length > 0) {
        setSelected(prev => prev.slice(0, -1));
      }
      return;
    }
    if (e.key === 'ArrowDown') { e.preventDefault(); setHighlightedIndex(i => Math.min(i + 1, searchResults.length - 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setHighlightedIndex(i => Math.max(i - 1, 0)); }
    else if (e.key === 'Enter') {
      e.preventDefault();
      if (highlightedIndex >= 0) addUser(searchResults[highlightedIndex]);
      else if (searchResults.length === 1) addUser(searchResults[0]);
    }
    else if (e.key === 'Escape') { setDropdownOpen(false); }
    else if (e.key === 'Backspace' && !searchQuery && selected.length > 0) {
      setSelected(prev => prev.slice(0, -1));
    }
  };

  const handleSubmit = async () => {
    const trimmedName = name.trim();
    if (!trimmedName) return;
    const key = slugify(trimmedName) || `group-${Date.now()}`;
    setSubmitting(true);
    try {
      onCreate({ key, name: trimmedName, participantUsernames: selected.map(u => u.username) });
    } finally {
      setSubmitting(false);
    }
  };

  const canSubmit = name.trim().length > 0;

  const inputBase = `w-full rounded-xl border px-3.5 py-2.5 text-sm outline-none transition-all ${
    darkMode
      ? 'border-white/8 bg-[#111b21] text-[#e9edef] placeholder:text-[#8696a0] focus:border-[#00a884]/50 focus:ring-2 focus:ring-[#00a884]/10'
      : 'border-[var(--border-subtle)] bg-[var(--surface-2)] text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:border-[var(--primary)] focus:ring-2 focus:ring-[color:rgba(59,130,246,0.15)]'
  }`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-950/55 backdrop-blur-sm" onClick={onClose} />

      <div
        className={`relative w-full max-w-md rounded-2xl border shadow-2xl ${
          darkMode ? 'border-white/10 bg-[#202c33]' : 'border-[var(--border-subtle)] bg-[var(--surface-1)]'
        }`}
        style={{ boxShadow: 'var(--shadow-lg)' }}
      >

        {/* Header */}
        <div
          className={`flex items-center justify-between border-b px-5 py-4 ${
            darkMode ? 'border-white/5' : 'border-[var(--border-subtle)]'
          }`}
        >
          <div className="flex items-center gap-3">
            <div className={`flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl ${darkMode ? 'bg-[#00a884]/15' : 'bg-[color:rgba(30,64,175,0.08)]'}`}>
              <svg className={`w-5 h-5 ${darkMode ? 'text-[#00a884]' : 'text-[var(--primary)]'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
            <div>
              <h2 className={`text-sm font-bold ${darkMode ? 'text-[#e9edef]' : 'text-[var(--text-primary)]'}`}>New Group</h2>
              <p className={`text-xs ${darkMode ? 'text-[#8696a0]' : 'text-[var(--text-tertiary)]'}`}>Name your group and add members</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className={`flex h-8 w-8 items-center justify-center rounded-lg transition-colors ${
              darkMode ? 'text-[#8696a0] hover:bg-white/8 hover:text-[#e9edef]' : 'text-[var(--text-tertiary)] hover:bg-[var(--surface-2)] hover:text-[var(--text-primary)]'
            }`}
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="px-5 py-5 space-y-5">

          {/* Group Name */}
          <div>
            <label className={`mb-1.5 block text-xs font-semibold ${darkMode ? 'text-[#8696a0]' : 'text-[var(--text-secondary)]'}`}>
              Group Name <span className="text-rose-500">*</span>
            </label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter' && canSubmit) handleSubmit(); }}
              placeholder="e.g. Design Team, Project Alpha…"
              autoFocus
              maxLength={80}
              className={inputBase}
            />
          </div>

          {/* Members Search */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className={`text-xs font-semibold ${darkMode ? 'text-[#8696a0]' : 'text-[var(--text-secondary)]'}`}>
                Add Members <span className={darkMode ? 'text-[#667781]' : 'text-[var(--text-muted)]'}>(optional)</span>
              </label>
              {selected.length > 0 && (
                <span className={`text-xs tabular-nums ${darkMode ? 'text-[#8696a0]' : 'text-[var(--text-tertiary)]'}`}>
                  {selected.length} selected
                </span>
              )}
            </div>

            {/* Selected chips */}
            {selected.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mb-2">
                {selected.map(user => (
                  <span
                    key={user.userId}
                    className={`inline-flex items-center gap-1.5 rounded-lg py-0.5 pl-1 pr-1.5 text-xs font-medium ${
                      darkMode ? 'bg-[#00a884]/15 text-[#7ae3cb]' : 'text-[var(--primary)]'
                    }`}
                    style={darkMode ? undefined : {
                      background: 'color-mix(in srgb, var(--primary) 14%, var(--surface-1))',
                    }}
                  >
                    <AvatarCircle username={user.username} size="sm" />
                    {user.username}
                    <button
                      type="button"
                      onClick={() => removeUser(user.userId)}
                      className={`ml-0.5 rounded-full p-0.5 transition-colors ${
                        darkMode ? 'text-[#7ae3cb] hover:bg-[#00a884]/20' : 'text-[var(--primary)]'
                      }`}
                    >
                      <svg className="w-2.5 h-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </span>
                ))}
              </div>
            )}

            {/* Search input + dropdown */}
            <div className="relative" ref={containerRef}>
              <div
                className={`flex items-center gap-2.5 rounded-xl border px-3 transition-all ${
                  darkMode
                    ? 'border-white/8 bg-[#111b21] focus-within:border-[#00a884]/50 focus-within:ring-2 focus-within:ring-[#00a884]/10'
                    : 'border-[var(--border-subtle)] bg-[var(--surface-2)] focus-within:border-[var(--primary)] focus-within:ring-2 focus-within:ring-[color:rgba(59,130,246,0.15)]'
                }`}
              >
                {isSearching
                  ? <svg className={`w-4 h-4 flex-shrink-0 animate-spin ${darkMode ? 'text-[#8696a0]' : 'text-[var(--text-tertiary)]'}`} fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                    </svg>
                  : <svg className={`w-4 h-4 flex-shrink-0 ${darkMode ? 'text-[#8696a0]' : 'text-[var(--text-tertiary)]'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M17 11A6 6 0 105 11a6 6 0 0012 0z" />
                    </svg>
                }
                <input
                  ref={searchRef}
                  value={searchQuery}
                  onChange={(e) => handleSearchChange(e.target.value)}
                  onKeyDown={handleSearchKeyDown}
                  onFocus={() => { if (searchResults.length > 0) setDropdownOpen(true); }}
                  placeholder="Search by username…"
                  className={`flex-1 bg-transparent py-2.5 text-sm outline-none ${
                    darkMode ? 'text-[#e9edef] placeholder:text-[#8696a0]' : 'text-[var(--text-primary)] placeholder:text-[var(--text-muted)]'
                  }`}
                />
              </div>

              {/* Dropdown */}
              {dropdownOpen && searchResults.length > 0 && (
                <div
                  ref={dropdownRef}
                  className={`absolute left-0 right-0 top-full z-10 mt-1.5 overflow-hidden rounded-xl border shadow-xl ${
                    darkMode ? 'border-white/10 bg-[#202c33]' : 'border-[var(--border-subtle)] bg-[var(--surface-1)]'
                  }`}
                  style={{ boxShadow: 'var(--shadow-md)' }}
                >
                  {searchResults.map((user, i) => (
                    <button
                      key={user.userId}
                      type="button"
                      onMouseDown={(e) => { e.preventDefault(); addUser(user); }}
                      onMouseEnter={() => setHighlightedIndex(i)}
                      className={`w-full flex items-center gap-3 px-3.5 py-2.5 text-left transition-colors ${
                        i === highlightedIndex
                          ? darkMode ? 'bg-[#2a3942]' : 'bg-[color:rgba(30,64,175,0.08)]'
                          : darkMode ? 'hover:bg-white/5' : 'hover:bg-[var(--surface-2)]'
                      }`}
                    >
                      <AvatarCircle username={user.username} size="md" />
                      <div className="flex-1 min-w-0">
                        <p className={`truncate text-sm font-medium ${darkMode ? 'text-[#e9edef]' : 'text-[var(--text-primary)]'}`}>
                          {user.username}
                        </p>
                      </div>
                      <svg className={`w-4 h-4 flex-shrink-0 ${darkMode ? 'text-[#667781]' : 'text-[var(--text-muted)]'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                      </svg>
                    </button>
                  ))}
                </div>
              )}

              {/* No results */}
              {dropdownOpen && searchResults.length === 0 && !isSearching && searchQuery.trim().length > 0 && (
                <div
                  className={`absolute left-0 right-0 top-full z-10 mt-1.5 rounded-xl border px-4 py-3 shadow-xl ${
                    darkMode ? 'border-white/10 bg-[#202c33] text-[#8696a0]' : 'border-[var(--border-subtle)] bg-[var(--surface-1)] text-[var(--text-tertiary)]'
                  }`}
                  style={{ boxShadow: 'var(--shadow-md)' }}
                >
                  <p className="text-sm">No users found for &ldquo;{searchQuery}&rdquo;</p>
                </div>
              )}
            </div>

            <p className={`mt-1.5 text-[11px] ${darkMode ? 'text-[#667781]' : 'text-[var(--text-tertiary)]'}`}>
              Type to search · use ↑↓ to navigate · Enter to select
            </p>
          </div>

          {/* Submit */}
          <button
            type="button"
            onClick={handleSubmit}
            disabled={!canSubmit || submitting}
            className={`flex w-full items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold text-white transition-all active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40 ${
              darkMode ? 'bg-[#00a884] hover:bg-[#02c197]' : 'bg-[var(--primary)] hover:opacity-95'
            }`}
            style={{ boxShadow: 'var(--shadow-md)' }}
          >
            {submitting
              ? <>
                  <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                  </svg>
                  Creating…
                </>
              : <>
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                  </svg>
                  Create Group
                  {selected.length > 0 && <span className="ml-1 opacity-80">· {selected.length} member{selected.length > 1 ? 's' : ''}</span>}
                </>
            }
          </button>
        </div>
      </div>
    </div>
  );
}

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
      ? 'border-slate-700/60 bg-slate-950 text-slate-100 placeholder:text-slate-600 focus:border-blue-500/60 focus:ring-2 focus:ring-blue-500/10'
      : 'border-slate-200 bg-slate-50 text-slate-900 placeholder:text-slate-400 focus:border-blue-400 focus:ring-2 focus:ring-blue-100'
  }`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      <div className={`relative w-full max-w-md rounded-2xl border shadow-2xl ${
        darkMode ? 'border-slate-700/60 bg-slate-900' : 'border-slate-200/80 bg-white'
      }`}>

        {/* Header */}
        <div className={`flex items-center justify-between px-5 py-4 border-b ${darkMode ? 'border-slate-800' : 'border-slate-100'}`}>
          <div className="flex items-center gap-3">
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${darkMode ? 'bg-blue-500/15' : 'bg-blue-50'}`}>
              <svg className="w-5 h-5 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
            <div>
              <h2 className={`text-sm font-bold ${darkMode ? 'text-slate-100' : 'text-slate-900'}`}>New Group</h2>
              <p className={`text-xs ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>Name your group and add members</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className={`w-8 h-8 flex items-center justify-center rounded-lg transition-colors ${darkMode ? 'hover:bg-slate-800 text-slate-500' : 'hover:bg-slate-100 text-slate-400'}`}
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
            <label className={`block text-xs font-semibold mb-1.5 ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
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
              <label className={`text-xs font-semibold ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                Add Members <span className={darkMode ? 'text-slate-600' : 'text-slate-400'}>(optional)</span>
              </label>
              {selected.length > 0 && (
                <span className={`text-xs tabular-nums ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>
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
                    className={`inline-flex items-center gap-1.5 rounded-lg pl-1 pr-1.5 py-0.5 text-xs font-medium ${
                      darkMode ? 'bg-blue-500/15 text-blue-300' : 'bg-blue-50 text-blue-700'
                    }`}
                  >
                    <AvatarCircle username={user.username} size="sm" />
                    {user.username}
                    <button
                      type="button"
                      onClick={() => removeUser(user.userId)}
                      className={`ml-0.5 rounded-full p-0.5 transition-colors ${darkMode ? 'hover:bg-blue-500/30 text-blue-400' : 'hover:bg-blue-200 text-blue-500'}`}
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
              <div className={`flex items-center gap-2.5 rounded-xl border px-3 transition-all ${
                darkMode
                  ? 'border-slate-700/60 bg-slate-950 focus-within:border-blue-500/60 focus-within:ring-2 focus-within:ring-blue-500/10'
                  : 'border-slate-200 bg-slate-50 focus-within:border-blue-400 focus-within:ring-2 focus-within:ring-blue-100'
              }`}>
                {isSearching
                  ? <svg className={`w-4 h-4 flex-shrink-0 animate-spin ${darkMode ? 'text-slate-500' : 'text-slate-400'}`} fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                    </svg>
                  : <svg className={`w-4 h-4 flex-shrink-0 ${darkMode ? 'text-slate-500' : 'text-slate-400'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
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
                    darkMode ? 'text-slate-100 placeholder:text-slate-600' : 'text-slate-900 placeholder:text-slate-400'
                  }`}
                />
              </div>

              {/* Dropdown */}
              {dropdownOpen && searchResults.length > 0 && (
                <div
                  ref={dropdownRef}
                  className={`absolute top-full left-0 right-0 mt-1.5 rounded-xl border shadow-xl overflow-hidden z-10 ${
                    darkMode ? 'border-slate-700/60 bg-slate-900' : 'border-slate-200 bg-white'
                  }`}
                >
                  {searchResults.map((user, i) => (
                    <button
                      key={user.userId}
                      type="button"
                      onMouseDown={(e) => { e.preventDefault(); addUser(user); }}
                      onMouseEnter={() => setHighlightedIndex(i)}
                      className={`w-full flex items-center gap-3 px-3.5 py-2.5 text-left transition-colors ${
                        i === highlightedIndex
                          ? darkMode ? 'bg-slate-800' : 'bg-blue-50'
                          : darkMode ? 'hover:bg-slate-800/60' : 'hover:bg-slate-50'
                      }`}
                    >
                      <AvatarCircle username={user.username} size="md" />
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm font-medium truncate ${darkMode ? 'text-slate-100' : 'text-slate-900'}`}>
                          {user.username}
                        </p>
                      </div>
                      <svg className={`w-4 h-4 flex-shrink-0 ${darkMode ? 'text-slate-600' : 'text-slate-300'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                      </svg>
                    </button>
                  ))}
                </div>
              )}

              {/* No results */}
              {dropdownOpen && searchResults.length === 0 && !isSearching && searchQuery.trim().length > 0 && (
                <div className={`absolute top-full left-0 right-0 mt-1.5 rounded-xl border shadow-xl px-4 py-3 z-10 ${
                  darkMode ? 'border-slate-700/60 bg-slate-900 text-slate-500' : 'border-slate-200 bg-white text-slate-400'
                }`}>
                  <p className="text-sm">No users found for &ldquo;{searchQuery}&rdquo;</p>
                </div>
              )}
            </div>

            <p className={`text-[11px] mt-1.5 ${darkMode ? 'text-slate-600' : 'text-slate-400'}`}>
              Type to search · use ↑↓ to navigate · Enter to select
            </p>
          </div>

          {/* Submit */}
          <button
            type="button"
            onClick={handleSubmit}
            disabled={!canSubmit || submitting}
            className="w-full rounded-xl bg-blue-600 hover:bg-blue-500 active:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed px-4 py-2.5 text-sm font-semibold text-white shadow-md shadow-blue-500/20 transition-all active:scale-[0.98] flex items-center justify-center gap-2"
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

'use client';

import { FormEvent, useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { API_URL, authFetch, getAuthToken } from '@/lib/config';
import { SelectDropdown } from '@/components/ui/SelectDropdown';

interface Profile { userId: number; username: string; role: 'admin' | 'user'; }
interface UserItem { userId: number; username: string; role: 'admin' | 'user'; }
interface CommunicationRule { id: string; fromUsername: string; toUsername: string; allowed: boolean; }
interface Toast { id: number; message: string; type: 'success' | 'error'; }

let toastId = 0;

const AVATAR_COLORS = [
  'from-blue-500 to-indigo-600',
  'from-violet-500 to-purple-600',
  'from-emerald-500 to-teal-600',
  'from-rose-500 to-pink-600',
  'from-amber-500 to-orange-600',
  'from-cyan-500 to-sky-600',
];

function getAvatarColor(username: string) {
  const hash = username.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0);
  return AVATAR_COLORS[hash % AVATAR_COLORS.length];
}

export default function AdminPage() {
  const [darkMode, setDarkMode] = useState(() => {
    if (typeof window === 'undefined') return true;
    return localStorage.getItem('imcs_theme') !== 'light';
  });
  const [profile, setProfile] = useState<Profile | null>(null);
  const [authStatus, setAuthStatus] = useState<'loading' | 'ok' | 'denied'>('loading');
  const [users, setUsers] = useState<UserItem[]>([]);
  const [rules, setRules] = useState<CommunicationRule[]>([]);
  const [toasts, setToasts] = useState<Toast[]>([]);

  const [newUsername, setNewUsername] = useState('');
  const [newRole, setNewRole] = useState<'admin' | 'user'>('user');
  const [creating, setCreating] = useState(false);

  const [fromUsername, setFromUsername] = useState('');
  const [toUsername, setToUsername] = useState('');
  const [allowComm, setAllowComm] = useState(true);
  const [bidirectional, setBidirectional] = useState(true);
  const [savingRule, setSavingRule] = useState(false);

  const [deletingUser, setDeletingUser] = useState<string | null>(null);
  const [deleteModal, setDeleteModal] = useState<{ username: string; confirmText: string } | null>(null);
  const [updatingRole, setUpdatingRole] = useState<string | null>(null);
  const [deletingRule, setDeletingRule] = useState<string | null>(null);
  const [userSearch, setUserSearch] = useState('');
  const deleteInputRef = useRef<HTMLInputElement>(null);

  const toast = useCallback((message: string, type: 'success' | 'error' = 'success') => {
    const id = ++toastId;
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 4000);
  }, []);

  const apiError = useCallback(async (res: Response, fallback: string): Promise<string> => {
    try {
      const body = await res.json() as { message?: string | string[] };
      const msg = Array.isArray(body.message) ? body.message.join(', ') : body.message;
      return msg || fallback;
    } catch {
      return fallback;
    }
  }, []);

  const loadData = useCallback(async () => {
    const token = getAuthToken();
    if (!token) { setAuthStatus('denied'); return; }
    const profileRes = await authFetch(`${API_URL}/auth/profile`);
    if (!profileRes.ok) { setAuthStatus('denied'); return; }
    const profileData = await profileRes.json() as Profile;
    setProfile(profileData);
    if (profileData.role !== 'admin') { setAuthStatus('denied'); return; }
    setAuthStatus('ok');
    const [usersRes, rulesRes] = await Promise.all([
      authFetch(`${API_URL}/users`),
      authFetch(`${API_URL}/communication-rules`),
    ]);
    if (usersRes.ok) {
      const data = await usersRes.json() as UserItem[];
      setUsers(data);
      if (!fromUsername && data.length > 0) setFromUsername(data[0].username);
      if (!toUsername && data.length > 1) setToUsername(data[1].username);
    }
    if (rulesRes.ok) setRules(await rulesRes.json() as CommunicationRule[]);
  }, []);

  useEffect(() => { loadData().catch(() => setAuthStatus('denied')); }, [loadData]);
  useEffect(() => { if (deleteModal) setTimeout(() => deleteInputRef.current?.focus(), 50); }, [deleteModal]);
  useEffect(() => {
    if (fromUsername && toUsername) setAllowComm(true);
  }, [fromUsername, toUsername]);

  const createUser = async (e: FormEvent) => {
    e.preventDefault();
    const username = newUsername.trim();
    if (!username) { toast('Username is required', 'error'); return; }
    setCreating(true);
    try {
      const res = await authFetch(`${API_URL}/users`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, role: newRole }),
      });
      if (!res.ok) { toast(await apiError(res, 'Could not create user'), 'error'); return; }
      setNewUsername('');
      setNewRole('user');
      toast(`User "${username}" created successfully`);
      await loadData();
    } finally {
      setCreating(false);
    }
  };

  const updateRole = async (username: string, role: 'admin' | 'user') => {
    setUpdatingRole(username);
    try {
      const res = await authFetch(`${API_URL}/users/${username}/role`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role }),
      });
      if (!res.ok) { toast(await apiError(res, `Could not update role for ${username}`), 'error'); return; }
      toast(`Role updated for "${username}"`);
      await loadData();
    } finally {
      setUpdatingRole(null);
    }
  };

  const deleteUser = async (username: string) => {
    setDeletingUser(username);
    try {
      const res = await authFetch(`${API_URL}/users/${username}`, { method: 'DELETE' });
      if (!res.ok) { toast(await apiError(res, `Could not delete ${username}`), 'error'); return; }
      toast(`User "${username}" and all their data deleted`);
      setDeleteModal(null);
      await loadData();
    } finally {
      setDeletingUser(null);
    }
  };

  const saveRule = async (e: FormEvent) => {
    e.preventDefault();
    if (!fromUsername || !toUsername || fromUsername === toUsername) {
      toast('Select two different users', 'error'); return;
    }
    setSavingRule(true);
    try {
      const res = await authFetch(`${API_URL}/communication-rules`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fromUsername, toUsername, allowed: allowComm, bidirectional }),
      });
      if (!res.ok) { toast(await apiError(res, 'Could not save rule'), 'error'); return; }
      toast('Communication rule saved');
      await loadData();
    } finally {
      setSavingRule(false);
    }
  };

  const deleteRule = async (id: string) => {
    setDeletingRule(id);
    try {
      const res = await authFetch(`${API_URL}/communication-rules/${id}`, { method: 'DELETE' });
      if (!res.ok) { toast(await apiError(res, 'Could not delete rule'), 'error'); return; }
      toast('Rule removed');
      await loadData();
    } finally {
      setDeletingRule(null);
    }
  };

  const adminCount = users.filter(u => u.role === 'admin').length;
  const filteredUsers = userSearch.trim()
    ? users.filter(u => u.username.toLowerCase().includes(userSearch.toLowerCase()))
    : users;
  const dm = darkMode;

  const inputBase = `w-full rounded-xl border px-4 py-3 text-sm outline-none transition-all focus:ring-2 focus:ring-blue-500/20 ${
    dm
      ? 'border-slate-700/60 bg-slate-800/50 text-slate-100 placeholder:text-slate-500 focus:border-blue-500 focus:bg-slate-800'
      : 'border-slate-200 bg-white text-slate-900 placeholder:text-slate-400 focus:border-blue-400 focus:shadow-sm'
  }`;
  const selectBase = `w-full rounded-xl border px-4 py-3 text-sm outline-none transition-all cursor-pointer focus:ring-2 focus:ring-blue-500/20 ${
    dm
      ? 'border-slate-700/60 bg-slate-800/50 text-slate-100 focus:border-blue-500'
      : 'border-slate-200 bg-white text-slate-900 focus:border-blue-400'
  }`;
  const cardBase = `rounded-2xl border transition-all ${
    dm
      ? 'border-slate-800/80 bg-slate-900/90 shadow-xl shadow-black/20'
      : 'border-slate-200/80 bg-white shadow-sm shadow-slate-200/80'
  }`;

  return (
    <div className={dm ? 'dark' : ''}>
      <div className={`min-h-screen ${dm ? 'bg-[#080d14]' : 'bg-slate-50'}`}>

        {/* ── Delete Confirmation Modal ─────────────────────────────── */}
        {deleteModal && (
          <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4">
            <div
              className="absolute inset-0 bg-black/50 backdrop-blur-md"
              onClick={() => !deletingUser && setDeleteModal(null)}
            />
            <div className={`relative w-full max-w-sm rounded-3xl border shadow-2xl overflow-hidden ${
              dm ? 'bg-slate-900 border-slate-700/80' : 'bg-white border-slate-200'
            }`}>
              <div className="h-1.5 bg-gradient-to-r from-rose-500 to-pink-600" />
              <div className="p-6">
                <div className="flex items-start gap-4 mb-5">
                  <div className="w-12 h-12 rounded-2xl bg-rose-500/10 flex items-center justify-center shrink-0">
                    <svg className="w-6 h-6 text-rose-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-lg font-bold mb-0.5">Delete <span className="text-rose-500">{deleteModal.username}</span>?</h3>
                    <p className={`text-sm leading-relaxed ${dm ? 'text-slate-400' : 'text-slate-500'}`}>
                      This permanently removes the account and all associated data.
                    </p>
                  </div>
                </div>

                <div className={`rounded-xl p-4 mb-5 ${dm ? 'bg-rose-950/30 border border-rose-900/40' : 'bg-rose-50 border border-rose-100'}`}>
                  <p className={`text-xs font-semibold uppercase tracking-wide mb-2 ${dm ? 'text-rose-400' : 'text-rose-600'}`}>Will be permanently deleted:</p>
                  <ul className={`text-sm space-y-1.5 ${dm ? 'text-rose-300/80' : 'text-rose-700'}`}>
                    {['User account & profile', 'All messages & chat history', 'DM conversations', 'Contacts & communication rules'].map(item => (
                      <li key={item} className="flex items-center gap-2">
                        <span className={`w-1 h-1 rounded-full shrink-0 ${dm ? 'bg-rose-500' : 'bg-rose-400'}`} />
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="mb-5">
                  <label className={`block text-xs font-semibold mb-2 ${dm ? 'text-slate-400' : 'text-slate-600'}`}>
                    Type <code className="font-mono text-rose-500 bg-rose-500/10 px-1.5 py-0.5 rounded">DELETE</code> to confirm
                  </label>
                  <input
                    ref={deleteInputRef}
                    type="text"
                    value={deleteModal.confirmText}
                    onChange={(e) => setDeleteModal({ ...deleteModal, confirmText: e.target.value })}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && deleteModal.confirmText === 'DELETE' && !deletingUser) deleteUser(deleteModal.username);
                      if (e.key === 'Escape' && !deletingUser) setDeleteModal(null);
                    }}
                    placeholder="DELETE"
                    disabled={!!deletingUser}
                    className={`w-full rounded-xl border px-4 py-3 text-sm font-mono outline-none transition-all ${
                      deleteModal.confirmText === 'DELETE'
                        ? 'border-rose-500 bg-rose-500/5 text-rose-500 ring-2 ring-rose-500/10'
                        : dm
                          ? 'border-slate-700 bg-slate-800 text-slate-100 placeholder:text-slate-600 focus:border-slate-500'
                          : 'border-slate-200 bg-slate-50 text-slate-900 placeholder:text-slate-300 focus:border-slate-400'
                    }`}
                  />
                </div>

                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => setDeleteModal(null)}
                    disabled={!!deletingUser}
                    className={`flex-1 rounded-xl px-4 py-2.5 text-sm font-semibold border transition-all disabled:opacity-50 ${
                      dm ? 'border-slate-700 text-slate-300 hover:bg-slate-800' : 'border-slate-200 text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    disabled={deleteModal.confirmText !== 'DELETE' || !!deletingUser}
                    onClick={() => deleteUser(deleteModal.username)}
                    className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-rose-600 hover:bg-rose-500 disabled:opacity-40 disabled:cursor-not-allowed px-4 py-2.5 text-sm font-semibold text-white transition-all shadow-lg shadow-rose-600/25"
                  >
                    {deletingUser
                      ? <><div className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />Deleting…</>
                      : 'Delete forever'
                    }
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── Toast Notifications ───────────────────────────────────── */}
        <div className="fixed top-5 right-5 z-50 flex flex-col gap-2 pointer-events-none">
          {toasts.map((t) => (
            <div key={t.id} className={`flex items-center gap-3 rounded-2xl px-5 py-3.5 text-sm font-medium shadow-2xl text-white pointer-events-auto max-w-xs animate-slide-in-right ${
              t.type === 'success' ? 'bg-emerald-600 shadow-emerald-600/20' : 'bg-rose-600 shadow-rose-600/20'
            }`}>
              <div className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 ${t.type === 'success' ? 'bg-emerald-500' : 'bg-rose-500'}`}>
                {t.type === 'success'
                  ? <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                  : <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                }
              </div>
              {t.message}
            </div>
          ))}
        </div>

        {/* ── Sticky Header ─────────────────────────────────────────── */}
        <header className={`sticky top-0 z-40 border-b backdrop-blur-xl transition-all ${
          dm ? 'bg-slate-900/80 border-slate-800/70' : 'bg-white/80 border-slate-200/60'
        }`}>
          <div className="mx-auto max-w-6xl px-4 md:px-6">
            <div className="flex items-center justify-between h-16">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-600 to-cyan-500 flex items-center justify-center text-white text-xs font-black shadow-lg shadow-blue-500/30 select-none">
                  IM
                </div>
                <div className="hidden sm:block">
                  <h1 className={`text-base font-bold leading-tight ${dm ? 'text-white' : 'text-slate-900'}`}>Admin Panel</h1>
                  <p className={`text-xs leading-none ${dm ? 'text-slate-500' : 'text-slate-400'}`}>IMCS Management</p>
                </div>
                <h1 className={`sm:hidden text-base font-bold ${dm ? 'text-white' : 'text-slate-900'}`}>Admin</h1>
              </div>

              <div className="flex items-center gap-2">
                {profile && (
                  <div className={`hidden md:flex items-center gap-2 rounded-xl px-3 py-1.5 ${
                    dm ? 'bg-slate-800 text-slate-300' : 'bg-slate-100 text-slate-700'
                  }`}>
                    <div className={`w-5 h-5 rounded-full bg-gradient-to-br ${getAvatarColor(profile.username)} flex items-center justify-center text-[10px] font-bold text-white`}>
                      {profile.username.charAt(0).toUpperCase()}
                    </div>
                    <span className="text-xs font-medium">{profile.username}</span>
                  </div>
                )}

                <button
                  type="button"
                  onClick={() => {
                    const next = !darkMode;
                    setDarkMode(next);
                    localStorage.setItem('imcs_theme', next ? 'dark' : 'light');
                  }}
                  className={`w-9 h-9 flex items-center justify-center rounded-xl border transition-all ${
                    dm
                      ? 'border-slate-700 text-slate-400 hover:bg-slate-800 hover:text-slate-200'
                      : 'border-slate-200 text-slate-500 hover:bg-slate-100 hover:text-slate-800'
                  }`}
                  title={dm ? 'Switch to light mode' : 'Switch to dark mode'}
                >
                  {dm
                    ? <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
                    : <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" /></svg>
                  }
                </button>

                <Link
                  href="/chat"
                  className={`flex items-center gap-2 rounded-xl border px-3 py-2 text-xs font-semibold transition-all ${
                    dm
                      ? 'border-slate-700 text-slate-300 hover:bg-slate-800 hover:text-white'
                      : 'border-slate-200 text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                  }`}
                >
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
                  <span className="hidden sm:inline">Back to Chat</span>
                  <span className="sm:hidden">Chat</span>
                </Link>
              </div>
            </div>
          </div>
        </header>

        {/* ── Main Content ──────────────────────────────────────────── */}
        <main className="mx-auto max-w-6xl px-4 md:px-6 py-8">

          {/* Loading state */}
          {authStatus === 'loading' && (
            <div className={`${cardBase} p-20 flex flex-col items-center gap-4`}>
              <div className="w-12 h-12 rounded-full border-4 border-blue-500/20 border-t-blue-500 animate-spin" />
              <p className={`text-sm font-medium ${dm ? 'text-slate-400' : 'text-slate-500'}`}>Verifying admin session…</p>
            </div>
          )}

          {/* Access denied */}
          {authStatus === 'denied' && (
            <div className={`${cardBase} p-20 flex flex-col items-center gap-4 text-center`}>
              <div className={`w-20 h-20 rounded-3xl flex items-center justify-center ${dm ? 'bg-slate-800' : 'bg-slate-100'}`}>
                <svg className={`w-10 h-10 ${dm ? 'text-slate-500' : 'text-slate-400'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              </div>
              <div>
                <p className="text-xl font-bold mb-1">Admin access required</p>
                <p className={`text-sm ${dm ? 'text-slate-400' : 'text-slate-500'}`}>You need admin privileges to view this panel</p>
              </div>
              <Link href="/login" className="inline-flex items-center gap-2 px-6 py-2.5 rounded-2xl bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 text-white text-sm font-bold transition-all shadow-lg shadow-blue-500/25 mt-2">
                Go to Login
              </Link>
            </div>
          )}

          {/* ── Admin Content ── */}
          {authStatus === 'ok' && (
            <div className="space-y-6">

              {/* Stat cards */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {[
                  {
                    label: 'Total Users',
                    value: users.length,
                    gradient: 'from-blue-500 to-indigo-600',
                    shadow: 'shadow-blue-500/20',
                    icon: (
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                      </svg>
                    ),
                  },
                  {
                    label: 'Admins',
                    value: adminCount,
                    gradient: 'from-amber-500 to-orange-600',
                    shadow: 'shadow-amber-500/20',
                    icon: (
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                      </svg>
                    ),
                  },
                  {
                    label: 'Active Rules',
                    value: rules.length,
                    gradient: 'from-emerald-500 to-teal-600',
                    shadow: 'shadow-emerald-500/20',
                    icon: (
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    ),
                  },
                  {
                    label: 'System',
                    value: 'Online',
                    gradient: 'from-violet-500 to-purple-600',
                    shadow: 'shadow-violet-500/20',
                    icon: (
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5.636 18.364a9 9 0 010-12.728m12.728 0a9 9 0 010 12.728m-9.9-2.829a5 5 0 010-7.07m7.072 0a5 5 0 010 7.07M13 12a1 1 0 11-2 0 1 1 0 012 0z" />
                      </svg>
                    ),
                  },
                ].map((stat) => (
                  <div key={stat.label} className={`${cardBase} p-4 flex items-center gap-4`}>
                    <div className={`w-11 h-11 rounded-2xl bg-gradient-to-br ${stat.gradient} flex items-center justify-center text-white shrink-0 shadow-lg ${stat.shadow}`}>
                      {stat.icon}
                    </div>
                    <div className="min-w-0">
                      <p className={`text-2xl font-bold leading-none mb-0.5 ${dm ? 'text-white' : 'text-slate-900'}`}>{stat.value}</p>
                      <p className={`text-xs truncate ${dm ? 'text-slate-500' : 'text-slate-400'}`}>{stat.label}</p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Forms row */}
              <div className="grid lg:grid-cols-2 gap-6">

                {/* Create User */}
                <div className={`${cardBase} p-6`}>
                  <div className="flex items-center gap-3 mb-6">
                    <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-blue-600 to-cyan-500 flex items-center justify-center shrink-0 shadow-lg shadow-blue-500/25">
                      <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                      </svg>
                    </div>
                    <div>
                      <h2 className={`font-bold text-base ${dm ? 'text-white' : 'text-slate-900'}`}>Create User</h2>
                      <p className={`text-xs ${dm ? 'text-slate-500' : 'text-slate-400'}`}>No password — one-click login</p>
                    </div>
                  </div>

                  <form className="space-y-4" onSubmit={createUser}>
                    <div>
                      <label className={`block text-xs font-semibold mb-2 ${dm ? 'text-slate-400' : 'text-slate-600'}`}>Username</label>
                      <input
                        className={inputBase}
                        placeholder="e.g. john_doe, alice"
                        value={newUsername}
                        onChange={(e) => setNewUsername(e.target.value)}
                        disabled={creating}
                        autoComplete="off"
                      />
                      <p className={`text-[11px] mt-1.5 ${dm ? 'text-slate-600' : 'text-slate-400'}`}>Letters, numbers and underscores · 2–32 chars</p>
                    </div>

                    <div>
                      <label className={`block text-xs font-semibold mb-2 ${dm ? 'text-slate-400' : 'text-slate-600'}`}>Role</label>
                      <SelectDropdown
                        value={newRole}
                        onChange={(val) => setNewRole(val as 'admin' | 'user')}
                        options={[
                          { value: 'user', label: 'User' },
                          { value: 'admin', label: 'Admin' },
                        ]}
                        disabled={creating}
                        darkMode={dm}
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={creating || !newUsername.trim()}
                      className="w-full flex items-center justify-center gap-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 disabled:opacity-50 disabled:cursor-not-allowed px-4 py-3 text-sm font-bold text-white shadow-lg shadow-blue-500/25 transition-all active:scale-[0.98]"
                    >
                      {creating
                        ? <><div className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />Creating…</>
                        : <><svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" /></svg>Create User</>
                      }
                    </button>
                  </form>
                </div>

                {/* Communication Rules Form */}
                <div className={`${cardBase} p-6`}>
                  <div className="flex items-center gap-3 mb-6">
                    <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shrink-0 shadow-lg shadow-emerald-500/25">
                      <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                      </svg>
                    </div>
                    <div>
                      <h2 className={`font-bold text-base ${dm ? 'text-white' : 'text-slate-900'}`}>Communication Rules</h2>
                      <p className={`text-xs ${dm ? 'text-slate-500' : 'text-slate-400'}`}>Control who can message whom</p>
                    </div>
                  </div>

                  {users.length < 2 ? (
                    <div className={`flex flex-col items-center gap-3 rounded-2xl border-2 border-dashed p-10 text-center ${dm ? 'border-slate-700/60 text-slate-500' : 'border-slate-200 text-slate-400'}`}>
                      <svg className="w-9 h-9 opacity-40" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                      </svg>
                      <p className="text-sm">Create at least 2 users to set communication rules</p>
                    </div>
                  ) : (
                    <form className="space-y-4" onSubmit={saveRule}>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className={`block text-xs font-semibold mb-2 ${dm ? 'text-slate-400' : 'text-slate-600'}`}>From</label>
                          <SelectDropdown
                            value={fromUsername}
                            onChange={setFromUsername}
                            options={users.map((u) => ({ value: u.username, label: u.username }))}
                            disabled={savingRule}
                            darkMode={dm}
                          />
                        </div>
                        <div>
                          <label className={`block text-xs font-semibold mb-2 ${dm ? 'text-slate-400' : 'text-slate-600'}`}>To</label>
                          <SelectDropdown
                            value={toUsername}
                            onChange={setToUsername}
                            options={users.map((u) => ({ value: u.username, label: u.username }))}
                            disabled={savingRule}
                            darkMode={dm}
                          />
                        </div>
                      </div>

                      <div className={`rounded-xl border p-4 space-y-4 ${dm ? 'border-slate-700/60 bg-slate-800/30' : 'border-slate-200 bg-slate-50'}`}>
                        {[
                          { label: 'Allow communication', checked: allowComm, onChange: (v: boolean) => setAllowComm(v), desc: 'Users can send messages to each other' },
                          { label: 'Bidirectional rule', checked: bidirectional, onChange: (v: boolean) => setBidirectional(v), desc: 'Apply rule in both directions' },
                        ].map(({ label, checked, onChange, desc }) => (
                          <div key={label} className="flex items-center justify-between gap-4">
                            <div>
                              <p className={`text-sm font-medium ${dm ? 'text-slate-200' : 'text-slate-800'}`}>{label}</p>
                              <p className={`text-xs ${dm ? 'text-slate-500' : 'text-slate-400'}`}>{desc}</p>
                            </div>
                            <button
                              type="button"
                              onClick={() => onChange(!checked)}
                              className={`relative w-11 h-6 rounded-full transition-colors shrink-0 focus:outline-none focus:ring-2 focus:ring-blue-500/30 ${checked ? 'bg-blue-600' : dm ? 'bg-slate-600' : 'bg-slate-300'}`}
                            >
                              <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow-sm transition-transform ${checked ? 'translate-x-5' : 'translate-x-0'}`} />
                            </button>
                          </div>
                        ))}
                      </div>

                      <button
                        type="submit"
                        disabled={savingRule}
                        className="w-full flex items-center justify-center gap-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 disabled:opacity-50 px-4 py-3 text-sm font-bold text-white shadow-lg shadow-emerald-500/25 transition-all active:scale-[0.98]"
                      >
                        {savingRule
                          ? <><div className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />Saving…</>
                          : 'Save Rule'
                        }
                      </button>
                    </form>
                  )}
                </div>
              </div>

              {/* Users Table */}
              <div className={`${cardBase} overflow-hidden`}>
                <div className={`flex items-center justify-between px-6 py-5 border-b ${dm ? 'border-slate-800/80' : 'border-slate-100'}`}>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center shrink-0 shadow-lg shadow-violet-500/25">
                      <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                      </svg>
                    </div>
                    <div>
                      <h2 className={`font-bold text-base ${dm ? 'text-white' : 'text-slate-900'}`}>All Users</h2>
                      <p className={`text-xs ${dm ? 'text-slate-500' : 'text-slate-400'}`}>{filteredUsers.length} member{filteredUsers.length !== 1 ? 's' : ''}{userSearch.trim() && ` (filtered from ${users.length})`}</p>
                    </div>
                  </div>
                </div>

                <div className="px-6 py-3">
                  <div className="relative">
                    <svg className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 ${dm ? 'text-slate-500' : 'text-slate-400'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                    <input
                      type="text"
                      placeholder="Search users..."
                      value={userSearch}
                      onChange={(e) => setUserSearch(e.target.value)}
                      className={`w-full pl-10 pr-4 py-2 rounded-xl border text-sm outline-none transition-all ${
                        dm
                          ? 'border-slate-700/60 bg-slate-800/30 text-slate-200 placeholder:text-slate-500 focus:border-violet-500'
                          : 'border-slate-200 bg-slate-50 text-slate-900 placeholder:text-slate-400 focus:border-violet-400'
                      }`}
                    />
                  </div>
                </div>

                {filteredUsers.length === 0 ? (
                  <div className={`flex flex-col items-center gap-3 p-12 text-center ${dm ? 'text-slate-500' : 'text-slate-400'}`}>
                    <svg className="w-10 h-10 opacity-40" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                    <p className="text-sm">{userSearch.trim() ? 'No users match your search' : 'No users yet — create one above'}</p>
                  </div>
                ) : (
                  <>
                    {/* Desktop Table */}
                    <div className="hidden md:block overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className={`text-xs font-semibold uppercase tracking-wider border-b ${dm ? 'border-slate-800/80 text-slate-500' : 'border-slate-100 text-slate-400'}`}>
                            <th className="px-6 py-3.5 text-left">User</th>
                            <th className="px-6 py-3.5 text-left">Role</th>
                            <th className="px-6 py-3.5 text-right">Actions</th>
                          </tr>
                        </thead>
                        <tbody className={`divide-y ${dm ? 'divide-slate-800/60' : 'divide-slate-100'}`}>
                          {filteredUsers.map((user) => {
                            const isMe = user.username === profile?.username;
                            const isUpdating = updatingRole === user.username;
                            return (
                              <tr key={user.userId} className={`transition-colors ${dm ? 'hover:bg-slate-800/30' : 'hover:bg-slate-50/80'}`}>
                                <td className="px-6 py-4">
                                  <div className="flex items-center gap-3">
                                    <div className={`w-9 h-9 rounded-full bg-gradient-to-br ${getAvatarColor(user.username)} flex items-center justify-center text-xs font-bold text-white shadow-sm shrink-0`}>
                                      {user.username.charAt(0).toUpperCase()}
                                    </div>
                                    <div>
                                      <div className="flex items-center gap-2">
                                        <span className={`font-semibold ${dm ? 'text-slate-100' : 'text-slate-900'}`}>{user.username}</span>
                                        {isMe && (
                                          <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${dm ? 'bg-blue-900/50 text-blue-400' : 'bg-blue-100 text-blue-600'}`}>You</span>
                                        )}
                                      </div>
                                      <p className={`text-xs ${dm ? 'text-slate-500' : 'text-slate-400'}`} title={`User ID: ${user.userId}`}>ID #{user.userId}</p>
                                    </div>
                                  </div>
                                </td>
                                <td className="px-6 py-4">
                                  <div className="flex items-center gap-2">
                                    <SelectDropdown
                                      value={user.role}
                                      onChange={(val) => updateRole(user.username, val as 'admin' | 'user')}
                                      options={[
                                        { value: 'user', label: 'User' },
                                        { value: 'admin', label: 'Admin' },
                                      ]}
                                      disabled={isMe || isUpdating}
                                      darkMode={dm}
                                      className="w-28"
                                    />
                                    {isUpdating && <div className="w-3.5 h-3.5 rounded-full border-2 border-blue-500 border-t-transparent animate-spin" />}
                                  </div>
                                </td>
                                <td className="px-6 py-4 text-right">
                                  {!isMe && (
                                    <button
                                      type="button"
                                      title="Delete user"
                                      onClick={() => setDeleteModal({ username: user.username, confirmText: '' })}
                                      className={`inline-flex items-center justify-center w-8 h-8 rounded-lg border transition-all ${
                                        dm
                                          ? 'border-slate-700/60 text-slate-500 hover:border-rose-700/60 hover:text-rose-400 hover:bg-rose-900/10'
                                          : 'border-slate-200 text-slate-400 hover:border-rose-200 hover:text-rose-600 hover:bg-rose-50'
                                      }`}
                                    >
                                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                      </svg>
                                    </button>
                                  )}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>

                    {/* Mobile Cards */}
                    <div className="md:hidden divide-y divide-slate-800/60 dark:divide-slate-800/60">
                      {filteredUsers.map((user) => {
                        const isMe = user.username === profile?.username;
                        const isUpdating = updatingRole === user.username;
                        return (
                          <div key={user.userId} className="p-4">
                            <div className="flex items-center justify-between mb-3">
                              <div className="flex items-center gap-3">
                                <div className={`w-10 h-10 rounded-full bg-gradient-to-br ${getAvatarColor(user.username)} flex items-center justify-center text-sm font-bold text-white shadow-sm shrink-0`}>
                                  {user.username.charAt(0).toUpperCase()}
                                </div>
                                <div>
                                  <div className="flex items-center gap-2">
                                    <span className={`font-semibold ${dm ? 'text-slate-100' : 'text-slate-900'}`}>{user.username}</span>
                                    {isMe && (
                                      <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${dm ? 'bg-blue-900/50 text-blue-400' : 'bg-blue-100 text-blue-600'}`}>You</span>
                                    )}
                                    <span className={`text-xs px-1.5 py-0.5 rounded-full ${
                                      user.role === 'admin'
                                        ? dm ? 'bg-amber-900/30 text-amber-400' : 'bg-amber-100 text-amber-700'
                                        : dm ? 'bg-slate-700 text-slate-400' : 'bg-slate-100 text-slate-600'
                                    }`}>
                                      {user.role === 'admin' ? 'Admin' : 'User'}
                                    </span>
                                  </div>
                                  <p className={`text-xs ${dm ? 'text-slate-500' : 'text-slate-400'}`}>ID #{user.userId}</p>
                                </div>
                              </div>
                              {!isMe && (
                                <button
                                  type="button"
                                  title="Delete user"
                                  onClick={() => setDeleteModal({ username: user.username, confirmText: '' })}
                                  className={`inline-flex items-center justify-center w-9 h-9 rounded-lg border transition-all ${
                                    dm
                                      ? 'border-slate-700/60 text-slate-500 hover:border-rose-700/60 hover:text-rose-400 hover:bg-rose-900/10'
                                      : 'border-slate-200 text-slate-400 hover:border-rose-200 hover:text-rose-600 hover:bg-rose-50'
                                  }`}
                                >
                                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                  </svg>
                                </button>
                              )}
                            </div>
                            <div className="flex items-center gap-3">
                              <span className={`text-xs ${dm ? 'text-slate-500' : 'text-slate-400'}`}>Role:</span>
                              <SelectDropdown
                                value={user.role}
                                onChange={(val) => updateRole(user.username, val as 'admin' | 'user')}
                                options={[
                                  { value: 'user', label: 'User' },
                                  { value: 'admin', label: 'Admin' },
                                ]}
                                disabled={isMe || isUpdating}
                                darkMode={dm}
                                className="flex-1 max-w-[140px]"
                              />
                              {isUpdating && <div className="w-4 h-4 rounded-full border-2 border-blue-500 border-t-transparent animate-spin" />}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </>
                )}
              </div>

              {/* Communication Rules Table */}
              <div className={`${cardBase} overflow-hidden`}>
                <div className={`flex items-center justify-between px-6 py-5 border-b ${dm ? 'border-slate-800/80' : 'border-slate-100'}`}>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center shrink-0 shadow-lg shadow-amber-500/25">
                      <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <div>
                      <h2 className={`font-bold text-base ${dm ? 'text-white' : 'text-slate-900'}`}>Active Rules</h2>
                      <p className={`text-xs ${dm ? 'text-slate-500' : 'text-slate-400'}`}>
                        {rules.length === 0 ? 'All communication allowed by default' : `${rules.length} custom rule${rules.length !== 1 ? 's' : ''}`}
                      </p>
                    </div>
                  </div>
                </div>

                {rules.length === 0 ? (
                  <div className={`flex flex-col items-center gap-3 p-16 text-center ${dm ? 'text-slate-500' : 'text-slate-400'}`}>
                    <svg className="w-10 h-10 opacity-40" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <p className="text-sm">No rules — all users can communicate freely</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className={`text-xs font-semibold uppercase tracking-wider border-b ${dm ? 'border-slate-800/80 text-slate-500' : 'border-slate-100 text-slate-400'}`}>
                          <th className="px-6 py-3.5 text-left">From</th>
                          <th className="px-6 py-3.5 text-left">To</th>
                          <th className="px-6 py-3.5 text-left">Status</th>
                          <th className="px-6 py-3.5 text-right">Action</th>
                        </tr>
                      </thead>
                      <tbody className={`divide-y ${dm ? 'divide-slate-800/60' : 'divide-slate-100'}`}>
                        {rules.map((rule) => (
                          <tr key={rule.id} className={`transition-colors ${dm ? 'hover:bg-slate-800/30' : 'hover:bg-slate-50/80'}`}>
                            <td className="px-6 py-4">
                              <div className="flex items-center gap-2">
                                <div className={`w-7 h-7 rounded-full bg-gradient-to-br ${getAvatarColor(rule.fromUsername)} flex items-center justify-center text-[10px] font-bold text-white shrink-0`}>
                                  {rule.fromUsername.charAt(0).toUpperCase()}
                                </div>
                                <span className={`font-medium ${dm ? 'text-slate-200' : 'text-slate-800'}`}>{rule.fromUsername}</span>
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              <div className="flex items-center gap-2">
                                <div className={`w-7 h-7 rounded-full bg-gradient-to-br ${getAvatarColor(rule.toUsername)} flex items-center justify-center text-[10px] font-bold text-white shrink-0`}>
                                  {rule.toUsername.charAt(0).toUpperCase()}
                                </div>
                                <span className={`font-medium ${dm ? 'text-slate-200' : 'text-slate-800'}`}>{rule.toUsername}</span>
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-bold ${
                                rule.allowed
                                  ? dm ? 'bg-emerald-900/40 text-emerald-400 ring-1 ring-emerald-700/40' : 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200'
                                  : dm ? 'bg-rose-900/40 text-rose-400 ring-1 ring-rose-700/40' : 'bg-rose-50 text-rose-600 ring-1 ring-rose-200'
                              }`}>
                                <span className={`w-1.5 h-1.5 rounded-full ${rule.allowed ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                                {rule.allowed ? 'Allowed' : 'Blocked'}
                              </span>
                            </td>
                            <td className="px-6 py-4 text-right">
                              <button
                                type="button"
                                title="Remove rule"
                                disabled={deletingRule === rule.id}
                                onClick={() => deleteRule(rule.id)}
                                className={`inline-flex items-center justify-center w-8 h-8 rounded-lg border transition-all disabled:opacity-50 ${
                                  dm
                                    ? 'border-slate-700/60 text-slate-500 hover:border-rose-700/60 hover:text-rose-400 hover:bg-rose-900/10'
                                    : 'border-slate-200 text-slate-400 hover:border-rose-200 hover:text-rose-600 hover:bg-rose-50'
                                }`}
                              >
                                {deletingRule === rule.id
                                  ? <div className="w-4 h-4 rounded-full border-2 border-current border-t-transparent animate-spin" />
                                  : <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                      <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                    </svg>
                                }
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

            </div>
          )}
        </main>
      </div>
    </div>
  );
}

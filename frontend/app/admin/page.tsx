'use client';

import { FormEvent, useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { API_URL, authFetch, getAuthToken } from '@/lib/config';

interface Profile { userId: number; username: string; role: 'admin' | 'user'; }
interface UserItem { userId: number; username: string; role: 'admin' | 'user'; }
interface CommunicationRule { id: string; fromUsername: string; toUsername: string; allowed: boolean; }
interface Toast { id: number; message: string; type: 'success' | 'error'; }

let toastId = 0;

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

  // Create user form
  const [newUsername, setNewUsername] = useState('');
  const [newRole, setNewRole] = useState<'admin' | 'user'>('user');
  const [creating, setCreating] = useState(false);

  // Communication rule form
  const [fromUsername, setFromUsername] = useState('');
  const [toUsername, setToUsername] = useState('');
  const [allowComm, setAllowComm] = useState(true);
  const [bidirectional, setBidirectional] = useState(true);
  const [savingRule, setSavingRule] = useState(false);

  // Per-user action states
  const [deletingUser, setDeletingUser] = useState<string | null>(null);
  const [deleteModal, setDeleteModal] = useState<{ username: string; confirmText: string } | null>(null);
  const [updatingRole, setUpdatingRole] = useState<string | null>(null);
  const [deletingRule, setDeletingRule] = useState<string | null>(null);
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

  const dm = darkMode;
  const card = `rounded-2xl border p-6 ${dm ? 'border-slate-800 bg-slate-900' : 'border-slate-200 bg-white'}`;
  const input = `w-full rounded-xl border px-3 py-2.5 text-sm outline-none transition-colors ${dm ? 'border-slate-700 bg-slate-950 text-slate-100 placeholder:text-slate-500 focus:border-blue-500' : 'border-slate-200 bg-slate-50 text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:bg-white'}`;
  const select = `w-full rounded-xl border px-3 py-2.5 text-sm outline-none ${dm ? 'border-slate-700 bg-slate-950 text-slate-100' : 'border-slate-200 bg-slate-50 text-slate-900'}`;

  return (
    <div className={dm ? 'dark' : ''}>
      <div className={`min-h-screen ${dm ? 'bg-slate-950 text-slate-100' : 'bg-slate-100 text-slate-900'}`}>

        {/* Delete confirmation modal */}
        {deleteModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => !deletingUser && setDeleteModal(null)} />
            <div className={`relative w-full max-w-md rounded-2xl border shadow-2xl p-6 ${dm ? 'bg-slate-900 border-slate-700' : 'bg-white border-slate-200'}`}>
              {/* Icon */}
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-rose-500/10 flex items-center justify-center shrink-0">
                  <svg className="w-5 h-5 text-rose-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-base font-semibold">Delete user</h3>
                  <p className={`text-sm ${dm ? 'text-slate-400' : 'text-slate-500'}`}>This action cannot be undone</p>
                </div>
              </div>

              {/* Warning */}
              <div className={`rounded-xl p-3.5 mb-4 text-sm ${dm ? 'bg-rose-900/20 border border-rose-800/40 text-rose-300' : 'bg-rose-50 border border-rose-100 text-rose-700'}`}>
                <p className="font-medium mb-1">The following will be permanently deleted:</p>
                <ul className={`text-xs space-y-0.5 mt-1.5 ${dm ? 'text-rose-400' : 'text-rose-600'}`}>
                  <li>• User account <strong>{deleteModal.username}</strong></li>
                  <li>• All their messages and chat history</li>
                  <li>• All DM conversations</li>
                  <li>• Contacts and communication rules</li>
                </ul>
              </div>

              {/* Type to confirm */}
              <div className="mb-5">
                <label className={`block text-xs font-semibold mb-2 ${dm ? 'text-slate-400' : 'text-slate-600'}`}>
                  Type <span className="font-mono font-bold text-rose-500">DELETE</span> to confirm
                </label>
                <input
                  ref={deleteInputRef}
                  type="text"
                  value={deleteModal.confirmText}
                  onChange={(e) => setDeleteModal({ ...deleteModal, confirmText: e.target.value })}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && deleteModal.confirmText === 'DELETE' && !deletingUser) {
                      deleteUser(deleteModal.username);
                    }
                    if (e.key === 'Escape' && !deletingUser) setDeleteModal(null);
                  }}
                  placeholder="DELETE"
                  disabled={!!deletingUser}
                  className={`w-full rounded-xl border px-3 py-2.5 text-sm font-mono outline-none transition-colors ${
                    deleteModal.confirmText === 'DELETE'
                      ? 'border-rose-500 bg-rose-500/5 text-rose-600 dark:text-rose-400'
                      : dm
                        ? 'border-slate-700 bg-slate-950 text-slate-100 placeholder:text-slate-600 focus:border-slate-500'
                        : 'border-slate-200 bg-slate-50 text-slate-900 placeholder:text-slate-300 focus:border-slate-400'
                  }`}
                />
              </div>

              {/* Actions */}
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setDeleteModal(null)}
                  disabled={!!deletingUser}
                  className={`flex-1 rounded-xl border px-4 py-2.5 text-sm font-medium transition-colors disabled:opacity-50 ${dm ? 'border-slate-700 text-slate-300 hover:bg-slate-800' : 'border-slate-200 text-slate-700 hover:bg-slate-50'}`}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={deleteModal.confirmText !== 'DELETE' || !!deletingUser}
                  onClick={() => deleteUser(deleteModal.username)}
                  className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-rose-600 hover:bg-rose-500 disabled:opacity-40 disabled:cursor-not-allowed px-4 py-2.5 text-sm font-semibold text-white transition-all"
                >
                  {deletingUser
                    ? <><div className="w-4 h-4 rounded-full border-2 border-white/40 border-t-white animate-spin" />Deleting...</>
                    : <><svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>Delete User</>
                  }
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Toast container */}
        <div className="fixed top-4 right-4 z-50 flex flex-col gap-2 pointer-events-none">
          {toasts.map((t) => (
            <div key={t.id} className={`flex items-center gap-2.5 rounded-xl px-4 py-3 text-sm font-medium shadow-xl text-white transition-all duration-300 pointer-events-auto max-w-sm ${t.type === 'success' ? 'bg-emerald-600' : 'bg-rose-600'}`}>
              {t.type === 'success'
                ? <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                : <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
              }
              {t.message}
            </div>
          ))}
        </div>

        <div className="mx-auto w-full max-w-6xl px-4 py-8 md:px-6">

          {/* Header */}
          <header className="mb-8">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <div className="flex items-center gap-3 mb-1.5">
                  <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-blue-600 to-cyan-500 text-white text-sm font-bold shadow-lg shadow-blue-500/25">
                    IM
                  </div>
                  <h1 className="text-2xl font-bold tracking-tight">Admin Panel</h1>
                </div>
                <p className={`text-sm ${dm ? 'text-slate-400' : 'text-slate-500'}`}>
                  {profile ? `Signed in as ${profile.username}` : 'Checking session...'}
                </p>
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => {
                    const next = !darkMode;
                    setDarkMode(next);
                    localStorage.setItem('imcs_theme', next ? 'dark' : 'light');
                  }}
                  className={`flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium border transition-all ${dm ? 'border-slate-700 bg-slate-900 text-slate-300 hover:bg-slate-800' : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'}`}
                >
                  {dm
                    ? <><svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" /></svg>Light</>
                    : <><svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" /></svg>Dark</>
                  }
                </button>
                <Link
                  href="/chat"
                  className={`flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium border transition-all ${dm ? 'border-slate-700 text-slate-300 hover:bg-slate-900' : 'border-slate-200 text-slate-700 hover:bg-slate-50'}`}
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>
                  Back to Chat
                </Link>
              </div>
            </div>
          </header>

          {/* Auth loading */}
          {authStatus === 'loading' && (
            <div className={`${card} flex items-center gap-3`}>
              <div className="w-4 h-4 rounded-full border-2 border-blue-500 border-t-transparent animate-spin" />
              <span className={`text-sm ${dm ? 'text-slate-400' : 'text-slate-500'}`}>Verifying admin session...</span>
            </div>
          )}

          {/* Access denied */}
          {authStatus === 'denied' && (
            <div className={`${card} text-center py-12`}>
              <div className={`w-16 h-16 rounded-2xl mx-auto mb-4 flex items-center justify-center ${dm ? 'bg-slate-800' : 'bg-slate-100'}`}>
                <svg className={`w-8 h-8 ${dm ? 'text-slate-500' : 'text-slate-400'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              </div>
              <p className="text-lg font-semibold mb-1">Admin access required</p>
              <p className={`text-sm mb-4 ${dm ? 'text-slate-400' : 'text-slate-500'}`}>Sign in as an admin to access this panel</p>
              <Link href="/login" className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium transition-colors">
                Go to Login
              </Link>
            </div>
          )}

          {/* Admin panel */}
          {authStatus === 'ok' && (
            <div className="grid gap-6 lg:grid-cols-2">

              {/* Create User */}
              <section className={card}>
                <div className="flex items-center gap-3 mb-5">
                  <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-600 to-cyan-500 flex items-center justify-center shrink-0 shadow-lg shadow-blue-500/20">
                    <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                    </svg>
                  </div>
                  <div>
                    <h2 className="text-base font-semibold">Create User</h2>
                    <p className={`text-xs ${dm ? 'text-slate-500' : 'text-slate-400'}`}>User can log in with one click — no password needed</p>
                  </div>
                </div>

                <form className="space-y-3" onSubmit={createUser}>
                  <div>
                    <label className={`block text-xs font-medium mb-1.5 ${dm ? 'text-slate-400' : 'text-slate-600'}`}>Username</label>
                    <input
                      className={input}
                      placeholder="e.g. JOHN, alice_23"
                      value={newUsername}
                      onChange={(e) => setNewUsername(e.target.value)}
                      disabled={creating}
                      autoComplete="off"
                    />
                    <p className={`text-[11px] mt-1 ${dm ? 'text-slate-600' : 'text-slate-400'}`}>Letters, numbers and underscores only, 2–32 characters</p>
                  </div>

                  <div>
                    <label className={`block text-xs font-medium mb-1.5 ${dm ? 'text-slate-400' : 'text-slate-600'}`}>Role</label>
                    <select className={select} value={newRole} onChange={(e) => setNewRole(e.target.value as 'admin' | 'user')} disabled={creating}>
                      <option value="user">User</option>
                      <option value="admin">Admin</option>
                    </select>
                  </div>

                  <button
                    type="submit"
                    disabled={creating || !newUsername.trim()}
                    className="w-full flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 disabled:opacity-50 disabled:cursor-not-allowed px-3 py-2.5 text-sm font-semibold text-white shadow-lg shadow-blue-500/20 transition-all active:scale-[0.98]"
                  >
                    {creating
                      ? <><div className="w-4 h-4 rounded-full border-2 border-white/40 border-t-white animate-spin" />Creating...</>
                      : <><svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" /></svg>Create User</>
                    }
                  </button>
                </form>
              </section>

              {/* Communication Rules */}
              <section className={card}>
                <div className="flex items-center gap-3 mb-5">
                  <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center shrink-0 shadow-lg shadow-emerald-500/20">
                    <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                    </svg>
                  </div>
                  <div>
                    <h2 className="text-base font-semibold">Communication Rules</h2>
                    <p className={`text-xs ${dm ? 'text-slate-500' : 'text-slate-400'}`}>Control who can message whom</p>
                  </div>
                </div>

                {users.length < 2 ? (
                  <div className={`rounded-xl border border-dashed p-6 text-center text-sm ${dm ? 'border-slate-700 text-slate-500' : 'border-slate-200 text-slate-400'}`}>
                    Create at least 2 users to set communication rules
                  </div>
                ) : (
                  <form className="space-y-3" onSubmit={saveRule}>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className={`block text-xs font-medium mb-1.5 ${dm ? 'text-slate-400' : 'text-slate-600'}`}>From</label>
                        <select className={select} value={fromUsername} onChange={(e) => setFromUsername(e.target.value)} disabled={savingRule}>
                          {users.map((u) => <option key={u.userId} value={u.username}>{u.username}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className={`block text-xs font-medium mb-1.5 ${dm ? 'text-slate-400' : 'text-slate-600'}`}>To</label>
                        <select className={select} value={toUsername} onChange={(e) => setToUsername(e.target.value)} disabled={savingRule}>
                          {users.map((u) => <option key={u.userId} value={u.username}>{u.username}</option>)}
                        </select>
                      </div>
                    </div>

                    <div className={`flex items-center gap-4 rounded-xl border px-4 py-3 text-sm ${dm ? 'border-slate-700 bg-slate-950/50' : 'border-slate-200 bg-slate-50'}`}>
                      <label className="flex items-center gap-2 cursor-pointer select-none">
                        <input type="checkbox" checked={allowComm} onChange={(e) => setAllowComm(e.target.checked)} className="w-4 h-4 accent-blue-600" />
                        <span className={dm ? 'text-slate-300' : 'text-slate-700'}>Allow</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer select-none">
                        <input type="checkbox" checked={bidirectional} onChange={(e) => setBidirectional(e.target.checked)} className="w-4 h-4 accent-blue-600" />
                        <span className={dm ? 'text-slate-300' : 'text-slate-700'}>Bidirectional</span>
                      </label>
                    </div>

                    <button
                      type="submit"
                      disabled={savingRule}
                      className="w-full flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 disabled:opacity-50 px-3 py-2.5 text-sm font-semibold text-white shadow-lg shadow-emerald-500/20 transition-all active:scale-[0.98]"
                    >
                      {savingRule
                        ? <><div className="w-4 h-4 rounded-full border-2 border-white/40 border-t-white animate-spin" />Saving...</>
                        : 'Save Rule'
                      }
                    </button>
                  </form>
                )}
              </section>

              {/* Users Table */}
              <section className={`${card} lg:col-span-2`}>
                <div className="flex items-center justify-between mb-5">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center shrink-0 shadow-lg shadow-violet-500/20">
                      <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                      </svg>
                    </div>
                    <div>
                      <h2 className="text-base font-semibold">Users</h2>
                      <p className={`text-xs ${dm ? 'text-slate-500' : 'text-slate-400'}`}>{users.length} total</p>
                    </div>
                  </div>
                </div>

                {users.length === 0 ? (
                  <div className={`rounded-xl border border-dashed p-8 text-center text-sm ${dm ? 'border-slate-700 text-slate-500' : 'border-slate-200 text-slate-400'}`}>
                    No users yet — create one above
                  </div>
                ) : (
                  <div className="overflow-x-auto -mx-1">
                    <table className="w-full text-left text-sm">
                      <thead>
                        <tr className={`border-b text-xs font-semibold uppercase tracking-wide ${dm ? 'border-slate-800 text-slate-500' : 'border-slate-100 text-slate-400'}`}>
                          <th className="px-3 py-3">User</th>
                          <th className="px-3 py-3">Role</th>
                          <th className="px-3 py-3 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                        {users.map((user) => {
                          const isMe = user.username === profile?.username;
                          const isUpdating = updatingRole === user.username;

                          return (
                            <tr key={user.userId} className={`transition-colors ${dm ? 'hover:bg-slate-800/40' : 'hover:bg-slate-50'}`}>
                              <td className="px-3 py-3.5">
                                <div className="flex items-center gap-3">
                                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white bg-gradient-to-br ${
                                    user.role === 'admin' ? 'from-amber-500 to-orange-500' : 'from-blue-500 to-indigo-500'
                                  }`}>
                                    {user.username.charAt(0).toUpperCase()}
                                  </div>
                                  <div>
                                    <span className="font-medium">{user.username}</span>
                                    {isMe && <span className={`ml-2 text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${dm ? 'bg-slate-700 text-slate-400' : 'bg-slate-100 text-slate-500'}`}>You</span>}
                                  </div>
                                </div>
                              </td>
                              <td className="px-3 py-3.5">
                                <div className="flex items-center gap-2">
                                  <select
                                    className={`rounded-lg border px-2.5 py-1.5 text-xs font-medium outline-none transition-colors ${
                                      user.role === 'admin'
                                        ? dm ? 'border-amber-700/50 bg-amber-900/20 text-amber-400' : 'border-amber-200 bg-amber-50 text-amber-700'
                                        : dm ? 'border-slate-700 bg-slate-800 text-slate-300' : 'border-slate-200 bg-white text-slate-700'
                                    }`}
                                    value={user.role}
                                    disabled={isMe || isUpdating}
                                    onChange={(e) => updateRole(user.username, e.target.value as 'admin' | 'user')}
                                  >
                                    <option value="user">User</option>
                                    <option value="admin">Admin</option>
                                  </select>
                                  {isUpdating && <div className="w-3.5 h-3.5 rounded-full border-2 border-blue-500 border-t-transparent animate-spin" />}
                                </div>
                              </td>
                              <td className="px-3 py-3.5 text-right">
                                {!isMe && (
                                  <button
                                    type="button"
                                    onClick={() => setDeleteModal({ username: user.username, confirmText: '' })}
                                    className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-medium transition-colors ${dm ? 'border-slate-700 text-slate-400 hover:border-rose-700 hover:text-rose-400 hover:bg-rose-900/10' : 'border-slate-200 text-slate-500 hover:border-rose-200 hover:text-rose-600 hover:bg-rose-50'}`}
                                  >
                                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                    Delete
                                  </button>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </section>

              {/* Communication Rules Table */}
              <section className={`${card} lg:col-span-2`}>
                <div className="flex items-center gap-3 mb-5">
                  <div className="w-9 h-9 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 flex items-center justify-center shrink-0 shadow-lg shadow-amber-500/20">
                    <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div>
                    <h2 className="text-base font-semibold">Active Rules</h2>
                    <p className={`text-xs ${dm ? 'text-slate-500' : 'text-slate-400'}`}>{rules.length === 0 ? 'All communication allowed by default' : `${rules.length} custom rule${rules.length !== 1 ? 's' : ''}`}</p>
                  </div>
                </div>

                {rules.length === 0 ? (
                  <div className={`rounded-xl border border-dashed p-6 text-center text-sm ${dm ? 'border-slate-700 text-slate-500' : 'border-slate-200 text-slate-400'}`}>
                    No rules set — all users can communicate freely
                  </div>
                ) : (
                  <div className="overflow-x-auto -mx-1">
                    <table className="w-full text-left text-sm">
                      <thead>
                        <tr className={`border-b text-xs font-semibold uppercase tracking-wide ${dm ? 'border-slate-800 text-slate-500' : 'border-slate-100 text-slate-400'}`}>
                          <th className="px-3 py-3">From</th>
                          <th className="px-3 py-3">To</th>
                          <th className="px-3 py-3">Status</th>
                          <th className="px-3 py-3 text-right">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                        {rules.map((rule) => (
                          <tr key={rule.id} className={`transition-colors ${dm ? 'hover:bg-slate-800/40' : 'hover:bg-slate-50'}`}>
                            <td className="px-3 py-3 font-medium">{rule.fromUsername}</td>
                            <td className="px-3 py-3 font-medium">{rule.toUsername}</td>
                            <td className="px-3 py-3">
                              <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${
                                rule.allowed
                                  ? dm ? 'bg-emerald-900/30 text-emerald-400' : 'bg-emerald-50 text-emerald-700'
                                  : dm ? 'bg-rose-900/30 text-rose-400' : 'bg-rose-50 text-rose-600'
                              }`}>
                                <span className={`w-1.5 h-1.5 rounded-full ${rule.allowed ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                                {rule.allowed ? 'Allowed' : 'Blocked'}
                              </span>
                            </td>
                            <td className="px-3 py-3 text-right">
                              <button
                                type="button"
                                disabled={deletingRule === rule.id}
                                onClick={() => deleteRule(rule.id)}
                                className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-medium transition-colors disabled:opacity-50 ${dm ? 'border-slate-700 text-slate-400 hover:border-rose-700 hover:text-rose-400' : 'border-slate-200 text-slate-500 hover:border-rose-200 hover:text-rose-600'}`}
                              >
                                {deletingRule === rule.id
                                  ? <div className="w-3 h-3 rounded-full border-2 border-current border-t-transparent animate-spin" />
                                  : 'Remove'
                                }
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </section>

            </div>
          )}
        </div>
      </div>
    </div>
  );
}

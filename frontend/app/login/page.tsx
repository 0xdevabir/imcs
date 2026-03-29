'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { API_URL, buildApiHeaders, setAuthTokenCookie } from '@/lib/config';
import { avatarGradient, AVATAR_GRADIENTS } from '@/lib/avatar';

type User = { userId: number; username: string; role: 'admin' | 'user' };
type ConflictState = { user: User; loading: boolean };

export default function LoginPage() {
  const router = useRouter();
  const [users, setUsers] = useState<User[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [loadingId, setLoadingId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [conflict, setConflict] = useState<ConflictState | null>(null);

  useEffect(() => {
    fetch(`${API_URL}/users/all`, { headers: buildApiHeaders() })
      .then((r) => (r.ok ? r.json() : []))
      .then((data: User[]) => setUsers(data))
      .catch(() => setError('Cannot reach the server. Make sure the backend is running.'))
      .finally(() => setLoadingUsers(false));
  }, []);

  const filteredUsers = users.filter((u) =>
    u.username.toLowerCase().includes(search.toLowerCase())
  );

  const doLogin = async (token: string) => {
    setAuthTokenCookie(token);
    router.push('/chat');
  };

  const handleSelect = async (user: User) => {
    if (loadingId !== null) return;
    setLoadingId(user.userId);
    setError(null);
    try {
      const res = await fetch(`${API_URL}/auth/quick-login`, {
        method: 'POST',
        headers: buildApiHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({ username: user.username }),
      });
      if (!res.ok) {
        setError(`Could not sign in as ${user.username}. Make sure the backend is running.`);
        setLoadingId(null);
        return;
      }
      const data = await res.json() as { conflict?: boolean; access_token?: string };
      if (data.conflict) {
        setConflict({ user, loading: false });
        setLoadingId(null);
        return;
      }
      if (!data.access_token) { setError('No token received.'); setLoadingId(null); return; }
      await doLogin(data.access_token);
    } catch {
      setError('Cannot reach the server. Make sure the backend is running.');
      setLoadingId(null);
    }
  };

  const handleForceLogin = async () => {
    if (!conflict) return;
    setConflict({ ...conflict, loading: true });
    try {
      const res = await fetch(`${API_URL}/auth/force-login`, {
        method: 'POST',
        headers: buildApiHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({ username: conflict.user.username }),
      });
      if (!res.ok) {
        setConflict(null);
        setError('Force login failed. Try again.');
        return;
      }
      const data = await res.json() as { access_token: string };
      setConflict(null);
      await doLogin(data.access_token);
    } catch {
      setConflict(null);
      setError('Cannot reach the server.');
    }
  };

  return (
    <>
    {/* Already signed in — conflict modal */}
    {conflict && (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
        <div className="relative w-full max-w-sm rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 shadow-2xl overflow-hidden">
          {/* Top accent bar */}
          <div className="h-1 w-full bg-gradient-to-r from-amber-400 to-orange-500" />

          <div className="p-6">
            {/* Icon + title */}
            <div className="flex items-start gap-4 mb-4">
              <div className="w-12 h-12 rounded-2xl bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center shrink-0">
                <svg className="w-6 h-6 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
                </svg>
              </div>
              <div>
                <h2 className="text-lg font-bold text-slate-900 dark:text-white">Already signed in</h2>
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5 leading-relaxed">
                  <span className="font-semibold text-slate-700 dark:text-slate-200">{conflict.user.username}</span> is currently signed in on another device or browser.
                </p>
              </div>
            </div>

            {/* Info box */}
            <div className="rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 px-4 py-3 mb-5">
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                If you sign in here, the other session will be <span className="font-medium text-slate-700 dark:text-slate-300">immediately logged out</span> and they will see a notification.
              </p>
            </div>

            {/* Actions */}
            <div className="flex flex-col gap-2.5">
              <button
                type="button"
                onClick={handleForceLogin}
                disabled={conflict.loading}
                className="w-full flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 disabled:opacity-60 disabled:cursor-not-allowed px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-amber-500/25 transition-all active:scale-[0.98]"
              >
                {conflict.loading ? (
                  <><div className="w-4 h-4 rounded-full border-2 border-white/40 border-t-white animate-spin" />Signing in...</>
                ) : (
                  <><svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>Sign out other device &amp; sign in here</>
                )}
              </button>
              <button
                type="button"
                onClick={() => setConflict(null)}
                disabled={conflict.loading}
                className="w-full rounded-xl border border-slate-200 dark:border-slate-700 px-4 py-2.5 text-sm font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-50 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      </div>
    )}

    <main className="min-h-screen flex flex-col items-center justify-center px-4 py-10 bg-slate-50 dark:bg-slate-950">
      <div className="text-center mb-10">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-600 to-cyan-500 text-white text-2xl font-black shadow-xl shadow-blue-500/30 mb-5">
          IM
        </div>
        <h1 className="text-3xl font-black tracking-tight text-slate-900 dark:text-white">
          IMCS Prototype
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1.5">
          Select your account to continue
        </p>
      </div>

      <div className="w-full max-w-2xl mb-6">
        <div className="relative">
          <svg className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            placeholder="Search users..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-4 focus:ring-blue-500/15 focus:border-blue-500 transition-all shadow-sm"
          />
        </div>
      </div>

      {error && (
        <div className="w-full max-w-2xl mb-4 flex items-center gap-2 rounded-xl bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/20 px-4 py-3">
          <svg className="w-4 h-4 text-rose-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <p className="text-sm text-rose-600 dark:text-rose-400">{error}</p>
        </div>
      )}

      <div className="w-full max-w-2xl grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
        {loadingUsers ? (
          <div className="col-span-full text-center py-12 text-slate-400 dark:text-slate-600 text-sm">
            Loading users...
          </div>
        ) : filteredUsers.length === 0 ? (
          <div className="col-span-full text-center py-12 text-slate-400 dark:text-slate-600 text-sm">
            {users.length === 0 ? 'No users yet. Admin needs to create users first.' : 'No users found'}
          </div>
        ) : (
          filteredUsers.map((user) => {
            const grad = avatarGradient(user.username);
            const isLoading = loadingId === user.userId;
            const isDisabled = loadingId !== null && !isLoading;

            return (
              <button
                key={user.userId}
                type="button"
                onClick={() => handleSelect(user)}
                disabled={loadingId !== null}
                className={`group relative flex flex-col items-center gap-3 p-5 rounded-2xl border transition-all duration-200 focus:outline-none focus:ring-4 focus:ring-blue-500/20 ${
                  isDisabled
                    ? 'opacity-40 cursor-not-allowed bg-white dark:bg-slate-900 border-slate-100 dark:border-slate-800'
                    : isLoading
                    ? 'scale-95 bg-white dark:bg-slate-900 border-blue-300 dark:border-blue-600 shadow-lg shadow-blue-500/15'
                    : 'bg-white dark:bg-slate-900 border-slate-100 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-600 hover:-translate-y-1 hover:shadow-xl hover:shadow-slate-200/60 dark:hover:shadow-slate-900/60 cursor-pointer'
                }`}
              >
                <div className="relative">
                  <div className={`absolute inset-0 rounded-2xl bg-gradient-to-br ${grad} blur-lg opacity-0 group-hover:opacity-30 transition-opacity duration-300 scale-110`} />
                  <div className={`relative w-14 h-14 rounded-2xl bg-gradient-to-br ${grad} flex items-center justify-center text-xl font-black text-white shadow-md`}>
                    {isLoading ? (
                      <svg className="animate-spin w-6 h-6 text-white" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                    ) : (
                      user.username.charAt(0)
                    )}
                  </div>
                  {user.role === 'admin' && (
                    <div className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-amber-400 flex items-center justify-center shadow-sm">
                      <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M2.5 7.5L5 14.5h14l2.5-7-4.5 3-5-6-5 6-4.5-3z" />
                      </svg>
                    </div>
                  )}
                </div>

                <div className="text-center">
                  <p className="text-xs font-bold tracking-wide text-slate-800 dark:text-slate-100">
                    {user.username}
                  </p>
                  {user.role === 'admin' && (
                    <p className="text-[10px] text-amber-500 font-semibold mt-0.5">Admin</p>
                  )}
                </div>

                {!isLoading && !isDisabled && (
                  <div className="absolute inset-0 rounded-2xl border-2 border-blue-500/0 group-hover:border-blue-500/20 transition-all duration-200 pointer-events-none" />
                )}
              </button>
            );
          })
        )}
      </div>

      <p className="mt-10 text-xs text-slate-400 dark:text-slate-600">
        Prototype · Internal Messaging &amp; Calling Software
      </p>
    </main>
    </>
  );
}

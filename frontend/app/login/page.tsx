'use client';

import { FormEvent, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { API_URL, authFetch, buildApiHeaders, setAuthTokenCookie, clearAuthTokenCookie, getAuthToken } from '@/lib/config';

type LoginResponse = {
  access_token: string;
};

type ProfileResponse = {
  userId: number;
  username: string;
  role: 'admin' | 'user';
};

const quickUsers = [
  { username: 'admin', password: 'Admin123!', label: 'Admin', color: 'from-blue-600 to-cyan-500' },
  { username: 'user1', password: 'User123!', label: 'User 1', color: 'from-emerald-500 to-teal-500' },
  { username: 'user2', password: 'User123!', label: 'User 2', color: 'from-violet-500 to-purple-500' },
  { username: 'user3', password: 'User123!', label: 'User 3', color: 'from-amber-500 to-orange-500' },
  { username: 'user4', password: 'User123!', label: 'User 4', color: 'from-rose-500 to-pink-500' },
];

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('Admin123!');
  const [status, setStatus] = useState('Not authenticated');
  const [profile, setProfile] = useState<ProfileResponse | null>(null);
  const [authToken, setAuthToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    setAuthToken(getAuthToken());
  }, []);
  const [focusedField, setFocusedField] = useState<string | null>(null);
  const [loggingInAs, setLoggingInAs] = useState<string | null>(null);

  const login = async (user?: string, pass?: string) => {
    const u = user ?? username;
    const p = pass ?? password;
    
    setIsLoading(true);
    setLoggingInAs(u);
    setStatus('Signing in...');

    try {
      const response = await fetch(`${API_URL}/auth/login`, {
        method: 'POST',
        headers: buildApiHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({ username: u, password: p }),
      });

      if (!response.ok) {
        setStatus(`Login failed as ${u}`);
        setProfile(null);
        return;
      }

      const { access_token } = (await response.json()) as LoginResponse;
      if (!access_token) {
        setStatus('Login response missing token');
        return;
      }

      setAuthTokenCookie(access_token);
      setStatus(`Logged in as ${u} (token cookie set)`);
      router.push('/chat');
    } catch {
      setStatus(`Unable to reach backend. Ensure API is running on ${API_URL}.`);
      setProfile(null);
    } finally {
      setIsLoading(false);
      setLoggingInAs(null);
    }
  };

  const loginWithQuickUser = (quickUser: typeof quickUsers[0]) => {
    setUsername(quickUser.username);
    setPassword(quickUser.password);
    login(quickUser.username, quickUser.password);
  };

  const fetchProfile = async () => {
    setStatus('Loading protected profile...');

    try {
      const token = authToken ?? getAuthToken();
      if (!token) {
        setStatus('No auth token available');
        setProfile(null);
        return;
      }

      const response = await authFetch(`${API_URL}/auth/profile`, {
        method: 'GET',
      });

      if (!response.ok) {
        setStatus('Not authorized');
        setProfile(null);
        return;
      }

      const data = await response.json() as ProfileResponse;
      setProfile(data);
      setStatus('Protected request succeeded');
    } catch {
      setStatus(`Unable to reach backend. Ensure API is running on ${API_URL}.`);
      setProfile(null);
    }
  };

  const logout = async () => {
    try {
      await authFetch(`${API_URL}/auth/logout`, {
        method: 'POST',
      });

      setProfile(null);
      clearAuthTokenCookie();
      setStatus('Logged out (cookie cleared)');
    } catch {
      setStatus(`Unable to reach backend. Ensure API is running on ${API_URL}.`);
    }
  };

  return (
    <main className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-600 to-cyan-500 text-white text-xl font-bold shadow-lg shadow-blue-500/25 mb-4">
            IM
          </div>
          <h1 className="text-2xl font-semibold text-slate-900 dark:text-white">Welcome back</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Sign in to your secure workspace</p>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-xl shadow-slate-200/50 dark:shadow-none">
          <div className="mb-6">
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-3 ml-1">Quick Login (Prototype)</p>
            <div className="grid grid-cols-3 gap-2">
              {quickUsers.map((user) => (
                <button
                  key={user.username}
                  onClick={() => loginWithQuickUser(user)}
                  disabled={isLoading}
                  className={`flex flex-col items-center gap-1 p-3 rounded-xl bg-gradient-to-r ${user.color} text-white shadow-md hover:shadow-lg transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed`}
                >
                  <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center text-sm font-bold">
                    {user.username.charAt(0).toUpperCase()}
                  </div>
                  <span className="text-xs font-medium">{user.label}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="relative mb-6">
            <div className={`absolute top-1/2 left-0 right-0 h-px ${'bg-slate-200 dark:bg-slate-700'}`} />
            <p className={`relative w-fit mx-auto px-3 text-xs ${'text-slate-400 dark:text-slate-500 bg-white dark:bg-slate-900'}`}>or sign in manually</p>
          </div>

          <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); login(); }}>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-slate-700 dark:text-slate-300 ml-1">Username</label>
              <input
                className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-4 py-3 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 outline-none transition-all"
                placeholder="Enter your username"
                value={username}
                onChange={(event) => setUsername(event.target.value)}
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-slate-700 dark:text-slate-300 ml-1">Password</label>
              <input
                type="password"
                className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-4 py-3 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 outline-none transition-all"
                placeholder="Enter your password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
              />
            </div>

            <button 
              disabled={isLoading}
              className="w-full rounded-xl bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 text-white font-medium py-3 px-4 shadow-lg shadow-blue-500/25 hover:shadow-blue-500/40 transition-all active:scale-[0.98] disabled:opacity-70 disabled:cursor-not-allowed"
              type="submit"
            >
              {isLoading ? (
                <span className="inline-flex items-center gap-2">
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Signing in...
                </span>
              ) : 'Sign in'}
            </button>
          </form>

          <div className="mt-6 pt-6 border-t border-slate-100 dark:border-slate-800">
            <div className="flex gap-3">
              <button
                className="flex-1 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-4 py-2.5 text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                onClick={fetchProfile}
                type="button"
              >
                Verify Session
              </button>
              <button
                className="flex-1 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-4 py-2.5 text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                onClick={logout}
                type="button"
              >
                Sign Out
              </button>
            </div>
            
            {profile?.role === 'admin' ? (
              <button
                className="w-full mt-3 rounded-xl border border-indigo-200 dark:border-indigo-800 bg-indigo-50 dark:bg-indigo-900/20 px-4 py-2.5 text-sm font-medium text-indigo-700 dark:text-indigo-300 hover:bg-indigo-100 dark:hover:bg-indigo-900/40 transition-colors"
                onClick={() => router.push('/admin')}
                type="button"
              >
                Open Admin Panel
              </button>
            ) : null}
          </div>
        </div>

        <div className="mt-6 rounded-xl bg-slate-100 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 p-4">
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Status</p>
          <p className="text-sm text-slate-700 dark:text-slate-300">{status}</p>
        </div>

        {profile ? (
          <pre className="mt-4 overflow-hidden rounded-xl bg-slate-900 p-4 text-xs text-slate-300 font-mono">
            {JSON.stringify(profile, null, 2)}
          </pre>
        ) : null}

        <p className="text-center text-xs text-slate-400 dark:text-slate-500 mt-6">
          Secured with end-to-end encryption
        </p>
      </div>
    </main>
  );
}
'use client';

import { FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';
import { API_URL } from '@/lib/config';

type LoginResponse = {
  access_token: string;
};

type ProfileResponse = {
  userId: number;
  username: string;
  role: 'admin' | 'user';
};

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('Admin123!');
  const [status, setStatus] = useState('Not authenticated');
  const [profile, setProfile] = useState<ProfileResponse | null>(null);

  const login = async (event: FormEvent) => {
    event.preventDefault();
    setStatus('Signing in...');

    const response = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ username, password }),
    });

    if (!response.ok) {
      setStatus('Login failed');
      setProfile(null);
      return;
    }

    const { access_token } = (await response.json()) as LoginResponse;
    if (!access_token) {
      setStatus('Login response missing token');
      return;
    }

    setStatus('Authenticated. Token is stored in a secure httpOnly cookie.');
    router.push('/chat');
  };

  const fetchProfile = async () => {
    setStatus('Loading protected profile...');

    const response = await fetch(`${API_URL}/auth/profile`, {
      method: 'GET',
      credentials: 'include',
    });

    if (!response.ok) {
      setStatus('Not authorized');
      setProfile(null);
      return;
    }

    const data = await response.json() as ProfileResponse;
    setProfile(data);
    setStatus('Protected request succeeded');
  };

  const logout = async () => {
    await fetch(`${API_URL}/auth/logout`, {
      method: 'POST',
      credentials: 'include',
    });

    setProfile(null);
    setStatus('Logged out');
  };

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-md flex-col justify-center gap-6 px-6 py-10">
      <h1 className="text-3xl font-bold">Login</h1>
      <p className="text-sm text-slate-600">
        Credentials are verified by NestJS, and JWT is set as an httpOnly cookie.
      </p>

      <form className="grid gap-3 rounded-xl border border-slate-200 bg-white p-5 shadow-sm" onSubmit={login}>
        <input
          className="rounded-md border border-slate-300 px-3 py-2"
          placeholder="Username"
          value={username}
          onChange={(event) => setUsername(event.target.value)}
        />
        <input
          type="password"
          className="rounded-md border border-slate-300 px-3 py-2"
          placeholder="Password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
        />
        <button className="rounded-md bg-slate-900 px-4 py-2 text-white hover:bg-slate-700" type="submit">
          Sign In
        </button>
      </form>

      <div className="grid gap-2">
        <button
          className="rounded-md bg-emerald-600 px-4 py-2 text-white hover:bg-emerald-500"
          onClick={fetchProfile}
          type="button"
        >
          Call Protected Route
        </button>
        <button
          className="rounded-md border border-slate-300 px-4 py-2 text-slate-700 hover:bg-slate-100"
          onClick={logout}
          type="button"
        >
          Logout
        </button>
      </div>

      <div className="rounded-lg bg-slate-100 p-3 text-sm text-slate-700">Status: {status}</div>

      {profile ? (
        <pre className="overflow-auto rounded-lg bg-slate-900 p-3 text-xs text-slate-100">
          {JSON.stringify(profile, null, 2)}
        </pre>
      ) : null}
    </main>
  );
}

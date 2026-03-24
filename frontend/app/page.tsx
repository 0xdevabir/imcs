'use client';

import { FormEvent, useMemo, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { API_URL } from '@/lib/config';

type LoginResponse = {
  access_token: string;
};

export default function HomePage() {
  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('admin123');
  const [token, setToken] = useState('');
  const [status, setStatus] = useState('Disconnected');
  const [message, setMessage] = useState('');

  const canConnect = useMemo(() => token.trim().length > 0, [token]);

  const login = async (event: FormEvent) => {
    event.preventDefault();
    setStatus('Logging in...');

    const response = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    });

    if (!response.ok) {
      setStatus('Login failed');
      return;
    }

    const data = (await response.json()) as LoginResponse;
    setToken(data.access_token);
    setStatus('Logged in. Token received.');
  };

  const connectSocket = () => {
    if (!canConnect) return;

    setStatus('Connecting socket...');
    const socket: Socket = io(API_URL, {
      auth: { token },
      transports: ['websocket'],
    });

    socket.on('connect', () => {
      setStatus('Socket connected');
      socket.emit('ping', { message: 'hello from frontend' });
    });

    socket.on('pong', (data) => {
      setMessage(JSON.stringify(data));
    });

    socket.on('disconnect', () => {
      setStatus('Socket disconnected');
    });

    socket.on('error', (errorMessage) => {
      setStatus(`Socket error: ${String(errorMessage)}`);
    });
  };

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-3xl flex-col gap-6 px-6 py-10">
      <h1 className="text-3xl font-bold">IMCS Full-Stack Starter</h1>
      <p className="text-sm text-slate-600">Next.js App Router + Tailwind + NestJS + JWT + Socket.IO</p>

      <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="mb-4 text-xl font-semibold">Login</h2>
        <form className="grid gap-3" onSubmit={login}>
          <input
            className="rounded-md border border-slate-300 px-3 py-2"
            placeholder="Username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
          />
          <input
            type="password"
            className="rounded-md border border-slate-300 px-3 py-2"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <button className="rounded-md bg-slate-900 px-4 py-2 text-white hover:bg-slate-700" type="submit">
            Sign In
          </button>
        </form>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="mb-3 text-xl font-semibold">Socket Test</h2>
        <p className="mb-4 text-sm text-slate-600">Status: {status}</p>
        <button
          className="rounded-md bg-emerald-600 px-4 py-2 text-white hover:bg-emerald-500 disabled:bg-slate-300"
          onClick={connectSocket}
          disabled={!canConnect}
        >
          Connect Socket
        </button>
        {message ? <pre className="mt-4 overflow-auto rounded bg-slate-100 p-3 text-xs">{message}</pre> : null}
      </section>
    </main>
  );
}

'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { API_URL } from '@/lib/config';

type Profile = {
  userId: number;
  username: string;
  role: 'admin' | 'user';
};

type UserItem = {
  userId: number;
  username: string;
  role: 'admin' | 'user';
};

type CommunicationRule = {
  id: string;
  fromUsername: string;
  toUsername: string;
  allowed: boolean;
};

export default function AdminPage() {
  const [darkMode, setDarkMode] = useState(false);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [status, setStatus] = useState('Checking admin session...');
  const [users, setUsers] = useState<UserItem[]>([]);
  const [rules, setRules] = useState<CommunicationRule[]>([]);

  const [newUsername, setNewUsername] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newRole, setNewRole] = useState<'admin' | 'user'>('user');

  const [fromUsername, setFromUsername] = useState('');
  const [toUsername, setToUsername] = useState('');
  const [allowComm, setAllowComm] = useState(true);
  const [bidirectional, setBidirectional] = useState(true);

  const userOptions = useMemo(
    () => users.map((user) => user.username).sort((a, b) => a.localeCompare(b)),
    [users],
  );

  const loadAdminData = async () => {
    const profileResponse = await fetch(`${API_URL}/auth/profile`, {
      credentials: 'include',
    });

    if (!profileResponse.ok) {
      setStatus('Not authenticated');
      setProfile(null);
      return;
    }

    const profileData = (await profileResponse.json()) as Profile;
    setProfile(profileData);

    if (profileData.role !== 'admin') {
      setStatus('Admin access required');
      return;
    }

    const [usersResponse, rulesResponse] = await Promise.all([
      fetch(`${API_URL}/users`, { credentials: 'include' }),
      fetch(`${API_URL}/communication-rules`, { credentials: 'include' }),
    ]);

    if (usersResponse.ok) {
      const usersData = (await usersResponse.json()) as UserItem[];
      setUsers(usersData);
      if (!fromUsername && usersData.length > 0) {
        setFromUsername(usersData[0].username);
      }
      if (!toUsername && usersData.length > 1) {
        setToUsername(usersData[1].username);
      }
    }

    if (rulesResponse.ok) {
      const rulesData = (await rulesResponse.json()) as CommunicationRule[];
      setRules(rulesData);
    }

    setStatus('Admin panel ready');
  };

  useEffect(() => {
    loadAdminData().catch(() => {
      setStatus('Failed to load admin data');
    });
  }, []);

  const createUser = async (event: FormEvent) => {
    event.preventDefault();
    const username = newUsername.trim();
    if (!username || !newPassword) {
      setStatus('Username and password are required');
      return;
    }

    const response = await fetch(`${API_URL}/users`, {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        username,
        password: newPassword,
        role: newRole,
      }),
    });

    if (!response.ok) {
      setStatus('Could not create user');
      return;
    }

    setNewUsername('');
    setNewPassword('');
    setNewRole('user');
    await loadAdminData();
  };

  const updateRole = async (username: string, role: 'admin' | 'user') => {
    const response = await fetch(`${API_URL}/users/${username}/role`, {
      method: 'PATCH',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ role }),
    });

    if (!response.ok) {
      setStatus(`Could not update role for ${username}`);
      return;
    }

    await loadAdminData();
  };

  const deleteUser = async (username: string) => {
    const response = await fetch(`${API_URL}/users/${username}`, {
      method: 'DELETE',
      credentials: 'include',
    });

    if (!response.ok) {
      setStatus(`Could not delete ${username}`);
      return;
    }

    await loadAdminData();
  };

  const saveRule = async (event: FormEvent) => {
    event.preventDefault();

    if (!fromUsername || !toUsername || fromUsername === toUsername) {
      setStatus('Select two different users');
      return;
    }

    const response = await fetch(`${API_URL}/communication-rules`, {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        fromUsername,
        toUsername,
        allowed: allowComm,
        bidirectional,
      }),
    });

    if (!response.ok) {
      setStatus('Could not save communication rule');
      return;
    }

    await loadAdminData();
  };

  const deleteRule = async (id: string) => {
    const response = await fetch(`${API_URL}/communication-rules/${id}`, {
      method: 'DELETE',
      credentials: 'include',
    });

    if (!response.ok) {
      setStatus('Could not delete rule');
      return;
    }

    await loadAdminData();
  };

  return (
    <main className={`${darkMode ? 'dark' : ''}`}>
      <div className={`min-h-screen ${darkMode ? 'bg-slate-950 text-slate-100' : 'bg-slate-100 text-slate-900'}`}>
      <div className="mx-auto w-full max-w-6xl px-6 py-8">
      <header className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Admin Control Center</h1>
          <p className={`text-sm ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>Manage users, roles, and communication permissions.</p>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setDarkMode((current) => !current)}
            className={`btn-press rounded-lg border px-3 py-2 text-sm font-semibold ${darkMode ? 'border-slate-700 bg-slate-900 text-slate-100 hover:bg-slate-800' : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-100'}`}
          >
            {darkMode ? 'Light' : 'Dark'}
          </button>
          <Link href="/chat" className={`btn-press rounded-lg border px-3 py-2 text-sm font-semibold ${darkMode ? 'border-slate-700 text-slate-100 hover:bg-slate-900' : 'border-slate-300 text-slate-700 hover:bg-slate-100'}`}>
            Chat
          </Link>
          <Link href="/login" className={`btn-press rounded-lg border px-3 py-2 text-sm font-semibold ${darkMode ? 'border-slate-700 text-slate-100 hover:bg-slate-900' : 'border-slate-300 text-slate-700 hover:bg-slate-100'}`}>
            Account
          </Link>
        </div>
      </header>

      <div className={`mb-5 rounded-xl border px-4 py-3 text-sm ${darkMode ? 'border-slate-800 bg-slate-900/85 text-slate-300' : 'border-slate-200 bg-white text-slate-700'} shadow-[0_10px_24px_rgba(15,23,42,0.08)]`}>
        Status: {status}
      </div>

      {profile?.role !== 'admin' ? (
        <section className={`rounded-2xl border p-6 text-sm ${darkMode ? 'border-slate-800 bg-slate-900 text-slate-300' : 'border-slate-200 bg-white text-slate-700'} shadow-[0_14px_30px_rgba(15,23,42,0.1)]`}>
          Admin access is required.
        </section>
      ) : (
        <div className="grid gap-5 md:grid-cols-2">
          <section className={`rounded-2xl border p-5 shadow-[0_16px_36px_rgba(15,23,42,0.12)] ${darkMode ? 'border-slate-800 bg-slate-900' : 'border-slate-200 bg-white'}`}>
            <h2 className="mb-3 text-xl font-semibold tracking-tight">Create User</h2>
            <form className="space-y-3" onSubmit={createUser}>
              <input
                className={`focus-ring w-full rounded-lg border px-3 py-2.5 text-sm ${darkMode ? 'border-slate-700 bg-slate-950 text-slate-100 placeholder:text-slate-500' : 'border-slate-300 bg-white text-slate-800 placeholder:text-slate-400'}`}
                placeholder="Username"
                value={newUsername}
                onChange={(event) => setNewUsername(event.target.value)}
              />
              <input
                type="password"
                className={`focus-ring w-full rounded-lg border px-3 py-2.5 text-sm ${darkMode ? 'border-slate-700 bg-slate-950 text-slate-100 placeholder:text-slate-500' : 'border-slate-300 bg-white text-slate-800 placeholder:text-slate-400'}`}
                placeholder="Password"
                value={newPassword}
                onChange={(event) => setNewPassword(event.target.value)}
              />
              <select
                className={`focus-ring w-full rounded-lg border px-3 py-2.5 text-sm ${darkMode ? 'border-slate-700 bg-slate-950 text-slate-100' : 'border-slate-300 bg-white text-slate-800'}`}
                value={newRole}
                onChange={(event) => setNewRole(event.target.value as 'admin' | 'user')}
              >
                <option value="user">user</option>
                <option value="admin">admin</option>
              </select>
              <button className="btn-press w-full rounded-lg bg-gradient-to-r from-indigo-600 to-blue-600 px-3 py-2.5 text-sm font-semibold text-white shadow-[0_12px_30px_rgba(37,99,235,0.3)] hover:from-indigo-500 hover:to-blue-500" type="submit">
                Create User
              </button>
            </form>
          </section>

          <section className={`rounded-2xl border p-5 shadow-[0_16px_36px_rgba(15,23,42,0.12)] ${darkMode ? 'border-slate-800 bg-slate-900' : 'border-slate-200 bg-white'}`}>
            <h2 className="mb-3 text-xl font-semibold tracking-tight">Communication Rules</h2>
            <form className="space-y-3" onSubmit={saveRule}>
              <select
                className={`focus-ring w-full rounded-lg border px-3 py-2.5 text-sm ${darkMode ? 'border-slate-700 bg-slate-950 text-slate-100' : 'border-slate-300 bg-white text-slate-800'}`}
                value={fromUsername}
                onChange={(event) => setFromUsername(event.target.value)}
              >
                {userOptions.map((username) => (
                  <option key={`from-${username}`} value={username}>
                    From: {username}
                  </option>
                ))}
              </select>
              <select
                className={`focus-ring w-full rounded-lg border px-3 py-2.5 text-sm ${darkMode ? 'border-slate-700 bg-slate-950 text-slate-100' : 'border-slate-300 bg-white text-slate-800'}`}
                value={toUsername}
                onChange={(event) => setToUsername(event.target.value)}
              >
                {userOptions.map((username) => (
                  <option key={`to-${username}`} value={username}>
                    To: {username}
                  </option>
                ))}
              </select>

              <div className={`flex items-center justify-between rounded-lg border px-3 py-2 text-sm ${darkMode ? 'border-slate-700 bg-slate-950 text-slate-200' : 'border-slate-200 bg-slate-50 text-slate-700'}`}>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={allowComm}
                    onChange={(event) => setAllowComm(event.target.checked)}
                  />
                  Allow communication
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={bidirectional}
                    onChange={(event) => setBidirectional(event.target.checked)}
                  />
                  Bidirectional
                </label>
              </div>

              <button className="btn-press w-full rounded-lg bg-gradient-to-r from-emerald-600 to-teal-500 px-3 py-2.5 text-sm font-semibold text-white shadow-[0_12px_30px_rgba(16,185,129,0.28)] hover:from-emerald-500 hover:to-teal-400" type="submit">
                Save Rule
              </button>
            </form>
          </section>

          <section className={`rounded-2xl border p-5 shadow-[0_16px_36px_rgba(15,23,42,0.12)] md:col-span-2 ${darkMode ? 'border-slate-800 bg-slate-900' : 'border-slate-200 bg-white'}`}>
            <h2 className="mb-3 text-xl font-semibold tracking-tight">Users</h2>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[560px] text-left text-sm">
                <thead>
                  <tr className={`border-b ${darkMode ? 'border-slate-700 text-slate-400' : 'border-slate-200 text-slate-500'}`}>
                    <th className="px-2 py-2">ID</th>
                    <th className="px-2 py-2">Username</th>
                    <th className="px-2 py-2">Role</th>
                    <th className="px-2 py-2">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((user) => (
                    <tr key={user.userId} className={`border-b ${darkMode ? 'border-slate-800' : 'border-slate-100'}`}>
                      <td className="px-2 py-2">{user.userId}</td>
                      <td className="px-2 py-2">{user.username}</td>
                      <td className="px-2 py-2">
                        <select
                          className={`focus-ring rounded-lg border px-2 py-1 ${darkMode ? 'border-slate-700 bg-slate-950 text-slate-100' : 'border-slate-300 bg-white text-slate-800'}`}
                          value={user.role}
                          onChange={(event) => updateRole(user.username, event.target.value as 'admin' | 'user')}
                        >
                          <option value="user">user</option>
                          <option value="admin">admin</option>
                        </select>
                      </td>
                      <td className="px-2 py-2">
                        <button
                          className="btn-press rounded-lg border border-rose-300 px-2 py-1 text-rose-700 hover:bg-rose-50"
                          onClick={() => deleteUser(user.username)}
                          type="button"
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section className={`rounded-2xl border p-5 shadow-[0_16px_36px_rgba(15,23,42,0.12)] md:col-span-2 ${darkMode ? 'border-slate-800 bg-slate-900' : 'border-slate-200 bg-white'}`}>
            <h2 className="mb-3 text-xl font-semibold tracking-tight">Current Rules</h2>
            {rules.length === 0 ? (
              <p className={`text-sm ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>No custom rules set. Communication is allowed by default.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[560px] text-left text-sm">
                  <thead>
                    <tr className={`border-b ${darkMode ? 'border-slate-700 text-slate-400' : 'border-slate-200 text-slate-500'}`}>
                      <th className="px-2 py-2">From</th>
                      <th className="px-2 py-2">To</th>
                      <th className="px-2 py-2">Allowed</th>
                      <th className="px-2 py-2">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rules.map((rule) => (
                      <tr key={rule.id} className={`border-b ${darkMode ? 'border-slate-800' : 'border-slate-100'}`}>
                        <td className="px-2 py-2">{rule.fromUsername}</td>
                        <td className="px-2 py-2">{rule.toUsername}</td>
                        <td className="px-2 py-2">{rule.allowed ? 'yes' : 'no'}</td>
                        <td className="px-2 py-2">
                          <button
                            className={`btn-press rounded-lg border px-2 py-1 ${darkMode ? 'border-slate-700 hover:bg-slate-800' : 'border-slate-300 hover:bg-slate-100'}`}
                            onClick={() => deleteRule(rule.id)}
                            type="button"
                          >
                            Remove
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
    </main>
  );
}

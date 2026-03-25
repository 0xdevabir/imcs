'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { API_URL, authFetch, getAuthToken } from '@/lib/config';

interface Profile {
  userId: number;
  username: string;
  role: 'admin' | 'user';
}

interface UserItem {
  userId: number;
  username: string;
  role: 'admin' | 'user';
}

interface CommunicationRule {
  id: string;
  fromUsername: string;
  toUsername: string;
  allowed: boolean;
}

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

  const userOptions = useMemo(() => users.map((user) => user.username).sort((a, b) => a.localeCompare(b)), [users]);

  const loadAdminData = async () => {
    const token = getAuthToken();
    if (!token) { setStatus('Not authenticated'); setProfile(null); return; }

    const profileResponse = await authFetch(`${API_URL}/auth/profile`, { method: 'GET' });
    if (!profileResponse.ok) { setStatus('Not authenticated'); setProfile(null); return; }
    const profileData = (await profileResponse.json()) as Profile;
    setProfile(profileData);
    if (profileData.role !== 'admin') { setStatus('Admin access required'); return; }
    const [usersResponse, rulesResponse] = await Promise.all([
      authFetch(`${API_URL}/users`),
      authFetch(`${API_URL}/communication-rules`),
    ]);
    if (usersResponse.ok) { const usersData = (await usersResponse.json()) as UserItem[]; setUsers(usersData); if (!fromUsername && usersData.length > 0) setFromUsername(usersData[0].username); if (!toUsername && usersData.length > 1) setToUsername(usersData[1].username); }
    if (rulesResponse.ok) { const rulesData = (await rulesResponse.json()) as CommunicationRule[]; setRules(rulesData); }
    setStatus('Admin panel ready');
  };

  useEffect(() => { loadAdminData().catch(() => setStatus('Failed to load admin data')); }, []);

  const createUser = async (event: FormEvent) => {
    event.preventDefault();
    const username = newUsername.trim();
    if (!username || !newPassword) { setStatus('Username and password are required'); return; }
    const response = await authFetch(`${API_URL}/users`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ username, password: newPassword, role: newRole }) });
    if (!response.ok) { setStatus('Could not create user'); return; }
    setNewUsername(''); setNewPassword(''); setNewRole('user'); await loadAdminData();
  };

  const updateRole = async (username: string, role: 'admin' | 'user') => {
    const response = await authFetch(`${API_URL}/users/${username}/role`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ role }) });
    if (!response.ok) { setStatus(`Could not update role for ${username}`); return; }
    await loadAdminData();
  };

  const deleteUser = async (username: string) => {
    const response = await authFetch(`${API_URL}/users/${username}`, { method: 'DELETE' });
    if (!response.ok) { setStatus(`Could not delete ${username}`); return; }
    await loadAdminData();
  };

  const saveRule = async (event: FormEvent) => {
    event.preventDefault();
    if (!fromUsername || !toUsername || fromUsername === toUsername) { setStatus('Select two different users'); return; }
    const response = await authFetch(`${API_URL}/communication-rules`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ fromUsername, toUsername, allowed: allowComm, bidirectional }) });
    if (!response.ok) { setStatus('Could not save communication rule'); return; }
    await loadAdminData();
  };

  const deleteRule = async (id: string) => {
    const response = await authFetch(`${API_URL}/communication-rules/${id}`, { method: 'DELETE' });
    if (!response.ok) { setStatus('Could not delete rule'); return; }
    await loadAdminData();
  };

  return (
    <main className={`${darkMode ? 'dark' : ''}`}>
      <div className={`min-h-screen ${darkMode ? 'bg-slate-950 text-slate-100' : 'bg-slate-100 text-slate-900'}`}>
        <div className="mx-auto w-full max-w-6xl px-4 py-8 md:px-6">
          <header className="mb-8">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <div className="flex items-center gap-3 mb-2">
                  <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-blue-600 to-cyan-500 text-white text-sm font-bold shadow-lg shadow-blue-500/20">
                    IM
                  </div>
                  <h1 className="text-2xl font-semibold">Admin Control Center</h1>
                </div>
                <p className={`text-sm ${darkMode ? 'text-slate-400' : 'text-slate-600'}`}>Manage users, roles, and communication permissions</p>
              </div>
              <div className="flex gap-2">
                <button type="button" onClick={() => setDarkMode((c) => !c)} className={`flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium border transition-all ${darkMode ? 'border-slate-700 bg-slate-900 text-slate-300 hover:bg-slate-800' : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'}`}>
                  {darkMode ? <><svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" /></svg>Light</> : <><svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" /></svg>Dark</>}
                </button>
                <Link href="/chat" className={`flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium border transition-all ${darkMode ? 'border-slate-700 text-slate-300 hover:bg-slate-900' : 'border-slate-200 text-slate-700 hover:bg-slate-50'}`}>
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>
                  Chat
                </Link>
              </div>
            </div>
          </header>

          <div className={`mb-6 rounded-xl border px-4 py-3 text-sm flex items-center gap-2 ${darkMode ? 'border-slate-800 bg-slate-900/50 text-slate-400' : 'border-slate-200 bg-white text-slate-600'}`}>
            <span className={`w-2 h-2 rounded-full ${status.includes('ready') ? 'bg-emerald-500' : status.includes('fail') || status.includes('Not') ? 'bg-rose-500' : 'bg-amber-500 animate-pulse'}`} />
            Status: {status}
          </div>

          {profile?.role !== 'admin' ? (
            <div className={`rounded-2xl border p-8 text-center ${darkMode ? 'border-slate-800 bg-slate-900' : 'border-slate-200 bg-white'}`}>
              <div className={`w-16 h-16 rounded-2xl mx-auto mb-4 flex items-center justify-center ${darkMode ? 'bg-slate-800' : 'bg-slate-100'}`}>
                <svg className={`w-8 h-8 ${darkMode ? 'text-slate-500' : 'text-slate-400'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              </div>
              <p className="text-lg font-medium mb-1">Admin access required</p>
              <p className={`text-sm ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>You must have admin privileges to access this panel</p>
            </div>
          ) : (
            <div className="grid gap-6 lg:grid-cols-2">
              <section className={`rounded-2xl border p-5 ${darkMode ? 'border-slate-800 bg-slate-900' : 'border-slate-200 bg-white'}`}>
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-600 to-cyan-500 flex items-center justify-center">
                    <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                    </svg>
                  </div>
                  <h2 className="text-lg font-semibold">Create User</h2>
                </div>
                <form className="space-y-3" onSubmit={createUser}>
                  <input className={`w-full rounded-xl border px-3 py-2.5 text-sm outline-none ${darkMode ? 'border-slate-700 bg-slate-950 text-slate-100 placeholder:text-slate-500 focus:border-blue-500' : 'border-slate-200 bg-slate-50 text-slate-800 placeholder:text-slate-400 focus:border-blue-500'}`} placeholder="Username" value={newUsername} onChange={(e) => setNewUsername(e.target.value)} />
                  <input type="password" className={`w-full rounded-xl border px-3 py-2.5 text-sm outline-none ${darkMode ? 'border-slate-700 bg-slate-950 text-slate-100 placeholder:text-slate-500 focus:border-blue-500' : 'border-slate-200 bg-slate-50 text-slate-800 placeholder:text-slate-400 focus:border-blue-500'}`} placeholder="Password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} />
                  <select className={`w-full rounded-xl border px-3 py-2.5 text-sm outline-none ${darkMode ? 'border-slate-700 bg-slate-950 text-slate-100' : 'border-slate-200 bg-slate-50 text-slate-800'}`} value={newRole} onChange={(e) => setNewRole(e.target.value as 'admin' | 'user')}>
                    <option value="user">User</option>
                    <option value="admin">Admin</option>
                  </select>
                  <button className="w-full rounded-xl bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 px-3 py-2.5 text-sm font-medium text-white shadow-lg shadow-blue-500/20 transition-all active:scale-[0.98]" type="submit">
                    Create User
                  </button>
                </form>
              </section>

              <section className={`rounded-2xl border p-5 ${darkMode ? 'border-slate-800 bg-slate-900' : 'border-slate-200 bg-white'}`}>
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center">
                    <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                    </svg>
                  </div>
                  <h2 className="text-lg font-semibold">Communication Rules</h2>
                </div>
                <form className="space-y-3" onSubmit={saveRule}>
                  <div className="grid grid-cols-2 gap-2">
                    <select className={`w-full rounded-xl border px-3 py-2.5 text-sm outline-none ${darkMode ? 'border-slate-700 bg-slate-950 text-slate-100' : 'border-slate-200 bg-slate-50 text-slate-800'}`} value={fromUsername} onChange={(e) => setFromUsername(e.target.value)}>
                      {userOptions.map((username) => (<option key={`from-${username}`} value={username}>From: {username}</option>))}
                    </select>
                    <select className={`w-full rounded-xl border px-3 py-2.5 text-sm outline-none ${darkMode ? 'border-slate-700 bg-slate-950 text-slate-100' : 'border-slate-200 bg-slate-50 text-slate-800'}`} value={toUsername} onChange={(e) => setToUsername(e.target.value)}>
                      {userOptions.map((username) => (<option key={`to-${username}`} value={username}>To: {username}</option>))}
                    </select>
                  </div>
                  <div className={`flex items-center justify-between rounded-xl border px-3 py-2 text-sm ${darkMode ? 'border-slate-700 bg-slate-950 text-slate-200' : 'border-slate-200 bg-slate-50 text-slate-700'}`}>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" checked={allowComm} onChange={(e) => setAllowComm(e.target.checked)} className="rounded border-slate-300 text-blue-600 focus:ring-blue-500" />
                      Allow communication
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" checked={bidirectional} onChange={(e) => setBidirectional(e.target.checked)} className="rounded border-slate-300 text-blue-600 focus:ring-blue-500" />
                      Bidirectional
                    </label>
                  </div>
                  <button className="w-full rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 px-3 py-2.5 text-sm font-medium text-white shadow-lg shadow-emerald-500/20 transition-all active:scale-[0.98]" type="submit">
                    Save Rule
                  </button>
                </form>
              </section>

              <section className={`rounded-2xl border p-5 lg:col-span-2 ${darkMode ? 'border-slate-800 bg-slate-900' : 'border-slate-200 bg-white'}`}>
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500 to-purple-500 flex items-center justify-center">
                    <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                    </svg>
                  </div>
                  <h2 className="text-lg font-semibold">Users ({users.length})</h2>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[500px] text-left text-sm">
                    <thead>
                      <tr className={`border-b ${darkMode ? 'border-slate-700 text-slate-400' : 'border-slate-200 text-slate-500'}`}>
                        <th className="px-3 py-3 font-medium">ID</th>
                        <th className="px-3 py-3 font-medium">Username</th>
                        <th className="px-3 py-3 font-medium">Role</th>
                        <th className="px-3 py-3 font-medium text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {users.map((user) => (
                        <tr key={user.userId} className={`border-b ${darkMode ? 'border-slate-800' : 'border-slate-100'} hover:${darkMode ? 'bg-slate-800/50' : 'bg-slate-50'}`}>
                          <td className="px-3 py-3 text-slate-500">{user.userId}</td>
                          <td className="px-3 py-3 font-medium">{user.username}</td>
                          <td className="px-3 py-3">
                            <select className={`rounded-lg border px-2 py-1 text-xs ${darkMode ? 'border-slate-700 bg-slate-950' : 'border-slate-200 bg-white'}`} value={user.role} onChange={(e) => updateRole(user.username, e.target.value as 'admin' | 'user')}>
                              <option value="user">User</option>
                              <option value="admin">Admin</option>
                            </select>
                          </td>
                          <td className="px-3 py-3 text-right">
                            <button className="inline-flex items-center gap-1 rounded-lg border border-rose-200 dark:border-rose-800 px-2.5 py-1 text-xs font-medium text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-900/20 transition-colors" onClick={() => deleteUser(user.username)} type="button">
                              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                              Delete
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>

              <section className={`rounded-2xl border p-5 lg:col-span-2 ${darkMode ? 'border-slate-800 bg-slate-900' : 'border-slate-200 bg-white'}`}>
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-8 h-8 rounded-lg bg-gradient-to-r from-amber-500 to-orange-500 flex items-center justify-center">
                    <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <h2 className="text-lg font-semibold">Current Rules ({rules.length})</h2>
                </div>
                {rules.length === 0 ? (
                  <div className={`text-center py-8 ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                    <p className="text-sm">No custom rules set. Communication is allowed by default.</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[500px] text-left text-sm">
                      <thead>
                        <tr className={`border-b ${darkMode ? 'border-slate-700 text-slate-400' : 'border-slate-200 text-slate-500'}`}>
                          <th className="px-3 py-3 font-medium">From</th>
                          <th className="px-3 py-3 font-medium">To</th>
                          <th className="px-3 py-3 font-medium">Allowed</th>
                          <th className="px-3 py-3 font-medium text-right">Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {rules.map((rule) => (
                          <tr key={rule.id} className={`border-b ${darkMode ? 'border-slate-800' : 'border-slate-100'}`}>
                            <td className="px-3 py-3">{rule.fromUsername}</td>
                            <td className="px-3 py-3">{rule.toUsername}</td>
                            <td className="px-3 py-3">
                              <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${rule.allowed ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400' : 'bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-400'}`}>
                                {rule.allowed ? '✓ Allowed' : '✗ Blocked'}
                              </span>
                            </td>
                            <td className="px-3 py-3 text-right">
                              <button className={`inline-flex items-center gap-1 rounded-lg border px-2.5 py-1 text-xs font-medium transition-colors ${darkMode ? 'border-slate-700 hover:bg-slate-800' : 'border-slate-200 hover:bg-slate-100'}`} onClick={() => deleteRule(rule.id)} type="button">
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
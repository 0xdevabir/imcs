'use client';

import { useState } from 'react';
import { authFetch, clearAuthTokenCookie } from '@/lib/config';
import { UserStatus } from '@/components/messaging/types';

interface SettingsViewProps {
  darkMode: boolean;
  onToggleDarkMode: () => void;
  onBack: () => void;
  profile: { username: string; userId: number; role: 'admin' | 'user' };
  userStatus: UserStatus;
  onStatusChange: (status: UserStatus) => void;
  onUsernameChange: (newUsername: string) => void;
  apiUrl: string;
}

const STATUS_OPTIONS: { value: UserStatus; label: string; desc: string; dot: string; text: string }[] = [
  { value: 'available', label: 'Available',       desc: 'You can receive messages',      dot: 'bg-emerald-500', text: 'text-emerald-500' },
  { value: 'dnd',       label: 'Do Not Disturb',  desc: 'Mute all notifications',        dot: 'bg-rose-500',    text: 'text-rose-500' },
  { value: 'invisible', label: 'Invisible',        desc: 'Appear offline to others',      dot: 'bg-slate-400',   text: 'text-slate-400' },
];

const AVATAR_GRADIENTS = [
  'from-blue-500 to-indigo-600',
  'from-violet-500 to-purple-600',
  'from-emerald-500 to-teal-600',
  'from-rose-500 to-pink-600',
  'from-amber-500 to-orange-600',
  'from-cyan-500 to-sky-600',
  'from-fuchsia-500 to-violet-600',
];

function avatarGradient(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return AVATAR_GRADIENTS[Math.abs(hash) % AVATAR_GRADIENTS.length];
}

function Toggle({ on }: { on: boolean }) {
  return (
    <div className={`relative flex-shrink-0 w-11 h-6 rounded-full transition-colors duration-200 ${on ? 'bg-blue-600' : 'bg-slate-300 dark:bg-slate-600'}`}>
      <div className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow-sm transition-transform duration-200 ${on ? 'translate-x-6' : 'translate-x-1'}`} />
    </div>
  );
}

function SettingCard({ title, darkMode, children }: { title: string; darkMode: boolean; children: React.ReactNode }) {
  return (
    <div className={`rounded-2xl overflow-hidden ${darkMode ? 'bg-slate-900 ring-1 ring-slate-800' : 'bg-white ring-1 ring-slate-100 shadow-sm'}`}>
      <div className={`px-5 py-3 border-b ${darkMode ? 'border-slate-800' : 'border-slate-50'}`}>
        <p className={`text-[11px] font-bold uppercase tracking-widest ${darkMode ? 'text-slate-600' : 'text-slate-400'}`}>{title}</p>
      </div>
      {children}
    </div>
  );
}

export function SettingsView({ darkMode, onToggleDarkMode, onBack, profile, userStatus, onStatusChange, onUsernameChange, apiUrl }: SettingsViewProps) {
  const [notifications, setNotifications] = useState(true);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [messagePreview, setMessagePreview] = useState(true);

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [pwStatus, setPwStatus] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);
  const [pwLoading, setPwLoading] = useState(false);

  const [newUsername, setNewUsername] = useState('');
  const [unStatus, setUnStatus] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);
  const [unLoading, setUnLoading] = useState(false);

  const handleChangeUsername = async () => {
    const trimmed = newUsername.trim();
    if (!trimmed) { setUnStatus({ type: 'error', msg: 'Enter a new username.' }); return; }
    if (trimmed.length < 2 || trimmed.length > 32) { setUnStatus({ type: 'error', msg: 'Username must be 2–32 characters.' }); return; }
    setUnLoading(true); setUnStatus(null);
    try {
      const res = await authFetch(`${apiUrl}/users/me/username`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ newUsername: trimmed }),
      });
      if (res.ok) {
        const data = await res.json() as { username: string };
        setUnStatus({ type: 'success', msg: 'Username updated successfully.' });
        setNewUsername('');
        onUsernameChange(data.username);
      } else {
        const data = await res.json().catch(() => ({})) as { message?: string };
        setUnStatus({ type: 'error', msg: data.message ?? 'Failed to update username.' });
      }
    } catch {
      setUnStatus({ type: 'error', msg: 'Network error. Please try again.' });
    } finally {
      setUnLoading(false);
    }
  };

  const grad = avatarGradient(profile.username);
  const currentStatusConfig = STATUS_OPTIONS.find((s) => s.value === userStatus);

  const handleChangePassword = async () => {
    if (!newPassword || !currentPassword) { setPwStatus({ type: 'error', msg: 'All fields are required.' }); return; }
    if (newPassword !== confirmPassword) { setPwStatus({ type: 'error', msg: 'New passwords do not match.' }); return; }
    if (newPassword.length < 8) { setPwStatus({ type: 'error', msg: 'Password must be at least 8 characters.' }); return; }
    setPwLoading(true); setPwStatus(null);
    try {
      const res = await authFetch(`${apiUrl}/auth/change-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      if (res.ok) {
        setPwStatus({ type: 'success', msg: 'Password changed successfully.' });
        setCurrentPassword(''); setNewPassword(''); setConfirmPassword('');
      } else {
        const data = await res.json().catch(() => ({})) as { message?: string };
        setPwStatus({ type: 'error', msg: data.message ?? 'Failed to change password.' });
      }
    } catch {
      setPwStatus({ type: 'error', msg: 'Network error. Please try again.' });
    } finally {
      setPwLoading(false);
    }
  };

  const handleSignOut = async () => {
    await authFetch(`${apiUrl}/auth/logout`, { method: 'POST' }).catch(() => undefined);
    clearAuthTokenCookie();
    window.location.href = '/login';
  };

  const inputClass = `w-full rounded-xl border px-4 py-2.5 text-sm outline-none transition-all ${
    darkMode
      ? 'border-slate-700/80 bg-slate-950 text-slate-100 placeholder:text-slate-600 focus:border-blue-500/60 focus:ring-2 focus:ring-blue-500/10'
      : 'border-slate-200 bg-slate-50 text-slate-900 placeholder:text-slate-400 focus:border-blue-400 focus:ring-2 focus:ring-blue-500/10'
  }`;

  return (
    <div className={`h-full flex flex-col ${darkMode ? 'bg-slate-950' : 'bg-slate-50'}`}>
      {/* Header */}
      <div className={`flex items-center gap-3 px-5 py-4 border-b flex-shrink-0 ${
        darkMode ? 'border-slate-800 bg-slate-900/80' : 'border-slate-200/80 bg-white'
      }`} style={{ backdropFilter: 'blur(20px)' }}>
        <button
          type="button"
          onClick={onBack}
          className={`w-9 h-9 flex items-center justify-center rounded-xl transition-colors ${
            darkMode ? 'hover:bg-slate-800 text-slate-400 hover:text-slate-200' : 'hover:bg-slate-100 text-slate-500 hover:text-slate-800'
          }`}
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <div>
          <h1 className={`text-base font-bold ${darkMode ? 'text-white' : 'text-slate-900'}`}>Settings</h1>
          <p className={`text-xs ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>Manage your account preferences</p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-5 py-5">
        <div className="max-w-xl mx-auto space-y-4">

          {/* Profile card */}
          <SettingCard title="Profile" darkMode={darkMode}>
            <div className="px-5 py-4 flex items-center gap-4">
              <div className="relative">
                <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${grad} flex items-center justify-center text-xl font-black text-white shadow-sm`}>
                  {profile.username.charAt(0).toUpperCase()}
                </div>
                <span className={`absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-2 ${darkMode ? 'border-slate-900' : 'border-white'} ${currentStatusConfig?.dot ?? 'bg-emerald-500'}`} />
              </div>
              <div>
                <p className={`text-sm font-bold ${darkMode ? 'text-white' : 'text-slate-900'}`}>{profile.username}</p>
                <p className={`text-xs mt-0.5 ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>
                  {profile.role === 'admin' ? 'Administrator' : 'Standard User'}
                </p>
              </div>
            </div>
          </SettingCard>

          {/* Status */}
          <SettingCard title="Status" darkMode={darkMode}>
            <div className="p-2">
              {STATUS_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => onStatusChange(opt.value)}
                  className={`w-full flex items-center gap-3 px-3 py-3 rounded-xl transition-all duration-150 ${
                    userStatus === opt.value
                      ? darkMode ? 'bg-slate-800' : 'bg-slate-50 ring-1 ring-slate-200'
                      : darkMode ? 'hover:bg-slate-800/60' : 'hover:bg-slate-50'
                  }`}
                >
                  <span className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${opt.dot}`} />
                  <div className="flex-1 text-left">
                    <p className={`text-sm font-semibold ${opt.text}`}>{opt.label}</p>
                    <p className={`text-xs ${darkMode ? 'text-slate-600' : 'text-slate-400'}`}>{opt.desc}</p>
                  </div>
                  {userStatus === opt.value && (
                    <svg className="w-4 h-4 text-blue-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </button>
              ))}
            </div>
          </SettingCard>

          {/* Appearance */}
          <SettingCard title="Appearance" darkMode={darkMode}>
            <button type="button" onClick={onToggleDarkMode} className="w-full flex items-center justify-between px-5 py-4">
              <div className="flex items-center gap-3">
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${darkMode ? 'bg-indigo-500/15' : 'bg-amber-100'}`}>
                  {darkMode
                    ? <svg className="w-5 h-5 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" /></svg>
                    : <svg className="w-5 h-5 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
                  }
                </div>
                <div className="text-left">
                  <p className={`text-sm font-semibold ${darkMode ? 'text-white' : 'text-slate-900'}`}>Dark Mode</p>
                  <p className={`text-xs ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>{darkMode ? 'Using dark theme' : 'Using light theme'}</p>
                </div>
              </div>
              <Toggle on={darkMode} />
            </button>
          </SettingCard>

          {/* Notifications */}
          <SettingCard title="Notifications" darkMode={darkMode}>
            <div className={`divide-y ${darkMode ? 'divide-slate-800' : 'divide-slate-50'}`}>
              {[
                { label: 'Push Notifications', desc: 'Receive alerts for new messages', on: notifications, set: setNotifications, icon: (
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" /></svg>
                )},
                { label: 'Message Sounds', desc: 'Play sound for incoming messages', on: soundEnabled, set: setSoundEnabled, icon: (
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M15.536 8.464a5 5 0 010 7.072M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" /></svg>
                )},
              ].map(({ label, desc, on, set, icon }) => (
                <button key={label} type="button" onClick={() => set(!on)} className="w-full flex items-center justify-between px-5 py-4">
                  <div className="flex items-center gap-3">
                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${darkMode ? 'bg-slate-800 text-slate-400' : 'bg-slate-100 text-slate-500'}`}>
                      {icon}
                    </div>
                    <div className="text-left">
                      <p className={`text-sm font-semibold ${darkMode ? 'text-white' : 'text-slate-900'}`}>{label}</p>
                      <p className={`text-xs ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>{desc}</p>
                    </div>
                  </div>
                  <Toggle on={on} />
                </button>
              ))}
            </div>
          </SettingCard>

          {/* Privacy */}
          <SettingCard title="Privacy" darkMode={darkMode}>
            <button type="button" onClick={() => setMessagePreview(!messagePreview)} className="w-full flex items-center justify-between px-5 py-4">
              <div className="flex items-center gap-3">
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${darkMode ? 'bg-slate-800 text-slate-400' : 'bg-slate-100 text-slate-500'}`}>
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                </div>
                <div className="text-left">
                  <p className={`text-sm font-semibold ${darkMode ? 'text-white' : 'text-slate-900'}`}>Message Preview</p>
                  <p className={`text-xs ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>Show message content in notifications</p>
                </div>
              </div>
              <Toggle on={messagePreview} />
            </button>
          </SettingCard>

          {/* Change Password */}
          <SettingCard title="Change Password" darkMode={darkMode}>
            <div className="px-5 py-4 space-y-3">
              <input
                type="password"
                placeholder="Current password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                className={inputClass}
              />
              <input
                type="password"
                placeholder="New password (min 8 characters)"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className={inputClass}
              />
              <input
                type="password"
                placeholder="Confirm new password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className={inputClass}
              />
              {pwStatus && (
                <div className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium ${
                  pwStatus.type === 'success'
                    ? darkMode ? 'bg-emerald-500/10 text-emerald-400' : 'bg-emerald-50 text-emerald-600'
                    : darkMode ? 'bg-rose-500/10 text-rose-400' : 'bg-rose-50 text-rose-600'
                }`}>
                  {pwStatus.type === 'success' ? (
                    <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                  ) : (
                    <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                  )}
                  {pwStatus.msg}
                </div>
              )}
              <button
                type="button"
                onClick={handleChangePassword}
                disabled={pwLoading}
                className="w-full rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-semibold py-2.5 transition-colors"
              >
                {pwLoading ? 'Updating...' : 'Update Password'}
              </button>
            </div>
          </SettingCard>

          {/* Change Username */}
          <SettingCard title="Change Username" darkMode={darkMode}>
            <div className="px-5 py-4 space-y-3">
              <div className={`text-xs px-1 ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>
                Current: <span className="font-semibold">{profile.username}</span>
              </div>
              <input
                type="text"
                placeholder="New username"
                value={newUsername}
                onChange={(e) => setNewUsername(e.target.value)}
                className={inputClass}
              />
              {unStatus && (
                <div className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium ${
                  unStatus.type === 'success'
                    ? darkMode ? 'bg-emerald-500/10 text-emerald-400' : 'bg-emerald-50 text-emerald-600'
                    : darkMode ? 'bg-rose-500/10 text-rose-400' : 'bg-rose-50 text-rose-600'
                }`}>
                  {unStatus.type === 'success' ? (
                    <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                  ) : (
                    <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                  )}
                  {unStatus.msg}
                </div>
              )}
              <button
                type="button"
                onClick={handleChangeUsername}
                disabled={unLoading}
                className="w-full rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-semibold py-2.5 transition-colors"
              >
                {unLoading ? 'Updating...' : 'Update Username'}
              </button>
            </div>
          </SettingCard>

          {/* Account / Sign out */}
          <SettingCard title="Account" darkMode={darkMode}>
            <div className="px-4 py-3">
              <button
                type="button"
                onClick={handleSignOut}
                className={`w-full flex items-center gap-3 px-3 py-3 rounded-xl transition-colors ${
                  darkMode ? 'hover:bg-rose-500/8' : 'hover:bg-rose-50'
                }`}
              >
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${darkMode ? 'bg-rose-500/10' : 'bg-rose-50'}`}>
                  <svg className="w-5 h-5 text-rose-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                  </svg>
                </div>
                <div className="text-left">
                  <p className="text-sm font-semibold text-rose-500">Sign Out</p>
                  <p className={`text-xs ${darkMode ? 'text-slate-600' : 'text-slate-400'}`}>End your session</p>
                </div>
              </button>
            </div>
          </SettingCard>

          <p className={`text-center text-[11px] py-2 ${darkMode ? 'text-slate-700' : 'text-slate-300'}`}>
            IMCS v1.0 · Internal Messaging &amp; Calling Software
          </p>
        </div>
      </div>
    </div>
  );
}

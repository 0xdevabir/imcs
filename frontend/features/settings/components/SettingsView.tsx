'use client';

import React, { useState } from 'react';
import { authFetch, clearAuthTokenCookie } from '@/lib/config';
import { UserStatus } from '@/features/chat/types';

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

const STATUS_OPTIONS: { value: UserStatus; label: string; desc: string; dot: string; ring: string }[] = [
  { value: 'available', label: 'Available',      desc: 'Visible and receiving messages', dot: 'bg-emerald-500', ring: 'ring-emerald-500/30' },
  { value: 'dnd',       label: 'Do Not Disturb', desc: 'Mute all notifications',         dot: 'bg-rose-500',    ring: 'ring-rose-500/30' },
  { value: 'invisible', label: 'Invisible',       desc: 'Appear offline to others',       dot: 'bg-slate-400',   ring: 'ring-slate-500/30' },
];

const AVATAR_GRADIENTS = [
  'from-blue-500 to-indigo-600', 'from-violet-500 to-purple-600',
  'from-emerald-500 to-teal-600', 'from-rose-500 to-pink-600',
  'from-amber-500 to-orange-600', 'from-cyan-500 to-sky-600',
  'from-fuchsia-500 to-violet-600',
];
function avatarGradient(name: string): string {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = name.charCodeAt(i) + ((h << 5) - h);
  return AVATAR_GRADIENTS[Math.abs(h) % AVATAR_GRADIENTS.length];
}

function Toggle({ on, onToggle }: { on: boolean; onToggle: () => void }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className={`relative flex-shrink-0 w-11 h-6 rounded-full transition-colors duration-200 focus:outline-none ${on ? 'bg-[#00a884]' : 'bg-slate-600/60'}`}
    >
      <span className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-transform duration-200 ${on ? 'translate-x-6' : 'translate-x-1'}`} />
    </button>
  );
}

function SettingRow({
  label, desc, darkMode, right,
}: { label: string; desc: string; darkMode: boolean; right: React.ReactNode }) {
  return (
    <div className={`flex items-center justify-between gap-4 px-5 py-4 border-b last:border-0 ${darkMode ? 'border-white/5' : 'border-slate-50'}`}>
      <div>
        <p className={`text-sm font-semibold ${darkMode ? 'text-[#e9edef]' : 'text-[#111b21]'}`}>{label}</p>
        <p className={`text-xs mt-0.5 ${darkMode ? 'text-[#8696a0]' : 'text-[#667781]'}`}>{desc}</p>
      </div>
      {right}
    </div>
  );
}

function SectionCard({
  icon, title, subtitle, darkMode, children, className = '',
}: { icon: React.ReactNode; title: string; subtitle: string; darkMode: boolean; children: React.ReactNode; className?: string }) {
  return (
    <div className={`rounded-2xl overflow-hidden border ${darkMode ? 'bg-[#202c33] border-white/5' : 'bg-white border-slate-200 shadow-sm'} ${className}`}>
      <div className={`flex items-center gap-3 px-5 py-4 border-b ${darkMode ? 'border-white/5' : 'border-slate-100'}`}>
        <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${darkMode ? 'bg-white/5 text-[#8696a0]' : 'bg-slate-100 text-slate-500'}`}>
          {icon}
        </div>
        <div>
          <p className={`text-sm font-bold leading-tight ${darkMode ? 'text-[#e9edef]' : 'text-[#111b21]'}`}>{title}</p>
          <p className={`text-xs ${darkMode ? 'text-[#8696a0]' : 'text-[#667781]'}`}>{subtitle}</p>
        </div>
      </div>
      {children}
    </div>
  );
}

export function SettingsView({
  darkMode, onToggleDarkMode, onBack, profile, userStatus, onStatusChange, onUsernameChange, apiUrl,
}: SettingsViewProps) {
  const [notifications, setNotifications] = useState(true);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [messagePreview, setMessagePreview] = useState(true);

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [pwStatus, setPwStatus] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);
  const [pwLoading, setPwLoading] = useState(false);
  const [showPwForm, setShowPwForm] = useState(false);

  const [newUsername, setNewUsername] = useState('');
  const [unStatus, setUnStatus] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);
  const [unLoading, setUnLoading] = useState(false);
  const [showUnForm, setShowUnForm] = useState(false);

  const grad = avatarGradient(profile.username);

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
    } catch { setUnStatus({ type: 'error', msg: 'Network error. Please try again.' }); }
    finally { setUnLoading(false); }
  };

  const handleChangePassword = async () => {
    if (!newPassword || !currentPassword) { setPwStatus({ type: 'error', msg: 'All fields are required.' }); return; }
    if (newPassword !== confirmPassword) { setPwStatus({ type: 'error', msg: 'Passwords do not match.' }); return; }
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
    } catch { setPwStatus({ type: 'error', msg: 'Network error. Please try again.' }); }
    finally { setPwLoading(false); }
  };

  const handleSignOut = async () => {
    await authFetch(`${apiUrl}/auth/logout`, { method: 'POST' }).catch(() => undefined);
    clearAuthTokenCookie();
    window.location.href = '/login';
  };

  const inputCls = `w-full rounded-xl border px-4 py-2.5 text-sm outline-none transition-all ${
    darkMode
      ? 'border-white/8 bg-[#111b21] text-[#e9edef] placeholder:text-[#8696a0] focus:border-[#00a884]/50 focus:ring-2 focus:ring-[#00a884]/10'
      : 'border-slate-200 bg-slate-50 text-slate-900 placeholder:text-slate-400 focus:border-[#00a884]/50 focus:ring-2 focus:ring-[#00a884]/10'
  }`;

  const StatusDot = ({ value }: { value: UserStatus }) => {
    const opt = STATUS_OPTIONS.find(o => o.value === value);
    return <span className={`w-2 h-2 rounded-full flex-shrink-0 ${opt?.dot ?? 'bg-slate-400'}`} />;
  };

  return (
    <div className={`h-full flex flex-col ${darkMode ? 'bg-[#111b21]' : 'bg-[#f0f2f5]'}`}>

      {/* ── Header ─────────────────────────────────────────────────── */}
      <div className={`flex items-center justify-between px-6 py-4 border-b flex-shrink-0 ${
        darkMode ? 'border-white/5 bg-[#202c33]' : 'border-slate-200 bg-white'
      }`}>
        <div className="flex items-center gap-3">
          <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${darkMode ? 'bg-[#00a884]/15' : 'bg-[#00a884]/10'}`}>
            <svg className="w-5 h-5 text-[#00a884]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </div>
          <div>
            <h1 className={`text-base font-bold leading-tight ${darkMode ? 'text-[#e9edef]' : 'text-[#111b21]'}`}>Settings</h1>
            <p className={`text-xs ${darkMode ? 'text-[#8696a0]' : 'text-[#667781]'}`}>Manage your account preferences</p>
          </div>
        </div>
        <button
          type="button"
          onClick={onBack}
          className={`w-8 h-8 flex items-center justify-center rounded-full transition-colors ${
            darkMode ? 'text-[#8696a0] hover:bg-white/8 hover:text-[#e9edef]' : 'text-[#667781] hover:bg-slate-100 hover:text-slate-900'
          }`}
          title="Close"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* ── Info strip ─────────────────────────────────────────────── */}
      <div className={`flex items-center gap-3 px-6 py-3 border-b ${darkMode ? 'border-white/5 bg-[#0b141a]' : 'border-slate-200 bg-slate-50'}`}>
        <div className={`flex items-center gap-2 flex-1 rounded-xl px-4 py-2 ${darkMode ? 'bg-[#202c33]' : 'bg-white border border-slate-200'}`}>
          <div className={`w-1.5 h-1.5 rounded-full ${darkMode ? 'bg-[#00a884]' : 'bg-[#00a884]'} flex-shrink-0`} />
          <p className={`text-xs ${darkMode ? 'text-[#8696a0]' : 'text-[#667781]'}`}>
            Signed in as <span className={`font-semibold ${darkMode ? 'text-[#e9edef]' : 'text-[#111b21]'}`}>{profile.username}</span>
          </p>
        </div>
        <div className={`flex items-center gap-2 rounded-xl px-4 py-2 ${darkMode ? 'bg-[#202c33]' : 'bg-white border border-slate-200'}`}>
          <StatusDot value={userStatus} />
          <p className={`text-xs ${darkMode ? 'text-[#8696a0]' : 'text-[#667781]'}`}>
            {STATUS_OPTIONS.find(o => o.value === userStatus)?.label ?? 'Available'}
          </p>
        </div>
      </div>

      {/* ── Scrollable body ────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto">
        <div className="p-5 grid grid-cols-1 lg:grid-cols-2 gap-4">

          {/* ── Appearance ──────────────────────────────────────────── */}
          <SectionCard
            darkMode={darkMode}
            icon={
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
              </svg>
            }
            title="Appearance"
            subtitle="Choose your preferred theme"
          >
            <div className="p-4 grid grid-cols-2 gap-3">
              {/* Dark theme card */}
              <button
                type="button"
                onClick={() => { if (!darkMode) onToggleDarkMode(); }}
                className={`rounded-xl overflow-hidden border-2 transition-all duration-150 text-left ${
                  darkMode
                    ? 'border-[#00a884] ring-2 ring-[#00a884]/20'
                    : 'border-transparent hover:border-[#8696a0]/40'
                }`}
              >
                {/* Mini dark preview */}
                <div className="bg-[#111b21] px-3 pt-3 pb-2">
                  <div className="bg-[#202c33] rounded-lg px-2.5 py-2 mb-1.5 space-y-1.5">
                    <div className="flex items-center gap-1.5">
                      <div className="w-4 h-4 rounded-full bg-[#2a3942]" />
                      <div className="h-1.5 w-14 rounded-full bg-[#2a3942]" />
                    </div>
                    <div className="h-1.5 w-10 rounded-full bg-[#00a884]/60 ml-5" />
                  </div>
                  <div className="flex justify-end">
                    <div className="h-4 w-16 rounded-lg bg-[#005c4b]" />
                  </div>
                  <div className="flex justify-start mt-1">
                    <div className="h-4 w-14 rounded-lg bg-[#202c33]" />
                  </div>
                </div>
                <div className={`px-3 pb-3 pt-2 ${darkMode ? 'bg-[#202c33]' : 'bg-slate-800'}`}>
                  <p className="text-[11px] font-bold text-white leading-tight">Dark</p>
                  <p className="text-[10px] text-[#8696a0]">Easy on eyes</p>
                </div>
              </button>

              {/* Light theme card */}
              <button
                type="button"
                onClick={() => { if (darkMode) onToggleDarkMode(); }}
                className={`rounded-xl overflow-hidden border-2 transition-all duration-150 text-left ${
                  !darkMode
                    ? 'border-[#00a884] ring-2 ring-[#00a884]/20'
                    : 'border-transparent hover:border-[#8696a0]/40'
                }`}
              >
                {/* Mini light preview */}
                <div className="bg-[#efeae2] px-3 pt-3 pb-2">
                  <div className="bg-white rounded-lg px-2.5 py-2 mb-1.5 space-y-1.5">
                    <div className="flex items-center gap-1.5">
                      <div className="w-4 h-4 rounded-full bg-slate-200" />
                      <div className="h-1.5 w-14 rounded-full bg-slate-200" />
                    </div>
                    <div className="h-1.5 w-10 rounded-full bg-[#00a884]/50 ml-5" />
                  </div>
                  <div className="flex justify-end">
                    <div className="h-4 w-16 rounded-lg bg-[#d9fdd3]" />
                  </div>
                  <div className="flex justify-start mt-1">
                    <div className="h-4 w-14 rounded-lg bg-white" />
                  </div>
                </div>
                <div className={`px-3 pb-3 pt-2 ${!darkMode ? 'bg-[#f0f2f5]' : 'bg-[#f0f2f5]'}`}>
                  <p className="text-[11px] font-bold text-[#111b21] leading-tight">Light</p>
                  <p className="text-[10px] text-[#667781]">Clean and bright</p>
                </div>
              </button>
            </div>
          </SectionCard>

          {/* ── Status ──────────────────────────────────────────────── */}
          <SectionCard
            darkMode={darkMode}
            icon={
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5.636 18.364a9 9 0 010-12.728m12.728 0a9 9 0 010 12.728M12 12h.01" />
              </svg>
            }
            title="Status"
            subtitle="How others see your availability"
          >
            <div className="p-2">
              {STATUS_OPTIONS.map((opt) => {
                const isActive = userStatus === opt.value;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => onStatusChange(opt.value)}
                    className={`w-full flex items-center gap-3 px-3 py-3 rounded-xl transition-all duration-150 ${
                      isActive
                        ? darkMode
                          ? `bg-[#2a3942] ring-1 ${opt.ring}`
                          : `bg-slate-50 ring-1 ${opt.ring}`
                        : darkMode ? 'hover:bg-white/5' : 'hover:bg-slate-50'
                    }`}
                  >
                    <span className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${opt.dot}`} />
                    <div className="flex-1 text-left">
                      <p className={`text-sm font-semibold ${darkMode ? 'text-[#e9edef]' : 'text-[#111b21]'}`}>{opt.label}</p>
                      <p className={`text-xs ${darkMode ? 'text-[#8696a0]' : 'text-[#667781]'}`}>{opt.desc}</p>
                    </div>
                    {isActive && (
                      <svg className="w-4 h-4 text-[#00a884] flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </button>
                );
              })}
            </div>
          </SectionCard>

          {/* ── Notifications ───────────────────────────────────────── */}
          <SectionCard
            darkMode={darkMode}
            icon={
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
              </svg>
            }
            title="Notifications"
            subtitle="Alerts and sound preferences"
          >
            <SettingRow
              label="Push Notifications"
              desc="Receive alerts for new messages"
              darkMode={darkMode}
              right={<Toggle on={notifications} onToggle={() => setNotifications(!notifications)} />}
            />
            <SettingRow
              label="Message Sounds"
              desc="Play sound for incoming messages"
              darkMode={darkMode}
              right={<Toggle on={soundEnabled} onToggle={() => setSoundEnabled(!soundEnabled)} />}
            />
          </SectionCard>

          {/* ── Privacy ─────────────────────────────────────────────── */}
          <SectionCard
            darkMode={darkMode}
            icon={
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            }
            title="Privacy"
            subtitle="Message visibility and read receipts"
          >
            <SettingRow
              label="Message Preview"
              desc="Show content in notifications"
              darkMode={darkMode}
              right={<Toggle on={messagePreview} onToggle={() => setMessagePreview(!messagePreview)} />}
            />
            <div className={`flex items-center justify-between gap-4 px-5 py-4 ${darkMode ? '' : ''}`}>
              <div>
                <p className={`text-sm font-semibold ${darkMode ? 'text-[#e9edef]' : 'text-[#111b21]'}`}>End-to-End Encryption</p>
                <p className={`text-xs mt-0.5 ${darkMode ? 'text-[#8696a0]' : 'text-[#667781]'}`}>All messages and calls are encrypted</p>
              </div>
              <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-bold flex-shrink-0 ${
                darkMode ? 'bg-emerald-500/10 text-emerald-400' : 'bg-emerald-50 text-emerald-600'
              }`}>
                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
                Active
              </span>
            </div>
          </SectionCard>

          {/* ── Account ─────────────────────────────────────────────── */}
          <SectionCard
            darkMode={darkMode}
            icon={
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            }
            title="Account"
            subtitle="Manage your username and profile"
          >
            <div className="px-5 py-4">
              <div className="flex items-center gap-3 mb-4">
                <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${grad} flex items-center justify-center text-sm font-black text-white flex-shrink-0`}>
                  {profile.username.charAt(0).toUpperCase()}
                </div>
                <div>
                  <p className={`text-sm font-bold ${darkMode ? 'text-[#e9edef]' : 'text-[#111b21]'}`}>{profile.username}</p>
                  <p className={`text-xs ${darkMode ? 'text-[#8696a0]' : 'text-[#667781]'}`}>
                    {profile.role === 'admin' ? 'Administrator' : 'Standard User'} · ID #{profile.userId}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowUnForm(!showUnForm)}
                  className={`ml-auto text-xs px-3 py-1.5 rounded-lg font-semibold transition-colors ${
                    darkMode
                      ? 'bg-white/8 text-[#e9edef] hover:bg-white/12'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  Change
                </button>
              </div>
              {showUnForm && (
                <div className="space-y-2">
                  <input
                    type="text"
                    placeholder="New username"
                    value={newUsername}
                    onChange={(e) => setNewUsername(e.target.value)}
                    className={inputCls}
                  />
                  {unStatus && (
                    <p className={`text-xs px-1 ${unStatus.type === 'success' ? 'text-emerald-500' : 'text-rose-500'}`}>{unStatus.msg}</p>
                  )}
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={handleChangeUsername}
                      disabled={unLoading}
                      className="flex-1 rounded-xl bg-[#00a884] hover:bg-[#02c197] disabled:opacity-50 text-white text-sm font-semibold py-2 transition-colors"
                    >
                      {unLoading ? 'Saving…' : 'Save'}
                    </button>
                    <button
                      type="button"
                      onClick={() => { setShowUnForm(false); setNewUsername(''); setUnStatus(null); }}
                      className={`px-4 rounded-xl text-sm font-semibold transition-colors ${
                        darkMode ? 'bg-white/8 text-[#8696a0] hover:bg-white/12' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                      }`}
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>
          </SectionCard>

          {/* ── Security ────────────────────────────────────────────── */}
          <SectionCard
            darkMode={darkMode}
            icon={
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
            }
            title="Security"
            subtitle="Password and session management"
          >
            <div className="px-5 py-4">
              {/* Change Password toggle row */}
              <div className={`flex items-center justify-between mb-${showPwForm ? '3' : '0'}`}>
                <div>
                  <p className={`text-sm font-semibold ${darkMode ? 'text-[#e9edef]' : 'text-[#111b21]'}`}>Change Password</p>
                  <p className={`text-xs ${darkMode ? 'text-[#8696a0]' : 'text-[#667781]'}`}>Update your login credentials</p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowPwForm(!showPwForm)}
                  className={`text-xs px-3 py-1.5 rounded-lg font-semibold transition-colors ${
                    darkMode
                      ? 'bg-white/8 text-[#e9edef] hover:bg-white/12'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  {showPwForm ? 'Cancel' : 'Update'}
                </button>
              </div>

              {showPwForm && (
                <div className="mt-3 space-y-2">
                  <input type="password" placeholder="Current password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} className={inputCls} />
                  <input type="password" placeholder="New password (min 8 chars)" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} className={inputCls} />
                  <input type="password" placeholder="Confirm new password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} className={inputCls} />
                  {pwStatus && (
                    <p className={`text-xs px-1 ${pwStatus.type === 'success' ? 'text-emerald-500' : 'text-rose-500'}`}>{pwStatus.msg}</p>
                  )}
                  <button
                    type="button"
                    onClick={handleChangePassword}
                    disabled={pwLoading}
                    className="w-full rounded-xl bg-[#00a884] hover:bg-[#02c197] disabled:opacity-50 text-white text-sm font-semibold py-2.5 transition-colors"
                  >
                    {pwLoading ? 'Updating…' : 'Update Password'}
                  </button>
                </div>
              )}
            </div>

            {/* Sensitive actions */}
            <div className={`mx-4 mb-4 rounded-xl px-4 py-3 border ${darkMode ? 'border-rose-500/20 bg-rose-500/5' : 'border-rose-200 bg-rose-50/50'}`}>
              <p className="text-xs font-bold text-rose-500 mb-2">Sensitive actions</p>
              <p className={`text-[11px] mb-3 ${darkMode ? 'text-[#8696a0]' : 'text-[#667781]'}`}>These actions cannot be undone easily.</p>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={handleSignOut}
                  className="flex-1 text-xs font-semibold py-1.5 rounded-lg border border-rose-500/50 text-rose-500 hover:bg-rose-500/10 transition-colors"
                >
                  Sign Out
                </button>
              </div>
            </div>
          </SectionCard>

        </div>

        {/* Footer */}
        <p className={`text-center text-[11px] pb-6 ${darkMode ? 'text-[#2a3942]' : 'text-slate-300'}`}>
          IMCS v1.0 · Internal Messaging &amp; Calling Software
        </p>
      </div>
    </div>
  );
}

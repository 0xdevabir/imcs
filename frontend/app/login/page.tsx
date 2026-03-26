'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

const MOCK_USERS = [
  { userId: 1, username: 'ABIR',    role: 'admin' },
  { userId: 2, username: 'RAYAT',   role: 'member' },
  { userId: 3, username: 'ZION',    role: 'member' },
  { userId: 4, username: 'MEHERAZ', role: 'member' },
  { userId: 5, username: 'NISHAK',  role: 'member' },
  { userId: 6, username: 'SAYED',   role: 'member' },
  { userId: 7, username: 'RAKIB',   role: 'member' },
  { userId: 8, username: 'ZAFOR',   role: 'member' },
  { userId: 9, username: 'SHAFIN',  role: 'member' },
  { userId: 10, username: 'ZOHIR',  role: 'member' },
] as const;

const AVATAR_GRADIENTS = [
  'from-blue-500 to-indigo-600',
  'from-violet-500 to-purple-600',
  'from-emerald-500 to-teal-600',
  'from-rose-500 to-pink-600',
  'from-amber-500 to-orange-600',
  'from-cyan-500 to-sky-600',
  'from-fuchsia-500 to-violet-600',
  'from-orange-500 to-red-600',
  'from-teal-500 to-cyan-600',
  'from-pink-500 to-rose-600',
];

function avatarGradient(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return AVATAR_GRADIENTS[Math.abs(hash) % AVATAR_GRADIENTS.length];
}

export default function LoginPage() {
  const router = useRouter();
  const [loadingId, setLoadingId] = useState<number | null>(null);
  const [search, setSearch] = useState('');

  const filteredUsers = MOCK_USERS.filter((u) =>
    u.username.toLowerCase().includes(search.toLowerCase())
  );

  const handleSelect = (user: (typeof MOCK_USERS)[number]) => {
    if (loadingId !== null) return;
    setLoadingId(user.userId);
    localStorage.setItem('mockUser', JSON.stringify({ userId: user.userId, username: user.username, role: user.role }));
    // Small delay for UX feedback
    setTimeout(() => router.push('/chat'), 600);
  };

  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-4 py-10 bg-slate-50 dark:bg-slate-950">
      {/* Header */}
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

      {/* Search */}
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

      {/* User grid */}
      <div className="w-full max-w-2xl grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
        {filteredUsers.map((user) => {
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
              {/* Avatar */}
              <div className="relative">
                {/* Glow */}
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
                {/* Admin crown */}
                {user.role === 'admin' && (
                  <div className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-amber-400 flex items-center justify-center shadow-sm">
                    <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M2.5 7.5L5 14.5h14l2.5-7-4.5 3-5-6-5 6-4.5-3z" />
                    </svg>
                  </div>
                )}
              </div>

              {/* Name */}
              <div className="text-center">
                <p className="text-xs font-bold tracking-wide text-slate-800 dark:text-slate-100">
                  {user.username}
                </p>
                {user.role === 'admin' && (
                  <p className="text-[10px] text-amber-500 font-semibold mt-0.5">Admin</p>
                )}
              </div>

              {/* Hover enter indicator */}
              {!isLoading && !isDisabled && (
                <div className="absolute inset-0 rounded-2xl border-2 border-blue-500/0 group-hover:border-blue-500/20 transition-all duration-200 pointer-events-none" />
              )}
            </button>
          );
        })}

        {filteredUsers.length === 0 && (
          <div className="col-span-full text-center py-12 text-sm text-slate-400 dark:text-slate-500">
            No users match &ldquo;{search}&rdquo;
          </div>
        )}
      </div>

      {/* Footer note */}
      <p className="mt-10 text-xs text-slate-400 dark:text-slate-600 text-center">
        Prototype mode &mdash; no password required
      </p>
    </main>
  );
}

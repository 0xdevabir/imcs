import { Profile } from '@/features/chat/types';

interface ProfileViewProps {
  profile: Profile;
  darkMode: boolean;
  onOpenSettings: () => void;
}

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

export function ProfileView({ profile, darkMode, onOpenSettings }: ProfileViewProps) {
  const grad = avatarGradient(profile.username);
  const isAdmin = profile.role === 'admin';

  return (
    <div className={`h-full flex flex-col ${darkMode ? 'bg-[#111b21]' : 'bg-[#f0f2f5]'}`}>
      {/* Header */}
      <div className={`flex items-center px-4 py-4 border-b flex-shrink-0 ${
        darkMode ? 'border-white/5 bg-[#202c33]' : 'border-slate-200 bg-[#f0f2f5]'
      }`}>
        <h2 className={`text-xl font-bold tracking-tight ${darkMode ? 'text-[#e9edef]' : 'text-[#111b21]'}`}>Profile</h2>
      </div>
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-md mx-auto px-5 py-6">

          {/* Hero avatar area */}
          <div className="text-center mb-8">
            <div className="relative inline-block mb-5">
              {/* Glow ring */}
              <div className={`absolute inset-0 rounded-3xl bg-gradient-to-br ${grad} blur-xl opacity-30 scale-110`} />
              <div className={`relative w-28 h-28 rounded-3xl bg-gradient-to-br ${grad} flex items-center justify-center text-4xl font-black text-white shadow-2xl`}>
                {profile.username.charAt(0).toUpperCase()}
              </div>
            </div>
            <h1 className={`text-2xl font-black tracking-tight ${darkMode ? 'text-white' : 'text-slate-900'}`}>
              {profile.username}
            </h1>
            <div className="flex items-center justify-center gap-2 mt-2">
              <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold ${
                isAdmin
                  ? darkMode ? 'bg-amber-500/15 text-amber-400 ring-1 ring-amber-500/30' : 'bg-amber-50 text-amber-700 ring-1 ring-amber-200'
                  : darkMode ? 'bg-slate-800 text-slate-400 ring-1 ring-slate-700' : 'bg-slate-100 text-slate-600'
              }`}>
                {isAdmin ? (
                  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                  </svg>
                ) : null}
                {isAdmin ? 'Administrator' : 'Member'}
              </span>

              <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold ${
                darkMode ? 'bg-emerald-500/10 text-emerald-400' : 'bg-emerald-50 text-emerald-600'
              }`}>
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Active
              </span>
            </div>
          </div>

          {/* Account info card */}
          <div className={`rounded-2xl overflow-hidden mb-4 ${
            darkMode ? 'bg-[#202c33]' : 'bg-white shadow-sm'
          }`}>
            <div className={`px-5 py-3 border-b ${darkMode ? 'border-white/5' : 'border-slate-50'}`}>
              <p className={`text-[11px] font-bold uppercase tracking-widest ${darkMode ? 'text-[#8696a0]' : 'text-slate-400'}`}>
                Account Details
              </p>
            </div>
            <div className={`divide-y ${darkMode ? 'divide-white/5' : 'divide-slate-50'}`}>
              {[
                {
                  icon: (
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                  ),
                  label: 'Username',
                  value: profile.username,
                },
                {
                  icon: (
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                    </svg>
                  ),
                  label: 'Account Type',
                  value: isAdmin ? 'Administrator' : 'Standard User',
                },
                {
                  icon: (
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M7 20l4-16m2 16l4-16M6 9h14M4 15h14" />
                    </svg>
                  ),
                  label: 'User ID',
                  value: `#${profile.userId}`,
                },
              ].map(({ icon, label, value }) => (
                <div key={label} className="flex items-center justify-between px-5 py-3.5">
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                      darkMode ? 'bg-[#2a3942] text-[#8696a0]' : 'bg-slate-100 text-slate-500'
                    }`}>
                      {icon}
                    </div>
                    <p className={`text-xs ${darkMode ? 'text-[#8696a0]' : 'text-slate-400'}`}>{label}</p>
                  </div>
                  <p className={`text-sm font-semibold ${darkMode ? 'text-[#e9edef]' : 'text-slate-700'}`}>{value}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Security badge */}
          <div className={`rounded-2xl px-5 py-4 mb-4 flex items-center gap-3 ${
            darkMode ? 'bg-emerald-500/8 ring-1 ring-emerald-500/20' : 'bg-emerald-50 ring-1 ring-emerald-100'
          }`}>
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${
              darkMode ? 'bg-emerald-500/15' : 'bg-emerald-100'
            }`}>
              <svg className="w-5 h-5 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
            <div>
              <p className={`text-sm font-semibold ${darkMode ? 'text-emerald-400' : 'text-emerald-700'}`}>
                End-to-End Encrypted
              </p>
              <p className={`text-xs ${darkMode ? 'text-emerald-500/70' : 'text-emerald-600/70'}`}>
                All messages and calls are encrypted
              </p>
            </div>
          </div>

          {/* Settings button */}
          <button
            type="button"
            onClick={onOpenSettings}
            className={`w-full flex items-center justify-between px-5 py-4 rounded-2xl transition-all duration-200 group ${
              darkMode
                ? 'bg-[#202c33] hover:bg-[#2a3942]'
                : 'bg-white hover:bg-slate-50 shadow-sm'
            }`}
          >
            <div className="flex items-center gap-3">
              <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${
                darkMode ? 'bg-[#00a884]/15' : 'bg-[#00a884]/10'
              }`}>
                <svg className="w-5 h-5 text-[#00a884]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </div>
              <div className="text-left">
                <p className={`text-sm font-semibold ${darkMode ? 'text-[#e9edef]' : 'text-[#111b21]'}`}>Settings</p>
                <p className={`text-xs ${darkMode ? 'text-[#8696a0]' : 'text-[#667781]'}`}>Theme, status, privacy, password</p>
              </div>
            </div>
            <svg className={`w-4 h-4 transition-transform group-hover:translate-x-0.5 ${darkMode ? 'text-slate-600' : 'text-slate-400'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}

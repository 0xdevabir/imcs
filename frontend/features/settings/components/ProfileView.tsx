import { Profile } from '@/features/chat/types';
import { avatarGradient } from '@/lib/avatar';
import Link from 'next/link';
import Image from 'next/image';
import { useRef, useState, useCallback } from 'react';

interface ProfileViewProps {
  profile: Profile;
  darkMode: boolean;
  onOpenSettings: () => void;
  onLogout: () => void;
  onProfilePictureChange?: (newProfilePicture: string | null) => void;
}

export function ProfileView({ profile, darkMode, onOpenSettings, onLogout, onProfilePictureChange }: ProfileViewProps) {
  const grad = avatarGradient(profile.username);
  const isAdmin = profile.role === 'admin';
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [isHovering, setIsHovering] = useState(false);

  const handleFileSelect = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      setUploadError('Only JPEG, PNG, GIF, or WebP images are allowed');
      return;
    }

    // Validate file size (5MB max)
    if (file.size > 5 * 1024 * 1024) {
      setUploadError('Image must be smaller than 5MB');
      return;
    }

    setIsUploading(true);
    setUploadError(null);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3001';
      const response = await fetch(`${backendUrl}/users/me/profile-picture`, {
        method: 'PATCH',
        body: formData,
        credentials: 'include',
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || 'Failed to upload profile picture');
      }

      const data = await response.json();
      onProfilePictureChange?.(data.profilePicture);
    } catch (error) {
      console.error('Failed to upload profile picture:', error);
      setUploadError(error instanceof Error ? error.message : 'Failed to upload profile picture');
    } finally {
      setIsUploading(false);
      // Reset file input so same file can be selected again
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  }, [onProfilePictureChange]);

  const handleRemoveProfilePicture = useCallback(async () => {
    if (!profile.profilePicture) return;

    setIsUploading(true);
    setUploadError(null);

    try {
      const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3001';
      const response = await fetch(`${backendUrl}/users/me/profile-picture`, {
        method: 'DELETE',
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Failed to remove profile picture');
      }

      onProfilePictureChange?.(null);
    } catch (error) {
      console.error('Failed to remove profile picture:', error);
      setUploadError('Failed to remove profile picture');
    } finally {
      setIsUploading(false);
    }
  }, [profile.profilePicture, onProfilePictureChange]);

  const handleAvatarClick = () => {
    fileInputRef.current?.click();
  };

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
              {/* Hidden file input */}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/jpg,image/png,image/gif,image/webp"
                onChange={handleFileSelect}
                className="hidden"
                aria-label="Upload profile picture"
              />
              {/* Glow ring */}
              <div className={`absolute inset-0 rounded-3xl bg-gradient-to-br ${grad} blur-xl opacity-30 scale-110`} />
              {/* Avatar container with hover overlay */}
              <button
                type="button"
                onClick={handleAvatarClick}
                onMouseEnter={() => setIsHovering(true)}
                onMouseLeave={() => setIsHovering(false)}
                disabled={isUploading}
                className="relative w-28 h-28 rounded-3xl overflow-hidden shadow-2xl cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#00a884] focus:ring-offset-2 disabled:cursor-wait"
                aria-label="Change profile picture"
              >
                {profile.profilePicture ? (
                  <Image
                    src={profile.profilePicture}
                    alt={profile.username}
                    fill
                    className="object-cover"
                    sizes="112px"
                    unoptimized
                  />
                ) : (
                  <div className={`w-full h-full bg-gradient-to-br ${grad} flex items-center justify-center text-4xl font-black text-white`}>
                    {profile.username.charAt(0).toUpperCase()}
                  </div>
                )}
                {/* Hover overlay */}
                <div className={`absolute inset-0 bg-black/60 flex flex-col items-center justify-center transition-opacity duration-200 ${
                  isHovering && !isUploading ? 'opacity-100' : 'opacity-0'
                }`}>
                  <svg className="w-6 h-6 text-white mb-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  <span className="text-xs text-white font-medium">Change</span>
                </div>
                {/* Uploading spinner overlay */}
                {isUploading && (
                  <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                    <svg className="w-8 h-8 text-white animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                  </div>
                )}
              </button>
              {/* Remove button (only show if there's a profile picture) */}
              {profile.profilePicture && !isUploading && (
                <button
                  type="button"
                  onClick={handleRemoveProfilePicture}
                  className={`absolute -bottom-1 -right-1 w-7 h-7 rounded-full flex items-center justify-center transition-colors ${
                    darkMode
                      ? 'bg-rose-500/90 hover:bg-rose-500 text-white'
                      : 'bg-rose-500 hover:bg-rose-600 text-white'
                  } shadow-lg`}
                  aria-label="Remove profile picture"
                >
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}
            </div>
            {/* Upload error message */}
            {uploadError && (
              <p className="text-xs text-rose-500 mb-2">{uploadError}</p>
            )}
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
            className={`w-full flex items-center justify-between px-5 py-4 rounded-2xl transition-all duration-200 group mb-3 ${
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

          {isAdmin && (
            <Link
              href="/admin"
              className={`w-full flex items-center justify-between px-5 py-4 rounded-2xl transition-all duration-200 group mb-3 ${
                darkMode
                  ? 'bg-[#202c33] hover:bg-[#2a3942]'
                  : 'bg-white hover:bg-slate-50 shadow-sm'
              }`}
            >
              <div className="flex items-center gap-3">
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${
                  darkMode ? 'bg-violet-500/15' : 'bg-violet-100'
                }`}>
                  <svg className="w-5 h-5 text-violet-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                  </svg>
                </div>
                <div className="text-left">
                  <p className={`text-sm font-semibold ${darkMode ? 'text-[#e9edef]' : 'text-[#111b21]'}`}>Admin Panel</p>
                  <p className={`text-xs ${darkMode ? 'text-[#8696a0]' : 'text-[#667781]'}`}>Manage users and rules</p>
                </div>
              </div>
              <svg className={`w-4 h-4 transition-transform group-hover:translate-x-0.5 ${darkMode ? 'text-slate-600' : 'text-slate-400'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
            </Link>
          )}

          {/* Logout button */}
          <button
            type="button"
            onClick={onLogout}
            className={`w-full rounded-2xl px-5 py-4 text-sm font-semibold transition-colors border ${
              darkMode
                ? 'border-rose-500/20 bg-rose-500/5 text-rose-400 hover:bg-rose-500/10'
                : 'border-rose-200 bg-rose-50 text-rose-600 hover:bg-rose-100'
            }`}
          >
            Sign Out
          </button>
        </div>
      </div>
    </div>
  );
}

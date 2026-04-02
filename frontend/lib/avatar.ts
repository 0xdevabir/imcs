export const AVATAR_GRADIENTS = [
  'from-blue-500 to-indigo-600',
  'from-violet-500 to-purple-600',
  'from-emerald-500 to-teal-600',
  'from-rose-500 to-pink-600',
  'from-amber-500 to-orange-600',
  'from-cyan-500 to-sky-600',
  'from-fuchsia-500 to-violet-600',
];

const gradientCache = new Map<string, string>();

export function avatarGradient(name: string): string {
  const cached = gradientCache.get(name);
  if (cached) return cached;
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  const result = AVATAR_GRADIENTS[Math.abs(hash) % AVATAR_GRADIENTS.length];
  gradientCache.set(name, result);
  return result;
}

export type AvatarData = {
  username: string;
  profilePicture?: string | null;
};

/**
 * Check if user has a profile picture
 */
export function hasProfilePicture(data: AvatarData): boolean {
  return !!data.profilePicture;
}

/**
 * Get profile picture URL or null
 */
export function getProfilePictureUrl(data: AvatarData): string | null {
  return data.profilePicture || null;
}

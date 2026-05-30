const USERNAME_REGEX = /^[a-zA-Z0-9_]{3,20}$/

export function normalizeUsername(username: string): string {
  return username.toLowerCase()
}

export function isValidUsername(username: string): boolean {
  return USERNAME_REGEX.test(username)
}

export function isValidProvider(provider: unknown): provider is 'email' | 'google' {
  return provider === 'email' || provider === 'google'
}

export function defaultAvatarUrl(firstName: string, username?: string): string {
  const seed = firstName.trim() || username || 'user'
  return `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(seed)}`
}

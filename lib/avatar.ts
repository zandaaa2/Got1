export const isMeaningfulAvatar = (url: string | null | undefined) => {
  if (!url) {
    return false
  }

  const normalized = url.toLowerCase()
  const placeholders = [
    'got1-icon',
    'got1-full-logo',
    'placeholder',
    'default-avatar',
    'avatar_placeholder',
    'profile-placeholder',
    'googleusercontent.com/a/default',
  ]

  if (placeholders.some((token) => normalized.includes(token))) {
    return false
  }

  // Allow data/blob URLs (used for local previews) to pass through.
  return true
}

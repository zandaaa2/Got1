export const getProfilePath = (id: string, username?: string | null) => {
  if (username && username.trim().length > 0) {
    return `/${username}`
  }
  return `/profile/${id}`
}

export const GRADIENT_CLASSES = [
  'bg-gradient-to-br from-indigo-500 to-blue-500',
  'bg-gradient-to-br from-rose-500 to-pink-500',
  'bg-gradient-to-br from-emerald-500 to-teal-500',
  'bg-gradient-to-br from-amber-500 to-orange-500',
  'bg-gradient-to-br from-purple-500 to-fuchsia-500',
  'bg-gradient-to-br from-sky-500 to-cyan-500',
]

export const getGradientForId = (id: string | null | undefined) => {
  if (!id) {
    return GRADIENT_CLASSES[0]
  }
  let hash = 0
  for (let i = 0; i < id.length; i++) {
    hash = (hash * 31 + id.charCodeAt(i)) >>> 0
  }
  return GRADIENT_CLASSES[hash % GRADIENT_CLASSES.length]
}

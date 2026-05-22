export function truncateMiddle(text: string, maxLen: number): string {
  const t = text.trim()
  if (t.length <= maxLen) {
    return t
  }
  const half = Math.floor((maxLen - 3) / 2)
  return `${t.slice(0, half)}…${t.slice(-half)}`
}

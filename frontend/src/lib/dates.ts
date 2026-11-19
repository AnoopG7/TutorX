/** Backend stores UTC timestamps, sometimes without a zone suffix. */
export function parseUTCDate(value: string): Date {
  const hasZone = /([zZ]|[+-]\d{2}:?\d{2})$/.test(value);
  return new Date(hasZone ? value : `${value}Z`);
}

export function relativeTime(value: string): string {
  const date = parseUTCDate(value);
  const diff = Date.now() - date.getTime();
  const mins = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins} min ago`;
  if (hours < 24) return `${hours} h ago`;
  if (days === 1) return 'Yesterday';
  if (days < 7) return `${days} days ago`;
  return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
}

export type TimeGroup = 'Today' | 'Yesterday' | 'Previous 7 days' | 'Older';
export const TIME_GROUPS: TimeGroup[] = ['Today', 'Yesterday', 'Previous 7 days', 'Older'];

export function timeGroup(value: string): TimeGroup {
  const date = parseUTCDate(value);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const t = date.getTime();
  if (t >= today) return 'Today';
  if (t >= today - 86400000) return 'Yesterday';
  if (t >= today - 7 * 86400000) return 'Previous 7 days';
  return 'Older';
}

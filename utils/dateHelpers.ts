export function formatDate(date: string | Date): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

export function formatTime(date: string | Date): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function formatDateTime(date: string | Date): string {
  return `${formatDate(date)} ${formatTime(date)}`;
}

export function getTodayDateString(): string {
  return new Date().toISOString().split('T')[0];
}

export function isSameDay(date1: string | Date, date2: string | Date): boolean {
  const d1 = typeof date1 === 'string' ? date1.split('T')[0] : date1.toISOString().split('T')[0];
  const d2 = typeof date2 === 'string' ? date2.split('T')[0] : date2.toISOString().split('T')[0];
  return d1 === d2;
}

export function isToday(date: string | Date): boolean {
  return isSameDay(date, new Date());
}

export function getServerTimestamp(): string {
  return new Date().toISOString();
}

export function getRelativeTime(date: string | Date): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return formatDate(d);
}
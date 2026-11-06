const relative = new Intl.RelativeTimeFormat("en", { numeric: "auto" });

export function taskTitle(title: string | null): string {
  const trimmed = title?.trim();
  return trimmed ? trimmed : "Untitled task";
}

export function formatTaskTime(iso: string, now = Date.now()): string {
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return "Unknown time";
  const minutes = Math.round((then - now) / 60_000);
  if (Math.abs(minutes) < 60) return relative.format(minutes, "minute");
  const hours = Math.round(minutes / 60);
  if (Math.abs(hours) < 24) return relative.format(hours, "hour");
  const days = Math.round(hours / 24);
  if (Math.abs(days) < 30) return relative.format(days, "day");
  return new Intl.DateTimeFormat("en", { dateStyle: "medium", timeStyle: "short" }).format(then);
}

export function formatClock(date: Date): string {
  return new Intl.DateTimeFormat("en", { hour: "numeric", minute: "2-digit" }).format(date);
}

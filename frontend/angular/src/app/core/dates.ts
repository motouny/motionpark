/** `YYYY-MM-DD` in the visitor's local time (toISOString is UTC, which is yesterday in Riyadh before 3 AM). */
export function localDate(d: Date = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

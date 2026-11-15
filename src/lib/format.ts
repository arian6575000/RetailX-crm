import { parseYmd } from './dates';

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const pad = (n: number) => String(n).padStart(2, '0');

export const Fmt = {
  currency: 'Rs',
  money(amount: number | string | null | undefined): string {
    const n = Math.round(Number(amount) || 0);
    return `${n < 0 ? '-' : ''}${Fmt.currency} ${Math.abs(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',')}`;
  },
  /** 1.2K / 3.4M style for tight spaces (chart labels, tiles). */
  compact(amount: number): string {
    const n = Math.abs(amount);
    const s = n >= 1e6 ? `${+(n / 1e6).toFixed(1)}M` : n >= 1e3 ? `${+(n / 1e3).toFixed(1)}K` : String(Math.round(n));
    return `${amount < 0 ? '-' : ''}${s}`;
  },
  /** Accepts 'YYYY-MM-DD' or a timestamp. */
  date(v: string | number | null | undefined, short = false): string {
    if (!v) return '—';
    const d = typeof v === 'string' && /^\d{4}-\d\d-\d\d$/.test(v) ? parseYmd(v) : new Date(v);
    if (isNaN(d.getTime())) return '—';
    const mn = short ? MONTHS[d.getMonth()].slice(0, 3) : MONTHS[d.getMonth()];
    return `${d.getDate()} ${mn} ${d.getFullYear()}`;
  },
  time(ts: number): string {
    const d = new Date(ts); const h = d.getHours();
    return `${h % 12 || 12}:${pad(d.getMinutes())} ${h < 12 ? 'AM' : 'PM'}`;
  },
  dateTime(ts: number): string { return `${Fmt.date(ts, true)}, ${Fmt.time(ts)}`; },
  /** "Today, 3:30 PM" / "Tomorrow" / "Yesterday" / "12 Nov". */
  when(ts: number, nowMs = Date.now()): string {
    const d0 = new Date(nowMs); d0.setHours(0, 0, 0, 0);
    const days = Math.floor((ts - d0.getTime()) / 86400000);
    const t = Fmt.time(ts);
    if (days === 0) return `Today, ${t}`;
    if (days === 1) return `Tomorrow, ${t}`;
    if (days === -1) return `Yesterday, ${t}`;
    return `${Fmt.date(ts, true)}, ${t}`;
  },
  /** "3 days overdue" / "in 2 days" / "today". */
  dueLabel(ts: number, nowMs = Date.now()): string {
    const d0 = new Date(nowMs); d0.setHours(0, 0, 0, 0);
    const days = Math.floor((ts - d0.getTime()) / 86400000);
    if (days === 0) return 'Due today';
    if (days < 0) return `${-days} day${days === -1 ? '' : 's'} overdue`;
    return `In ${days} day${days === 1 ? '' : 's'}`;
  },
  initials(name?: string) {
    if (!name) return '?';
    return name.trim().split(/\s+/).slice(0, 2).map((w) => Array.from(w)[0]?.toUpperCase() || '').join('');
  },
  bytes(n: number) { return n < 1024 ? `${n} B` : n < 1048576 ? `${Math.round(n / 1024)} KB` : `${(n / 1048576).toFixed(1)} MB`; },
};

/** Phone → WhatsApp international digits (default country code from settings). */
export function waNumber(phone: string | undefined, cc = '92'): string {
  const d = String(phone || '').replace(/[^\d]/g, '');
  if (!d) return '';
  if (d.startsWith('00')) return d.slice(2);
  if (d.startsWith('0')) return cc + d.slice(1);
  return d;
}

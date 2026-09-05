export const uid = () => Math.random().toString(36).slice(2, 9);
export const today = () => new Date().toISOString().slice(0, 10);
export const nowDT = () => new Date().toISOString().slice(0, 16);

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export function fmtD(d: string) {
  if (!d) return '';
  const [y, m, dy] = d.split('-');
  return `${dy} ${MONTHS[+m - 1]} ${y}`;
}

export function fmtDT(dt: string) {
  if (!dt) return '';
  const d = new Date(dt);
  const h = d.getHours();
  const min = String(d.getMinutes()).padStart(2, '0');
  const ampm = h >= 12 ? 'PM' : 'AM';
  const hr = h % 12 || 12;
  return `${d.getDate()} ${MONTHS[d.getMonth()]} · ${hr}:${min} ${ampm}`;
}

export function timeToMin(t: string) {
  if (!t) return 0;
  const [h, m] = t.split(':').map(Number);
  return h * 60 + m;
}

export function minToTime(m: number) {
  m = ((m % 1440) + 1440) % 1440;
  const h = Math.floor(m / 60);
  const mm = m % 60;
  return `${String(h).padStart(2, '0')}:${String(mm).padStart(2, '0')}`;
}

export function fmt12(t: string) {
  if (!t) return '';
  const [h, m] = t.split(':').map(Number);
  const ap = h >= 12 ? 'PM' : 'AM';
  const hh = h % 12 || 12;
  return `${hh}:${String(m).padStart(2, '0')} ${ap}`;
}

export function toDS(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function fmtHrs(min: number) {
  if (!min) return '';
  const h = Math.round((min / 60) * 100) / 100;
  return (h % 1 === 0 ? h.toFixed(0) : h.toFixed(2).replace(/0+$/, '').replace(/\.$/, '')) + 'h';
}

export function startOfWeek(d: Date) {
  const x = new Date(d);
  const day = x.getDay();
  x.setDate(x.getDate() - day);
  x.setHours(0, 0, 0, 0);
  return x;
}

export function addDays(d: Date, n: number) {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}

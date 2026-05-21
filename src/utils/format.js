export function formatNumber(value) {
  const n = Number(value ?? 0);
  if (Number.isNaN(n)) return '0';
  return new Intl.NumberFormat('en-US').format(n);
}

export function formatDate(value) {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleString();
}

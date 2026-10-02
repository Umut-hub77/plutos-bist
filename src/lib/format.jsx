import React from 'react';

export function fmt(n, d = 2) {
  if (n === null || n === undefined || isNaN(n)) return '—';
  return Number(n).toLocaleString('tr-TR', { minimumFractionDigits: d, maximumFractionDigits: d });
}

export function Yuzde({ v, d = 2 }) {
  if (v === null || v === undefined || isNaN(v)) return <span>—</span>;
  const cls = v >= 0 ? 'up' : 'down';
  return <span className={cls}>{v >= 0 ? '+' : ''}{fmt(v, d)}%</span>;
}

export function Tutar({ v, d = 2 }) {
  if (v === null || v === undefined || isNaN(v)) return <span>—</span>;
  const cls = v >= 0 ? 'up' : 'down';
  return <span className={cls}>{v >= 0 ? '+' : ''}{fmt(v, d)} ₺</span>;
}

// Teknik sinyal rozeti (AL / SAT / NÖTR)
export function Karar({ v }) {
  if (!v) return <span>—</span>;
  const cls = v.includes('AL') ? 'al' : v.includes('SAT') ? 'sat' : 'notr';
  return <span className={'rozet ' + cls}>{v}</span>;
}

// Metrik kartı (PortfoyIzleme'deki metric-card ile aynı görünüm)
export function Metrik({ etiket, children, alt }) {
  return (
    <div className="metric-card">
      <div className="label">{etiket}</div>
      <div className="value">{children}</div>
      {alt && <div className="delta">{alt}</div>}
    </div>
  );
}

import React from 'react';

// plutos_tablo_stilli(bar_kolonu=...) karşılığı: sayının yanında oransal yatay çubuk.
export default function BarHucre({ metin, deger, maks, renk }) {
  const oran = maks > 0 ? Math.max(0, Math.min(100, (Math.abs(deger) / maks) * 100)) : 0;
  return (
    <div className="bar-hucre">
      <span className="bar-metin">{metin}</span>
      <div className="bar-iz"><div className="bar-dolgu" style={{ width: oran + '%', background: renk || 'var(--gold)' }} /></div>
    </div>
  );
}

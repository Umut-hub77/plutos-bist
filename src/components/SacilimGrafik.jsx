import React from 'react';
import { fmt } from '../lib/format.jsx';

// Risk (x) – Getiri (y) dağılım grafiği: etkin sınır bulutu + işaretli özel noktalar.
// nokta: [{risk, getiri}]   isaretler: [{ad, risk, getiri, renk}]
const G = 820, Y = 372, SOL = 52, SAG = 14, UST = 14, ALT = 50;

export default function SacilimGrafik({ nokta, isaretler = [] }) {
  const hepsi = [...nokta, ...isaretler];
  if (!hepsi.length) return null;
  const aralik = (k) => {
    const v = hepsi.map(p => p[k]); const mn = Math.min(...v), mx = Math.max(...v); const pay = (mx - mn) * 0.08 || 1;
    return [mn - pay, mx + pay];
  };
  const [xa, xb] = aralik('risk'), [ya, yb] = aralik('getiri');
  const x = v => SOL + ((v - xa) / (xb - xa)) * (G - SOL - SAG);
  const y = v => UST + (1 - (v - ya) / (yb - ya)) * (Y - UST - ALT);
  const izgara = Array.from({ length: 5 }, (_, i) => i / 4);

  return (
    <div className="grafik-kutu">
      <div className="grafik-lejant">
        {isaretler.map(m => <span key={m.ad}><i style={{ background: m.renk }} />{m.ad}</span>)}
        <span><i style={{ background: '#55555f' }} />Rastgele portföyler</span>
      </div>
      <svg viewBox={`0 0 ${G} ${Y}`} className="grafik-svg">
        {izgara.map(t => (
          <g key={t}>
            <line x1={SOL} x2={G - SAG} y1={y(ya + (yb - ya) * t)} y2={y(ya + (yb - ya) * t)} stroke="var(--border)" />
            <text x={SOL - 6} y={y(ya + (yb - ya) * t) + 4} textAnchor="end" className="eksen">{fmt(ya + (yb - ya) * t, 0)}%</text>
            <text x={x(xa + (xb - xa) * t)} y={Y - 30} textAnchor="middle" className="eksen">{fmt(xa + (xb - xa) * t, 0)}%</text>
          </g>
        ))}
        <text x={G / 2} y={Y - 6} textAnchor="middle" className="eksen">Risk (yıllık volatilite)</text>
        {nokta.map((p, i) => <circle key={i} cx={x(p.risk)} cy={y(p.getiri)} r="2.6" fill="#55555f" opacity="0.7" />)}
        {isaretler.map(m => (
          <g key={m.ad}>
            <circle cx={x(m.risk)} cy={y(m.getiri)} r="7" fill={m.renk} stroke="#08080A" strokeWidth="2" />
            {m.etiket && <text x={x(m.risk) + 11} y={y(m.getiri) + 4} className="eksen" style={{ fill: m.renk }}>{m.etiket}</text>}
          </g>
        ))}
      </svg>
    </div>
  );
}

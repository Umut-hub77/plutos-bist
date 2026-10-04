import React, { useState, useMemo } from 'react';
import { fmt } from '../lib/format.jsx';

// Bağımlılıksız SVG çok-çizgili grafik (Plotly go.Scatter karşılığı).
// seriler: [{ hisse, renk?, noktalar: [{ t: 'YYYY-MM-DD' | 'YYYY-MM-DDTHH:MM:SS', v: number }] }]
// referans: tek sayı | sayı dizisi | null  -> kesikli yatay yardımcı çizgi(ler) (örn. 100, [30, 70])
// d: eksen/ipucu ondalık sayısı,  yukseklik: SVG yüksekliği
const RENKLER = ['#D7FF4E', '#4EA8FF', '#F0455C', '#FFB84E', '#B072FF', '#22C55E', '#4EF0D8', '#FF72C8',
                 '#9AA4FF', '#E0E0E0', '#FF8A4E', '#7AE04E', '#4ECBFF', '#FF4E9A', '#C8B04E'];
const SOL = 52, SAG = 12, UST = 10, ALT = 26;

// Eksen etiketi: milyonlu değerleri kısalt (12.705.000 -> 12,7 Mn) ki sol kenarda kesilmesin
const eksenYaz = (v, d) => (Math.abs(v) >= 1e6 ? fmt(v / 1e6, 1) + ' Mn' : fmt(v, d));
const etiketle = (s) => (s.length > 10 ? s.slice(0, 16).replace('T', ' ') : s);

// genislik: SVG iç genişliği. Yan yana küçük grafiklerde 820 yerine ~440 verin ki yazılar küçülmesin.
export default function CizgiGrafik({ seriler, referans = 100, d = 0, yukseklik = 340, lejant = true, genislik = 820 }) {
  const G = genislik;
  const [hover, setHover] = useState(null); // zaman damgası (ms)
  const Y = yukseklik;
  const refler = Array.isArray(referans) ? referans : referans == null ? [] : [referans];

  const { tMin, tMax, vMin, vMax, cizimler, zamanlar, etiketHaritasi } = useMemo(() => {
    let tMin = Infinity, tMax = -Infinity, vMin = Infinity, vMax = -Infinity;
    const etiketHaritasi = new Map(); // zaman damgası -> özgün tarih metni (saat dilimi kaymasını önler)
    const cizimler = seriler.map((s, i) => {
      const n = s.noktalar.map(p => ({ t: Date.parse(p.t), v: p.v, etiket: p.t }));
      n.forEach(p => {
        if (!isFinite(p.t) || p.v == null) return;
        tMin = Math.min(tMin, p.t); tMax = Math.max(tMax, p.t); vMin = Math.min(vMin, p.v); vMax = Math.max(vMax, p.v);
        etiketHaritasi.set(p.t, p.etiket);
      });
      return { hisse: s.hisse, renk: s.renk || RENKLER[i % RENKLER.length], n: n.filter(p => isFinite(p.t) && p.v != null) };
    });
    refler.forEach(r => { vMin = Math.min(vMin, r); vMax = Math.max(vMax, r); });
    const pay = (vMax - vMin) * 0.06 || 1;
    const zamanlar = [...etiketHaritasi.keys()].sort((a, b) => a - b);
    return { tMin, tMax, vMin: vMin - pay, vMax: vMax + pay, cizimler, zamanlar, etiketHaritasi };
    // eslint-disable-next-line
  }, [seriler, JSON.stringify(refler)]);

  if (!cizimler.length || !isFinite(tMin)) return null;

  const x = t => SOL + ((t - tMin) / (tMax - tMin || 1)) * (G - SOL - SAG);
  const y = v => UST + (1 - (v - vMin) / (vMax - vMin)) * (Y - UST - ALT);
  const yCizgileri = Array.from({ length: 5 }, (_, i) => vMin + ((vMax - vMin) * i) / 4);
  const enYakin = (t) => { let en = zamanlar[0]; for (const z of zamanlar) if (Math.abs(z - t) < Math.abs(en - t)) en = z; return en; };
  const xEtiketleri = [tMin, tMin + (tMax - tMin) / 2, tMax].map(enYakin);

  const fareHareketi = (e) => {
    const r = e.currentTarget.getBoundingClientRect();
    const oran = ((e.clientX - r.left) / r.width) * G;
    setHover(enYakin(tMin + ((oran - SOL) / (G - SOL - SAG)) * (tMax - tMin)));
  };

  const dokunmaHareketi = (e) => {
    if (!e.touches || !e.touches[0]) return;
    const t = e.touches[0];
    const r = e.currentTarget.getBoundingClientRect();
    const oran = ((t.clientX - r.left) / r.width) * G;
    setHover(enYakin(tMin + ((oran - SOL) / (G - SOL - SAG)) * (tMax - tMin)));
  };

  const hoverDegerler = hover == null ? null : cizimler.map(c => {
    let b = null;
    for (const p of c.n) if (b === null || Math.abs(p.t - hover) < Math.abs(b.t - hover)) b = p;
    // seri o tarihe yakın değilse (örn. tahmin serisi geçmiş tarihte) gösterme
    const yakin = b && Math.abs(b.t - hover) <= Math.max((tMax - tMin) / 40, 86400000 * 3);
    return yakin ? { hisse: c.hisse, renk: c.renk, p: b } : null;
  }).filter(Boolean).sort((a, b) => b.p.v - a.p.v);

  return (
    <div className="grafik-kutu" style={{ touchAction: 'none' }}>
      {lejant && (
        <div className="grafik-lejant">
          {cizimler.map(c => <span key={c.hisse}><i style={{ background: c.renk }} />{c.hisse}</span>)}
        </div>
      )}
      <svg
        viewBox={`0 0 ${G} ${Y}`}
        className="grafik-svg"
        onMouseMove={fareHareketi}
        onMouseLeave={() => setHover(null)}
        onTouchStart={dokunmaHareketi}
        onTouchMove={dokunmaHareketi}
        onTouchEnd={() => setHover(null)}
        style={{ touchAction: 'none' }}
      >
        {yCizgileri.map((v, i) => (
          <g key={i}>
            <line x1={SOL} x2={G - SAG} y1={y(v)} y2={y(v)} stroke="var(--border)" strokeWidth="1" />
            <text x={SOL - 6} y={y(v) + 4} textAnchor="end" className="eksen">{eksenYaz(v, d)}</text>
          </g>
        ))}
        {refler.map(r => (
          <line key={r} x1={SOL} x2={G - SAG} y1={y(r)} y2={y(r)} stroke="var(--text-muted)" strokeDasharray="4 4" strokeWidth="1" />
        ))}
        {xEtiketleri.map((t, i) => (
          <text key={i} x={x(t)} y={Y - 6} textAnchor={i === 0 ? 'start' : i === 2 ? 'end' : 'middle'} className="eksen">
            {etiketle(etiketHaritasi.get(t) || '')}
          </text>
        ))}
        {cizimler.map(c => (
          <polyline key={c.hisse} fill="none" stroke={c.renk} strokeWidth="2" strokeLinejoin="round"
                    points={c.n.map(p => `${x(p.t).toFixed(1)},${y(p.v).toFixed(1)}`).join(' ')} />
        ))}
        {hover != null && <line x1={x(hover)} x2={x(hover)} y1={UST} y2={Y - ALT} stroke="var(--text-muted)" strokeWidth="1" />}
      </svg>
      {hoverDegerler && (
        <div className="grafik-ipucu">
          <b>{etiketle(etiketHaritasi.get(hover) || '')}</b>
          {hoverDegerler.map(h => (
            <span key={h.hisse}><i style={{ background: h.renk }} />{h.hisse} <b>{fmt(h.p.v, d || 1)}</b></span>
          ))}
        </div>
      )}
    </div>
  );
}

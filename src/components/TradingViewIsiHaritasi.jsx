import React, { useState } from 'react';
import { fmt } from '../lib/format.jsx';

const BIST30_HARITA_VERISI = [
  { hisse: 'THYAO', ad: 'Türk Hava Yolları', sektor: 'Ulaştırma', agirlik: 12.5, fiyat: 289.75, degisim: 1.13 },
  { hisse: 'PGSUS', ad: 'Pegasus Hava Taşımacılığı', sektor: 'Ulaştırma', agirlik: 4.2, fiyat: 141.20, degisim: 0.50 },
  { hisse: 'ASELS', ad: 'Aselsan Elektronik', sektor: 'Savunma & Teknoloji', agirlik: 10.8, fiyat: 372.75, degisim: 9.96 },
  { hisse: 'TUPRS', ad: 'Tüpraş Rafinerileri', sektor: 'Petrol & Enerji', agirlik: 9.4, fiyat: 384.75, degisim: 2.86 },
  { hisse: 'GARAN', ad: 'Garanti BBVA', sektor: 'Bankacılık', agirlik: 8.5, fiyat: 126.20, degisim: 2.69 },
  { hisse: 'AKBNK', ad: 'Akbank', sektor: 'Bankacılık', agirlik: 7.2, fiyat: 68.00, degisim: 0.67 },
  { hisse: 'ISCTR', ad: 'İş Bankası (C)', sektor: 'Bankacılık', agirlik: 6.8, fiyat: 12.49, degisim: 2.10 },
  { hisse: 'YKBNK', ad: 'Yapı Kredi Bankası', sektor: 'Bankacılık', agirlik: 5.5, fiyat: 31.40, degisim: 1.85 },
  { hisse: 'KCHOL', ad: 'Koç Holding', sektor: 'Holding', agirlik: 9.1, fiyat: 211.90, degisim: 0.95 },
  { hisse: 'SAHOL', ad: 'Sabancı Holding', sektor: 'Holding', agirlik: 5.2, fiyat: 98.40, degisim: 1.40 },
  { hisse: 'BIMAS', ad: 'BİM Mağazaları', sektor: 'Perakende', agirlik: 7.8, fiyat: 409.50, degisim: 0.38 },
  { hisse: 'EREGL', ad: 'Erdemir Çelik', sektor: 'Demir & Çelik', agirlik: 5.9, fiyat: 36.58, degisim: -0.11 },
  { hisse: 'SISE', ad: 'Şişecam Fabrikaları', sektor: 'Sanayi', agirlik: 4.8, fiyat: 37.40, degisim: 0.16 },
  { hisse: 'FROTO', ad: 'Ford Otomotiv', sektor: 'Otomotiv', agirlik: 5.4, fiyat: 73.65, degisim: -2.39 },
  { hisse: 'ENKAI', ad: 'Enka İnşaat', sektor: 'İnşaat', agirlik: 3.8, fiyat: 48.20, degisim: 1.65 },
];

export default function TradingViewIsiHaritasi({ onHisseSec, onHizliAl }) {
  const [sektorFiltre, setSektorFiltre] = useState('tumu');

  const sektorler = ['tumu', 'Ulaştırma', 'Bankacılık', 'Holding', 'Savunma & Teknoloji', 'Petrol & Enerji', 'Perakende'];

  const filtrelenmis = sektorFiltre === 'tumu'
    ? BIST30_HARITA_VERISI
    : BIST30_HARITA_VERISI.filter(x => x.sektor === sektorFiltre);

  const getKutuRengi = (degisim) => {
    if (degisim >= 4.0) return 'linear-gradient(135deg, rgba(8, 153, 129, 0.9) 0%, rgba(8, 153, 129, 0.7) 100%)';
    if (degisim >= 1.5) return 'linear-gradient(135deg, rgba(8, 153, 129, 0.65) 0%, rgba(8, 153, 129, 0.45) 100%)';
    if (degisim >= 0.0) return 'linear-gradient(135deg, rgba(8, 153, 129, 0.35) 0%, rgba(8, 153, 129, 0.2) 100%)';
    if (degisim >= -1.5) return 'linear-gradient(135deg, rgba(242, 54, 69, 0.35) 0%, rgba(242, 54, 69, 0.2) 100%)';
    return 'linear-gradient(135deg, rgba(242, 54, 69, 0.85) 0%, rgba(242, 54, 69, 0.6) 100%)';
  };

  return (
    <div className="isi-haritasi-kutu">
      {/* Başlık ve Filtre Çubukları */}
      <div className="isi-haritasi-ust">
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 16 }}>🗺️</span>
            <span style={{ fontWeight: 700, fontSize: 15, color: '#FFFFFF' }}>
              TradingView BIST 30 Piyasa Isı Haritası
            </span>
            <span style={{ fontSize: 11, color: '#2962FF', background: 'rgba(41, 98, 255, 0.15)', padding: '2px 7px', borderRadius: 4, fontWeight: 600 }}>
              HEATMAP
            </span>
          </div>
          <span style={{ fontSize: 11.5, color: '#787B86', display: 'block', marginTop: 3 }}>
            Kutuların boyutu piyasa ağırlığını, renkleri ise günlük getiriyi gösterir.
          </span>
        </div>

        {/* Sektör Filtre Hapları */}
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {sektorler.map(s => (
            <button
              key={s}
              className={`ticker-chip ${sektorFiltre === s ? 'aktif' : ''}`}
              onClick={() => setSektorFiltre(s)}
            >
              {s === 'tumu' ? 'Tüm Sektörler' : s}
            </button>
          ))}
        </div>
      </div>

      {/* Grid Treemap / Isı Haritası */}
      <div className="isi-haritasi-grid">
        {filtrelenmis.map(h => (
          <div
            key={h.hisse}
            className="isi-kutu"
            style={{
              background: getKutuRengi(h.degisim),
              border: '1px solid rgba(255, 255, 255, 0.12)',
            }}
            onClick={() => onHisseSec?.(h.hisse)}
            title={`${h.ad} (${h.sektor}) — Grafiğe gitmek için tıklayın`}
          >
            <div className="isi-kutu-ust">
              <span className="isi-sembol">{h.hisse}</span>
              <span className="isi-fiyat">{fmt(h.fiyat)} ₺</span>
            </div>

            <div className="isi-kutu-orta">
              <span className="isi-degisim">
                {h.degisim >= 0 ? '▲ +' : '▼ '}{fmt(h.degisim)}%
              </span>
              <span className="isi-sektor">{h.sektor}</span>
            </div>

            {/* Hızlı Al Kısayolu */}
            <div className="isi-kutu-aksiyon" onClick={e => { e.stopPropagation(); onHizliAl?.(h.hisse); }}>
              <span>⚡ Hızlı Al</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

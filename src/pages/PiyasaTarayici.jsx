import React, { useState, useEffect, useMemo } from 'react';
import { fmt, Yuzde, Karar } from '../lib/format.jsx';
import { useTickers } from '../lib/useTickers.js';
import HisseSecici from '../components/HisseSecici.jsx';

const FILTRELER = [
  'Tümü',
  'AL Sinyali Verenler',
  'SAT Sinyali Verenler',
  'Aşırı Satım (RSI < 30)',
  'Aşırı Alım (RSI > 70)',
];

const SIRKET_ISIMLERI = {
  THYAO: 'Türk Hava Yolları',
  GARAN: 'Garanti BBVA',
  ASELS: 'Aselsan',
  EREGL: 'Ereğli Demir Çelik',
  TUPRS: 'Tüpraş',
  KCHOL: 'Koç Holding',
  BIMAS: 'BİM Mağazalar',
  AKBNK: 'Akbank',
  YKBNK: 'Yapı Kredi',
  SAHOL: 'Sabancı Holding',
  SISE: 'Şişecam',
  PETKM: 'Petkim',
  FROTO: 'Ford Otosan',
  TOASO: 'Tofaş',
  TCELL: 'Turkcell',
  PGSUS: 'Pegasus',
  MGROS: 'Migros',
  SASA: 'Sasa Polyester',
  ISCTR: 'İş Bankası',
  VAKBN: 'Vakıfbank',
};

export default function PiyasaTarayici({ api, onModulDegistir }) {
  const t = useTickers(api);
  const [presets, setPresets] = useState({});
  const [secili, setSecili] = useState([]);
  const [sonuc, setSonuc] = useState(null);
  const [yukleniyor, setYukleniyor] = useState(false);
  const [hata, setHata] = useState('');
  const [filtre, setFiltre] = useState('Tümü');

  useEffect(() => {
    api('/api/scan/presets')
      .then(r => {
        setPresets(r.presets);
        setSecili(r.presets['Popüler 20'] || []);
      })
      .catch(e => setHata(e.message));
  }, [api]);

  const tara = () => {
    if (!secili.length) return;
    setYukleniyor(true);
    setHata('');
    api('/api/scan?hisseler=' + encodeURIComponent(secili.join(',')))
      .then(setSonuc)
      .catch(e => {
        setHata(e.message);
        setSonuc(null);
      })
      .finally(() => setYukleniyor(false));
  };

  // İlk yüklemede otomatik tarama
  useEffect(() => {
    if (secili.length > 0 && !sonuc && !yukleniyor) {
      tara();
    }
    // eslint-disable-next-line
  }, [secili]);

  const satirlar = useMemo(() => {
    return (sonuc?.satirlar || []).filter(s => {
      if (filtre === 'Tümü') return true;
      if (filtre === 'AL Sinyali Verenler') return s.karar.includes('AL');
      if (filtre === 'SAT Sinyali Verenler') return s.karar.includes('SAT');
      if (filtre === 'Aşırı Satım (RSI < 30)') return s.rsi != null && s.rsi < 30;
      if (filtre === 'Aşırı Alım (RSI > 70)') return s.rsi != null && s.rsi > 70;
      return true;
    });
  }, [sonuc, filtre]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* 1. SEKTÖR VE LİSTE SEÇİM KARTI */}
      <div className="kurumsal-kart" style={{ padding: 18 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <h4 style={{ color: '#FFFFFF', margin: 0 }}>🔍 BIST Kuantitatif Piyasa Tarayıcısı</h4>
          <span style={{ fontSize: 11, color: '#787B86' }}>Teknik İndikatör & Sinyal Filtresi</span>
        </div>

        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
          <span style={{ fontSize: 12, color: '#787B86', alignSelf: 'center', marginRight: 4 }}>Hazır Sektör Listeleri:</span>
          {Object.keys(presets).map(p => (
            <button
              key={p}
              className={`hisse-hizli-chip ${JSON.stringify(secili) === JSON.stringify(presets[p]) ? 'aktif' : ''}`}
              onClick={() => {
                setSecili(presets[p]);
              }}
            >
              {p} ({presets[p].length})
            </button>
          ))}
        </div>

        <HisseSecici
          etiket="Taranacak Hisseler (Özelleştirilebilir):"
          tickers={t?.tickers}
          secili={secili}
          onChange={setSecili}
          max={40}
        />

        <div style={{ marginTop: 12, display: 'flex', justifyContent: 'flex-end' }}>
          <button
            className="arac-btn aktif"
            onClick={tara}
            disabled={yukleniyor || !secili.length}
            style={{ padding: '9px 24px', fontSize: 13 }}
          >
            {yukleniyor ? 'BIST Hisseleri Taranıyor…' : `Taramayı Başlat (${secili.length} Hisse)`}
          </button>
        </div>

        {hata && <div className="error-msg" style={{ marginTop: 10 }}>{hata}</div>}
      </div>

      {/* 2. TARAMA SONUÇLARI VE FİLTRE PANELİ */}
      {sonuc && (
        <div className="kurumsal-kart" style={{ padding: 18 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12, marginBottom: 14 }}>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {FILTRELER.map(f => (
                <button
                  key={f}
                  className={`arac-btn ${filtre === f ? 'aktif' : ''}`}
                  onClick={() => setFiltre(f)}
                >
                  {f}
                </button>
              ))}
            </div>
            <span style={{ fontSize: 12, color: '#D7FF4E', fontWeight: 600 }}>
              Filtrelenen: {satirlar.length} / {sonuc.satirlar.length} Hisse
            </span>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table>
              <thead>
                <tr>
                  <th>Hisse</th>
                  <th>Son Fiyat</th>
                  <th>Günlük Değişim</th>
                  <th>RSI (14)</th>
                  <th>Trend</th>
                  <th>MACD</th>
                  <th>Hacim Oranı</th>
                  <th>Skor</th>
                  <th>Konsensüs Sinyali</th>
                  <th style={{ textAlign: 'right' }}>Aksiyon</th>
                </tr>
              </thead>
              <tbody>
                {satirlar.length ? (
                  satirlar.map(s => {
                    const rsiDeger = s.rsi || 50;
                    const rsiRenk = rsiDeger >= 70 ? '#F23645' : rsiDeger <= 30 ? '#089981' : '#FF9800';
                    return (
                      <tr key={s.hisse}>
                        <td>
                          <div className="tablo-hisse-hucre">
                            <span className="kod">{s.hisse}</span>
                            <span className="ad">{SIRKET_ISIMLERI[s.hisse] || 'BIST Şirketi'}</span>
                          </div>
                        </td>
                        <td style={{ fontWeight: 700, color: '#FFFFFF' }}>{fmt(s.fiyat)} ₺</td>
                        <td>
                          <span className={s.gunluk >= 0 ? 'rozet-al' : 'rozet-sat'}>
                            {s.gunluk >= 0 ? '▲ +' : '▼ '}{fmt(s.gunluk)}%
                          </span>
                        </td>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                            <span style={{ fontWeight: 600, color: rsiRenk, minWidth: 28 }}>{fmt(s.rsi, 1)}</span>
                            <div className="rsi-termo-bar">
                              <div className="rsi-termo-dolgu" style={{ width: `${Math.min(100, rsiDeger)}%`, background: rsiRenk }} />
                            </div>
                          </div>
                        </td>
                        <td>
                          <span className={s.trend === 'Yükseliş' ? 'rozet-al' : s.trend === 'Düşüş' ? 'rozet-sat' : 'rozet-notr'}>
                            {s.trend}
                          </span>
                        </td>
                        <td>
                          <span style={{ color: s.macd === 'Pozitif' ? '#089981' : '#F23645', fontWeight: 600 }}>
                            {s.macd}
                          </span>
                        </td>
                        <td style={{ color: (s.hacim_orani || 1) >= 1.5 ? '#D7FF4E' : '#D1D4DC', fontWeight: 600 }}>
                          {s.hacim_orani == null ? '—' : fmt(s.hacim_orani, 1) + 'x'}
                        </td>
                        <td style={{ fontWeight: 700, color: s.puan > 0 ? '#089981' : s.puan < 0 ? '#F23645' : '#787B86' }}>
                          {s.puan > 0 ? '+' : ''}{s.puan}
                        </td>
                        <td>
                          <Karar v={s.karar} />
                        </td>
                        <td style={{ textAlign: 'right' }}>
                          <div className="hisse-aksiyon-grup">
                            <button
                              className="btn-aksiyon-al"
                              onClick={() => {
                                window.location.hash = `#emir?hisse=${s.hisse}&yon=AL`;
                                onModulDegistir?.('Portföy', 'Emir Ver (Demo)');
                              }}
                            >
                              AL
                            </button>
                            <button
                              className="btn-aksiyon-sat"
                              onClick={() => {
                                window.location.hash = `#emir?hisse=${s.hisse}&yon=SAT`;
                                onModulDegistir?.('Portföy', 'Emir Ver (Demo)');
                              }}
                            >
                              SAT
                            </button>
                            <button
                              className="btn-aksiyon-grafik"
                              onClick={() => {
                                window.location.hash = `#stratejik?hisse=${s.hisse}`;
                                onModulDegistir?.('Analiz', 'Stratejik Analiz');
                              }}
                            >
                              Grafik
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={10} className="empty-hint" style={{ padding: 24, textAlign: 'center' }}>
                      Seçili filtre kriterine uyan BIST hissesi bulunamadı.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

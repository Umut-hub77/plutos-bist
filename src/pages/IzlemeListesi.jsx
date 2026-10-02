import React, { useState, useEffect, useCallback } from 'react';
import { fmt, Yuzde, Karar } from '../lib/format.jsx';
import { useTickers } from '../lib/useTickers.js';
import TekHisse from '../components/TekHisse.jsx';

const BIST30_HIZLI = ['THYAO', 'GARAN', 'ASELS', 'EREGL', 'TUPRS', 'KCHOL', 'BIMAS', 'AKBNK', 'SISE', 'SAHOL'];

export default function IzlemeListesi({ api, onModulDegistir }) {
  const t = useTickers(api);
  const [liste, setListe] = useState(null);
  const [yeni, setYeni] = useState('');
  const [hata, setHata] = useState('');
  const [ekleniyor, setEkleniyor] = useState(false);

  const yukle = useCallback(async () => {
    try {
      const r = await api('/api/watchlist');
      setListe(r.liste || []);
    } catch (e) {
      setHata(e.message);
    }
  }, [api]);

  useEffect(() => {
    yukle();
  }, [yukle]);

  const ekle = async (sembol) => {
    const s = (sembol || yeni).trim().toUpperCase();
    setHata('');
    if (!s) {
      setHata('Lütfen geçerli bir hisse sembolü seçin.');
      return;
    }
    setEkleniyor(true);
    try {
      await api('/api/watchlist', { method: 'POST', govde: { hisse: s } });
      await yukle();
      setYeni('');
    } catch (e) {
      setHata(e.message);
    } finally {
      setEkleniyor(false);
    }
  };

  const sil = async (h) => {
    try {
      await api('/api/watchlist/' + h, { method: 'DELETE' });
      setListe(l => l.filter(x => x.hisse !== h));
    } catch (e) {
      setHata(e.message);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* 1. HIZLI HİSSE EKLEME KARTI */}
      <div className="kurumsal-kart" style={{ padding: 18 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <h4 style={{ color: '#FFFFFF', margin: 0 }}>📋 Özel BIST Takip & İzleme Listem</h4>
          <span style={{ fontSize: 11, color: '#787B86' }}>Canlı Fiyat ve Sinyal Takibi</span>
        </div>

        <div style={{ display: 'flex', gap: 12, alignItems: 'flex-end', flexWrap: 'wrap' }}>
          <div style={{ flex: 1, minWidth: 260 }}>
            <TekHisse etiket="Hisse Kodu:" tickers={t?.tickers} deger={yeni} onChange={setYeni} gecersizdeBosalt />
          </div>
          <button
            className="arac-btn aktif"
            onClick={() => ekle()}
            disabled={ekleniyor}
            style={{ padding: '9px 20px', fontSize: 13, height: 40 }}
          >
            {ekleniyor ? 'Ekleniyor…' : '+ Listeme Ekle'}
          </button>
        </div>

        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 10 }}>
          <span style={{ fontSize: 11.5, color: '#787B86', alignSelf: 'center', marginRight: 4 }}>Hızlı Ekle:</span>
          {BIST30_HIZLI.map(s => (
            <button key={s} className="lot-hizli-btn" onClick={() => ekle(s)}>
              +{s}
            </button>
          ))}
        </div>

        {hata && <div className="error-msg" style={{ marginTop: 8 }}>{hata}</div>}
      </div>

      {/* 2. İZLEME LİSTESİ TABLOSU */}
      <div className="kurumsal-kart" style={{ padding: 18 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <span style={{ fontSize: 13, fontWeight: 700, color: '#FFFFFF' }}>
            Takipteki Hisseler ({liste?.length || 0})
          </span>
          <span style={{ fontSize: 11, color: '#787B86' }}>Fiyatlar anlık olarak güncellenir</span>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table>
            <thead>
              <tr>
                <th>Hisse</th>
                <th>Son Fiyat</th>
                <th>Günlük Değişim</th>
                <th>RSI (14)</th>
                <th>Teknik Karar</th>
                <th style={{ textAlign: 'right' }}>İşlem & Yönetim</th>
              </tr>
            </thead>
            <tbody>
              {!liste && (
                <tr>
                  <td colSpan={6} className="empty-hint" style={{ textAlign: 'center', padding: 24 }}>
                    İzleme listesi yükleniyor…
                  </td>
                </tr>
              )}
              {liste?.length === 0 && (
                <tr>
                  <td colSpan={6} className="empty-hint" style={{ textAlign: 'center', padding: 24 }}>
                    İzleme listeniz boş. Yukarıdaki arama kutusundan veya hazır butonlardan hisse ekleyin.
                  </td>
                </tr>
              )}
              {liste?.map(s => (
                <tr key={s.hisse}>
                  <td>
                    <span className="kod" style={{ fontWeight: 700, fontSize: 14, color: '#FFFFFF' }}>{s.hisse}</span>
                  </td>
                  <td style={{ fontWeight: 700, color: '#FFFFFF' }}>
                    {s.fiyat == null ? '—' : fmt(s.fiyat) + ' ₺'}
                  </td>
                  <td>
                    <span className={s.gunluk >= 0 ? 'rozet-al' : 'rozet-sat'}>
                      {s.gunluk >= 0 ? '▲ +' : '▼ '}{fmt(s.gunluk)}%
                    </span>
                  </td>
                  <td>
                    <span style={{ fontWeight: 600, color: s.rsi >= 70 ? '#F23645' : s.rsi <= 30 ? '#089981' : '#D1D4DC' }}>
                      {fmt(s.rsi, 1)}
                    </span>
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
                      <button
                        className="logout-btn"
                        onClick={() => sil(s.hisse)}
                        style={{ padding: '3px 8px', fontSize: 11 }}
                      >
                        Kaldır
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

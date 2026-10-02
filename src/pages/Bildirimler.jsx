import React, { useState, useEffect } from 'react';
import { fmt } from '../lib/format.jsx';

export default function Bildirimler({ api }) {
  const [liste, setListe] = useState(null);
  const [yukleniyor, setYukleniyor] = useState(false);
  const [filtre, setFiltre] = useState('tumu'); // 'tumu' | 'fiyat' | 'seans'

  const yukle = () => {
    setYukleniyor(true);
    api('/api/alarms')
      .then(r => setListe(r.alarms.filter(a => a.tetiklendi)))
      .catch(() => setListe([]))
      .finally(() => setYukleniyor(false));
  };

  useEffect(() => {
    yukle();
  }, [api]);

  // Simüle edilmiş kurumsal seans & sistem bildirimleri
  const sistemBildirimleri = [
    {
      id: 'sys-1',
      tur: 'seans',
      baslik: 'BIST 100 Sürekli Müzayede Seansı Aktif',
      detay: 'Borsa İstanbul Pay Piyasası işlem seansı saat 10:00 - 18:05 saatleri arasında kesintisiz devam etmektedir.',
      zaman: 'Bugün 10:00',
      oncelik: 'normal'
    },
    {
      id: 'sys-2',
      tur: 'risk',
      baslik: 'Takasbank T+2 Günlük Mutabakat Hatırlatması',
      detay: 'Portföy pozisyonlarınız için T+2 valörlü nakit ve hisse takas işlemleri saat 16:30 itibarıyla mutabakat aşamasına geçecektir.',
      zaman: 'Bugün 09:30',
      oncelik: 'bilgi'
    }
  ];

  const tumBildirimler = [
    ...(liste || []).map((a, i) => ({
      id: `alarm-${i}`,
      tur: 'fiyat',
      baslik: `Fiyat Eşiği Aşıldı: ${a.hisse}`,
      detay: `${a.hisse} hissesi ${a.yon.toLowerCase()} koşuluyla ${fmt(a.esik, 2)} ₺ eşik seviyesini test etti ve tetiklendi.`,
      zaman: 'Son Seans',
      hisse: a.hisse,
      oncelik: 'kritik'
    })),
    ...sistemBildirimleri
  ];

  const filtrelenmis = tumBildirimler.filter(b => {
    if (filtre === 'fiyat') return b.tur === 'fiyat';
    if (filtre === 'seans') return b.tur === 'seans' || b.tur === 'risk';
    return true;
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Üst Başlık & Kontrol */}
      <div className="panel" style={{ padding: 14, background: '#131722', border: '1px solid #2a2e39', borderRadius: 8 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 20, color: '#2962FF' }}>📬</span>
            <div>
              <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: '#f0f3fa' }}>Bildirim ve Olay Merkezi</h3>
              <p style={{ margin: 0, fontSize: 12, color: '#787b86' }}>
                Tetiklenen fiyat uyarıları, seans olayları ve Takasbank mutabakat duyuruları
              </p>
            </div>
          </div>

          <div className="bildirim-filtre-bar" style={{ display: 'flex', gap: 6, overflowX: 'auto', WebkitOverflowScrolling: 'touch', maxWidth: '100%', paddingBottom: 4 }}>
            <button
              className={filtre === 'tumu' ? 'primary' : 'logout-btn'}
              style={{ fontSize: 12, padding: '6px 12px', borderRadius: 6, flexShrink: 0, whiteSpace: 'nowrap' }}
              onClick={() => setFiltre('tumu')}
            >
              Tümü ({tumBildirimler.length})
            </button>
            <button
              className={filtre === 'fiyat' ? 'primary' : 'logout-btn'}
              style={{ fontSize: 12, padding: '6px 12px', borderRadius: 6, flexShrink: 0, whiteSpace: 'nowrap' }}
              onClick={() => setFiltre('fiyat')}
            >
              Fiyat Alarmları ({liste?.length || 0})
            </button>
            <button
              className={filtre === 'seans' ? 'primary' : 'logout-btn'}
              style={{ fontSize: 12, padding: '6px 12px', borderRadius: 6, flexShrink: 0, whiteSpace: 'nowrap' }}
              onClick={() => setFiltre('seans')}
            >
              Seans & Sistem ({sistemBildirimleri.length})
            </button>
            <button
              className="logout-btn"
              style={{ fontSize: 12, padding: '6px 12px', borderRadius: 6, flexShrink: 0, whiteSpace: 'nowrap' }}
              onClick={yukle}
              disabled={yukleniyor}
            >
              🔄 Yenile
            </button>
          </div>
        </div>
      </div>

      {yukleniyor && <div className="loading-hint">Bildirimler taranıyor…</div>}

      {/* Bildirim Kartları */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {filtrelenmis.length === 0 ? (
          <div className="panel" style={{ padding: 32, textAlign: 'center', color: '#787b86', background: '#131722', border: '1px solid #2a2e39', borderRadius: 8 }}>
            Yeni veya okunmamış bildirim bulunmuyor.
          </div>
        ) : (
          filtrelenmis.map(b => (
            <div
              key={b.id}
              className="panel"
              style={{
                padding: 14,
                background: '#131722',
                borderLeft: `4px solid ${b.tur === 'fiyat' ? '#089981' : b.tur === 'risk' ? '#FF9800' : '#2962FF'}`,
                border: '1px solid #2a2e39',
                borderRadius: 8,
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: 12
              }}
            >
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                <span style={{ fontSize: 20 }}>{b.tur === 'fiyat' ? '🎯' : b.tur === 'risk' ? '⚠️' : '🔔'}</span>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <h4 style={{ margin: 0, fontSize: 14, color: '#f0f3fa', fontWeight: 600 }}>{b.baslik}</h4>
                    <span
                      style={{
                        fontSize: 10,
                        padding: '2px 6px',
                        borderRadius: 4,
                        background: b.tur === 'fiyat' ? 'rgba(8, 153, 129, 0.15)' : 'rgba(41, 98, 255, 0.15)',
                        color: b.tur === 'fiyat' ? '#089981' : '#2962FF',
                        fontWeight: 600
                      }}
                    >
                      {b.tur === 'fiyat' ? 'FİYAT TETİKLENDİ' : 'SİSTEM DUYURUSU'}
                    </span>
                  </div>
                  <p style={{ margin: '6px 0 0 0', fontSize: 12.5, color: '#d1d4dc' }}>{b.detay}</p>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <span style={{ fontSize: 11, color: '#787b86', fontFamily: 'monospace' }}>{b.zaman}</span>
                {b.hisse && (
                  <a
                    href={`#stratejik?hisse=${b.hisse}`}
                    className="primary"
                    style={{ fontSize: 11, padding: '4px 10px', textDecoration: 'none', borderRadius: 4 }}
                  >
                    Grafiğe Git ↗
                  </a>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

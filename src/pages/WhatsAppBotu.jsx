import React, { useState, useEffect } from 'react';

export default function WhatsAppBotu({ api }) {
  const [ayar, setAyar] = useState(null);
  const [onizleme, setOnizleme] = useState('');
  const [twilio, setTwilio] = useState(true);
  const [mesaj, setMesaj] = useState(null);
  const [bekle, setBekle] = useState(false);

  useEffect(() => {
    api('/api/whatsapp')
      .then(r => {
        setAyar(r.ayar);
        setOnizleme(r.onizleme || '');
        setTwilio(r.twilio_hazir);
      })
      .catch(e => setMesaj({ tur: 'hata', metin: e.message }));
  }, [api]);

  const degistir = (k, v) => setAyar(a => ({ ...a, [k]: v }));

  const islem = async (istek, basari) => {
    setMesaj(null);
    setBekle(true);
    try {
      await istek();
      setMesaj({ tur: 'ok', metin: basari });
    } catch (e) {
      setMesaj({ tur: 'hata', metin: e.message });
    } finally {
      setBekle(false);
    }
  };

  const kaydet = () => islem(() => api('/api/whatsapp', { method: 'PUT', govde: ayar }), '✓ Bot bildirim ayarları başarıyla güncellendi.');

  const testGonder = () =>
    islem(async () => {
      await api('/api/whatsapp', { method: 'PUT', govde: ayar });
      await api('/api/whatsapp/test', { method: 'POST' });
    }, '✓ Test bülteni WhatsApp üzerinden başarıyla iletildi!');

  if (!ayar) {
    return mesaj ? <div className="error-msg">{mesaj.metin}</div> : <div className="loading-hint">WhatsApp Bot modülü yükleniyor…</div>;
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Üst Cockpit */}
      <div className="panel" style={{ padding: 14, background: '#131722', border: '1px solid #2a2e39', borderRadius: 8 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 22, color: '#25D366' }}>💬</span>
            <div>
              <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: '#f0f3fa' }}>WhatsApp Günlük Bülten & Alarm Botu</h3>
              <p style={{ margin: 0, fontSize: 12, color: '#787b86' }}>
                BIST seans kapanışı ardından günlük portföy değerleme özeti ve anlık alarm bildirimleri
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span
              style={{
                fontSize: 12,
                background: twilio ? 'rgba(37, 211, 102, 0.15)' : 'rgba(255, 152, 0, 0.15)',
                color: twilio ? '#25D366' : '#FF9800',
                padding: '4px 10px',
                borderRadius: 6,
                fontWeight: 600
              }}
            >
              {twilio ? '🟢 Twilio SMS/WA Gateway Hazır' : '🟡 Simülasyon Test Modu (Twilio Pasif)'}
            </span>
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(320px, 420px) 1fr', gap: 16 }}>
        {/* Sol Kolon: Yapılandırma Formu */}
        <div className="panel" style={{ padding: 16, background: '#131722', border: '1px solid #2a2e39', borderRadius: 8, display: 'flex', flexDirection: 'column', gap: 14 }}>
          <h4 style={{ margin: 0, fontSize: 15, color: '#f0f3fa', borderBottom: '1px solid #2a2e39', paddingBottom: 8 }}>
            ⚙️ Bot Yapılandırması
          </h4>

          {!twilio && (
            <div style={{ padding: 10, background: 'rgba(255, 152, 0, 0.08)', border: '1px solid rgba(255, 152, 0, 0.25)', borderRadius: 6, fontSize: 11.5, color: '#d1d4dc' }}>
              ℹ️ Gerçek WhatsApp gönderimi için <code>backend/.env</code> dosyasındaki <code>TWILIO_ACCOUNT_SID</code> ve <code>TWILIO_AUTH_TOKEN</code> değişkenlerini tanımlayın.
            </div>
          )}

          <div>
            <label style={{ fontSize: 11, color: '#787b86' }}>Hedef Telefon Numarası (Uluslararası Biçim)</label>
            <input
              value={ayar.telefon}
              placeholder="+905551234567"
              onChange={e => degistir('telefon', e.target.value.replace(/\s/g, ''))}
              style={{ width: '100%', marginTop: 4, fontFamily: 'monospace', fontWeight: 600 }}
            />
          </div>

          <div>
            <label style={{ fontSize: 11, color: '#787b86' }}>Günlük Rapor Gönderim Saati (TSI)</label>
            <input
              type="time"
              value={ayar.saat}
              onChange={e => degistir('saat', e.target.value)}
              style={{ width: '100%', marginTop: 4, fontFamily: 'monospace' }}
            />
            <span style={{ fontSize: 11, color: '#787b86', display: 'block', marginTop: 2 }}>Öneri: Seans kapanışı 18:10</span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, background: '#1e222d', padding: 12, borderRadius: 6 }}>
            <span style={{ fontSize: 12, fontWeight: 600, color: '#f0f3fa' }}>Bültende Yer Alacak Modüller:</span>

            <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: '#d1d4dc', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={ayar.piyasa}
                onChange={e => degistir('piyasa', e.target.checked)}
                style={{ accentColor: '#25D366' }}
              />
              <span>📈 BIST 100 & Endeks Kapanış Özeti</span>
            </label>

            <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: '#d1d4dc', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={ayar.portfoy}
                onChange={e => degistir('portfoy', e.target.checked)}
                style={{ accentColor: '#25D366' }}
              />
              <span>💼 Portföy Günlük Değeri ve Kâr/Zarar</span>
            </label>

            <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: '#d1d4dc', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={ayar.alarmlar}
                onChange={e => degistir('alarmlar', e.target.checked)}
                style={{ accentColor: '#25D366' }}
              />
              <span>🔔 Tetiklenen Fiyat Alarmları Listesi</span>
            </label>

            <hr style={{ border: 'none', borderTop: '1px solid #2a2e39', margin: '4px 0' }} />

            <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: '#089981', fontWeight: 600, cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={ayar.aktif}
                onChange={e => degistir('aktif', e.target.checked)}
                style={{ accentColor: '#089981' }}
              />
              <span>🚀 Otomatik Günlük Gönderimi Aktif Et</span>
            </label>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <button
              className="primary"
              onClick={kaydet}
              disabled={bekle}
              style={{ width: '100%', padding: '10px 0', borderRadius: 6, fontWeight: 600, fontSize: 13 }}
            >
              💾 Ayarları Kaydet
            </button>
            <button
              className="logout-btn"
              onClick={testGonder}
              disabled={bekle}
              style={{ width: '100%', padding: '9px 0', borderRadius: 6, fontSize: 12, border: '1px solid #25D366', color: '#25D366' }}
            >
              📲 Şimdi Canlı Test Gönder
            </button>
          </div>

          {mesaj && (
            <div className={mesaj.tur === 'ok' ? 'ok-msg' : 'error-msg'} style={{ fontSize: 12 }}>
              {mesaj.metin}
            </div>
          )}
        </div>

        {/* Sağ Kolon: WhatsApp Akıllı Telefon Arayüz Simülasyonu */}
        <div className="panel" style={{ padding: 16, background: '#131722', border: '1px solid #2a2e39', borderRadius: 8, display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontWeight: 600, fontSize: 14, color: '#f0f3fa' }}>Canlı Mesaj Önizlemesi</span>
            <span style={{ fontSize: 11, color: '#787b86' }}>WhatsApp Dark Mode Simülasyonu</span>
          </div>

          {/* WhatsApp Telefon Ekranı Mockup */}
          <div
            style={{
              background: '#0b141a',
              borderRadius: 12,
              border: '1px solid #222d34',
              overflow: 'hidden',
              boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
              display: 'flex',
              flexDirection: 'column'
            }}
          >
            {/* WhatsApp Üst Başlık */}
            <div style={{ background: '#202c33', padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 10, borderBottom: '1px solid #222d34' }}>
              <div style={{ width: 34, height: 34, borderRadius: '50%', background: '#00a884', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, color: '#fff', fontSize: 14 }}>
                P
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: '#e9edef', display: 'flex', alignItems: 'center', gap: 4 }}>
                  <span>Plutos BIST Trading Desk</span>
                  <span style={{ color: '#00a884', fontSize: 11 }}>✓</span>
                </div>
                <div style={{ fontSize: 11, color: '#8696a0' }}>çevrimiçi • Algoritmik Bot</div>
              </div>
            </div>

            {/* Mesaj Gövdesi */}
            <div style={{ padding: 16, background: '#0b141a', minHeight: 320, display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div style={{ alignSelf: 'center', background: '#182229', color: '#8696a0', padding: '3px 10px', borderRadius: 6, fontSize: 10.5, fontWeight: 600 }}>
                BUGÜN
              </div>

              {/* Mesaj Balonu */}
              <div
                style={{
                  alignSelf: 'flex-start',
                  maxWidth: '90%',
                  background: '#202c33',
                  borderRadius: '0 8px 8px 8px',
                  padding: '10px 14px',
                  color: '#e9edef',
                  fontSize: 12.5,
                  lineHeight: 1.5,
                  boxShadow: '0 1px 2px rgba(0,0,0,0.2)'
                }}
              >
                {onizleme ? (
                  onizleme.split('\n').map((satir, i) => (
                    <div key={i} style={{ minHeight: satir ? undefined : 6 }}>
                      {satir.split(/(\*[^*]+\*)/g).map((parca, j) => {
                        if (parca.startsWith('*') && parca.endsWith('*')) {
                          return <strong key={j} style={{ color: '#25D366' }}>{parca.slice(1, -1)}</strong>;
                        }
                        return <span key={j}>{parca}</span>;
                      })}
                    </div>
                  ))
                ) : (
                  <div>Önizleme yükleniyor...</div>
                )}
                <div style={{ textAlign: 'right', fontSize: 10, color: '#8696a0', marginTop: 4 }}>
                  {ayar.saat || '18:10'} ✓✓
                </div>
              </div>
            </div>
          </div>

          <p style={{ margin: 0, fontSize: 11, color: '#787b86' }}>
            ℹ️ Mesaj metni, seçtiğiniz portföy ve BIST piyasa parametrelerine göre dinamik olarak üretilir ve her gün belirlenen saatte otomatik olarak gönderilir.
          </p>
        </div>
      </div>
    </div>
  );
}

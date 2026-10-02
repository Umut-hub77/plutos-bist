import React, { useState, useEffect } from 'react';
import { HASSASIYET, useAyar } from '../ayarlar.jsx';

function karsilama() {
  const s = new Date().getHours();
  if (s >= 5 && s < 12) return 'Günaydın';
  if (s >= 12 && s < 18) return 'İyi Günler';
  if (s >= 18) return 'İyi Akşamlar';
  return 'İyi Geceler';
}

function PortfoyIslemleri({ api }) {
  const { portfoyDegisti } = useAyar();
  const [acik, setAcik] = useState(true);
  const [mod, setMod] = useState('Güncelle');
  const [portfoy, setPortfoy] = useState({});
  const [tickers, setTickers] = useState([]);
  const [mesaj, setMesaj] = useState(null);
  const [bekle, setBekle] = useState(false);

  const [secili, setSecili] = useState('');
  const [lot, setLot] = useState('');
  const [maliyet, setMaliyet] = useState('');
  const [yeniHisse, setYeniHisse] = useState('');
  const [yeniLot, setYeniLot] = useState(10);
  const [yeniMaliyet, setYeniMaliyet] = useState(10);

  const yukle = async () => {
    try {
      const [p, t] = await Promise.all([
        api('/api/portfolio/raw'),
        tickers.length ? { tickers } : api('/api/tickers')
      ]);
      setPortfoy(p.portfolio || {});
      setTickers(t.tickers || []);
      if (!yeniHisse && t.tickers?.length) setYeniHisse(t.tickers[0]);
    } catch (e) {
      setMesaj({ tur: 'hata', metin: e.message });
    }
  };

  useEffect(() => {
    yukle();
  }, []);

  const anahtarlar = Object.keys(portfoy);

  useEffect(() => {
    if (!anahtarlar.length) { setSecili(''); return; }
    const s = anahtarlar.includes(secili) ? secili : anahtarlar[0];
    setSecili(s);
    setLot(String(portfoy[s]?.lot || ''));
    setMaliyet(String(portfoy[s]?.maliyet || ''));
  }, [portfoy, secili]);

  const calistir = async (istek, basariMetni) => {
    setMesaj(null);
    setBekle(true);
    try {
      const r = await istek();
      setPortfoy(r.portfolio);
      setMesaj({ tur: 'ok', metin: basariMetni });
      portfoyDegisti();
    } catch (e) {
      setMesaj({ tur: 'hata', metin: e.message });
    } finally {
      setBekle(false);
    }
  };

  const kaydet = () =>
    calistir(
      () => api('/api/portfolio/' + secili, { method: 'PUT', govde: { lot: parseInt(lot, 10), maliyet: parseFloat(maliyet) } }),
      '✓ Pozisyon güncellendi'
    );

  const ekle = () =>
    calistir(
      () => api('/api/portfolio', { method: 'POST', govde: { hisse: yeniHisse, lot: parseInt(yeniLot, 10), maliyet: parseFloat(yeniMaliyet) } }),
      '✓ Portföye eklendi'
    );

  const sil = () =>
    calistir(
      () => api('/api/portfolio/' + secili, { method: 'DELETE' }),
      `✓ ${secili} portföyden çıkarıldı`
    );

  return (
    <div style={{ marginTop: 14, background: '#131722', border: '1px solid #2a2e39', borderRadius: 8, overflow: 'hidden' }}>
      <button
        style={{
          width: '100%',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '10px 14px',
          background: '#1e222d',
          border: 'none',
          color: '#f0f3fa',
          fontWeight: 600,
          fontSize: 13,
          cursor: 'pointer'
        }}
        onClick={() => setAcik(a => !a)}
      >
        <span>⚡ Hızlı Pozisyon Yönetimi</span>
        <span style={{ transform: acik ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}>▾</span>
      </button>

      {acik && (
        <div style={{ padding: 12, display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div className="segment">
            {['Güncelle', 'Ekle', 'Sil'].map(m => (
              <button
                key={m}
                className={mod === m ? 'aktif' : ''}
                onClick={() => { setMod(m); setMesaj(null); }}
                style={{ fontSize: 12 }}
              >
                {m}
              </button>
            ))}
          </div>

          {mod !== 'Ekle' && !anahtarlar.length && (
            <div style={{ fontSize: 12, color: '#787b86', padding: 8, textAlign: 'center' }}>
              Portföyünüzde kayıtlı hisse yok.
            </div>
          )}

          {mod === 'Güncelle' && anahtarlar.length > 0 && (
            <>
              <div>
                <label style={{ fontSize: 11, color: '#787b86' }}>Hisse Seç</label>
                <select value={secili} onChange={e => setSecili(e.target.value)} style={{ width: '100%', marginTop: 2 }}>
                  {anahtarlar.map(h => <option key={h}>{h}</option>)}
                </select>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                <div>
                  <label style={{ fontSize: 11, color: '#787b86' }}>Lot Adedi</label>
                  <input type="number" min="1" value={lot} onChange={e => setLot(e.target.value)} style={{ width: '100%', marginTop: 2 }} />
                </div>
                <div>
                  <label style={{ fontSize: 11, color: '#787b86' }}>Maliyet (₺)</label>
                  <input type="number" step="0.01" min="0" value={maliyet} onChange={e => setMaliyet(e.target.value)} style={{ width: '100%', marginTop: 2 }} />
                </div>
              </div>

              <button className="primary" onClick={kaydet} disabled={bekle} style={{ width: '100%', padding: '8px 0', fontSize: 12, fontWeight: 600 }}>
                Güncelle
              </button>
            </>
          )}

          {mod === 'Ekle' && (
            <>
              <div>
                <label style={{ fontSize: 11, color: '#787b86' }}>Yeni Hisse</label>
                <select value={yeniHisse} onChange={e => setYeniHisse(e.target.value)} style={{ width: '100%', marginTop: 2 }}>
                  {tickers.map(h => <option key={h}>{h}</option>)}
                </select>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                <div>
                  <label style={{ fontSize: 11, color: '#787b86' }}>Lot Adedi</label>
                  <input type="number" min="1" value={yeniLot} onChange={e => setYeniLot(e.target.value)} style={{ width: '100%', marginTop: 2 }} />
                </div>
                <div>
                  <label style={{ fontSize: 11, color: '#787b86' }}>Maliyet (₺)</label>
                  <input type="number" step="0.01" min="0" value={yeniMaliyet} onChange={e => setYeniMaliyet(e.target.value)} style={{ width: '100%', marginTop: 2 }} />
                </div>
              </div>

              <button className="primary" onClick={ekle} disabled={bekle} style={{ width: '100%', padding: '8px 0', fontSize: 12, fontWeight: 600 }}>
                Portföye Ekle
              </button>
            </>
          )}

          {mod === 'Sil' && anahtarlar.length > 0 && (
            <>
              <div>
                <label style={{ fontSize: 11, color: '#787b86' }}>Silinecek Hisse</label>
                <select value={secili} onChange={e => setSecili(e.target.value)} style={{ width: '100%', marginTop: 2 }}>
                  {anahtarlar.map(h => <option key={h}>{h}</option>)}
                </select>
              </div>
              <button
                className="primary tehlike"
                onClick={sil}
                disabled={bekle}
                style={{ width: '100%', padding: '8px 0', fontSize: 12, background: '#F23645' }}
              >
                Pozisyonu Sil
              </button>
            </>
          )}

          {mesaj && (
            <div className={mesaj.tur === 'ok' ? 'ok-msg' : 'error-msg'} style={{ fontSize: 11, padding: 6 }}>
              {mesaj.metin}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function Sidebar({ api, ad, soyad, onCikis, acik, kapat, onBankaModalAc, bagliBanka }) {
  const { hassasiyet, setHassasiyet, pPer, setPPer, periyotSecenekleri } = useAyar();
  const baharf = (ad || 'K')[0].toUpperCase();

  return (
    <>
      {acik && <div className="sidebar-perde" onClick={kapat} />}
      <aside className={'sidebar' + (acik ? ' acik' : '')} style={{ background: '#0e1118', borderRight: '1px solid #2a2e39', display: 'flex', flexDirection: 'column' }}>
        {/* Kullanıcı Profil Kartı */}
        <div style={{ padding: '16px 14px', background: '#131722', borderBottom: '1px solid #2a2e39', display: 'flex', alignItems: 'center', gap: 12 }}>
          <div
            style={{
              width: 38,
              height: 38,
              borderRadius: '50%',
              background: 'linear-gradient(135deg, #2962FF, #089981)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 800,
              fontSize: 16,
              color: '#fff',
              boxShadow: '0 0 10px rgba(41, 98, 255, 0.4)'
            }}
          >
            {baharf}
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 11, color: '#787b86' }}>{karsilama()},</div>
            <div style={{ fontSize: 14, fontWeight: 700, color: '#f0f3fa' }}>
              {`${ad || 'Kurumsal'} ${soyad || 'Trader'}`.trim()}
            </div>
            <span style={{ fontSize: 10, color: '#089981', fontWeight: 600, background: 'rgba(8, 153, 129, 0.15)', padding: '1px 6px', borderRadius: 3 }}>
              PRO TRADER
            </span>
          </div>
        </div>

        {/* Ayarlar ve Parametreler */}
        <div style={{ padding: 14, flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div>
            <label style={{ fontSize: 11, color: '#787b86' }}>Algoritma Hassasiyeti</label>
            <select
              value={hassasiyet}
              onChange={e => setHassasiyet(e.target.value)}
              style={{ width: '100%', marginTop: 4, background: '#131722', border: '1px solid #2a2e39', color: '#f0f3fa' }}
            >
              {Object.keys(HASSASIYET).map(h => <option key={h}>{h}</option>)}
            </select>
          </div>

          <div>
            <label style={{ fontSize: 11, color: '#787b86' }}>Geçmiş Veri Periyodu</label>
            <select
              value={pPer}
              onChange={e => setPPer(e.target.value)}
              style={{ width: '100%', marginTop: 4, background: '#131722', border: '1px solid #2a2e39', color: '#f0f3fa' }}
            >
              {periyotSecenekleri.map(o => <option key={o}>{o}</option>)}
            </select>
          </div>

          {/* Açık Bankacılık & Gerçek Portföy Bağlantısı */}
          <div style={{ marginTop: 2, display: 'flex', flexDirection: 'column', gap: 6 }}>
            <label style={{ fontSize: 11, color: '#787b86' }}>Açık Bankacılık Entegrasyonu</label>
            <button
              type="button"
              onClick={onBankaModalAc}
              style={{
                width: '100%',
                padding: '9px 12px',
                background: bagliBanka ? 'rgba(8, 153, 129, 0.12)' : 'rgba(255, 152, 0, 0.12)',
                border: `1px solid ${bagliBanka ? 'rgba(8, 153, 129, 0.4)' : 'rgba(255, 152, 0, 0.4)'}`,
                color: bagliBanka ? '#089981' : '#FF9800',
                borderRadius: 6,
                fontSize: 12,
                fontWeight: 600,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                transition: 'all 0.2s ease',
              }}
            >
              <span>🏛️</span>
              <span>{bagliBanka ? `${bagliBanka} (Bağlı)` : 'Gerçek Banka Portföyü Bağla'}</span>
            </button>
          </div>

          <PortfoyIslemleri api={api} />

          {/* Sistem Bilgi Kutusu */}
          <div style={{ marginTop: 12, padding: 10, background: '#131722', border: '1px solid #2a2e39', borderRadius: 6, fontSize: 11, color: '#787b86', display: 'flex', flexDirection: 'column', gap: 4 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>BIST Seans:</span>
              <span style={{ color: '#089981', fontWeight: 600 }}>10:00 - 18:05</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>Veri Akışı:</span>
              <span style={{ color: '#2962FF', fontWeight: 600 }}>FIX 4.4 / REST</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>Terminal Modu:</span>
              <span style={{ color: '#d1d4dc' }}>Canlı Simülasyon</span>
            </div>
          </div>
        </div>

        {/* Alt Çıkış & İmzalar */}
        <div style={{ padding: 14, borderTop: '1px solid #2a2e39', background: '#131722', display: 'flex', flexDirection: 'column', gap: 10 }}>
          <button
            className="cikis-btn"
            onClick={onCikis}
            style={{ width: '100%', padding: '8px 0', borderRadius: 6, background: 'rgba(242, 54, 69, 0.1)', color: '#F23645', border: '1px solid rgba(242, 54, 69, 0.3)', cursor: 'pointer', fontWeight: 600, fontSize: 12 }}
          >
            🔒 Güvenli Çıkış Yap
          </button>
          <div style={{ textAlign: 'center', fontSize: 10.5, color: '#555a65' }}>
            PLUTOS TRADING WORKSTATION © 2026
          </div>
        </div>
      </aside>
    </>
  );
}

import React, { useState, useEffect, useMemo } from 'react';
import { HASSASIYET, useAyar } from '../ayarlar.jsx';
import { KATEGORILER, UST_SEKMELER, MODUL_IKONLARI, ACIKLAMA } from '../nav.js';

function karsilama() {
  const s = new Date().getHours();
  if (s >= 5 && s < 12) return 'Günaydın';
  if (s >= 12 && s < 18) return 'İyi Günler';
  if (s >= 18) return 'İyi Akşamlar';
  return 'İyi Geceler';
}

function PortfoyIslemleri({ api }) {
  const { portfoyDegisti } = useAyar();
  const [acik, setAcik] = useState(false);
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
    if (acik) yukle();
  }, [acik]);

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
    <div style={{ background: '#131722', border: '1px solid #2a2e39', borderRadius: 8, overflow: 'hidden' }}>
      <button
        type="button"
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
          fontSize: 12.5,
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
                type="button"
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

export default function Sidebar({
  api,
  ad,
  soyad,
  onCikis,
  acik,
  kapat,
  onBankaModalAc,
  bagliBanka,
  kategori = 'Ana Sayfa',
  aktifModul = 'Ana Sayfa',
  onModulSec = () => {},
  bildirimSayisi = 0,
  onBildirimAc = () => {},
  onRehberAc = () => {},
  onTradeAllAc = () => {},
  accountMode = 'demo',
  onHesapModuDegistir = () => {},
  bakiye = 100000,
}) {
  const { hassasiyet, setHassasiyet, pPer, setPPer, periyotSecenekleri } = useAyar();
  const [aramaMetni, setAramaMetni] = useState('');
  const [genisleyenKat, setGenisleyenKat] = useState({
    'Analiz': true,
    'Portföy': true,
    'Araçlar': true,
  });

  const baharf = (ad || 'K')[0].toUpperCase();

  const toggleKategori = (kat) => {
    setGenisleyenKat(prev => ({ ...prev, [kat]: !prev[kat] }));
  };

  // Arama filtrelemesi
  const filtrelenmisSonuclar = useMemo(() => {
    if (!aramaMetni.trim()) return null;
    const aranan = aramaMetni.trim().toLowerCase();
    const sonuclar = [];
    if ('ana sayfa kokpit piyasa'.includes(aranan)) {
      sonuclar.push({ kat: 'Ana Sayfa', modul: 'Ana Sayfa', ikon: '🏛️' });
    }
    Object.entries(KATEGORILER).forEach(([kat, moduller]) => {
      moduller.forEach(m => {
        if (m.toLowerCase().includes(aranan) || kat.toLowerCase().includes(aranan)) {
          sonuclar.push({ kat, modul: m, ikon: MODUL_IKONLARI[m] || '📌' });
        }
      });
    });
    return sonuclar;
  }, [aramaMetni]);

  return (
    <>
      {acik && <div className="sidebar-perde" onClick={kapat} />}
      <aside className={'sidebar' + (acik ? ' acik' : '')}>
        {/* 1. Üst Başlık & Kullanıcı Profil Kartı & Kapat Butonu */}
        <div className="sidebar-profil-ust">
          <div className="sidebar-avatar-wrap">
            <div className="sidebar-avatar-daire">{baharf}</div>
            <div className="sidebar-kullanici-bilgi">
              <div className="sidebar-selam">{karsilama()},</div>
              <div className="sidebar-kullanici-ad">
                {`${ad || 'Kurumsal'} ${soyad || 'Trader'}`.trim()}
              </div>
              <div className="sidebar-rozet-satir">
                <span className="sidebar-pro-badge">PRO TRADER</span>
                <span className="sidebar-fix-badge">FIX 4.4</span>
              </div>
            </div>
          </div>
          <button
            type="button"
            className="sidebar-kapat-btn"
            onClick={kapat}
            aria-label="Menüyü Kapat"
            title="Kapat (ESC)"
          >
            ✕
          </button>
        </div>

        {/* 2. Hızlı Arama Kutusu */}
        <div className="sidebar-arama-kutu">
          <span className="sidebar-arama-ikon">🔍</span>
          <input
            type="text"
            className="sidebar-arama-input"
            value={aramaMetni}
            onChange={e => setAramaMetni(e.target.value)}
            placeholder="Modül veya araç ara…"
          />
          {aramaMetni && (
            <button
              type="button"
              className="sidebar-arama-temizle"
              onClick={() => setAramaMetni('')}
            >
              ×
            </button>
          )}
        </div>

        {/* 3. Hesap Durumu & Hızlı Mod Değiştirme Kartı */}
        <div className="sidebar-hesap-karti">
          <div className="sidebar-hesap-ust">
            <span className="sidebar-hesap-tur">
              {accountMode === 'real' ? '💼 GERÇEK BANKA PORTFÖYÜ' : '🎮 DEMO İŞLEM HESABI'}
            </span>
            <span className="sidebar-hesap-bakiye">
              {Number(bakiye || 0).toLocaleString('tr-TR')} ₺
            </span>
          </div>
          <div className="sidebar-hesap-butonlar">
            <button
              type="button"
              className={`sidebar-mod-btn ${accountMode === 'demo' ? 'aktif' : ''}`}
              onClick={() => onHesapModuDegistir('demo')}
            >
              🎮 Demo Masası
            </button>
            <button
              type="button"
              className={`sidebar-mod-btn ${accountMode === 'real' ? 'aktif' : ''}`}
              onClick={() => {
                if (bagliBanka) onHesapModuDegistir('real');
                else onBankaModalAc();
              }}
            >
              {bagliBanka ? `🏛️ ${bagliBanka}` : '🏛️ Banka Bağla'}
            </button>
          </div>
        </div>

        {/* 4. Kaydırılabilir Ana Menü Ağacı */}
        <div className="sidebar-govde-kaydir">
          {/* Arama Sonuçları Varsa */}
          {filtrelenmisSonuclar !== null ? (
            <div className="sidebar-arama-sonuclari">
              <div className="sidebar-bolum-baslik">
                Arama Sonuçları ({filtrelenmisSonuclar.length})
              </div>
              {filtrelenmisSonuclar.length === 0 ? (
                <div className="sidebar-bos-arama">Eşleşen modül bulunamadı.</div>
              ) : (
                filtrelenmisSonuclar.map(item => (
                  <button
                    key={item.kat + ':' + item.modul}
                    type="button"
                    className={`sidebar-nav-oge ${kategori === item.kat && aktifModul === item.modul ? 'secili' : ''}`}
                    onClick={() => {
                      onModulSec(item.kat, item.modul);
                      kapat();
                    }}
                  >
                    <span className="sidebar-oge-ikon">{item.ikon}</span>
                    <div className="sidebar-oge-metinler">
                      <span className="sidebar-oge-metin">{item.modul}</span>
                      <span className="sidebar-oge-kat">{item.kat}</span>
                    </div>
                  </button>
                ))
              )}
            </div>
          ) : (
            /* Standart Navigasyon Hiyerarşisi */
            <div className="sidebar-nav-agaci">
              <div className="sidebar-bolum-baslik">İŞLEM MASALARI & MODÜLLER</div>

              {/* Ana Sayfa */}
              <button
                type="button"
                className={`sidebar-nav-oge ana-kategori-btn ${kategori === 'Ana Sayfa' ? 'secili' : ''}`}
                onClick={() => {
                  onModulSec('Ana Sayfa', 'Ana Sayfa');
                  kapat();
                }}
              >
                <span className="sidebar-oge-ikon">🏛️</span>
                <span className="sidebar-oge-metin" style={{ fontWeight: 600 }}>Ana Sayfa Kokpiti</span>
                {kategori === 'Ana Sayfa' && <span className="sidebar-aktif-nokta" />}
              </button>

              {/* Analiz Masası (7 Modül) */}
              <div className="sidebar-kategori-grup">
                <button
                  type="button"
                  className="sidebar-kategori-baslik-btn"
                  onClick={() => toggleKategori('Analiz')}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span>📈</span>
                    <span className="sidebar-kategori-metin">Analiz Masası</span>
                    <span className="kategori-sayac">7</span>
                  </div>
                  <span className={`kategori-ok ${genisleyenKat['Analiz'] ? 'acik' : ''}`}>▾</span>
                </button>

                {genisleyenKat['Analiz'] && (
                  <div className="sidebar-alt-moduller">
                    {KATEGORILER['Analiz'].map(m => {
                      const aktif = kategori === 'Analiz' && aktifModul === m;
                      return (
                        <button
                          key={m}
                          type="button"
                          className={`sidebar-sub-oge ${aktif ? 'aktif' : ''}`}
                          onClick={() => {
                            onModulSec('Analiz', m);
                            kapat();
                          }}
                        >
                          <span className="sub-ikon">{MODUL_IKONLARI[m] || '📌'}</span>
                          <span
                            className="sidebar-modul-metin"
                            style={{
                              flex: 1,
                              textAlign: 'left',
                              fontSize: 12.5,
                              fontWeight: aktif ? 700 : 500,
                              color: aktif ? '#D7FF4E' : '#e0e3eb',
                              display: 'inline-block',
                            }}
                          >
                            {m}
                          </span>
                          {aktif && <span className="sub-aktif-isaret">✓</span>}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Portföy Masası (5 Modül) */}
              <div className="sidebar-kategori-grup">
                <button
                  type="button"
                  className="sidebar-kategori-baslik-btn"
                  onClick={() => toggleKategori('Portföy')}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span>💼</span>
                    <span className="sidebar-kategori-metin" style={{ color: '#f0f3fa', fontSize: 13, fontWeight: 600 }}>Portföy Masası</span>
                    <span className="kategori-sayac">5</span>
                  </div>
                  <span className={`kategori-ok ${genisleyenKat['Portföy'] ? 'acik' : ''}`}>▾</span>
                </button>

                {genisleyenKat['Portföy'] && (
                  <div className="sidebar-alt-moduller">
                    {KATEGORILER['Portföy'].map(m => {
                      const aktif = kategori === 'Portföy' && aktifModul === m;
                      return (
                        <button
                          key={m}
                          type="button"
                          className={`sidebar-sub-oge ${aktif ? 'aktif' : ''}`}
                          onClick={() => {
                            onModulSec('Portföy', m);
                            kapat();
                          }}
                        >
                          <span className="sub-ikon">{MODUL_IKONLARI[m] || '📌'}</span>
                          <span
                            className="sidebar-modul-metin"
                            style={{
                              flex: 1,
                              textAlign: 'left',
                              fontSize: 12.5,
                              fontWeight: aktif ? 700 : 500,
                              color: aktif ? '#D7FF4E' : '#e0e3eb',
                              display: 'inline-block',
                            }}
                          >
                            {m}
                          </span>
                          {aktif && <span className="sub-aktif-isaret">✓</span>}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Kurumsal Araçlar (4 Modül) */}
              <div className="sidebar-kategori-grup">
                <button
                  type="button"
                  className="sidebar-kategori-baslik-btn"
                  onClick={() => toggleKategori('Araçlar')}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span>🛠️</span>
                    <span className="sidebar-kategori-metin" style={{ color: '#f0f3fa', fontSize: 13, fontWeight: 600 }}>Kurumsal Araçlar</span>
                    <span className="kategori-sayac">4</span>
                  </div>
                  <span className={`kategori-ok ${genisleyenKat['Araçlar'] ? 'acik' : ''}`}>▾</span>
                </button>

                {genisleyenKat['Araçlar'] && (
                  <div className="sidebar-alt-moduller">
                    {KATEGORILER['Araçlar'].map(m => {
                      const aktif = kategori === 'Araçlar' && aktifModul === m;
                      return (
                        <button
                          key={m}
                          type="button"
                          className={`sidebar-sub-oge ${aktif ? 'aktif' : ''}`}
                          onClick={() => {
                            onModulSec('Araçlar', m);
                            kapat();
                          }}
                        >
                          <span className="sub-ikon">{MODUL_IKONLARI[m] || '📌'}</span>
                          <span
                            className="sidebar-modul-metin"
                            style={{
                              flex: 1,
                              textAlign: 'left',
                              fontSize: 12.5,
                              fontWeight: aktif ? 700 : 500,
                              color: aktif ? '#D7FF4E' : '#e0e3eb',
                              display: 'inline-block',
                            }}
                          >
                            {m}
                          </span>
                          {aktif && <span className="sub-aktif-isaret">✓</span>}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* 5. Hızlı Eylemler & Kısayollar */}
              <div className="sidebar-bolum-baslik" style={{ marginTop: 14 }}>
                HIZLI KISAYOLLAR & EYLEMLER
              </div>
              <div className="sidebar-kisayollar-grid">
                <button
                  type="button"
                  className="sidebar-kisayol-btn tradeall-btn"
                  onClick={() => {
                    kapat();
                    onTradeAllAc();
                  }}
                  title="TradeAll Hızlı Emir Masasını Aç"
                >
                  <span className="simsek">⚡</span>
                  <span>Hızlı Al-Sat</span>
                </button>

                <button
                  type="button"
                  className="sidebar-kisayol-btn rehber-btn"
                  onClick={() => {
                    kapat();
                    onRehberAc();
                  }}
                  title="Platform Rehberini Aç"
                >
                  <span>❓</span>
                  <span>Rehber</span>
                </button>

                <button
                  type="button"
                  className="sidebar-kisayol-btn bildirim-btn"
                  onClick={() => {
                    kapat();
                    onBildirimAc();
                  }}
                  title="Bildirim & Olay Merkezini Aç"
                >
                  <span>🔔</span>
                  <span>Bildirimler</span>
                  {bildirimSayisi > 0 && <span className="sayac">{bildirimSayisi}</span>}
                </button>

                <button
                  type="button"
                  className="sidebar-kisayol-btn banka-btn"
                  onClick={() => {
                    kapat();
                    onBankaModalAc();
                  }}
                  title="Açık Bankacılık ile Gerçek Portföy Bağla"
                >
                  <span>🏛️</span>
                  <span>{bagliBanka ? 'Banka Ayarı' : 'Banka Bağla'}</span>
                </button>
              </div>

              {/* 6. Algoritma ve Terminal Ayarları */}
              <div className="sidebar-bolum-baslik" style={{ marginTop: 14 }}>
                ALGORİTMA & TERMİNAL AYARLARI
              </div>
              <div className="sidebar-ayarlar-kutusu">
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

                <div style={{ marginTop: 8 }}>
                  <label style={{ fontSize: 11, color: '#787b86' }}>Geçmiş Veri Periyodu</label>
                  <select
                    value={pPer}
                    onChange={e => setPPer(e.target.value)}
                    style={{ width: '100%', marginTop: 4, background: '#131722', border: '1px solid #2a2e39', color: '#f0f3fa' }}
                  >
                    {periyotSecenekleri.map(o => <option key={o}>{o}</option>)}
                  </select>
                </div>
              </div>

              {/* 7. Hızlı Pozisyon Yönetimi */}
              <div style={{ marginTop: 12 }}>
                <PortfoyIslemleri api={api} />
              </div>

              {/* 8. Sistem Bilgi Kartı */}
              <div className="sidebar-sistem-kart">
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>BIST Seans:</span>
                  <span style={{ color: '#089981', fontWeight: 600 }}>10:00 - 18:05</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>Veri Akışı:</span>
                  <span style={{ color: '#2962FF', fontWeight: 600 }}>FIX 4.4 / REST</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>Gecikme:</span>
                  <span style={{ color: '#089981', fontWeight: 600 }}>~18 ms</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* 9. Alt Çıkış & Marka İmzası */}
        <div className="sidebar-alt-sabit">
          <button
            type="button"
            className="sidebar-cikis-btn"
            onClick={onCikis}
          >
            🔒 Güvenli Çıkış Yap
          </button>
          <div className="sidebar-telif">
            PLUTOS TRADING WORKSTATION © 2026
          </div>
        </div>
      </aside>
    </>
  );
}

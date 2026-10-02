import React, { useState, useEffect, useCallback, useMemo } from 'react';
import Logo from './components/Logo.jsx';
import { KATEGORILER, UST_SEKMELER, ACIKLAMA } from './nav.js';
import { SAYFALAR } from './pages/index.js';
import Yakinda from './pages/Yakinda.jsx';
import { apiOlustur } from './api.js';
import Sidebar from './components/Sidebar.jsx';
import { AyarProvider, useAyar } from './ayarlar.jsx';
import TutorialModal from './components/TutorialModal.jsx';
import TradeAllHizliEmirModal from './components/TradeAllHizliEmirModal.jsx';
import BankaBaglantiModal from './components/BankaBaglantiModal.jsx';

const YASAL_UYARI =
  'Bu platformdaki içerik, algoritmik sinyal, puan ve projeksiyonlar yatırım danışmanlığı kapsamında değildir ' +
  've yatırım tavsiyesi niteliği taşımaz. Yatırım kararlarınızı kendi araştırmanıza ve/veya yetkili bir yatırım danışmanına dayandırınız.';

const CANLI_BANT_VARSAYILAN = [
  { s: 'BIST 100', ad: 'BIST 100 Endeksi', kat: 'endeks', f: '12.249,04', d: '+2,53%', y: true },
  { s: 'BIST 30', ad: 'BIST 30 Endeksi', kat: 'endeks', f: '15.218,47', d: '+2,54%', y: true },
  { s: 'BIST BANKA', ad: 'Bankacılık Endeksi', kat: 'endeks', f: '15.699,83', d: '+1,94%', y: true },
  { s: 'BIST SINAİ', ad: 'Sınai Endeksi', kat: 'endeks', f: '15.971,71', d: '+2,34%', y: true },
  { s: 'USD/TRY', ad: 'Dolar / TL', kat: 'doviz', f: '49,03 ₺', d: '+0,04%', y: true },
  { s: 'EUR/TRY', ad: 'Euro / TL', kat: 'doviz', f: '55,23 ₺', d: '-0,69%', y: false },
  { s: 'GBP/TRY', ad: 'Sterlin / TL', kat: 'doviz', f: '64,15 ₺', d: '+0,12%', y: true },
  { s: 'GRAM ALTIN', ad: 'Gram Altın (Spot)', kat: 'emtia', f: '6.582,40 ₺', d: '+0,48%', y: true },
  { s: 'ÇEYREK ALTIN', ad: 'Çeyrek Altın', kat: 'emtia', f: '10.760,00 ₺', d: '+0,50%', y: true },
  { s: 'ONS ALTIN', ad: 'Ons Altın ($)', kat: 'emtia', f: '$4.175,50', d: '+0,48%', y: true },
  { s: 'GRAM GÜMÜŞ', ad: 'Gram Gümüş', kat: 'emtia', f: '96,75 ₺', d: '+2,09%', y: true },
  { s: 'ONS GÜMÜŞ', ad: 'Ons Gümüş ($)', kat: 'emtia', f: '$61,35', d: '+2,09%', y: true },
  { s: 'BRENT', ad: 'Brent Petrol ($/varil)', kat: 'emtia', f: '$102,39', d: '-0,93%', y: false },
  { s: 'HAM PETROL', ad: 'WTI Ham Petrol ($)', kat: 'emtia', f: '$93,19', d: '+1,15%', y: true },
  { s: 'DOĞALGAZ', ad: 'Doğalgaz (USD)', kat: 'emtia', f: '$2,95', d: '-2,35%', y: false },
  { s: 'ASELS', ad: 'Aselsan', kat: 'hisse', f: '370,00 ₺', d: '+9,96%', y: true },
  { s: 'TUPRS', ad: 'Tüpraş', kat: 'hisse', f: '387,00 ₺', d: '+2,86%', y: true },
  { s: 'THYAO', ad: 'Türk Hava Yolları', kat: 'hisse', f: '286,50 ₺', d: '+1,15%', y: true },
  { s: 'GARAN', ad: 'Garanti BBVA', kat: 'hisse', f: '126,20 ₺', d: '+2,69%', y: true },
  { s: 'KCHOL', ad: 'Koç Holding', kat: 'hisse', f: '209,90 ₺', d: '+0,72%', y: true },
  { s: 'EREGL', ad: 'Erdemir', kat: 'hisse', f: '36,62 ₺', d: '+1,89%', y: true },
  { s: 'BIMAS', ad: 'BİM Mağazaları', kat: 'hisse', f: '480,00 ₺', d: '+1,40%', y: true },
  { s: 'AKBNK', ad: 'Akbank', kat: 'hisse', f: '56,80 ₺', d: '+2,10%', y: true },
  { s: 'SISE', ad: 'Şişecam', kat: 'hisse', f: '42,30 ₺', d: '+0,95%', y: true },
  { s: 'FROTO', ad: 'Ford Otosan', kat: 'hisse', f: '985,00 ₺', d: '+1,65%', y: true },
  { s: 'PGSUS', ad: 'Pegasus', kat: 'hisse', f: '234,50 ₺', d: '+3,20%', y: true },
  { s: 'ISCTR', ad: 'İş Bankası', kat: 'hisse', f: '18,40 ₺', d: '+2,10%', y: true },
];

const KATEGORI_IKONLARI = {
  'Ana Sayfa': '🏛️',
  'Analiz': '📈',
  'Portföy': '💼',
  'Araçlar': '🛠️',
};

export default function Shell(props) {
  return (
    <AyarProvider>
      <ShellIc {...props} />
    </AyarProvider>
  );
}

function ShellIc({ token, ad, soyad, onCikis }) {
  const { portfoySurum } = useAyar();
  const [sidebarAcik, setSidebarAcik] = useState(false);
  const [kategori, setKategori] = useState('Ana Sayfa');
  const [modul, setModul] = useState({});
  const [bildirimSayisi, setBildirimSayisi] = useState(0);
  const [bildirimAcik, setBildirimAcik] = useState(false);
  const [bakiye, setBakiye] = useState(null);
  const [accountMode, setAccountMode] = useState('demo'); // 'demo' | 'real'
  const [bagliBanka, setBagliBanka] = useState('');
  const [bankaModalAcik, setBankaModalAcik] = useState(false);

  // TradeAll & TradingView Workstation Durumu
  const [saat, setSaat] = useState(() => new Date().toLocaleTimeString('tr-TR'));
  const [tradeAllModalAcik, setTradeAllModalAcik] = useState(false);

  useEffect(() => {
    const t = setInterval(() => {
      setSaat(new Date().toLocaleTimeString('tr-TR'));
    }, 1000);
    return () => clearInterval(t);
  }, []);

  // Canlı Ticker Durumu
  const [tickerListesi, setTickerListesi] = useState(CANLI_BANT_VARSAYILAN);
  const [tickerFiltre, setTickerFiltre] = useState('tumu'); // 'tumu' | 'hisse' | 'endeks' | 'emtia'
  const [duraklatildi, setDuraklatildi] = useState(false);

  // Platform Rehberi / Onboarding Tutorial State (İstenirse atlanabilir, bir daha gösterilmez)
  const [rehberAcik, setRehberAcik] = useState(() => {
    try {
      return localStorage.getItem('plutos_rehber_kapali') !== 'true';
    } catch (e) {
      return false;
    }
  });

  const api = useMemo(() => apiOlustur(token, onCikis), [token, onCikis]);

  const bildirimYenile = useCallback(() => {
    api('/api/alarms')
      .then(r => setBildirimSayisi(r.alarms.filter(a => a.tetiklendi).length))
      .catch(() => {});
    api('/api/portfolio')
      .then(p => {
        setBakiye(p.virtual_cash);
        setAccountMode(p.account_mode || 'demo');
        setBagliBanka(p.real_bank || '');
      })
      .catch(() => {});
  }, [api]);

  const hesapModuAyarla = async (yeniMod) => {
    try {
      await api('/api/account/switch-mode', { method: 'POST', govde: { mode: yeniMod } });
      setAccountMode(yeniMod);
      bildirimYenile();
    } catch {
      /* sessiz */
    }
  };

  useEffect(() => {
    bildirimYenile();
  }, [bildirimYenile]);

  // Canlı Ticker Bandı Verisi Çekme (İlk açılışta ve 45 saniyede bir)
  useEffect(() => {
    let iptal = false;
    const veriCek = () => {
      api('/api/ticker-tape')
        .then(r => {
          if (!iptal && r?.ticker && r.ticker.length) {
            setTickerListesi(r.ticker);
          }
        })
        .catch(() => {});
    };

    veriCek();
    const timer = setInterval(veriCek, 45000);
    return () => {
      iptal = true;
      clearInterval(timer);
    };
  }, [api]);

  // URL Hash yönlendirmesini dinleme (#stratejik, #emir, #portfoy, #tarayici)
  useEffect(() => {
    const handleHash = () => {
      const hash = window.location.hash;
      if (!hash) return;
      if (hash.startsWith('#stratejik')) {
        setBildirimAcik(false);
        setKategori('Analiz');
        setModul(m => ({ ...m, Analiz: 'Stratejik Analiz' }));
      } else if (hash.startsWith('#emir')) {
        setBildirimAcik(false);
        setKategori('Portföy');
        setModul(m => ({ ...m, Portföy: 'Emir Ver (Demo)' }));
      } else if (hash.startsWith('#portfoy')) {
        setBildirimAcik(false);
        setKategori('Portföy');
        setModul(m => ({ ...m, Portföy: 'Portföyüm' }));
      } else if (hash.startsWith('#tarayici')) {
        setBildirimAcik(false);
        setKategori('Analiz');
        setModul(m => ({ ...m, Analiz: 'Piyasa Tarayıcı' }));
      }
    };

    handleHash();
    window.addEventListener('hashchange', handleHash);
    return () => window.removeEventListener('hashchange', handleHash);
  }, []);

  const aktifModul = kategori === 'Ana Sayfa' ? 'Ana Sayfa' : (modul[kategori] || KATEGORILER[kategori][0]);
  const ekranAdi = bildirimAcik ? 'Bildirimler' : aktifModul;
  const Sayfa = SAYFALAR[ekranAdi];

  // Filtrelenmiş Ticker Listesi
  const filtrelenmisTicker = useMemo(() => {
    if (tickerFiltre === 'tumu') return tickerListesi;
    if (tickerFiltre === 'hisse') return tickerListesi.filter(x => x.kat === 'hisse');
    if (tickerFiltre === 'endeks') return tickerListesi.filter(x => x.kat === 'endeks');
    if (tickerFiltre === 'emtia') return tickerListesi.filter(x => x.kat === 'doviz' || x.kat === 'emtia');
    return tickerListesi;
  }, [tickerListesi, tickerFiltre]);

  const bist100Verisi = useMemo(() => {
    return tickerListesi.find(x => x.s === 'BIST 100') || { f: '12.249,04', d: '+2,53%' };
  }, [tickerListesi]);

  const hisseyeGit = (hisse) => {
    window.location.hash = `#stratejik?hisse=${hisse}`;
    setKategori('Analiz');
    setModul(m => ({ ...m, Analiz: 'Stratejik Analiz' }));
  };

  return (
    <div className="app-duzen">
      <Sidebar
        api={api}
        ad={ad}
        soyad={soyad}
        onCikis={onCikis}
        acik={sidebarAcik}
        kapat={() => setSidebarAcik(false)}
      />

      <div className="ana-alan">
        {/* 1. Canlı BIST & Finans Ticker Bandı ve Kontrolleri */}
        <div className="piyasa-bandi">
          {/* Sol Hızlı Kontrol Paneli */}
          <div className="ticker-kontroller">
            <button
              className="ticker-duraklat-btn"
              onClick={() => setDuraklatildi(d => !d)}
              title={duraklatildi ? 'Akışı Başlat' : 'Akışı Duraklat'}
            >
              {duraklatildi ? '▶️' : '⏸️'}
            </button>
            <button
              className={`ticker-chip ${tickerFiltre === 'tumu' ? 'aktif' : ''}`}
              onClick={() => setTickerFiltre('tumu')}
            >
              Tümü
            </button>
            <button
              className={`ticker-chip ${tickerFiltre === 'hisse' ? 'aktif' : ''}`}
              onClick={() => setTickerFiltre('hisse')}
            >
              BIST Hisseleri
            </button>
            <button
              className={`ticker-chip ${tickerFiltre === 'endeks' ? 'aktif' : ''}`}
              onClick={() => setTickerFiltre('endeks')}
            >
              Endeksler
            </button>
            <button
              className={`ticker-chip ${tickerFiltre === 'emtia' ? 'aktif' : ''}`}
              onClick={() => setTickerFiltre('emtia')}
            >
              Döviz & Emtia
            </button>
          </div>

          {/* Akan Fiyatlar Bandı */}
          <div
            className="piyasa-bandi-icerik"
            style={{ animationPlayState: duraklatildi ? 'paused' : undefined }}
          >
            {[...filtrelenmisTicker, ...filtrelenmisTicker].map((item, idx) => (
              <span
                key={idx}
                className="ticker-oge"
                onClick={() => {
                  if (item.kat === 'hisse') hisseyeGit(item.s);
                }}
                title={item.kat === 'hisse' ? `${item.ad} — Grafiğe ve Derinliğe Gitmek İçin Tıklayın` : item.ad}
              >
                <span className="etiket-kat">
                  {item.kat === 'hisse' ? 'HİSSE' : item.kat === 'endeks' ? 'ENDEKS' : item.kat === 'doviz' ? 'DÖVİZ' : 'EMTİA'}
                </span>
                <span className="sembol">{item.s}</span>
                <span className="sirket-ad">{item.ad}</span>
                <span className="fiyat">{item.f}</span>
                <span className={`fark ${item.y ? 'yukari' : 'asagi'}`}>
                  {item.y ? '▲' : '▼'} {item.d}
                </span>
              </span>
            ))}
          </div>
        </div>

        {/* 2. TradingView x TradeAll Hibrit Kurumsal Workstation Header */}
        <header className="header tradeall-workstation-header" style={{ background: '#131722', borderBottom: '1px solid #2A2E39' }}>
          <div className="header-sol">
            <button className="logout-btn hamburger" onClick={() => setSidebarAcik(true)} aria-label="Menüyü aç">
              ☰
            </button>
            <div className="brand" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Logo />
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span className="brand-logo-metin" style={{ fontFamily: 'Space Grotesk', fontWeight: 700, fontSize: 18, letterSpacing: 0.5, color: '#FFFFFF' }}>
                    PLUTOS
                  </span>
                  <span className="tradeall-pro-tag">WORKSTATION</span>
                  <span className="tradingview-fusion-pill">TradingView × TradeAll</span>
                </div>
                <span className="brand-alt-metin" style={{ fontSize: 9.5, color: '#787B86', letterSpacing: 0.5, fontWeight: 500 }}>
                  BIST KURUMSAL PORTFÖY & İŞLEM MASASI
                </span>
              </div>
            </div>
          </div>

          {/* Orta Alan: Canlı TSİ Seans Saati & BIST Durum Göstergesi */}
          <div className="header-orta-seans">
            <div className="tradeall-saat-kutu" title="Borsa İstanbul İşlem Saati (TSİ / UTC+3)">
              <span className="canli-nokta" />
              <span className="saat-metin">{saat} TSİ</span>
              <span className="seans-ayrac">•</span>
              <span className="seans-durum">SÜREKLİ MÜZAYEDE (10:00 - 18:05)</span>
            </div>
          </div>

          <div className="header-sag">
            {/* Hesap Modu Seçici (Demo vs Gerçek Banka) */}
            <div className="hesap-modu-anahtar" style={{ display: 'flex', alignItems: 'center', background: '#0B0E14', borderRadius: 8, padding: 3, border: '1px solid #2A2E39' }}>
              <button
                type="button"
                className={`hesap-mod-btn ${accountMode === 'demo' ? 'aktif-demo' : ''}`}
                onClick={() => hesapModuAyarla('demo')}
                title="100.000 ₺ Sanal BIST Demo İşlem Masası (Alım-Satım Aktif)"
                style={{
                  border: 'none',
                  borderRadius: 6,
                  padding: '5px 10px',
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: 'pointer',
                  background: accountMode === 'demo' ? '#089981' : 'transparent',
                  color: accountMode === 'demo' ? '#FFFFFF' : '#787B86',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 5,
                  transition: 'all 0.2s ease',
                }}
              >
                <span>🎮</span>
                <span className="btn-metin">Demo</span>
              </button>

              <button
                type="button"
                className={`hesap-mod-btn ${accountMode === 'real' ? 'aktif-real' : ''}`}
                onClick={() => {
                  if (bagliBanka) {
                    hesapModuAyarla('real');
                  } else {
                    setBankaModalAcik(true);
                  }
                }}
                title={bagliBanka ? `${bagliBanka} Portföyü (Salt Okunur)` : 'Açık Bankacılık ile Gerçek Portföy Bağla'}
                style={{
                  border: 'none',
                  borderRadius: 6,
                  padding: '5px 10px',
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: 'pointer',
                  background: accountMode === 'real' ? '#FF9800' : 'transparent',
                  color: accountMode === 'real' ? '#FFFFFF' : '#787B86',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 5,
                  transition: 'all 0.2s ease',
                }}
              >
                <span>💼</span>
                <span className="btn-metin">{bagliBanka ? bagliBanka : 'Banka Bağla'}</span>
                {accountMode === 'real' && (
                  <span style={{ fontSize: 9.5, background: 'rgba(0,0,0,0.3)', padding: '1px 5px', borderRadius: 4 }}>
                    Salt Okunur
                  </span>
                )}
              </button>
            </div>

            <div
              className="seans-durum-rozet"
              style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'default' }}
              title="Borsa İstanbul Pay Piyasası Seansı Açık (10:00 - 18:05)"
            >
              <span>BIST 100:</span>
              <b style={{ color: '#FFFFFF', fontFamily: 'JetBrains Mono' }}>{bist100Verisi.f}</b>
              <span style={{ color: bist100Verisi.y ? '#089981' : '#F23645', fontSize: 11, fontWeight: 700 }}>
                {bist100Verisi.d}
              </span>
            </div>

            {bakiye != null && (
              <div
                className="cockpit-bakiye-kutu"
                onClick={() => {
                  if (accountMode === 'real') {
                    setBankaModalAcik(true);
                  } else {
                    setTradeAllModalAcik(true);
                  }
                }}
                style={{
                  borderColor: accountMode === 'real' ? 'rgba(255,152,0,0.4)' : undefined,
                  background: accountMode === 'real' ? 'rgba(255,152,0,0.08)' : undefined,
                }}
                title={accountMode === 'real' ? `${bagliBanka} Yatırım Nakit Bakiyesi` : "Hesap Sanal Bakiyesi / Teminat — Hızlı Emir İçin Tıklayın"}
              >
                <span className="bakiye-etiket" style={{ color: accountMode === 'real' ? '#FF9800' : undefined }}>
                  {accountMode === 'real' ? 'GERÇEK NAKİT:' : 'PORTFÖY:'}
                </span>
                <span className="bakiye-deger">{Number(bakiye).toLocaleString('tr-TR')} ₺</span>
              </div>
            )}

            {/* TradeAll Hızlı Al-Sat Masası Açma Butonu */}
            <button
              className="tradeall-hizli-emir-btn"
              onClick={() => setTradeAllModalAcik(true)}
              title="TradeAll Hızlı Emir Masasını Aç (Tek tıkla BIST Pay Alış / Satış)"
            >
              <span className="simsek-ikon">⚡</span>
              <span className="btn-metin">Hızlı Al-Sat</span>
            </button>

            {/* Rehber Butonu */}
            <button
              className="logout-btn header-rehber-btn"
              onClick={() => setRehberAcik(true)}
              title="Platform Rehberi (Kullanım Kılavuzu)"
            >
              <span className="ikon">❓</span>
              <span className="btn-metin">Rehber</span>
            </button>

            {/* Bildirimler Butonu */}
            <button
              className="logout-btn header-bildirim-btn"
              onClick={() => setBildirimAcik(a => !a)}
              title="Bildirim & Olay Merkezi"
            >
              <span className="ikon">🔔</span>
              <span className="btn-metin">Bildirimler</span>
              {bildirimSayisi > 0 && <span className="sayac">{bildirimSayisi}</span>}
            </button>
          </div>
        </header>

        {/* 3. Ana Çalışma Alanı (Container) */}
        <main className="container" style={{ maxWidth: 1440 }}>
          {bildirimAcik ? (
            <div style={{ marginBottom: 14, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' }}>
              <button className="logout-btn geri" onClick={() => setBildirimAcik(false)} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '6px 12px', fontSize: 13 }}>
                <span>←</span>
                <span>Ana Panele Dön</span>
              </button>
              <span style={{ fontSize: 12, color: '#787B86' }}>Bildirim & Olay Merkezi</span>
            </div>
          ) : (
            <>
              {/* Ana Kategori Navigasyonu */}
              <nav className="nav-ust" style={{ borderColor: '#2A2E39', marginBottom: 12 }}>
                {UST_SEKMELER.map(k => (
                  <button
                    key={k}
                    className={k === kategori ? 'aktif' : ''}
                    onClick={() => setKategori(k)}
                    style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
                  >
                    <span>{KATEGORI_IKONLARI[k] || '📌'}</span>
                    <span>{k}</span>
                  </button>
                ))}
              </nav>

              {/* Alt Modül Navigasyonu */}
              {kategori !== 'Ana Sayfa' && (
                <div style={{ marginBottom: 16 }}>
                  <nav className="nav-alt" style={{ gap: 8 }}>
                    {KATEGORILER[kategori].map(m => (
                      <button
                        key={m}
                        className={m === aktifModul ? 'aktif' : ''}
                        onClick={() => setModul(s => ({ ...s, [kategori]: m }))}
                      >
                        {m}
                      </button>
                    ))}
                  </nav>
                  {ACIKLAMA[aktifModul] && (
                    <p className="nav-aciklama" style={{ fontSize: 12.5, color: '#787B86', marginTop: 8 }}>
                      ℹ️ {ACIKLAMA[aktifModul]}
                    </p>
                  )}
                </div>
              )}
            </>
          )}

          {/* Dinamik Sayfa Bileşeni */}
          <div className="sayfa" style={{ marginTop: 12 }}>
            {Sayfa ? (
              <Sayfa
                key={ekranAdi + ':' + portfoySurum}
                api={api}
                ad={ad}
                bildirimYenile={bildirimYenile}
                onModulDegistir={(kat, modAd) => {
                  setKategori(kat);
                  setModul(s => ({ ...s, [kat]: modAd }));
                }}
              />
            ) : (
              <Yakinda key={ekranAdi} modul={ekranAdi} />
            )}
          </div>

          <p className="yasal" style={{ background: '#131722', borderColor: '#2A2E39', color: '#787B86', marginTop: 40 }}>
            ⚠️ <b>Resmi Yasal Uyarı:</b> {YASAL_UYARI}
          </p>
        </main>
      </div>

      {/* İnteraktif Başlangıç & Platform Kullanım Rehberi */}
      <TutorialModal
        acik={rehberAcik}
        kapat={() => setRehberAcik(false)}
      />

      {/* TradeAll Hızlı İşlem Masası (Global Workstation Modal) */}
      <TradeAllHizliEmirModal
        acik={tradeAllModalAcik}
        kapat={() => setTradeAllModalAcik(false)}
        api={api}
        bildirimYenile={bildirimYenile}
      />

      {/* Açık Bankacılık Kurumsal Entegrasyon Modalı */}
      <BankaBaglantiModal
        acik={bankaModalAcik}
        kapat={() => setBankaModalAcik(false)}
        api={api}
        bagliBanka={bagliBanka}
        onBaglandi={() => {
          bildirimYenile();
        }}
      />
    </div>
  );
}

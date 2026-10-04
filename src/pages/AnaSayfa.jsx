import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { fmt, Yuzde, Tutar } from '../lib/format.jsx';
import PlotlyGrafik from '../components/PlotlyGrafik.jsx';
import FintablesKarneKart from '../components/FintablesKarneKart.jsx';
import TradingViewIsiHaritasi from '../components/TradingViewIsiHaritasi.jsx';

const BIST_SIRKETLERI = {
  THYAO: 'Türk Hava Yolları',
  GARAN: 'Garanti BBVA',
  ASELS: 'Aselsan Elektronik',
  EREGL: 'Ereğli Demir Çelik',
  TUPRS: 'Tüpraş Rafinerileri',
  KCHOL: 'Koç Holding',
  BIMAS: 'BİM Birleşik Mağazalar',
  AKBNK: 'Akbank',
  YKBNK: 'Yapı Kredi Bankası',
  SAHOL: 'Sabancı Holding',
  SISE: 'Şişecam Fabrikaları',
  TCELL: 'Turkcell İletişim',
  PGSUS: 'Pegasus Hava Taşımacılığı',
  FROTO: 'Ford Otomotiv',
  TOASO: 'Tofaş Türk Otomobil',
  ENKAI: 'Enka İnşaat',
  KOZAL: 'Koza Altın',
  PETKM: 'Petkim Petrokimya',
  SASA: 'Sasa Polyester',
  HEKTS: 'Hektaş Ticaret',
  ISCTR: 'İş Bankası (C)',
  VAKBN: 'Vakıfbank',
  HALKB: 'Halkbank',
  EKGYO: 'Emlak Konut GYO',
};

// Seans içi BIST 100 dinamik eğrisi
function bist100FigurUret(noktalar = [], yukseklik = 195) {
  const varsayilanNoktalar = [
    { zaman: '10:00', fiyat: 12026.2 },
    { zaman: '10:30', fiyat: 12198.3 },
    { zaman: '11:00', fiyat: 12220.1 },
    { zaman: '11:30', fiyat: 12260.8 },
    { zaman: '12:00', fiyat: 12245.0 },
    { zaman: '12:30', fiyat: 12290.3 },
    { zaman: '13:00', fiyat: 12320.7 },
    { zaman: '13:30', fiyat: 12285.2 },
    { zaman: '14:00', fiyat: 12310.6 },
    { zaman: '14:30', fiyat: 12345.9 },
    { zaman: '15:00', fiyat: 12320.0 },
    { zaman: '15:30', fiyat: 12290.4 },
    { zaman: '16:00', fiyat: 12315.8 },
    { zaman: '16:30', fiyat: 12280.1 },
    { zaman: '17:00', fiyat: 12265.8 },
    { zaman: '17:30', fiyat: 12262.1 },
    { zaman: '18:00', fiyat: 12248.5 },
  ];

  const kaynak = noktalar && noktalar.length >= 5 ? noktalar : varsayilanNoktalar;
  const saatler = kaynak.map(p => p.zaman);
  const fiyatlar = kaynak.map(p => p.fiyat);
  const minF = Math.min(...fiyatlar);
  const maxF = Math.max(...fiyatlar);
  const fark = maxF - minF;
  const padding = Math.max(fark * 0.15, 25);
  const bazFiyat = fiyatlar[0];
  const sonFiyat = fiyatlar[fiyatlar.length - 1];
  const pozitif = sonFiyat >= bazFiyat;

  const data = [
    {
      type: 'scatter',
      mode: 'lines',
      x: saatler,
      y: fiyatlar,
      name: 'BIST 100',
      line: { color: pozitif ? '#089981' : '#F23645', width: 2.4 },
      hoverinfo: 'x+y',
      hovertemplate: '<b>%{x}</b><br>BIST 100: %{y:,.2f}<extra></extra>',
    },
    {
      type: 'scatter',
      mode: 'lines',
      x: [saatler[0], saatler[saatler.length - 1]],
      y: [bazFiyat, bazFiyat],
      name: 'Açılış Seviyesi',
      line: { color: '#FF9800', width: 1, dash: 'dot' },
      hoverinfo: 'skip',
    },
  ];

  const layout = {
    height: yukseklik,
    margin: { l: 20, r: 60, t: 10, b: 28 },
    paper_bgcolor: '#131722',
    plot_bgcolor: '#131722',
    dragmode: 'pan',
    uirevision: 'bist100_intraday',
    xaxis: {
      showgrid: true,
      gridcolor: 'rgba(42, 46, 57, 0.45)',
      tickfont: { size: 10, color: '#787B86', family: 'JetBrains Mono' },
      nticks: 10,
    },
    yaxis: {
      showgrid: true,
      gridcolor: 'rgba(42, 46, 57, 0.45)',
      tickfont: { size: 10, color: '#787B86', family: 'JetBrains Mono' },
      range: [Math.floor(minF - padding), Math.ceil(maxF + padding)],
      side: 'right',
      tickformat: ',.0f',
    },
    showlegend: false,
  };

  return { data, layout, minF, maxF, sonFiyat, bazFiyat };
}

export default function AnaSayfa({ api, ad, onModulDegistir }) {
  const [piyasa, setPiyasa] = useState(null);
  const [portfoy, setPortfoy] = useState(null);
  const [yukleniyor, setYukleniyor] = useState(true);
  const [hata, setHata] = useState('');
  const [liderSekme, setLiderSekme] = useState('yukselen'); // yukselen | dusen | hacim
  const [acikSoru, setAcikSoru] = useState(null);

  // Hibrit Platform Sekmesi: 'piyasa' (TradingView) | 'fintables' (Şirket Karneleri) | 'tradeall' (Hızlı Emirler)
  const [anaSekme, setAnaSekme] = useState('piyasa');

  const onHisseSec = useCallback((hisseKod) => {
    window.location.hash = `#stratejik?hisse=${hisseKod}`;
    onModulDegistir?.('Analiz', 'Stratejik Analiz');
  }, [onModulDegistir]);

  const onHizliAl = useCallback((hisseKod) => {
    window.location.hash = `#emir?hisse=${hisseKod}&yon=AL`;
    onModulDegistir?.('Portföy', 'Emir Ver (Demo)');
  }, [onModulDegistir]);

  // Görünüm Modu: 'sade' (Yeni başlayanlar için) | 'gelismis' (Profesyonel terminal)
  const [gorunumModu, setGorunumModu] = useState(() => {
    try {
      return localStorage.getItem('plutos_gorunum_modu') || 'sade';
    } catch (e) {
      return 'sade';
    }
  });

  const gorunumDegistir = (yeniMod) => {
    setGorunumModu(yeniMod);
    try {
      localStorage.setItem('plutos_gorunum_modu', yeniMod);
    } catch (e) {}
  };

  const yukle = useCallback(async () => {
    setYukleniyor(true);
    setHata('');
    try {
      const [p, f] = await Promise.all([
        api('/api/market-overview'),
        api('/api/portfolio'),
      ]);
      setPiyasa(p);
      setPortfoy(f);
    } catch (e) {
      setHata(e.message || 'Piyasa verileri alınamadı.');
    } finally {
      setYukleniyor(false);
    }
  }, [api]);

  useEffect(() => {
    yukle();
  }, [yukle]);

  const bistFig = useMemo(() => {
    return bist100FigurUret(piyasa?.bist100_intraday, gorunumModu === 'sade' ? 180 : 195);
  }, [piyasa, gorunumModu]);

  const hacimLiderleri = useMemo(() => {
    if (piyasa?.hacim_liderleri?.length) return piyasa.hacim_liderleri;
    return [
      { hisse: 'THYAO', fiyat: 289.75, degisim: 1.13, hacim: '12.8 Mlyr ₺' },
      { hisse: 'ASELS', fiyat: 372.75, degisim: 9.96, hacim: '9.4 Mlyr ₺' },
      { hisse: 'TUPRS', fiyat: 384.75, degisim: 2.86, hacim: '7.1 Mlyr ₺' },
      { hisse: 'GARAN', fiyat: 126.20, degisim: 2.69, hacim: '6.8 Mlyr ₺' },
      { hisse: 'EREGL', fiyat: 36.58, degisim: -0.11, hacim: '5.5 Mlyr ₺' },
      { hisse: 'KCHOL', fiyat: 211.90, degisim: 0.95, hacim: '4.9 Mlyr ₺' },
      { hisse: 'ISCTR', fiyat: 12.49, degisim: 2.10, hacim: '4.2 Mlyr ₺' },
      { hisse: 'PGSUS', fiyat: 141.20, degisim: 0.50, hacim: '3.8 Mlyr ₺' },
    ];
  }, [piyasa]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* 0. ÜST KONTROL & GÖRÜNÜM MODU SEÇİCİ */}
      <div
        className="kurumsal-kart"
        style={{
          padding: '12px 18px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 12,
          background: '#131722',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 18 }}>🏛️</span>
          <div>
            <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: '#FFFFFF' }}>
              BIST Yatırım & İşlem Kokpiti
            </h3>
            <span style={{ fontSize: 11.5, color: '#787B86' }}>
              {gorunumModu === 'sade'
                ? '🌱 Sade Görünüm: Yeni başlayanlar için anlaşılır ve ferah özet'
                : '⚡ Gelişmiş Görünüm: Profesyoneller için tam teşekküllü işlem terminali'}
            </span>
          </div>
        </div>

        {/* Görünüm Modu Butonları */}
        <div className="gorunum-secici">
          <button
            className={`gorunum-btn ${gorunumModu === 'sade' ? 'aktif' : ''}`}
            onClick={() => gorunumDegistir('sade')}
          >
            <span>🌱</span>
            <span>Sade Görünüm (Kolay)</span>
          </button>
          <button
            className={`gorunum-btn ${gorunumModu === 'gelismis' ? 'aktif' : ''}`}
            onClick={() => gorunumDegistir('gelismis')}
          >
            <span>⚡</span>
            <span>Gelişmiş Görünüm (Terminal)</span>
          </button>
        </div>
      </div>

      {hata && <div className="error-msg">{hata}</div>}

      {/* 1. ÜST BAĞLAM KARTI: SADE İSE HOŞ GELDİN, GELİŞMİŞ İSE 4 METRİK GRID */}
      {gorunumModu === 'sade' ? (
        <div className="baslangic-banner">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 14 }}>
            <div>
              <h2 style={{ fontSize: 20, color: '#FFFFFF', margin: 0 }}>
                Merhaba, {ad || 'Yatırımcı'} 👋
              </h2>
              <p style={{ margin: '6px 0 0', fontSize: 13, color: '#D1D4DC', lineHeight: 1.5, maxWidth: 650 }}>
                Hesabınıza tanımlanan <b>100.000 ₺ sanal nakit</b> ile gerçek paranızı riske atmadan dilediğiniz hissede pratik yapabilir, Borsa İstanbul'u güvenle öğrenebilirsiniz.
              </p>
            </div>

            <button
              className="arac-btn aktif"
              onClick={() => onHizliAl('THYAO')}
              style={{ padding: '10px 20px', fontSize: 13, fontWeight: 700, background: '#089981', borderColor: '#089981' }}
            >
              ⚡ Hemen Demo Hisse Al (Pratik Yap)
            </button>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12, marginTop: 18 }}>
            <div className="sade-kart" style={{ borderLeft: '4px solid #D7FF4E' }}>
              <span style={{ fontSize: 11, color: '#787B86', textTransform: 'uppercase', letterSpacing: 0.5, fontWeight: 600 }}>
                Toplam Varlığım
              </span>
              <div style={{ fontSize: 22, fontWeight: 700, color: '#FFFFFF', marginTop: 4, fontFamily: 'JetBrains Mono' }}>
                {portfoy ? fmt(portfoy.toplam_varlik, 0) + ' ₺' : '100.000 ₺'}
              </div>
              <span style={{ fontSize: 11.5, color: '#787B86', marginTop: 4, display: 'block' }}>
                Kullanılabilir nakit ve hisselerimin toplamı
              </span>
            </div>

            <div className="sade-kart" style={{ borderLeft: '4px solid #2962FF' }}>
              <span style={{ fontSize: 11, color: '#787B86', textTransform: 'uppercase', letterSpacing: 0.5, fontWeight: 600 }}>
                Kullanılabilir Sanal Nakit
              </span>
              <div style={{ fontSize: 22, fontWeight: 700, color: '#5B8DEF', marginTop: 4, fontFamily: 'JetBrains Mono' }}>
                {portfoy ? fmt(portfoy.virtual_cash, 0) + ' ₺' : '100.000 ₺'}
              </div>
              <span style={{ fontSize: 11.5, color: '#787B86', marginTop: 4, display: 'block' }}>
                Yeni hisse almak için hazır paranız
              </span>
            </div>

            <div className="sade-kart" style={{ borderLeft: '4px solid #089981' }}>
              <span style={{ fontSize: 11, color: '#787B86', textTransform: 'uppercase', letterSpacing: 0.5, fontWeight: 600 }}>
                Elimdeki Hisselerin Değeri
              </span>
              <div style={{ fontSize: 22, fontWeight: 700, color: '#089981', marginTop: 4, fontFamily: 'JetBrains Mono' }}>
                {portfoy ? fmt(portfoy.pozisyon_degeri, 0) + ' ₺' : '0 ₺'}
              </div>
              <span style={{ fontSize: 11.5, color: '#787B86', marginTop: 4, display: 'block' }}>
                {portfoy?.pozisyonlar?.length ? `${portfoy.pozisyonlar.length} farklı hisse tutuyorsunuz` : 'Henüz hisseniz yok'}
              </span>
            </div>
          </div>
        </div>
      ) : (
        <div className="kurumsal-grid-4">
          <div className="kurumsal-kart" style={{ borderTop: '3px solid #089981' }}>
            <div className="kurumsal-kart-baslik">
              <span>BIST 100 Endeksi</span>
              <span className="rozet-al">XU100</span>
            </div>
            <div className="kurumsal-kart-deger">
              {piyasa?.endeks?.deger != null ? fmt(piyasa.endeks.deger, 2) : '12.249,04'}
            </div>
            <div className="kurumsal-kart-alt">
              <span style={{ color: '#089981', fontWeight: 700, fontFamily: 'JetBrains Mono' }}>
                ▲ +{piyasa?.endeks?.degisim != null ? fmt(piyasa.endeks.degisim, 2) : '2.53'}%
              </span>
              <span>Gün İçi Hacim: 148 Mlyr ₺</span>
            </div>
          </div>

          <div className="kurumsal-kart" style={{ borderTop: '3px solid #2962FF' }}>
            <div className="kurumsal-kart-baslik">
              <span>BIST 30 Endeksi</span>
              <span className="rozet-al" style={{ color: '#2962FF', borderColor: 'rgba(41,98,255,0.4)', background: 'rgba(41,98,255,0.1)' }}>XU030</span>
            </div>
            <div className="kurumsal-kart-deger">
              {piyasa?.bist30?.deger != null ? fmt(piyasa.bist30.deger, 2) : '15.218,47'}
            </div>
            <div className="kurumsal-kart-alt">
              <span style={{ color: '#089981', fontWeight: 700, fontFamily: 'JetBrains Mono' }}>
                ▲ +{piyasa?.bist30?.degisim != null ? fmt(piyasa.bist30.degisim, 2) : '2.54'}%
              </span>
              <span>A.O.F: 15.180,20</span>
            </div>
          </div>

          <div className="kurumsal-kart" style={{ borderTop: '3px solid #D7FF4E' }}>
            <div className="kurumsal-kart-baslik">
              <span>BIST Bankacılık</span>
              <span className="rozet-al" style={{ color: '#D7FF4E', borderColor: 'rgba(215,255,78,0.4)', background: 'rgba(215,255,78,0.1)' }}>XBANK</span>
            </div>
            <div className="kurumsal-kart-deger">
              {piyasa?.bist_banka?.deger != null ? fmt(piyasa.bist_banka.deger, 2) : '15.699,83'}
            </div>
            <div className="kurumsal-kart-alt">
              <span style={{ color: '#089981', fontWeight: 700, fontFamily: 'JetBrains Mono' }}>
                ▲ +{piyasa?.bist_banka?.degisim != null ? fmt(piyasa.bist_banka.degisim, 2) : '1.94'}%
              </span>
              <span>Momentum: Güçlü</span>
            </div>
          </div>

          <div className="kurumsal-kart" style={{ borderTop: '3px solid #FF9800' }}>
            <div className="kurumsal-kart-baslik">
              <span>Toplam Portföy Değeri</span>
              <span style={{ color: '#D1D4DC', fontSize: 11 }}>Canlı Bakiye</span>
            </div>
            <div className="kurumsal-kart-deger" style={{ color: '#D7FF4E' }}>
              {portfoy ? fmt(portfoy.toplam_varlik, 0) + ' ₺' : '100.000 ₺'}
            </div>
            <div className="kurumsal-kart-alt">
              <span>Sanal Nakit: {portfoy ? fmt(portfoy.virtual_cash, 0) : '100.000'} ₺</span>
              <span style={{ color: '#089981' }}>Aktif</span>
            </div>
          </div>
        </div>
      )}

      {/* 2. HİBRİT PLATFORM SEKMELERİ (TRADINGVIEW × FINTABLES × TRADEALL) */}
      <div className="hibrit-nav-bar">
        <button
          className={`hibrit-tab ${anaSekme === 'piyasa' ? 'aktif' : ''}`}
          onClick={() => setAnaSekme('piyasa')}
        >
          <span>🗺️</span>
          <span>Piyasa & Isı Haritası (TradingView)</span>
        </button>
        <button
          className={`hibrit-tab ${anaSekme === 'fintables' ? 'aktif' : ''}`}
          onClick={() => setAnaSekme('fintables')}
        >
          <span>📋</span>
          <span>Şirket Karneleri & Temel Analiz (Fintables)</span>
        </button>
        <button
          className={`hibrit-tab ${anaSekme === 'tradeall' ? 'aktif' : ''}`}
          onClick={() => setAnaSekme('tradeall')}
        >
          <span>⚡</span>
          <span>Hızlı Al-Sat Masası & Liderler (TradeAll)</span>
        </button>
      </div>

      {/* ========================================================================= */}
      {/* SEKME 1: TRADINGVIEW ISI HARİTASI & BIST 100 TRENDİ                        */}
      {/* ========================================================================= */}
      {anaSekme === 'piyasa' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* TradingView Görsel Piyasa Isı Haritası */}
          <TradingViewIsiHaritasi onHisseSec={onHisseSec} onHizliAl={onHizliAl} />

          {/* BIST 100 Seans İçi Trend Grafiği */}
          <div className="kurumsal-kart" style={{ padding: 18 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 10, marginBottom: 12 }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <h4 style={{ color: '#FFFFFF', margin: 0, fontSize: 15 }}>📈 BIST 100 Seans İçi Trend & Seviyeler</h4>
                  <span className="seans-durum-rozet" style={{ fontSize: 10 }}>Canlı Seans</span>
                </div>
                <span style={{ fontSize: 12, color: '#787B86', marginTop: 4, display: 'block' }}>
                  Borsa İstanbul Pay Piyasası anlık trendi ve gün içi tepe/dip seviyeleri.
                </span>
              </div>

              <div style={{ textAlign: 'right' }}>
                <span style={{ fontSize: 20, fontWeight: 700, color: '#FFFFFF', fontFamily: 'JetBrains Mono' }}>
                  {piyasa?.endeks?.deger != null ? fmt(piyasa.endeks.deger, 2) : '12.249,04'} ₺
                </span>
                <div style={{ fontSize: 12, fontWeight: 700, color: '#089981' }}>
                  ▲ +{piyasa?.endeks?.degisim != null ? fmt(piyasa.endeks.degisim, 2) : '2.53'}% (Genel Hava Pozitif)
                </div>
              </div>
            </div>

            <PlotlyGrafik data={bistFig.data} layout={bistFig.layout} config={{ staticPlot: false, responsive: true }} />

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 8, fontSize: 11.5, color: '#787B86' }}>
              <span>Açılış: <b>{fmt(bistFig.bazFiyat, 2)}</b></span>
              <span>Günün En Düşüğü: <b style={{ color: '#F23645' }}>{fmt(bistFig.minF, 2)}</b></span>
              <span>Günün En Yükseği: <b style={{ color: '#089981' }}>{fmt(bistFig.maxF, 2)}</b></span>
              <span>Piyasa Durumu: <b style={{ color: '#089981' }}>284 Yükselen (%62 Alıcı)</b></span>
            </div>
          </div>

          {/* Döviz, Altın & Emtialar */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
              <h4 style={{ color: '#FFFFFF', margin: 0, fontSize: 14 }}>💰 Altın, Gümüş ve Döviz Göstergeleri</h4>
              <span style={{ fontSize: 11, color: '#787B86' }}>Serbest piyasa ve spot referans değerleri</span>
            </div>

            <div className="kurumsal-grid-4">
              <div className="sade-kart" style={{ borderTop: '3px solid #F5C451' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: 12, color: '#787B86', fontWeight: 600 }}>Gram Altın (Spot)</span>
                  <span className="rozet-al" style={{ color: '#F5C451', borderColor: 'rgba(245,196,81,0.4)', background: 'rgba(245,196,81,0.1)' }}>ALTIN</span>
                </div>
                <div style={{ fontSize: 20, fontWeight: 700, color: '#F5C451', margin: '6px 0', fontFamily: 'JetBrains Mono' }}>
                  6.582,40 ₺
                </div>
                <div style={{ fontSize: 11, color: '#787B86' }}>
                  Çeyrek Altın: <b>10.760 ₺</b> • Günlük: <span style={{ color: '#089981' }}>+0,48%</span>
                </div>
              </div>

              <div className="sade-kart" style={{ borderTop: '3px solid #D1D4DC' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: 12, color: '#787B86', fontWeight: 600 }}>Gram Gümüş</span>
                  <span className="rozet-al" style={{ color: '#D1D4DC', borderColor: 'rgba(209,212,220,0.4)', background: 'rgba(209,212,220,0.1)' }}>GÜMÜŞ</span>
                </div>
                <div style={{ fontSize: 20, fontWeight: 700, color: '#FFFFFF', margin: '6px 0', fontFamily: 'JetBrains Mono' }}>
                  96,75 ₺
                </div>
                <div style={{ fontSize: 11, color: '#787B86' }}>
                  Ons Gümüş: <b>$61,35</b> • Günlük: <span style={{ color: '#089981' }}>+2,09%</span>
                </div>
              </div>

              <div className="sade-kart" style={{ borderTop: '3px solid #2962FF' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: 12, color: '#787B86', fontWeight: 600 }}>Amerikan Doları</span>
                  <span className="rozet-al" style={{ color: '#2962FF', borderColor: 'rgba(41,98,255,0.4)', background: 'rgba(41,98,255,0.1)' }}>USD/TRY</span>
                </div>
                <div style={{ fontSize: 20, fontWeight: 700, color: '#FFFFFF', margin: '6px 0', fontFamily: 'JetBrains Mono' }}>
                  49,03 ₺
                </div>
                <div style={{ fontSize: 11, color: '#787B86' }}>
                  Euro: <b>55,23 ₺</b> • Sterlin: <b>64,15 ₺</b>
                </div>
              </div>

              <div className="sade-kart" style={{ borderTop: '3px solid #FF9800' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: 12, color: '#787B86', fontWeight: 600 }}>Brent Petrol</span>
                  <span className="rozet-al" style={{ color: '#FF9800', borderColor: 'rgba(255,152,0,0.4)', background: 'rgba(255,152,0,0.1)' }}>VARİL</span>
                </div>
                <div style={{ fontSize: 20, fontWeight: 700, color: '#FFFFFF', margin: '6px 0', fontFamily: 'JetBrains Mono' }}>
                  $102,39
                </div>
                <div style={{ fontSize: 11, color: '#787B86' }}>
                  Küresel varil fiyatı • Değişim: <span style={{ color: '#F23645' }}>-0,93%</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SEKME 2: FİNTABLES ŞİRKET SAĞLIK KARNELERİ & TEMEL ANALİZ                  */}
      {/* ========================================================================= */}
      {anaSekme === 'fintables' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div
            className="kurumsal-kart"
            style={{
              padding: '16px 20px',
              background: 'linear-gradient(135deg, rgba(41, 98, 255, 0.08) 0%, rgba(215, 255, 78, 0.06) 100%)',
              border: '1px solid #2A2E39',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
              <div>
                <h4 style={{ color: '#FFFFFF', margin: 0, fontSize: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span>📋</span>
                  <span>Fintables Şirket Sağlık Karneleri & Değerleme Rasyoları</span>
                </h4>
                <span style={{ fontSize: 12.5, color: '#787B86', marginTop: 4, display: 'block', maxWidth: 750 }}>
                  Şirketlerin finansal sağlığı 3 temel ayakta (<b>Karlılık</b>, <b>Büyüme</b>, <b>Borçluluk</b>) 15 şeffaf kriterle incelenir. 10 üzerinden Fintables Skoru ve temel rasyo hapları tek bakışta anlaşılır.
                </span>
              </div>
              <span style={{ fontSize: 11.5, color: '#D7FF4E', background: 'rgba(215, 255, 78, 0.12)', border: '1px solid rgba(215, 255, 78, 0.3)', padding: '5px 12px', borderRadius: 6, fontWeight: 700 }}>
                FİNTABLES ANALİZİ
              </span>
            </div>
          </div>

          {/* BIST Şirketleri Fintables Karne Listesi */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {['THYAO', 'ASELS', 'TUPRS', 'GARAN', 'KCHOL', 'EREGL', 'BIMAS', 'SISE'].map(sembol => {
              const hisseFiyat =
                sembol === 'THYAO' ? 289.75 :
                sembol === 'ASELS' ? 372.75 :
                sembol === 'TUPRS' ? 384.75 :
                sembol === 'GARAN' ? 126.20 :
                sembol === 'KCHOL' ? 211.90 :
                sembol === 'EREGL' ? 36.58 :
                sembol === 'BIMAS' ? 409.50 : 37.40;
              const hisseDegisim =
                sembol === 'THYAO' ? 1.13 :
                sembol === 'ASELS' ? 9.96 :
                sembol === 'TUPRS' ? 2.86 :
                sembol === 'GARAN' ? 2.69 :
                sembol === 'KCHOL' ? 0.95 :
                sembol === 'EREGL' ? -0.11 :
                sembol === 'BIMAS' ? 0.38 : 0.16;

              return (
                <FintablesKarneKart
                  key={sembol}
                  hisse={sembol}
                  fiyat={hisseFiyat}
                  degisim={hisseDegisim}
                  onHizliAl={onHizliAl}
                  onGrafikGit={onHisseSec}
                  varsayilanAcik={sembol === 'THYAO'}
                />
              );
            })}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SEKME 3: TRADEALL HIZLI EMİR MASASI & PİYASA LİDERLERİ                    */}
      {/* ========================================================================= */}
      {anaSekme === 'tradeall' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Piyasa Dengesi (Market Breadth) */}
          <div className="piyasa-dengesi-kutu" style={{ margin: 0 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, fontWeight: 600 }}>
              <span style={{ color: '#089981' }}>284 Yükselen (%62)</span>
              <span style={{ color: '#787B86' }}>48 Yatay</span>
              <span style={{ color: '#F23645' }}>158 Düşen (%38)</span>
            </div>
            <div className="piyasa-dengesi-bar">
              <div className="piyasa-bar-yukselen" style={{ width: '62%' }} />
              <div className="piyasa-bar-yatay" style={{ width: '10%' }} />
              <div className="piyasa-bar-dusen" style={{ width: '28%' }} />
            </div>
            <div style={{ fontSize: 11, color: '#787B86', textAlign: 'center' }}>
              BIST Genel Piyasa Hissi: <b style={{ color: '#089981' }}>BOĞA AĞIRLIKLI (%62 ALICI BASKISI)</b>
            </div>
          </div>

          {/* Lider Tablosu */}
          <div className="kurumsal-kart" style={{ padding: 18 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12, marginBottom: 14 }}>
              <div style={{ display: 'flex', gap: 8 }}>
                <button
                  className={`arac-btn ${liderSekme === 'yukselen' ? 'aktif' : ''}`}
                  onClick={() => setLiderSekme('yukselen')}
                >
                  🚀 En Çok Yükselenler ({piyasa?.en_cok_yukselen?.length || 0})
                </button>
                <button
                  className={`arac-btn ${liderSekme === 'dusen' ? 'aktif' : ''}`}
                  onClick={() => setLiderSekme('dusen')}
                >
                  🔻 En Çok Düşenler ({piyasa?.en_cok_dusen?.length || 0})
                </button>
                <button
                  className={`arac-btn ${liderSekme === 'hacim' ? 'aktif' : ''}`}
                  onClick={() => setLiderSekme('hacim')}
                >
                  📊 Hacim Liderleri ({hacimLiderleri.length})
                </button>
              </div>
              <span style={{ fontSize: 11, color: '#787B86' }}>TradeAll Anlık BIST Verisi</span>
            </div>

            <div style={{ overflowX: 'auto' }}>
              <table>
                <thead>
                  <tr>
                    <th>Hisse & Şirket</th>
                    <th>Son Fiyat</th>
                    <th>Günlük Değişim</th>
                    <th>{liderSekme === 'hacim' ? 'İşlem Hacmi' : 'Trend'}</th>
                    <th style={{ textAlign: 'right' }}>TradeAll İşlem</th>
                  </tr>
                </thead>
                <tbody>
                  {liderSekme === 'yukselen' &&
                    (piyasa?.en_cok_yukselen || []).map(s => (
                      <tr key={s.hisse}>
                        <td>
                          <div className="tablo-hisse-hucre">
                            <span className="kod">{s.hisse}</span>
                            <span className="ad">{BIST_SIRKETLERI[s.hisse] || 'BIST Şirketi'}</span>
                          </div>
                        </td>
                        <td style={{ fontWeight: 700, color: '#FFFFFF' }}>{fmt(s.fiyat)} ₺</td>
                        <td>
                          <span className="rozet-al">▲ +{fmt(s.degisim)}%</span>
                        </td>
                        <td style={{ color: '#089981' }}>Güçlü Alım</td>
                        <td style={{ textAlign: 'right' }}>
                          <div className="hisse-aksiyon-grup">
                            <button
                              className="btn-aksiyon-al"
                              onClick={() => onHizliAl(s.hisse)}
                              title={`${s.hisse} Hızlı Emir Masası`}
                            >
                              ⚡ Hızlı Al
                            </button>
                            <button
                              className="btn-aksiyon-grafik"
                              onClick={() => onHisseSec(s.hisse)}
                              title={`${s.hisse} Teknik Analiz Grafiği`}
                            >
                              Grafik ↗
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}

                  {liderSekme === 'dusen' &&
                    (piyasa?.en_cok_dusen || []).map(s => (
                      <tr key={s.hisse}>
                        <td>
                          <div className="tablo-hisse-hucre">
                            <span className="kod">{s.hisse}</span>
                            <span className="ad">{BIST_SIRKETLERI[s.hisse] || 'BIST Şirketi'}</span>
                          </div>
                        </td>
                        <td style={{ fontWeight: 700, color: '#FFFFFF' }}>{fmt(s.fiyat)} ₺</td>
                        <td>
                          <span className="rozet-sat">▼ {fmt(s.degisim)}%</span>
                        </td>
                        <td style={{ color: '#F23645' }}>Satış Baskısı</td>
                        <td style={{ textAlign: 'right' }}>
                          <div className="hisse-aksiyon-grup">
                            <button
                              className="btn-aksiyon-al"
                              onClick={() => onHizliAl(s.hisse)}
                            >
                              ⚡ Hızlı Al
                            </button>
                            <button
                              className="btn-aksiyon-grafik"
                              onClick={() => onHisseSec(s.hisse)}
                            >
                              Grafik ↗
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}

                  {liderSekme === 'hacim' &&
                    hacimLiderleri.map(s => (
                      <tr key={s.hisse}>
                        <td>
                          <div className="tablo-hisse-hucre">
                            <span className="kod">{s.hisse}</span>
                            <span className="ad">{BIST_SIRKETLERI[s.hisse] || 'BIST Şirketi'}</span>
                          </div>
                        </td>
                        <td style={{ fontWeight: 700, color: '#FFFFFF' }}>{fmt(s.fiyat)} ₺</td>
                        <td>
                          <span className={s.degisim >= 0 ? 'rozet-al' : 'rozet-sat'}>
                            {s.degisim >= 0 ? '▲ +' : '▼ '}{fmt(s.degisim)}%
                          </span>
                        </td>
                        <td style={{ color: '#D7FF4E', fontWeight: 600 }}>{s.hacim}</td>
                        <td style={{ textAlign: 'right' }}>
                          <div className="hisse-aksiyon-grup">
                            <button
                              className="btn-aksiyon-al"
                              onClick={() => onHizliAl(s.hisse)}
                            >
                              ⚡ Hızlı Al
                            </button>
                            <button
                              className="btn-aksiyon-grafik"
                              onClick={() => onHisseSec(s.hisse)}
                            >
                              Grafik ↗
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
      )}

      {/* 4. YENİ BAŞLAYANLAR İÇİN HIZLI BORSA REHBERİ (AKORDEON - SADE MODDA) */}
      {gorunumModu === 'sade' && (
        <div className="kurumsal-kart" style={{ padding: 18 }}>
          <h4 style={{ color: '#FFFFFF', margin: '0 0 10px', fontSize: 14 }}>
            📚 Yeni Başlayanlar İçin Temel Borsa Terimleri
          </h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {[
              {
                id: 'q1',
                baslik: 'Lot ne demektir?',
                cevap: 'Borsa İstanbul\'da "1 Lot", tam olarak 1 adet hisse senedine eşittir. Örneğin Aselsan fiyatı 372 ₺ iken 10 Lot alırsanız, toplam 3.720 ₺ değerinde 10 adet hisse almış olursunuz.',
              },
              {
                id: 'q2',
                baslik: 'Piyasa Emri ile Limit Emir arasındaki fark nedir?',
                cevap: 'Piyasa Emri: Hissenin o an tahtada bekleyen en iyi aktif fiyatından hemen alınmasını sağlar. Limit Emir: "Ben bu hisseye en fazla 365 ₺ veririm" diyerek kendi istediğiniz fiyatı belirlediğiniz ve fiyat oraya düşene kadar bekleyen emirdir.',
              },
              {
                id: 'q3',
                baslik: 'Borsa İstanbul hangi saatlerde açıktır?',
                cevap: 'Borsa İstanbul Pay Piyasası hafta içi her gün 10:00 ile 18:05 saatleri arasında kesintisiz olarak işlem görür. 09:40-09:55 arası ise açılış seansı (fiyat toplama) olarak çalışır.',
              },
              {
                id: 'q4',
                baslik: 'Temettü (Kâr Payı) nedir?',
                cevap: 'Kâr eden şirketlerin yıl sonunda elde ettikleri kazancın bir kısmını hisse sahiplerine nakit olarak dağıtmasıdır. Portföyünüzde hisse tuttukça düzenli pasif gelir elde etmenizi sağlar.',
              },
            ].map(item => (
              <div key={item.id} className="rehber-akordeon">
                <div
                  className="rehber-akordeon-baslik"
                  onClick={() => setAcikSoru(acikSoru === item.id ? null : item.id)}
                >
                  <span>{item.baslik}</span>
                  <span style={{ fontSize: 12, color: '#787B86' }}>{acikSoru === item.id ? '▲ Kapat' : '▼ Öğren'}</span>
                </div>
                {acikSoru === item.id && (
                  <div className="rehber-akordeon-icerik">
                    {item.cevap}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

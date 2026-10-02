import React, { useState, useEffect, useMemo, useCallback } from 'react';
import PlotlyGrafik from '../components/PlotlyGrafik.jsx';

// Sektör İkonları
const SEKTOR_IKONLARI = {
  'Tüm Sektörler': '🌐',
  'Bankacılık': '🏦',
  'Havacılık & Ulaştırma': '✈️',
  'Otomotiv & Sanayi': '🚗',
  'Perakende & Gıda': '🛒',
  'Demir-Çelik & Madencilik': '🏗️',
  'Enerji & Petrokimya': '⚡',
  'Teknoloji & Savunma': '💻',
  'Holding': '🏢',
  'GYO & Gayrimenkul': '🏙️',
  'Çimento & Yapı': '🧱',
  'Telekom & İletişim': '📡',
  'Sağlık & İlaç': '💊',
};

// Hazır Tarama Filtreleri
const FILTRELER = [
  { id: 'tumu', etiket: '⚡ Tümü' },
  { id: 'gunluk_yukselen', etiket: '🔥 Günün Yükselenleri' },
  { id: 'yillik_sampiyon', etiket: '🚀 Yıllık Şampiyonlar (%50+)' },
  { id: 'dusuk_pd_dd', etiket: '💎 Kelepir Çarpan (PD/DD ≤ 1.5)' },
  { id: 'dusuk_fk', etiket: '📉 Düşük F/K (≤ 8.0)' },
  { id: 'yuksek_temettu', etiket: '💰 Yüksek Temettü (≥ %3)' },
  { id: 'devler', etiket: '👑 BIST Devleri (100 Mr ₺+)' },
  { id: 'yuksek_roe', etiket: '⭐ Yüksek Kârlılık (ROE ≥ %30)' },
];

export default function HisseArastirma({ api, onModulDegistir }) {
  const [sektor, setSektor] = useState('Tüm Sektörler');
  const [filtre, setFiltre] = useState('tumu');
  const [sirala, setSirala] = useState('gunluk');
  const [yon, setYon] = useState('desc');
  const [arama, setArama] = useState('');
  const [gorunum, setGorunum] = useState('tablo'); // 'tablo' | 'grafik'

  const [veri, setVeri] = useState(null);
  const [yukleniyor, setYukleniyor] = useState(true);
  const [hata, setHata] = useState('');

  // Çoklu Karşılaştırma Seçimi
  const [seciliHisseler, setSeciliHisseler] = useState([]);
  const [kiyaslamaModal, setKiyaslamaModal] = useState(false);
  const [kiyaslamaVerisi, setKiyaslamaVerisi] = useState(null);
  const [kiyaslamaYukleniyor, setKiyaslamaYukleniyor] = useState(false);

  // Veri Çekme
  const veriYukle = useCallback(async () => {
    try {
      setYukleniyor(true);
      setHata('');
      const q = new URLSearchParams({
        sektor: sektor || 'Tumu',
        filtre,
        sirala,
        yon,
        arama,
      });
      const res = await api(`/api/research/screener?${q.toString()}`);
      setVeri(res);
    } catch (e) {
      setHata(e.message || 'Veriler yüklenirken hata oluştu.');
    } finally {
      setYukleniyor(false);
    }
  }, [api, sektor, filtre, sirala, yon, arama]);

  useEffect(() => {
    veriYukle();
  }, [veriYukle]);

  // Sıralama Değiştir
  const siralamayiDegistir = (alan) => {
    if (sirala === alan) {
      setYon(prev => (prev === 'desc' ? 'asc' : 'desc'));
    } else {
      setSirala(alan);
      // PD/DD ve F/K için varsayılan küçükten büyüğe (ucuz olan öne gelir)
      setYon(alan === 'pd_dd' || alan === 'fk' || alan === 'fd_favok' ? 'asc' : 'desc');
    }
  };

  // Hisse Seçimini Toggle Et
  const hisseSecimiToggle = (kod) => {
    setSeciliHisseler(prev => {
      if (prev.includes(kod)) {
        return prev.filter(k => k !== kod);
      }
      if (prev.length >= 4) {
        alert('En fazla 4 hisse aynı anda kıyaslanabilir.');
        return prev;
      }
      return [...prev, kod];
    });
  };

  // Karşılaştırma Modalı Aç
  const karsilastirmayiAc = async (ozelKodlar) => {
    const kodlar = ozelKodlar || seciliHisseler;
    if (kodlar.length < 2) {
      alert('Lütfen kıyaslamak için en az 2 hisse seçin.');
      return;
    }
    setKiyaslamaModal(true);
    setKiyaslamaYukleniyor(true);
    try {
      const res = await api(`/api/research/compare?hisseler=${encodeURIComponent(kodlar.join(','))}`);
      setKiyaslamaVerisi(res);
    } catch (e) {
      alert('Kıyaslama verisi alınamadı: ' + e.message);
    } finally {
      setKiyaslamaYukleniyor(false);
    }
  };

  // CSV İndirme
  const csvIndir = () => {
    if (!veri?.hisseler?.length) return;
    const basliklar = ['Kod', 'Şirket Adı', 'Sektör', 'Fiyat (TL)', 'Günlük (%)', 'Haftalık (%)', 'Aylık (%)', 'Yıllık (%)', 'PD/DD', 'F/K', 'FD/FAVÖK', 'Temettü Verimi (%)', 'ROE (%)', 'Piyasa Değeri (Mr TL)'];
    const satirlar = veri.hisseler.map(h => [
      h.kod, `"${h.ad}"`, `"${h.sektor}"`, h.fiyat, h.gunluk, h.haftalik, h.aylik, h.yillik, h.pd_dd, h.fk, h.fd_favok, h.temettu_verim, h.roe, h.piyasa_degeri
    ]);
    const csvIcerik = 'data:text/csv;charset=utf-8,\uFEFF' + [basliklar.join(','), ...satirlar.map(s => s.join(','))].join('\n');
    const encodedUri = encodeURI(csvIcerik);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Plutos_Arastirma_BIST_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Aktif Sektör Özeti
  const aktifSektorOzeti = useMemo(() => {
    if (!veri?.sektor_ozetleri) return null;
    return veri.sektor_ozetleri[sektor] || veri.sektor_ozetleri['Tüm Sektörler'];
  }, [veri, sektor]);

  // Scatter Bubble Chart Verisi (PD/DD vs Yıllık Getiri)
  const scatterFigur = useMemo(() => {
    if (!veri?.hisseler?.length) return null;
    const hisseler = veri.hisseler;

    const traces = [
      {
        type: 'scatter',
        mode: 'markers+text',
        x: hisseler.map(h => h.pd_dd),
        y: hisseler.map(h => h.yillik),
        text: hisseler.map(h => h.kod),
        textposition: 'top center',
        textfont: { family: 'JetBrains Mono', size: 10, color: '#D1D4DC' },
        marker: {
          size: hisseler.map(h => Math.max(12, Math.min(38, Math.sqrt(h.piyasa_degeri || 20) * 1.6))),
          color: hisseler.map(h => (h.gunluk >= 0 ? '#10b981' : '#ef4444')),
          opacity: 0.85,
          line: { color: '#ffffff', width: 1 },
        },
        hovertemplate:
          '<b>%{text}</b><br>' +
          'PD/DD: %{x:.2f}<br>' +
          '1 Yıllık Yükseliş: %{y:.1f}%<br>' +
          '<extra></extra>',
      },
    ];

    const layout = {
      height: 480,
      margin: { l: 55, r: 25, t: 40, b: 50 },
      paper_bgcolor: '#131722',
      plot_bgcolor: '#131722',
      title: {
        text: '🔬 Değerleme Çarpanı (PD/DD) vs 1 Yıllık Yükseliş (%) Dağılımı',
        font: { family: 'Inter', size: 14, color: '#F3F4F6' },
      },
      font: { family: 'JetBrains Mono', color: '#787B86', size: 11 },
      xaxis: {
        title: 'Piyasa Değeri / Defter Değeri (PD/DD) ➔ Düşük Olanlar Ucuzdur',
        gridcolor: 'rgba(42, 46, 57, 0.45)',
        zerolinecolor: '#363A45',
      },
      yaxis: {
        title: '1 Yıllık Performans (%) ➔ Yüksek Olanlar Şampiyondur',
        gridcolor: 'rgba(42, 46, 57, 0.45)',
        zerolinecolor: '#363A45',
      },
      annotations: [
        {
          x: 1.0,
          y: Math.max(...hisseler.map(h => h.yillik)) * 0.85,
          xref: 'x',
          yref: 'y',
          text: '🎯 Fırsat Bölgesi: Düşük PD/DD & Yüksek Getiri',
          showarrow: false,
          font: { color: '#10b981', size: 11 },
          bgcolor: 'rgba(16, 185, 129, 0.15)',
          bordercolor: '#10b981',
          borderwidth: 1,
          borderpad: 4,
        },
      ],
    };

    return { data: traces, layout };
  }, [veri]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* ÜST BAŞLIK & KONTROL PANELİ */}
      <div className="kurumsal-kart" style={{ padding: '18px 22px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 14 }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ fontSize: 24 }}>🔬</span>
              <h3 style={{ margin: 0, color: '#FFFFFF', fontWeight: 700, letterSpacing: '-0.3px' }}>
                BIST Sektörel Araştırma & Hisse Tarama Masası
              </h3>
              <span className="etiket etiket-yesil" style={{ fontSize: 10, padding: '2px 8px' }}>
                CANLI VERİ • 80+ ŞİRKET
              </span>
            </div>
            <p style={{ margin: '6px 0 0 0', fontSize: 13, color: '#9CA3AF' }}>
              Sektör bazlı değerleme çarpanları (<strong>PD/DD, F/K, FD/FAVÖK</strong>), anlık yüzde yükselişleri ve 1 yıllık getiri karşılaştırması.
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            {/* Arama Kutusu */}
            <div style={{ position: 'relative', width: 220 }}>
              <input
                type="text"
                placeholder="🔍 Hisse veya Şirket Ara..."
                value={arama}
                onChange={e => setArama(e.target.value)}
                style={{
                  width: '100%',
                  padding: '7px 12px',
                  background: '#1A1E29',
                  border: '1px solid #2A2E39',
                  borderRadius: 6,
                  color: '#FFFFFF',
                  fontSize: 12.5,
                }}
              />
              {arama && (
                <button
                  onClick={() => setArama('')}
                  style={{
                    position: 'absolute',
                    right: 8,
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'transparent',
                    border: 'none',
                    color: '#9CA3AF',
                    cursor: 'pointer',
                    fontSize: 12,
                  }}
                >
                  ✕
                </button>
              )}
            </div>

            {/* Görünüm Değiştirici */}
            <div style={{ display: 'inline-flex', background: '#1A1E29', padding: 3, borderRadius: 6, border: '1px solid #2A2E39' }}>
              <button
                onClick={() => setGorunum('tablo')}
                style={{
                  padding: '6px 12px',
                  background: gorunum === 'tablo' ? '#2962FF' : 'transparent',
                  color: gorunum === 'tablo' ? '#FFFFFF' : '#9CA3AF',
                  border: 'none',
                  borderRadius: 4,
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                }}
              >
                📋 Tablo
              </button>
              <button
                onClick={() => setGorunum('grafik')}
                style={{
                  padding: '6px 12px',
                  background: gorunum === 'grafik' ? '#2962FF' : 'transparent',
                  color: gorunum === 'grafik' ? '#FFFFFF' : '#9CA3AF',
                  border: 'none',
                  borderRadius: 4,
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                }}
              >
                📈 Dağılım Grafiği
              </button>
            </div>

            {/* CSV Dışa Aktar */}
            <button
              onClick={csvIndir}
              className="buton buton-ikincil"
              style={{ padding: '7px 13px', fontSize: 12, display: 'flex', alignItems: 'center', gap: 6 }}
              title="Araştırma verilerini Excel / CSV olarak indir"
            >
              📥 Excel/CSV
            </button>

            {/* Yenile */}
            <button
              onClick={veriYukle}
              className="buton buton-birincil"
              style={{ padding: '7px 13px', fontSize: 12, display: 'flex', alignItems: 'center', gap: 6 }}
              disabled={yukleniyor}
            >
              🔄 {yukleniyor ? 'Yenileniyor...' : 'Canlı Yenile'}
            </button>
          </div>
        </div>

        {/* SEKTÖR SEÇİM PİLL'LERİ (YATAY SCROLL) */}
        <div style={{ marginTop: 16, borderTop: '1px solid #2A2E39', paddingTop: 14 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, overflowX: 'auto', paddingBottom: 6 }}>
            {(veri?.sektorler || Object.keys(SEKTOR_IKONLARI)).map(s => {
              const aktif = sektor === s;
              const ikon = SEKTOR_IKONLARI[s] || '🏢';
              const hisseSayisi = veri?.sektor_ozetleri?.[s]?.sayi || '';
              return (
                <button
                  key={s}
                  onClick={() => setSektor(s)}
                  style={{
                    padding: '7px 14px',
                    borderRadius: 20,
                    border: aktif ? '1px solid #2962FF' : '1px solid #2A2E39',
                    background: aktif ? 'rgba(41, 98, 255, 0.18)' : '#1A1E29',
                    color: aktif ? '#38BDF8' : '#D1D4DC',
                    fontSize: 12,
                    fontWeight: aktif ? 600 : 500,
                    whiteSpace: 'nowrap',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    transition: 'all 0.15s ease',
                  }}
                >
                  <span>{ikon}</span>
                  <span>{s}</span>
                  {hisseSayisi ? (
                    <span
                      style={{
                        fontSize: 10,
                        padding: '1px 6px',
                        borderRadius: 10,
                        background: aktif ? '#2962FF' : '#2A2E39',
                        color: '#FFFFFF',
                      }}
                    >
                      {hisseSayisi}
                    </span>
                  ) : null}
                </button>
              );
            })}
          </div>
        </div>

        {/* SEKTÖR RÖNTGENİ & KPI KARTLARI */}
        {aktifSektorOzeti && (
          <div
            style={{
              marginTop: 14,
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
              gap: 12,
              background: '#0E1118',
              padding: 14,
              borderRadius: 8,
              border: '1px solid #1E232F',
            }}
          >
            <div>
              <div style={{ fontSize: 11, color: '#787B86', textTransform: 'uppercase', marginBottom: 2 }}>
                Sektör Ortalama PD/DD
              </div>
              <div style={{ fontSize: 20, fontWeight: 700, color: '#FFFFFF', display: 'flex', alignItems: 'baseline', gap: 8 }}>
                {aktifSektorOzeti.ort_pd_dd}x
                <span
                  style={{
                    fontSize: 11,
                    color: aktifSektorOzeti.ort_pd_dd < 2.0 ? '#10B981' : '#F59E0B',
                    fontWeight: 500,
                  }}
                >
                  {aktifSektorOzeti.ort_pd_dd < 2.0 ? '● İskontolu Sektör' : '● Primli Sektör'}
                </span>
              </div>
              <div style={{ fontSize: 11, color: '#9CA3AF', marginTop: 2 }}>
                En Kelepir: <strong style={{ color: '#10B981' }}>{aktifSektorOzeti.en_ucuz_pd_dd}</strong>
              </div>
            </div>

            <div>
              <div style={{ fontSize: 11, color: '#787B86', textTransform: 'uppercase', marginBottom: 2 }}>
                Sektör Ortalama F/K
              </div>
              <div style={{ fontSize: 20, fontWeight: 700, color: '#FFFFFF', display: 'flex', alignItems: 'baseline', gap: 8 }}>
                {aktifSektorOzeti.ort_fk}x
                <span style={{ fontSize: 11, color: '#9CA3AF' }}>FD/FAVÖK: {aktifSektorOzeti.ort_fd_favok}x</span>
              </div>
              <div style={{ fontSize: 11, color: '#9CA3AF', marginTop: 2 }}>
                Ort. ROE (Özsermaye Kârı): <strong style={{ color: '#60A5FA' }}>%{aktifSektorOzeti.ort_roe}</strong>
              </div>
            </div>

            <div>
              <div style={{ fontSize: 11, color: '#787B86', textTransform: 'uppercase', marginBottom: 2 }}>
                Ortalama Günlük Değişim
              </div>
              <div
                style={{
                  fontSize: 20,
                  fontWeight: 700,
                  color: aktifSektorOzeti.ort_gunluk >= 0 ? '#10B981' : '#EF4444',
                  display: 'flex',
                  alignItems: 'baseline',
                  gap: 8,
                }}
              >
                {aktifSektorOzeti.ort_gunluk >= 0 ? '+' : ''}%{aktifSektorOzeti.ort_gunluk}
                <span style={{ fontSize: 11, color: '#9CA3AF' }}>Lider: <strong style={{ color: '#10B981' }}>{aktifSektorOzeti.gunluk_lider}</strong></span>
              </div>
              <div style={{ fontSize: 11, color: '#9CA3AF', marginTop: 2 }}>
                Anlık yükseliş ortalaması
              </div>
            </div>

            <div>
              <div style={{ fontSize: 11, color: '#787B86', textTransform: 'uppercase', marginBottom: 2 }}>
                Ortalama 1 Yıllık Yükseliş
              </div>
              <div
                style={{
                  fontSize: 20,
                  fontWeight: 700,
                  color: aktifSektorOzeti.ort_yillik >= 0 ? '#10B981' : '#EF4444',
                  display: 'flex',
                  alignItems: 'baseline',
                  gap: 8,
                }}
              >
                {aktifSektorOzeti.ort_yillik >= 0 ? '+' : ''}%{aktifSektorOzeti.ort_yillik}
                <span style={{ fontSize: 11, color: '#9CA3AF' }}>Şampiyon: <strong style={{ color: '#F59E0B' }}>{aktifSektorOzeti.yillik_lider}</strong></span>
              </div>
              <div style={{ fontSize: 11, color: '#9CA3AF', marginTop: 2 }}>
                Ort. Temettü Verimi: <strong style={{ color: '#10B981' }}>%{aktifSektorOzeti.ort_temettu}</strong>
              </div>
            </div>
          </div>
        )}

        {/* AKILLI FİLTRE PRESETS */}
        <div style={{ marginTop: 14, display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
          <span style={{ fontSize: 11.5, color: '#787B86', fontWeight: 600 }}>Hızlı Tarama:</span>
          {FILTRELER.map(f => {
            const secili = filtre === f.id;
            return (
              <button
                key={f.id}
                onClick={() => setFiltre(f.id)}
                style={{
                  padding: '4px 10px',
                  borderRadius: 6,
                  border: secili ? '1px solid #10B981' : '1px solid #2A2E39',
                  background: secili ? 'rgba(16, 185, 129, 0.15)' : '#151924',
                  color: secili ? '#10B981' : '#9CA3AF',
                  fontSize: 11.5,
                  cursor: 'pointer',
                  fontWeight: secili ? 600 : 400,
                }}
              >
                {f.etiket}
              </button>
            );
          })}
        </div>
      </div>

      {/* HATA MESAJI */}
      {hata && (
        <div className="error-msg" style={{ margin: 0 }}>
          {hata}
        </div>
      )}

      {/* GÖRÜNÜM: DAĞILIM GRAFİĞİ (SCATTER PLOT) */}
      {gorunum === 'grafik' && scatterFigur && (
        <div className="kurumsal-kart" style={{ padding: 18 }}>
          <PlotlyGrafik data={scatterFigur.data} layout={scatterFigur.layout} yukseklik={480} />
          <div style={{ marginTop: 12, fontSize: 12, color: '#9CA3AF', display: 'flex', gap: 20, flexWrap: 'wrap' }}>
            <span>💡 <strong>Baloncuk Boyutu:</strong> Şirketin Piyasa Değerini temsil eder.</span>
            <span>🟢 <strong>Yeşil Noktalar:</strong> Bugün yükselişte olan hisseler.</span>
            <span>🔴 <strong>Kırmızı Noktalar:</strong> Bugün düşüşte olan hisseler.</span>
            <span>🎯 <strong>Sol Üst Köşe:</strong> Düşük PD/DD çarpanı ile yüksek 1 yıllık prim üreten fırsat hisseleri.</span>
          </div>
        </div>
      )}

      {/* GÖRÜNÜM: DETAYLI TABLO */}
      {gorunum === 'tablo' && (
        <div className="kurumsal-kart" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ overflowX: 'auto' }}>
            <table className="veri-tablosu" style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: 12 }}>
              <thead>
                <tr style={{ background: '#181C27', borderBottom: '1px solid #2A2E39', color: '#9CA3AF', userSelect: 'none' }}>
                  <th style={{ width: 40, textAlign: 'center', padding: '10px 6px' }}>
                    <input
                      type="checkbox"
                      checked={seciliHisseler.length === veri?.hisseler?.length && veri?.hisseler?.length > 0}
                      onChange={e => {
                        if (e.target.checked && veri?.hisseler) {
                          setSeciliHisseler(veri.hisseler.slice(0, 4).map(h => h.kod));
                        } else {
                          setSeciliHisseler([]);
                        }
                      }}
                      title="En fazla 4 hisse seçin"
                    />
                  </th>
                  <th style={{ padding: '10px 12px', cursor: 'pointer' }} onClick={() => siralamayiDegistir('kod')}>
                    Hisse & Şirket {sirala === 'kod' && (yon === 'asc' ? '▲' : '▼')}
                  </th>
                  <th style={{ padding: '10px 10px', textAlign: 'right', cursor: 'pointer' }} onClick={() => siralamayiDegistir('fiyat')}>
                    Son Fiyat (₺) {sirala === 'fiyat' && (yon === 'asc' ? '▲' : '▼')}
                  </th>
                  <th style={{ padding: '10px 10px', textAlign: 'right', cursor: 'pointer' }} onClick={() => siralamayiDegistir('gunluk')}>
                    Günlük % (Anlık) {sirala === 'gunluk' && (yon === 'asc' ? '▲' : '▼')}
                  </th>
                  <th style={{ padding: '10px 10px', textAlign: 'right', cursor: 'pointer' }} onClick={() => siralamayiDegistir('haftalik')}>
                    Haftalık % {sirala === 'haftalik' && (yon === 'asc' ? '▲' : '▼')}
                  </th>
                  <th style={{ padding: '10px 10px', textAlign: 'right', cursor: 'pointer' }} onClick={() => siralamayiDegistir('aylik')}>
                    Aylık % {sirala === 'aylik' && (yon === 'asc' ? '▲' : '▼')}
                  </th>
                  <th
                    style={{ padding: '10px 12px', textAlign: 'right', cursor: 'pointer', background: sirala === 'yillik' ? 'rgba(41, 98, 255, 0.1)' : 'transparent' }}
                    onClick={() => siralamayiDegistir('yillik')}
                  >
                    🚀 Yıllık Yükseliş (%) {sirala === 'yillik' && (yon === 'asc' ? '▲' : '▼')}
                  </th>
                  <th
                    style={{ padding: '10px 12px', textAlign: 'right', cursor: 'pointer', background: sirala === 'pd_dd' ? 'rgba(16, 185, 129, 0.1)' : 'transparent' }}
                    onClick={() => siralamayiDegistir('pd_dd')}
                  >
                    💎 PD/DD {sirala === 'pd_dd' && (yon === 'asc' ? '▲' : '▼')}
                  </th>
                  <th style={{ padding: '10px 10px', textAlign: 'right', cursor: 'pointer' }} onClick={() => siralamayiDegistir('fk')}>
                    F/K {sirala === 'fk' && (yon === 'asc' ? '▲' : '▼')}
                  </th>
                  <th style={{ padding: '10px 10px', textAlign: 'right', cursor: 'pointer' }} onClick={() => siralamayiDegistir('fd_favok')}>
                    FD/FAVÖK {sirala === 'fd_favok' && (yon === 'asc' ? '▲' : '▼')}
                  </th>
                  <th style={{ padding: '10px 10px', textAlign: 'right', cursor: 'pointer' }} onClick={() => siralamayiDegistir('temettu_verim')}>
                    Temettü (%) {sirala === 'temettu_verim' && (yon === 'asc' ? '▲' : '▼')}
                  </th>
                  <th style={{ padding: '10px 10px', textAlign: 'right', cursor: 'pointer' }} onClick={() => siralamayiDegistir('roe')}>
                    ROE (%) {sirala === 'roe' && (yon === 'asc' ? '▲' : '▼')}
                  </th>
                  <th style={{ padding: '10px 10px', textAlign: 'right', cursor: 'pointer' }} onClick={() => siralamayiDegistir('piyasa_degeri')}>
                    Piyasa Değeri {sirala === 'piyasa_degeri' && (yon === 'asc' ? '▲' : '▼')}
                  </th>
                  <th style={{ padding: '10px 12px', textAlign: 'center' }}>İşlemler</th>
                </tr>
              </thead>
              <tbody>
                {yukleniyor && !veri ? (
                  <tr>
                    <td colSpan="14" style={{ textAlign: 'center', padding: 40, color: '#9CA3AF' }}>
                      Piyasa ve değerleme çarpanları taranıyor...
                    </td>
                  </tr>
                ) : veri?.hisseler?.length === 0 ? (
                  <tr>
                    <td colSpan="14" style={{ textAlign: 'center', padding: 30, color: '#9CA3AF' }}>
                      Seçilen kriterlere uygun hisse bulunamadı.
                    </td>
                  </tr>
                ) : (
                  veri?.hisseler?.map((h, i) => {
                    const secili = seciliHisseler.includes(h.kod);
                    const gunlukPozitif = h.gunluk >= 0;
                    const yillikPozitif = h.yillik >= 0;

                    // PD/DD renklendirme
                    const pdRenk = h.pd_dd <= 1.2 ? '#10B981' : h.pd_dd <= 2.5 ? '#60A5FA' : h.pd_dd <= 4.5 ? '#F59E0B' : '#EF4444';

                    return (
                      <tr
                        key={h.kod}
                        style={{
                          background: secili ? 'rgba(41, 98, 255, 0.12)' : i % 2 === 0 ? '#131722' : '#161A26',
                          borderBottom: '1px solid #1F2430',
                          transition: 'background 0.15s',
                        }}
                      >
                        {/* Checkbox */}
                        <td style={{ textAlign: 'center', padding: '8px 6px' }}>
                          <input
                            type="checkbox"
                            checked={secili}
                            onChange={() => hisseSecimiToggle(h.kod)}
                          />
                        </td>

                        {/* Kod & Şirket */}
                        <td style={{ padding: '8px 12px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <span
                              style={{
                                fontWeight: 700,
                                color: '#FFFFFF',
                                fontFamily: 'JetBrains Mono',
                                fontSize: 13,
                              }}
                            >
                              {h.kod}
                            </span>
                            <span style={{ fontSize: 10, color: '#787B86', background: '#1A1E29', padding: '1px 5px', borderRadius: 3 }}>
                              {h.sektor}
                            </span>
                          </div>
                          <div style={{ fontSize: 11, color: '#9CA3AF', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 150 }}>
                            {h.ad}
                          </div>
                        </td>

                        {/* Fiyat */}
                        <td style={{ padding: '8px 10px', textAlign: 'right', fontFamily: 'JetBrains Mono', fontWeight: 600, color: '#FFFFFF' }}>
                          {h.fiyat.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ₺
                        </td>

                        {/* Günlük % (Anlık) */}
                        <td style={{ padding: '8px 10px', textAlign: 'right' }}>
                          <span
                            style={{
                              display: 'inline-block',
                              padding: '2px 7px',
                              borderRadius: 4,
                              fontWeight: 700,
                              fontFamily: 'JetBrains Mono',
                              fontSize: 11.5,
                              color: gunlukPozitif ? '#10B981' : '#EF4444',
                              background: gunlukPozitif ? 'rgba(16, 185, 129, 0.12)' : 'rgba(239, 68, 68, 0.12)',
                            }}
                          >
                            {gunlukPozitif ? '+' : ''}{h.gunluk.toFixed(2)}%
                          </span>
                        </td>

                        {/* Haftalık % */}
                        <td style={{ padding: '8px 10px', textAlign: 'right', fontFamily: 'JetBrains Mono', color: h.haftalik >= 0 ? '#10B981' : '#EF4444' }}>
                          {h.haftalik >= 0 ? '+' : ''}{h.haftalik.toFixed(1)}%
                        </td>

                        {/* Aylık % */}
                        <td style={{ padding: '8px 10px', textAlign: 'right', fontFamily: 'JetBrains Mono', color: h.aylik >= 0 ? '#10B981' : '#EF4444' }}>
                          {h.aylik >= 0 ? '+' : ''}{h.aylik.toFixed(1)}%
                        </td>

                        {/* Yıllık Yükseliş % */}
                        <td style={{ padding: '8px 12px', textAlign: 'right', background: sirala === 'yillik' ? 'rgba(41, 98, 255, 0.06)' : 'transparent' }}>
                          <span
                            style={{
                              display: 'inline-block',
                              padding: '3px 8px',
                              borderRadius: 4,
                              fontWeight: 700,
                              fontFamily: 'JetBrains Mono',
                              fontSize: 12,
                              color: yillikPozitif ? '#10B981' : '#EF4444',
                              background: yillikPozitif ? 'rgba(16, 185, 129, 0.18)' : 'rgba(239, 68, 68, 0.18)',
                            }}
                          >
                            {yillikPozitif ? '+' : ''}{h.yillik.toFixed(1)}%
                          </span>
                        </td>

                        {/* PD/DD */}
                        <td style={{ padding: '8px 12px', textAlign: 'right', background: sirala === 'pd_dd' ? 'rgba(16, 185, 129, 0.06)' : 'transparent' }}>
                          <span
                            style={{
                              fontWeight: 700,
                              fontFamily: 'JetBrains Mono',
                              fontSize: 12,
                              color: pdRenk,
                              padding: '2px 6px',
                              borderRadius: 4,
                              background: `${pdRenk}15`,
                            }}
                            title={h.pd_dd <= 1.2 ? 'Kelepir Değer Çarpanı' : h.pd_dd <= 2.5 ? 'Makul Değerleme' : 'Yüksek Değerleme'}
                          >
                            {h.pd_dd.toFixed(2)}x
                          </span>
                        </td>

                        {/* F/K */}
                        <td style={{ padding: '8px 10px', textAlign: 'right', fontFamily: 'JetBrains Mono', fontWeight: 600, color: h.fk <= 8.0 ? '#10B981' : '#D1D4DC' }}>
                          {h.fk.toFixed(1)}x
                        </td>

                        {/* FD/FAVÖK */}
                        <td style={{ padding: '8px 10px', textAlign: 'right', fontFamily: 'JetBrains Mono', color: '#9CA3AF' }}>
                          {h.fd_favok.toFixed(1)}x
                        </td>

                        {/* Temettü Verimi % */}
                        <td style={{ padding: '8px 10px', textAlign: 'right', fontFamily: 'JetBrains Mono', color: h.temettu_verim >= 3.0 ? '#10B981' : '#9CA3AF' }}>
                          {h.temettu_verim > 0 ? `%${h.temettu_verim.toFixed(1)}` : '—'}
                        </td>

                        {/* ROE % */}
                        <td style={{ padding: '8px 10px', textAlign: 'right', fontFamily: 'JetBrains Mono', fontWeight: 600, color: h.roe >= 30 ? '#60A5FA' : '#9CA3AF' }}>
                          %{h.roe.toFixed(1)}
                        </td>

                        {/* Piyasa Değeri */}
                        <td style={{ padding: '8px 10px', textAlign: 'right', fontFamily: 'JetBrains Mono', color: '#D1D4DC', fontSize: 11.5 }}>
                          {h.piyasa_degeri.toLocaleString('tr-TR', { minimumFractionDigits: 1 })} Mr ₺
                        </td>

                        {/* Aksiyonlar */}
                        <td style={{ padding: '8px 12px', textAlign: 'center' }}>
                          <div style={{ display: 'inline-flex', gap: 6 }}>
                            <button
                              onClick={() => onModulDegistir?.('Stratejik Analiz', { hisse: h.kod })}
                              style={{
                                padding: '3px 8px',
                                background: '#1E232F',
                                border: '1px solid #2A2E39',
                                borderRadius: 4,
                                color: '#38BDF8',
                                fontSize: 11,
                                cursor: 'pointer',
                              }}
                              title="Stratejik Analiz Masasında İncele"
                            >
                              Detay
                            </button>
                            <button
                              onClick={() => karsilastirmayiAc([h.kod, h.kod === 'EREGL' ? 'KRDMD' : h.kod === 'THYAO' ? 'PGSUS' : 'GARAN'])}
                              style={{
                                padding: '3px 8px',
                                background: '#1E232F',
                                border: '1px solid #2A2E39',
                                borderRadius: 4,
                                color: '#10B981',
                                fontSize: 11,
                                cursor: 'pointer',
                              }}
                              title="Hızlı Kıyaslama Yap"
                            >
                              Kıyasla
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* YÜZEN ÇOKLU KIYASLAMA BARI (STICKY BOTTOM BAR) */}
      {seciliHisseler.length > 0 && (
        <div
          style={{
            position: 'sticky',
            bottom: 16,
            left: 0,
            right: 0,
            background: 'linear-gradient(135deg, #1E293B 0%, #0F172A 100%)',
            border: '1px solid #38BDF8',
            borderRadius: 10,
            padding: '12px 20px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.6), 0 0 15px rgba(56, 189, 248, 0.25)',
            zIndex: 40,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{ fontSize: 20 }}>⚖️</span>
            <div>
              <strong style={{ color: '#FFFFFF', fontSize: 13 }}>
                {seciliHisseler.length} Hisse Seçildi:
              </strong>{' '}
              <span style={{ color: '#38BDF8', fontFamily: 'JetBrains Mono', fontSize: 13, fontWeight: 700 }}>
                {seciliHisseler.join(', ')}
              </span>
              <span style={{ fontSize: 11, color: '#9CA3AF', marginLeft: 8 }}>(En fazla 4 hisse)</span>
            </div>
          </div>

          <div style={{ display: 'flex', gap: 10 }}>
            <button
              onClick={() => setSeciliHisseler([])}
              style={{
                padding: '6px 12px',
                background: 'transparent',
                border: '1px solid #475569',
                color: '#CBD5E1',
                borderRadius: 6,
                fontSize: 12,
                cursor: 'pointer',
              }}
            >
              Seçimi Temizle
            </button>
            <button
              onClick={() => karsilastirmayiAc()}
              style={{
                padding: '7px 18px',
                background: '#2563EB',
                border: 'none',
                color: '#FFFFFF',
                borderRadius: 6,
                fontSize: 12.5,
                fontWeight: 700,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 6,
              }}
            >
              🚀 Yan Yana Kıyasla & Analiz Et
            </button>
          </div>
        </div>
      )}

      {/* KARŞILAŞTIRMA MODAL PENCERESİ */}
      {kiyaslamaModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.75)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 100,
            padding: 16,
          }}
          onClick={() => setKiyaslamaModal(false)}
        >
          <div
            className="kurumsal-kart"
            style={{
              width: '100%',
              maxWidth: 950,
              maxHeight: '90vh',
              overflowY: 'auto',
              padding: 24,
              border: '1px solid #38BDF8',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.7)',
            }}
            onClick={e => e.stopPropagation()}
          >
            {/* Modal Başlığı */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #2A2E39', paddingBottom: 14 }}>
              <div>
                <h3 style={{ margin: 0, color: '#FFFFFF', display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span>⚖️</span> Çoklu Hisse Karşılaştırma & Değerleme Matrisi
                </h3>
                <p style={{ margin: '4px 0 0 0', fontSize: 12, color: '#9CA3AF' }}>
                  Çarpanlar, anlık günlük değişimler ve 1 yıllık yükseliş farkları
                </p>
              </div>
              <button
                onClick={() => setKiyaslamaModal(false)}
                style={{
                  background: '#1E232F',
                  border: '1px solid #2A2E39',
                  color: '#9CA3AF',
                  padding: '6px 12px',
                  borderRadius: 6,
                  cursor: 'pointer',
                  fontSize: 14,
                }}
              >
                ✕ Kapat
              </button>
            </div>

            {kiyaslamaYukleniyor || !kiyaslamaVerisi ? (
              <div style={{ padding: 40, textAlign: 'center', color: '#9CA3AF' }}>
                Kıyaslama matrisi hesaplanıyor...
              </div>
            ) : (
              <div style={{ marginTop: 18, display: 'flex', flexDirection: 'column', gap: 18 }}>
                {/* Kazananlar / Liderler Rozetleri */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 10 }}>
                  <div style={{ background: '#0F172A', border: '1px solid #10B981', padding: 10, borderRadius: 6 }}>
                    <div style={{ fontSize: 10.5, color: '#9CA3AF' }}>🏆 EN DÜŞÜK PD/DD (KELEPİR)</div>
                    <div style={{ fontSize: 16, fontWeight: 700, color: '#10B981', fontFamily: 'JetBrains Mono' }}>
                      {kiyaslamaVerisi.kazananlar.en_ucuz_pd_dd}
                    </div>
                  </div>
                  <div style={{ background: '#0F172A', border: '1px solid #38BDF8', padding: 10, borderRadius: 6 }}>
                    <div style={{ fontSize: 10.5, color: '#9CA3AF' }}>🏆 EN YÜKSEK 1 YILLIK GETİRİ</div>
                    <div style={{ fontSize: 16, fontWeight: 700, color: '#38BDF8', fontFamily: 'JetBrains Mono' }}>
                      {kiyaslamaVerisi.kazananlar.en_yuksek_yillik_getiri}
                    </div>
                  </div>
                  <div style={{ background: '#0F172A', border: '1px solid #F59E0B', padding: 10, borderRadius: 6 }}>
                    <div style={{ fontSize: 10.5, color: '#9CA3AF' }}>🏆 EN CAZİP F/K ORANI</div>
                    <div style={{ fontSize: 16, fontWeight: 700, color: '#F59E0B', fontFamily: 'JetBrains Mono' }}>
                      {kiyaslamaVerisi.kazananlar.en_cazip_fk}
                    </div>
                  </div>
                  <div style={{ background: '#0F172A', border: '1px solid #A855F7', padding: 10, borderRadius: 6 }}>
                    <div style={{ fontSize: 10.5, color: '#9CA3AF' }}>🏆 EN YÜKSEK TEMETTÜ VERİMİ</div>
                    <div style={{ fontSize: 16, fontWeight: 700, color: '#A855F7', fontFamily: 'JetBrains Mono' }}>
                      {kiyaslamaVerisi.kazananlar.en_yuksek_temettu}
                    </div>
                  </div>
                </div>

                {/* Yan Yana Metrik Tablosu */}
                <div style={{ overflowX: 'auto', border: '1px solid #2A2E39', borderRadius: 8 }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12.5, textAlign: 'left' }}>
                    <thead>
                      <tr style={{ background: '#181C27', borderBottom: '1px solid #2A2E39' }}>
                        <th style={{ padding: '10px 14px', color: '#9CA3AF' }}>Metrik</th>
                        {kiyaslamaVerisi.hisseler.map(h => (
                          <th key={h.kod} style={{ padding: '10px 14px', textAlign: 'right', color: '#FFFFFF', fontSize: 14 }}>
                            <div style={{ fontFamily: 'JetBrains Mono', fontWeight: 700 }}>{h.kod}</div>
                            <div style={{ fontSize: 10.5, color: '#787B86', fontWeight: 400 }}>{h.ad}</div>
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      <tr style={{ borderBottom: '1px solid #1F2430' }}>
                        <td style={{ padding: '9px 14px', color: '#CBD5E1' }}>Sektör</td>
                        {kiyaslamaVerisi.hisseler.map(h => (
                          <td key={h.kod} style={{ padding: '9px 14px', textAlign: 'right', color: '#9CA3AF' }}>{h.sektor}</td>
                        ))}
                      </tr>
                      <tr style={{ borderBottom: '1px solid #1F2430' }}>
                        <td style={{ padding: '9px 14px', color: '#CBD5E1' }}>Son Fiyat (₺)</td>
                        {kiyaslamaVerisi.hisseler.map(h => (
                          <td key={h.kod} style={{ padding: '9px 14px', textAlign: 'right', fontFamily: 'JetBrains Mono', fontWeight: 700, color: '#FFFFFF' }}>
                            {h.fiyat.toFixed(2)} ₺
                          </td>
                        ))}
                      </tr>
                      <tr style={{ borderBottom: '1px solid #1F2430', background: 'rgba(16, 185, 129, 0.04)' }}>
                        <td style={{ padding: '9px 14px', color: '#CBD5E1', fontWeight: 600 }}>Günlük Değişim % (Anlık)</td>
                        {kiyaslamaVerisi.hisseler.map(h => (
                          <td key={h.kod} style={{ padding: '9px 14px', textAlign: 'right', fontFamily: 'JetBrains Mono', fontWeight: 700, color: h.gunluk >= 0 ? '#10B981' : '#EF4444' }}>
                            {h.gunluk >= 0 ? '+' : ''}{h.gunluk.toFixed(2)}%
                          </td>
                        ))}
                      </tr>
                      <tr style={{ borderBottom: '1px solid #1F2430', background: 'rgba(41, 98, 255, 0.05)' }}>
                        <td style={{ padding: '9px 14px', color: '#CBD5E1', fontWeight: 600 }}>🚀 1 Yıllık Yükseliş (%)</td>
                        {kiyaslamaVerisi.hisseler.map(h => (
                          <td key={h.kod} style={{ padding: '9px 14px', textAlign: 'right', fontFamily: 'JetBrains Mono', fontWeight: 700, color: h.yillik >= 0 ? '#10B981' : '#EF4444', fontSize: 13.5 }}>
                            {h.yillik >= 0 ? '+' : ''}{h.yillik.toFixed(1)}%
                          </td>
                        ))}
                      </tr>
                      <tr style={{ borderBottom: '1px solid #1F2430', background: 'rgba(16, 185, 129, 0.05)' }}>
                        <td style={{ padding: '9px 14px', color: '#CBD5E1', fontWeight: 600 }}>💎 PD/DD (Piyasa/Defter Değeri)</td>
                        {kiyaslamaVerisi.hisseler.map(h => (
                          <td key={h.kod} style={{ padding: '9px 14px', textAlign: 'right', fontFamily: 'JetBrains Mono', fontWeight: 700, color: h.pd_dd <= 1.5 ? '#10B981' : '#F59E0B' }}>
                            {h.pd_dd.toFixed(2)}x
                          </td>
                        ))}
                      </tr>
                      <tr style={{ borderBottom: '1px solid #1F2430' }}>
                        <td style={{ padding: '9px 14px', color: '#CBD5E1' }}>F/K (Fiyat/Kazanç)</td>
                        {kiyaslamaVerisi.hisseler.map(h => (
                          <td key={h.kod} style={{ padding: '9px 14px', textAlign: 'right', fontFamily: 'JetBrains Mono', fontWeight: 600 }}>{h.fk.toFixed(1)}x</td>
                        ))}
                      </tr>
                      <tr style={{ borderBottom: '1px solid #1F2430' }}>
                        <td style={{ padding: '9px 14px', color: '#CBD5E1' }}>FD/FAVÖK</td>
                        {kiyaslamaVerisi.hisseler.map(h => (
                          <td key={h.kod} style={{ padding: '9px 14px', textAlign: 'right', fontFamily: 'JetBrains Mono' }}>{h.fd_favok.toFixed(1)}x</td>
                        ))}
                      </tr>
                      <tr style={{ borderBottom: '1px solid #1F2430' }}>
                        <td style={{ padding: '9px 14px', color: '#CBD5E1' }}>Temettü Verimi (%)</td>
                        {kiyaslamaVerisi.hisseler.map(h => (
                          <td key={h.kod} style={{ padding: '9px 14px', textAlign: 'right', fontFamily: 'JetBrains Mono', color: h.temettu_verim >= 3 ? '#10B981' : '#9CA3AF' }}>
                            %{h.temettu_verim.toFixed(1)}
                          </td>
                        ))}
                      </tr>
                      <tr style={{ borderBottom: '1px solid #1F2430' }}>
                        <td style={{ padding: '9px 14px', color: '#CBD5E1' }}>Özsermaye Kârlılığı (ROE %)</td>
                        {kiyaslamaVerisi.hisseler.map(h => (
                          <td key={h.kod} style={{ padding: '9px 14px', textAlign: 'right', fontFamily: 'JetBrains Mono', fontWeight: 600, color: '#60A5FA' }}>
                            %{h.roe.toFixed(1)}
                          </td>
                        ))}
                      </tr>
                      <tr>
                        <td style={{ padding: '9px 14px', color: '#CBD5E1' }}>Piyasa Değeri (Mlyr ₺)</td>
                        {kiyaslamaVerisi.hisseler.map(h => (
                          <td key={h.kod} style={{ padding: '9px 14px', textAlign: 'right', fontFamily: 'JetBrains Mono' }}>
                            {h.piyasa_degeri.toFixed(1)} Mr ₺
                          </td>
                        ))}
                      </tr>
                    </tbody>
                  </table>
                </div>

                {/* Analist Özeti & Değerlendirme */}
                {kiyaslamaVerisi.analist_ozeti && (
                  <div
                    style={{
                      background: '#0E131F',
                      border: '1px solid #1E293B',
                      borderRadius: 8,
                      padding: 14,
                    }}
                  >
                    <div style={{ fontSize: 12, fontWeight: 700, color: '#38BDF8', marginBottom: 6 }}>
                      🎯 Araştırma Masası Analist Notu & Sektör Kıyaslaması
                    </div>
                    <div style={{ fontSize: 12, color: '#CBD5E1', lineHeight: 1.6, whiteSpace: 'pre-line' }}>
                      {kiyaslamaVerisi.analist_ozeti}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { fmt } from '../lib/format.jsx';
import PlotlyGrafik from '../components/PlotlyGrafik.jsx';

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
function bist100FigurUret(noktalar = [], yukseklik = 200) {
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

  const onHisseSec = useCallback((hisseKod) => {
    window.location.hash = `#stratejik?hisse=${hisseKod}`;
    onModulDegistir?.('Analiz', 'Stratejik Analiz');
  }, [onModulDegistir]);

  const onHizliAl = useCallback((hisseKod) => {
    window.location.hash = `#emir?hisse=${hisseKod}&yon=AL`;
    onModulDegistir?.('Portföy', 'Emir Ver');
  }, [onModulDegistir]);

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
    return bist100FigurUret(piyasa?.bist100_intraday, 200);
  }, [piyasa]);

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
      {hata && <div className="error-msg">{hata}</div>}

      {/* 1. ÜST ÖZET KARTLARI (4 TEMEL GÖSTERGE) */}
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
            <span>Hacim: 148 Mlyr ₺</span>
          </div>
        </div>

        <div className="kurumsal-kart" style={{ borderTop: '3px solid #2962FF' }}>
          <div className="kurumsal-kart-baslik">
            <span>BIST 30 Endeksi</span>
            <span className="rozet-al" style={{ color: '#2962FF', borderColor: 'rgba(41,98,255,0.4)', background: 'rgba(41,98,255,0.1)' }}>
              XU030
            </span>
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
            <span>Toplam Portföy Varlığım</span>
            <span style={{ color: '#9CA3AF', fontSize: 11 }}>
              {portfoy?.pozisyonlar?.length ? `${portfoy.pozisyonlar.length} Hisse` : 'Özet'}
            </span>
          </div>
          <div className="kurumsal-kart-deger" style={{ color: '#D7FF4E' }}>
            {portfoy ? fmt(portfoy.toplam_varlik, 0) + ' ₺' : '100.000 ₺'}
          </div>
          <div className="kurumsal-kart-alt">
            <span>Hisseler: {portfoy ? fmt(portfoy.pozisyon_degeri, 0) : '0'} ₺</span>
            <span
              onClick={() => onModulDegistir?.('Portföy', 'Portföy İzleme')}
              style={{ color: '#38BDF8', cursor: 'pointer', fontWeight: 600 }}
            >
              Portföy İzleme →
            </span>
          </div>
        </div>

        <div className="kurumsal-kart" style={{ borderTop: '3px solid #FF9800' }}>
          <div className="kurumsal-kart-baslik">
            <span>Kullanılabilir Nakit</span>
            <span style={{ color: '#089981', fontSize: 11, fontWeight: 600 }}>Aktif</span>
          </div>
          <div className="kurumsal-kart-deger" style={{ color: '#FFFFFF' }}>
            {portfoy ? fmt(portfoy.virtual_cash, 0) + ' ₺' : '100.000 ₺'}
          </div>
          <div className="kurumsal-kart-alt">
            <span>Alıma hazır bakiye</span>
            <span
              onClick={() => onHizliAl('THYAO')}
              style={{ color: '#089981', cursor: 'pointer', fontWeight: 600 }}
            >
              Emir Ver →
            </span>
          </div>
        </div>
      </div>

      {/* 2. BIST 100 SEANS İÇİ TREND GRAFİĞİ */}
      <div className="kurumsal-kart" style={{ padding: 18 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 10, marginBottom: 12 }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <h4 style={{ color: '#FFFFFF', margin: 0, fontSize: 15 }}>📈 BIST 100 Gün İçi Seyir</h4>
              <span className="seans-durum-rozet" style={{ fontSize: 10 }}>Canlı</span>
            </div>
            <span style={{ fontSize: 12, color: '#787B86', marginTop: 4, display: 'block' }}>
              Borsa İstanbul Pay Piyasası seans içi fiyat hareketi ve önemli seviyeler
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
            <button
              type="button"
              className="arac-btn"
              onClick={() => onModulDegistir?.('Analiz', 'Hisse Araştırma')}
              style={{ fontSize: 12, padding: '6px 12px' }}
            >
              🔎 Hisse Araştırma
            </button>
            <button
              type="button"
              className="arac-btn aktif"
              onClick={() => onModulDegistir?.('Analiz', 'Stratejik Analiz')}
              style={{ fontSize: 12, padding: '6px 12px' }}
            >
              🎯 Stratejik Analiz
            </button>
          </div>
        </div>

        <PlotlyGrafik data={bistFig.data} layout={bistFig.layout} config={{ staticPlot: false, responsive: true }} />

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10, marginTop: 8, fontSize: 11.5, color: '#787B86' }}>
          <span>Açılış: <b>{fmt(bistFig.bazFiyat, 2)}</b></span>
          <span>Günün En Düşüğü: <b style={{ color: '#F23645' }}>{fmt(bistFig.minF, 2)}</b></span>
          <span>Günün En Yükseği: <b style={{ color: '#089981' }}>{fmt(bistFig.maxF, 2)}</b></span>
          <span>Piyasa Özeti: <b style={{ color: '#089981' }}>284 Yükselen • 158 Düşen</b></span>
        </div>
      </div>

      {/* 3. GÜNÜN ÖNE ÇIKAN HİSSELERİ (YÜKSELENLER / DÜŞENLER / HACİM LİDERLERİ) */}
      <div className="kurumsal-kart" style={{ padding: 18 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12, marginBottom: 14 }}>
          <div>
            <h4 style={{ color: '#FFFFFF', margin: 0, fontSize: 15 }}>⚡ Günün Öne Çıkan Hisseleri</h4>
            <span style={{ fontSize: 12, color: '#787B86', marginTop: 2, display: 'block' }}>
              BIST pay piyasasında günün en çok hareket eden şirketleri
            </span>
          </div>

          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
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
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table>
            <thead>
              <tr>
                <th>Hisse & Şirket</th>
                <th>Son Fiyat</th>
                <th>Günlük Değişim</th>
                <th>{liderSekme === 'hacim' ? 'İşlem Hacmi' : 'Görünüm'}</th>
                <th style={{ textAlign: 'right' }}>Hızlı İşlem</th>
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

      {/* 4. ALTIN, DÖVİZ VE EMTİA GÖSTERGELERİ */}
      <div className="kurumsal-grid-4">
        <div className="sade-kart" style={{ borderTop: '3px solid #F5C451' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: 12, color: '#787B86', fontWeight: 600 }}>Gram Altın (Spot)</span>
            <span className="rozet-al" style={{ color: '#F5C451', borderColor: 'rgba(245,196,81,0.4)', background: 'rgba(245,196,81,0.1)' }}>
              ALTIN
            </span>
          </div>
          <div style={{ fontSize: 20, fontWeight: 700, color: '#F5C451', margin: '6px 0', fontFamily: 'JetBrains Mono' }}>
            6.582,40 ₺
          </div>
          <div style={{ fontSize: 11, color: '#787B86' }}>
            Çeyrek: <b>10.760 ₺</b> • Günlük: <span style={{ color: '#089981' }}>+0,48%</span>
          </div>
        </div>

        <div className="sade-kart" style={{ borderTop: '3px solid #D1D4DC' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: 12, color: '#787B86', fontWeight: 600 }}>Gram Gümüş</span>
            <span className="rozet-al" style={{ color: '#D1D4DC', borderColor: 'rgba(209,212,220,0.4)', background: 'rgba(209,212,220,0.1)' }}>
              GÜMÜŞ
            </span>
          </div>
          <div style={{ fontSize: 20, fontWeight: 700, color: '#FFFFFF', margin: '6px 0', fontFamily: 'JetBrains Mono' }}>
            96,75 ₺
          </div>
          <div style={{ fontSize: 11, color: '#787B86' }}>
            Ons: <b>$61,35</b> • Günlük: <span style={{ color: '#089981' }}>+2,09%</span>
          </div>
        </div>

        <div className="sade-kart" style={{ borderTop: '3px solid #2962FF' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: 12, color: '#787B86', fontWeight: 600 }}>Amerikan Doları</span>
            <span className="rozet-al" style={{ color: '#2962FF', borderColor: 'rgba(41,98,255,0.4)', background: 'rgba(41,98,255,0.1)' }}>
              USD/TRY
            </span>
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
            <span className="rozet-al" style={{ color: '#FF9800', borderColor: 'rgba(255,152,0,0.4)', background: 'rgba(255,152,0,0.1)' }}>
              VARİL
            </span>
          </div>
          <div style={{ fontSize: 20, fontWeight: 700, color: '#FFFFFF', margin: '6px 0', fontFamily: 'JetBrains Mono' }}>
            $102,39
          </div>
          <div style={{ fontSize: 11, color: '#787B86' }}>
            Küresel varil • Değişim: <span style={{ color: '#F23645' }}>-0,93%</span>
          </div>
        </div>
      </div>
    </div>
  );
}

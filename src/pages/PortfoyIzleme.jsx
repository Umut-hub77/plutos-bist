import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { fmt, Yuzde, Tutar } from '../lib/format.jsx';
import PlotlyGrafik from '../components/PlotlyGrafik.jsx';

const SIRKETLER = {
  THYAO: 'Türk Hava Yolları',
  GARAN: 'Garanti BBVA',
  ASELS: 'Aselsan Elektronik',
  EREGL: 'Ereğli Demir Çelik',
  TUPRS: 'Tüpraş Rafinerileri',
  KCHOL: 'Koç Holding',
  BIMAS: 'BİM Birleşik Mağazalar',
  AKBNK: 'Akbank',
  YKBNK: 'Yapı Kredi',
  SAHOL: 'Sabancı Holding',
  SISE: 'Şişecam',
  PGSUS: 'Pegasus',
};

function portfoyDonutFigur(pozisyonlar, nakit) {
  const labels = [...pozisyonlar.map(p => p.hisse), 'Sanal Nakit'];
  const values = [...pozisyonlar.map(p => p.piyasa_degeri), nakit];
  const colors = ['#2962FF', '#089981', '#FF9800', '#9C27B0', '#00BCD4', '#F5C451', '#E91E63', '#4CAF50', '#787B86'];

  const data = [
    {
      type: 'pie',
      hole: 0.65,
      labels,
      values,
      textinfo: 'label+percent',
      textposition: 'inside',
      insidetextorientation: 'radial',
      marker: { colors: colors.slice(0, labels.length) },
      hoverinfo: 'label+value+percent',
    },
  ];

  const layout = {
    height: 280,
    margin: { l: 15, r: 15, t: 15, b: 15 },
    paper_bgcolor: '#131722',
    plot_bgcolor: '#131722',
    showlegend: false,
    font: { family: 'JetBrains Mono', color: '#D1D4DC', size: 11 },
  };

  return { data, layout };
}

export default function PortfoyIzleme({ api, onModulDegistir }) {
  const [veri, setVeri] = useState(null);
  const [yukleniyor, setYukleniyor] = useState(true);
  const [hata, setHata] = useState('');

  const yukle = useCallback(async () => {
    setYukleniyor(true);
    setHata('');
    try {
      const res = await api('/api/portfolio');
      setVeri(res);
    } catch (e) {
      setHata(e.message || 'Portföy verisi alınamadı.');
    } finally {
      setYukleniyor(false);
    }
  }, [api]);

  useEffect(() => {
    yukle();
  }, [yukle]);

  const maliyetToplam = (veri?.pozisyonlar || []).reduce((t, p) => t + p.lot * p.maliyet, 0);
  const kz = (veri?.pozisyon_degeri || 0) - maliyetToplam;
  const kzYuzde = maliyetToplam > 0 ? (kz / maliyetToplam) * 100 : 0;
  const toplamVarlik = veri?.toplam_varlik || 100000;
  const nakit = veri?.virtual_cash || 0;

  const donutFig = useMemo(() => {
    if (!veri) return null;
    return portfoyDonutFigur(veri.pozisyonlar || [], nakit);
  }, [veri, nakit]);

  if (hata) return <div className="error-msg">{hata}</div>;
  if (yukleniyor && !veri) return <div className="loading-hint">Portföy Yükleniyor…</div>;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* 1. ÜST KURUMSAL VARLIK KARTLARI */}
      <div className="kurumsal-grid-4">
        <div className="kurumsal-kart" style={{ borderTop: '3px solid #2962FF' }}>
          <div className="kurumsal-kart-baslik">
            <span>Toplam Portföy Değeri</span>
            <span className="rozet-al" style={{ color: '#2962FF', borderColor: 'rgba(41,98,255,0.4)', background: 'rgba(41,98,255,0.1)' }}>NET VARLIK</span>
          </div>
          <div className="kurumsal-kart-deger" style={{ color: '#FFFFFF' }}>
            {fmt(toplamVarlik, 0)} ₺
          </div>
          <div className="kurumsal-kart-alt">
            <span>Kullanılabilir Varlık</span>
            <span style={{ color: '#089981' }}>Canlı</span>
          </div>
        </div>

        <div className="kurumsal-kart" style={{ borderTop: '3px solid #D7FF4E' }}>
          <div className="kurumsal-kart-baslik">
            <span>Hisse Pozisyon Değeri</span>
            <span style={{ fontSize: 11, color: '#787B86' }}>{veri?.pozisyonlar?.length || 0} Pozisyon</span>
          </div>
          <div className="kurumsal-kart-deger">
            {fmt(veri?.pozisyon_degeri || 0, 0)} ₺
          </div>
          <div className="kurumsal-kart-alt">
            <span>Hisse Ağırlığı</span>
            <span style={{ fontWeight: 700, fontFamily: 'JetBrains Mono', color: '#D7FF4E' }}>
              %{toplamVarlik > 0 ? fmt(((veri?.pozisyon_degeri || 0) / toplamVarlik) * 100, 1) : 0}
            </span>
          </div>
        </div>

        <div className="kurumsal-kart" style={{ borderTop: `3px solid ${kz >= 0 ? '#089981' : '#F23645'}` }}>
          <div className="kurumsal-kart-baslik">
            <span>Toplam Kâr / Zarar</span>
            <span className={kz >= 0 ? 'rozet-al' : 'rozet-sat'}>{kz >= 0 ? 'KÂRDA' : 'ZARARDA'}</span>
          </div>
          <div className="kurumsal-kart-deger" style={{ color: kz >= 0 ? '#089981' : '#F23645' }}>
            <Tutar v={kz} d={0} />
          </div>
          <div className="kurumsal-kart-alt">
            <span>Net Getiri Oranı</span>
            <span style={{ fontWeight: 700, fontFamily: 'JetBrains Mono', color: kz >= 0 ? '#089981' : '#F23645' }}>
              <Yuzde v={kzYuzde} />
            </span>
          </div>
        </div>

        <div className="kurumsal-kart" style={{ borderTop: '3px solid #FF9800' }}>
          <div className="kurumsal-kart-baslik">
            <span>Kullanılabilir Sanal Nakit</span>
            <span style={{ fontSize: 11, color: '#787B86' }}>TRY Bakiye</span>
          </div>
          <div className="kurumsal-kart-deger">
            {fmt(nakit, 0)} ₺
          </div>
          <div className="kurumsal-kart-alt">
            <span>Nakit Oranı</span>
            <span style={{ fontWeight: 700, fontFamily: 'JetBrains Mono' }}>
              %{toplamVarlik > 0 ? fmt((nakit / toplamVarlik) * 100, 1) : 100}
            </span>
          </div>
        </div>
      </div>

      {/* 2. ANA POZİSYONLAR TABLOSU & VARLIK DAĞILIMI */}
      <div className="terminal-iki-kolon">
        {/* Sol: Varlıklarım & Pozisyon Detayları */}
        <div className="kurumsal-kart" style={{ flex: 2, padding: 18 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <h4 style={{ color: '#FFFFFF', margin: 0 }}>📊 Portföy Pozisyonlarım ({veri?.pozisyonlar?.length || 0})</h4>
            <button
              className="arac-btn aktif"
              onClick={() => onModulDegistir?.('Portföy', 'Emir Ver (Demo)')}
              style={{ fontSize: 11.5, padding: '5px 12px' }}
            >
              + Yeni Emir Ver
            </button>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table>
              <thead>
                <tr>
                  <th>Hisse</th>
                  <th>Lot</th>
                  <th>Maliyet</th>
                  <th>Güncel</th>
                  <th>Piyasa Değeri</th>
                  <th>Portföy Payı</th>
                  <th>Net K/Z</th>
                  <th style={{ textAlign: 'right' }}>Hızlı İşlem</th>
                </tr>
              </thead>
              <tbody>
                {veri?.pozisyonlar?.length ? (
                  veri.pozisyonlar.map(p => {
                    const pkz = p.piyasa_degeri - p.lot * p.maliyet;
                    const pyz = p.maliyet > 0 ? (pkz / (p.lot * p.maliyet)) * 100 : 0;
                    const pay = toplamVarlik > 0 ? (p.piyasa_degeri / toplamVarlik) * 100 : 0;
                    return (
                      <tr key={p.hisse}>
                        <td>
                          <div className="tablo-hisse-hucre">
                            <span className="kod">{p.hisse}</span>
                            <span className="ad">{SIRKETLER[p.hisse] || 'BIST Şirketi'}</span>
                          </div>
                        </td>
                        <td style={{ fontWeight: 700, color: '#FFFFFF' }}>{fmt(p.lot, 0)}</td>
                        <td>{fmt(p.maliyet)} ₺</td>
                        <td style={{ fontWeight: 600, color: '#D1D4DC' }}>{fmt(p.guncel_fiyat)} ₺</td>
                        <td style={{ fontWeight: 700, color: '#FFFFFF' }}>{fmt(p.piyasa_degeri)} ₺</td>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <span style={{ fontSize: 11, minWidth: 34 }}>%{fmt(pay, 1)}</span>
                            <div style={{ width: 50, height: 5, background: '#1E222D', borderRadius: 3, overflow: 'hidden' }}>
                              <div style={{ width: `${Math.min(100, pay)}%`, height: '100%', background: '#2962FF' }} />
                            </div>
                          </div>
                        </td>
                        <td>
                          <span style={{ color: pkz >= 0 ? '#089981' : '#F23645', fontWeight: 700 }}>
                            <Tutar v={pkz} /> (<Yuzde v={pyz} />)
                          </span>
                        </td>
                        <td style={{ textAlign: 'right' }}>
                          <div className="hisse-aksiyon-grup">
                            <button
                              className="btn-aksiyon-al"
                              onClick={() => {
                                window.location.hash = `#emir?hisse=${p.hisse}&yon=AL`;
                                onModulDegistir?.('Portföy', 'Emir Ver (Demo)');
                              }}
                              title={`${p.hisse} Hızlı Alış Emri Gir`}
                            >
                              AL
                            </button>
                            <button
                              className="btn-aksiyon-sat"
                              onClick={() => {
                                window.location.hash = `#emir?hisse=${p.hisse}&yon=SAT`;
                                onModulDegistir?.('Portföy', 'Emir Ver (Demo)');
                              }}
                              title={`${p.hisse} Hızlı Satış Emri Gir`}
                            >
                              SAT
                            </button>
                            <button
                              className="btn-aksiyon-grafik"
                              onClick={() => {
                                window.location.hash = `#stratejik?hisse=${p.hisse}`;
                                onModulDegistir?.('Analiz', 'Stratejik Analiz');
                              }}
                              title={`${p.hisse} Stratejik Analiz Grafiğine Git`}
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
                    <td colSpan={8} className="empty-hint" style={{ padding: 30, textAlign: 'center' }}>
                      Portföyünüzde henüz hisse senedi bulunmuyor. "Emir Ver (Demo)" ekranından ilk BIST hissenizi ekleyebilirsiniz.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Sağ: Portföy Varlık Dağılımı Donut Grafiği */}
        <div className="kurumsal-kart" style={{ flex: 1, padding: 18 }}>
          <h4 style={{ color: '#FFFFFF', margin: '0 0 10px' }}>🍩 Varlık & Sektör Dağılımı</h4>
          {donutFig && <PlotlyGrafik data={donutFig.data} layout={donutFig.layout} config={{ staticPlot: true }} />}

          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 10, borderTop: '1px solid #1E222D', paddingTop: 10, fontSize: 12 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', color: '#787B86' }}>
              <span>Hisse Senedi Varlığı:</span>
              <span style={{ color: '#FFFFFF', fontWeight: 600 }}>{fmt(veri?.pozisyon_degeri || 0)} ₺</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', color: '#787B86' }}>
              <span>Nakit Rezervi:</span>
              <span style={{ color: '#089981', fontWeight: 600 }}>{fmt(nakit)} ₺</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

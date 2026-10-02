import React, { useState, useEffect, useMemo } from 'react';
import { fmt, Yuzde, Metrik } from '../lib/format.jsx';
import { useTickers } from '../lib/useTickers.js';
import TekHisse from '../components/TekHisse.jsx';
import PlotlyGrafik from '../components/PlotlyGrafik.jsx';

function senaryoFigurUret(seriler) {
  if (!seriler || !seriler.length) return null;

  const data = [];
  const gecmis = seriler.find(s => s.hisse === 'Geçmiş');
  const medyan = seriler.find(s => s.hisse && s.hisse.includes('Medyan'));
  const iyimser = seriler.find(s => s.hisse && s.hisse.includes('İyimser'));
  const kotumser = seriler.find(s => s.hisse && s.hisse.includes('Kötümser'));
  const trend = seriler.find(s => s.hisse && s.hisse.includes('Trend'));

  if (gecmis) {
    data.push({
      type: 'scatter',
      mode: 'lines',
      x: gecmis.noktalar.map(p => p.t),
      y: gecmis.noktalar.map(p => p.v),
      name: 'Gerçekleşen Fiyat',
      line: { color: '#FFFFFF', width: 2 },
    });
  }

  if (kotumser) {
    data.push({
      type: 'scatter',
      mode: 'lines',
      x: kotumser.noktalar.map(p => p.t),
      y: kotumser.noktalar.map(p => p.v),
      name: 'Kötümser (%5 Alt Bant)',
      line: { color: 'rgba(242, 54, 69, 0.5)', width: 1.2, dash: 'dash' },
      showlegend: true,
    });
  }

  if (iyimser) {
    data.push({
      type: 'scatter',
      mode: 'lines',
      x: iyimser.noktalar.map(p => p.t),
      y: iyimser.noktalar.map(p => p.v),
      name: 'İyimser (%95 Üst Bant)',
      line: { color: 'rgba(8, 153, 129, 0.5)', width: 1.2, dash: 'dash' },
      fill: kotumser ? 'tonexty' : 'none',
      fillcolor: 'rgba(41, 98, 255, 0.08)',
      showlegend: true,
    });
  }

  if (medyan) {
    data.push({
      type: 'scatter',
      mode: 'lines',
      x: medyan.noktalar.map(p => p.t),
      y: medyan.noktalar.map(p => p.v),
      name: 'Medyan Projeksiyon Yolu',
      line: { color: '#D7FF4E', width: 2.5 },
    });
  }

  if (trend) {
    data.push({
      type: 'scatter',
      mode: 'lines',
      x: trend.noktalar.map(p => p.t),
      y: trend.noktalar.map(p => p.v),
      name: 'Trend Eğimi (Son 60G)',
      line: { color: '#00BCD4', width: 1.5, dash: 'dot' },
    });
  }

  const layout = {
    height: 400,
    margin: { l: 50, r: 25, t: 25, b: 35 },
    paper_bgcolor: '#131722',
    plot_bgcolor: '#131722',
    hovermode: 'x unified',
    font: { family: 'JetBrains Mono', color: '#787B86', size: 11 },
    xaxis: { showgrid: true, gridcolor: 'rgba(42, 46, 57, 0.45)' },
    yaxis: { showgrid: true, gridcolor: 'rgba(42, 46, 57, 0.45)', tickformat: '.2f' },
    legend: { orientation: 'h', y: 1.05, x: 1, xanchor: 'right', font: { color: '#D1D4DC' } },
  };

  return { data, layout };
}

export default function AIGelecek({ api, onModulDegistir }) {
  const t = useTickers(api);
  const [hisse, setHisse] = useState('THYAO');
  const [gun, setGun] = useState(30);
  const [veri, setVeri] = useState(null);
  const [yukleniyor, setYukleniyor] = useState(false);
  const [hata, setHata] = useState('');

  useEffect(() => {
    let iptal = false;
    setYukleniyor(true);
    setHata('');
    api(`/api/forecast/${hisse}?gun=${gun}`)
      .then(r => {
        if (!iptal) setVeri(r);
      })
      .catch(e => {
        if (!iptal) {
          setHata(e.message);
          setVeri(null);
        }
      })
      .finally(() => {
        if (!iptal) setYukleniyor(false);
      });
    return () => {
      iptal = true;
    };
  }, [api, hisse, gun]);

  const senaryoFig = useMemo(() => {
    return senaryoFigurUret(veri?.seriler);
  }, [veri]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* 1. SEÇİM KARTI */}
      <div className="kurumsal-kart" style={{ padding: 18 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <h4 style={{ color: '#FFFFFF', margin: 0 }}>🔮 Kuantitatif Fiyat Senaryoları & Monte Carlo Projeksiyonu</h4>
          <span style={{ fontSize: 11, color: '#787B86' }}>3.000 Yollu Stokastik Simülasyon</span>
        </div>

        <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', alignItems: 'flex-end' }}>
          <div style={{ minWidth: 260 }}>
            <TekHisse etiket="Analiz Edilecek Hisse:" tickers={t?.tickers} deger={hisse} onChange={setHisse} />
          </div>

          <div>
            <label style={{ fontSize: 11.5, color: '#787B86', textTransform: 'uppercase', marginBottom: 4, display: 'block' }}>
              Projeksiyon Vadesi:
            </label>
            <div className="arac-grup">
              {[15, 30, 60, 90].map(g => (
                <button
                  key={g}
                  className={`arac-btn ${gun === g ? 'aktif' : ''}`}
                  onClick={() => setGun(g)}
                >
                  {g} Gün
                </button>
              ))}
            </div>
          </div>
        </div>

        {hata && <div className="error-msg" style={{ marginTop: 8 }}>{hata}</div>}
      </div>

      {/* 2. PROJEKSİYON VE SENARYO SONUÇLARI */}
      {veri && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16, opacity: yukleniyor ? 0.6 : 1 }}>
          <div className="kurumsal-grid-4">
            <div className="kurumsal-kart" style={{ borderTop: '3px solid #2962FF' }}>
              <div className="kurumsal-kart-baslik"><span>Güncel Fiyat</span><span className="rozet-al">Spot</span></div>
              <div className="kurumsal-kart-deger">{fmt(veri.fiyat)} ₺</div>
              <div className="kurumsal-kart-alt"><span>Günlük Volatilite: %{fmt(veri.gunluk_vol, 2)}</span></div>
            </div>

            <div className="kurumsal-kart" style={{ borderTop: `3px solid ${veri.medyan_degisim >= 0 ? '#089981' : '#F23645'}` }}>
              <div className="kurumsal-kart-baslik"><span>{veri.gun} Gün Sonra Medyan</span><span className="rozet-al">Beklenti</span></div>
              <div className="kurumsal-kart-deger" style={{ color: veri.medyan_degisim >= 0 ? '#089981' : '#F23645' }}>
                {fmt(veri.medyan)} ₺
              </div>
              <div className="kurumsal-kart-alt">
                <span>Beklenen Değişim:</span>
                <span style={{ fontWeight: 700, fontFamily: 'JetBrains Mono', color: veri.medyan_degisim >= 0 ? '#089981' : '#F23645' }}>
                  <Yuzde v={veri.medyan_degisim} />
                </span>
              </div>
            </div>

            <div className="kurumsal-kart" style={{ borderTop: '3px solid #00BCD4' }}>
              <div className="kurumsal-kart-baslik"><span>Güven Aralığı (%90)</span><span className="rozet-al" style={{ color: '#00BCD4', borderColor: 'rgba(0,188,212,0.4)', background: 'rgba(0,188,212,0.1)' }}>%5 - %95</span></div>
              <div className="kurumsal-kart-deger" style={{ fontSize: 20 }}>
                {fmt(veri.kotumser, 1)} – {fmt(veri.iyimser, 1)} ₺
              </div>
              <div className="kurumsal-kart-alt"><span>Olası Değerleme Bandı</span></div>
            </div>

            <div className="kurumsal-kart" style={{ borderTop: '3px solid #D7FF4E' }}>
              <div className="kurumsal-kart-baslik"><span>Artış Olasılığı</span><span className="rozet-al" style={{ color: '#D7FF4E', borderColor: 'rgba(215,255,78,0.4)', background: 'rgba(215,255,78,0.1)' }}>PROB</span></div>
              <div className="kurumsal-kart-deger" style={{ color: '#D7FF4E' }}>
                %{fmt(veri.artis_olasiligi, 1)}
              </div>
              <div className="kurumsal-kart-alt"><span>Pozitif Getiri Şansı</span></div>
            </div>
          </div>

          <div className="kurumsal-kart" style={{ padding: 18 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <h4 style={{ color: '#FFFFFF', margin: 0 }}>📊 Monte Carlo Güven Koridoru & Olasılık Yolu</h4>
              <span style={{ fontSize: 11, color: '#787B86' }}>İyimser / Kötümser / Medyan Senaryo</span>
            </div>
            {senaryoFig && <PlotlyGrafik data={senaryoFig.data} layout={senaryoFig.layout} />}

            <div style={{ marginTop: 14, display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
              <button
                className="btn-aksiyon-al"
                style={{ padding: '8px 18px', fontSize: 13 }}
                onClick={() => {
                  window.location.hash = `#emir?hisse=${hisse}&yon=AL`;
                  onModulDegistir?.('Portföy', 'Emir Ver (Demo)');
                }}
              >
                AL Emri Ver ({hisse})
              </button>
              <button
                className="btn-aksiyon-sat"
                style={{ padding: '8px 18px', fontSize: 13 }}
                onClick={() => {
                  window.location.hash = `#emir?hisse=${hisse}&yon=SAT`;
                  onModulDegistir?.('Portföy', 'Emir Ver (Demo)');
                }}
              >
                SAT Emri Ver ({hisse})
              </button>
              <button
                className="btn-aksiyon-grafik"
                style={{ padding: '8px 18px', fontSize: 13 }}
                onClick={() => {
                  window.location.hash = `#stratejik?hisse=${hisse}`;
                  onModulDegistir?.('Analiz', 'Stratejik Analiz');
                }}
              >
                Derinlik & Stratejik Grafik ↗
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

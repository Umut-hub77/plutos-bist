import React, { useState, useEffect, useMemo } from 'react';
import { fmt } from '../lib/format.jsx';
import { useTickers } from '../lib/useTickers.js';
import HisseSecici from '../components/HisseSecici.jsx';
import BarHucre from '../components/BarHucre.jsx';
import PlotlyGrafik from '../components/PlotlyGrafik.jsx';

function etkinSinirFigur(sonuc) {
  if (!sonuc) return null;

  const data = [];

  // 1. Simüle Edilmiş Portföyler
  if (Array.isArray(sonuc.nokta) && sonuc.nokta.length > 0) {
    data.push({
      type: 'scatter',
      mode: 'markers',
      x: sonuc.nokta.map(p => p.risk),
      y: sonuc.nokta.map(p => p.getiri),
      marker: {
        size: 5,
        color: sonuc.nokta.map(p => p.sharpe != null ? p.sharpe : 1),
        colorscale: 'Viridis',
        opacity: 0.65,
        colorbar: { title: 'Sharpe', len: 0.8, thickness: 12 },
      },
      name: 'Olası Portföyler',
      hoverinfo: 'x+y',
    });
  } else if (sonuc.nokta && sonuc.nokta.risks && sonuc.nokta.returns) {
    data.push({
      type: 'scatter',
      mode: 'markers',
      x: sonuc.nokta.risks,
      y: sonuc.nokta.returns,
      marker: {
        size: 5,
        color: sonuc.nokta.sharpes || '#2962FF',
        colorscale: 'Viridis',
        opacity: 0.65,
        colorbar: { title: 'Sharpe', len: 0.8, thickness: 12 },
      },
      name: 'Olası Portföyler',
      hoverinfo: 'x+y',
    });
  }

  // 2. Tekil Hisseler
  (sonuc.tekil || []).forEach(x => {
    data.push({
      type: 'scatter',
      mode: 'markers+text',
      x: [x.risk],
      y: [x.getiri],
      text: [x.hisse],
      textposition: 'top center',
      name: x.hisse,
      marker: { size: 9, color: '#787B86', symbol: 'circle' },
    });
  });

  // 3. Maksimum Sharpe Noktası
  if (sonuc.max_sharpe) {
    data.push({
      type: 'scatter',
      mode: 'markers+text',
      x: [sonuc.max_sharpe.risk],
      y: [sonuc.max_sharpe.getiri],
      text: ['★ MAKS SHARPE'],
      textposition: 'bottom right',
      name: 'Maks. Sharpe Portföyü',
      marker: { size: 16, color: '#D7FF4E', symbol: 'star' },
    });
  }

  // 4. Minimum Risk Noktası
  if (sonuc.min_risk) {
    data.push({
      type: 'scatter',
      mode: 'markers+text',
      x: [sonuc.min_risk.risk],
      y: [sonuc.min_risk.getiri],
      text: ['★ MİN RİSK'],
      textposition: 'top left',
      name: 'Min. Risk Portföyü',
      marker: { size: 16, color: '#00BCD4', symbol: 'diamond' },
    });
  }

  const layout = {
    height: 420,
    margin: { l: 50, r: 25, t: 25, b: 40 },
    paper_bgcolor: '#131722',
    plot_bgcolor: '#131722',
    hovermode: 'closest',
    font: { family: 'JetBrains Mono', color: '#787B86', size: 11 },
    xaxis: { title: 'Yıllık Risk / Oynaklık (%)', showgrid: true, gridcolor: 'rgba(42, 46, 57, 0.45)' },
    yaxis: { title: 'Yıllık Beklenen Getiri (%)', showgrid: true, gridcolor: 'rgba(42, 46, 57, 0.45)' },
    showlegend: false,
  };

  return { data, layout };
}

function AgirlikKarti({ baslik, renk, p }) {
  if (!p) return null;
  return (
    <div className="kurumsal-kart" style={{ flex: 1, minWidth: 280, borderTop: `3px solid ${renk}` }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h4 style={{ color: renk, margin: 0 }}>{baslik}</h4>
        <span style={{ fontSize: 11, color: '#D1D4DC', fontFamily: 'JetBrains Mono' }}>
          Sharpe: <b>{fmt(p.sharpe, 2)}</b>
        </span>
      </div>
      <div style={{ display: 'flex', gap: 12, fontSize: 12, color: '#787B86', borderBottom: '1px solid #1E222D', paddingBottom: 8 }}>
        <span>Getiri: <b style={{ color: '#089981' }}>%{fmt(p.getiri, 1)}</b></span>
        <span>Risk: <b style={{ color: '#F23645' }}>%{fmt(p.risk, 1)}</b></span>
      </div>
      <table>
        <tbody>
          {Object.entries(p.agirliklar || {})
            .filter(([, a]) => a > 0.05)
            .sort((a, b) => b[1] - a[1])
            .map(([h, a]) => (
              <tr key={h}>
                <td style={{ fontWeight: 700, color: '#FFFFFF', width: 80 }}>{h}</td>
                <td>
                  <BarHucre metin={fmt(a, 1) + '%'} deger={a} maks={100} renk={renk} />
                </td>
              </tr>
            ))}
        </tbody>
      </table>
    </div>
  );
}

export default function PortfoyOptimizasyonu({ api }) {
  const t = useTickers(api);
  const [secili, setSecili] = useState([]);
  const [rf, setRf] = useState(30);
  const [sonuc, setSonuc] = useState(null);
  const [bekle, setBekle] = useState(false);
  const [hata, setHata] = useState('');

  useEffect(() => {
    api('/api/portfolio/raw')
      .then(r => {
        const h = Object.keys(r.portfolio || {});
        if (h.length >= 2) setSecili(h.slice(0, 10));
        else setSecili(['THYAO', 'GARAN', 'ASELS', 'EREGL', 'TUPRS']);
      })
      .catch(() => {
        setSecili(['THYAO', 'GARAN', 'ASELS', 'EREGL', 'TUPRS']);
      });
  }, [api]);

  const calistir = async () => {
    setBekle(true);
    setHata('');
    try {
      const res = await api('/api/optimize', {
        method: 'POST',
        govde: { hisseler: secili, rf: Number(rf) },
      });
      setSonuc(res);
    } catch (e) {
      setHata(e.message);
      setSonuc(null);
    } finally {
      setBekle(false);
    }
  };

  const frontierFig = useMemo(() => {
    return etkinSinirFigur(sonuc);
  }, [sonuc]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* 1. KONTROL FORMU */}
      <div className="kurumsal-kart" style={{ padding: 18 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <h4 style={{ color: '#FFFFFF', margin: 0 }}>⚖️ Markowitz Modern Portföy Optimizasyonu (Etkin Sınır)</h4>
          <span style={{ fontSize: 11, color: '#787B86' }}>Mean-Variance Frontier Analizi</span>
        </div>

        <HisseSecici
          etiket="Optimize Edilecek BIST Hisseleri (2 – 10 Hisse):"
          tickers={t?.tickers}
          secili={secili}
          onChange={setSecili}
          max={10}
        />

        <div style={{ display: 'flex', gap: 12, alignItems: 'flex-end', marginTop: 12, flexWrap: 'wrap' }}>
          <div style={{ maxWidth: 240 }}>
            <label style={{ fontSize: 11.5, color: '#787B86', textTransform: 'uppercase', marginBottom: 4, display: 'block' }}>
              Yıllık Risksiz Faiz Oranı (%):
            </label>
            <input
              type="number"
              step="0.5"
              value={rf}
              onChange={e => setRf(e.target.value)}
              style={{ width: '100%' }}
            />
          </div>

          <button
            className="arac-btn aktif"
            onClick={calistir}
            disabled={bekle || secili.length < 2}
            style={{ padding: '9px 24px', fontSize: 13, height: 40 }}
          >
            {bekle ? 'Optimizasyon Hesaplanıyor…' : 'Optimizasyonu Çalıştır'}
          </button>
        </div>

        {secili.length < 2 && <div className="not" style={{ marginTop: 8 }}>Optimizasyon için en az 2 hisse seçilmelidir.</div>}
        {hata && <div className="error-msg" style={{ marginTop: 8 }}>{hata}</div>}
      </div>

      {/* 2. OPTİMİZASYON SONUÇLARI */}
      {sonuc && (
        <>
          {/* Önerilen Dağılım Kartları */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16 }}>
            <AgirlikKarti baslik="⭐ Maksimum Sharpe Portföyü" renk="#D7FF4E" p={sonuc.max_sharpe} />
            <AgirlikKarti baslik="🛡️ Minimum Risk Portföyü" renk="#00BCD4" p={sonuc.min_risk} />
            <AgirlikKarti baslik="⚖️ Eşit Ağırlıklı Portföy" renk="#FF9800" p={sonuc.esit} />
          </div>

          {/* Markowitz Etkin Sınır Grafiği */}
          <div className="kurumsal-kart" style={{ padding: 18 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <h4 style={{ color: '#FFFFFF', margin: 0 }}>📊 Markowitz Risk – Getiri Etkin Sınır Haritası</h4>
              <span style={{ fontSize: 11, color: '#787B86' }}>6.000 Monte Carlo Simülasyon Noktası</span>
            </div>
            {frontierFig && <PlotlyGrafik data={frontierFig.data} layout={frontierFig.layout} />}
          </div>
        </>
      )}
    </div>
  );
}

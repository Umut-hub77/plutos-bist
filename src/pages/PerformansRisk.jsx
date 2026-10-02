import React, { useState, useEffect, useMemo } from 'react';
import { fmt, Yuzde, Metrik } from '../lib/format.jsx';
import BarHucre from '../components/BarHucre.jsx';
import PlotlyGrafik from '../components/PlotlyGrafik.jsx';

function benchmarkFigurUret(seriler) {
  if (!seriler || !seriler.length) return null;

  const data = seriler.map(s => ({
    type: 'scatter',
    mode: 'lines',
    x: s.noktalar.map(p => p.t),
    y: s.noktalar.map(p => p.v),
    name: s.hisse,
    line: {
      color: s.hisse === 'Portföy' ? '#2962FF' : '#FF9800',
      width: s.hisse === 'Portföy' ? 2.5 : 1.8,
    },
    ...(s.hisse === 'Portföy' ? { fill: 'tozeroy', fillcolor: 'rgba(41, 98, 255, 0.08)' } : {}),
  }));

  const layout = {
    height: 360,
    margin: { l: 45, r: 25, t: 20, b: 35 },
    paper_bgcolor: '#131722',
    plot_bgcolor: '#131722',
    hovermode: 'x unified',
    font: { family: 'JetBrains Mono', color: '#787B86', size: 11 },
    xaxis: { showgrid: true, gridcolor: 'rgba(42, 46, 57, 0.45)' },
    yaxis: { showgrid: true, gridcolor: 'rgba(42, 46, 57, 0.45)', tickformat: '.0f' },
    legend: { orientation: 'h', y: 1.05, x: 1, xanchor: 'right', font: { color: '#D1D4DC' } },
  };

  return { data, layout };
}

export default function PerformansRisk({ api }) {
  const [rf, setRf] = useState(30);
  const [veri, setVeri] = useState(null);
  const [yukleniyor, setYukleniyor] = useState(true);
  const [hata, setHata] = useState('');

  useEffect(() => {
    let iptal = false;
    setYukleniyor(true);
    setHata('');
    api('/api/performance?rf=' + (Number(rf) || 0))
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
  }, [api, rf]);

  const benchmarkFig = useMemo(() => {
    return benchmarkFigurUret(veri?.seriler);
  }, [veri]);

  if (hata) return <div className="error-msg">{hata}</div>;
  if (!veri && yukleniyor) return <div className="loading-hint">Performans & Risk Analizi Hesaplanıyor…</div>;
  if (veri?.bos) {
    return (
      <div className="bilgi-kutu" style={{ marginTop: 0 }}>
        Portföyünüzde analiz edilecek hisse bulunmuyor. Lütfen yan menüden veya "Emir Ver (Demo)" ekranından hisse ekleyin.
      </div>
    );
  }

  const m = veri.metrikler;
  const fark = m.bist_getiri == null ? null : m.toplam_getiri - m.bist_getiri;
  const maks = Math.max(...veri.satirlar.map(s => s.agirlik));

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16, opacity: yukleniyor ? 0.6 : 1 }}>
      {/* 1. ÜST KURUMSAL RİSK VE GETİRİ KARTLARI */}
      <div className="kurumsal-grid-4">
        <div className="kurumsal-kart" style={{ borderTop: '3px solid #2962FF' }}>
          <div className="kurumsal-kart-baslik">
            <span>Portföy Getirisi (1 Yıl)</span>
            <span className="rozet-al">Portföy</span>
          </div>
          <div className="kurumsal-kart-deger" style={{ color: m.toplam_getiri >= 0 ? '#089981' : '#F23645' }}>
            <Yuzde v={m.toplam_getiri} />
          </div>
          <div className="kurumsal-kart-alt">
            <span>BIST 100'e Göre Alfa:</span>
            <span style={{ fontWeight: 700, fontFamily: 'JetBrains Mono', color: fark >= 0 ? '#089981' : '#F23645' }}>
              {fark == null ? '—' : <Yuzde v={fark} />}
            </span>
          </div>
        </div>

        <div className="kurumsal-kart" style={{ borderTop: '3px solid #FF9800' }}>
          <div className="kurumsal-kart-baslik">
            <span>BIST 100 Gösterge Getirisi</span>
            <span style={{ fontSize: 11, color: '#787B86' }}>Benchmark</span>
          </div>
          <div className="kurumsal-kart-deger">
            <Yuzde v={m.bist_getiri} />
          </div>
          <div className="kurumsal-kart-alt">
            <span>XU100 Yıllık Getiri</span>
            <span style={{ color: '#D1D4DC' }}>1 Yıl</span>
          </div>
        </div>

        <div className="kurumsal-kart" style={{ borderTop: '3px solid #00BCD4' }}>
          <div className="kurumsal-kart-baslik">
            <span>Sharpe Oranı</span>
            <span className="rozet-al" style={{ color: '#00BCD4', borderColor: 'rgba(0,188,212,0.4)', background: 'rgba(0,188,212,0.1)' }}>RİSK/GETİRİ</span>
          </div>
          <div className="kurumsal-kart-deger" style={{ color: '#00BCD4' }}>
            {fmt(m.sharpe, 2)}
          </div>
          <div className="kurumsal-kart-alt">
            <span>Risksiz Faiz: %{rf}</span>
            <span>{m.sharpe >= 1 ? 'Mükemmel' : m.sharpe > 0 ? 'İyi' : 'Yetersiz'}</span>
          </div>
        </div>

        <div className="kurumsal-kart" style={{ borderTop: '3px solid #F23645' }}>
          <div className="kurumsal-kart-baslik">
            <span>Maksimum Düşüş (Max DD)</span>
            <span className="rozet-sat">RİSK</span>
          </div>
          <div className="kurumsal-kart-deger" style={{ color: '#F23645' }}>
            %{fmt(m.max_dusus, 1)}
          </div>
          <div className="kurumsal-kart-alt">
            <span>Zirveden Dip Kayıp</span>
            <span>Yıllık</span>
          </div>
        </div>
      </div>

      {/* İkincil Risk Metrikleri */}
      <div className="kurumsal-grid-4">
        <div className="kurumsal-kart">
          <div className="kurumsal-kart-baslik"><span>Yıllık Volatilite (Oynaklık)</span></div>
          <div className="kurumsal-kart-deger">%{fmt(m.yillik_vol, 1)}</div>
          <div className="kurumsal-kart-alt"><span>Yıllık Standart Sapma</span></div>
        </div>

        <div className="kurumsal-kart">
          <div className="kurumsal-kart-baslik"><span>Beta (BIST 100 Duyarlılığı)</span></div>
          <div className="kurumsal-kart-deger">{fmt(m.beta, 2)}</div>
          <div className="kurumsal-kart-alt"><span>Piyasaya Göre Hassasiyet</span></div>
        </div>

        <div className="kurumsal-kart">
          <div className="kurumsal-kart-baslik"><span>Yıllık Jensen Alfası</span></div>
          <div className="kurumsal-kart-deger" style={{ color: m.alfa >= 0 ? '#089981' : '#F23645' }}>
            <Yuzde v={m.alfa} />
          </div>
          <div className="kurumsal-kart-alt"><span>Ek Getiri Katkısı</span></div>
        </div>

        <div className="kurumsal-kart">
          <div className="kurumsal-kart-baslik"><span>Günlük %95 VaR (Riske Maruz Değer)</span></div>
          <div className="kurumsal-kart-deger" style={{ color: '#F23645' }}>
            {fmt(m.var95_tutar, 0)} ₺
          </div>
          <div className="kurumsal-kart-alt"><span>Günlük Portföyün %{fmt(m.var95_yuzde, 2)}'si</span></div>
        </div>
      </div>

      {/* 2. BENCHMARK KIYASLAMA GRAFİĞİ (PORTFÖY VS BIST 100) */}
      <div className="kurumsal-kart" style={{ padding: 18 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <h4 style={{ color: '#FFFFFF', margin: 0 }}>📈 Portföy Büyüme Eğrisi vs BIST 100 (Başlangıç = 100)</h4>
          <span style={{ fontSize: 11, color: '#787B86' }}>TradingView Kurumsal Grafik</span>
        </div>
        {benchmarkFig && <PlotlyGrafik data={benchmarkFig.data} layout={benchmarkFig.layout} />}
      </div>

      {/* 3. HİSSE BAZINDA KATKI VE AĞIRLIK TABLOSU */}
      <div className="kurumsal-kart" style={{ padding: 18 }}>
        <h4 style={{ color: '#FFFFFF', margin: '0 0 12px' }}>📊 Varlık Katkı ve Risk Dağılımı</h4>
        <div style={{ overflowX: 'auto' }}>
          <table>
            <thead>
              <tr>
                <th>Hisse</th>
                <th>Portföy Ağırlığı</th>
                <th>1 Yıllık Getiri</th>
                <th>Yıllık Volatilite</th>
              </tr>
            </thead>
            <tbody>
              {veri.satirlar.map(s => (
                <tr key={s.hisse}>
                  <td>
                    <span style={{ fontWeight: 700, color: '#FFFFFF', fontFamily: 'JetBrains Mono' }}>{s.hisse}</span>
                  </td>
                  <td>
                    <BarHucre metin={fmt(s.agirlik, 1) + '%'} deger={s.agirlik} maks={maks} renk="#2962FF" />
                  </td>
                  <td>
                    <Yuzde v={s.getiri} />
                  </td>
                  <td style={{ fontFamily: 'JetBrains Mono', fontWeight: 600 }}>%{fmt(s.volatilite, 1)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div style={{ maxWidth: 280, marginTop: 14 }}>
          <label style={{ fontSize: 11.5, color: '#787B86', textTransform: 'uppercase', marginBottom: 4, display: 'block' }}>
            Risksiz Faiz Oranı (Yıllık %):
          </label>
          <input
            type="number"
            step="0.5"
            value={rf}
            onChange={e => setRf(e.target.value)}
            style={{ width: '100%' }}
          />
        </div>
      </div>
    </div>
  );
}

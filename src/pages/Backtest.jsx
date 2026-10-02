import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { fmt, Yuzde, Metrik } from '../lib/format.jsx';
import { useTickers } from '../lib/useTickers.js';
import TekHisse from '../components/TekHisse.jsx';
import PlotlyGrafik from '../components/PlotlyGrafik.jsx';

const STRATEJILER = {
  'SMA Kesişimi': { aciklama: 'Hızlı SMA yavaş SMA\'yı yukarı kestiğinde AL, aşağı kestiğinde SAT.', p1: ['Hızlı SMA', 20], p2: ['Yavaş SMA', 50] },
  'RSI': { aciklama: 'RSI aşırı satım eşiğinin (<30) altına inince AL, aşırı alım (>70) üstüne çıkınca SAT.', p1: ['Alım Eşiği', 30], p2: ['Satım Eşiği', 70] },
  'MACD': { aciklama: 'MACD çizgisi sinyal çizgisini yukarı kestiğinde pozisyona gir, aşağı kestiğinde çık.' },
  'Bollinger': { aciklama: 'Fiyat Bollinger alt bandının altına inince AL, orta bandın (SMA20) üstüne çıkınca SAT.' },
};

function equityFigurUret(seriler, sermaye) {
  if (!seriler || !seriler.length) return null;

  const data = seriler.map(s => ({
    type: 'scatter',
    mode: 'lines',
    x: s.noktalar.map(p => p.t),
    y: s.noktalar.map(p => p.v),
    name: s.hisse,
    line: {
      color: s.hisse.includes('Strateji') ? '#2962FF' : '#FF9800',
      width: s.hisse.includes('Strateji') ? 2.5 : 1.5,
    },
    ...(s.hisse.includes('Strateji') ? { fill: 'tozeroy', fillcolor: 'rgba(41, 98, 255, 0.08)' } : {}),
  }));

  const layout = {
    height: 380,
    margin: { l: 50, r: 25, t: 20, b: 35 },
    paper_bgcolor: '#131722',
    plot_bgcolor: '#131722',
    hovermode: 'x unified',
    font: { family: 'JetBrains Mono', color: '#787B86', size: 11 },
    xaxis: { showgrid: true, gridcolor: 'rgba(42, 46, 57, 0.45)' },
    yaxis: { showgrid: true, gridcolor: 'rgba(42, 46, 57, 0.45)', tickformat: ',.0f' },
    legend: { orientation: 'h', y: 1.05, x: 1, xanchor: 'right', font: { color: '#D1D4DC' } },
  };

  return { data, layout };
}

export default function Backtest({ api }) {
  const t = useTickers(api);
  const [hisse, setHisse] = useState('THYAO');
  const [strateji, setStrateji] = useState('SMA Kesişimi');
  const [p1, setP1] = useState(20);
  const [p2, setP2] = useState(50);
  const [periyot, setPeriyot] = useState('2y');
  const [sermaye, setSermaye] = useState(100000);
  const [komisyon, setKomisyon] = useState(10);
  const [sonuc, setSonuc] = useState(null);
  const [gecmis, setGecmis] = useState([]);
  const [bekle, setBekle] = useState(false);
  const [hata, setHata] = useState('');

  const gecmisYukle = useCallback(() => {
    api('/api/backtest/history')
      .then(r => setGecmis(r.gecmis || []))
      .catch(() => {});
  }, [api]);

  useEffect(() => {
    gecmisYukle();
  }, [gecmisYukle]);

  const stratDegis = (s) => {
    setStrateji(s);
    const c = STRATEJILER[s];
    if (c.p1) {
      setP1(c.p1[1]);
      setP2(c.p2[1]);
    }
  };

  const calistir = async () => {
    setBekle(true);
    setHata('');
    try {
      const r = await api('/api/backtest', {
        method: 'POST',
        govde: {
          hisse,
          strateji,
          periyot,
          sermaye: Number(sermaye),
          komisyon_bps: Number(komisyon),
          p1: Number(p1),
          p2: Number(p2),
        },
      });
      setSonuc(r);
      gecmisYukle();
    } catch (e) {
      setHata(e.message);
      setSonuc(null);
    } finally {
      setBekle(false);
    }
  };

  const c = STRATEJILER[strateji];
  const m = sonuc?.metrikler;

  const equityFig = useMemo(() => {
    return equityFigurUret(sonuc?.seriler, sermaye);
  }, [sonuc, sermaye]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* 1. STRATEJİ AYARLARI KARTI */}
      <div className="kurumsal-kart" style={{ padding: 18 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <h4 style={{ color: '#FFFFFF', margin: 0 }}>🧪 Algoritmik Strateji Backtest Laboratuvarı</h4>
          <span style={{ fontSize: 11, color: '#787B86' }}>Tarihsel Simülasyon Motoru</span>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12 }}>
          <div>
            <TekHisse etiket="Hisse Sembolü:" tickers={t?.tickers} deger={hisse} onChange={setHisse} />
          </div>

          <div>
            <label style={{ fontSize: 11.5, color: '#787B86', textTransform: 'uppercase', marginBottom: 4, display: 'block' }}>
              Strateji Modeli:
            </label>
            <select value={strateji} onChange={e => stratDegis(e.target.value)}>
              {Object.keys(STRATEJILER).map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>

          <div>
            <label style={{ fontSize: 11.5, color: '#787B86', textTransform: 'uppercase', marginBottom: 4, display: 'block' }}>
              Test Dönemi:
            </label>
            <select value={periyot} onChange={e => setPeriyot(e.target.value)}>
              {['6mo', '1y', '2y', '5y'].map(p => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>

          <div>
            <label style={{ fontSize: 11.5, color: '#787B86', textTransform: 'uppercase', marginBottom: 4, display: 'block' }}>
              Başlangıç Sermayesi (₺):
            </label>
            <input type="number" step="10000" value={sermaye} onChange={e => setSermaye(e.target.value)} />
          </div>
        </div>

        {c.p1 && (
          <div style={{ display: 'flex', gap: 12, marginTop: 10 }}>
            <div>
              <label style={{ fontSize: 11, color: '#787B86' }}>{c.p1[0]}:</label>
              <input type="number" value={p1} onChange={e => setP1(e.target.value)} style={{ width: 100 }} />
            </div>
            {c.p2 && (
              <div>
                <label style={{ fontSize: 11, color: '#787B86' }}>{c.p2[0]}:</label>
                <input type="number" value={p2} onChange={e => setP2(e.target.value)} style={{ width: 100 }} />
              </div>
            )}
          </div>
        )}

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 14, paddingTop: 10, borderTop: '1px solid #1E222D' }}>
          <span style={{ fontSize: 12, color: '#787B86' }}>{c.aciklama}</span>
          <button
            className="arac-btn aktif"
            onClick={calistir}
            disabled={bekle}
            style={{ padding: '9px 24px', fontSize: 13 }}
          >
            {bekle ? 'Backtest Hesaplanıyor…' : 'Backtesti Başlat'}
          </button>
        </div>

        {hata && <div className="error-msg" style={{ marginTop: 10 }}>{hata}</div>}
      </div>

      {/* 2. BACKTEST SONUÇLARI */}
      {sonuc && m && (
        <>
          <div className="kurumsal-grid-4">
            <div className="kurumsal-kart" style={{ borderTop: `3px solid ${m.toplam_getiri >= 0 ? '#089981' : '#F23645'}` }}>
              <div className="kurumsal-kart-baslik"><span>Net Kâr / Zarar</span><span className="rozet-al">Performans</span></div>
              <div className="kurumsal-kart-deger" style={{ color: m.toplam_getiri >= 0 ? '#089981' : '#F23645' }}>
                <Yuzde v={m.toplam_getiri} />
              </div>
              <div className="kurumsal-kart-alt">
                <span>Son Sermaye:</span>
                <span style={{ fontWeight: 700, fontFamily: 'JetBrains Mono', color: '#FFFFFF' }}>{fmt(m.son_kasa ?? m.son_deger, 0)} ₺</span>
              </div>
            </div>

            <div className="kurumsal-kart" style={{ borderTop: '3px solid #2962FF' }}>
              <div className="kurumsal-kart-baslik"><span>Kazanma Oranı</span><span className="rozet-al" style={{ color: '#2962FF', borderColor: 'rgba(41,98,255,0.4)', background: 'rgba(41,98,255,0.1)' }}>WIN RATE</span></div>
              <div className="kurumsal-kart-deger" style={{ color: '#2962FF' }}>
                %{fmt(m.kazanma_orani ?? m.basari_orani, 1)}
              </div>
              <div className="kurumsal-kart-alt">
                <span>Başarılı İşlemler:</span>
                <span>{m.kar_islem ?? Math.round(((m.basari_orani || 0) * (m.islem_sayisi || 0)) / 100)} / {m.islem_sayisi}</span>
              </div>
            </div>

            <div className="kurumsal-kart" style={{ borderTop: '3px solid #00BCD4' }}>
              <div className="kurumsal-kart-baslik"><span>Kâr Faktörü / Sharpe</span><span className="rozet-al" style={{ color: '#00BCD4', borderColor: 'rgba(0,188,212,0.4)', background: 'rgba(0,188,212,0.1)' }}>VERİM</span></div>
              <div className="kurumsal-kart-deger" style={{ color: '#00BCD4' }}>
                {fmt(m.kar_faktoru ?? m.sharpe, 2)}
              </div>
              <div className="kurumsal-kart-alt"><span>{m.kar_faktoru != null ? 'Kazanç / Kayıp Oranı' : 'Sharpe Oranı'}</span></div>
            </div>

            <div className="kurumsal-kart" style={{ borderTop: '3px solid #F23645' }}>
              <div className="kurumsal-kart-baslik"><span>Maksimum Düşüş</span><span className="rozet-sat">RİSK</span></div>
              <div className="kurumsal-kart-deger" style={{ color: '#F23645' }}>
                %{fmt(m.max_dusus, 1)}
              </div>
              <div className="kurumsal-kart-alt"><span>Buy & Hold Getirisi: %{fmt(m.bh_getiri, 1)}</span></div>
            </div>
          </div>

          {/* Sermaye Büyüme Eğrisi */}
          <div className="kurumsal-kart" style={{ padding: 18 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <h4 style={{ color: '#FFFFFF', margin: 0 }}>📈 Strateji Sermaye Büyüme Eğrisi (Equity Curve) vs Hisse</h4>
              <span style={{ fontSize: 11, color: '#787B86' }}>Net Komisyon Kesintili</span>
            </div>
            {equityFig && <PlotlyGrafik data={equityFig.data} layout={equityFig.layout} />}
          </div>

          {/* İşlem Günlüğü */}
          {sonuc.islemler?.length > 0 && (
            <div className="kurumsal-kart" style={{ padding: 18 }}>
              <h4 style={{ color: '#FFFFFF', margin: '0 0 12px' }}>📑 Gerçekleşen Alım / Satım İşlemleri ({sonuc.islemler.length})</h4>
              <div style={{ overflowX: 'auto', maxHeight: 300 }}>
                <table>
                  <thead>
                    <tr>
                      <th>Alış Tarihi</th>
                      <th>Alış Fiyatı</th>
                      <th>Satış Tarihi</th>
                      <th>Satış Fiyatı</th>
                      <th>Net Getiri</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sonuc.islemler.map((is, i) => (
                      <tr key={i}>
                        <td style={{ color: '#787B86' }}>{is.giris_tarih || is.giris_t}</td>
                        <td style={{ fontWeight: 600 }}>{fmt(is.giris ?? is.giris_f)} ₺</td>
                        <td style={{ color: '#787B86' }}>{is.cikis_tarih || is.cikis_t}</td>
                        <td style={{ fontWeight: 600 }}>{fmt(is.cikis ?? is.cikis_f)} ₺</td>
                        <td>
                          <span className={is.getiri >= 0 ? 'rozet-al' : 'rozet-sat'}>
                            {is.getiri >= 0 ? '+' : ''}{fmt(is.getiri, 2)}%
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

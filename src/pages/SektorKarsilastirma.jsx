import React, { useState, useEffect, useMemo } from 'react';
import { Yuzde, fmt } from '../lib/format.jsx';
import { useTickers } from '../lib/useTickers.js';
import HisseSecici from '../components/HisseSecici.jsx';
import BarHucre from '../components/BarHucre.jsx';
import PlotlyGrafik from '../components/PlotlyGrafik.jsx';

const PERIYOTLAR = [
  { id: '1mo', etiket: '1 Ay' },
  { id: '3mo', etiket: '3 Ay' },
  { id: '6mo', etiket: '6 Ay' },
  { id: '1y', etiket: '1 Yıl' },
];

function sektorKarsilastirmaFigur(seriler) {
  if (!seriler || !seriler.length) return null;

  const data = seriler.map(s => ({
    type: 'scatter',
    mode: 'lines',
    x: s.noktalar.map(p => p.t),
    y: s.noktalar.map(p => p.v),
    name: s.hisse,
    line: { width: 2 },
  }));

  const layout = {
    height: 380,
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

export default function SektorKarsilastirma({ api, onModulDegistir }) {
  const t = useTickers(api);
  const [sektorler, setSektorler] = useState(null);
  const [sektor, setSektor] = useState('');
  const [periyot, setPeriyot] = useState('3mo');
  const [secili, setSecili] = useState([]);
  const [sonuc, setSonuc] = useState(null);
  const [yukleniyor, setYukleniyor] = useState(false);
  const [hata, setHata] = useState('');

  useEffect(() => {
    api('/api/sectors')
      .then(r => {
        setSektorler(r.sektorler);
        const ilk = Object.keys(r.sektorler)[0];
        setSektor(ilk);
        setSecili(r.sektorler[ilk] || []);
      })
      .catch(e => setHata(e.message));
  }, [api]);

  const sektorDegistir = (s) => {
    setSektor(s);
    setSecili(sektorler[s] || []);
  };

  const anahtar = secili.join(',');
  useEffect(() => {
    if (secili.length < 2) {
      setSonuc(null);
      return;
    }
    let iptal = false;
    setYukleniyor(true);
    setHata('');
    api(`/api/sector-compare?hisseler=${encodeURIComponent(anahtar)}&periyot=${periyot}`)
      .then(r => {
        if (!iptal) setSonuc(r);
      })
      .catch(e => {
        if (!iptal) {
          setHata(e.message);
          setSonuc(null);
        }
      })
      .finally(() => {
        if (!iptal) setYukleniyor(false);
      });
    return () => {
      iptal = true;
    };
  }, [api, anahtar, periyot]);

  const maks = useMemo(() => Math.max(0, ...(sonuc?.satirlar || []).map(s => Math.abs(s.getiri))), [sonuc]);

  const sektorFig = useMemo(() => {
    return sektorKarsilastirmaFigur(sonuc?.seriler);
  }, [sonuc]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* 1. SEKTÖR VE DÖNEM SEÇİMİ */}
      <div className="kurumsal-kart" style={{ padding: 18 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <h4 style={{ color: '#FFFFFF', margin: 0 }}>🏢 BIST Sektör İçi Göreceli Performans Kıyaslaması</h4>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <button
              onClick={() => onModulDegistir?.('Hisse Araştırma')}
              className="buton buton-birincil"
              style={{ fontSize: 11.5, padding: '5px 12px', display: 'flex', alignItems: 'center', gap: 6 }}
            >
              🔬 Sektörel Çarpan & PD/DD Taraması ➔
            </button>
            <span style={{ fontSize: 11, color: '#787B86' }}>Sektörel Rotasyon Analizi</span>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', alignItems: 'flex-end' }}>
          <div style={{ minWidth: 240 }}>
            <label style={{ fontSize: 11.5, color: '#787B86', textTransform: 'uppercase', marginBottom: 4, display: 'block' }}>
              BIST Sektörü:
            </label>
            <select value={sektor} onChange={e => sektorDegistir(e.target.value)} disabled={!sektorler}>
              {Object.keys(sektorler || {}).map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>

          <div>
            <label style={{ fontSize: 11.5, color: '#787B86', textTransform: 'uppercase', marginBottom: 4, display: 'block' }}>
              Karşılaştırma Dönemi:
            </label>
            <div className="arac-grup">
              {PERIYOTLAR.map(p => (
                <button
                  key={p.id}
                  className={`arac-btn ${periyot === p.id ? 'aktif' : ''}`}
                  onClick={() => setPeriyot(p.id)}
                >
                  {p.etiket}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div style={{ marginTop: 12 }}>
          <HisseSecici
            etiket="Kıyaslanacak Sektör Hisseleri:"
            tickers={t?.tickers}
            secili={secili}
            onChange={setSecili}
            max={8}
          />
        </div>

        {hata && <div className="error-msg" style={{ marginTop: 8 }}>{hata}</div>}
      </div>

      {/* 2. KARŞILAŞTIRMA GRAFİĞİ VE TABLOSU */}
      {sonuc && (
        <>
          <div className="kurumsal-kart" style={{ padding: 18, opacity: yukleniyor ? 0.6 : 1 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <h4 style={{ color: '#FFFFFF', margin: 0 }}>📈 Göreceli Fiyat Büyümesi (Başlangıç = 100)</h4>
              <span style={{ fontSize: 11, color: '#787B86' }}>Normalize Edilmiş Performans</span>
            </div>
            {sektorFig && <PlotlyGrafik data={sektorFig.data} layout={sektorFig.layout} />}
          </div>

          <div className="kurumsal-kart" style={{ padding: 18 }}>
            <h4 style={{ color: '#FFFFFF', margin: '0 0 12px' }}>📊 Sektör Hisseleri Getiri Sıralaması</h4>
            <div style={{ overflowX: 'auto' }}>
              <table>
                <thead>
                  <tr>
                    <th>Hisse</th>
                    <th>Son Fiyat</th>
                    <th>Günlük Değişim</th>
                    <th>Dönem Getirisi</th>
                    <th>Yıllık Volatilite</th>
                    <th style={{ textAlign: 'right' }}>İşlem</th>
                  </tr>
                </thead>
                <tbody>
                  {(sonuc.satirlar || []).map(s => (
                    <tr key={s.hisse}>
                      <td>
                        <span style={{ fontWeight: 700, color: '#FFFFFF', fontFamily: 'JetBrains Mono' }}>{s.hisse}</span>
                      </td>
                      <td style={{ fontWeight: 700, color: '#FFFFFF' }}>
                        {s.fiyat == null ? '—' : fmt(s.fiyat) + ' ₺'}
                      </td>
                      <td>
                        <span className={s.gunluk >= 0 ? 'rozet-al' : 'rozet-sat'}>
                          {s.gunluk >= 0 ? '▲ +' : '▼ '}{fmt(s.gunluk)}%
                        </span>
                      </td>
                      <td>
                        <BarHucre
                          metin={(s.getiri >= 0 ? '+' : '') + fmt(s.getiri, 1) + '%'}
                          deger={Math.abs(s.getiri)}
                          maks={maks}
                          renk={s.getiri >= 0 ? '#089981' : '#F23645'}
                        />
                      </td>
                      <td style={{ fontFamily: 'JetBrains Mono', fontWeight: 600 }}>%{fmt(s.volatilite, 1)}</td>
                      <td style={{ textAlign: 'right' }}>
                        <div className="hisse-aksiyon-grup" style={{ justifyContent: 'flex-end' }}>
                          <button
                            className="btn-aksiyon-al"
                            onClick={() => {
                              window.location.hash = `#emir?hisse=${s.hisse}&yon=AL`;
                              onModulDegistir?.('Portföy', 'Emir Ver (Demo)');
                            }}
                          >
                            AL
                          </button>
                          <button
                            className="btn-aksiyon-grafik"
                            onClick={() => {
                              window.location.hash = `#stratejik?hisse=${s.hisse}`;
                              onModulDegistir?.('Analiz', 'Stratejik Analiz');
                            }}
                          >
                            Grafik
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

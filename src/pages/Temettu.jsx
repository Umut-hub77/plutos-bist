import React, { useState, useEffect, useMemo } from 'react';
import { fmt } from '../lib/format.jsx';
import { useTickers } from '../lib/useTickers.js';
import HisseSecici from '../components/HisseSecici.jsx';
import PlotlyGrafik from '../components/PlotlyGrafik.jsx';
import { BIST_DARK_TEMPLATE } from '../lib/plotlyTema.js';

export default function Temettu({ api }) {
  const t = useTickers(api);
  const [secili, setSecili] = useState(null);
  const [sonuc, setSonuc] = useState(null);
  const [yukleniyor, setYukleniyor] = useState(false);
  const [hata, setHata] = useState('');
  const [aktifSekme, setAktifSekme] = useState('siralama'); // 'siralama' | 'takvim' | 'drip'

  // DRIP (Temettü Yeniden Yatırım) Simülatörü State
  const [dripHisse, setDripHisse] = useState('FROTO');
  const [dripBaslangicLot, setDripBaslangicLot] = useState(500);
  const [dripYil, setDripYil] = useState(10);
  const [dripYillikArtis, setDripYillikArtis] = useState(25); // hisse fiyat artış %
  const [dripVerim, setDripVerim] = useState(7.5); // temettü verimi %

  useEffect(() => {
    if (t && secili === null) setSecili(t.varsayilan_temettu || ['EREGL', 'FROTO', 'TUPRS', 'TTRAK', 'TOASO', 'SISE', 'ISCTR']);
  }, [t, secili]);

  const anahtar = (secili || []).join(',');
  useEffect(() => {
    if (!secili || !secili.length) { setSonuc(null); return; }
    let iptal = false;
    setYukleniyor(true); setHata('');
    api('/api/dividends?hisseler=' + encodeURIComponent(anahtar))
      .then(r => { if (!iptal) setSonuc(r); })
      .catch(e => { if (!iptal) { setHata(e.message); setSonuc(null); } })
      .finally(() => { if (!iptal) setYukleniyor(false); });
    return () => { iptal = true; };
  }, [api, anahtar]);

  // Metrik Hesaplamaları
  const istatistikler = useMemo(() => {
    if (!sonuc?.verimler?.length) return null;
    const sirali = [...sonuc.verimler].sort((a, b) => b.verim - a.verim);
    const enYuksek = sirali[0];
    const ortalama = sirali.reduce((acc, x) => acc + (x.verim || 0), 0) / sirali.length;
    const toplamNakit = sirali.reduce((acc, x) => acc + (x.yillik_temettu || 0), 0);
    const verimSayisi = sirali.filter(x => x.verim > 0).length;

    return { enYuksek, ortalama, toplamNakit, verimSayisi, sirali };
  }, [sonuc]);

  // Plotly Bar Grafik Verisi
  const barGrafikVerisi = useMemo(() => {
    if (!istatistikler?.sirali?.length) return null;
    const veriler = istatistikler.sirali;
    const hisseler = veriler.map(v => v.hisse);
    const verimler = veriler.map(v => v.verim);
    const renkler = verimler.map(v => v >= istatistikler.ortalama ? '#089981' : '#2962FF');

    return {
      data: [
        {
          x: hisseler,
          y: verimler,
          type: 'bar',
          name: 'Temettü Verimi %',
          marker: {
            color: renkler,
            line: { color: '#ffffff', width: 0.5 }
          },
          text: verimler.map(v => `%${fmt(v, 2)}`),
          textposition: 'auto',
          hoverinfo: 'x+y'
        }
      ],
      layout: {
        ...BIST_DARK_TEMPLATE.layout,
        title: { text: 'BIST Temettü Verim Dağılımı (%)', font: { color: '#e6edf3', size: 14 } },
        height: 320,
        margin: { l: 50, r: 30, t: 40, b: 50 },
        shapes: [
          {
            type: 'line',
            xref: 'paper',
            x0: 0,
            x1: 1,
            yref: 'y',
            y0: istatistikler.ortalama,
            y1: istatistikler.ortalama,
            line: { color: '#FF9800', width: 2, dash: 'dot' }
          }
        ],
        annotations: [
          {
            xref: 'paper',
            x: 0.98,
            yref: 'y',
            y: istatistikler.ortalama,
            text: `Ortalama: %${fmt(istatistikler.ortalama, 2)}`,
            showarrow: false,
            font: { color: '#FF9800', size: 11 },
            bgcolor: 'rgba(20, 24, 35, 0.85)',
            bordercolor: '#FF9800',
            borderwidth: 1
          }
        ]
      }
    };
  }, [istatistikler]);

  // DRIP Simülasyonu
  const dripSonuc = useMemo(() => {
    let lotYeniden = dripBaslangicLot;
    let lotNakit = dripBaslangicLot;
    const yillar = [];
    const serilerReinvest = [];
    const serilerNakit = [];
    const baslangicFiyat = 100; // Baz endeksli
    let fiyat = baslangicFiyat;

    for (let y = 0; y <= dripYil; y++) {
      const portfoyReinvest = lotYeniden * fiyat;
      const portfoyNakit = lotNakit * fiyat;
      yillar.push(`Yıl ${y}`);
      serilerReinvest.push(portfoyReinvest);
      serilerNakit.push(portfoyNakit);

      // Yıl sonu temettü ödemesi & yeniden alım
      const temettuGeliri = lotYeniden * fiyat * (dripVerim / 100);
      const ekLot = temettuGeliri / fiyat;
      lotYeniden += ekLot;
      fiyat = fiyat * (1 + dripYillikArtis / 100);
    }

    return {
      yillar,
      serilerReinvest,
      serilerNakit,
      sonLot: Math.round(lotYeniden),
      lotArtis: Math.round(lotYeniden - dripBaslangicLot),
      katSayisi: fmt(serilerReinvest[serilerReinvest.length - 1] / serilerReinvest[0], 1)
    };
  }, [dripBaslangicLot, dripYil, dripYillikArtis, dripVerim]);

  const dripGrafikVerisi = useMemo(() => {
    return {
      data: [
        {
          x: dripSonuc.yillar,
          y: dripSonuc.serilerReinvest,
          type: 'scatter',
          mode: 'lines+markers',
          name: 'Temettüyle Hisse Geri Alımı (DRIP)',
          line: { color: '#089981', width: 3 },
          fill: 'tozeroy',
          fillcolor: 'rgba(8, 153, 129, 0.12)'
        },
        {
          x: dripSonuc.yillar,
          y: dripSonuc.serilerNakit,
          type: 'scatter',
          mode: 'lines+markers',
          name: 'Yeniden Yatırımsız (Sadece Sermaye Kazancı)',
          line: { color: '#787B86', width: 2, dash: 'dash' }
        }
      ],
      layout: {
        ...BIST_DARK_TEMPLATE.layout,
        title: { text: 'Bileşik Temettü Büyümesi vs Klasik Büyüme (TL)', font: { color: '#e6edf3', size: 14 } },
        height: 320,
        margin: { l: 60, r: 30, t: 40, b: 50 },
        legend: { orientation: 'h', y: -0.2 }
      }
    };
  }, [dripSonuc]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Üst Seçim & Kontrol Paneli */}
      <div className="panel" style={{ padding: 14, background: '#131722', border: '1px solid #2a2e39', borderRadius: 8 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10, flexWrap: 'wrap', gap: 8 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 18, color: '#089981' }}>📊</span>
            <div>
              <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: '#f0f3fa' }}>BIST Temettü Terminali</h3>
              <p style={{ margin: 0, fontSize: 12, color: '#787b86' }}>Geçmiş ödemeler, nakit temettü verimi sıralaması ve bileşik DRIP simülatörü</p>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 6 }}>
            <button
              className={aktifSekme === 'siralama' ? 'primary' : 'logout-btn'}
              style={{ fontSize: 12, padding: '6px 14px', borderRadius: 6 }}
              onClick={() => setAktifSekme('siralama')}
            >
              🏆 Verim Sıralaması
            </button>
            <button
              className={aktifSekme === 'takvim' ? 'primary' : 'logout-btn'}
              style={{ fontSize: 12, padding: '6px 14px', borderRadius: 6 }}
              onClick={() => setAktifSekme('takvim')}
            >
              📅 Ödeme Takvimi
            </button>
            <button
              className={aktifSekme === 'drip' ? 'primary' : 'logout-btn'}
              style={{ fontSize: 12, padding: '6px 14px', borderRadius: 6 }}
              onClick={() => setAktifSekme('drip')}
            >
              🚀 DRIP Bileşik Simülatör
            </button>
          </div>
        </div>

        <HisseSecici etiket="İncelenecek BIST Şirketleri" tickers={t?.tickers} secili={secili || []} onChange={setSecili} max={25} />
      </div>

      {hata && <div className="error-msg">{hata}</div>}
      {secili && !secili.length && <div className="bilgi-kutu">En az bir hisse seçin.</div>}
      {yukleniyor && <div className="loading-hint">BIST Temettü verileri yükleniyor…</div>}

      {/* İstatistik Metrik Kartları */}
      {istatistikler && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12 }}>
          <div className="panel" style={{ padding: 14, background: '#131722', border: '1px solid #2a2e39', borderRadius: 8 }}>
            <div style={{ fontSize: 11, color: '#787b86', textTransform: 'uppercase' }}>Zirve Verim Şampiyonu</div>
            <div style={{ fontSize: 22, fontWeight: 700, color: '#089981', marginTop: 4 }}>
              {istatistikler.enYuksek.hisse} <span style={{ fontSize: 14 }}>%{fmt(istatistikler.enYuksek.verim, 2)}</span>
            </div>
            <div style={{ fontSize: 12, color: '#d1d4dc', marginTop: 4 }}>
              Hisse Başı: {fmt(istatistikler.enYuksek.yillik_temettu, 2)} ₺ | Fiyat: {fmt(istatistikler.enYuksek.fiyat, 2)} ₺
            </div>
          </div>

          <div className="panel" style={{ padding: 14, background: '#131722', border: '1px solid #2a2e39', borderRadius: 8 }}>
            <div style={{ fontSize: 11, color: '#787b86', textTransform: 'uppercase' }}>Seçili Portföy Ortalama Verimi</div>
            <div style={{ fontSize: 22, fontWeight: 700, color: '#2962FF', marginTop: 4 }}>
              %{fmt(istatistikler.ortalama, 2)}
            </div>
            <div style={{ fontSize: 12, color: '#d1d4dc', marginTop: 4 }}>
              {istatistikler.verimSayisi} hisse aktif temettü ödüyor
            </div>
          </div>

          <div className="panel" style={{ padding: 14, background: '#131722', border: '1px solid #2a2e39', borderRadius: 8 }}>
            <div style={{ fontSize: 11, color: '#787b86', textTransform: 'uppercase' }}>Hisse Başına Kümülatif Temettü</div>
            <div style={{ fontSize: 22, fontWeight: 700, color: '#FF9800', marginTop: 4 }}>
              {fmt(istatistikler.toplamNakit, 2)} ₺
            </div>
            <div style={{ fontSize: 12, color: '#d1d4dc', marginTop: 4 }}>
              Her bir hisseden 1'er lotluk toplam nakit getiri
            </div>
          </div>

          <div className="panel" style={{ padding: 14, background: '#131722', border: '1px solid #2a2e39', borderRadius: 8 }}>
            <div style={{ fontSize: 11, color: '#787b86', textTransform: 'uppercase' }}>Kapsanan Hisse Sayısı</div>
            <div style={{ fontSize: 22, fontWeight: 700, color: '#f0f3fa', marginTop: 4 }}>
              {secili?.length || 0} Adet
            </div>
            <div style={{ fontSize: 12, color: '#089981', marginTop: 4 }}>
              BIST Temettü 25 & BIST 100 Entegre
            </div>
          </div>
        </div>
      )}

      {/* Sekme 1: Sıralama & Grafik */}
      {aktifSekme === 'siralama' && sonuc && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {barGrafikVerisi && (
            <div className="panel" style={{ padding: 12, background: '#131722', border: '1px solid #2a2e39', borderRadius: 8 }}>
              <PlotlyGrafik data={barGrafikVerisi.data} layout={barGrafikVerisi.layout} />
            </div>
          )}

          <div className="panel" style={{ padding: 0, background: '#131722', border: '1px solid #2a2e39', borderRadius: 8, overflow: 'hidden' }}>
            <div style={{ padding: '12px 16px', borderBottom: '1px solid #2a2e39', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontWeight: 600, fontSize: 14, color: '#f0f3fa' }}>BIST Temettü Verim Detay Tablosu</span>
              <span style={{ fontSize: 12, color: '#787b86' }}>Son 12 Aylık Resmi Veriler</span>
            </div>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ background: '#1e222d', color: '#787b86', textAlign: 'left', borderBottom: '1px solid #2a2e39' }}>
                  <th style={{ padding: '10px 14px' }}>Hisse</th>
                  <th style={{ padding: '10px 14px', textAlign: 'right' }}>Son Fiyat</th>
                  <th style={{ padding: '10px 14px', textAlign: 'right' }}>Hisse Başı Temettü (₺)</th>
                  <th style={{ padding: '10px 14px', textAlign: 'right' }}>Temettü Verimi</th>
                  <th style={{ padding: '10px 14px' }}>Verim Göstergesi</th>
                  <th style={{ padding: '10px 14px', textAlign: 'center' }}>İşlem</th>
                </tr>
              </thead>
              <tbody>
                {istatistikler?.sirali.map(v => {
                  const yuzde = istatistikler.enYuksek.verim > 0 ? (v.verim / istatistikler.enYuksek.verim) * 100 : 0;
                  return (
                    <tr key={v.hisse} style={{ borderBottom: '1px solid #1e222d' }}>
                      <td style={{ padding: '10px 14px', fontWeight: 600, color: '#2962FF' }}>{v.hisse}</td>
                      <td style={{ padding: '10px 14px', textAlign: 'right', fontFamily: 'monospace' }}>{fmt(v.fiyat, 2)} ₺</td>
                      <td style={{ padding: '10px 14px', textAlign: 'right', fontFamily: 'monospace', color: '#089981' }}>{fmt(v.yillik_temettu, 2)} ₺</td>
                      <td style={{ padding: '10px 14px', textAlign: 'right', fontWeight: 700, color: v.verim >= 5 ? '#089981' : '#f0f3fa' }}>
                        %{fmt(v.verim, 2)}
                      </td>
                      <td style={{ padding: '10px 14px', width: 180 }}>
                        <div style={{ height: 6, background: '#2a2e39', borderRadius: 3, overflow: 'hidden' }}>
                          <div style={{ height: '100%', width: `${Math.min(100, yuzde)}%`, background: v.verim >= 6 ? '#089981' : '#2962FF', borderRadius: 3 }} />
                        </div>
                      </td>
                      <td style={{ padding: '10px 14px', textAlign: 'center' }}>
                        <a
                          href={`#stratejik?hisse=${v.hisse}`}
                          className="primary"
                          style={{ fontSize: 11, padding: '3px 10px', textDecoration: 'none', borderRadius: 4, display: 'inline-block' }}
                        >
                          Analiz Et
                        </a>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Sekme 2: Ödeme Takvimi */}
      {aktifSekme === 'takvim' && sonuc && (
        <div className="panel" style={{ padding: 0, background: '#131722', border: '1px solid #2a2e39', borderRadius: 8, overflow: 'hidden' }}>
          <div style={{ padding: '12px 16px', borderBottom: '1px solid #2a2e39' }}>
            <span style={{ fontWeight: 600, fontSize: 14, color: '#f0f3fa' }}>Geçmiş 1 Yıllık Hak Kullanım & Temettü Dağıtım Günlüğü</span>
          </div>
          {sonuc.takvim?.length ? (
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ background: '#1e222d', color: '#787b86', textAlign: 'left', borderBottom: '1px solid #2a2e39' }}>
                  <th style={{ padding: '10px 14px' }}>Hisse</th>
                  <th style={{ padding: '10px 14px' }}>Ödeme Tarihi</th>
                  <th style={{ padding: '10px 14px', textAlign: 'right' }}>Lot Başına Nakit (₺)</th>
                  <th style={{ padding: '10px 14px' }}>Kupon Tipi</th>
                  <th style={{ padding: '10px 14px' }}>Durum</th>
                </tr>
              </thead>
              <tbody>
                {sonuc.takvim.map((k, i) => (
                  <tr key={i} style={{ borderBottom: '1px solid #1e222d' }}>
                    <td style={{ padding: '10px 14px', fontWeight: 600, color: '#2962FF' }}>{k.hisse}</td>
                    <td style={{ padding: '10px 14px', fontFamily: 'monospace' }}>{k.tarih}</td>
                    <td style={{ padding: '10px 14px', textAlign: 'right', fontWeight: 600, color: '#089981' }}>{fmt(k.tutar, 2)} ₺</td>
                    <td style={{ padding: '10px 14px', color: '#787b86' }}>Nakit Kâr Payı</td>
                    <td style={{ padding: '10px 14px' }}>
                      <span className="rozet tetik" style={{ fontSize: 11, background: 'rgba(8, 153, 129, 0.2)', color: '#089981' }}>✓ Tamamlandı</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div style={{ padding: 24, textAlign: 'center', color: '#787b86' }}>Seçili hisseler için son 1 yılda kayıtlı temettü takvimi bulunamadı.</div>
          )}
        </div>
      )}

      {/* Sekme 3: DRIP Bileşik Simülatör */}
      {aktifSekme === 'drip' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(300px, 360px) 1fr', gap: 16 }}>
          <div className="panel" style={{ padding: 16, background: '#131722', border: '1px solid #2a2e39', borderRadius: 8 }}>
            <h4 style={{ margin: '0 0 14px 0', fontSize: 15, color: '#f0f3fa' }}>⚙️ Simülasyon Parametreleri</h4>
            
            <div style={{ marginBottom: 12 }}>
              <label style={{ fontSize: 12, color: '#787b86' }}>Başlangıç Lot Adedi</label>
              <input
                type="number"
                min="10"
                step="50"
                value={dripBaslangicLot}
                onChange={e => setDripBaslangicLot(Number(e.target.value))}
                style={{ width: '100%', marginTop: 4 }}
              />
            </div>

            <div style={{ marginBottom: 12 }}>
              <label style={{ fontSize: 12, color: '#787b86' }}>Simülasyon Süresi (Yıl)</label>
              <input
                type="number"
                min="1"
                max="30"
                value={dripYil}
                onChange={e => setDripYil(Number(e.target.value))}
                style={{ width: '100%', marginTop: 4 }}
              />
            </div>

            <div style={{ marginBottom: 12 }}>
              <label style={{ fontSize: 12, color: '#787b86' }}>Yıllık Ortalama Temettü Verimi (%)</label>
              <input
                type="number"
                min="1"
                max="25"
                step="0.5"
                value={dripVerim}
                onChange={e => setDripVerim(Number(e.target.value))}
                style={{ width: '100%', marginTop: 4 }}
              />
            </div>

            <div style={{ marginBottom: 14 }}>
              <label style={{ fontSize: 12, color: '#787b86' }}>Beklenen Yıllık Hisse Fiyat Artışı (%)</label>
              <input
                type="number"
                min="0"
                max="100"
                value={dripYillikArtis}
                onChange={e => setDripYillikArtis(Number(e.target.value))}
                style={{ width: '100%', marginTop: 4 }}
              />
            </div>

            <div style={{ padding: 12, background: 'rgba(41, 98, 255, 0.08)', border: '1px solid rgba(41, 98, 255, 0.2)', borderRadius: 6, fontSize: 12, color: '#d1d4dc' }}>
              💡 <b>Temettü Kartopu Etkisi:</b> Alınan her nakit kâr payı otomatik olarak yeni hisseye dönüştürülür. Sonraki yıl daha fazla lot üzerinden temettü kazanılır.
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
              <div className="panel" style={{ padding: 12, background: '#131722', border: '1px solid #2a2e39', borderRadius: 8 }}>
                <div style={{ fontSize: 11, color: '#787b86' }}>Final Lot Adedi</div>
                <div style={{ fontSize: 20, fontWeight: 700, color: '#089981', marginTop: 4 }}>{dripSonuc.sonLot} Lot</div>
                <div style={{ fontSize: 11, color: '#787b86', marginTop: 2 }}>+{dripSonuc.lotArtis} Bedelsiz Ek Lot</div>
              </div>
              <div className="panel" style={{ padding: 12, background: '#131722', border: '1px solid #2a2e39', borderRadius: 8 }}>
                <div style={{ fontSize: 11, color: '#787b86' }}>Bileşik Servet Çarpanı</div>
                <div style={{ fontSize: 20, fontWeight: 700, color: '#2962FF', marginTop: 4 }}>{dripSonuc.katSayisi}x Kat</div>
                <div style={{ fontSize: 11, color: '#787b86', marginTop: 2 }}>Toplam Portföy Büyümesi</div>
              </div>
              <div className="panel" style={{ padding: 12, background: '#131722', border: '1px solid #2a2e39', borderRadius: 8 }}>
                <div style={{ fontSize: 11, color: '#787b86' }}>Simülasyon Süresi</div>
                <div style={{ fontSize: 20, fontWeight: 700, color: '#f0f3fa', marginTop: 4 }}>{dripYil} Yıl</div>
                <div style={{ fontSize: 11, color: '#089981', marginTop: 2 }}>Uzun Vadeli Yatırımcı</div>
              </div>
            </div>

            <div className="panel" style={{ padding: 12, background: '#131722', border: '1px solid #2a2e39', borderRadius: 8 }}>
              <PlotlyGrafik data={dripGrafikVerisi.data} layout={dripGrafikVerisi.layout} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { fmt, Tutar, Metrik } from '../lib/format.jsx';
import Metin from '../lib/Metin.jsx';
import { useTickers } from '../lib/useTickers.js';
import { useAyar } from '../ayarlar.jsx';
import PlotlyGrafik from '../components/PlotlyGrafik.jsx';
import Acilir from '../components/Acilir.jsx';
import FintablesKarneKart from '../components/FintablesKarneKart.jsx';
import { TEMA, satirAraliklari, altPanelEksenleri, BIST_RANGEBREAKS } from '../lib/plotlyTema.js';

// ============================================================================
// SABİTLER VE YARDIMCILAR
// ============================================================================
const BIST30_POPULER = ['THYAO', 'GARAN', 'ASELS', 'EREGL', 'TUPRS', 'KCHOL', 'BIMAS', 'AKBNK', 'SISE', 'SAHOL', 'PGSUS', 'ENKAI'];
const ARALIKLAR = [
  { id: '5m', etiket: '5D' },
  { id: '15m', etiket: '15D' },
  { id: '60m', etiket: '60D' },
  { id: '1d', etiket: '1G' },
  { id: '1wk', etiket: '1H' },
  { id: '1mo', etiket: '1A' },
];
const PERIYOTLAR = [
  { id: '1mo', etiket: '1A' },
  { id: '3mo', etiket: '3A' },
  { id: '6mo', etiket: '6A' },
  { id: '1y', etiket: '1Y' },
  { id: '3y', etiket: '3Y' },
  { id: '5y', etiket: '5Y' },
];
const GRAFIK_TURLERI = [
  { id: 'candle', etiket: '🕯️ Mum' },
  { id: 'heikin', etiket: '📈 Heikin Ashi' },
  { id: 'line', etiket: '📉 Çizgi' },
  { id: 'area', etiket: '🌊 Alan' },
  { id: 'ohlc', etiket: '📊 OHLC Bar' },
];

const ANA_GOSTERGELER = ['EMA 20', 'EMA 50', 'SMA 200', 'Bollinger Bantları', 'Donchian Kanalları', 'VWAP (A.O.F)', 'Destek / Direnç'];
const ALT_OSILATORLER = ['RSI', 'MACD', 'Stochastic', 'CCI', 'ATR', 'OBV'];

const sonek = (k) => (k === 1 ? '' : String(k));

// Heikin-Ashi Hesaplayıcı (Gürültüsüz Trend Mumları)
function heikinAshiHesapla(o, h, l, c) {
  const n = c.length;
  if (!n) return { open: [], high: [], low: [], close: [] };
  const haClose = c.map((_, i) => (o[i] + h[i] + l[i] + c[i]) / 4);
  const haOpen = new Array(n);
  haOpen[0] = (o[0] + c[0]) / 2;
  for (let i = 1; i < n; i++) {
    haOpen[i] = (haOpen[i - 1] + haClose[i - 1]) / 2;
  }
  const haHigh = h.map((v, i) => Math.max(v, haOpen[i], haClose[i]));
  const haLow = l.map((v, i) => Math.min(v, haOpen[i], haClose[i]));
  return { open: haOpen, high: haHigh, low: haLow, close: haClose };
}

// ============================================================================
// 1. PROFESYONEL TEKNİK GRAFİK MOTORU (TRADINGVIEW & MATRIKS STİLİ)
// ============================================================================
function teknikFigurUret(v, anaGostergeler, altGostergeler, grafikTuru, logaritmik, haftaSonuKaldir) {
  const x = v.x;
  const G = v.gostergeler;
  const nAlt = altGostergeler.length;
  // Ana panel %62, alt paneller eşit dağılımlı
  const oranlar = nAlt ? [0.60, ...Array(nAlt).fill(0.40 / nAlt)] : [1];
  const alanlar = satirAraliklari(oranlar, 0.035);

  const data = [];
  const cizgi = (y, ad, color, width = 1.5, extra = {}, k = 1) => {
    if (!y || !y.length) return;
    data.push({
      type: 'scatter', mode: 'lines', x, y, name: ad,
      line: { color, width, ...(extra.dash ? { dash: extra.dash } : {}) },
      ...(extra.fill ? { fill: extra.fill, fillcolor: extra.fillcolor } : {}),
      xaxis: 'x' + sonek(k), yaxis: 'y' + sonek(k),
      hoverinfo: 'name+y+x',
    });
  };

  // 1. Ana Fiyat Çizimi
  let op = v.open, hi = v.high, lo = v.low, cl = v.close;
  if (grafikTuru === 'heikin') {
    const ha = heikinAshiHesapla(op, hi, lo, cl);
    op = ha.open; hi = ha.high; lo = ha.low; cl = ha.close;
  }

  if (grafikTuru === 'candle' || grafikTuru === 'heikin') {
    data.push({
      type: 'candlestick', x, open: op, high: hi, low: lo, close: cl,
      name: grafikTuru === 'heikin' ? 'Heikin Ashi' : 'Fiyat',
      increasing: { line: { color: '#089981', width: 1.2 }, fillcolor: '#089981' },
      decreasing: { line: { color: '#F23645', width: 1.2 }, fillcolor: '#F23645' },
      xaxis: 'x', yaxis: 'y',
    });
  } else if (grafikTuru === 'line') {
    data.push({
      type: 'scatter', mode: 'lines', x, y: cl, name: 'Kapanış',
      line: { color: '#2962FF', width: 2.2 },
      xaxis: 'x', yaxis: 'y',
    });
  } else if (grafikTuru === 'area') {
    data.push({
      type: 'scatter', mode: 'lines', x, y: cl, name: 'Kapanış',
      line: { color: '#00BCD4', width: 2 },
      fill: 'tozeroy', fillcolor: 'rgba(0, 188, 212, 0.12)',
      xaxis: 'x', yaxis: 'y',
    });
  } else if (grafikTuru === 'ohlc') {
    data.push({
      type: 'ohlc', x, open: op, high: hi, low: lo, close: cl, name: 'OHLC',
      increasing: { line: { color: '#089981', width: 1.5 } },
      decreasing: { line: { color: '#F23645', width: 1.5 } },
      xaxis: 'x', yaxis: 'y',
    });
  }

  // 2. Fiyat İndikatörleri (Overlay)
  if (anaGostergeler.includes('Bollinger Bantları') && G.bbu && G.bbl) {
    cizgi(G.bbu, 'BB Üst', 'rgba(41, 98, 255, 0.45)', 1.2);
    cizgi(G.bbm, 'BB Orta', 'rgba(41, 98, 255, 0.3)', 1, { dash: 'dot' });
    cizgi(G.bbl, 'BB Alt', 'rgba(41, 98, 255, 0.45)', 1.2, { fill: 'tonexty', fillcolor: 'rgba(41, 98, 255, 0.07)' });
  }
  if (anaGostergeler.includes('Donchian Kanalları') && G.dcu && G.dcl) {
    cizgi(G.dcu, 'DC Üst', 'rgba(255, 152, 0, 0.45)', 1, { dash: 'dash' });
    cizgi(G.dcl, 'DC Alt', 'rgba(255, 152, 0, 0.45)', 1, { dash: 'dash', fill: 'tonexty', fillcolor: 'rgba(255, 152, 0, 0.06)' });
  }
  if (anaGostergeler.includes('EMA 20') && G.ema_20) cizgi(G.ema_20, 'EMA 20', '#2962FF', 1.8);
  if (anaGostergeler.includes('EMA 50') && G.ema_50) cizgi(G.ema_50, 'EMA 50', '#FF9800', 1.8);
  if (anaGostergeler.includes('SMA 200') && G.sma_200) cizgi(G.sma_200, 'SMA 200', '#9C27B0', 2);
  if (anaGostergeler.includes('VWAP (A.O.F)') && G.vwap) cizgi(G.vwap, 'VWAP (A.O.F)', '#00BCD4', 1.6, { dash: 'dot' });

  // Destek / Direnç Pivot Çizgileri
  const shapes = [];
  const yatay = (k, y, color, dash = 'dash', width = 1) => shapes.push({
    type: 'line', xref: `x${sonek(k)} domain`, x0: 0, x1: 1, yref: 'y' + sonek(k), y0: y, y1: y,
    line: { color, width, dash },
  });

  if (anaGostergeler.includes('Destek / Direnç') && G.r1 && G.s1) {
    const sonR1 = G.r1[G.r1.length - 1], sonS1 = G.s1[G.s1.length - 1];
    const sonR2 = G.r2 ? G.r2[G.r2.length - 1] : null, sonS2 = G.s2 ? G.s2[G.s2.length - 1] : null;
    if (sonR1) yatay(1, sonR1, 'rgba(242, 54, 69, 0.65)', 'dash', 1);
    if (sonR2) yatay(1, sonR2, 'rgba(242, 54, 69, 0.85)', 'dot', 1);
    if (sonS1) yatay(1, sonS1, 'rgba(8, 153, 129, 0.65)', 'dash', 1);
    if (sonS2) yatay(1, sonS2, 'rgba(8, 153, 129, 0.85)', 'dot', 1);
  }

  // 3. Alt Osilatör Panelleri
  altGostergeler.forEach((ad, i) => {
    const k = i + 2;
    if (ad === 'RSI' && G.rsi) {
      cizgi(G.rsi, 'RSI (14)', '#7E57C2', 2, {}, k);
      yatay(k, 70, 'rgba(242, 54, 69, 0.6)', 'dash');
      yatay(k, 50, 'rgba(255, 255, 255, 0.15)', 'dot');
      yatay(k, 30, 'rgba(8, 153, 129, 0.6)', 'dash');
    } else if (ad === 'MACD' && G.macd) {
      cizgi(G.macd, 'MACD', '#2962FF', 1.8, {}, k);
      cizgi(G.macds, 'Sinyal', '#FF9800', 1.5, {}, k);
      if (G.macdh) {
        data.push({
          type: 'bar', x, y: G.macdh, name: 'MACD Hist',
          marker: { color: G.macdh.map(h => (h >= 0 ? 'rgba(8, 153, 129, 0.85)' : 'rgba(242, 54, 69, 0.85)')) },
          xaxis: 'x' + sonek(k), yaxis: 'y' + sonek(k),
        });
      }
    } else if (ad === 'Stochastic' && G.stochk) {
      cizgi(G.stochk, '%K', '#03A9F4', 1.8, {}, k);
      cizgi(G.stochd, '%D', '#FF9800', 1.5, { dash: 'dot' }, k);
      yatay(k, 80, 'rgba(242, 54, 69, 0.6)', 'dash');
      yatay(k, 20, 'rgba(8, 153, 129, 0.6)', 'dash');
    } else if (ad === 'CCI' && G.cci) {
      cizgi(G.cci, 'CCI', '#8D6E63', 1.8, {}, k);
      yatay(k, 100, 'rgba(242, 54, 69, 0.6)', 'dash');
      yatay(k, -100, 'rgba(8, 153, 129, 0.6)', 'dash');
    } else if (ad === 'ATR' && G.atr) {
      cizgi(G.atr, 'ATR (14)', '#FF5252', 1.8, {}, k);
    } else if (ad === 'OBV' && G.obv) {
      cizgi(G.obv, 'OBV', '#4CAF50', 1.8, { fill: 'tozeroy', fillcolor: 'rgba(76, 175, 80, 0.15)' }, k);
    } else if (ad === 'Özel Algoritma' && v.formul?.degerler) {
      cizgi(v.formul.degerler, 'Özel Algoritma', '#E040FB', 2.2, {}, k);
    }
  });

  // Eksenler ve Filigran
  const eksenler = altPanelEksenleri(alanlar, {}, 'right');
  const son60 = x[Math.max(0, x.length - 80)], sonBar = x[x.length - 1];

  eksenler.xaxis = {
    ...eksenler.xaxis,
    range: [son60, sonBar],
    rangeslider: { visible: false },
    showgrid: true,
    gridcolor: 'rgba(42, 46, 57, 0.45)',
    ...(haftaSonuKaldir ? { rangebreaks: BIST_RANGEBREAKS } : {}),
  };

  eksenler.yaxis = {
    ...eksenler.yaxis,
    type: logaritmik ? 'log' : 'linear',
    tickformat: '.2f',
  };

  // Arka Plan Filigranı & Başlıklar
  const annotations = [
    {
      text: `${v.hisse} ${v.interval.toUpperCase()}`,
      xref: 'paper', yref: 'paper', x: 0.5, y: alanlar[0][0] + (alanlar[0][1] - alanlar[0][0]) * 0.5,
      xanchor: 'center', yanchor: 'middle', showarrow: false,
      font: { size: 68, color: 'rgba(255, 255, 255, 0.025)', family: 'Space Grotesk, sans-serif', weight: 700 },
    },
    ...['Fiyat & Hacim', ...altGostergeler].map((t, i) => ({
      text: t, x: 0.01, y: alanlar[i][1], xref: 'paper', yref: 'paper',
      xanchor: 'left', yanchor: 'bottom', showarrow: false,
      font: { size: 11, color: TEMA.muted, family: 'JetBrains Mono' },
    })),
  ];

  const layout = {
    ...eksenler,
    shapes,
    annotations,
    dragmode: 'pan',
    hovermode: 'x unified',
    uirevision: 'kurumsal_bist_v1',
    height: Math.max(560, 500 + 130 * nAlt),
    margin: { l: 20, r: 65, t: 36, b: 24 },
    legend: {
      orientation: 'h', yanchor: 'bottom', y: 1.02, xanchor: 'right', x: 1,
      font: { color: TEMA.muted, size: 11 }, bgcolor: 'rgba(19, 23, 34, 0.85)',
    },
  };

  return { data, layout };
}

// ============================================================================
// 2. FRAKTAL GEOMETRİ & KURUMSAL AI MODELLEMESİ
// ============================================================================
function fraktalFigurUret(v) {
  const alan = satirAraliklari([0.62, 0.19, 0.19], 0.03);
  const x = v.grafik.x;
  const data = [
    {
      type: 'scatter', x, y: v.grafik.fiyat, name: 'Fiyat',
      fill: 'tozeroy', fillcolor: 'rgba(8, 153, 129, 0.12)',
      line: { color: '#089981', width: 2.5 }, xaxis: 'x', yaxis: 'y',
    },
    { type: 'scatter', x, y: v.grafik.ema20, name: 'EMA 20', line: { color: '#2962FF', width: 1.6 }, xaxis: 'x', yaxis: 'y' },
    { type: 'scatter', x, y: v.grafik.ema50, name: 'EMA 50', line: { color: '#FF9800', width: 1.6 }, xaxis: 'x', yaxis: 'y' },
    { type: 'scatter', x, y: v.grafik.macd, name: 'MACD', line: { color: '#2962FF' }, xaxis: 'x2', yaxis: 'y2' },
    { type: 'scatter', x, y: v.grafik.sinyal, name: 'Sinyal', line: { color: '#FF9800' }, xaxis: 'x2', yaxis: 'y2' },
    {
      type: 'bar', x, y: v.grafik.hist, name: 'MACD Hist',
      marker: { color: v.grafik.hist.map(h => (h >= 0 ? '#089981' : '#F23645')) },
      xaxis: 'x2', yaxis: 'y2',
    },
    {
      type: 'bar', x, y: v.grafik.hacim, name: 'Hacim',
      marker: { color: 'rgba(41, 98, 255, 0.35)' },
      xaxis: 'x3', yaxis: 'y3',
    },
  ];

  const shapes = [];
  if (v.destek) {
    shapes.push({
      type: 'line', xref: 'paper', x0: 0, x1: 1, yref: 'y', y0: v.destek, y1: v.destek,
      line: { color: '#089981', width: 1.5, dash: 'dash' },
    });
  }
  if (v.direnc) {
    shapes.push({
      type: 'line', xref: 'paper', x0: 0, x1: 1, yref: 'y', y0: v.direnc, y1: v.direnc,
      line: { color: '#F23645', width: 1.5, dash: 'dash' },
    });
  }

  const layout = {
    ...altPanelEksenleri(alan, { tickformat: '%d %b %y', nticks: 18 }),
    shapes,
    hovermode: 'x unified',
    height: 680,
    margin: { l: 25, r: 65, t: 30, b: 35 },
    legend: { orientation: 'h', y: 1.04, x: 1, xanchor: 'right' },
  };
  return { data, layout };
}

// ============================================================================
// ANA BİLEŞEN: STRATEJİK ANALİZ & ARACI KURUM İŞLEM MASASI
// ============================================================================
export default function StratejikAnaliz({ api }) {
  const t = useTickers(api);
  const { pInt, pPer } = useAyar();

  // Temel Seçimler
  const [hisse, setHisse] = useState('THYAO');
  const [anaSekme, setAnaSekme] = useState(0); // 0: Grafik & Emir Masası, 1: Fraktal Analiz, 2: Algoritma Stüdyosu

  // Grafik Ayarları
  const [interval, setIntervalVal] = useState(pInt || '1d');
  const [period, setPeriodVal] = useState(pPer || '1y');
  const [grafikTuru, setGrafikTuru] = useState('candle');
  const [logaritmik, setLogaritmik] = useState(false);
  const [haftaSonuKaldir, setHaftaSonuKaldir] = useState(true);
  const [anaGostergeler, setAnaGostergeler] = useState(['EMA 20', 'EMA 50', 'Bollinger Bantları', 'VWAP (A.O.F)']);
  const [altGostergeler, setAltGostergeler] = useState(['RSI', 'MACD']);

  // Veri Durumları
  const [teknikVeri, setTeknikVeri] = useState(null);
  const [fraktalVeri, setFraktalVeri] = useState(null);
  const [derinlik, setDerinlik] = useState(null);
  const [akd, setAkd] = useState(null);
  const [islemler, setIslemler] = useState([]);
  const [bekle, setBekle] = useState(true);
  const [hata, setHata] = useState('');

  // Sağ Panel Masası (Emir / Derinlik / AKD / İşlemler)
  const [masaSekme, setMasaSekme] = useState('emir');
  const [emirYon, setEmirYon] = useState('AL');
  const [emirTip, setEmirTip] = useState('Limit');
  const [emirFiyat, setEmirFiyat] = useState('');
  const [emirLot, setEmirLot] = useState(50);
  const [emirBekle, setEmirBekle] = useState(false);
  const [emirMesaj, setEmirMesaj] = useState(null);
  const [sanalBakiye, setSanalBakiye] = useState(100000);
  const [mevcutPozisyon, setMevcutPozisyon] = useState(null);

  // Formül Stüdyosu
  const [formulMetin, setFormulMetin] = useState("df['close'] - df['sma_20']");
  const [formulOnayli, setFormulOnayli] = useState('');

  // 1. Teknik Veri Yükleme
  const teknikYukle = useCallback(async () => {
    try {
      setHata('');
      const r = await api(`/api/technical/${hisse}?interval=${interval}&period=${period}&formul=${encodeURIComponent(formulOnayli)}`);
      setTeknikVeri(r);
      if (r?.istatistik?.son_fiyat && !emirFiyat) {
        setEmirFiyat(r.istatistik.son_fiyat);
      }
    } catch (e) {
      setHata(e.message || 'Teknik veri alınamadı.');
    }
  }, [api, hisse, interval, period, formulOnayli]);

  // 2. Fraktal Veri Yükleme
  const fraktalYukle = useCallback(async () => {
    try {
      const r = await api(`/api/analysis/${hisse}?interval=${interval}&period=${period}`);
      setFraktalVeri(r);
      if (r?.portfoy) {
        setMevcutPozisyon(r.portfoy);
      }
    } catch (e) {
      console.warn('Fraktal yükleme hatası:', e);
    }
  }, [api, hisse, interval, period]);

  // URL Hash'ten Hisse Kodu Okuma (Örn: #stratejik?hisse=ASELS)
  useEffect(() => {
    const parseHashHisse = () => {
      const h = window.location.hash;
      if (h.includes('hisse=')) {
        const kod = h.split('hisse=')[1]?.split('&')[0]?.toUpperCase();
        if (kod && kod !== hisse) {
          setHisse(kod);
        }
      }
    };
    parseHashHisse();
    window.addEventListener('hashchange', parseHashHisse);
    return () => window.removeEventListener('hashchange', parseHashHisse);
  }, [hisse]);

  // 3. Derinlik, AKD, İşlem Akışı ve Portföy Bakiye Yükleme
  const masaVerileriYukle = useCallback(async () => {
    try {
      const [d, a, s, p] = await Promise.all([
        api(`/api/depth/${hisse}`).catch(() => null),
        api(`/api/akd/${hisse}`).catch(() => null),
        api(`/api/time-and-sales/${hisse}`).catch(() => null),
        api('/api/portfolio').catch(() => null),
      ]);
      if (d) setDerinlik(d);
      if (a) setAkd(a);
      if (s) setIslemler(s.islemler || []);
      if (p) {
        setSanalBakiye(p.virtual_cash ?? 100000);
        const poz = p.portfolio?.[hisse] || p.pozisyonlar?.find(x => x.hisse === hisse);
        if (poz) {
          const lp = teknikVeri?.istatistik?.son_fiyat || poz.maliyet;
          const kz = (lp - poz.maliyet) * poz.lot;
          setMevcutPozisyon({
            lot: poz.lot,
            maliyet: poz.maliyet,
            kz: kz,
            verim: (kz / (poz.maliyet * poz.lot)) * 100,
          });
        } else {
          setMevcutPozisyon(null);
        }
      }
    } catch {
      /* sessiz */
    }
  }, [api, hisse, teknikVeri]);

  // Hisse / Periyot Değişimi
  useEffect(() => {
    let iptal = false;
    setBekle(true);
    Promise.all([teknikYukle(), fraktalYukle(), masaVerileriYukle()]).finally(() => {
      if (!iptal) setBekle(false);
    });
    return () => { iptal = true; };
  }, [teknikYukle, fraktalYukle, masaVerileriYukle]);

  // Derinlikte herhangi bir fiyata tıklandığında emir kutusuna aktar
  const fiyataTikla = (f) => {
    setEmirFiyat(f);
    setEmirTip('Limit');
    setMasaSekme('emir');
  };

  // Emir Gönder
  const emirGonder = async () => {
    setEmirMesaj(null);
    const fiyat = emirTip === 'Piyasa' ? (teknikVeri?.istatistik?.son_fiyat || 100) : parseFloat(emirFiyat);
    if (!fiyat || isNaN(fiyat) || fiyat <= 0) {
      setEmirMesaj({ tur: 'hata', metin: 'Lütfen geçerli bir işlem fiyatı girin.' });
      return;
    }
    const lot = parseInt(emirLot, 10);
    if (!lot || lot <= 0) {
      setEmirMesaj({ tur: 'hata', metin: 'Lot adedi en az 1 olmalıdır.' });
      return;
    }

    setEmirBekle(true);
    try {
      const res = await api('/api/order', {
        method: 'POST',
        govde: { hisse, yon: emirYon, lot, fiyat },
      });
      setSanalBakiye(res.virtual_cash);
      setEmirMesaj({
        tur: 'ok',
        metin: `BIST Emri Başarıyla İletildi! ${lot} Lot ${hisse} ${emirYon} @ ${fmt(fiyat)} ₺`,
      });
      masaVerileriYukle();
    } catch (e) {
      setEmirMesaj({ tur: 'hata', metin: e.message || 'Emir iletilemedi.' });
    } finally {
      setEmirBekle(false);
    }
  };

  // Hesaplamalar
  const aktifFiyat = parseFloat(emirFiyat) || teknikVeri?.istatistik?.son_fiyat || 0;
  const islemTutari = aktifFiyat * (parseInt(emirLot, 10) || 0);
  const komisyonTutari = islemTutari * 0.0015; // Binde 1.5 BIST payı + komisyon
  const toplamGereken = emirYon === 'AL' ? islemTutari + komisyonTutari : islemTutari - komisyonTutari;

  // İndikatör Toggle Fonksiyonları
  const toggleAnaGosterge = (ad) => {
    setAnaGostergeler(prev => prev.includes(ad) ? prev.filter(x => x !== ad) : [...prev, ad]);
  };
  const toggleAltGosterge = (ad) => {
    setAltGostergeler(prev => prev.includes(ad) ? prev.filter(x => x !== ad) : [...prev, ad]);
  };

  // Figürler
  const teknikFigur = useMemo(() => {
    if (!teknikVeri) return null;
    return teknikFigurUret(teknikVeri, anaGostergeler, altGostergeler, grafikTuru, logaritmik, haftaSonuKaldir);
  }, [teknikVeri, anaGostergeler, altGostergeler, grafikTuru, logaritmik, haftaSonuKaldir]);

  const fraktalFigur = useMemo(() => {
    if (!fraktalVeri) return null;
    return fraktalFigurUret(fraktalVeri);
  }, [fraktalVeri]);

  const ist = teknikVeri?.istatistik || {};
  const sonFiyat = ist.son_fiyat ?? fraktalVeri?.fiyat ?? 0;
  const degisimPct = ist.degisim_pct ?? 0;
  const degisimTl = ist.degisim_tl ?? 0;
  const pozitif = degisimPct >= 0;

  return (
    <div className="terminal-kapsayici">
      {/* 1. ÜST BIST İŞLEM VE PİYASA BAŞLIĞI */}
      <header className="terminal-ust-bar">
        <div className="terminal-ust-satir1">
          {/* Sol: Hisse Seçici & Hızlı Butonlar */}
          <div className="hisse-arama-alani">
            <div className="hisse-select-wrap">
              <select value={hisse} onChange={e => { setHisse(e.target.value); setEmirFiyat(''); }}>
                {(t?.tickers || [hisse]).map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div className="hisse-hizli-chipler">
              {BIST30_POPULER.map(s => (
                <button
                  key={s}
                  className={`hisse-hizli-chip ${hisse === s ? 'aktif' : ''}`}
                  onClick={() => { setHisse(s); setEmirFiyat(''); }}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          {/* Sağ: Şirket Kimliği & Canlı Fiyat Rozeti */}
          <div className="terminal-kimlik-ve-fiyat">
            <div className="hisse-bilgi-blok">
              <div className="hisse-sembol-baslik">
                <span className="kod">{hisse}</span>
                <span className="hisse-pazar-rozet">{ist.pazar || 'BIST • Yıldız Pazar'}</span>
                <span className="seans-durum-rozet">{ist.seans_durum === 'AÇIK' ? '🟢 SEANS AÇIK' : '🔴 SEANS KAPALI'}</span>
              </div>
              <span className="hisse-sirket-adi">{ist.sirket_adi || `${hisse} Yatırım Ortaklığı`}</span>
            </div>

            <div className="fiyat-gostergesi-blok">
              <div className="canli-fiyat-degeri">{fmt(sonFiyat)} ₺</div>
              <div className={`degisim-rozet ${pozitif ? 'yukselis' : 'dusus'}`}>
                {pozitif ? '▲' : '▼'} {pozitif ? '+' : ''}{fmt(degisimTl)} ₺ ({pozitif ? '+' : ''}{fmt(degisimPct)}%)
              </div>
            </div>
          </div>
        </div>

        {/* 2. BIST Ticker İstatistik Şeridi */}
        <div className="terminal-metrik-serit">
          <div className="metrik-kutu-mini">
            <span className="etiket">Gün İçi Aralık</span>
            <span className="deger">{fmt(ist.gun_dusuk)} - {fmt(ist.gun_yuksek)} ₺</span>
          </div>
          <div className="metrik-kutu-mini">
            <span className="etiket">Açılış / Dünkü Kap.</span>
            <span className="deger">{fmt(ist.acilis)} / {fmt(ist.onceki_kapanis)} ₺</span>
          </div>
          <div className="metrik-kutu-mini">
            <span className="etiket">A.O.F (VWAP)</span>
            <span className="deger" style={{ color: '#00BCD4' }}>{fmt(ist.aof)} ₺</span>
          </div>
          <div className="metrik-kutu-mini">
            <span className="etiket">Hacim (Lot)</span>
            <span className="deger">{fmt(ist.hacim_lot, 0)}</span>
          </div>
          <div className="metrik-kutu-mini">
            <span className="etiket">İşlem Hacmi (TL)</span>
            <span className="deger" style={{ color: '#D7FF4E' }}>{fmt((ist.hacim_tl || 0) / 1000000, 1)} M ₺</span>
          </div>
          <div className="metrik-kutu-mini">
            <span className="etiket">52 Hafta Min-Max</span>
            <span className="deger">{fmt(ist.hafta_52_min)} - {fmt(ist.hafta_52_max)} ₺</span>
          </div>
        </div>
      </header>

      {/* 3. ANA TERMİNAL SEKMELERİ (TradingView × TradeAll × Fintables) */}
      <nav className="terminal-nav-bar">
        <button className={`terminal-nav-tab ${anaSekme === 0 ? 'aktif' : ''}`} onClick={() => setAnaSekme(0)}>
          📊 BIST Teknik Grafik & İşlem Masası (TradingView × TradeAll)
        </button>
        <button className={`terminal-nav-tab ${anaSekme === 1 ? 'aktif' : ''}`} onClick={() => setAnaSekme(1)}>
          📋 Fintables Şirket Karnesi & Temel Analiz
        </button>
        <button className={`terminal-nav-tab ${anaSekme === 2 ? 'aktif' : ''}`} onClick={() => setAnaSekme(2)}>
          🧬 Fraktal Geometri & AI Tahmin Terminali
        </button>
        <button className={`terminal-nav-tab ${anaSekme === 3 ? 'aktif' : ''}`} onClick={() => setAnaSekme(3)}>
          🧪 Algoritmik Formül & Strateji Laboratuvarı
        </button>
      </nav>

      {/* ====================================================================
          SEKME 1: BIST PROFESYONEL İŞLEM & TEKNİK GRAFİK MASASI
          ==================================================================== */}
      {anaSekme === 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {/* Grafik Araç Çubuğu (TradingView Toolbar) */}
          <div className="grafik-arac-cubugu">
            {/* Zaman Aralığı (Interval) */}
            <div className="arac-grup">
              <span className="arac-etiket">Hassasiyet:</span>
              {ARALIKLAR.map(a => (
                <button
                  key={a.id}
                  className={`arac-btn ${interval === a.id ? 'aktif' : ''}`}
                  onClick={() => setIntervalVal(a.id)}
                >
                  {a.etiket}
                </button>
              ))}
            </div>

            {/* Tarih Aralığı (Period) */}
            <div className="arac-grup">
              <span className="arac-etiket">Dönem:</span>
              {PERIYOTLAR.map(p => (
                <button
                  key={p.id}
                  className={`arac-btn ${period === p.id ? 'aktif' : ''}`}
                  onClick={() => setPeriodVal(p.id)}
                >
                  {p.etiket}
                </button>
              ))}
            </div>

            {/* Grafik Türü */}
            <div className="arac-grup">
              {GRAFIK_TURLERI.map(g => (
                <button
                  key={g.id}
                  className={`arac-btn ${grafikTuru === g.id ? 'aktif' : ''}`}
                  onClick={() => setGrafikTuru(g.id)}
                >
                  {g.etiket}
                </button>
              ))}
            </div>

            {/* Görünüm Ayarları */}
            <div className="arac-grup">
              <button
                className={`arac-btn ${logaritmik ? 'aktif' : ''}`}
                onClick={() => setLogaritmik(!logaritmik)}
                title="Logaritmik Ölçek"
              >
                Log
              </button>
              <button
                className={`arac-btn ${haftaSonuKaldir ? 'aktif' : ''}`}
                onClick={() => setHaftaSonuKaldir(!haftaSonuKaldir)}
                title="Hafta Sonu Boşluklarını Kaldır"
              >
                Hafta Sonu Filtresi
              </button>
            </div>
          </div>

          {/* Hızlı Gösterge Seçicileri */}
          <div className="grafik-arac-cubugu" style={{ background: '#0E1117' }}>
            <div className="arac-grup">
              <span className="arac-etiket">Grafik Üzeri:</span>
              {ANA_GOSTERGELER.map(g => (
                <button
                  key={g}
                  className={`arac-btn chip-gosterge ${anaGostergeler.includes(g) ? 'aktif' : ''}`}
                  onClick={() => toggleAnaGosterge(g)}
                >
                  {g}
                </button>
              ))}
            </div>
            <div className="arac-grup">
              <span className="arac-etiket">Alt Osilatörler:</span>
              {ALT_OSILATORLER.map(o => (
                <button
                  key={o}
                  className={`arac-btn chip-gosterge ${altGostergeler.includes(o) ? 'aktif' : ''}`}
                  onClick={() => toggleAltGosterge(o)}
                >
                  {o}
                </button>
              ))}
              {formulOnayli && (
                <button
                  className={`arac-btn chip-gosterge ${altGostergeler.includes('Özel Algoritma') ? 'aktif' : ''}`}
                  onClick={() => toggleAltGosterge('Özel Algoritma')}
                >
                  🧪 Özel Algoritma
                </button>
              )}
            </div>
          </div>

          {/* İki Kolonlu Profesyonel Terminal Düzeni: Sol Grafik - Sağ İşlem Masası */}
          <div className="terminal-iki-kolon">
            {/* SOL: YÜKSEK ÇÖZÜNÜRLÜKLÜ GRAFİK PANE */}
            <div className="terminal-grafik-kolon">
              <div className="terminal-grafik-kutu" style={{ opacity: bekle ? 0.6 : 1 }}>
                {hata && <div className="uyari-kutu" style={{ margin: 12 }}>{hata}</div>}
                {bekle && !teknikFigur && <div className="loading-hint">BIST Piyasa Verileri Yükleniyor…</div>}
                {teknikFigur && (
                  <PlotlyGrafik
                    data={teknikFigur.data}
                    layout={teknikFigur.layout}
                    config={{ responsive: true, scrollZoom: true }}
                  />
                )}
              </div>
            </div>

            {/* SAĞ: ARACI KURUM İŞLEM & DERİNLİK MASASI */}
            <aside className="terminal-masasi">
              <nav className="masa-sekmeler">
                <button className={`masa-sekme-btn ${masaSekme === 'emir' ? 'aktif' : ''}`} onClick={() => setMasaSekme('emir')}>
                  ⚡ Hızlı Emir
                </button>
                <button className={`masa-sekme-btn ${masaSekme === 'derinlik' ? 'aktif' : ''}`} onClick={() => setMasaSekme('derinlik')}>
                  📑 5K Derinlik
                </button>
                <button className={`masa-sekme-btn ${masaSekme === 'akd' ? 'aktif' : ''}`} onClick={() => setMasaSekme('akd')}>
                  🏢 AKD Dağılımı
                </button>
                <button className={`masa-sekme-btn ${masaSekme === 'islemler' ? 'aktif' : ''}`} onClick={() => setMasaSekme('islemler')}>
                  ⏱️ İşlem Akışı
                </button>
              </nav>

              <div className="masa-icerik">
                {/* 1. HIZLI EMİR MASASI */}
                {masaSekme === 'emir' && (
                  <>
                    <div className="emir-yon-secici">
                      <button
                        className={`emir-yon-btn alis ${emirYon === 'AL' ? 'aktif' : ''}`}
                        onClick={() => setEmirYon('AL')}
                      >
                        ALIŞ (BUY)
                      </button>
                      <button
                        className={`emir-yon-btn satis ${emirYon === 'SAT' ? 'aktif' : ''}`}
                        onClick={() => setEmirYon('SAT')}
                      >
                        SATIŞ (SELL)
                      </button>
                    </div>

                    <div className="emir-alan-grup">
                      <label>Emir Tipi</label>
                      <div className="segment" style={{ marginTop: 2 }}>
                        {['Piyasa', 'Limit', 'Zarar Durdur'].map(tip => (
                          <button
                            key={tip}
                            className={emirTip === tip ? 'aktif' : ''}
                            onClick={() => setEmirTip(tip)}
                          >
                            {tip}
                          </button>
                        ))}
                      </div>
                    </div>

                    {emirTip !== 'Piyasa' && (
                      <div className="emir-alan-grup">
                        <label>{emirTip === 'Limit' ? 'Limit Fiyat (₺)' : 'Tetikleme Fiyatı (₺)'}</label>
                        <div className="emir-input-wrap">
                          <input
                            type="number"
                            step="0.05"
                            value={emirFiyat}
                            onChange={e => setEmirFiyat(e.target.value)}
                            placeholder={String(sonFiyat)}
                          />
                          <span className="birim">₺</span>
                        </div>
                      </div>
                    )}

                    <div className="emir-alan-grup">
                      <label>Lot Miktarı</label>
                      <div className="emir-input-wrap">
                        <input
                          type="number"
                          min="1"
                          value={emirLot}
                          onChange={e => setEmirLot(e.target.value)}
                        />
                        <span className="birim">LOT</span>
                      </div>
                      <div className="lot-hizli-butonlar">
                        {[10, 50, 100, 250, 500, 1000].map(adet => (
                          <button key={adet} className="lot-hizli-btn" onClick={() => setEmirLot(adet)}>
                            +{adet}
                          </button>
                        ))}
                        <button
                          className="lot-hizli-btn"
                          style={{ color: '#D7FF4E' }}
                          onClick={() => {
                            if (sonFiyat > 0 && sanalBakiye > 0) {
                              setEmirLot(Math.max(1, Math.floor(sanalBakiye / sonFiyat)));
                            }
                          }}
                        >
                          Max
                        </button>
                      </div>
                    </div>

                    {/* Hesap Özeti */}
                    <div className="emir-ozet-kutusu">
                      <div className="emir-ozet-satir">
                        <span>İşlem Değeri</span>
                        <span className="deger">{fmt(islemTutari)} ₺</span>
                      </div>
                      <div className="emir-ozet-satir">
                        <span>BIST Payı + Komisyon (‰1.5)</span>
                        <span className="deger">{fmt(komisyonTutari)} ₺</span>
                      </div>
                      <div className="emir-ozet-satir toplam">
                        <span>Tahmini Toplam</span>
                        <span className="deger">{fmt(toplamGereken)} ₺</span>
                      </div>
                    </div>

                    <button
                      className={`emir-gonder-btn ${emirYon === 'AL' ? 'alis' : 'satis'}`}
                      onClick={emirGonder}
                      disabled={emirBekle}
                    >
                      {emirBekle ? 'BIST İletiliyor…' : `BIST ${hisse} ${emirYon} EMRİ GÖNDER`}
                    </button>

                    {emirMesaj && (
                      <div className={emirMesaj.tur === 'ok' ? 'ok-msg' : 'error-msg'} style={{ fontSize: 12 }}>
                        {emirMesaj.tur === 'ok' ? '✅ ' : '⚠️ '} {emirMesaj.metin}
                      </div>
                    )}

                    {/* Bakiye & Pozisyon Bilgisi */}
                    <div className="portfoy-mini-ozet">
                      <div>
                        <div style={{ color: '#787B86', fontSize: 10.5 }}>KULLANILABİLİR BAKİYE</div>
                        <div style={{ color: '#FFFFFF', fontWeight: 700, fontFamily: 'JetBrains Mono' }}>
                          {fmt(sanalBakiye, 0)} ₺
                        </div>
                      </div>
                      {mevcutPozisyon && (
                        <div style={{ textAlign: 'right' }}>
                          <div style={{ color: '#787B86', fontSize: 10.5 }}>MEVCUT {hisse} POZİSYON</div>
                          <div style={{ color: mevcutPozisyon.kz >= 0 ? '#089981' : '#F23645', fontWeight: 700, fontFamily: 'JetBrains Mono' }}>
                            {mevcutPozisyon.lot} Lot (%{fmt(mevcutPozisyon.verim)})
                          </div>
                        </div>
                      )}
                    </div>
                  </>
                )}

                {/* 2. 5 KADEME BIST DERİNLİK TABLOSU */}
                {masaSekme === 'derinlik' && (
                  <div className="derinlik-kutusu">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 11, color: '#787B86' }}>
                      <span style={{ color: '#089981', fontWeight: 600 }}>Alıcı Baskısı: %{derinlik?.alici_orani ?? 50}</span>
                      <span className="tradeall-spread-pill">
                        Makas (Spread): {fmt(derinlik?.spread ?? 0.05)} ₺ {sonFiyat > 0 ? `(%${fmt(((derinlik?.spread ?? 0.05) / sonFiyat) * 100, 2)})` : ''}
                      </span>
                      <span style={{ color: '#F23645', fontWeight: 600 }}>Satıcı Baskısı: %{derinlik?.satici_orani ?? 50}</span>
                    </div>

                    <div className="derinlik-guc-bar">
                      <div className="guc-alici" style={{ width: `${derinlik?.alici_orani ?? 50}%` }} />
                      <div className="guc-satici" style={{ width: `${derinlik?.satici_orani ?? 50}%` }} />
                    </div>

                    <div className="derinlik-tablo-wrap">
                      {/* Alış Kademeleri */}
                      <div>
                        <div className="derinlik-taraf-baslik alis">ALIŞ (BIDS)</div>
                        {(derinlik?.alislar || []).map(b => (
                          <div
                            key={b.kademe}
                            className="derinlik-satir alis"
                            onClick={() => fiyataTikla(b.fiyat)}
                            title="Emir kutusuna fiyatı aktar"
                          >
                            <div className="derinlik-bar-arkaplan" style={{ width: `${b.yuzde}%` }} />
                            <span className="emir">{b.emir}e</span>
                            <span className="lot">{fmt(b.lot, 0)}</span>
                            <span className="fiyat">{fmt(b.fiyat)}</span>
                          </div>
                        ))}
                      </div>

                      {/* Satış Kademeleri */}
                      <div>
                        <div className="derinlik-taraf-baslik satis">SATIŞ (ASKS)</div>
                        {(derinlik?.satislar || []).map(a => (
                          <div
                            key={a.kademe}
                            className="derinlik-satir satis"
                            onClick={() => fiyataTikla(a.fiyat)}
                            title="Emir kutusuna fiyatı aktar"
                          >
                            <div className="derinlik-bar-arkaplan" style={{ width: `${a.yuzde}%` }} />
                            <span className="fiyat">{fmt(a.fiyat)}</span>
                            <span className="lot">{fmt(a.lot, 0)}</span>
                            <span className="emir">{a.emir}e</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: '#D1D4DC', paddingTop: 6, borderTop: '1px solid #1E222D' }}>
                      <span>Top. Alış: <b>{fmt(derinlik?.toplam_alis_lot, 0)}</b></span>
                      <span>Top. Satış: <b>{fmt(derinlik?.toplam_satis_lot, 0)}</b></span>
                    </div>
                  </div>
                )}

                {/* 3. ARACI KURUM DAĞILIMI (AKD) */}
                {masaSekme === 'akd' && (
                  <div className="akd-kutusu">
                    <div className="akd-para-kart" style={{ display: 'flex', flexDirection: 'column', gap: 6, alignItems: 'stretch' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ color: '#787B86', fontSize: 11 }}>Net Para Girişi / Çıkışı</span>
                        <span
                          className="tutar"
                          style={{ color: (akd?.net_para_girisi_milyon || 0) >= 0 ? '#089981' : '#F23645', fontSize: 14 }}
                        >
                          {(akd?.net_para_girisi_milyon || 0) >= 0 ? '+' : ''}{fmt(akd?.net_para_girisi_milyon)} M ₺
                        </span>
                      </div>
                      {akd?.baski_durumu && (
                        <div style={{ fontSize: 10.5, color: '#D1D4DC', padding: '4px 6px', background: '#131722', borderRadius: 4, borderLeft: (akd?.net_para_girisi_milyon || 0) >= 0 ? '3px solid #089981' : '3px solid #F23645' }}>
                          {akd.baski_durumu}
                        </div>
                      )}
                    </div>

                    {/* İlk 5 Alıcı */}
                    <div>
                      <div className="derinlik-taraf-baslik alis" style={{ marginBottom: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span>İLK 5 ALICI KURUM</span>
                        {akd?.ilk5_alici_yuzde && (
                          <span style={{ fontSize: 10, color: '#089981', fontWeight: 600 }}>Pay: %{fmt(akd.ilk5_alici_yuzde, 1)}</span>
                        )}
                      </div>
                      <div className="akd-liste">
                        {(akd?.alicilar || []).map((k, i) => (
                          <div key={i} className="akd-item">
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                              <span className="kurum">{i + 1}. {k.kurum}</span>
                              {k.maliyet && (
                                <span style={{ fontSize: 9.5, color: '#787B86' }}>
                                  Mlyt: {fmt(k.maliyet)} ₺
                                </span>
                              )}
                            </div>
                            <div className="lot-pay" style={{ textAlign: 'right', display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 1 }}>
                              <span style={{ color: '#089981', fontWeight: 600 }}>+{fmt(k.net_lot, 0)} lot</span>
                              <span style={{ color: '#787B86', fontSize: 10.5 }}>%{fmt(k.yuzde, 1)}</span>
                            </div>
                          </div>
                        ))}
                        {akd?.diger_alici && (
                          <div className="akd-item" style={{ opacity: 0.8, background: '#131722', border: '1px dashed #2A2E39' }}>
                            <span className="kurum" style={{ fontStyle: 'italic', color: '#9CA3AF' }}>Diğer Kurumlar</span>
                            <div className="lot-pay" style={{ textAlign: 'right', display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 1 }}>
                              <span style={{ color: '#089981' }}>+{fmt(akd.diger_alici.net_lot, 0)} lot</span>
                              <span style={{ color: '#787B86', fontSize: 10.5 }}>%{fmt(akd.diger_alici.yuzde, 1)}</span>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* İlk 5 Satıcı */}
                    <div style={{ marginTop: 6 }}>
                      <div className="derinlik-taraf-baslik satis" style={{ marginBottom: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span>İLK 5 SATICI KURUM</span>
                        {akd?.ilk5_satici_yuzde && (
                          <span style={{ fontSize: 10, color: '#F23645', fontWeight: 600 }}>Pay: %{fmt(akd.ilk5_satici_yuzde, 1)}</span>
                        )}
                      </div>
                      <div className="akd-liste">
                        {(akd?.saticilar || []).map((k, i) => (
                          <div key={i} className="akd-item">
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                              <span className="kurum">{i + 1}. {k.kurum}</span>
                              {k.maliyet && (
                                <span style={{ fontSize: 9.5, color: '#787B86' }}>
                                  Mlyt: {fmt(k.maliyet)} ₺
                                </span>
                              )}
                            </div>
                            <div className="lot-pay" style={{ textAlign: 'right', display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 1 }}>
                              <span style={{ color: '#F23645', fontWeight: 600 }}>-{fmt(k.net_lot, 0)} lot</span>
                              <span style={{ color: '#787B86', fontSize: 10.5 }}>%{fmt(k.yuzde, 1)}</span>
                            </div>
                          </div>
                        ))}
                        {akd?.diger_satici && (
                          <div className="akd-item" style={{ opacity: 0.8, background: '#131722', border: '1px dashed #2A2E39' }}>
                            <span className="kurum" style={{ fontStyle: 'italic', color: '#9CA3AF' }}>Diğer Kurumlar</span>
                            <div className="lot-pay" style={{ textAlign: 'right', display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 1 }}>
                              <span style={{ color: '#F23645' }}>-{fmt(akd.diger_satici.net_lot, 0)} lot</span>
                              <span style={{ color: '#787B86', fontSize: 10.5 }}>%{fmt(akd.diger_satici.yuzde, 1)}</span>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* 4. CANLI BIST İŞLEM AKIŞI (TIME & SALES) */}
                {masaSekme === 'islemler' && (
                  <div className="islemler-akisi">
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10.5, color: '#787B86', padding: '0 4px 4px' }}>
                      <span>ZAMAN</span>
                      <span>FİYAT</span>
                      <span>LOT</span>
                    </div>
                    {islemler.map((islem, idx) => (
                      <div key={idx} className={`islem-satir ${islem.yon}`}>
                        <span className="zaman">{islem.zaman}</span>
                        <span className="fiyat">{fmt(islem.fiyat)} ₺</span>
                        <span className="lot">{fmt(islem.lot, 0)}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </aside>
          </div>
        </div>
      )}

      {/* ====================================================================
          SEKME 2: FİNTABLES ŞİRKET KARNESİ & TEMEL ANALİZ RADARI
          ==================================================================== */}
      {anaSekme === 1 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <FintablesKarneKart
            hisse={hisse}
            fiyat={sonFiyat}
            degisim={degisimPct}
            onHizliAl={() => {
              setAnaSekme(0);
              setMasaSekme('emir');
            }}
            onGrafikGit={() => setAnaSekme(0)}
            varsayilanAcik={true}
          />
        </div>
      )}

      {/* ====================================================================
          SEKME 3: FRAKTAL GEOMETRİ & KURUMSAL AI TAHMİN TERMİNALİ
          ==================================================================== */}
      {anaSekme === 2 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {fraktalVeri?.bildirim && (
            <div className="uyari-kutu" style={{ marginTop: 4 }}>
              🔔 {fraktalVeri.bildirim}
            </div>
          )}

          {/* Ana Fraktal Grafiği */}
          <div className="terminal-grafik-kutu" style={{ padding: 0 }}>
            {fraktalFigur && <PlotlyGrafik data={fraktalFigur.data} layout={fraktalFigur.layout} />}
          </div>

          {/* Fraktal DNA Eşleşmeleri ve Projeksiyon Kartları */}
          <div className="fraktal-grid-kartlar">
            {/* 30 Günlük Fraktal Projeksiyonu */}
            <div className="fraktal-analiz-kart" style={{ borderLeft: `4px solid ${fraktalVeri?.projeksiyon >= 0 ? '#089981' : '#F23645'}` }}>
              <div className="fraktal-kart-baslik">
                <span>🔮 30 Günlük Geometrik Projeksiyon</span>
                <span className="rozet tetik">Kuantitatif Model</span>
              </div>
              <div
                className="fraktal-buyuk-deger"
                style={{ color: fraktalVeri?.projeksiyon >= 0 ? '#089981' : '#F23645' }}
              >
                {fraktalVeri?.projeksiyon >= 0 ? '%+' : '%'}{fmt(fraktalVeri?.projeksiyon)}
              </div>
              <p style={{ margin: 0, fontSize: 12, color: '#787B86' }}>
                BIST geçmişindeki en benzer geometrik yapıların 30 günlük getiri ortalamasıdır.
              </p>

              <div className="fraktal-hedef-grid">
                <div className="hedef-item">
                  <span className="label">Hedef Fiyat</span>
                  <span className="val" style={{ color: '#089981' }}>{fmt(fraktalVeri?.hedef_fiyat)} ₺</span>
                </div>
                <div className="hedef-item">
                  <span className="label">Stop-Loss (Zarar Kes)</span>
                  <span className="val" style={{ color: '#F23645' }}>{fmt(fraktalVeri?.stop_loss)} ₺</span>
                </div>
                <div className="hedef-item">
                  <span className="label">Destek Seviyesi</span>
                  <span className="val">{fmt(fraktalVeri?.destek)} ₺</span>
                </div>
                <div className="hedef-item">
                  <span className="label">Risk / Ödül Oranı</span>
                  <span className="val" style={{ color: '#D7FF4E' }}>1 : {fmt(fraktalVeri?.risk_odul)}</span>
                </div>
              </div>
            </div>

            {/* AI Karar Karnesi */}
            <div className="fraktal-analiz-kart">
              <div className="fraktal-kart-baslik">
                <span>🤖 AI & Algoritmik Karar Konsolu</span>
                <span className="rozet al">{fraktalVeri?.trend || 'Konsolidasyon'}</span>
              </div>
              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                <Metrik etiket="RSI (14)">{fmt(fraktalVeri?.rsi, 1)}</Metrik>
                <Metrik etiket="EMA 20">{fmt(fraktalVeri?.ema20)}</Metrik>
                <Metrik etiket="EMA 50">{fmt(fraktalVeri?.ema50)}</Metrik>
                <Metrik etiket="MACD">{fmt(fraktalVeri?.macd)}</Metrik>
              </div>
              <div className={`ai-yorum ${fraktalVeri?.ai_yorum?.durum || 'neutral'}`} style={{ margin: 0, fontSize: 13 }}>
                <b>Strateji Notu:</b> <Metin t={fraktalVeri?.ai_yorum?.metin || 'Analiz hesaplanıyor...'} />
              </div>
            </div>

            {/* Risk & Temel Rasyolar */}
            <div className="fraktal-analiz-kart">
              <div className="fraktal-kart-baslik">
                <span>📊 Risk Karnesi & Temel Rasyolar</span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <Metrik etiket="Yıllık Volatilite">%{fmt(fraktalVeri?.risk?.volatilite, 1)}</Metrik>
                <Metrik etiket="Sharpe Rasyosu">{fmt(fraktalVeri?.risk?.sharpe)}</Metrik>
                <Metrik etiket="Max Drawdown">%{fmt(fraktalVeri?.risk?.max_dd, 1)}</Metrik>
                <Metrik etiket="F/K Oranı">{fraktalVeri?.risk?.fk == null ? 'N/A' : fmt(fraktalVeri.risk.fk)}</Metrik>
              </div>
            </div>
          </div>

          {/* Tarihsel Fraktal Eşleşme Önizlemeleri */}
          <h4 style={{ color: '#F7F7F8', marginTop: 10 }}>Geçmiş Fraktal Eşleşmeleri (DNA Benzerlik Skoru)</h4>
          <div className="fraktal-satir">
            {(fraktalVeri?.eslesmeler || []).map((m, idx) => (
              <div key={idx} className="fraktal-kolon" style={{ background: '#131722', padding: 14, borderRadius: 8, border: '1px solid #2A2E39' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 8 }}>
                  <span style={{ fontWeight: 700, color: '#D7FF4E' }}>Fraktal #{m.sira}</span>
                  <span style={{ color: '#089981' }}>DNA Benzerliği: %{fmt(m.benzerlik, 1)}</span>
                </div>
                <div style={{ fontSize: 12, color: '#787B86', marginBottom: 6 }}>
                  Dönem: {m.baslangic} — {m.bitis} | Gerçekleşen Getiri: <b>%{fmt(m.roi)}</b>
                </div>
                <PlotlyGrafik
                  data={[
                    { type: 'scatter', x: m.gecmis.map((_, i) => i), y: m.gecmis, name: 'Geçmiş Trend', line: { color: '#FFD700', width: 2 } },
                    { type: 'scatter', x: Array.from({ length: m.gelecek.length + 1 }, (_, i) => m.gecmis.length - 1 + i), y: [m.gecmis[m.gecmis.length - 1], ...m.gelecek], name: 'Sonraki Hareket', line: { color: '#E040FB', width: 2, dash: 'dot' } },
                  ]}
                  layout={{
                    height: 160,
                    margin: { l: 0, r: 0, t: 0, b: 0 },
                    xaxis: { visible: false }, yaxis: { visible: false },
                    showlegend: false,
                  }}
                  config={{ staticPlot: true }}
                />
              </div>
            ))}
          </div>

          {/* KAP & Haberler */}
          <Acilir baslik="📢 KAP Bildirimleri & BIST Şirket Haberleri" acik>
            {(fraktalVeri?.haberler || []).map((h, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid #1E222D', fontSize: 13 }}>
                <a href={h.link} target="_blank" rel="noreferrer" style={{ color: '#D1D4DC', textDecoration: 'none' }}>
                  {h.baslik}
                </a>
                <span className={`rozet ${h.duygu === 'Pozitif' ? 'tetik' : 'bekle'}`} style={{ marginLeft: 10 }}>
                  {h.duygu}
                </span>
              </div>
            ))}
          </Acilir>
        </div>
      )}

      {/* ====================================================================
          SEKME 4: ALGORİTMİK FORMÜL & STRATEJİ LABORATUVARI
          ==================================================================== */}
      {anaSekme === 3 && (
        <div className="algo-studio-panel">
          <div>
            <h3 style={{ color: '#FFFFFF', marginBottom: 6 }}>🧪 Algoritmik Formül & Matematiksel İndikatör Yazıcı</h3>
            <p style={{ color: '#787B86', fontSize: 13, margin: 0 }}>
              Kendi al/sat stratejinizi veya matematiksel indikatörünüzü Pandas sözdizimiyle yazın; kurumsal grafikte canlı olarak alt panelde test edin.
            </p>
          </div>

          <div>
            <label style={{ fontSize: 12, color: '#787B86', textTransform: 'uppercase', marginBottom: 6, display: 'block' }}>
              Hızlı Algoritma Şablonları (Tek Tıkla Uygula):
            </label>
            <div className="algo-sablon-liste">
              {[
                { ad: 'Fiyat - EMA20 Farkı', kod: "df['close'] - df['ema_20']" },
                { ad: 'Bollinger Bant Genişliği', kod: "(df['bbu'] - df['bbl']) / df['bbm'] * 100" },
                { ad: 'RSI Aşırı Satım Sapması', kod: "np.where(df['rsi_14'] < 30, 1, 0)" },
                { ad: 'Golden Cross Farkı', kod: "df['ema_20'] - df['ema_50']" },
                { ad: 'Fiyat Momentum Oranı', kod: "df['close'].pct_change(5) * 100" },
              ].map(s => (
                <button
                  key={s.ad}
                  className="algo-sablon-btn"
                  onClick={() => { setFormulMetin(s.kod); setFormulOnayli(s.kod); }}
                >
                  {s.ad}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label style={{ fontSize: 12, color: '#787B86', textTransform: 'uppercase', marginBottom: 6, display: 'block' }}>
              Matematiksel Formül:
            </label>
            <input
              className="algo-kod-input"
              value={formulMetin}
              onChange={e => setFormulMetin(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') setFormulOnayli(formulMetin.trim()); }}
              placeholder="Örn: df['close'] - df['sma_20']"
            />
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 }}>
              <span style={{ fontSize: 12, color: '#787B86' }}>
                Formülü grafiğe uygulamak için Enter'a basın veya butona tıklayın.
              </span>
              <button
                className="arac-btn aktif"
                onClick={() => setFormulOnayli(formulMetin.trim())}
                style={{ padding: '8px 18px', fontSize: 13 }}
              >
                Formülü Derle & Grafiğe Ekle
              </button>
            </div>
          </div>

          {teknikVeri?.formul?.ok && (
            <div className="ok-msg" style={{ fontSize: 13 }}>
              ✅ Algoritma başarıyla derlendi! Grafiğin alt paneline "Özel Algoritma" olarak eklendi.
            </div>
          )}
          {teknikVeri?.formul && !teknikVeri.formul.ok && (
            <div className="error-msg" style={{ fontSize: 13 }}>
              ❌ Formül Hatası: {teknikVeri.formul.hata}
            </div>
          )}

          <div className="bilgi-kutu" style={{ marginTop: 6 }}>
            <b>Kullanılabilir Veri Kolonları:</b>
            <div className="kolon-liste" style={{ marginTop: 8 }}>
              {(teknikVeri?.formul_kolonlari || ['open', 'high', 'low', 'close', 'volume', 'sma_20', 'sma_50', 'ema_20', 'ema_50', 'rsi_14', 'macd']).map(k => (
                <code key={k} style={{ color: '#D7FF4E' }}>{k}</code>
              ))}
            </div>
            Desteklenen Operatörler: <code>+</code>, <code>-</code>, <code>*</code>, <code>/</code>, <code>**</code>, <code>&gt;</code>, <code>&lt;</code>, <code>==</code>, <code>.rolling(n).mean()</code>, <code>.ewm(span=n).mean()</code>, <code>.shift()</code>, <code>.pct_change()</code>, <code>np.log()</code>, <code>np.sqrt()</code>, <code>np.where()</code>.
          </div>
        </div>
      )}
    </div>
  );
}

import React, { useState, useMemo } from 'react';
import { fmt } from '../lib/format.jsx';
import PlotlyGrafik from '../components/PlotlyGrafik.jsx';
import { BIST_DARK_TEMPLATE } from '../lib/plotlyTema.js';

// 1. Hedef Yaşa Göre Simülasyon (Kullanıcının belirlediği yaşta birikecek tahmini portföyü hesaplar)
function simuleHedefYas(baslangic, aylikTasarruf, reelYillik, kalanYil, baslangicYas) {
  const aylikReel = Math.pow(1 + Math.max(reelYillik, -0.9), 1 / 12) - 1;
  let bakiye = baslangic;
  const toplamAy = Math.max(1, Math.round(kalanYil * 12));
  const yillikNoktalar = [{ yil: 0, yas: baslangicYas, bakiye: baslangic }];

  for (let ay = 1; ay <= toplamAy; ay++) {
    bakiye = bakiye * (1 + aylikReel) + aylikTasarruf;
    if (ay % 12 === 0) {
      const gecenYil = ay / 12;
      yillikNoktalar.push({
        yil: gecenYil,
        yas: baslangicYas + gecenYil,
        bakiye: Math.round(bakiye),
      });
    }
  }

  // Küsuratlı kalan aylar varsa son noktayı ekle
  if (toplamAy % 12 !== 0) {
    const sonYil = Number((toplamAy / 12).toFixed(1));
    yillikNoktalar.push({
      yil: sonYil,
      yas: Number((baslangicYas + sonYil).toFixed(1)),
      bakiye: Math.round(bakiye),
    });
  }

  const tahminiPortfoy = Math.max(0, bakiye);

  // Hedef yaştan sonra 3 yıl daha ek projeksiyon
  let projeksiyon = tahminiPortfoy;
  for (let extra = 1; extra <= 3; extra++) {
    for (let m = 0; m < 12; m++) {
      projeksiyon = projeksiyon * (1 + aylikReel) + aylikTasarruf;
    }
    const ekYil = (toplamAy / 12) + extra;
    yillikNoktalar.push({
      yil: Math.round(ekYil),
      yas: Math.round(baslangicYas + ekYil),
      bakiye: Math.round(projeksiyon),
    });
  }

  return {
    tahminiPortfoy,
    yillikNoktalar,
    kalanYil: Number((toplamAy / 12).toFixed(1)),
    kalanAy: toplamAy,
  };
}

// 2. Hedef Bütçeye Göre Simülasyon (Klasik FIRE - İstenen bütçeye kaç yılda ulaşılacağını bulur)
function simuleHedefButce(baslangic, aylikTasarruf, reelYillik, hedef, enFazlaYil = 50) {
  const aylikReel = Math.pow(1 + Math.max(reelYillik, -0.9), 1 / 12) - 1;
  let bakiye = baslangic, ay = 0;
  const yillikNoktalar = [{ yil: 0, bakiye: baslangic }];

  while (bakiye < hedef && ay < enFazlaYil * 12) {
    bakiye = bakiye * (1 + aylikReel) + aylikTasarruf;
    ay++;
    if (ay % 12 === 0) {
      yillikNoktalar.push({ yil: ay / 12, bakiye: Math.round(bakiye) });
    }
  }

  if (bakiye >= hedef) {
    for (let extra = 1; extra <= 3; extra++) {
      bakiye = bakiye * (1 + aylikReel) + aylikTasarruf;
      yillikNoktalar.push({ yil: Math.round(ay / 12) + extra, bakiye: Math.round(bakiye) });
    }
  }

  return { ulasildi: bakiye >= hedef, ay, yillikNoktalar, sonBakiye: bakiye };
}

const sayi = (v) => { const n = parseFloat(v); return isNaN(n) ? 0 : n; };

export default function FinansalOzgurluk() {
  // Hesaplama Modu: 'hedef_yas' (Kullanıcının talep ettiği: Hedef Yaşı Belirle, Tahmini Portföyü Bul) | 'hedef_butce' (Klasik Bütçe Odaklı)
  const [hesaplamaModu, setHesaplamaModu] = useState('hedef_yas');

  const [yas, setYas] = useState(30);
  const [hedefYas, setHedefYas] = useState(47); // Hedef Emeklilik / Finansal Özgürlük Yaşı
  const [birikim, setBirikim] = useState(350000);
  const [tasarruf, setTasarruf] = useState(25000);
  const [harcama, setHarcama] = useState(50000); // Emeklilikte İstenen Aylık Bütçe
  const [getiri, setGetiri] = useState(50); // % Yıllık portföy getirisi
  const [enflasyon, setEnflasyon] = useState(35); // % Enflasyon beklentisi
  const [cekim, setCekim] = useState(4); // % SWR (Safe Withdrawal Rate)

  const s = useMemo(() => {
    const reel = (1 + sayi(getiri) / 100) / (1 + sayi(enflasyon) / 100) - 1;
    const swrOran = Math.max(sayi(cekim), 0.1) / 100;

    if (hesaplamaModu === 'hedef_yas') {
      // 1. HEDEF YAŞ ODAKLI HESAPLAMA (KULLANICININ İSTEDİĞİ)
      const kalanYil = Math.max(0.5, sayi(hedefYas) - sayi(yas));
      const ana = simuleHedefYas(sayi(birikim), sayi(tasarruf), reel, kalanYil, sayi(yas));
      const senaryo25 = simuleHedefYas(sayi(birikim), sayi(tasarruf) * 1.25, reel, kalanYil, sayi(yas));
      const senaryo50 = simuleHedefYas(sayi(birikim), sayi(tasarruf) * 1.5, reel, kalanYil, sayi(yas));
      const senaryo100 = simuleHedefYas(sayi(birikim), sayi(tasarruf) * 2.0, reel, kalanYil, sayi(yas));

      // Hedef yaştaki tahmini portföyden çekilebilecek güvenli aylık gelir
      const aylikPasifGelir = (ana.tahminiPortfoy * swrOran) / 12;
      const gelir25 = (senaryo25.tahminiPortfoy * swrOran) / 12;
      const gelir50 = (senaryo50.tahminiPortfoy * swrOran) / 12;
      const gelir100 = (senaryo100.tahminiPortfoy * swrOran) / 12;

      // Kilometre Taşları (Hedef Yaş Portföyüne Göre)
      const kmGuvenlik = aylikPasifGelir * 6; // 6 Aylık acil durum fonu
      const kmCeyrek = ana.tahminiPortfoy * 0.25; // %25 Yolculuk
      const kmYari = ana.tahminiPortfoy * 0.5; // %50 Lean FIRE
      const kmTam = ana.tahminiPortfoy; // %100 Hedef Portföy

      return {
        mod: 'hedef_yas',
        reel,
        kalanYil,
        tahminiPortfoy: ana.tahminiPortfoy,
        aylikPasifGelir,
        ana,
        senaryolar: [
          { etiket: '+%25 Tasarruf', oran: 1.25, sonuc: senaryo25, aylikGelir: gelir25 },
          { etiket: '+%50 Tasarruf', oran: 1.5, sonuc: senaryo50, aylikGelir: gelir50 },
          { etiket: '+%100 Tasarruf', oran: 2.0, sonuc: senaryo100, aylikGelir: gelir100 },
        ],
        milestones: [
          { ad: 'Finansal Güvenlik (6 Aylık Fon)', hedefTL: kmGuvenlik, aciklama: 'Temel yaşam giderleri güvencede' },
          { ad: 'Çeyrek Yolculuk (%25)', hedefTL: kmCeyrek, aciklama: 'İlk birikim ivmesi ve bileşik getiri başlangıcı' },
          { ad: 'Yarı Bağımsızlık (Lean FIRE %50)', hedefTL: kmYari, aciklama: 'Giderlerin yarısı pasif portföyden' },
          { ad: `${hedefYas} Yaş Hedef Portföyü (%100)`, hedefTL: kmTam, aciklama: `${hedefYas} yaşında tam finansal özgürlük` },
        ],
      };
    } else {
      // 2. HEDEF BÜTÇE ODAKLI HESAPLAMA (KLASİK)
      const hedef = (sayi(harcama) * 12) / swrOran;
      const ana = simuleHedefButce(sayi(birikim), sayi(tasarruf), reel, hedef);
      const senaryo25 = simuleHedefButce(sayi(birikim), sayi(tasarruf) * 1.25, reel, hedef);
      const senaryo50 = simuleHedefButce(sayi(birikim), sayi(tasarruf) * 1.5, reel, hedef);
      const senaryo100 = simuleHedefButce(sayi(birikim), sayi(tasarruf) * 2.0, reel, hedef);

      const kmGuvenlik = sayi(harcama) * 6;
      const kmEsneklik = hedef * 0.5;
      const kmTamFire = hedef;
      const kmBolluk = hedef * 1.5;

      return {
        mod: 'hedef_butce',
        reel,
        hedef,
        aylikPasifGelir: sayi(harcama),
        ana,
        senaryolar: [
          { etiket: '+%25 Tasarruf', oran: 1.25, sonuc: senaryo25 },
          { etiket: '+%50 Tasarruf', oran: 1.5, sonuc: senaryo50 },
          { etiket: '+%100 Tasarruf', oran: 2.0, sonuc: senaryo100 },
        ],
        milestones: [
          { ad: 'Finansal Güvenlik (6 Aylık Fon)', hedefTL: kmGuvenlik, aciklama: 'Temel yaşam giderleri güvencede' },
          { ad: 'Yarı Bağımsızlık (Lean FIRE %50)', hedefTL: kmEsneklik, aciklama: 'Giderlerin yarısı pasif portföyden' },
          { ad: 'Tam Finansal Özgürlük (FIRE)', hedefTL: kmTamFire, aciklama: 'Çalışma zorunluluğunun bittiği nokta' },
          { ad: 'Finansal Bolluk (Fat FIRE)', hedefTL: kmBolluk, aciklama: 'Lüks harcama ve sınırsız esneklik' },
        ],
      };
    }
  }, [hesaplamaModu, yas, hedefYas, birikim, tasarruf, harcama, getiri, enflasyon, cekim]);

  const yilMetni = (r) => {
    if (!r.ulasildi) return '50+ yıl';
    const y = Math.floor(r.ay / 12);
    const a = r.ay % 12;
    return a > 0 ? `${y} yıl ${a} ay` : `${y} yıl`;
  };

  // Plotly Grafik Verisi
  const fireGrafikVerisi = useMemo(() => {
    const noktalar = s.ana.yillikNoktalar;
    const maxX = Math.max(...noktalar.map(p => p.yil), 10);
    const hedefDeger = s.mod === 'hedef_yas' ? s.tahminiPortfoy : s.hedef;

    const data = [
      {
        x: noktalar.map(p => p.yil),
        y: noktalar.map(p => p.bakiye),
        type: 'scatter',
        mode: 'lines+markers',
        name: 'Mevcut Tasarruf Planı',
        line: { color: '#089981', width: 3 },
        fill: 'tozeroy',
        fillcolor: 'rgba(8, 153, 129, 0.12)',
        hovertemplate: s.mod === 'hedef_yas'
          ? '<b>%{x}. Yıl (Yaş: ' + sayi(yas) + ' + %{x})</b><br>Portföy: %{y:,.0f} ₺<extra></extra>'
          : '<b>%{x}. Yıl</b><br>Portföy: %{y:,.0f} ₺<extra></extra>',
      },
      {
        x: s.senaryolar[0].sonuc.yillikNoktalar.map(p => p.yil),
        y: s.senaryolar[0].sonuc.yillikNoktalar.map(p => p.bakiye),
        type: 'scatter',
        mode: 'lines',
        name: '+%25 Tasarruf',
        line: { color: '#2962FF', width: 1.5, dash: 'dot' },
      },
      {
        x: s.senaryolar[1].sonuc.yillikNoktalar.map(p => p.yil),
        y: s.senaryolar[1].sonuc.yillikNoktalar.map(p => p.bakiye),
        type: 'scatter',
        mode: 'lines',
        name: '+%50 Tasarruf',
        line: { color: '#FF9800', width: 1.5, dash: 'dash' },
      },
      {
        x: [0, maxX],
        y: [hedefDeger, hedefDeger],
        type: 'scatter',
        mode: 'lines',
        name: s.mod === 'hedef_yas' ? `${hedefYas} Yaşında Tahmini Portföy (${fmt(hedefDeger, 0)} ₺)` : `FIRE Hedefi (${fmt(hedefDeger, 0)} ₺)`,
        line: { color: '#F23645', width: 2, dash: 'longdash' },
      },
    ];

    const layout = {
      ...BIST_DARK_TEMPLATE.layout,
      title: {
        text: s.mod === 'hedef_yas'
          ? `${hedefYas} Yaşına Kadar Reel Servet Birikimi & Büyüme Eğrisi`
          : 'Reel Servet Akümülasyonu & FIRE Hedef Eğrisi (Bugünkü Reel TL)',
        font: { color: '#e6edf3', size: 14 },
      },
      height: 360,
      margin: { l: 70, r: 30, t: 40, b: 50 },
      xaxis: {
        title: s.mod === 'hedef_yas' ? `Geçen Yıl (Yaşınız: ${yas} → ${hedefYas})` : 'Geçen Yıl',
        gridcolor: '#1e222d',
        tickmode: 'linear',
        dtick: 2,
      },
      yaxis: {
        title: 'Reel Portföy Tutarı (₺)',
        gridcolor: '#1e222d',
        tickformat: ',.0f',
      },
      legend: { orientation: 'h', y: -0.22 },
    };

    return { data, layout };
  }, [s, yas, hedefYas]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Üst Başlık & Cockpit */}
      <div className="panel" style={{ padding: 14, background: '#131722', border: '1px solid #2a2e39', borderRadius: 8 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 22, color: '#089981' }}>🎯</span>
            <div>
              <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: '#f0f3fa' }}>
                Finansal Özgürlük & Emeklilik Simülatörü
              </h3>
              <p style={{ margin: 0, fontSize: 12, color: '#787b86' }}>
                Enflasyondan arındırılmış reel portföy büyümesi ve hedef yaşta güvenli pasif gelir hesaplayıcısı
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 12, background: 'rgba(8, 153, 129, 0.15)', color: '#089981', padding: '4px 10px', borderRadius: 6, fontWeight: 600 }}>
              Reel Net Getiri: %{fmt(s.reel * 100, 1)} / yıl
            </span>
          </div>
        </div>
      </div>

      {/* Cockpit Metrik Kartları */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12 }}>
        {/* Kart 1: Tahmini Portföy Büyüklüğü */}
        <div className="panel" style={{ padding: 14, background: '#131722', border: '1px solid #2a2e39', borderRadius: 8, borderTop: '3px solid #089981' }}>
          <div style={{ fontSize: 11, color: '#787b86', textTransform: 'uppercase', fontWeight: 600 }}>
            {s.mod === 'hedef_yas' ? `${hedefYas} Yaşında Tahmini Portföy` : 'Gereken FIRE Portföyü'}
          </div>
          <div style={{ fontSize: 24, fontWeight: 700, color: '#FFFFFF', marginTop: 4, fontFamily: 'JetBrains Mono' }}>
            {s.mod === 'hedef_yas' ? `${fmt(s.tahminiPortfoy, 0)} ₺` : `${fmt(s.hedef, 0)} ₺`}
          </div>
          <div style={{ fontSize: 11.5, color: '#787b86', marginTop: 4 }}>
            {s.mod === 'hedef_yas' ? 'Bugünkü alım gücüyle birikecek reel servet' : 'Bugünkü alım gücüyle 25 yıllık harcama'}
          </div>
        </div>

        {/* Kart 2: Aylık Güvenli Pasif Gelir */}
        <div className="panel" style={{ padding: 14, background: '#131722', border: '1px solid #2a2e39', borderRadius: 8, borderTop: '3px solid #2962FF' }}>
          <div style={{ fontSize: 11, color: '#787b86', textTransform: 'uppercase', fontWeight: 600 }}>
            {s.mod === 'hedef_yas' ? `${hedefYas} Yaşında Aylık Maaş / Gelir` : 'Aylık Pasif Gelir Hedefi'}
          </div>
          <div style={{ fontSize: 24, fontWeight: 700, color: '#5B8DEF', marginTop: 4, fontFamily: 'JetBrains Mono' }}>
            {fmt(s.aylikPasifGelir, 0)} ₺ / ay
          </div>
          <div style={{ fontSize: 11.5, color: '#787b86', marginTop: 4 }}>
            %{cekim} güvenli çekimle (SWR) anapara erimeden
          </div>
        </div>

        {/* Kart 3: Hedefe Kalan Süre */}
        <div className="panel" style={{ padding: 14, background: '#131722', border: '1px solid #2a2e39', borderRadius: 8, borderTop: '3px solid #D7FF4E' }}>
          <div style={{ fontSize: 11, color: '#787b86', textTransform: 'uppercase', fontWeight: 600 }}>
            Hedefe Kalan Süre
          </div>
          <div style={{ fontSize: 24, fontWeight: 700, color: '#D7FF4E', marginTop: 4, fontFamily: 'JetBrains Mono' }}>
            {s.mod === 'hedef_yas' ? `${s.kalanYil} Yıl` : yilMetni(s.ana)}
          </div>
          <div style={{ fontSize: 11.5, color: '#d1d4dc', marginTop: 4 }}>
            {s.mod === 'hedef_yas'
              ? `${yas} yaşından ${hedefYas} yaşına birikim süreci`
              : (s.ana.ulasildi ? `${sayi(yas) + Math.ceil(s.ana.ay / 12)} yaşında finansal özgür` : 'Varsayımları güncelleyin')}
          </div>
        </div>

        {/* Kart 4: Yıllık Tasarruf Gücü */}
        <div className="panel" style={{ padding: 14, background: '#131722', border: '1px solid #2a2e39', borderRadius: 8, borderTop: '3px solid #FF9800' }}>
          <div style={{ fontSize: 11, color: '#787b86', textTransform: 'uppercase', fontWeight: 600 }}>
            Yıllık Tasarruf Gücü
          </div>
          <div style={{ fontSize: 24, fontWeight: 700, color: '#FF9800', marginTop: 4, fontFamily: 'JetBrains Mono' }}>
            {fmt(sayi(tasarruf) * 12, 0)} ₺
          </div>
          <div style={{ fontSize: 11.5, color: '#787b86', marginTop: 4 }}>
            Ayda {fmt(tasarruf, 0)} ₺ düzenli reel birikim
          </div>
        </div>
      </div>

      {/* Ana Çalışma Alanı: Parametreler + Grafik */}
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(330px, 390px) 1fr', gap: 16 }}>
        {/* Parametreler Paneli */}
        <div className="panel" style={{ padding: 16, background: '#131722', border: '1px solid #2a2e39', borderRadius: 8, display: 'flex', flexDirection: 'column', gap: 14 }}>
          {/* Hesaplama Modu Seçici */}
          <div>
            <label style={{ fontSize: 11, color: '#787b86', textTransform: 'uppercase', marginBottom: 6, display: 'block', fontWeight: 600 }}>
              Hesaplama Yaklaşımı:
            </label>
            <div className="segment">
              <button
                className={hesaplamaModu === 'hedef_yas' ? 'aktif' : ''}
                onClick={() => setHesaplamaModu('hedef_yas')}
                style={{ fontSize: 12 }}
              >
                🎯 Hedef Yaş Belirle
              </button>
              <button
                className={hesaplamaModu === 'hedef_butce' ? 'aktif' : ''}
                onClick={() => setHesaplamaModu('hedef_butce')}
                style={{ fontSize: 12 }}
              >
                💰 Hedef Bütçe Belirle
              </button>
            </div>
          </div>

          {/* Yaş Ayarları */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <div>
              <label style={{ fontSize: 11, color: '#787b86' }}>Mevcut Yaşınız</label>
              <input
                type="number"
                min="18"
                max="90"
                value={yas}
                onChange={e => {
                  const val = Number(e.target.value);
                  setYas(val);
                  if (val >= hedefYas) setHedefYas(val + 5);
                }}
                style={{ width: '100%', marginTop: 4, fontFamily: 'JetBrains Mono', fontWeight: 600 }}
              />
            </div>

            {hesaplamaModu === 'hedef_yas' ? (
              <div>
                <label style={{ fontSize: 11, color: '#D7FF4E', fontWeight: 600 }}>Hedef Yaşınız (Emeklilik)</label>
                <input
                  type="number"
                  min={sayi(yas) + 1}
                  max="95"
                  value={hedefYas}
                  onChange={e => setHedefYas(Math.max(sayi(yas) + 1, Number(e.target.value)))}
                  style={{ width: '100%', marginTop: 4, fontFamily: 'JetBrains Mono', fontWeight: 700, borderColor: '#D7FF4E' }}
                />
              </div>
            ) : (
              <div>
                <label style={{ fontSize: 11, color: '#787b86' }}>Güvenli Çekim %</label>
                <input
                  type="number"
                  step="0.25"
                  min="2"
                  max="10"
                  value={cekim}
                  onChange={e => setCekim(e.target.value)}
                  style={{ width: '100%', marginTop: 4, fontFamily: 'JetBrains Mono' }}
                />
              </div>
            )}
          </div>

          {/* Hızlı Hedef Yaş Çipleri (Hedef Yaş Modunda) */}
          {hesaplamaModu === 'hedef_yas' && (
            <div>
              <span style={{ fontSize: 11, color: '#787b86', display: 'block', marginBottom: 4 }}>Hızlı Yaş Seçimi:</span>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {[40, 45, 50, 55, 60].filter(y => y > sayi(yas)).map(y => (
                  <button
                    key={y}
                    className={`hisse-hizli-chip ${hedefYas === y ? 'aktif' : ''}`}
                    onClick={() => setHedefYas(y)}
                    style={{ fontSize: 11, padding: '3px 8px' }}
                  >
                    {y} Yaşında ({y - sayi(yas)} yıl)
                  </button>
                ))}
              </div>
            </div>
          )}

          <div>
            <label style={{ fontSize: 11, color: '#787b86' }}>Mevcut Portföy / Başlangıç Birikimi (₺)</label>
            <input
              type="number"
              step="10000"
              min="0"
              value={birikim}
              onChange={e => setBirikim(e.target.value)}
              style={{ width: '100%', marginTop: 4, fontFamily: 'JetBrains Mono' }}
            />
          </div>

          <div>
            <label style={{ fontSize: 11, color: '#787b86' }}>Aylık Düzenli Tasarruf (Bugünkü ₺)</label>
            <input
              type="number"
              step="1000"
              min="0"
              value={tasarruf}
              onChange={e => setTasarruf(e.target.value)}
              style={{ width: '100%', marginTop: 4, fontFamily: 'JetBrains Mono' }}
            />
          </div>

          {hesaplamaModu === 'hedef_yas' ? (
            <div>
              <label style={{ fontSize: 11, color: '#787b86' }}>Güvenli Çekim Oranı (SWR %)</label>
              <input
                type="number"
                step="0.25"
                min="2"
                max="10"
                value={cekim}
                onChange={e => setCekim(e.target.value)}
                style={{ width: '100%', marginTop: 4, fontFamily: 'JetBrains Mono' }}
              />
              <span style={{ fontSize: 11, color: '#787b86', display: 'block', marginTop: 2 }}>
                Öneri: %4 Trinity kuralı (portföyün ömür boyu tükenmemesini sağlar)
              </span>
            </div>
          ) : (
            <div>
              <label style={{ fontSize: 11, color: '#787b86' }}>Emeklilikte İstenen Aylık Bütçe (₺)</label>
              <input
                type="number"
                step="2500"
                min="1000"
                value={harcama}
                onChange={e => setHarcama(e.target.value)}
                style={{ width: '100%', marginTop: 4, fontFamily: 'JetBrains Mono' }}
              />
            </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <div>
              <label style={{ fontSize: 11, color: '#787b86' }}>Yıllık Portföy Getirisi (%)</label>
              <input
                type="number"
                step="1"
                value={getiri}
                onChange={e => setGetiri(e.target.value)}
                style={{ width: '100%', marginTop: 4, fontFamily: 'JetBrains Mono' }}
              />
            </div>
            <div>
              <label style={{ fontSize: 11, color: '#787b86' }}>Beklenen Enflasyon (%)</label>
              <input
                type="number"
                step="1"
                value={enflasyon}
                onChange={e => setEnflasyon(e.target.value)}
                style={{ width: '100%', marginTop: 4, fontFamily: 'JetBrains Mono' }}
              />
            </div>
          </div>

          <div style={{ padding: 12, background: 'rgba(8, 153, 129, 0.08)', border: '1px solid rgba(8, 153, 129, 0.2)', borderRadius: 6, fontSize: 12, color: '#d1d4dc' }}>
            💡 <b>Hedef Yaş Mantığı:</b> {hesaplamaModu === 'hedef_yas'
              ? `${sayi(yas)} yaşından ${sayi(hedefYas)} yaşına kadar her ay ${fmt(tasarruf, 0)} ₺ biriktirip yıllık net %${fmt(s.reel * 100, 1)} reel getiri sağladığınızda portföyünüzün büyüyeceği tahmini büyüklük hesaplanır.`
              : 'İstediğiniz aylık pasif bütçeyi sağlayabilmek için kaç milyon ₺ portföy gerektiği ve bu hedefe kaç yılda ulaşılacağı hesaplanır.'}
          </div>
        </div>

        {/* Grafik & Senaryolar */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div className="panel" style={{ padding: 12, background: '#131722', border: '1px solid #2a2e39', borderRadius: 8 }}>
            <PlotlyGrafik data={fireGrafikVerisi.data} layout={fireGrafikVerisi.layout} />
          </div>

          {/* Tasarruf Hızlandırma Karşılaştırması */}
          <div className="panel" style={{ padding: 0, background: '#131722', border: '1px solid #2a2e39', borderRadius: 8, overflow: 'hidden' }}>
            <div style={{ padding: '10px 14px', borderBottom: '1px solid #2a2e39', fontWeight: 600, fontSize: 13, color: '#f0f3fa' }}>
              {hesaplamaModu === 'hedef_yas'
                ? `⚡ Tasarrufu Artırırsanız ${hedefYas} Yaşında Ne Kadar Ek Portföy Kazanırsınız?`
                : '⚡ Tasarrufu Artırarak Kaç Yıl Kazanırsınız?'}
            </div>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead>
                  <tr style={{ background: '#1e222d', color: '#787b86', textAlign: 'left' }}>
                    <th style={{ padding: '8px 12px' }}>Senaryo</th>
                    <th style={{ padding: '8px 12px' }}>Aylık Tasarruf</th>
                    <th style={{ padding: '8px 12px' }}>
                      {hesaplamaModu === 'hedef_yas' ? `${hedefYas} Yaşında Portföy` : 'Hedefe Ulaşma Süresi'}
                    </th>
                    <th style={{ padding: '8px 12px' }}>
                      {hesaplamaModu === 'hedef_yas' ? 'Aylık Pasif Gelir (Maaş)' : 'Kazanılan Zaman'}
                    </th>
                    {hesaplamaModu === 'hedef_yas' && (
                      <th style={{ padding: '8px 12px' }}>Ekstra Kazanç</th>
                    )}
                  </tr>
                </thead>
                <tbody>
                  <tr style={{ borderBottom: '1px solid #1e222d' }}>
                    <td style={{ padding: '8px 12px', fontWeight: 600, color: '#089981' }}>Mevcut Plan</td>
                    <td style={{ padding: '8px 12px', fontFamily: 'monospace' }}>{fmt(tasarruf, 0)} ₺</td>
                    <td style={{ padding: '8px 12px', fontWeight: 700, color: '#FFFFFF' }}>
                      {hesaplamaModu === 'hedef_yas' ? `${fmt(s.tahminiPortfoy, 0)} ₺` : yilMetni(s.ana)}
                    </td>
                    <td style={{ padding: '8px 12px', color: '#2962FF', fontWeight: 700 }}>
                      {hesaplamaModu === 'hedef_yas' ? `${fmt(s.aylikPasifGelir, 0)} ₺ / ay` : 'Referans'}
                    </td>
                    {hesaplamaModu === 'hedef_yas' && (
                      <td style={{ padding: '8px 12px', color: '#787b86' }}>Referans Plan</td>
                    )}
                  </tr>
                  {s.senaryolar.map(sc => {
                    if (hesaplamaModu === 'hedef_yas') {
                      const portfoyFark = sc.sonuc.tahminiPortfoy - s.tahminiPortfoy;
                      return (
                        <tr key={sc.etiket} style={{ borderBottom: '1px solid #1e222d' }}>
                          <td style={{ padding: '8px 12px', fontWeight: 600, color: '#2962FF' }}>{sc.etiket}</td>
                          <td style={{ padding: '8px 12px', fontFamily: 'monospace' }}>{fmt(sayi(tasarruf) * sc.oran, 0)} ₺</td>
                          <td style={{ padding: '8px 12px', fontWeight: 700, color: '#FFFFFF' }}>
                            {fmt(sc.sonuc.tahminiPortfoy, 0)} ₺
                          </td>
                          <td style={{ padding: '8px 12px', color: '#089981', fontWeight: 700 }}>
                            {fmt(sc.aylikGelir, 0)} ₺ / ay
                          </td>
                          <td style={{ padding: '8px 12px', color: '#089981', fontWeight: 600 }}>
                            +{fmt(portfoyFark, 0)} ₺ ek servet
                          </td>
                        </tr>
                      );
                    } else {
                      const ayFarki = s.ana.ay - sc.sonuc.ay;
                      const kazancYil = Math.floor(ayFarki / 12);
                      const kazancAy = ayFarki % 12;
                      return (
                        <tr key={sc.etiket} style={{ borderBottom: '1px solid #1e222d' }}>
                          <td style={{ padding: '8px 12px', fontWeight: 600, color: '#2962FF' }}>{sc.etiket}</td>
                          <td style={{ padding: '8px 12px', fontFamily: 'monospace' }}>{fmt(sayi(tasarruf) * sc.oran, 0)} ₺</td>
                          <td style={{ padding: '8px 12px', fontWeight: 600 }}>{yilMetni(sc.sonuc)}</td>
                          <td style={{ padding: '8px 12px', color: '#089981', fontWeight: 600 }}>
                            {ayFarki > 0 ? `🚀 ${kazancYil > 0 ? `${kazancYil} yıl ` : ''}${kazancAy} ay erken` : '—'}
                          </td>
                        </tr>
                      );
                    }
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {/* Kilometre Taşları (Milestones) */}
      <div className="panel" style={{ padding: 14, background: '#131722', border: '1px solid #2a2e39', borderRadius: 8 }}>
        <h4 style={{ margin: '0 0 12px 0', fontSize: 14, color: '#f0f3fa' }}>
          🏆 {hesaplamaModu === 'hedef_yas' ? `${hedefYas} Yaşına Giden Yolculuk Kilometre Taşları` : 'Finansal Yolculuk Kilometre Taşları'}
        </h4>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12 }}>
          {s.milestones.map((km, idx) => {
            const tamam = sayi(birikim) >= km.hedefTL;
            const yuzde = km.hedefTL > 0 ? Math.min(100, Math.round((sayi(birikim) / km.hedefTL) * 100)) : 100;
            return (
              <div key={idx} style={{ padding: 12, background: '#1e222d', border: `1px solid ${tamam ? '#089981' : '#2a2e39'}`, borderRadius: 6 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: 12, fontWeight: 600, color: tamam ? '#089981' : '#f0f3fa' }}>{km.ad}</span>
                  {tamam ? <span style={{ color: '#089981', fontSize: 12 }}>✓ Tamam</span> : <span style={{ color: '#787b86', fontSize: 11 }}>%{yuzde}</span>}
                </div>
                <div style={{ fontSize: 16, fontWeight: 700, color: '#d1d4dc', margin: '6px 0', fontFamily: 'JetBrains Mono' }}>
                  {fmt(km.hedefTL, 0)} ₺
                </div>
                <div style={{ height: 4, background: '#2a2e39', borderRadius: 2, overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${yuzde}%`, background: tamam ? '#089981' : '#2962FF' }} />
                </div>
                <div style={{ fontSize: 11, color: '#787b86', marginTop: 6 }}>{km.aciklama}</div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

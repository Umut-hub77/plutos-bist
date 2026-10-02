import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { fmt, Tutar } from '../lib/format.jsx';
import { useTickers } from '../lib/useTickers.js';
import { useAyar } from '../ayarlar.jsx';

export default function EmirVer({ api, onModulDegistir, bildirimYenile }) {
  const { portfoyDegisti } = useAyar();
  const t = useTickers(api);
  const [hisse, setHisse] = useState('THYAO');
  const [yon, setYon] = useState('AL');
  const [tip, setTip] = useState('Limit');
  const [lot, setLot] = useState(50);
  const [limit, setLimit] = useState('');
  const [piyasaFiyat, setPiyasaFiyat] = useState(null);
  const [mesaj, setMesaj] = useState(null);
  const [islemler, setIslemler] = useState([]);
  const [bakiye, setBakiye] = useState(null);
  const [bekle, setBekle] = useState(false);
  const [derinlik, setDerinlik] = useState(null);
  const [pozisyon, setPozisyon] = useState(null);

  const fiyatVeDerinlikGetir = useCallback(async (sembol) => {
    try {
      const [f, d, p] = await Promise.all([
        api(`/api/price/${sembol.trim().toUpperCase()}`).catch(() => null),
        api(`/api/depth/${sembol.trim().toUpperCase()}`).catch(() => null),
        api('/api/portfolio').catch(() => null),
      ]);
      if (f?.fiyat) {
        setPiyasaFiyat(f.fiyat);
        if (!limit) setLimit(f.fiyat);
      }
      if (d) setDerinlik(d);
      if (p) {
        setBakiye(p.virtual_cash);
        const poz = p.portfolio?.[sembol.toUpperCase()] || p.pozisyonlar?.find(x => x.hisse === sembol.toUpperCase()) || null;
        setPozisyon(poz);
      }
    } catch {
      /* sessiz */
    }
  }, [api, limit]);

  const gecmisYukle = useCallback(async () => {
    try {
      const r = await api('/api/trades');
      setIslemler(r.trade_log || []);
    } catch {
      /* sessiz */
    }
  }, [api]);

  // URL Hash parametrelerini okuma (Örn: #emir?hisse=ASELS&yon=AL)
  useEffect(() => {
    const parseHash = () => {
      const h = window.location.hash;
      if (h.includes('hisse=')) {
        const kod = h.split('hisse=')[1]?.split('&')[0]?.toUpperCase();
        if (kod && kod !== hisse) setHisse(kod);
      }
      if (h.includes('yon=')) {
        const y = h.split('yon=')[1]?.split('&')[0]?.toUpperCase();
        if (y === 'AL' || y === 'SAT') setYon(y);
      }
    };
    parseHash();
    window.addEventListener('hashchange', parseHash);
    return () => window.removeEventListener('hashchange', parseHash);
  }, [hisse]);

  useEffect(() => {
    fiyatVeDerinlikGetir(hisse);
    gecmisYukle();
  }, [hisse, fiyatVeDerinlikGetir, gecmisYukle]);

  const fiyataTikla = (f) => {
    setLimit(f);
    setTip('Limit');
  };

  const gonder = async () => {
    setMesaj(null);
    const fiyat = tip === 'Piyasa' ? piyasaFiyat : parseFloat(limit);
    if (!fiyat || isNaN(fiyat) || fiyat <= 0) {
      setMesaj({ tur: 'hata', metin: 'Lütfen geçerli bir işlem fiyatı belirleyin.' });
      return;
    }
    const lotMiktari = parseInt(lot, 10);
    if (!lotMiktari || lotMiktari <= 0) {
      setMesaj({ tur: 'hata', metin: 'Lot adedi en az 1 olmalıdır.' });
      return;
    }

    setBekle(true);
    try {
      const r = await api('/api/order', {
        method: 'POST',
        govde: { hisse: hisse.toUpperCase(), yon, lot: lotMiktari, fiyat },
      });
      setBakiye(r.virtual_cash);
      setIslemler(r.trade_log);
      setMesaj({
        tur: 'ok',
        metin: `BIST Emri Gerçekleşti: ${lotMiktari} Lot ${hisse.toUpperCase()} ${yon} @ ${fmt(fiyat)} ₺`,
      });
      fiyatVeDerinlikGetir(hisse);
      bildirimYenile?.();
      portfoyDegisti?.();
    } catch (e) {
      setMesaj({ tur: 'hata', metin: e.message || 'Emir iletilemedi.' });
    } finally {
      setBekle(false);
    }
  };

  const aktifFiyat = tip === 'Piyasa' ? (piyasaFiyat || 0) : (parseFloat(limit) || piyasaFiyat || 0);
  const islemTutari = aktifFiyat * (parseInt(lot, 10) || 0);
  const komisyonTutari = islemTutari * 0.0015;
  const toplamTutar = yon === 'AL' ? islemTutari + komisyonTutari : islemTutari - komisyonTutari;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* 1. ÜST HİSSE VE PİYASA BİLGİ ŞERİDİ */}
      <div className="kurumsal-kart" style={{ padding: 14 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ minWidth: 160 }}>
              <select
                value={hisse}
                onChange={e => {
                  setHisse(e.target.value.toUpperCase());
                  setLimit('');
                  setPiyasaFiyat(null);
                }}
                style={{
                  background: '#1E222D',
                  border: '1.5px solid #2962FF',
                  color: '#FFFFFF',
                  fontWeight: 700,
                  fontSize: 15,
                  padding: '8px 12px',
                  borderRadius: 6,
                }}
              >
                {(t?.tickers || [hisse]).map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <span style={{ fontSize: 18, fontWeight: 700, color: '#FFFFFF', fontFamily: 'Space Grotesk' }}>
                {hisse} • {piyasaFiyat ? fmt(piyasaFiyat) + ' ₺' : 'Fiyat Alınıyor…'}
              </span>
              <span style={{ fontSize: 11, color: '#787B86' }}>BIST Pay Piyasası • Yıldız Pazar</span>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <button
              className="arac-btn aktif"
              onClick={() => onModulDegistir?.('Analiz', 'Stratejik Analiz')}
              style={{ fontSize: 12 }}
            >
              📊 Stratejik Grafik Masasını Aç
            </button>
            <div className="seans-durum-rozet">🟢 Seans Açık</div>
          </div>
        </div>
      </div>

      {/* 2. İKİ KOLONLU İŞLEM MASASI: SOL EMİR BİLETİ - SAĞ 5K DERİNLİK */}
      <div className="terminal-iki-kolon">
        {/* SOL: EMİR GİRİŞ FORMU */}
        <div className="kurumsal-kart" style={{ flex: 1.3, padding: 20 }}>
          <div className="emir-yon-secici" style={{ marginBottom: 14 }}>
            <button
              className={`emir-yon-btn alis ${yon === 'AL' ? 'aktif' : ''}`}
              onClick={() => setYon('AL')}
            >
              ALIŞ (BUY)
            </button>
            <button
              className={`emir-yon-btn satis ${yon === 'SAT' ? 'aktif' : ''}`}
              onClick={() => setYon('SAT')}
            >
              SATIŞ (SELL)
            </button>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
            <div className="emir-alan-grup">
              <label>Emir Tipi</label>
              <div className="segment" style={{ marginTop: 2 }}>
                {['Piyasa', 'Limit', 'Zarar Durdur'].map(tp => (
                  <button key={tp} className={tip === tp ? 'aktif' : ''} onClick={() => setTip(tp)}>
                    {tp}
                  </button>
                ))}
              </div>
            </div>

            <div className="emir-alan-grup">
              <label>{tip === 'Piyasa' ? 'Piyasa Fiyatı' : 'Limit Fiyat (₺)'}</label>
              <div className="emir-input-wrap">
                <input
                  type="number"
                  step="0.05"
                  disabled={tip === 'Piyasa'}
                  value={tip === 'Piyasa' ? (piyasaFiyat || '') : limit}
                  onChange={e => setLimit(e.target.value)}
                  placeholder={String(piyasaFiyat || '')}
                />
                <span className="birim">₺</span>
              </div>
            </div>
          </div>

          <div className="emir-alan-grup" style={{ marginBottom: 14 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <label>Lot Miktarı</label>
              {pozisyon && (
                <span style={{ fontSize: 11, color: '#787B86' }}>
                  Elinizdeki: <b style={{ color: '#FFFFFF' }}>{pozisyon.lot} Lot</b> (Maliyet: {fmt(pozisyon.maliyet)} ₺)
                </span>
              )}
            </div>
            <div className="emir-input-wrap">
              <input
                type="number"
                min="1"
                value={lot}
                onChange={e => setLot(e.target.value)}
              />
              <span className="birim">LOT</span>
            </div>
            <div className="lot-hizli-butonlar" style={{ marginTop: 6 }}>
              {[10, 50, 100, 250, 500, 1000].map(adet => (
                <button key={adet} className="lot-hizli-btn" onClick={() => setLot(adet)}>
                  +{adet}
                </button>
              ))}
              <button
                className="lot-hizli-btn"
                style={{ color: '#D7FF4E' }}
                onClick={() => {
                  if (yon === 'AL' && aktifFiyat > 0 && bakiye > 0) {
                    setLot(Math.max(1, Math.floor(bakiye / aktifFiyat)));
                  } else if (yon === 'SAT' && pozisyon?.lot) {
                    setLot(pozisyon.lot);
                  }
                }}
              >
                Max
              </button>
            </div>
          </div>

          {/* Hesap Özeti */}
          <div className="emir-ozet-kutusu" style={{ marginBottom: 14 }}>
            <div className="emir-ozet-satir">
              <span>İşlem Tutarı:</span>
              <span className="deger">{fmt(islemTutari)} ₺</span>
            </div>
            <div className="emir-ozet-satir">
              <span>BIST Borsa Payı ve Komisyon (%0.15):</span>
              <span className="deger">{fmt(komisyonTutari)} ₺</span>
            </div>
            <div className="emir-ozet-satir toplam">
              <span>Net {yon === 'AL' ? 'Ödenecek' : 'Hesaba Geçecek'} Tutar:</span>
              <span className="deger">{fmt(toplamTutar)} ₺</span>
            </div>
          </div>

          <button
            className={`emir-gonder-btn ${yon === 'AL' ? 'alis' : 'satis'}`}
            onClick={gonder}
            disabled={bekle}
            style={{ fontSize: 15 }}
          >
            {bekle ? 'BIST İletiliyor…' : `BIST ${hisse} ${yon} EMRİ GÖNDER`}
          </button>

          {mesaj && (
            <div className={mesaj.tur === 'ok' ? 'ok-msg' : 'error-msg'} style={{ marginTop: 10 }}>
              {mesaj.tur === 'ok' ? '✅ ' : '⚠️ '} {mesaj.metin}
            </div>
          )}

          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11.5, color: '#787B86', marginTop: 12, paddingTop: 10, borderTop: '1px solid #1E222D' }}>
            <span>Kullanılabilir Sanal Bakiye: <b style={{ color: '#FFFFFF', fontFamily: 'JetBrains Mono' }}>{fmt(bakiye, 0)} ₺</b></span>
            <span>Mod: <b style={{ color: '#089981' }}>Demo BIST İşlem Masası</b></span>
          </div>
        </div>

        {/* SAĞ: 5 KADEME BIST LEVEL 2 DERİNLİK */}
        <div className="kurumsal-kart" style={{ flex: 1, padding: 18 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
            <h4 style={{ color: '#FFFFFF', margin: 0 }}>📑 5 Kademe Derinlik Tablosu</h4>
            <span style={{ fontSize: 11, color: '#787B86' }}>Makas: {fmt(derinlik?.spread ?? 0.05)} ₺</span>
          </div>

          <div className="derinlik-guc-bar" style={{ marginBottom: 10 }}>
            <div className="guc-alici" style={{ width: `${derinlik?.alici_orani ?? 50}%` }} />
            <div className="guc-satici" style={{ width: `${derinlik?.satici_orani ?? 50}%` }} />
          </div>

          <div className="derinlik-tablo-wrap">
            <div>
              <div className="derinlik-taraf-baslik alis">ALIŞ</div>
              {(derinlik?.alislar || []).map(b => (
                <div key={b.kademe} className="derinlik-satir alis" onClick={() => fiyataTikla(b.fiyat)} title="Fiyatı emre aktar">
                  <div className="derinlik-bar-arkaplan" style={{ width: `${b.yuzde}%` }} />
                  <span className="emir">{b.emir}e</span>
                  <span className="lot">{fmt(b.lot, 0)}</span>
                  <span className="fiyat">{fmt(b.fiyat)}</span>
                </div>
              ))}
            </div>
            <div>
              <div className="derinlik-taraf-baslik satis">SATIŞ</div>
              {(derinlik?.satislar || []).map(a => (
                <div key={a.kademe} className="derinlik-satir satis" onClick={() => fiyataTikla(a.fiyat)} title="Fiyatı emre aktar">
                  <div className="derinlik-bar-arkaplan" style={{ width: `${a.yuzde}%` }} />
                  <span className="fiyat">{fmt(a.fiyat)}</span>
                  <span className="lot">{fmt(a.lot, 0)}</span>
                  <span className="emir">{a.emir}e</span>
                </div>
              ))}
            </div>
          </div>

          <p style={{ fontSize: 11, color: '#787B86', marginTop: 12 }}>
            💡 İpucu: Herhangi bir derinlik kademesine tıkladığınızda emir limit fiyatı otomatik olarak o kademeyle doldurulur.
          </p>
        </div>
      </div>

      {/* 3. GERÇEKLEŞEN İŞLEMLER VE EMİR GEÇMİŞİ */}
      <div className="kurumsal-kart" style={{ padding: 18 }}>
        <h4 style={{ color: '#FFFFFF', margin: '0 0 12px' }}>⏱️ Son Gerçekleşen Emir Geçmişi</h4>
        <div style={{ overflowX: 'auto' }}>
          <table>
            <thead>
              <tr>
                <th>Zaman</th>
                <th>Hisse</th>
                <th>Yön</th>
                <th>Lot</th>
                <th>İşlem Fiyatı</th>
                <th>Toplam Tutar</th>
                <th>Durum</th>
              </tr>
            </thead>
            <tbody>
              {islemler.length ? (
                islemler.slice(0, 15).map((islem, idx) => (
                  <tr key={idx}>
                    <td style={{ color: '#787B86' }}>{islem.zaman}</td>
                    <td style={{ fontWeight: 700, color: '#FFFFFF' }}>{islem.hisse}</td>
                    <td>
                      <span className={islem.yon === 'AL' ? 'rozet-al' : 'rozet-sat'}>
                        {islem.yon}
                      </span>
                    </td>
                    <td style={{ fontWeight: 600 }}>{fmt(islem.lot, 0)}</td>
                    <td>{fmt(islem.fiyat)} ₺</td>
                    <td style={{ fontWeight: 700, color: '#FFFFFF' }}>{fmt(islem.tutar)} ₺</td>
                    <td><span className="rozet tetik">Gerçekleşti</span></td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="empty-hint" style={{ padding: 20, textAlign: 'center' }}>
                    Henüz gerçekleşmiş bir demo işlem kaydı bulunmuyor.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

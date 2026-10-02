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
  const [bekleyenler, setBekleyenler] = useState([]);
  const [bakiye, setBakiye] = useState(null);
  const [blokeBakiye, setBlokeBakiye] = useState(0);
  const [bekle, setBekle] = useState(false);
  const [derinlik, setDerinlik] = useState(null);
  const [pozisyon, setPozisyon] = useState(null);
  const [accountMode, setAccountMode] = useState('demo');
  const [bagliBanka, setBagliBanka] = useState('');
  const [aktifTab, setAktifTab] = useState('bekleyen'); // 'bekleyen' | 'gecmis'

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
        setBlokeBakiye(p.blocked_cash || 0);
        setBekleyenler(p.pending_orders || []);
        setAccountMode(p.account_mode || 'demo');
        setBagliBanka(p.real_bank || '');
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

  const demoModaGec = async () => {
    try {
      await api('/api/account/switch-mode', { method: 'POST', govde: { mode: 'demo' } });
      setAccountMode('demo');
      fiyatVeDerinlikGetir(hisse);
      bildirimYenile?.();
      portfoyDegisti?.();
    } catch {
      /* sessiz */
    }
  };

  const gonder = async () => {
    setMesaj(null);
    if (accountMode === 'real') {
      setMesaj({
        tur: 'hata',
        metin: 'Gerçek hesap güvenliği gereği emir gönderimi kapalıdır. Lütfen Demo Hesaba geçiniz.',
      });
      return;
    }

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
        govde: {
          hisse: hisse.toUpperCase(),
          yon,
          lot: lotMiktari,
          fiyat,
          tip: tip === 'Piyasa' ? 'Piyasa' : 'Limit',
          hesap_turu: accountMode,
        },
      });
      setBakiye(r.virtual_cash);
      setBlokeBakiye(r.blocked_cash || 0);
      setBekleyenler(r.pending_orders || []);
      setIslemler(r.trade_log || []);
      setMesaj({
        tur: 'ok',
        metin: r.mesaj || `BIST Emri İşlendi: ${lotMiktari} Lot ${hisse.toUpperCase()} ${yon} @ ${fmt(fiyat)} ₺`,
      });
      fiyatVeDerinlikGetir(hisse);
      gecmisYukle();
      bildirimYenile?.();
      portfoyDegisti?.();
    } catch (e) {
      setMesaj({ tur: 'hata', metin: e.message || 'Emir iletilemedi.' });
    } finally {
      setBekle(false);
    }
  };

  const emirIptalEt = async (orderId) => {
    try {
      const r = await api(`/api/order/cancel/${orderId}`, { method: 'POST' });
      setBakiye(r.virtual_cash);
      setBlokeBakiye(r.blocked_cash || 0);
      setBekleyenler(r.pending_orders || []);
      setMesaj({ tur: 'ok', metin: r.mesaj || 'Limit emri başarıyla iptal edildi.' });
      gecmisYukle();
      fiyatVeDerinlikGetir(hisse);
      bildirimYenile?.();
      portfoyDegisti?.();
    } catch (e) {
      setMesaj({ tur: 'hata', metin: e.message || 'Emir iptal edilemedi.' });
    }
  };

  const aktifFiyat = tip === 'Piyasa' ? (piyasaFiyat || 0) : (parseFloat(limit) || piyasaFiyat || 0);
  const islemTutari = aktifFiyat * (parseInt(lot, 10) || 0);
  const komisyonTutari = islemTutari * 0.0015;
  const toplamTutar = yon === 'AL' ? islemTutari + komisyonTutari : islemTutari - komisyonTutari;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* 1. GERÇEK HESAP SALT OKUNUR UYARI ŞERİDİ */}
      {accountMode === 'real' && (
        <div
          style={{
            background: 'rgba(255, 152, 0, 0.1)',
            border: '1.5px solid rgba(255, 152, 0, 0.4)',
            borderRadius: 8,
            padding: '12px 18px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: 12,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{ fontSize: 24 }}>🔒</span>
            <div>
              <div style={{ color: '#FFFFFF', fontWeight: 700, fontSize: 14 }}>
                Gerçek Banka Hesabı Aktif: <span style={{ color: '#FF9800' }}>{bagliBanka || 'Banka'} (Salt Okunur İzleme Modu)</span>
              </div>
              <div style={{ fontSize: 12, color: '#B2B5BE' }}>
                SPK ve Açık Bankacılık protokolleri uyarınca bu arayüzden doğrudan gerçek emir iletilemez. Alım/satım denemeleri için Demo Hesaba geçiniz.
              </div>
            </div>
          </div>
          <button
            className="arac-btn aktif"
            onClick={demoModaGec}
            style={{ padding: '8px 16px', fontSize: 12.5, fontWeight: 700, background: '#2962FF', borderColor: '#2962FF' }}
          >
            🎮 Demo Hesaba Geç ve İşlem Yap
          </button>
        </div>
      )}

      {/* 2. ÜST HİSSE VE PİYASA BİLGİ ŞERİDİ */}
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
                  padding: '7px 12px',
                  borderRadius: 6,
                  width: '100%',
                  fontFamily: 'JetBrains Mono, monospace',
                }}
              >
                {t.tickers.map(s => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>
            <div>
              <div style={{ fontSize: 11, color: '#787B86', textTransform: 'uppercase' }}>BIST 100 Pay Senedi</div>
              <div style={{ fontSize: 14, fontWeight: 600, color: '#FFFFFF' }}>{hisse} Spot İşlem</div>
            </div>
          </div>

          <div style={{ display: 'flex', gap: 20, alignItems: 'center' }}>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: 11, color: '#787B86' }}>GÜNCEL PİYASA FİYATI</div>
              <div style={{ fontSize: 20, fontWeight: 700, fontFamily: 'JetBrains Mono', color: '#2962FF' }}>
                {piyasaFiyat ? `${fmt(piyasaFiyat)} ₺` : 'Yükleniyor…'}
              </div>
            </div>
            {pozisyon && (
              <div style={{ textAlign: 'right', borderLeft: '1px solid #1E222D', paddingLeft: 16 }}>
                <div style={{ fontSize: 11, color: '#787B86' }}>PORTFÖYDEKİ LOT</div>
                <div style={{ fontSize: 17, fontWeight: 700, fontFamily: 'JetBrains Mono', color: '#D7FF4E' }}>
                  {fmt(pozisyon.lot, 0)} Lot
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 3. ANA EMİR MASASI (SOL: GİRİŞ PANELİ, SAĞ: DERİNLİK) */}
      <div className="terminal-iki-kolon">
        {/* SOL: EMİR FORMU */}
        <div className="kurumsal-kart" style={{ flex: 1.2, padding: 18 }}>
          <div className="emir-yon-secici">
            <button
              className={`emir-yon-btn alis ${yon === 'AL' ? 'aktif' : ''}`}
              onClick={() => setYon('AL')}
            >
              🟢 ALIŞ (BUY)
            </button>
            <button
              className={`emir-yon-btn satis ${yon === 'SAT' ? 'aktif' : ''}`}
              onClick={() => setYon('SAT')}
            >
              🔴 SATIŞ (SELL)
            </button>
          </div>

          <div style={{ marginTop: 14 }}>
            <label style={{ fontSize: 11, color: '#787B86', textTransform: 'uppercase', fontWeight: 600 }}>
              Emir Tipi
            </label>
            <div className="segment" style={{ marginTop: 4 }}>
              {['Limit', 'Piyasa'].map(et => (
                <button
                  key={et}
                  className={tip === et ? 'aktif' : ''}
                  onClick={() => setTip(et)}
                >
                  {et} Emri
                </button>
              ))}
            </div>
          </div>

          {tip === 'Limit' && (
            <div style={{ marginTop: 14 }}>
              <label style={{ fontSize: 11, color: '#787B86', textTransform: 'uppercase', fontWeight: 600 }}>
                Limit Fiyat (₺)
              </label>
              <div className="emir-input-wrap" style={{ marginTop: 4 }}>
                <input
                  type="number"
                  step="0.05"
                  value={limit}
                  onChange={e => setLimit(e.target.value)}
                  placeholder={String(piyasaFiyat || '')}
                />
                <span className="birim">₺</span>
              </div>
              {piyasaFiyat && (
                <div style={{ fontSize: 11, marginTop: 4 }}>
                  {yon === 'AL' && parseFloat(limit) < piyasaFiyat && (
                    <span style={{ color: '#FF9800' }}>
                      ⏳ Limit fiyat piyasadan düşük ({fmt(limit)} &lt; {fmt(piyasaFiyat)} ₺). Fiyat düşene kadar tahtada bekleyecek, teminat bloke edilecektir.
                    </span>
                  )}
                  {yon === 'AL' && parseFloat(limit) >= piyasaFiyat && (
                    <span style={{ color: '#089981' }}>
                      ⚡ Limit fiyat piyasayı karşılıyor ({fmt(limit)} &ge; {fmt(piyasaFiyat)} ₺). Emir anında piyasa fiyatından gerçekleşir.
                    </span>
                  )}
                  {yon === 'SAT' && parseFloat(limit) > piyasaFiyat && (
                    <span style={{ color: '#FF9800' }}>
                      ⏳ Limit satış fiyatı piyasanın üzerinde ({fmt(limit)} &gt; {fmt(piyasaFiyat)} ₺). Fiyat yükselene kadar tahtada bekleyecektir.
                    </span>
                  )}
                  {yon === 'SAT' && parseFloat(limit) <= piyasaFiyat && (
                    <span style={{ color: '#089981' }}>
                      ⚡ Limit satış fiyatı piyasayı karşılıyor ({fmt(limit)} &le; {fmt(piyasaFiyat)} ₺). Emir anında gerçekleşir.
                    </span>
                  )}
                </div>
              )}
            </div>
          )}

          <div style={{ marginTop: 14 }}>
            <label style={{ fontSize: 11, color: '#787B86', textTransform: 'uppercase', fontWeight: 600 }}>
              Lot Adedi
            </label>
            <div className="emir-input-wrap" style={{ marginTop: 4 }}>
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
                style={{ color: '#D7FF4E', fontWeight: 700 }}
                onClick={() => {
                  if (yon === 'SAT' && pozisyon?.lot) {
                    setLot(pozisyon.lot);
                  } else if (aktifFiyat > 0 && bakiye > 0) {
                    setLot(Math.max(1, Math.floor(bakiye / aktifFiyat)));
                  }
                }}
              >
                MAX
              </button>
            </div>
          </div>

          <div className="emir-ozet-kutusu" style={{ marginTop: 14 }}>
            <div className="emir-ozet-satir">
              <span>İşlem Hacmi</span>
              <span className="deger">{fmt(islemTutari)} ₺</span>
            </div>
            <div className="emir-ozet-satir">
              <span>BIST Takas & Kurum Payı (‰1.5)</span>
              <span className="deger">{fmt(komisyonTutari)} ₺</span>
            </div>
            <div className="emir-ozet-satir toplam">
              <span>Net Tahmini Tutar</span>
              <span className="deger" style={{ color: yon === 'AL' ? '#089981' : '#F23645' }}>
                {fmt(toplamTutar)} ₺
              </span>
            </div>
          </div>

          {accountMode === 'real' ? (
            <div style={{ marginTop: 14, textAlign: 'center' }}>
              <button
                className="arac-btn aktif"
                onClick={demoModaGec}
                style={{ width: '100%', padding: '12px', fontSize: 14, background: '#2962FF', borderColor: '#2962FF', fontWeight: 700 }}
              >
                🎮 Demo Hesaba Geç ve Emir Ver
              </button>
            </div>
          ) : (
            <button
              className={`emir-gonder-btn ${yon === 'AL' ? 'alis' : 'satis'}`}
              onClick={gonder}
              disabled={bekle}
              style={{ fontSize: 15, marginTop: 14 }}
            >
              {bekle ? 'BIST İletiliyor…' : `BIST ${hisse} ${yon} EMRİ GÖNDER (${tip})`}
            </button>
          )}

          {mesaj && (
            <div className={mesaj.tur === 'ok' ? 'ok-msg' : 'error-msg'} style={{ marginTop: 10 }}>
              {mesaj.tur === 'ok' ? '✅ ' : '⚠️ '} {mesaj.metin}
            </div>
          )}

          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11.5, color: '#787B86', marginTop: 12, paddingTop: 10, borderTop: '1px solid #1E222D' }}>
            <span>Kullanılabilir Sanal Bakiye: <b style={{ color: '#FFFFFF', fontFamily: 'JetBrains Mono' }}>{fmt(bakiye, 0)} ₺</b></span>
            {blokeBakiye > 0 && (
              <span>Bloke Teminat: <b style={{ color: '#FF9800', fontFamily: 'JetBrains Mono' }}>{fmt(blokeBakiye, 0)} ₺</b></span>
            )}
            <span>Mod: <b style={{ color: accountMode === 'real' ? '#FF9800' : '#089981' }}>{accountMode === 'real' ? `Gerçek (${bagliBanka})` : 'Demo BIST'}</b></span>
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
            💡 İpucu: Derinlik tablosundaki fiyatlara tıklayarak doğrudan limit fiyatınızı belirleyebilirsiniz.
          </p>
        </div>
      </div>

      {/* 4. BEKLEYEN LİMİT EMİRLER VE GEÇMİŞ TABLOLARI */}
      <div className="kurumsal-kart" style={{ padding: 18 }}>
        <div style={{ display: 'flex', gap: 10, marginBottom: 14, borderBottom: '1px solid #1E222D', paddingBottom: 10 }}>
          <button
            className={`arac-btn ${aktifTab === 'bekleyen' ? 'aktif' : ''}`}
            onClick={() => setAktifTab('bekleyen')}
            style={{ fontSize: 12, padding: '6px 14px' }}
          >
            ⏳ Bekleyen Limit Emirlerim ({bekleyenler.length})
          </button>
          <button
            className={`arac-btn ${aktifTab === 'gecmis' ? 'aktif' : ''}`}
            onClick={() => setAktifTab('gecmis')}
            style={{ fontSize: 12, padding: '6px 14px' }}
          >
            ⏱️ Gerçekleşen Emir Geçmişi ({islemler.length})
          </button>
        </div>

        {aktifTab === 'bekleyen' ? (
          <div style={{ overflowX: 'auto' }}>
            <table>
              <thead>
                <tr>
                  <th>Tarih</th>
                  <th>Hisse</th>
                  <th>Yön</th>
                  <th>Tip</th>
                  <th>Lot</th>
                  <th>Hedef Fiyat</th>
                  <th>Piyasa Fiyatı</th>
                  <th>Bloke Tutar</th>
                  <th>Durum</th>
                  <th style={{ textAlign: 'right' }}>İşlem</th>
                </tr>
              </thead>
              <tbody>
                {bekleyenler.length ? (
                  bekleyenler.map(em => (
                    <tr key={em.id}>
                      <td style={{ color: '#787B86', fontSize: 11.5 }}>{em.tarih}</td>
                      <td style={{ fontWeight: 700, color: '#FFFFFF' }}>{em.hisse}</td>
                      <td>
                        <span className={em.yon === 'AL' ? 'rozet-al' : 'rozet-sat'}>{em.yon}</span>
                      </td>
                      <td><span className="rozet">{em.tip || 'Limit'}</span></td>
                      <td style={{ fontWeight: 600 }}>{fmt(em.lot, 0)}</td>
                      <td style={{ color: '#2962FF', fontWeight: 700 }}>{fmt(em.fiyat)} ₺</td>
                      <td style={{ color: '#D1D4DC' }}>{fmt(em.anlik_fiyat || piyasaFiyat)} ₺</td>
                      <td style={{ fontWeight: 700, color: '#FF9800' }}>{fmt(em.tutar)} ₺</td>
                      <td><span className="rozet" style={{ background: 'rgba(255,152,0,0.15)', color: '#FF9800', borderColor: 'rgba(255,152,0,0.3)' }}>Tahtada Bekliyor</span></td>
                      <td style={{ textAlign: 'right' }}>
                        <button
                          className="arac-btn"
                          onClick={() => emirIptalEt(em.id)}
                          style={{
                            background: 'rgba(242,54,69,0.15)',
                            color: '#F23645',
                            borderColor: 'rgba(242,54,69,0.4)',
                            fontSize: 11,
                            padding: '4px 10px',
                          }}
                        >
                          ✕ İptal Et
                        </button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={10} className="empty-hint" style={{ padding: 24, textAlign: 'center' }}>
                      Şu an BIST tahtasında bekleyen aktif bir limit emriniz bulunmuyor. Piyasa fiyatının altında alış veya üstünde satış girdiğinizde emriniz burada listelenir.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table>
              <thead>
                <tr>
                  <th>Zaman</th>
                  <th>Hisse</th>
                  <th>Yön</th>
                  <th>Tip</th>
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
                      <td style={{ color: '#787B86', fontSize: 11.5 }}>{islem.zaman}</td>
                      <td style={{ fontWeight: 700, color: '#FFFFFF' }}>{islem.hisse}</td>
                      <td>
                        <span className={islem.yon === 'AL' ? 'rozet-al' : 'rozet-sat'}>
                          {islem.yon}
                        </span>
                      </td>
                      <td><span className="rozet">{islem.tip || 'Limit'}</span></td>
                      <td style={{ fontWeight: 600 }}>{fmt(islem.lot, 0)}</td>
                      <td>{fmt(islem.fiyat)} ₺</td>
                      <td style={{ fontWeight: 700, color: '#FFFFFF' }}>{fmt(islem.tutar)} ₺</td>
                      <td>
                        <span className={`rozet ${islem.durum?.includes('İPTAL') ? 'sat' : islem.durum?.includes('BEKLİYOR') ? '' : 'tetik'}`}>
                          {islem.durum || 'Gerçekleşti'}
                        </span>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={8} className="empty-hint" style={{ padding: 20, textAlign: 'center' }}>
                      Henüz gerçekleşmiş bir işlem kaydı bulunmuyor.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

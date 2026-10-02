import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { fmt } from '../lib/format.jsx';
import { useAyar } from '../ayarlar.jsx';

const BIST30_LISTE = [
  'THYAO', 'GARAN', 'ASELS', 'EREGL', 'TUPRS',
  'KCHOL', 'BIMAS', 'AKBNK', 'SISE', 'SAHOL', 'PGSUS', 'ISCTR'
];

export default function TradeAllHizliEmirModal({ acik, kapat, api, bildirimYenile, baslangicHisse = 'THYAO' }) {
  const { portfoyDegisti } = useAyar();
  const [hisse, setHisse] = useState(baslangicHisse);
  const [yon, setYon] = useState('AL');
  const [tip, setTip] = useState('Limit');
  const [lot, setLot] = useState(100);
  const [fiyat, setFiyat] = useState('');
  const [piyasaFiyat, setPiyasaFiyat] = useState(null);
  const [bakiye, setBakiye] = useState(null);
  const [pozisyon, setPozisyon] = useState(null);
  const [derinlik, setDerinlik] = useState(null);
  const [bekle, setBekle] = useState(false);
  const [mesaj, setMesaj] = useState(null);
  const [accountMode, setAccountMode] = useState('demo');
  const [bagliBanka, setBagliBanka] = useState('');

  useEffect(() => {
    if (baslangicHisse) {
      setHisse(baslangicHisse);
    }
  }, [baslangicHisse]);

  const veriGetir = useCallback(async (sembol) => {
    try {
      const kod = sembol.trim().toUpperCase();
      const [fRes, dRes, pRes] = await Promise.all([
        api(`/api/price/${kod}`).catch(() => null),
        api(`/api/depth/${kod}`).catch(() => null),
        api('/api/portfolio').catch(() => null),
      ]);

      if (fRes?.fiyat) {
        setPiyasaFiyat(fRes.fiyat);
        setFiyat(prev => prev || fRes.fiyat);
      }
      if (dRes) setDerinlik(dRes);
      if (pRes) {
        setBakiye(pRes.virtual_cash);
        setAccountMode(pRes.account_mode || 'demo');
        setBagliBanka(pRes.real_bank || '');
        const poz = pRes.portfolio?.[kod] || pRes.pozisyonlar?.find(x => x.hisse === kod) || null;
        setPozisyon(poz);
      }
    } catch {
      /* sessiz */
    }
  }, [api]);

  useEffect(() => {
    if (acik) {
      setMesaj(null);
      veriGetir(hisse);
    }
  }, [acik, hisse, veriGetir]);

  if (!acik) return null;

  const aktifFiyat = tip === 'Piyasa' ? (piyasaFiyat || 0) : (parseFloat(fiyat) || piyasaFiyat || 0);
  const islemTutari = aktifFiyat * (parseInt(lot, 10) || 0);
  const komisyonTutari = islemTutari * 0.0015;
  const toplamGereken = yon === 'AL' ? islemTutari + komisyonTutari : islemTutari - komisyonTutari;

  const demoModaGec = async () => {
    try {
      await api('/api/account/switch-mode', { method: 'POST', govde: { mode: 'demo' } });
      setAccountMode('demo');
      veriGetir(hisse);
      bildirimYenile?.();
      portfoyDegisti?.();
    } catch {
      /* sessiz */
    }
  };

  const emirGonder = async () => {
    setMesaj(null);
    if (accountMode === 'real') {
      setMesaj({ tur: 'hata', metin: 'Gerçek banka hesabı salt okunurdur. İşlem yapmak için lütfen Demo Hesaba geçiniz.' });
      return;
    }

    const gonderilecekFiyat = tip === 'Piyasa' ? piyasaFiyat : parseFloat(fiyat);
    if (!gonderilecekFiyat || isNaN(gonderilecekFiyat) || gonderilecekFiyat <= 0) {
      setMesaj({ tur: 'hata', metin: 'Lütfen geçerli bir işlem fiyatı girin.' });
      return;
    }
    const lotSayisi = parseInt(lot, 10);
    if (!lotSayisi || lotSayisi <= 0) {
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
          lot: lotSayisi,
          fiyat: gonderilecekFiyat,
          tip: tip === 'Piyasa' ? 'Piyasa' : 'Limit',
          hesap_turu: accountMode,
        },
      });
      setBakiye(r.virtual_cash);
      setMesaj({
        tur: 'ok',
        metin: r.mesaj || `BIST İletildi: ${lotSayisi} Lot ${hisse.toUpperCase()} ${yon} @ ${fmt(gonderilecekFiyat)} ₺`,
      });
      veriGetir(hisse);
      bildirimYenile?.();
      portfoyDegisti?.();
    } catch (e) {
      setMesaj({ tur: 'hata', metin: e.message || 'Emir iletilemedi.' });
    } finally {
      setBekle(false);
    }
  };

  return (
    <div className="tradeall-modal-backdrop" onClick={kapat}>
      <div className="tradeall-modal" onClick={e => e.stopPropagation()}>
        {/* Modal Başlığı */}
        <div className="tradeall-modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span className="tradeall-badge">TRADEALL</span>
            <span style={{ fontWeight: 700, fontSize: 16, color: '#FFFFFF', letterSpacing: 0.5 }}>
              HIZLI EMİR MASASI
            </span>
            <span style={{ fontSize: 11, color: '#089981', background: 'rgba(8, 153, 129, 0.15)', padding: '2px 8px', borderRadius: 4, fontWeight: 600 }}>
              🟢 BIST CANLI
            </span>
          </div>
          <button className="tradeall-modal-kapat" onClick={kapat} aria-label="Kapat">
            ✕
          </button>
        </div>

        {/* Hızlı BIST 30 Çip Seçici */}
        <div className="tradeall-chipler">
          {BIST30_LISTE.map(s => (
            <button
              key={s}
              className={`tradeall-chip ${hisse === s ? 'aktif' : ''}`}
              onClick={() => setHisse(s)}
            >
              {s}
            </button>
          ))}
        </div>

        <div className="tradeall-modal-govde">
          {/* Sol Kolon: Fiyat / Al-Sat / Lot Girişi */}
          <div className="tradeall-sol-kolon">
            {/* Hisse Kodu Arama / Seçim */}
            <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
              <div style={{ flex: 1 }}>
                <label style={{ fontSize: 11, color: '#787B86', textTransform: 'uppercase', fontWeight: 600 }}>
                  Sembol (BIST)
                </label>
                <input
                  type="text"
                  value={hisse}
                  onChange={e => setHisse(e.target.value.toUpperCase())}
                  style={{
                    background: '#0B0E14',
                    border: '1px solid #2A2E39',
                    color: '#FFFFFF',
                    fontWeight: 700,
                    fontFamily: 'JetBrains Mono',
                    padding: '8px 12px',
                    borderRadius: 6,
                    width: '100%',
                    textTransform: 'uppercase',
                  }}
                />
              </div>

              {piyasaFiyat && (
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: 11, color: '#787B86' }}>SON PİYASA FİYATI</div>
                  <div style={{ fontSize: 20, fontWeight: 700, color: '#2962FF', fontFamily: 'JetBrains Mono' }}>
                    {fmt(piyasaFiyat)} ₺
                  </div>
                </div>
              )}
            </div>

            {/* YÖN SEÇİMİ: ALIŞ / SATIŞ */}
            <div className="emir-yon-secici" style={{ marginTop: 12 }}>
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

            {/* Emir Tipi */}
            <div style={{ marginTop: 12 }}>
              <label style={{ fontSize: 11, color: '#787B86', textTransform: 'uppercase', fontWeight: 600 }}>
                Emir Tipi
              </label>
              <div className="segment" style={{ marginTop: 4 }}>
                {['Piyasa', 'Limit', 'Zarar Durdur'].map(t => (
                  <button
                    key={t}
                    className={tip === t ? 'aktif' : ''}
                    onClick={() => setTip(t)}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>

            {/* Fiyat Girişi (Limit ise) */}
            {tip !== 'Piyasa' && (
              <div style={{ marginTop: 12 }}>
                <label style={{ fontSize: 11, color: '#787B86', textTransform: 'uppercase', fontWeight: 600 }}>
                  {tip === 'Limit' ? 'Limit Fiyat (₺)' : 'Tetikleme Fiyatı (₺)'}
                </label>
                <div className="emir-input-wrap" style={{ marginTop: 4 }}>
                  <input
                    type="number"
                    step="0.05"
                    value={fiyat}
                    onChange={e => setFiyat(e.target.value)}
                    placeholder={String(piyasaFiyat || '')}
                  />
                  <span className="birim">₺</span>
                </div>
                {tip === 'Limit' && piyasaFiyat && (
                  <div style={{ fontSize: 10.5, color: '#787B86', marginTop: 4 }}>
                    {yon === 'AL' && parseFloat(fiyat) < piyasaFiyat && (
                      <span style={{ color: '#FF9800' }}>⏳ Limit fiyat piyasanın altında ({fmt(fiyat)} &lt; {fmt(piyasaFiyat)} ₺). Emir tahtaya iletilecek ve teminat bloke edilecektir.</span>
                    )}
                    {yon === 'AL' && parseFloat(fiyat) >= piyasaFiyat && (
                      <span style={{ color: '#089981' }}>⚡ Limit alış fiyatı piyasayı karşıladığı için anında gerçekleşir.</span>
                    )}
                    {yon === 'SAT' && parseFloat(fiyat) > piyasaFiyat && (
                      <span style={{ color: '#FF9800' }}>⏳ Limit satış fiyatı piyasanın üzerinde ({fmt(fiyat)} &gt; {fmt(piyasaFiyat)} ₺). Fiyat yükselene kadar tahtada bekler.</span>
                    )}
                    {yon === 'SAT' && parseFloat(fiyat) <= piyasaFiyat && (
                      <span style={{ color: '#089981' }}>⚡ Limit satış fiyatı piyasayı karşıladığı için anında gerçekleşir.</span>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Lot Miktarı */}
            <div style={{ marginTop: 12 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <label style={{ fontSize: 11, color: '#787B86', textTransform: 'uppercase', fontWeight: 600 }}>
                  Lot Miktarı
                </label>
                {pozisyon && (
                  <span style={{ fontSize: 11, color: '#D7FF4E' }}>
                    Portföyde: {pozisyon.lot} Lot
                  </span>
                )}
              </div>
              <div className="emir-input-wrap" style={{ marginTop: 4 }}>
                <input
                  type="number"
                  min="1"
                  value={lot}
                  onChange={e => setLot(e.target.value)}
                />
                <span className="birim">LOT</span>
              </div>

              {/* Hızlı Lot Butonları */}
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

            {/* İşlem Özeti */}
            <div className="emir-ozet-kutusu" style={{ marginTop: 14 }}>
              <div className="emir-ozet-satir">
                <span>İşlem Tutarı</span>
                <span className="deger">{fmt(islemTutari)} ₺</span>
              </div>
              <div className="emir-ozet-satir">
                <span>BIST + Kurum Payı (‰1.5)</span>
                <span className="deger">{fmt(komisyonTutari)} ₺</span>
              </div>
              <div className="emir-ozet-satir toplam">
                <span>Net Tahmini Tutar</span>
                <span className="deger" style={{ color: yon === 'AL' ? '#089981' : '#F23645' }}>
                  {fmt(toplamGereken)} ₺
                </span>
              </div>
            </div>

            {/* Gerçek Hesap vs Demo Kontrolü */}
            {accountMode === 'real' ? (
              <div style={{ background: 'rgba(255, 152, 0, 0.12)', border: '1px solid rgba(255, 152, 0, 0.3)', borderRadius: 8, padding: 12, marginTop: 14 }}>
                <div style={{ color: '#FF9800', fontWeight: 700, fontSize: 13, marginBottom: 4, display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span>🔒</span>
                  <span>Gerçek Hesap Salt Okunur Modda {bagliBanka ? `(${bagliBanka})` : ''}</span>
                </div>
                <div style={{ color: '#B2B5BE', fontSize: 11.5, lineHeight: 1.4, marginBottom: 10 }}>
                  Güvenlik gerekçesiyle gerçek banka hesabınız üzerinden doğrudan işlem yapılamaz. Emir simülasyonları için Demo Hesaba geçebilirsiniz.
                </div>
                <button
                  type="button"
                  className="arac-btn aktif"
                  onClick={demoModaGec}
                  style={{ width: '100%', padding: '9px 12px', fontSize: 12, background: '#2962FF', borderColor: '#2962FF', fontWeight: 600 }}
                >
                  🎮 Demo Hesaba Geç ve İşlem Yap
                </button>
              </div>
            ) : (
              <button
                className={`emir-gonder-btn ${yon === 'AL' ? 'alis' : 'satis'}`}
                style={{ marginTop: 14 }}
                onClick={emirGonder}
                disabled={bekle}
              >
                {bekle ? 'BIST Emri İletiliyor…' : `BIST ${hisse} ${yon} EMRİ GÖNDER`}
              </button>
            )}

            {mesaj && (
              <div className={mesaj.tur === 'ok' ? 'ok-msg' : 'error-msg'} style={{ fontSize: 12, marginTop: 8 }}>
                {mesaj.tur === 'ok' ? '✅ ' : '⚠️ '} {mesaj.metin}
              </div>
            )}
          </div>

          {/* Sağ Kolon: Mini Level 2 Derinlik & Sanal Teminat Özeti */}
          <div className="tradeall-sag-kolon">
            <div className="tradeall-sag-kart">
              <div style={{ fontSize: 11, color: '#787B86', textTransform: 'uppercase', fontWeight: 600 }}>
                HESAP / SANAL TEMİNAT COCKPIT
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginTop: 4 }}>
                <span style={{ fontSize: 13, color: '#D1D4DC' }}>Kullanılabilir Limit:</span>
                <span style={{ fontSize: 18, fontWeight: 700, fontFamily: 'JetBrains Mono', color: '#D7FF4E' }}>
                  {bakiye != null ? `${Number(bakiye).toLocaleString('tr-TR')} ₺` : '—'}
                </span>
              </div>
            </div>

            {/* Derinlik & Makas Özeti */}
            <div className="derinlik-kutusu" style={{ marginTop: 8 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 11, color: '#787B86' }}>
                <span>Alıcı: %{derinlik?.alici_orani ?? 50}</span>
                <span className="tradeall-spread-pill">
                  Makas: {fmt(derinlik?.spread ?? 0.05)} ₺
                </span>
                <span>Satıcı: %{derinlik?.satici_orani ?? 50}</span>
              </div>

              {/* Baskı Termometresi */}
              <div className="derinlik-guc-bar" style={{ height: 5 }}>
                <div className="guc-alici" style={{ width: `${derinlik?.alici_orani ?? 50}%` }} />
                <div className="guc-satici" style={{ width: `${derinlik?.satici_orani ?? 50}%` }} />
              </div>

              {/* 5 Kademe Mini Tablo */}
              <div className="derinlik-tablo-wrap">
                <div>
                  <div className="derinlik-taraf-baslik alis">ALIŞ</div>
                  {(derinlik?.alislar || []).slice(0, 4).map(b => (
                    <div
                      key={b.kademe}
                      className="derinlik-satir alis"
                      onClick={() => { setFiyat(b.fiyat); setTip('Limit'); }}
                      title="Fiyatı emre aktar"
                    >
                      <div className="derinlik-bar-arkaplan" style={{ width: `${b.yuzde}%` }} />
                      <span className="lot">{fmt(b.lot, 0)}</span>
                      <span className="fiyat">{fmt(b.fiyat)}</span>
                    </div>
                  ))}
                </div>

                <div>
                  <div className="derinlik-taraf-baslik satis">SATIŞ</div>
                  {(derinlik?.satislar || []).slice(0, 4).map(a => (
                    <div
                      key={a.kademe}
                      className="derinlik-satir satis"
                      onClick={() => { setFiyat(a.fiyat); setTip('Limit'); }}
                      title="Fiyatı emre aktar"
                    >
                      <div className="derinlik-bar-arkaplan" style={{ width: `${a.yuzde}%` }} />
                      <span className="fiyat">{fmt(a.fiyat)}</span>
                      <span className="lot">{fmt(a.lot, 0)}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div style={{ marginTop: 14, fontSize: 11, color: '#787B86', background: '#0E1117', padding: 8, borderRadius: 6, border: '1px solid #1E222D', lineHeight: 1.5 }}>
              💡 <b>TradeAll Hızlı İpucu:</b> Derinlik kademesindeki herhangi bir fiyata tıkladığınızda limit fiyat kutusu anında güncellenir.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

import React, { useState, useEffect, useRef } from 'react';

const VARSAYILAN_BANKALAR = [
  { id: 'is_bankasi', ad: 'İş Bankası (İş Yatırım)', aciklama: 'İş Yatırım Menkul Değerler A.Ş. — BIST Pay & VİOP', renk: '#004B93', logo_text: 'İŞ' },
  { id: 'garanti_bbva', ad: 'Garanti BBVA Yatırım', aciklama: 'Garanti Yatırım Menkul Kıymetler A.Ş.', renk: '#008542', logo_text: 'GB' },
  { id: 'yapi_kredi', ad: 'Yapı Kredi Yatırım', aciklama: 'Yapı Kredi Yatırım Menkul Değerler A.Ş.', renk: '#003A70', logo_text: 'YK' },
  { id: 'akbank', ad: 'Akbank Yatırımcı', aciklama: 'Ak Yatırım Menkul Değerler A.Ş.', renk: '#E30613', logo_text: 'AK' },
  { id: 'ziraat', ad: 'Ziraat Yatırım', aciklama: 'Ziraat Yatırım Menkul Değerler A.Ş.', renk: '#D2001A', logo_text: 'ZR' },
  { id: 'vakif', ad: 'Vakıf Yatırım', aciklama: 'Vakıf Yatırım Menkul Değerler A.Ş.', renk: '#FDB813', logo_text: 'VK' },
  { id: 'qnb', ad: 'QNB Finansinvest', aciklama: 'QNB Finansinvest Menkul Değerler A.Ş.', renk: '#6A1A40', logo_text: 'QNB' },
  { id: 'midas', ad: 'Midas Menkul Değerler', aciklama: 'Midas Menkul Değerler A.Ş. — SPK Lisanslı', renk: '#11E1A3', logo_text: 'MD' },
];

export default function BankaBaglantiModal({ acik, kapat, api, bagliBanka, onBaglandi }) {
  const [bankalar, setBankalar] = useState(VARSAYILAN_BANKALAR);
  const [secilenBanka, setSecilenBanka] = useState(null);
  const [asama, setAsama] = useState('liste'); // 'liste' | 'giris' | 'bekleniyor' | 'basarili'
  const [tcKimlik, setTcKimlik] = useState('');
  const [sifre, setSifre] = useState('');
  const [sifreGoster, setSifreGoster] = useState(false);
  const [telefon, setTelefon] = useState('');
  const [telefonMaskeli, setTelefonMaskeli] = useState('');
  const [smsGonderildi, setSmsGonderildi] = useState(false);
  const [smsKodu, setSmsKodu] = useState('');
  const [kalanSure, setKalanSure] = useState(0);
  const [hata, setHata] = useState('');
  const [bilgiMesaji, setBilgiMesaji] = useState('');
  const [smsYukleniyor, setSmsYukleniyor] = useState(false);
  const [baglanYukleniyor, setBaglanYukleniyor] = useState(false);
  const [beklemeAdimi, setBeklemeAdimi] = useState(1);

  const timerRef = useRef(null);
  const smsInputRef = useRef(null);

  // Modal açıldığında form sıfırlama ve kayıtlı telefon / TCKN çekme
  useEffect(() => {
    if (acik) {
      setHata('');
      setBilgiMesaji('');
      setAsama('liste');
      setSecilenBanka(null);
      setSmsGonderildi(false);
      setSmsKodu('');
      setKalanSure(0);

      api('/api/bank/list')
        .then(r => {
          if (r?.bankalar?.length) setBankalar(r.bankalar);
        })
        .catch(() => {});

      api('/api/bank/user-profile')
        .then(res => {
          if (res?.phone) setTelefon(res.phone);
          if (res?.tckn) setTcKimlik(res.tckn);
        })
        .catch(() => {});
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
  }, [acik, api]);

  // SMS Geri Sayım Zamanlayıcısı
  useEffect(() => {
    if (smsGonderildi && kalanSure > 0) {
      timerRef.current = setInterval(() => {
        setKalanSure(prev => {
          if (prev <= 1) {
            clearInterval(timerRef.current);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [smsGonderildi, kalanSure]);

  if (!acik) return null;

  const handleBankaSec = (b) => {
    setSecilenBanka(b);
    setAsama('giris');
    setHata('');
    setBilgiMesaji('');
    setSmsGonderildi(false);
    setSmsKodu('');
    setKalanSure(0);
  };

  const handleTelefonDegisim = (val) => {
    const digits = val.replace(/\D/g, '');
    if (digits.length <= 11) {
      setTelefon(val);
    }
  };

  // Zaman formatlayıcı (MM:SS)
  const formatZaman = (saniye) => {
    const dk = Math.floor(saniye / 60);
    const sn = saniye % 60;
    return `${String(dk).padStart(2, '0')}:${String(sn).padStart(2, '0')}`;
  };

  // 1. BUTON: TELEFON YANINDAKİ "KOD GÖNDER" İŞLEMİ
  const handleSmsKoduGonder = async () => {
    setHata('');
    setBilgiMesaji('');

    const temizTc = tcKimlik.trim().replace(/\s/g, '');
    if (!temizTc || temizTc.length < 6) {
      setHata('Lütfen önce T.C. Kimlik No (11 hane) veya Müşteri Numaranızı giriniz.');
      return;
    }

    if (!sifre || sifre.length < 6) {
      setHata('Lütfen önce internet şubesi / API giriş şifrenizi giriniz.');
      return;
    }

    const temizTel = telefon.replace(/\D/g, '');
    if (!temizTel || temizTel.length < 10) {
      setHata('Lütfen geçerli bir Türkiye cep telefonu numarası giriniz (Örn: 0532 123 45 67).');
      return;
    }

    setSmsYukleniyor(true);
    try {
      const res = await api('/api/bank/send-sms', {
        method: 'POST',
        govde: {
          banka: secilenBanka.ad,
          musteri_no: temizTc,
          sifre: sifre,
          telefon: telefon,
        },
      });

      setTelefonMaskeli(res.telefon_maskeli || telefon);
      setKalanSure(res.sure_saniye || 180);
      setSmsGonderildi(true);
      setBilgiMesaji(res.mesaj || '6 haneli doğrulama SMS kodu telefonunuza iletildi.');
      
      // SMS kutucuğuna otomatik odaklan
      setTimeout(() => {
        smsInputRef.current?.focus();
      }, 150);
    } catch (err) {
      setHata(err.message || 'SMS kodu gönderilemedi. Lütfen bilgilerinizi kontrol ediniz.');
    } finally {
      setSmsYukleniyor(false);
    }
  };

  // 2. BUTON: KODU GİREREK DOĞRULA VE BAĞLA
  const handleSmsDogrulaVeBagla = async (e) => {
    e?.preventDefault();
    setHata('');

    if (!smsGonderildi) {
      setHata('Lütfen önce "Kod Gönder" butonuna basarak telefonunuza gelen SMS kodunu alınız.');
      return;
    }

    const kod = smsKodu.trim();
    if (!kod || kod.length !== 6 || !/^\d{6}$/.test(kod)) {
      setHata('Lütfen SMS ile gelen 6 haneli güvenlik kodunu eksiksiz giriniz.');
      return;
    }

    setBaglanYukleniyor(true);
    setAsama('bekleniyor');
    setBeklemeAdimi(1);

    const stepTimer1 = setTimeout(() => setBeklemeAdimi(2), 700);
    const stepTimer2 = setTimeout(() => setBeklemeAdimi(3), 1400);

    try {
      const res = await api('/api/bank/verify-and-connect', {
        method: 'POST',
        govde: {
          code: kod,
        },
      });

      clearTimeout(stepTimer1);
      clearTimeout(stepTimer2);
      setAsama('basarili');

      setTimeout(() => {
        onBaglandi?.(res);
        kapat();
      }, 1500);
    } catch (err) {
      clearTimeout(stepTimer1);
      clearTimeout(stepTimer2);
      setAsama('giris');
      setHata(err.message || 'Girdiğiniz SMS doğrulama kodu geçersiz.');
    } finally {
      setBaglanYukleniyor(false);
    }
  };

  // Bağlantıyı Kes
  const handleBaglantiKes = async () => {
    if (!window.confirm(`${bagliBanka} Açık Bankacılık bağlantısını kesmek istediğinize emin misiniz? Demo portföyünüze dönülecektir.`)) {
      return;
    }
    setBaglanYukleniyor(true);
    try {
      await api('/api/bank/disconnect', { method: 'POST' });
      onBaglandi?.({ account_mode: 'demo', banka: '' });
      kapat();
    } catch (err) {
      setHata(err.message || 'Bağlantı kesilemedi.');
    } finally {
      setBaglanYukleniyor(false);
    }
  };

  return (
    <div className="tradeall-modal-backdrop" onClick={kapat}>
      <div
        className="tradeall-modal banka-baglanti-modal"
        onClick={e => e.stopPropagation()}
        style={{
          maxWidth: 620,
          width: '94vw',
          background: '#131722',
          border: '1px solid #2A2E39',
          borderRadius: 14,
          boxShadow: '0 20px 50px rgba(0,0,0,0.65)',
          overflow: 'hidden',
        }}
      >
        {/* Modal Başlığı */}
        <div
          className="tradeall-modal-header"
          style={{
            padding: '16px 22px',
            borderBottom: '1px solid #2A2E39',
            background: 'linear-gradient(180deg, #181C27 0%, #131722 100%)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{ fontSize: 22 }}>🏛️</span>
            <div>
              <div style={{ fontWeight: 700, fontSize: 15.5, color: '#FFFFFF', letterSpacing: 0.2 }}>
                Açık Bankacılık (Open Banking) Portföy Bağlantısı
              </div>
              <div style={{ fontSize: 11, color: '#787B86', marginTop: 2 }}>
                BIST Aracı Kurum & Banka Entegrasyon Masası (Salt Okunur / Read-Only)
              </div>
            </div>
          </div>
          <button className="tradeall-modal-kapat" onClick={kapat} aria-label="Kapat">
            ✕
          </button>
        </div>

        {/* Modal Gövdesi */}
        <div style={{ padding: 22 }}>
          {/* Aktif Bağlantı Varsa Bilgi Şeridi */}
          {bagliBanka && asama === 'liste' && (
            <div
              style={{
                background: 'rgba(8, 153, 129, 0.1)',
                border: '1px solid rgba(8, 153, 129, 0.35)',
                borderRadius: 10,
                padding: '14px 16px',
                marginBottom: 20,
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: 12,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ fontSize: 24 }}>✅</span>
                <div>
                  <div style={{ color: '#FFFFFF', fontWeight: 700, fontSize: 14 }}>
                    Aktif Entegrasyon: <span style={{ color: '#089981' }}>{bagliBanka}</span>
                  </div>
                  <div style={{ fontSize: 11.5, color: '#94A3B8', marginTop: 2 }}>
                    Portföyünüz ve hisse lotlarınız güvenli API üzerinden canlı takip ediliyor.
                  </div>
                </div>
              </div>
              <button
                type="button"
                className="arac-btn"
                onClick={handleBaglantiKes}
                disabled={baglanYukleniyor}
                style={{
                  background: 'rgba(242, 54, 69, 0.15)',
                  color: '#F23645',
                  borderColor: 'rgba(242, 54, 69, 0.4)',
                  fontSize: 12,
                  padding: '7px 16px',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                {baglanYukleniyor ? 'İşleniyor...' : 'Bağlantıyı Kes'}
              </button>
            </div>
          )}

          {/* 1. ADIM: BANKA LİSTESİ */}
          {asama === 'liste' && (
            <div>
              <div style={{ marginBottom: 16 }}>
                <div style={{ fontSize: 13.5, color: '#FFFFFF', fontWeight: 600, marginBottom: 4 }}>
                  Portföyünüzü bağlamak istediğiniz bankayı veya aracı kurumu seçiniz:
                </div>
                <div style={{ fontSize: 11.5, color: '#787B86', lineHeight: 1.5 }}>
                  Açık Bankacılık protokolü kapsamında yalnızca BIST hisse senedi pozisyonlarınız ve yatırım nakit bakiyeniz çekilir.
                  Doğrudan işlem yapma veya para transferi yetkisi <b>verilmez</b> (Salt Okunur).
                </div>
              </div>

              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))',
                  gap: 10,
                  maxHeight: 380,
                  overflowY: 'auto',
                  paddingRight: 4,
                }}
              >
                {bankalar.map(b => (
                  <div
                    key={b.id}
                    onClick={() => handleBankaSec(b)}
                    style={{
                      background: '#1E222D',
                      border: '1px solid #2A2E39',
                      borderRadius: 10,
                      padding: 14,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 12,
                      transition: 'all 0.2s ease',
                    }}
                    onMouseEnter={e => {
                      e.currentTarget.style.borderColor = b.renk || '#2962FF';
                      e.currentTarget.style.background = '#252936';
                    }}
                    onMouseLeave={e => {
                      e.currentTarget.style.borderColor = '#2A2E39';
                      e.currentTarget.style.background = '#1E222D';
                    }}
                  >
                    <div
                      style={{
                        width: 42,
                        height: 42,
                        borderRadius: 8,
                        background: b.renk || '#2962FF',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#FFFFFF',
                        fontWeight: 800,
                        fontSize: 13.5,
                        letterSpacing: 0.5,
                        flexShrink: 0,
                      }}
                    >
                      {b.logo_text || 'BK'}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ color: '#FFFFFF', fontWeight: 600, fontSize: 13.5, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {b.ad}
                      </div>
                      <div style={{ color: '#787B86', fontSize: 11, marginTop: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {b.aciklama}
                      </div>
                    </div>
                    <span style={{ color: '#787B86', fontSize: 18 }}>›</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 2. ADIM: BANKA GİRİŞ, TELEFON & YANINDA "KOD GÖNDER" BUTONU */}
          {asama === 'giris' && secilenBanka && (
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
                <button
                  type="button"
                  onClick={() => setAsama('liste')}
                  style={{
                    background: 'transparent',
                    border: '1px solid #2A2E39',
                    borderRadius: 6,
                    color: '#D1D4DC',
                    padding: '6px 12px',
                    fontSize: 12,
                    cursor: 'pointer',
                  }}
                >
                  ← Banka Değiştir
                </button>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div
                    style={{
                      width: 28,
                      height: 28,
                      borderRadius: 6,
                      background: secilenBanka.renk || '#2962FF',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#FFFFFF',
                      fontWeight: 800,
                      fontSize: 11,
                    }}
                  >
                    {secilenBanka.logo_text || 'BK'}
                  </div>
                  <span style={{ color: '#FFFFFF', fontWeight: 700, fontSize: 15 }}>
                    {secilenBanka.ad}
                  </span>
                </div>
              </div>

              {/* Güvenlik Rozeti */}
              <div
                style={{
                  background: 'rgba(41, 98, 255, 0.08)',
                  border: '1px solid rgba(41, 98, 255, 0.25)',
                  borderRadius: 8,
                  padding: '11px 14px',
                  marginBottom: 16,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#2962FF', fontWeight: 700, fontSize: 12, marginBottom: 3 }}>
                  <span>🔒</span>
                  <span>256-Bit SSL Açık Bankacılık Güvenlik Protokolü</span>
                </div>
                <div style={{ fontSize: 11, color: '#B2B5BE', lineHeight: 1.45 }}>
                  Doğrulama sonrası hisseleriniz ve lotlarınız <b>SALT OKUNUR (Read-Only)</b> modda gösterilir. Uygulama üzerinden alım-satım yapılamaz.
                </div>
              </div>

              {hata && (
                <div
                  style={{
                    background: 'rgba(242, 54, 69, 0.15)',
                    border: '1px solid #F23645',
                    color: '#F23645',
                    padding: '10px 12px',
                    borderRadius: 6,
                    fontSize: 12,
                    marginBottom: 14,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                  }}
                >
                  <span>⚠️</span>
                  <span>{hata}</span>
                </div>
              )}

              {bilgiMesaji && (
                <div
                  style={{
                    background: 'rgba(8, 153, 129, 0.12)',
                    border: '1px solid #089981',
                    color: '#089981',
                    padding: '9px 12px',
                    borderRadius: 6,
                    fontSize: 12,
                    marginBottom: 14,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                  }}
                >
                  <span>✅</span>
                  <span>{bilgiMesaji}</span>
                </div>
              )}

              <form onSubmit={handleSmsDogrulaVeBagla} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                {/* T.C. Kimlik / Müşteri No */}
                <div>
                  <label style={{ display: 'block', fontSize: 12, color: '#94A3B8', marginBottom: 5, fontWeight: 600 }}>
                    T.C. Kimlik No veya Müşteri Numarası <span style={{ color: '#F23645' }}>*</span>
                  </label>
                  <input
                    type="text"
                    value={tcKimlik}
                    onChange={e => setTcKimlik(e.target.value.replace(/\D/g, ''))}
                    placeholder="11 haneli TCKN veya Müşteri No"
                    maxLength={11}
                    required
                    style={{
                      width: '100%',
                      background: '#1E222D',
                      border: '1px solid #2A2E39',
                      borderRadius: 8,
                      color: '#FFFFFF',
                      padding: '10px 14px',
                      fontSize: 13.5,
                      fontFamily: 'JetBrains Mono, monospace',
                      outline: 'none',
                    }}
                  />
                </div>

                {/* İnternet Şubesi / API Şifresi */}
                <div>
                  <label style={{ display: 'block', fontSize: 12, color: '#94A3B8', marginBottom: 5, fontWeight: 600 }}>
                    İnternet Şubesi / API Giriş Şifresi <span style={{ color: '#F23645' }}>*</span>
                  </label>
                  <div style={{ position: 'relative' }}>
                    <input
                      type={sifreGoster ? 'text' : 'password'}
                      value={sifre}
                      onChange={e => setSifre(e.target.value)}
                      placeholder="••••••••"
                      required
                      style={{
                        width: '100%',
                        background: '#1E222D',
                        border: '1px solid #2A2E39',
                        borderRadius: 8,
                        color: '#FFFFFF',
                        padding: '10px 42px 10px 14px',
                        fontSize: 13.5,
                        outline: 'none',
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => setSifreGoster(prev => !prev)}
                      style={{
                        position: 'absolute',
                        right: 12,
                        top: '50%',
                        transform: 'translateY(-50%)',
                        background: 'transparent',
                        border: 'none',
                        color: '#787B86',
                        cursor: 'pointer',
                        fontSize: 14,
                      }}
                    >
                      {sifreGoster ? '👁️' : '👁️‍🗨️'}
                    </button>
                  </div>
                </div>

                {/* TELEFON NUMARASI VE YANINDAKİ "KOD GÖNDER" BUTONU */}
                <div>
                  <label style={{ display: 'block', fontSize: 12, color: '#94A3B8', marginBottom: 5, fontWeight: 600 }}>
                    Cep Telefonu Numarası & SMS Doğrulama <span style={{ color: '#F23645' }}>*</span>
                  </label>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'stretch' }}>
                    <input
                      type="tel"
                      value={telefon}
                      onChange={e => handleTelefonDegisim(e.target.value)}
                      placeholder="05XX XXX XX XX"
                      required
                      style={{
                        flex: 1,
                        background: '#1E222D',
                        border: '1px solid #2A2E39',
                        borderRadius: 8,
                        color: '#FFFFFF',
                        padding: '10px 14px',
                        fontSize: 13.5,
                        fontFamily: 'JetBrains Mono, monospace',
                        outline: 'none',
                      }}
                    />
                    <button
                      type="button"
                      onClick={handleSmsKoduGonder}
                      disabled={smsYukleniyor || (smsGonderildi && kalanSure > 0)}
                      style={{
                        padding: '0 16px',
                        borderRadius: 8,
                        border: '1px solid',
                        borderColor: smsGonderildi && kalanSure > 0 ? '#2A2E39' : (secilenBanka.renk || '#2962FF'),
                        background: smsGonderildi && kalanSure > 0 ? 'rgba(42, 46, 57, 0.4)' : (secilenBanka.renk || '#2962FF'),
                        color: smsGonderildi && kalanSure > 0 ? '#94A3B8' : '#FFFFFF',
                        fontSize: 12.5,
                        fontWeight: 700,
                        cursor: (smsYukleniyor || (smsGonderildi && kalanSure > 0)) ? 'not-allowed' : 'pointer',
                        whiteSpace: 'nowrap',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 6,
                        transition: 'all 0.2s ease',
                      }}
                    >
                      {smsYukleniyor ? (
                        'İletiliyor...'
                      ) : smsGonderildi && kalanSure > 0 ? (
                        `⏱️ ${formatZaman(kalanSure)}`
                      ) : smsGonderildi ? (
                        '🔄 Tekrar Gönder'
                      ) : (
                        '📱 Kod Gönder'
                      )}
                    </button>
                  </div>
                  <span style={{ fontSize: 10.5, color: '#64748B', marginTop: 4, display: 'block' }}>
                    Numaranızı yazıp <b>"Kod Gönder"</b> butonuna basınız. 6 haneli güvenlik SMS'i telefonunuza gelecektir.
                  </span>
                </div>

                {/* SMS KODU ALANI (KOD GÖNDER'E BASILDIĞINDA ETKİNLEŞİR) */}
                {smsGonderildi && (
                  <div
                    style={{
                      background: 'rgba(8, 153, 129, 0.08)',
                      border: '1.5px solid rgba(8, 153, 129, 0.4)',
                      borderRadius: 10,
                      padding: '16px 18px',
                      marginTop: 4,
                      animation: 'fadeIn 0.3s ease',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                      <label style={{ fontSize: 12, color: '#FFFFFF', fontWeight: 700 }}>
                        TELEFONA GELEN 6 HANELİ SMS KODU
                      </label>
                      <span style={{ fontSize: 11.5, color: kalanSure < 30 ? '#F23645' : '#D7FF4E', fontWeight: 600 }}>
                        Kalan Süre: {formatZaman(kalanSure)}
                      </span>
                    </div>

                    <input
                      ref={smsInputRef}
                      type="text"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      maxLength={6}
                      value={smsKodu}
                      onChange={e => setSmsKodu(e.target.value.replace(/\D/g, ''))}
                      placeholder="______"
                      required
                      style={{
                        width: '100%',
                        maxWidth: 240,
                        margin: '0 auto',
                        display: 'block',
                        background: '#131722',
                        border: '2px solid #089981',
                        borderRadius: 8,
                        color: '#089981',
                        padding: '10px 14px',
                        fontSize: 26,
                        fontWeight: 800,
                        letterSpacing: 8,
                        textAlign: 'center',
                        fontFamily: 'JetBrains Mono, monospace',
                        outline: 'none',
                      }}
                    />
                    <div style={{ textAlign: 'center', fontSize: 11, color: '#94A3B8', marginTop: 6 }}>
                      {telefonMaskeli} hattınıza gelen 6 haneli kodu buraya girerek aşağıdaki butondan doğrulayınız.
                    </div>
                  </div>
                )}

                {/* VAZGEÇ VE DOĞRULA/BAĞLA BUTONLARI */}
                <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
                  <button
                    type="button"
                    className="arac-btn"
                    onClick={() => setAsama('liste')}
                    style={{ flex: 1, padding: 12 }}
                  >
                    Vazgeç
                  </button>

                  {!smsGonderildi ? (
                    <button
                      type="button"
                      className="arac-btn aktif"
                      onClick={handleSmsKoduGonder}
                      disabled={smsYukleniyor}
                      style={{
                        flex: 2,
                        padding: 12,
                        background: secilenBanka.renk || '#2962FF',
                        borderColor: secilenBanka.renk || '#2962FF',
                        color: '#FFFFFF',
                        fontWeight: 700,
                        cursor: 'pointer',
                      }}
                    >
                      {smsYukleniyor ? 'SMS İletiliyor...' : '📱 Telefona SMS Kodu Gönder'}
                    </button>
                  ) : (
                    <button
                      type="submit"
                      className="arac-btn aktif"
                      disabled={baglanYukleniyor || smsKodu.length !== 6}
                      style={{
                        flex: 2,
                        padding: 12,
                        background: '#089981',
                        borderColor: '#089981',
                        color: '#FFFFFF',
                        fontWeight: 700,
                        cursor: smsKodu.length === 6 ? 'pointer' : 'not-allowed',
                        opacity: smsKodu.length === 6 ? 1 : 0.6,
                      }}
                    >
                      {baglanYukleniyor ? 'Doğrulanıyor...' : '🔒 Kodu Doğrula ve Portföyü Bağla'}
                    </button>
                  )}
                </div>
              </form>
            </div>
          )}

          {/* 3. ADIM: BAĞLANTI KURULUYOR (SPINNER & ADIMLAR) */}
          {asama === 'bekleniyor' && (
            <div style={{ textAlign: 'center', padding: '36px 20px' }}>
              <div
                style={{
                  width: 48,
                  height: 48,
                  border: '3px solid #2A2E39',
                  borderTopColor: '#089981',
                  borderRadius: '50%',
                  margin: '0 auto 20px',
                  animation: 'spin 0.8s linear infinite',
                }}
              />
              <div style={{ color: '#FFFFFF', fontWeight: 700, fontSize: 16, marginBottom: 8 }}>
                {secilenBanka?.ad} Portföyü Aktarılıyor...
              </div>
              <div style={{ color: '#94A3B8', fontSize: 12.5, maxWidth: 400, margin: '0 auto', lineHeight: 1.5 }}>
                {beklemeAdimi === 1 && '1/3: 6 Haneli SMS güvenlik kodu doğrulanıyor...'}
                {beklemeAdimi === 2 && '2/3: Aracı Kurum Açık Bankacılık API oturumu açılıyor...'}
                {beklemeAdimi === 3 && '3/3: BIST hisse pozisyonları, lot adetleri ve bakiye aktarılıyor...'}
              </div>
            </div>
          )}

          {/* 4. ADIM: BAŞARILI */}
          {asama === 'basarili' && (
            <div style={{ textAlign: 'center', padding: '36px 20px' }}>
              <div style={{ fontSize: 50, marginBottom: 14 }}>🎉</div>
              <div style={{ color: '#089981', fontWeight: 800, fontSize: 17, marginBottom: 8 }}>
                Açık Bankacılık Bağlantısı Başarıyla Kuruldu!
              </div>
              <div style={{ color: '#D1D4DC', fontSize: 13, marginBottom: 14, lineHeight: 1.5 }}>
                <b>{secilenBanka?.ad}</b> hisse senedi pozisyonlarınız ve yatırım nakdiniz başarıyla aktarıldı.<br />
                <span style={{ color: '#FF9800', fontSize: 12 }}>
                  🔒 Güvenlik Protokolü: SALT OKUNUR (Read-Only) Mod Aktif.
                </span>
              </div>
              <div style={{ fontSize: 11.5, color: '#787B86' }}>
                Gerçek portföy görünümüne yönlendiriliyorsunuz...
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

import React, { useState, useEffect } from 'react';
import Logo from '../components/Logo.jsx';

export default function GirisEkrani({ onGiris }) {
  const [kayitModu, setKayitModu] = useState(false);
  const [dogrulamaAsamasi, setDogrulamaAsamasi] = useState(false);
  const [sifremiUnuttumModu, setSifremiUnuttumModu] = useState(false);
  const [sifremiUnuttumAsama, setSifremiUnuttumAsama] = useState(1); // 1: E-posta gir, 2: Kod ve yeni şifre

  const [email, setEmail] = useState(() => {
    try {
      return localStorage.getItem('plutos_hatirla_email') || '';
    } catch {
      return '';
    }
  });
  const [password, setPassword] = useState('');
  const [ad, setAd] = useState('');
  const [soyad, setSoyad] = useState('');
  const [kod, setKod] = useState('');
  const [yeniSifre, setYeniSifre] = useState('');
  const [sifreGoster, setSifreGoster] = useState(false);
  const [beniHatirla, setBeniHatirla] = useState(() => {
    try {
      return localStorage.getItem('plutos_beni_hatirla') === 'true';
    } catch {
      return true;
    }
  });

  const [hata, setHata] = useState('');
  const [bilgiMesaji, setBilgiMesaji] = useState('');
  const [yukleniyor, setYukleniyor] = useState(false);
  const [piyasaOzeti, setPiyasaOzeti] = useState(null);
  const [ozetKartlar, setOzetKartlar] = useState([]);
  const [capsLockAcik, setCapsLockAcik] = useState(false);

  // 10 dakikalık geri sayım sayacı
  const [kalanSure, setKalanSure] = useState(600);

  // Şifre gücü analizi
  const sifreGucuHesapla = (s) => {
    if (!s) return { skor: 0, yuzde: 0, metin: '', renk: '#787B86' };
    let skor = 0;
    if (s.length >= 6) skor += 1;
    if (s.length >= 8) skor += 1;
    if (/[0-9]/.test(s)) skor += 1;
    if (/[A-Z]/.test(s) && /[^A-Za-z0-9]/.test(s)) skor += 1;

    if (skor <= 1) return { skor: 1, yuzde: 33, metin: 'Zayıf', renk: '#F23645' };
    if (skor <= 2) return { skor: 2, yuzde: 66, metin: 'Orta', renk: '#FF9800' };
    return { skor: 3, yuzde: 100, metin: 'Güçlü (Güvenli)', renk: '#089981' };
  };

  const handleKeyModifier = (e) => {
    if (e.getModifierState) {
      setCapsLockAcik(e.getModifierState('CapsLock'));
    }
  };

  // Halka açık canlı BIST piyasa özetini çek
  useEffect(() => {
    fetch('/api/public/market-summary')
      .then(r => r.json())
      .then(d => {
        if (d?.bist100) setPiyasaOzeti(d.bist100);
        if (d?.ozet_kartlar) setOzetKartlar(d.ozet_kartlar);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    let sayac = null;
    if ((dogrulamaAsamasi || sifremiUnuttumAsama === 2) && kalanSure > 0) {
      sayac = setInterval(() => {
        setKalanSure(s => s - 1);
      }, 1000);
    }
    return () => {
      if (sayac) clearInterval(sayac);
    };
  }, [dogrulamaAsamasi, sifremiUnuttumAsama, kalanSure]);

  const sureFormatla = (saniye) => {
    const d = Math.floor(saniye / 60);
    const s = saniye % 60;
    return `${d.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  // 1. GİRİŞ YAP
  const girisYap = async (ozelEmail, ozelSifre) => {
    setHata('');
    setBilgiMesaji('');
    const gEmail = (ozelEmail || email).trim().toLowerCase();
    const gSifre = ozelSifre || password;

    if (!gEmail || !gSifre) {
      setHata('E-posta ve şifre zorunludur.');
      return;
    }

    if (beniHatirla) {
      localStorage.setItem('plutos_hatirla_email', gEmail);
      localStorage.setItem('plutos_beni_hatirla', 'true');
    } else {
      localStorage.removeItem('plutos_hatirla_email');
      localStorage.setItem('plutos_beni_hatirla', 'false');
    }

    setYukleniyor(true);
    try {
      const r = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: gEmail, password: gSifre }),
      });
      const veri = await r.json();
      if (!r.ok) {
        setHata(veri.detail || 'Giriş yapılamadı.');
        return;
      }
      onGiris(veri.token, veri.ad || ad, veri.soyad || soyad);
    } catch {
      setHata('Sunucuya bağlanılamadı. Lütfen internet bağlantınızı kontrol ediniz.');
    } finally {
      setYukleniyor(false);
    }
  };

  // 2. KAYIT: DOĞRULAMA KODU GÖNDER
  const kodGonder = async () => {
    setHata('');
    setBilgiMesaji('');

    const gEmail = email.trim().toLowerCase();
    if (!gEmail) {
      setHata('Lütfen geçerli bir e-posta adresi giriniz.');
      return;
    }
    if (!/\S+@\S+\.\S+/.test(gEmail)) {
      setHata('Lütfen geçerli bir e-posta formatı giriniz (örn: trader@kurum.com).');
      return;
    }
    if (!ad.trim() || !soyad.trim()) {
      setHata('Lütfen adınızı ve soyadınızı belirtiniz.');
      return;
    }
    if (password.length < 6) {
      setHata('Şifreniz en az 6 karakterden oluşmalıdır.');
      return;
    }

    setYukleniyor(true);
    try {
      const r = await fetch('/api/auth/send-verification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: gEmail,
          password,
          ad: ad.trim(),
          soyad: soyad.trim(),
        }),
      });
      const veri = await r.json();

      if (!r.ok) {
        setHata(veri.detail || 'Doğrulama kodu gönderilemedi.');
        return;
      }

      setBilgiMesaji(veri.message || `${gEmail} adresine 6 haneli doğrulama kodu gönderildi.`);
      if (veri.dev_kod) {
        setKod(veri.dev_kod);
      }
      setKalanSure(600);
      setDogrulamaAsamasi(true);
    } catch {
      setHata('Doğrulama servisine ulaşılamadı. Lütfen tekrar deneyiniz.');
    } finally {
      setYukleniyor(false);
    }
  };

  // 3. KODU DOĞRULA VE KAYIT OL
  const koduOnayla = async () => {
    setHata('');
    const temizKod = kod.trim();
    if (temizKod.length !== 6) {
      setHata('Lütfen 6 haneli doğrulama kodunu eksiksiz giriniz.');
      return;
    }

    setYukleniyor(true);
    try {
      const r = await fetch('/api/auth/verify-and-register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: email.trim().toLowerCase(),
          code: temizKod,
        }),
      });
      const veri = await r.json();

      if (!r.ok) {
        setHata(veri.detail || 'Doğrulama kodu geçersiz.');
        return;
      }

      onGiris(veri.token, veri.ad || ad, veri.soyad || soyad);
    } catch {
      setHata('Doğrulama onaylanırken bir hata oluştu.');
    } finally {
      setYukleniyor(false);
    }
  };

  // 4. ŞİFREMİ UNUTTUM: KOD İSTE
  const sifreSifirlamaKoduGonder = async () => {
    setHata('');
    setBilgiMesaji('');
    const gEmail = email.trim().toLowerCase();
    if (!gEmail || !/\S+@\S+\.\S+/.test(gEmail)) {
      setHata('Lütfen geçerli bir e-posta adresi giriniz.');
      return;
    }

    setYukleniyor(true);
    try {
      const r = await fetch('/api/auth/forgot-password/send-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: gEmail }),
      });
      const veri = await r.json();
      if (!r.ok) {
        setHata(veri.detail || 'Kod gönderilemedi.');
        return;
      }
      setBilgiMesaji(veri.message || 'Sıfırlama kodu gönderildi.');
      if (veri.dev_kod) {
        setKod(veri.dev_kod);
      }
      setKalanSure(600);
      setSifremiUnuttumAsama(2);
    } catch {
      setHata('Şifre sıfırlama servisine ulaşılamadı.');
    } finally {
      setYukleniyor(false);
    }
  };

  // 5. ŞİFREMİ UNUTTUM: KODU ONAYLA VE YENİ ŞİFRE BELİRLE
  const sifreyiYenile = async () => {
    setHata('');
    if (kod.trim().length !== 6) {
      setHata('Lütfen 6 haneli doğrulama kodunu giriniz.');
      return;
    }
    if (yeniSifre.length < 6) {
      setHata('Yeni şifreniz en az 6 karakter olmalıdır.');
      return;
    }

    setYukleniyor(true);
    try {
      const r = await fetch('/api/auth/forgot-password/reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: email.trim().toLowerCase(),
          code: kod.trim(),
          new_password: yeniSifre,
        }),
      });
      const veri = await r.json();
      if (!r.ok) {
        setHata(veri.detail || 'Şifre sıfırlanamadı.');
        return;
      }
      onGiris(veri.token, veri.ad || '', veri.soyad || '');
    } catch {
      setHata('Şifre yenilenirken bağlantı hatası oluştu.');
    } finally {
      setYukleniyor(false);
    }
  };

  return (
    <div
      className="login-wrap"
      style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#0b0e14',
        padding: '20px 16px',
        position: 'relative',
      }}
    >
      {/* Üst Canlı BIST 100 Mini Rozeti */}
      {piyasaOzeti && (
        <div
          style={{
            marginBottom: 16,
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            background: 'rgba(19, 23, 34, 0.85)',
            border: '1px solid #2a2e39',
            borderRadius: 20,
            padding: '5px 14px',
            fontSize: 11.5,
            color: '#D1D4DC',
            backdropFilter: 'blur(8px)',
          }}
        >
          <span style={{ color: '#089981' }}>●</span>
          <span>{piyasaOzeti.endeks}: <b style={{ color: '#FFFFFF', fontFamily: 'JetBrains Mono' }}>{piyasaOzeti.puan}</b></span>
          <span style={{ color: '#089981', fontWeight: 700 }}>{piyasaOzeti.degisim}</span>
          <span style={{ color: '#555a65' }}>•</span>
          <span style={{ color: '#787B86', fontSize: 10.5 }}>{piyasaOzeti.seans_durumu}</span>
        </div>
      )}

      <div
        className="login-card"
        style={{
          width: '100%',
          maxWidth: 420,
          background: '#131722',
          border: '1px solid #2a2e39',
          borderRadius: 14,
          padding: '28px 24px',
          boxShadow: '0 16px 40px rgba(0,0,0,0.6)',
          display: 'flex',
          flexDirection: 'column',
          gap: 16,
        }}
      >
        {/* Üst Logo ve Güvenlik Rozeti */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #2a2e39', paddingBottom: 14 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Logo size={30} />
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ fontSize: 18, fontWeight: 800, letterSpacing: '0.05em', color: '#f0f3fa' }}>PLUTOS</span>
                <span style={{ fontSize: 9.5, color: '#2962FF', fontWeight: 700, background: 'rgba(41, 98, 255, 0.15)', padding: '2px 6px', borderRadius: 4 }}>
                  WORKSTATION
                </span>
              </div>
              <div style={{ fontSize: 9.5, color: '#787B86' }}>BIST Pay Piyasası & Algoritmik Analiz</div>
            </div>
          </div>
          <span style={{ fontSize: 11, color: '#089981', display: 'flex', alignItems: 'center', gap: 4, background: 'rgba(8, 153, 129, 0.1)', padding: '3px 8px', borderRadius: 6, border: '1px solid rgba(8, 153, 129, 0.3)' }}>
            <span>🔒</span> SSL-256
          </span>
        </div>

        {/* 1. DURUM: ŞİFREMİ UNUTTUM EKRANI */}
        {sifremiUnuttumModu ? (
          <>
            <div>
              <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: '#f0f3fa', display: 'flex', alignItems: 'center', gap: 8 }}>
                <span>🔑</span>
                <span>Şifre Sıfırlama</span>
              </h2>
              <p style={{ margin: '6px 0 0 0', fontSize: 12, color: '#9CA3AF', lineHeight: 1.4 }}>
                {sifremiUnuttumAsama === 1
                  ? 'Kayıtlı kurumsal e-posta adresinizi girin, doğrulama kodu gönderelim.'
                  : `${email} adresine gönderilen 6 haneli kodu ve yeni şifrenizi giriniz.`}
              </p>
            </div>

            {sifremiUnuttumAsama === 1 ? (
              <div>
                <label style={{ fontSize: 11.5, color: '#787b86', display: 'block', marginBottom: 4 }}>Kayıtlı E-posta Adresi</label>
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="trader@kurum.com"
                  style={{ width: '100%' }}
                />
                <button
                  className="primary"
                  onClick={sifreSifirlamaKoduGonder}
                  disabled={yukleniyor}
                  style={{ width: '100%', padding: '12px 0', borderRadius: 6, fontWeight: 700, fontSize: 13, marginTop: 12 }}
                >
                  {yukleniyor ? 'Gönderiliyor…' : 'Doğrulama Kodu Gönder →'}
                </button>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                    <label style={{ fontSize: 11.5, color: '#787b86' }}>6 Haneli Doğrulama Kodu</label>
                    <span style={{ fontSize: 11, color: kalanSure > 60 ? '#10B981' : '#EF4444', fontFamily: 'monospace', fontWeight: 700 }}>
                      ⏱️ {sureFormatla(kalanSure)}
                    </span>
                  </div>
                  <input
                    type="text"
                    maxLength={6}
                    value={kod}
                    onChange={e => setKod(e.target.value.replace(/\D/g, ''))}
                    placeholder="••••••"
                    style={{ width: '100%', textAlign: 'center', fontSize: 20, letterSpacing: 8, fontFamily: 'monospace' }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: 11.5, color: '#787b86', display: 'block', marginBottom: 4 }}>Yeni Şifre (En az 6 karakter)</label>
                  <input
                    type={sifreGoster ? 'text' : 'password'}
                    value={yeniSifre}
                    onChange={e => setYeniSifre(e.target.value)}
                    onKeyUp={handleKeyModifier}
                    onKeyDown={handleKeyModifier}
                    placeholder="••••••••"
                    style={{ width: '100%' }}
                  />
                  {capsLockAcik && (
                    <div style={{ fontSize: 11, color: '#FF9800', marginTop: 4, display: 'flex', alignItems: 'center', gap: 4 }}>
                      <span>⚠️</span> <span>Caps Lock (Büyük Harf) Açık</span>
                    </div>
                  )}
                  {yeniSifre && (
                    <div style={{ marginTop: 6 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, marginBottom: 3 }}>
                        <span style={{ color: '#787B86' }}>Şifre Gücü:</span>
                        <span style={{ color: sifreGucuHesapla(yeniSifre).renk, fontWeight: 700 }}>
                          {sifreGucuHesapla(yeniSifre).metin}
                        </span>
                      </div>
                      <div style={{ height: 4, background: '#1e222d', borderRadius: 2, overflow: 'hidden' }}>
                        <div
                          style={{
                            height: '100%',
                            width: `${sifreGucuHesapla(yeniSifre).yuzde}%`,
                            background: sifreGucuHesapla(yeniSifre).renk,
                            transition: 'all 0.3s ease',
                          }}
                        />
                      </div>
                    </div>
                  )}
                </div>
                <button
                  className="primary"
                  onClick={sifreyiYenile}
                  disabled={yukleniyor}
                  style={{ width: '100%', padding: '12px 0', borderRadius: 6, fontWeight: 700, fontSize: 13, marginTop: 4 }}
                >
                  {yukleniyor ? 'Yenileniyor…' : 'Şifreyi Güncelle ve Giriş Yap 🚀'}
                </button>
              </div>
            )}

            <div style={{ textAlign: 'center', borderTop: '1px solid #2a2e39', paddingTop: 12, marginTop: 6 }}>
              <button
                type="button"
                onClick={() => { setSifremiUnuttumModu(false); setSifremiUnuttumAsama(1); setHata(''); setBilgiMesaji(''); }}
                style={{ background: 'transparent', border: 'none', color: '#2962FF', cursor: 'pointer', fontSize: 12, fontWeight: 600 }}
              >
                ← Giriş Ekranına Geri Dön
              </button>
            </div>
          </>
        ) : dogrulamaAsamasi ? (
          /* 2. DURUM: E-POSTA DOĞRULAMA KODU GİRİŞ EKRANI (KAYIT AKIŞI) */
          <>
            <div>
              <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: '#f0f3fa', display: 'flex', alignItems: 'center', gap: 8 }}>
                <span>📬</span>
                <span>E-Posta Doğrulaması</span>
              </h2>
              <p style={{ margin: '6px 0 0 0', fontSize: 12, color: '#9CA3AF', lineHeight: 1.4 }}>
                <b style={{ color: '#D7FF4E' }}>{email}</b> adresinize 6 haneli tek kullanımlık güvenlik kodu gönderdik.
              </p>
            </div>

            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                <label style={{ fontSize: 11.5, color: '#787b86', fontWeight: 600 }}>6 Haneli Doğrulama Kodu</label>
                <span style={{ fontSize: 11.5, color: kalanSure > 60 ? '#10B981' : '#EF4444', fontFamily: 'monospace', fontWeight: 700 }}>
                  ⏱️ {sureFormatla(kalanSure)}
                </span>
              </div>
              <input
                type="text"
                maxLength={6}
                inputMode="numeric"
                autoFocus
                value={kod}
                onChange={e => setKod(e.target.value.replace(/\D/g, ''))}
                placeholder="••••••"
                onKeyDown={e => { if (e.key === 'Enter') koduOnayla(); }}
                style={{
                  width: '100%',
                  textAlign: 'center',
                  fontSize: 24,
                  letterSpacing: 10,
                  fontFamily: 'JetBrains Mono, monospace',
                  fontWeight: 700,
                  padding: '10px 0',
                  color: '#D7FF4E',
                  background: '#0E1118',
                  border: '1px solid #2962FF',
                  borderRadius: 8,
                }}
              />
            </div>

            <button
              className="primary"
              onClick={koduOnayla}
              disabled={yukleniyor || kod.length !== 6 || kalanSure <= 0}
              style={{ width: '100%', padding: '12px 0', borderRadius: 6, fontWeight: 700, fontSize: 13, marginTop: 4 }}
            >
              {yukleniyor ? 'Doğrulanıyor…' : 'Kodu Onayla ve Hesabı Aç 🚀'}
            </button>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 12, marginTop: 4 }}>
              <button
                type="button"
                onClick={kodGonder}
                disabled={yukleniyor}
                style={{ background: 'transparent', border: 'none', color: '#2962FF', cursor: 'pointer', padding: 0, fontWeight: 600 }}
              >
                🔄 Kodu Tekrar Gönder
              </button>

              <button
                type="button"
                onClick={() => { setDogrulamaAsamasi(false); setKod(''); setHata(''); }}
                style={{ background: 'transparent', border: 'none', color: '#787B86', cursor: 'pointer', padding: 0 }}
              >
                ← Bilgileri Değiştir
              </button>
            </div>
          </>
        ) : (
          /* 3. DURUM: STANDART GİRİŞ VEYA KAYIT EKRANI */
          <>
            <div>
              <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: '#f0f3fa' }}>
                {kayitModu ? 'Kurumsal Hesap Oluştur' : 'İşlem Masası Girişi'}
              </h2>
              <p style={{ margin: '4px 0 0 0', fontSize: 12, color: '#787b86' }}>
                {kayitModu
                  ? 'BIST Gerçek Zamanlı Terminal Hesabınızı Başlatın'
                  : 'BIST Algo-Trading, Fraktal Analiz ve Portföy Terminali'}
              </p>
            </div>

            {kayitModu && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div>
                  <label style={{ fontSize: 11, color: '#787b86' }}>Ad</label>
                  <input
                    value={ad}
                    onChange={e => setAd(e.target.value)}
                    placeholder="Adınız"
                    style={{ width: '100%', marginTop: 4 }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: 11, color: '#787b86' }}>Soyad</label>
                  <input
                    value={soyad}
                    onChange={e => setSoyad(e.target.value)}
                    placeholder="Soyadınız"
                    style={{ width: '100%', marginTop: 4 }}
                  />
                </div>
              </div>
            )}

            <div>
              <label style={{ fontSize: 11, color: '#787b86' }}>Kurumsal E-posta</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="trader@kurum.com"
                style={{ width: '100%', marginTop: 4 }}
              />
            </div>

            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <label style={{ fontSize: 11, color: '#787b86' }}>Şifre {kayitModu && '(En az 6 karakter)'}</label>
                {!kayitModu && (
                  <a
                    onClick={() => { setSifremiUnuttumModu(true); setHata(''); setBilgiMesaji(''); }}
                    style={{ fontSize: 11, color: '#2962FF', cursor: 'pointer', fontWeight: 500 }}
                  >
                    Şifremi Unuttum?
                  </a>
                )}
              </div>
              <div style={{ position: 'relative', marginTop: 4 }}>
                <input
                  type={sifreGoster ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  onKeyUp={handleKeyModifier}
                  onKeyDown={handleKeyModifier}
                  placeholder="••••••••"
                  onKeyDownCapture={e => {
                    if (e.key === 'Enter') {
                      if (kayitModu) kodGonder();
                      else girisYap();
                    }
                  }}
                  style={{ width: '100%', paddingRight: 40 }}
                />
                <button
                  type="button"
                  onClick={() => setSifreGoster(g => !g)}
                  style={{
                    position: 'absolute',
                    right: 8,
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'transparent',
                    border: 'none',
                    color: '#787B86',
                    cursor: 'pointer',
                    fontSize: 14,
                    padding: 4,
                  }}
                  title={sifreGoster ? 'Şifreyi Gizle' : 'Şifreyi Göster'}
                >
                  {sifreGoster ? '👁️‍🗨️' : '👁️'}
                </button>
              </div>
              {capsLockAcik && (
                <div style={{ fontSize: 11, color: '#FF9800', marginTop: 4, display: 'flex', alignItems: 'center', gap: 4 }}>
                  <span>⚠️</span> <span>Caps Lock (Büyük Harf) Açık</span>
                </div>
              )}
              {kayitModu && password && (
                <div style={{ marginTop: 6 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, marginBottom: 3 }}>
                    <span style={{ color: '#787B86' }}>Şifre Gücü:</span>
                    <span style={{ color: sifreGucuHesapla(password).renk, fontWeight: 700 }}>
                      {sifreGucuHesapla(password).metin}
                    </span>
                  </div>
                  <div style={{ height: 4, background: '#1e222d', borderRadius: 2, overflow: 'hidden' }}>
                    <div
                      style={{
                        height: '100%',
                        width: `${sifreGucuHesapla(password).yuzde}%`,
                        background: sifreGucuHesapla(password).renk,
                        transition: 'all 0.3s ease',
                      }}
                    />
                  </div>
                </div>
              )}
            </div>

            {!kayitModu && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: '#B2B5BE' }}>
                <input
                  type="checkbox"
                  id="beniHatirlaChk"
                  checked={beniHatirla}
                  onChange={e => setBeniHatirla(e.target.checked)}
                  style={{ cursor: 'pointer' }}
                />
                <label htmlFor="beniHatirlaChk" style={{ cursor: 'pointer', userSelect: 'none' }}>
                  E-posta adresimi bu cihazda hatırla
                </label>
              </div>
            )}

            <button
              className="primary"
              onClick={() => {
                if (kayitModu) kodGonder();
                else girisYap();
              }}
              disabled={yukleniyor}
              style={{ width: '100%', padding: '12px 0', borderRadius: 6, fontWeight: 700, fontSize: 13, marginTop: 4 }}
            >
              {yukleniyor
                ? 'İşleniyor…'
                : kayitModu
                ? 'E-Posta Doğrulama Kodu Al →'
                : 'Terminale Giriş Yap'}
            </button>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid #2a2e39', paddingTop: 14, fontSize: 12, color: '#787b86' }}>
              {kayitModu ? (
                <span>
                  Zaten hesabınız var mı?{' '}
                  <a
                    onClick={() => { setKayitModu(false); setHata(''); setBilgiMesaji(''); }}
                    style={{ color: '#2962FF', cursor: 'pointer', fontWeight: 600 }}
                  >
                    Giriş Yap
                  </a>
                </span>
              ) : (
                <span>
                  Yeni trader hesabı mı?{' '}
                  <a
                    onClick={() => { setKayitModu(true); setHata(''); setBilgiMesaji(''); }}
                    style={{ color: '#2962FF', cursor: 'pointer', fontWeight: 600 }}
                  >
                    Kayıt Ol
                  </a>
                </span>
              )}
            </div>
          </>
        )}

        {/* Başarı & Hata Bildirimleri */}
        {bilgiMesaji && (
          <div style={{ background: 'rgba(8, 153, 129, 0.15)', border: '1px solid #089981', color: '#34D399', padding: '8px 12px', borderRadius: 6, fontSize: 12 }}>
            ✓ {bilgiMesaji}
          </div>
        )}

        {hata && (
          <div className="error-msg" style={{ fontSize: 12, padding: '8px 12px', borderRadius: 6 }}>
            {hata}
          </div>
        )}
      </div>

      {/* Canlı BIST & Piyasa Nabzı Mini Kartları */}
      {ozetKartlar && ozetKartlar.length > 0 && (
        <div
          style={{
            width: '100%',
            maxWidth: 420,
            display: 'grid',
            gridTemplateColumns: 'repeat(2, 1fr)',
            gap: 8,
            marginTop: 14,
          }}
        >
          {ozetKartlar.map(k => (
            <div
              key={k.sembol}
              style={{
                background: 'rgba(19, 23, 34, 0.75)',
                border: '1px solid #2a2e39',
                borderRadius: 8,
                padding: '8px 10px',
                display: 'flex',
                flexDirection: 'column',
                gap: 2,
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 11, color: '#787B86', fontWeight: 600 }}>{k.sembol}</span>
                <span style={{ fontSize: 10.5, color: k.yukari ? '#089981' : '#F23645', fontWeight: 700 }}>
                  {k.degisim}
                </span>
              </div>
              <span style={{ fontSize: 13, fontWeight: 700, color: '#f0f3fa', fontFamily: 'JetBrains Mono' }}>
                {k.deger}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Alt Bilgi & Yasal Uyarı */}
      <div style={{ marginTop: 18, textAlign: 'center', fontSize: 11, color: '#555a65', maxWidth: 420 }}>
        🔒 256-Bit Uçtan Uca Şifreli Bağlantı • Borsa İstanbul Veri Yayın Lisansı Uyarınca Sunulmaktadır
      </div>
    </div>
  );
}

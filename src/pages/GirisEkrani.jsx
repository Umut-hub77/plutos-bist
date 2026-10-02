import React, { useState, useEffect } from 'react';
import Logo from '../components/Logo.jsx';

export default function GirisEkrani({ onGiris }) {
  const [kayitModu, setKayitModu] = useState(false);
  const [dogrulamaAsamasi, setDogrulamaAsamasi] = useState(false);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [ad, setAd] = useState('');
  const [soyad, setSoyad] = useState('');
  const [kod, setKod] = useState('');

  const [hata, setHata] = useState('');
  const [bilgiMesaji, setBilgiMesaji] = useState('');
  const [devKod, setDevKod] = useState('');
  const [yukleniyor, setYukleniyor] = useState(false);

  // 10 dakikalık geri sayım sayacı
  const [kalanSure, setKalanSure] = useState(600);

  useEffect(() => {
    let sayac = null;
    if (dogrulamaAsamasi && kalanSure > 0) {
      sayac = setInterval(() => {
        setKalanSure(s => s - 1);
      }, 1000);
    }
    return () => {
      if (sayac) clearInterval(sayac);
    };
  }, [dogrulamaAsamasi, kalanSure]);

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
    } catch (e) {
      setHata('Sunucuya bağlanılamadı. Backend servisinin açık olduğundan emin olun.');
    } finally {
      setYukleniyor(false);
    }
  };

  // 2. DOĞRULAMA KODU GÖNDER (Aynı e-posta kontrolü backend'de yapılır)
  const kodGonder = async () => {
    setHata('');
    setBilgiMesaji('');
    setDevKod('');

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

      setBilgiMesaji(veri.message || `${gEmail} adresine 6 haneli doğrulama kodu iletildi.`);
      if (veri.dev_code) {
        setDevKod(veri.dev_code);
      }
      setKalanSure(600);
      setDogrulamaAsamasi(true);
    } catch (e) {
      setHata('Doğrulama servisine ulaşılamadı. Lütfen internet bağlantınızı kontrol edin.');
    } finally {
      setYukleniyor(false);
    }
  };

  // 3. KODU DOĞRULA VE HESABI AÇ
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
    } catch (e) {
      setHata('Doğrulama onaylanırken bir hata oluştu.');
    } finally {
      setYukleniyor(false);
    }
  };

  const demoGiris = () => {
    setEmail('trader@plutos.com');
    setPassword('Plutos2026!');
    girisYap('trader@plutos.com', 'Plutos2026!');
  };

  return (
    <div className="login-wrap" style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0b0e14', padding: 16 }}>
      <div
        className="login-card"
        style={{
          width: '100%',
          maxWidth: 420,
          background: '#131722',
          border: '1px solid #2a2e39',
          borderRadius: 12,
          padding: '28px 24px',
          boxShadow: '0 12px 36px rgba(0,0,0,0.5)',
          display: 'flex',
          flexDirection: 'column',
          gap: 16,
        }}
      >
        {/* Üst Logo ve Güvenlik Rozeti */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #2a2e39', paddingBottom: 14 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Logo size={28} />
            <div>
              <span style={{ fontSize: 18, fontWeight: 800, letterSpacing: '0.05em', color: '#f0f3fa' }}>PLUTOS</span>
              <span style={{ fontSize: 10, color: '#2962FF', fontWeight: 700, marginLeft: 6, background: 'rgba(41, 98, 255, 0.15)', padding: '2px 6px', borderRadius: 4 }}>
                INSTITUTIONAL
              </span>
            </div>
          </div>
          <span style={{ fontSize: 11, color: '#089981', display: 'flex', alignItems: 'center', gap: 4 }}>
            <span>🔒</span> SSL-256
          </span>
        </div>

        {/* 1. DURUM: E-POSTA DOĞRULAMA KODU GİRİŞ EKRANI */}
        {dogrulamaAsamasi ? (
          <>
            <div>
              <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: '#f0f3fa', display: 'flex', alignItems: 'center', gap: 8 }}>
                <span>📬</span>
                <span>E-Posta Doğrulaması</span>
              </h2>
              <p style={{ margin: '6px 0 0 0', fontSize: 12.5, color: '#9CA3AF', lineHeight: 1.5 }}>
                <b style={{ color: '#D7FF4E' }}>{email}</b> adresinize 6 haneli tek kullanımlık güvenlik kodu gönderdik.
              </p>
            </div>

            {/* Test / Geliştirici Bilgilendirme Kutusu (SMTP tanımlanmadıysa gösterilir) */}
            {devKod && (
              <div
                style={{
                  background: 'rgba(41, 98, 255, 0.12)',
                  border: '1px solid rgba(41, 98, 255, 0.35)',
                  borderRadius: 8,
                  padding: '10px 12px',
                  fontSize: 12,
                  color: '#93C5FD',
                }}
              >
                <div style={{ fontWeight: 700, color: '#D7FF4E', marginBottom: 2 }}>💡 Test / Geliştirici Kodu:</div>
                <div>Kodunuz: <b style={{ fontSize: 15, letterSpacing: 2, color: '#FFFFFF', fontFamily: 'monospace' }}>{devKod}</b></div>
                <div style={{ fontSize: 10.5, color: '#94A3B8', marginTop: 4 }}>
                  (Kodu kopyalayıp aşağıdaki kutucuğa yapıştırabilirsiniz.)
                </div>
              </div>
            )}

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
          /* 2. DURUM: STANDART GİRİŞ VEYA KAYIT EKRANI */
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
              <label style={{ fontSize: 11, color: '#787b86' }}>Şifre {kayitModu && '(En az 6 karakter)'}</label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                onKeyDown={e => {
                  if (e.key === 'Enter') {
                    if (kayitModu) kodGonder();
                    else girisYap();
                  }
                }}
                style={{ width: '100%', marginTop: 4 }}
              />
            </div>

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

            {!kayitModu && (
              <button
                type="button"
                onClick={demoGiris}
                disabled={yukleniyor}
                style={{
                  width: '100%',
                  padding: '10px 0',
                  borderRadius: 6,
                  fontSize: 12,
                  fontWeight: 600,
                  background: 'rgba(41, 98, 255, 0.12)',
                  color: '#2962FF',
                  border: '1px solid rgba(41, 98, 255, 0.3)',
                  cursor: 'pointer',
                }}
              >
                ⚡ Demo Portföy ile Hızlı Başlat
              </button>
            )}

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
    </div>
  );
}

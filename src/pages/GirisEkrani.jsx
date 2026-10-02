import React, { useState } from 'react';
import Logo from '../components/Logo.jsx';

export default function GirisEkrani({ onGiris }) {
  const [kayitModu, setKayitModu] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [ad, setAd] = useState('');
  const [soyad, setSoyad] = useState('');
  const [hata, setHata] = useState('');
  const [yukleniyor, setYukleniyor] = useState(false);

  const gonder = async (ozelEmail, ozelSifre) => {
    setHata('');
    const gEmail = ozelEmail || email;
    const gSifre = ozelSifre || password;

    if (!gEmail || !gSifre) {
      setHata('E-posta ve şifre gerekli.');
      return;
    }

    setYukleniyor(true);
    try {
      const yol = kayitModu ? '/api/register' : '/api/login';
      const govde = kayitModu ? { email: gEmail, password: gSifre, ad, soyad } : { email: gEmail, password: gSifre };
      const r = await fetch(yol, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(govde),
      });
      const veri = await r.json();
      if (!r.ok) {
        setHata(veri.detail || 'Giriş yapılamadı.');
        return;
      }
      onGiris(veri.token, veri.ad || ad, veri.soyad || soyad);
    } catch (e) {
      setHata('Sunucuya bağlanılamadı. Backend çalışıyor mu?');
    } finally {
      setYukleniyor(false);
    }
  };

  const demoGiris = () => {
    setEmail('trader@plutos.com');
    setPassword('Plutos2026!');
    gonder('trader@plutos.com', 'Plutos2026!');
  };

  return (
    <div className="login-wrap" style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0b0e14', padding: 20 }}>
      <div
        className="login-card"
        style={{
          width: '100%',
          maxWidth: 420,
          background: '#131722',
          border: '1px solid #2a2e39',
          borderRadius: 12,
          padding: 32,
          boxShadow: '0 12px 36px rgba(0,0,0,0.5)',
          display: 'flex',
          flexDirection: 'column',
          gap: 16
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #2a2e39', paddingBottom: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Logo size={30} />
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

        <div>
          <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: '#f0f3fa' }}>
            {kayitModu ? 'Kurumsal Hesap Oluştur' : 'İşlem Masası Girişi'}
          </h2>
          <p style={{ margin: '4px 0 0 0', fontSize: 12, color: '#787b86' }}>
            BIST Algo-Trading, Fraktal Analiz ve Portföy Terminali
          </p>
        </div>

        {kayitModu && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <div>
              <label style={{ fontSize: 11, color: '#787b86' }}>Ad</label>
              <input value={ad} onChange={e => setAd(e.target.value)} placeholder="Adınız" style={{ width: '100%', marginTop: 4 }} />
            </div>
            <div>
              <label style={{ fontSize: 11, color: '#787b86' }}>Soyad</label>
              <input value={soyad} onChange={e => setSoyad(e.target.value)} placeholder="Soyadınız" style={{ width: '100%', marginTop: 4 }} />
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
          <label style={{ fontSize: 11, color: '#787b86' }}>Şifre</label>
          <input
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            placeholder="••••••••"
            onKeyDown={e => { if (e.key === 'Enter') gonder(); }}
            style={{ width: '100%', marginTop: 4 }}
          />
        </div>

        <button
          className="primary"
          onClick={() => gonder()}
          disabled={yukleniyor}
          style={{ width: '100%', padding: '12px 0', borderRadius: 6, fontWeight: 700, fontSize: 13, marginTop: 4 }}
        >
          {yukleniyor ? 'Kimlik Doğrulanıyor…' : (kayitModu ? 'Hesabı Aç' : 'Terminale Giriş Yap')}
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
              cursor: 'pointer'
            }}
          >
            ⚡ Demo Portföy ile Hızlı Başlat
          </button>
        )}

        {hata && <div className="error-msg" style={{ fontSize: 12 }}>{hata}</div>}

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid #2a2e39', paddingTop: 14, fontSize: 12, color: '#787b86' }}>
          {kayitModu ? (
            <span>Zaten hesabınız var mı? <a onClick={() => setKayitModu(false)} style={{ color: '#2962FF', cursor: 'pointer', fontWeight: 600 }}>Giriş Yap</a></span>
          ) : (
            <span>Yeni trader hesabı mı? <a onClick={() => setKayitModu(true)} style={{ color: '#2962FF', cursor: 'pointer', fontWeight: 600 }}>Kayıt Ol</a></span>
          )}
        </div>
      </div>
    </div>
  );
}

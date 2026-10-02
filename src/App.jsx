import React, { useState, useCallback } from 'react';
import GirisEkrani from './pages/GirisEkrani.jsx';
import Shell from './Shell.jsx';

// Token localStorage'da tutulur, sayfa yenilense de oturum kalır.
export default function App() {
  const [token, setToken] = useState(() => localStorage.getItem('plutos_token'));
  const [ad, setAd] = useState(() => localStorage.getItem('plutos_ad') || '');
  const [soyad, setSoyad] = useState(() => localStorage.getItem('plutos_soyad') || '');

  const girisYap = (yeniToken, yeniAd, yeniSoyad) => {
    localStorage.setItem('plutos_token', yeniToken);
    localStorage.setItem('plutos_ad', yeniAd || '');
    localStorage.setItem('plutos_soyad', yeniSoyad || '');
    setToken(yeniToken); setAd(yeniAd || ''); setSoyad(yeniSoyad || '');
  };

  const cikisYap = useCallback(() => {
    localStorage.removeItem('plutos_token');
    localStorage.removeItem('plutos_ad');
    localStorage.removeItem('plutos_soyad');
    setToken(null);
  }, []);

  if (!token) return <GirisEkrani onGiris={girisYap} />;
  return <Shell token={token} ad={ad} soyad={soyad} onCikis={cikisYap} />;
}

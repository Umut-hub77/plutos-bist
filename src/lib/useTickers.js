import { useState, useEffect } from 'react';

// Hisse listesi oturum boyunca değişmez; bir kez çekip bellekte tutuyoruz.
let onbellek = null;

export function useTickers(api) {
  const [veri, setVeri] = useState(onbellek);
  useEffect(() => {
    if (onbellek) return;
    api('/api/tickers').then(r => { onbellek = r; setVeri(r); }).catch(() => {});
  }, [api]);
  return veri; // { tickers: [...], varsayilan_temettu: [...] } | null
}

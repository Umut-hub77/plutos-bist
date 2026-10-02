import React, { createContext, useContext, useState, useMemo, useEffect } from 'react';

// dashboard.py satır 1116-1131'in birebir karşılığı:
// "Hassasiyet" seçimi -> interval (p_int) + geçerli periyot listesi (opts) + varsayılan periyot.
export const HASSASIYET = {
  'Günlük':  { pInt: '1d', opts: ['1mo', '3mo', '6mo', '1y', '2y', '5y', '10y', 'ytd', 'max'], varsayilan: '1y' },
  'Saatlik': { pInt: '1h', opts: ['1mo', '3mo', '6mo', '1y', '2y'], varsayilan: '6mo' },
  'Canlı':   { pInt: '1m', opts: ['1s', '5s', '30s', '1d', '5d', '7d'], varsayilan: '1d' },
};

const AyarContext = createContext(null);

// Analiz modüllerinde (Stratejik Analiz, İzleme Listesi, Portföy İzleme...) şöyle kullanın:
//   const { pInt, pPer } = useAyar();
//   api(`/api/analysis/THYAO?interval=${pInt}&period=${pPer}`)
export const useAyar = () => useContext(AyarContext);

export function AyarProvider({ children }) {
  const [hassasiyet, setHassasiyet] = useState('Günlük');
  const [pPer, setPPer] = useState(HASSASIYET['Günlük'].varsayilan);
  // portfoySurum: yan menüden portföy değişince artar; sayfalar buna bakıp yeniden yüklenir.
  const [portfoySurum, setPortfoySurum] = useState(0);

  // Hassasiyet değişince periyot, yeni listede geçerli değilse varsayılana döner (Streamlit'teki index=... davranışı).
  useEffect(() => {
    const h = HASSASIYET[hassasiyet];
    setPPer(onceki => (h.opts.includes(onceki) ? onceki : h.varsayilan));
  }, [hassasiyet]);

  const deger = useMemo(() => ({
    hassasiyet, setHassasiyet,
    pInt: HASSASIYET[hassasiyet].pInt,
    pPer, setPPer,
    periyotSecenekleri: HASSASIYET[hassasiyet].opts,
    portfoySurum,
    portfoyDegisti: () => setPortfoySurum(n => n + 1),
  }), [hassasiyet, pPer, portfoySurum]);

  return <AyarContext.Provider value={deger}>{children}</AyarContext.Provider>;
}

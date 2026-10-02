import React, { useState } from 'react';

// Tek hisse seçici (st.selectbox karşılığı): yazarken listeden önerir, geçerli bir kod olunca onChange çağrılır.
export default function TekHisse({ etiket = 'Hisse', tickers, deger, onChange, gecersizdeBosalt = false }) {
  const [metin, setMetin] = useState(deger || '');
  const liste = tickers || [];
  const degis = (e) => {
    const h = e.target.value.toUpperCase().trim();
    setMetin(h);
    if (liste.includes(h)) onChange(h);
    else if (gecersizdeBosalt) onChange('');   // formlarda eski geçerli değer yanlışlıkla kalmasın
  };
  const gecersiz = metin && liste.length > 0 && !liste.includes(metin);
  return (
    <div className="hisse-secici">
      <label>{etiket}</label>
      <input list="tek-hisse-listesi" value={metin} onChange={degis} placeholder="THYAO" style={gecersiz ? { borderColor: 'var(--red)' } : undefined} />
      <datalist id="tek-hisse-listesi">{liste.map(h => <option key={h} value={h} />)}</datalist>
    </div>
  );
}

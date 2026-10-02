import React, { useState } from 'react';

// Streamlit'teki st.multiselect karşılığı: yazarak ara (datalist), seçince chip olarak ekle, × ile çıkar.
export default function HisseSecici({ etiket, tickers, secili, onChange, max = 15 }) {
  const [metin, setMetin] = useState('');
  const liste = tickers || [];

  const ekle = (deger) => {
    const h = deger.trim().toUpperCase();
    if (h && liste.includes(h) && !secili.includes(h) && secili.length < max) {
      onChange([...secili, h]);
      setMetin('');
    } else {
      setMetin(deger);
    }
  };

  return (
    <div className="hisse-secici">
      <label>{etiket}</label>
      <div className="chipler">
        {secili.map(h => (
          <span className="chip" key={h}>
            {h}<button aria-label={h + ' kaldır'} onClick={() => onChange(secili.filter(x => x !== h))}>×</button>
          </span>
        ))}
        <input
          list="hisse-listesi" value={metin} placeholder={secili.length < max ? 'Hisse ara…' : `En fazla ${max} hisse`}
          disabled={secili.length >= max}
          onChange={e => ekle(e.target.value)}
        />
      </div>
      <datalist id="hisse-listesi">{liste.filter(h => !secili.includes(h)).map(h => <option key={h} value={h} />)}</datalist>
    </div>
  );
}

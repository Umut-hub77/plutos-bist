import React, { useState } from 'react';

// st.expander karşılığı. acik: başlangıç durumu.
export default function Acilir({ baslik, acik = false, children }) {
  const [a, setA] = useState(acik);
  return (
    <div className="expander acilir">
      <button className="expander-baslik" onClick={() => setA(x => !x)} aria-expanded={a}>
        <span>{baslik}</span><span className={'ok' + (a ? ' acik' : '')}>▾</span>
      </button>
      {a && <div className="expander-icerik">{children}</div>}
    </div>
  );
}

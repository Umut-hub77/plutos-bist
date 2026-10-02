import React from 'react';

// **kalın** işaretlerini ve satır sonlarını işler (HTML enjekte etmeden). Streamlit'in st.markdown'unun küçük karşılığı.
export default function Metin({ t }) {
  return String(t ?? '').split('\n').map((satir, i) => (
    <div key={i} style={{ minHeight: satir ? undefined : 8 }}>
      {satir.split(/(\*\*[^*]+\*\*)/g).map((p, j) => (p.startsWith('**') && p.endsWith('**') ? <b key={j}>{p.slice(2, -2)}</b> : <span key={j}>{p}</span>))}
    </div>
  ));
}

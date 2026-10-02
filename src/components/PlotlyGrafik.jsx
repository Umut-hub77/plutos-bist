import React, { useEffect, useRef, useState } from 'react';
import { TEMA, temaliLayout } from '../lib/plotlyTema.js';

let plotlyOz = null;
const plotlyYukle = () => (plotlyOz ??= import('plotly.js-dist-min').then(m => m.default || m));

export default function PlotlyGrafik({ data, layout, config, yukseklik, className, onRelayout }) {
  const kap = useRef(null);
  const [hata, setHata] = useState('');

  useEffect(() => {
    let iptal = false;
    plotlyYukle().then(Plotly => {
      if (iptal || !kap.current) return;
      const varsayilanConfig = {
        responsive: true,
        displaylogo: false,
        scrollZoom: true,
        displayModeBar: 'hover',
        modeBarButtonsToRemove: ['lasso2d', 'select2d', 'sendDataToCloud'],
        modeBarButtonsToAdd: ['drawline', 'drawopenpath', 'drawcircle', 'drawrect', 'eraseshape'],
        ...config,
      };
      
      const nihaiLayout = temaliLayout({
        ...layout,
        ...(yukseklik ? { height: yukseklik } : {}),
      });

      Plotly.react(kap.current, data, nihaiLayout, varsayilanConfig);

      if (onRelayout && kap.current.on) {
        kap.current.removeAllListeners?.('plotly_relayout');
        kap.current.on('plotly_relayout', onRelayout);
      }
    }).catch(e => setHata('Grafik çizilemedi: ' + e.message));

    return () => { iptal = true; };
  }, [data, layout, config, yukseklik, onRelayout]);

  // Boyut değiştiğinde grafiği otomatik uydur
  useEffect(() => {
    const el = kap.current;
    if (!el) return;
    const observer = new ResizeObserver(() => {
      plotlyOz?.then(P => {
        if (el && el.data) {
          P.Plots.resize(el);
        }
      });
    });
    observer.observe(el);

    return () => {
      observer.disconnect();
      plotlyOz?.then(P => el && P.purge(el));
    };
  }, []);

  if (hata) return <div className="error-msg">{hata}</div>;
  return (
    <div
      ref={kap}
      className={className}
      style={{ width: '100%', minHeight: yukseklik || 'auto', background: TEMA.surface, borderRadius: 8, overflow: 'hidden' }}
    />
  );
}

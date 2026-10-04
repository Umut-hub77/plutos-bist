import React, { useEffect, useRef, useState } from 'react';
import { TEMA, temaliLayout } from '../lib/plotlyTema.js';

let plotlyOz = null;
const plotlyYukle = () => (plotlyOz ??= import('plotly.js-dist-min').then(m => m.default || m));

export default function PlotlyGrafik({ data, layout, config, yukseklik, className, onRelayout }) {
  const kap = useRef(null);
  const [hata, setHata] = useState('');
  
  // Titreşim ve temas kopmasını önleyen referanslar (Anti-Jitter & Smooth Touch)
  const isInteracting = useRef(false);
  const lastSize = useRef({ w: 0, h: 0 });
  const resizeTimer = useRef(null);
  const pendingUpdate = useRef(null);
  const interactionReleaseTimer = useRef(null);

  // Dokunma ve sürükleme etkileşimini dinle (Kullanıcı temas halindeyken resize ve re-render kilitlenir)
  useEffect(() => {
    const el = kap.current;
    if (!el) return;

    const onPointerStart = () => {
      isInteracting.current = true;
      if (interactionReleaseTimer.current) clearTimeout(interactionReleaseTimer.current);
    };

    const onPointerEnd = () => {
      if (interactionReleaseTimer.current) clearTimeout(interactionReleaseTimer.current);
      interactionReleaseTimer.current = setTimeout(() => {
        isInteracting.current = false;
        // Kullanıcı teması bıraktığında bekleyen bir güncelleme varsa işlet
        if (pendingUpdate.current) {
          const fn = pendingUpdate.current;
          pendingUpdate.current = null;
          fn();
        }
      }, 250);
    };

    // Passive: false ile tarayıcının varsayılan sayfa kaydırmasıyla çakışmasını engelle
    el.addEventListener('touchstart', onPointerStart, { passive: true });
    el.addEventListener('touchend', onPointerEnd, { passive: true });
    el.addEventListener('touchcancel', onPointerEnd, { passive: true });
    el.addEventListener('pointerdown', onPointerStart, { passive: true });
    el.addEventListener('pointerup', onPointerEnd, { passive: true });
    el.addEventListener('pointercancel', onPointerEnd, { passive: true });

    return () => {
      el.removeEventListener('touchstart', onPointerStart);
      el.removeEventListener('touchend', onPointerEnd);
      el.removeEventListener('touchcancel', onPointerEnd);
      el.removeEventListener('pointerdown', onPointerStart);
      el.removeEventListener('pointerup', onPointerEnd);
      el.removeEventListener('pointercancel', onPointerEnd);
      if (interactionReleaseTimer.current) clearTimeout(interactionReleaseTimer.current);
    };
  }, []);

  // Grafik Çizimi & Güncellemesi
  useEffect(() => {
    let iptal = false;

    const cizimiUygula = () => {
      plotlyYukle().then(Plotly => {
        if (iptal || !kap.current) return;

        // Pürüzsüz dokunmatik ve yakınlaştırma konfigürasyonu
        const varsayilanConfig = {
          responsive: true,
          displaylogo: false,
          scrollZoom: true,
          doubleClick: 'reset',
          showAxisDragHandles: true,
          showAxisRangeEntryBoxes: false,
          displayModeBar: 'hover',
          modeBarButtonsToRemove: ['lasso2d', 'select2d', 'sendDataToCloud'],
          modeBarButtonsToAdd: ['drawline', 'drawopenpath', 'drawcircle', 'drawrect', 'eraseshape'],
          ...config,
        };
        
        // Temalı layout: pan modunu ve uirevision kalıcılığını garanti et
        const nihaiLayout = temaliLayout({
          dragmode: layout?.dragmode || 'pan',
          uirevision: layout?.uirevision ?? 'plutos_persistent_zoom',
          ...layout,
          ...(yukseklik ? { height: yukseklik } : {}),
        });

        Plotly.react(kap.current, data, nihaiLayout, varsayilanConfig);

        // Plotly dahili sürükleme olaylarını takip et
        if (kap.current.on) {
          kap.current.removeAllListeners?.('plotly_relayouting');
          kap.current.removeAllListeners?.('plotly_relayout');

          kap.current.on('plotly_relayouting', () => {
            isInteracting.current = true;
          });

          kap.current.on('plotly_relayout', (eventData) => {
            isInteracting.current = false;
            onRelayout?.(eventData);
          });
        }
      }).catch(e => {
        if (!iptal) setHata('Grafik çizilemedi: ' + e.message);
      });
    };

    // Eğer kullanıcı aktif olarak parmağıyla grafiğe temas ediyorsa, grafiğin sıfırlanıp titrememesi için güncellemeyi ertele
    if (isInteracting.current) {
      pendingUpdate.current = cizimiUygula;
    } else {
      cizimiUygula();
    }

    return () => {
      iptal = true;
    };
  }, [data, layout, config, yukseklik, onRelayout]);

  // Boyut değiştiğinde titreşimsiz akıllı ResizeObserver
  useEffect(() => {
    const el = kap.current;
    if (!el) return;

    const observer = new ResizeObserver(entries => {
      // Kullanıcı temas halindeyken resize tetikleme (titreşimi ve takılmayı önleyen ana kilit)
      if (isInteracting.current) return;

      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        if (width === 0 || height === 0) continue;

        const dw = Math.abs(width - lastSize.current.w);
        const dh = Math.abs(height - lastSize.current.h);

        // 3 pikselden küçük mikro oynamaları yoksay (iç içe döngüyü ve titreşimi keser)
        if (dw < 3 && dh < 3) continue;

        lastSize.current = { w: width, h: height };

        // 120ms debounce ile pürüzsüz yeniden boyutlandırma
        if (resizeTimer.current) clearTimeout(resizeTimer.current);
        resizeTimer.current = setTimeout(() => {
          if (isInteracting.current) return;
          plotlyOz?.then(P => {
            if (el && el.data) {
              P.Plots.resize(el);
            }
          });
        }, 120);
      }
    });

    observer.observe(el);

    return () => {
      if (resizeTimer.current) clearTimeout(resizeTimer.current);
      observer.disconnect();
      plotlyOz?.then(P => el && P.purge(el));
    };
  }, []);

  if (hata) return <div className="error-msg">{hata}</div>;

  return (
    <div
      ref={kap}
      className={`plotly-grafik-kapsayici ${className || ''}`}
      style={{
        width: '100%',
        minHeight: yukseklik || 'auto',
        background: TEMA.surface,
        borderRadius: 8,
        overflow: 'hidden',
        position: 'relative',
        touchAction: 'none',
        userSelect: 'none',
        WebkitUserSelect: 'none',
      }}
    />
  );
}

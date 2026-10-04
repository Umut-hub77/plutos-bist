import React, { useEffect, useRef, useState, useCallback } from 'react';
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

  // İki parmakla kıstırma/açma (Pinch-to-Zoom) durum değişkenleri
  const touchDistanceInitial = useRef(null);
  const initialXRange = useRef(null);

  // X Ekseni Yakınlaştırma / Uzaklaştırma Matematik Motoru
  const applyXRangeZoom = useCallback((factor, baseRange) => {
    const graphEl = kap.current;
    if (!graphEl || !baseRange || baseRange.length < 2) return;
    const r0 = baseRange[0];
    const r1 = baseRange[1];

    const isDate = typeof r0 === 'string' && (r0.includes('-') || r0.includes(':'));
    let t0 = isDate ? new Date(r0).getTime() : parseFloat(r0);
    let t1 = isDate ? new Date(r1).getTime() : parseFloat(r1);

    if (isNaN(t0) || isNaN(t1) || t1 <= t0) return;

    const center = (t0 + t1) / 2;
    // factor > 1: Kıstırma (Pinch In) -> Süre genişler (daha geniş süreli)
    // factor < 1: Açma (Pinch Out) -> Süre daralır (daha yakın süreli)
    const halfSpan = ((t1 - t0) / 2) * factor;

    const newMin = center - halfSpan;
    const newMax = center + halfSpan;

    const relayoutMin = isDate
      ? new Date(newMin).toISOString().replace('T', ' ').slice(0, 19)
      : newMin;
    const relayoutMax = isDate
      ? new Date(newMax).toISOString().replace('T', ' ').slice(0, 19)
      : newMax;

    plotlyOz?.then(P => {
      P.relayout(graphEl, {
        'xaxis.range': [relayoutMin, relayoutMax],
      });
    });
  }, []);

  // Dokunma, Çift Parmak Kıstırma/Açma ve Fare Tekerlek Dinleyicileri
  useEffect(() => {
    const el = kap.current;
    if (!el) return;

    const getTouchDist = (touches) => {
      const dx = touches[0].clientX - touches[1].clientX;
      const dy = touches[0].clientY - touches[1].clientY;
      return Math.sqrt(dx * dx + dy * dy);
    };

    const onPointerStart = (e) => {
      isInteracting.current = true;
      if (interactionReleaseTimer.current) clearTimeout(interactionReleaseTimer.current);

      // İki parmakla dokunma başladıysa kıstırma/açma modunu hazırla
      if (e.touches && e.touches.length === 2) {
        touchDistanceInitial.current = getTouchDist(e.touches);
        if (el?.layout?.xaxis?.range) {
          initialXRange.current = [...el.layout.xaxis.range];
        }
      }
    };

    const onTouchMove = (e) => {
      // 2 PARMAK: SIKIŞTIRMA (KISTIRMA) / AÇMA (GENİŞLETME) HAREKETİ
      if (e.touches && e.touches.length === 2 && touchDistanceInitial.current && initialXRange.current) {
        e.preventDefault(); // Sayfa zoom/scroll'unu engelle, doğrudan zaman eksenini kontrol et
        const currentDist = getTouchDist(e.touches);
        const scale = currentDist / touchDistanceInitial.current;
        if (scale <= 0.05 || !isFinite(scale)) return;

        // scale > 1 (açma) -> factor < 1 (daha yakın süreli)
        // scale < 1 (kıstırma) -> factor > 1 (daha geniş süreli)
        const factor = 1 / scale;
        applyXRangeZoom(factor, initialXRange.current);
      }
    };

    const onPointerEnd = (e) => {
      if (!e.touches || e.touches.length < 2) {
        touchDistanceInitial.current = null;
        initialXRange.current = null;
      }

      if (interactionReleaseTimer.current) clearTimeout(interactionReleaseTimer.current);
      interactionReleaseTimer.current = setTimeout(() => {
        isInteracting.current = false;
        if (pendingUpdate.current) {
          const fn = pendingUpdate.current;
          pendingUpdate.current = null;
          fn();
        }
      }, 250);
    };

    // Fare tekerleği veya trackpad pinch hareketi ile doğrudan zaman eksenini yakınlaştır/uzaklaştır
    const onWheel = (e) => {
      if (!el?.layout?.xaxis?.range) return;
      e.preventDefault(); // Tarayıcı sayfa kaydırmasını engelle

      // deltaY > 0 -> tekerlek aşağı -> uzaklaş (daha geniş süreli)
      // deltaY < 0 -> tekerlek yukarı -> yakınlaş (daha yakın süreli)
      const factor = e.deltaY > 0 ? 1.12 : 0.89;
      applyXRangeZoom(factor, el.layout.xaxis.range);
    };

    el.addEventListener('touchstart', onPointerStart, { passive: false });
    el.addEventListener('touchmove', onTouchMove, { passive: false });
    el.addEventListener('touchend', onPointerEnd, { passive: true });
    el.addEventListener('touchcancel', onPointerEnd, { passive: true });
    el.addEventListener('pointerdown', onPointerStart, { passive: true });
    el.addEventListener('pointerup', onPointerEnd, { passive: true });
    el.addEventListener('pointercancel', onPointerEnd, { passive: true });
    el.addEventListener('wheel', onWheel, { passive: false });

    return () => {
      el.removeEventListener('touchstart', onPointerStart);
      el.removeEventListener('touchmove', onTouchMove);
      el.removeEventListener('touchend', onPointerEnd);
      el.removeEventListener('touchcancel', onPointerEnd);
      el.removeEventListener('pointerdown', onPointerStart);
      el.removeEventListener('pointerup', onPointerEnd);
      el.removeEventListener('pointercancel', onPointerEnd);
      el.removeEventListener('wheel', onWheel);
      if (interactionReleaseTimer.current) clearTimeout(interactionReleaseTimer.current);
    };
  }, [applyXRangeZoom]);

  // Grafik Çizimi & Güncellemesi
  useEffect(() => {
    let iptal = false;

    const cizimiUygula = () => {
      plotlyYukle().then(Plotly => {
        if (iptal || !kap.current) return;

        // Pürüzsüz dokunmatik ve yakınlaştırma konfigürasyonu
        // zoom2d, select2d, lasso2d kaldırıldı: KESİNLİKLE DİKDÖRTGEN SEÇİM KUTUSU AÇILMAZ
        const varsayilanConfig = {
          responsive: true,
          displaylogo: false,
          scrollZoom: false, // Tekerlek ve pinch kontrolünü özel pürüzsüz motorumuz yönetir
          doubleClick: 'reset',
          showAxisDragHandles: true,
          showAxisRangeEntryBoxes: false,
          displayModeBar: 'hover',
          modeBarButtonsToRemove: [
            'zoom2d',
            'select2d',
            'lasso2d',
            'autoScale2d',
            'sendDataToCloud',
            'toggleSpikelines',
            'hoverClosestCartesian',
            'hoverCompareCartesian',
          ],
          modeBarButtonsToAdd: ['drawline', 'drawopenpath', 'drawcircle', 'drawrect', 'eraseshape'],
          ...config,
        };
        
        // Temalı layout: Kesin pan modu ve uirevision kalıcılığı
        const nihaiLayout = temaliLayout({
          dragmode: 'pan', // Daima kaydırma/pan modunda kalır, kutu seçimi yapmaz
          uirevision: layout?.uirevision ?? 'plutos_persistent_zoom',
          ...layout,
          ...(yukseklik ? { height: yukseklik } : {}),
        });

        Plotly.react(kap.current, data, nihaiLayout, varsayilanConfig);

        // Plotly dahili sürükleme olaylarını dinle
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
      if (isInteracting.current) return;

      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        if (width === 0 || height === 0) continue;

        const dw = Math.abs(width - lastSize.current.w);
        const dh = Math.abs(height - lastSize.current.h);

        // 3 pikselden küçük mikro oynamaları yoksay
        if (dw < 3 && dh < 3) continue;

        lastSize.current = { w: width, h: height };

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

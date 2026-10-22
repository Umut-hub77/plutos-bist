import React, { useEffect, useRef, useState, useCallback } from 'react';
import { TEMA, temaliLayout } from '../lib/plotlyTema.js';

let plotlyOz = null;
let plotlyInstance = null;
const plotlyYukle = () =>
  (plotlyOz ??= import('plotly.js-dist-min').then(m => {
    plotlyInstance = m.default || m;
    return plotlyInstance;
  }));

export default function PlotlyGrafik({ data, layout, config, yukseklik, className, onRelayout }) {
  const kap = useRef(null);
  const [hata, setHata] = useState('');

  // Etkileşim ve kalıcı yakınlaştırma (Persistent Zoom) referansları
  const isInteracting = useRef(false);
  const isRelayouting = useRef(false);
  const isProgrammaticZoom = useRef(false);
  const pendingUpdate = useRef(null);
  const interactionReleaseTimer = useRef(null);
  const userXRangeRef = useRef(null);
  const lastRevisionRef = useRef(null);

  // 60fps Pürüzsüz Yakınlaştırma (Smooth Lerp Zoom) motoru referansları
  const currentLinearRange = useRef(null);
  const targetLinearRange = useRef(null);
  const zoomRafId = useRef(null);

  // İki parmakla kıstırma/açma (Pinch-to-Zoom) durum değişkenleri
  const touchDistanceInitial = useRef(null);
  const initialPinchLinearRange = useRef(null);

  // Canlı Plotly X ekseninden doğrusal (linear) aralığı oku
  const getAxisAndLinearRange = useCallback(() => {
    const el = kap.current;
    const ax = el?._fullLayout?.xaxis;
    if (!ax || typeof ax.r2l !== 'function' || typeof ax.l2r !== 'function' || !ax.range || ax.range.length < 2) {
      return null;
    }
    const l0 = ax.r2l(ax.range[0]);
    const l1 = ax.r2l(ax.range[1]);
    if (!isFinite(l0) || !isFinite(l1) || l1 <= l0) return null;
    return { el, ax, l0, l1 };
  }, []);

  // 60fps requestAnimationFrame tabanlı pürüzsüz yakınlaştırma döngüsü
  const startSmoothZoomLoop = useCallback(() => {
    if (zoomRafId.current) return;

    const step = () => {
      const info = getAxisAndLinearRange();
      const cur = currentLinearRange.current;
      const tgt = targetLinearRange.current;

      if (!info || !cur || !tgt || !plotlyInstance) {
        zoomRafId.current = null;
        isProgrammaticZoom.current = false;
        return;
      }

      // Önceki kare hâlâ çiziliyorsa bir sonraki animasyon karesini bekle (üst üste binmeyi önler)
      if (isRelayouting.current) {
        zoomRafId.current = requestAnimationFrame(step);
        return;
      }

      const { el, ax } = info;
      const span = Math.max(1e-9, tgt[1] - tgt[0]);
      const diff0 = tgt[0] - cur[0];
      const diff1 = tgt[1] - cur[1];
      const bitti = Math.abs(diff0) < span * 0.002 && Math.abs(diff1) < span * 0.002;

      if (bitti) {
        cur[0] = tgt[0];
        cur[1] = tgt[1];
      } else {
        // Pürüzsüz sönümleme (Smooth damping)
        cur[0] += diff0 * 0.38;
        cur[1] += diff1 * 0.38;
      }

      const r0 = ax.l2r(cur[0]);
      const r1 = ax.l2r(cur[1]);

      if (r0 !== false && r1 !== false && r0 !== undefined && r1 !== undefined) {
        // Kullanıcının yakınlaştırdığı aralığı kalıcı olarak sakla (bırakınca eski haline dönmesini önler)
        userXRangeRef.current = [r0, r1];

        // Plotly dahili sürükleme referanslarını senkronize tut
        ax.range = [r0, r1];
        ax._r = [r0, r1];
        ax._rl = [cur[0], cur[1]];

        isRelayouting.current = true;
        isProgrammaticZoom.current = true;
        Promise.resolve(
          plotlyInstance.relayout(el, {
            'xaxis.range': [r0, r1],
            'xaxis.autorange': false,
          })
        )
          .catch(() => {})
          .finally(() => {
            isRelayouting.current = false;
            if (bitti) {
              isProgrammaticZoom.current = false;
            }
          });
      }

      if (!bitti) {
        zoomRafId.current = requestAnimationFrame(step);
      } else {
        zoomRafId.current = null;
      }
    };

    zoomRafId.current = requestAnimationFrame(step);
  }, [getAxisAndLinearRange]);

  const scheduleInteractionRelease = useCallback((delay = 280) => {
    if (interactionReleaseTimer.current) clearTimeout(interactionReleaseTimer.current);
    interactionReleaseTimer.current = setTimeout(() => {
      isInteracting.current = false;
      if (pendingUpdate.current) {
        const fn = pendingUpdate.current;
        pendingUpdate.current = null;
        fn();
      }
    }, delay);
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

    const cancelPlotlyInternalDrag = () => {
      // Plotly'nin tek parmak sürükleme durumunu iptal et ki touchend'de eski şekline geri sıçramasın
      el._dragging = false;
      el._dragged = false;
      delete el._dragdata;
    };

    const onPointerStart = (e) => {
      isInteracting.current = true;
      if (interactionReleaseTimer.current) clearTimeout(interactionReleaseTimer.current);

      // İki parmakla dokunma başladıysa kıstırma/açma modunu hazırla
      if (e.touches && e.touches.length >= 2) {
        cancelPlotlyInternalDrag();
        e.preventDefault();
        e.stopImmediatePropagation();
        touchDistanceInitial.current = getTouchDist(e.touches);
        const info = getAxisAndLinearRange();
        if (info) {
          const base = targetLinearRange.current || [info.l0, info.l1];
          initialPinchLinearRange.current = [base[0], base[1]];
          currentLinearRange.current = [info.l0, info.l1];
          targetLinearRange.current = [base[0], base[1]];
        }
      }
    };

    const onTouchMove = (e) => {
      // 2 PARMAK: SIKIŞTIRMA (KISTIRMA) / AÇMA (GENİŞLETME) HAREKETİ
      if (e.touches && e.touches.length >= 2 && touchDistanceInitial.current && initialPinchLinearRange.current) {
        cancelPlotlyInternalDrag();
        e.preventDefault();
        e.stopImmediatePropagation();

        const currentDist = getTouchDist(e.touches);
        const scale = currentDist / touchDistanceInitial.current;
        if (scale <= 0.05 || !isFinite(scale)) return;

        // scale > 1 (açma) -> factor < 1 (daha yakın süreli)
        // scale < 1 (kıstırma) -> factor > 1 (daha geniş süreli)
        const factor = Math.max(0.08, Math.min(12, 1 / scale));
        const [b0, b1] = initialPinchLinearRange.current;
        const center = (b0 + b1) / 2;
        const halfSpan = ((b1 - b0) / 2) * factor;

        targetLinearRange.current = [center - halfSpan, center + halfSpan];
        startSmoothZoomLoop();
      }
    };

    const onPointerEnd = (e) => {
      if (!e.touches || e.touches.length < 2) {
        touchDistanceInitial.current = null;
        initialPinchLinearRange.current = null;
      }
      scheduleInteractionRelease(280);
    };

    // Fare tekerleği veya trackpad pinch hareketi ile 60fps pürüzsüz yakınlaştırma/uzaklaştırma
    const onWheel = (e) => {
      if (config?.staticPlot) return;
      const info = getAxisAndLinearRange();
      if (!info) return;

      e.preventDefault();
      e.stopPropagation();

      isInteracting.current = true;
      scheduleInteractionRelease(320);

      const { ax, l0, l1 } = info;
      if (!zoomRafId.current || !targetLinearRange.current || !currentLinearRange.current) {
        currentLinearRange.current = [l0, l1];
        targetLinearRange.current = [l0, l1];
      }

      // Fare imlecinin grafik üzerindeki yatay konumunu merkez (pivot) olarak al
      const plotRect =
        el.querySelector('.nsewdrag')?.getBoundingClientRect() || el.getBoundingClientRect();
      let anchor = 0.5;
      if (plotRect && plotRect.width > 0) {
        const raw = (e.clientX - plotRect.left) / plotRect.width;
        if (raw >= 0 && raw <= 1) {
          anchor = Math.max(0.05, Math.min(0.95, raw));
        }
      }

      // deltaMode === 1 (satır bazlı fare tekerleği) ise piksel ölçeğine normalize et
      const rawDelta = e.deltaMode === 1 ? e.deltaY * 18 : e.deltaY;
      const clampedDelta = Math.max(-90, Math.min(90, rawDelta));
      if (Math.abs(clampedDelta) < 0.5) return;

      // Üstel pürüzsüz ölçekleme faktörü
      const factor = Math.exp(clampedDelta * 0.0022);

      const [t0, t1] = targetLinearRange.current;
      const currentSpan = t1 - t0;
      const minSpan = ax.type === 'category' ? 4 : currentSpan * 0.02;
      const maxSpan = ax.type === 'category' ? 5000 : currentSpan * 50;

      const newSpan = currentSpan * factor;
      if (newSpan < minSpan && factor < 1) return;
      if (newSpan > maxSpan && factor > 1) return;

      const pivot = t0 + currentSpan * anchor;
      const nextT0 = pivot + (t0 - pivot) * factor;
      const nextT1 = pivot + (t1 - pivot) * factor;

      if (isFinite(nextT0) && isFinite(nextT1) && nextT1 > nextT0) {
        targetLinearRange.current = [nextT0, nextT1];
        startSmoothZoomLoop();
      }
    };

    el.addEventListener('touchstart', onPointerStart, { passive: false, capture: true });
    el.addEventListener('touchmove', onTouchMove, { passive: false, capture: true });
    el.addEventListener('touchend', onPointerEnd, { passive: true, capture: true });
    el.addEventListener('touchcancel', onPointerEnd, { passive: true, capture: true });
    el.addEventListener('pointerdown', onPointerStart, { passive: true });
    el.addEventListener('pointerup', onPointerEnd, { passive: true });
    el.addEventListener('pointercancel', onPointerEnd, { passive: true });
    el.addEventListener('wheel', onWheel, { passive: false, capture: true });

    return () => {
      el.removeEventListener('touchstart', onPointerStart, { capture: true });
      el.removeEventListener('touchmove', onTouchMove, { capture: true });
      el.removeEventListener('touchend', onPointerEnd, { capture: true });
      el.removeEventListener('touchcancel', onPointerEnd, { capture: true });
      el.removeEventListener('pointerdown', onPointerStart);
      el.removeEventListener('pointerup', onPointerEnd);
      el.removeEventListener('pointercancel', onPointerEnd);
      el.removeEventListener('wheel', onWheel, { capture: true });
      if (interactionReleaseTimer.current) clearTimeout(interactionReleaseTimer.current);
      if (zoomRafId.current) {
        cancelAnimationFrame(zoomRafId.current);
        zoomRafId.current = null;
      }
    };
  }, [config?.staticPlot, getAxisAndLinearRange, scheduleInteractionRelease, startSmoothZoomLoop]);

  // Grafik Çizimi & Güncellemesi
  useEffect(() => {
    let iptal = false;

    // Hisse / periyot (uirevision) değiştiyse kaydedilmiş zoom aralığını sıfırla
    const currentRevision = layout?.uirevision ?? 'plutos_persistent_zoom';
    if (lastRevisionRef.current !== null && lastRevisionRef.current !== currentRevision) {
      userXRangeRef.current = null;
      currentLinearRange.current = null;
      targetLinearRange.current = null;
    }
    lastRevisionRef.current = currentRevision;

    const cizimiUygula = () => {
      plotlyYukle()
        .then(Plotly => {
          if (iptal || !kap.current) return;

          // Pürüzsüz dokunmatik ve yakınlaştırma konfigürasyonu
          // scrollZoom: false en sonda zorunlu tutulur ki Plotly'nin dahili tekerlek motoru bizim 60fps motorumuzla çatışmasın
          const varsayilanConfig = {
            responsive: true,
            displaylogo: false,
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
            scrollZoom: false,
          };

          // Temalı layout: Kesin pan modu ve uirevision kalıcılığı
          const nihaiLayout = temaliLayout({
            dragmode: 'pan',
            uirevision: currentRevision,
            ...layout,
            ...(yukseklik ? { height: yukseklik } : {}),
          });

          // Kullanıcı yakınlaştırma veya kaydırma yaptıysa, yeniden çizimde eski şekline geri dönmesini engelle
          if (userXRangeRef.current && nihaiLayout.xaxis) {
            nihaiLayout.xaxis = {
              ...nihaiLayout.xaxis,
              range: [...userXRangeRef.current],
              autorange: false,
            };
          }

          // Alt paneller tek ortak X ekseni (xaxis: 'x') kullanıyorsa izleri normalize et
          const tekXEkseni = !nihaiLayout.xaxis2 && !nihaiLayout.xaxis3;
          const normalizeData =
            tekXEkseni && Array.isArray(data)
              ? data.map(iz => (iz && iz.xaxis && iz.xaxis !== 'x' ? { ...iz, xaxis: 'x' } : iz))
              : data;

          Plotly.react(kap.current, normalizeData, nihaiLayout, varsayilanConfig);

          // Plotly dahili sürükleme olaylarını dinle ve kullanıcının bıraktığı aralığı kaydet
          if (kap.current.on) {
            kap.current.removeAllListeners?.('plotly_relayouting');
            kap.current.removeAllListeners?.('plotly_relayout');
            kap.current.removeAllListeners?.('plotly_doubleclick');

            kap.current.on('plotly_relayouting', () => {
              isInteracting.current = true;
              if (!zoomRafId.current && !isProgrammaticZoom.current) {
                const info = getAxisAndLinearRange();
                if (info) {
                  userXRangeRef.current = [...info.ax.range];
                  currentLinearRange.current = [info.l0, info.l1];
                  targetLinearRange.current = [info.l0, info.l1];
                }
              }
            });

            kap.current.on('plotly_doubleclick', () => {
              userXRangeRef.current = layout?.xaxis?.range ? [...layout.xaxis.range] : null;
              currentLinearRange.current = null;
              targetLinearRange.current = null;
            });

            kap.current.on('plotly_relayout', (eventData) => {
              if (eventData && (eventData['xaxis.autorange'] === true || eventData['xaxis.range[0]'] === null)) {
                userXRangeRef.current = layout?.xaxis?.range ? [...layout.xaxis.range] : null;
                currentLinearRange.current = null;
                targetLinearRange.current = null;
              } else if (!zoomRafId.current && !isProgrammaticZoom.current) {
                const info = getAxisAndLinearRange();
                if (info) {
                  userXRangeRef.current = [...info.ax.range];
                  currentLinearRange.current = [info.l0, info.l1];
                  targetLinearRange.current = [info.l0, info.l1];
                }
              }
              if (!zoomRafId.current) {
                isInteracting.current = false;
              }
              onRelayout?.(eventData);
            });
          }
        })
        .catch(e => {
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
  }, [data, layout, config, yukseklik, onRelayout, getAxisAndLinearRange]);

  // Unmount temizliği
  useEffect(() => {
    const el = kap.current;
    return () => {
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

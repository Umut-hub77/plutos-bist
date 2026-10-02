import React, { useState } from 'react';
import { TASIMA_PLANI } from '../nav.js';

export default function Yakinda({ modul }) {
  const p = TASIMA_PLANI[modul];
  const [talepEdildi, setTalepEdildi] = useState(false);

  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh', padding: 20 }}>
      <div
        className="panel"
        style={{
          maxWidth: 580,
          width: '100%',
          background: '#131722',
          border: '1px solid #2a2e39',
          borderRadius: 12,
          padding: 32,
          textAlign: 'center',
          boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 16
        }}
      >
        <div
          style={{
            width: 56,
            height: 56,
            borderRadius: '50%',
            background: 'rgba(41, 98, 255, 0.12)',
            border: '1px solid rgba(41, 98, 255, 0.3)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 26,
            color: '#2962FF'
          }}
        >
          ⚡
        </div>

        <div>
          <span style={{ fontSize: 11, color: '#2962FF', fontWeight: 700, background: 'rgba(41, 98, 255, 0.1)', padding: '2px 8px', borderRadius: 4 }}>
            KURUMSAL MODÜL GELİŞTİRME AŞAMASINDA
          </span>
          <h2 style={{ margin: '10px 0 6px 0', fontSize: 20, color: '#f0f3fa' }}>
            {modul}
          </h2>
          <p style={{ margin: 0, fontSize: 13, color: '#787b86', lineHeight: 1.5 }}>
            Bu gelişmiş kurumsal analiz motoru Python çekirdeğinde optimize edilmektedir ve Plutos Pro Trading Workstation sürümüne entegre edilmektedir.
          </p>
        </div>

        {p && (
          <div style={{ width: '100%', background: '#0e1118', border: '1px solid #2a2e39', borderRadius: 8, overflow: 'hidden', textAlign: 'left', marginTop: 8 }}>
            <div style={{ padding: '8px 12px', background: '#1e222d', fontSize: 11, fontWeight: 600, color: '#787b86', borderBottom: '1px solid #2a2e39' }}>
              MİMARİ ENTEGRASYON BİLGİSİ
            </div>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
              <tbody>
                <tr style={{ borderBottom: '1px solid #1e222d' }}>
                  <td style={{ padding: '8px 12px', color: '#787b86' }}>Kaynak Dosya / Satır</td>
                  <td style={{ padding: '8px 12px', fontFamily: 'monospace', color: '#2962FF' }}>dashboard.py ({p.satir})</td>
                </tr>
                <tr style={{ borderBottom: '1px solid #1e222d' }}>
                  <td style={{ padding: '8px 12px', color: '#787b86' }}>REST / WebSocket Endpoint</td>
                  <td style={{ padding: '8px 12px', fontFamily: 'monospace', color: '#089981' }}>{p.endpoint}</td>
                </tr>
                <tr>
                  <td style={{ padding: '8px 12px', color: '#787b86' }}>Analitik Motor</td>
                  <td style={{ padding: '8px 12px', color: '#f0f3fa' }}>{p.motor}</td>
                </tr>
              </tbody>
            </table>
          </div>
        )}

        <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
          <button
            className="primary"
            onClick={() => setTalepEdildi(true)}
            disabled={talepEdildi}
            style={{ fontSize: 12, padding: '8px 16px', borderRadius: 6 }}
          >
            {talepEdildi ? '✓ Öncelik Bildirildi' : '🚀 Erken Erişim Talep Et'}
          </button>
          <a
            href="#stratejik"
            className="logout-btn"
            style={{ fontSize: 12, padding: '8px 16px', borderRadius: 6, textDecoration: 'none', display: 'inline-flex', alignItems: 'center' }}
          >
            Stratejik Analiz Masasına Dön
          </a>
        </div>
      </div>
    </div>
  );
}

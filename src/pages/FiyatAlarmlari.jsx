import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { fmt } from '../lib/format.jsx';

const POPULER_HISSELER = ['THYAO', 'EREGL', 'ASELS', 'GARAN', 'AKBNK', 'TUPRS', 'BIMAS', 'FROTO', 'SISE', 'KCHOL'];

export default function FiyatAlarmlari({ api, bildirimYenile }) {
  const [alarmlar, setAlarmlar] = useState(null);
  const [hisse, setHisse] = useState('');
  const [yon, setYon] = useState('Üzerine Çıkınca');
  const [esik, setEsik] = useState('');
  const [hata, setHata] = useState('');
  const [filtre, setFiltre] = useState('tumu'); // 'tumu' | 'bekleyen' | 'tetiklenen'
  const [yukleniyor, setYukleniyor] = useState(false);

  const yukle = useCallback(async () => {
    try {
      const r = await api('/api/alarms');
      setAlarmlar(r.alarms || []);
      bildirimYenile?.();
    } catch (e) {
      setHata(e.message);
    }
  }, [api, bildirimYenile]);

  useEffect(() => {
    yukle();
  }, [yukle]);

  const ekle = async () => {
    setHata('');
    const sEsik = parseFloat(esik);
    if (!hisse.trim() || isNaN(sEsik) || sEsik <= 0) {
      setHata('Lütfen geçerli bir hisse kodu ve eşik fiyatı girin.');
      return;
    }
    setYukleniyor(true);
    try {
      const r = await api('/api/alarms', {
        method: 'POST',
        govde: { hisse: hisse.trim().toUpperCase(), yon, esik: sEsik }
      });
      setAlarmlar(r.alarms);
      setHisse('');
      setEsik('');
      bildirimYenile?.();
    } catch (e) {
      setHata(e.message);
    } finally {
      setYukleniyor(false);
    }
  };

  const sil = async (i) => {
    try {
      const r = await api('/api/alarms/' + i, { method: 'DELETE' });
      setAlarmlar(r.alarms);
      bildirimYenile?.();
    } catch (e) {
      setHata(e.message);
    }
  };

  // İstatistikler
  const istatistik = useMemo(() => {
    const tumu = alarmlar?.length || 0;
    const tetiklenen = alarmlar?.filter(a => a.tetiklendi)?.length || 0;
    const bekleyen = tumu - tetiklenen;
    return { tumu, tetiklenen, bekleyen };
  }, [alarmlar]);

  // Filtrelenmiş liste
  const filtrelenmisListe = useMemo(() => {
    if (!alarmlar) return [];
    if (filtre === 'bekleyen') return alarmlar.map((a, i) => ({ ...a, idx: i })).filter(a => !a.tetiklendi);
    if (filtre === 'tetiklenen') return alarmlar.map((a, i) => ({ ...a, idx: i })).filter(a => a.tetiklendi);
    return alarmlar.map((a, i) => ({ ...a, idx: i }));
  }, [alarmlar, filtre]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Üst Cockpit */}
      <div className="panel" style={{ padding: 14, background: '#131722', border: '1px solid #2a2e39', borderRadius: 8 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 20, color: '#FF9800' }}>🔔</span>
            <div>
              <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: '#f0f3fa' }}>BIST Fiyat Alarmları Masası</h3>
              <p style={{ margin: 0, fontSize: 12, color: '#787b86' }}>
                Gerçek zamanlı piyasa fiyat hareketleri, tavan/taban ve kırılım tetikleyicileri
              </p>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <span style={{ fontSize: 12, background: 'rgba(41, 98, 255, 0.12)', color: '#2962FF', padding: '4px 10px', borderRadius: 6, fontWeight: 600 }}>
              Bekleyen: {istatistik.bekleyen}
            </span>
            <span style={{ fontSize: 12, background: 'rgba(8, 153, 129, 0.12)', color: '#089981', padding: '4px 10px', borderRadius: 6, fontWeight: 600 }}>
              Tetiklenen: {istatistik.tetiklenen}
            </span>
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(320px, 380px) 1fr', gap: 16 }}>
        {/* Sol Panel: Yeni Alarm Oluştur */}
        <div className="panel" style={{ padding: 16, background: '#131722', border: '1px solid #2a2e39', borderRadius: 8, display: 'flex', flexDirection: 'column', gap: 12 }}>
          <h4 style={{ margin: 0, fontSize: 15, color: '#f0f3fa', borderBottom: '1px solid #2a2e39', paddingBottom: 8 }}>
            ➕ Yeni Fiyat Alarmı Kur
          </h4>

          {/* Hızlı Seçim Çipleri */}
          <div>
            <label style={{ fontSize: 11, color: '#787b86', display: 'block', marginBottom: 4 }}>Popüler Hisseler</label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
              {POPULER_HISSELER.map(h => (
                <button
                  key={h}
                  onClick={() => setHisse(h)}
                  style={{
                    padding: '3px 8px',
                    fontSize: 11,
                    background: hisse === h ? '#2962FF' : '#1e222d',
                    color: hisse === h ? '#fff' : '#d1d4dc',
                    border: '1px solid #2a2e39',
                    borderRadius: 4,
                    cursor: 'pointer'
                  }}
                >
                  {h}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label style={{ fontSize: 11, color: '#787b86' }}>Hisse Kodu</label>
            <input
              value={hisse}
              onChange={e => setHisse(e.target.value.toUpperCase())}
              placeholder="Örn: THYAO"
              style={{ width: '100%', marginTop: 4, textTransform: 'uppercase', fontWeight: 600 }}
            />
          </div>

          <div>
            <label style={{ fontSize: 11, color: '#787b86' }}>Koşul Yönü</label>
            <div className="segment" style={{ marginTop: 4 }}>
              {['Üzerine Çıkınca', 'Altına İnince'].map(y => (
                <button
                  key={y}
                  className={yon === y ? 'aktif' : ''}
                  onClick={() => setYon(y)}
                  style={{ fontSize: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}
                >
                  <span>{y === 'Üzerine Çıkınca' ? '🔺' : '🔻'}</span>
                  <span>{y}</span>
                </button>
              ))}
            </div>
          </div>

          <div>
            <label style={{ fontSize: 11, color: '#787b86' }}>Eşik Fiyat (₺)</label>
            <input
              type="number"
              step="0.05"
              min="0.01"
              value={esik}
              onChange={e => setEsik(e.target.value)}
              placeholder="Örn: 320.50"
              style={{ width: '100%', marginTop: 4, fontFamily: 'monospace', fontWeight: 600 }}
              onKeyDown={e => { if (e.key === 'Enter') ekle(); }}
            />
          </div>

          <button
            className="primary"
            onClick={ekle}
            disabled={yukleniyor}
            style={{ width: '100%', padding: '10px 0', borderRadius: 6, fontWeight: 600, fontSize: 13, marginTop: 4 }}
          >
            {yukleniyor ? 'Kuruluyor...' : '🔔 Alarmı Aktif Et'}
          </button>

          {hata && <div className="error-msg">{hata}</div>}

          <div style={{ padding: 10, background: 'rgba(255, 152, 0, 0.08)', border: '1px solid rgba(255, 152, 0, 0.2)', borderRadius: 6, fontSize: 11.5, color: '#d1d4dc' }}>
            ⚡ <b>Anlık Takip:</b> BIST fiyatı belirlenen seviyeyi geçtiğinde sistem otomatik bildirim üretir ve WhatsApp botuyla (aktifse) anlık SMS/mesaj iletir.
          </div>
        </div>

        {/* Sağ Panel: Alarmlar Listesi */}
        <div className="panel" style={{ padding: 0, background: '#131722', border: '1px solid #2a2e39', borderRadius: 8, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
          <div style={{ padding: '12px 16px', borderBottom: '1px solid #2a2e39', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
            <span style={{ fontWeight: 600, fontSize: 14, color: '#f0f3fa' }}>Kayıtlı Fiyat Alarmları ({istatistik.tumu})</span>
            <div style={{ display: 'flex', gap: 6 }}>
              <button
                className={filtre === 'tumu' ? 'primary' : 'logout-btn'}
                style={{ fontSize: 11, padding: '4px 10px', borderRadius: 4 }}
                onClick={() => setFiltre('tumu')}
              >
                Tümü ({istatistik.tumu})
              </button>
              <button
                className={filtre === 'bekleyen' ? 'primary' : 'logout-btn'}
                style={{ fontSize: 11, padding: '4px 10px', borderRadius: 4 }}
                onClick={() => setFiltre('bekleyen')}
              >
                Bekleyen ({istatistik.bekleyen})
              </button>
              <button
                className={filtre === 'tetiklenen' ? 'primary' : 'logout-btn'}
                style={{ fontSize: 11, padding: '4px 10px', borderRadius: 4 }}
                onClick={() => setFiltre('tetiklenen')}
              >
                Tetiklenen ({istatistik.tetiklenen})
              </button>
            </div>
          </div>

          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ background: '#1e222d', color: '#787b86', textAlign: 'left', borderBottom: '1px solid #2a2e39' }}>
                <th style={{ padding: '10px 14px' }}>Hisse</th>
                <th style={{ padding: '10px 14px' }}>Koşul</th>
                <th style={{ padding: '10px 14px', textAlign: 'right' }}>Eşik Fiyat</th>
                <th style={{ padding: '10px 14px' }}>Durum</th>
                <th style={{ padding: '10px 14px', textAlign: 'center' }}>İşlemler</th>
              </tr>
            </thead>
            <tbody>
              {!alarmlar && (
                <tr>
                  <td colSpan={5} style={{ padding: 24, textAlign: 'center', color: '#787b86' }}>Alarmlar yükleniyor...</td>
                </tr>
              )}
              {alarmlar && filtrelenmisListe.length === 0 && (
                <tr>
                  <td colSpan={5} style={{ padding: 24, textAlign: 'center', color: '#787b86' }}>
                    {filtre === 'tumu' ? 'Henüz kayıtlı bir fiyat alarmı bulunmuyor.' : 'Bu filtrede alarm yok.'}
                  </td>
                </tr>
              )}
              {filtrelenmisListe.map((a) => (
                <tr key={a.idx} style={{ borderBottom: '1px solid #1e222d' }}>
                  <td style={{ padding: '10px 14px', fontWeight: 700, color: '#2962FF' }}>
                    <a href={`#stratejik?hisse=${a.hisse}`} style={{ color: 'inherit', textDecoration: 'none' }}>
                      {a.hisse} ↗
                    </a>
                  </td>
                  <td style={{ padding: '10px 14px' }}>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, color: a.yon === 'Üzerine Çıkınca' ? '#089981' : '#F23645' }}>
                      <span>{a.yon === 'Üzerine Çıkınca' ? '🔺' : '🔻'}</span>
                      <span>{a.yon}</span>
                    </span>
                  </td>
                  <td style={{ padding: '10px 14px', textAlign: 'right', fontFamily: 'monospace', fontWeight: 600, color: '#f0f3fa' }}>
                    {fmt(a.esik, 2)} ₺
                  </td>
                  <td style={{ padding: '10px 14px' }}>
                    {a.tetiklendi ? (
                      <span className="rozet tetik" style={{ fontSize: 11, background: 'rgba(8, 153, 129, 0.2)', color: '#089981' }}>
                        ✓ Tetiklendi
                      </span>
                    ) : (
                      <span className="rozet bekle" style={{ fontSize: 11, background: 'rgba(255, 152, 0, 0.15)', color: '#FF9800' }}>
                        ⏳ İzleniyor
                      </span>
                    )}
                  </td>
                  <td style={{ padding: '10px 14px', textAlign: 'center' }}>
                    <button
                      className="logout-btn"
                      onClick={() => sil(a.idx)}
                      style={{ fontSize: 11, padding: '3px 8px', borderRadius: 4, color: '#F23645' }}
                      title="Alarmı Sil"
                    >
                      🗑️ Sil
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

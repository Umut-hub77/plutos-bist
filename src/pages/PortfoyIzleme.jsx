import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { fmt, Yuzde, Tutar } from '../lib/format.jsx';
import PlotlyGrafik from '../components/PlotlyGrafik.jsx';
import BankaBaglantiModal from '../components/BankaBaglantiModal.jsx';

const SIRKETLER = {
  THYAO: 'Türk Hava Yolları',
  GARAN: 'Garanti BBVA',
  ASELS: 'Aselsan Elektronik',
  EREGL: 'Ereğli Demir Çelik',
  TUPRS: 'Tüpraş Rafinerileri',
  KCHOL: 'Koç Holding',
  BIMAS: 'BİM Birleşik Mağazalar',
  AKBNK: 'Akbank',
  YKBNK: 'Yapı Kredi',
  SAHOL: 'Sabancı Holding',
  SISE: 'Şişecam',
  PGSUS: 'Pegasus',
  FROTO: 'Ford Otosan',
  TOASO: 'Tofaş Oto',
  TCELL: 'Turkcell',
  PETKM: 'Petkim',
  VAKBN: 'VakıfBank',
  HALKB: 'Halkbank',
  MGROS: 'Migros Ticaret',
};

function portfoyDonutFigur(pozisyonlar, nakit) {
  const labels = [...pozisyonlar.map(p => p.hisse), 'Nakit Bakiye'];
  const values = [...pozisyonlar.map(p => p.piyasa_degeri), nakit];
  const colors = ['#2962FF', '#089981', '#FF9800', '#9C27B0', '#00BCD4', '#F5C451', '#E91E63', '#4CAF50', '#787B86'];

  const data = [
    {
      type: 'pie',
      hole: 0.65,
      labels,
      values,
      textinfo: 'label+percent',
      textposition: 'inside',
      insidetextorientation: 'radial',
      marker: { colors: colors.slice(0, labels.length) },
      hoverinfo: 'label+value+percent',
    },
  ];

  const layout = {
    height: 280,
    margin: { l: 15, r: 15, t: 15, b: 15 },
    paper_bgcolor: '#131722',
    plot_bgcolor: '#131722',
    showlegend: false,
    font: { family: 'JetBrains Mono', color: '#D1D4DC', size: 11 },
  };

  return { data, layout };
}

export default function PortfoyIzleme({ api, onModulDegistir }) {
  const [veri, setVeri] = useState(null);
  const [yukleniyor, setYukleniyor] = useState(true);
  const [hata, setHata] = useState('');
  const [bankaModalAcik, setBankaModalAcik] = useState(false);
  const [duzenleModalAcik, setDuzenleModalAcik] = useState(false);
  const [yeniHisse, setYeniHisse] = useState('THYAO');
  const [yeniLot, setYeniLot] = useState('100');
  const [yeniMaliyet, setYeniMaliyet] = useState('285.00');
  const [duzenleNakit, setDuzenleNakit] = useState('');
  const [islemMesaji, setIslemMesaji] = useState('');

  const yukle = useCallback(async () => {
    setYukleniyor(true);
    setHata('');
    try {
      const res = await api('/api/portfolio');
      setVeri(res);
    } catch (e) {
      setHata(e.message || 'Portföy verisi alınamadı.');
    } finally {
      setYukleniyor(false);
    }
  }, [api]);

  useEffect(() => {
    yukle();
  }, [yukle]);

  const modDegistir = async (yeniMod) => {
    try {
      await api('/api/account/switch-mode', { method: 'POST', govde: { mode: yeniMod } });
      yukle();
    } catch (e) {
      setHata(e.message || 'Mod değiştirilemedi.');
    }
  };

  const emirIptalEt = async (orderId) => {
    try {
      await api(`/api/order/cancel/${orderId}`, { method: 'POST' });
      yukle();
    } catch (e) {
      alert(e.message || 'Emir iptal edilemedi.');
    }
  };

  const isReal = veri?.account_mode === 'real';
  const bagliBanka = veri?.real_bank || '';
  const pozisyonlar = veri?.pozisyonlar || [];
  const bekleyenler = veri?.pending_orders || [];
  const nakit = veri?.virtual_cash || 0;
  const blokeNakit = veri?.blocked_cash || 0;
  const toplamVarlik = veri?.toplam_varlik || 0;

  const maliyetToplam = pozisyonlar.reduce((t, p) => t + p.lot * p.maliyet, 0);
  const kz = (veri?.pozisyon_degeri || 0) - maliyetToplam;
  const kzYuzde = maliyetToplam > 0 ? (kz / maliyetToplam) * 100 : 0;

  const donutFig = useMemo(() => {
    if (!veri) return null;
    return portfoyDonutFigur(pozisyonlar, nakit);
  }, [veri, pozisyonlar, nakit]);

  if (hata) return <div className="error-msg">{hata}</div>;
  if (yukleniyor && !veri) return <div className="loading-hint">Portföy Yükleniyor…</div>;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* 1. ÜST MOD GEÇİŞ VE AÇIK BANKACILIK BİLGİ ŞERİDİ */}
      <div
        className="kurumsal-kart"
        style={{
          padding: '14px 18px',
          borderLeft: isReal ? '4px solid #FF9800' : '4px solid #089981',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 14,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div
            style={{
              width: 42,
              height: 42,
              borderRadius: 8,
              background: isReal ? 'rgba(255,152,0,0.15)' : 'rgba(8,153,129,0.15)',
              border: `1px solid ${isReal ? 'rgba(255,152,0,0.3)' : 'rgba(8,153,129,0.3)'}`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 22,
            }}
          >
            {isReal ? '🏛️' : '🎮'}
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ color: '#FFFFFF', fontWeight: 700, fontSize: 16 }}>
                {isReal ? `Gerçek Portföy: ${bagliBanka || 'Banka Bağlı'}` : 'Demo İşlem Portföyü (Plutos Cockpit)'}
              </span>
              <span
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  padding: '2px 8px',
                  borderRadius: 4,
                  background: isReal ? 'rgba(255,152,0,0.2)' : 'rgba(8,153,129,0.2)',
                  color: isReal ? '#FF9800' : '#089981',
                  border: `1px solid ${isReal ? 'rgba(255,152,0,0.4)' : 'rgba(8,153,129,0.4)'}`,
                }}
              >
                {isReal ? '🔒 SALT OKUNUR' : '⚡ İŞLEM AKTİF'}
              </span>
            </div>
            <div style={{ fontSize: 12, color: '#787B86', marginTop: 3 }}>
              {isReal
                ? 'Açık Bankacılık entegrasyonuyla aracı kurumunuzdan çekilen canlı portföy. Güvenlik gereği doğrudan emir gönderilemez.'
                : '100.000 ₺ sanal bakiye ile Borsa İstanbul gerçek tahta fiyatlarında serbestçe alım-satım yapabilirsiniz.'}
            </div>
          </div>
        </div>

        {/* Aksiyon Butonları */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {isReal ? (
            <>
              {veri?.bank_web_url && (
                <a
                  href={veri.bank_web_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="arac-btn"
                  style={{
                    fontSize: 12,
                    padding: '7px 14px',
                    textDecoration: 'none',
                    color: '#2962FF',
                    borderColor: 'rgba(41,98,255,0.4)',
                    background: 'rgba(41,98,255,0.08)',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 5,
                  }}
                >
                  <span>🏛️</span>
                  <span>{bagliBanka || 'Banka'} Web Şubesi ↗</span>
                </a>
              )}
              <button
                className="arac-btn"
                onClick={() => {
                  setDuzenleNakit(String(veri?.virtual_cash || 0));
                  setIslemMesaji('');
                  setDuzenleModalAcik(true);
                }}
                style={{ fontSize: 12, padding: '7px 14px', borderColor: '#FF9800', color: '#FF9800', background: 'rgba(255,152,0,0.1)' }}
              >
                ✏️ Hisselerimi & Nakdimi Düzenle
              </button>
              <button
                className="arac-btn"
                onClick={() => setBankaModalAcik(true)}
                style={{ fontSize: 12, padding: '7px 14px' }}
              >
                Bankayı Değiştir
              </button>
              <button
                className="arac-btn aktif"
                onClick={() => modDegistir('demo')}
                style={{ fontSize: 12, padding: '7px 14px', background: '#089981', borderColor: '#089981' }}
              >
                🎮 Demo Hesaba Geç
              </button>
            </>
          ) : (
            <>
              <button
                className="arac-btn"
                onClick={() => {
                  if (bagliBanka) {
                    modDegistir('real');
                  } else {
                    setBankaModalAcik(true);
                  }
                }}
                style={{ fontSize: 12, padding: '7px 14px', borderColor: '#FF9800', color: '#FF9800' }}
              >
                {bagliBanka ? `💼 ${bagliBanka} Portföyüme Geç` : '🏛️ Gerçek Banka Portföyü Bağla'}
              </button>
              <button
                className="arac-btn aktif"
                onClick={() => onModulDegistir?.('Portföy', 'Emir Ver (Demo)')}
                style={{ fontSize: 12, padding: '7px 14px' }}
              >
                + Yeni Emir Ver
              </button>
            </>
          )}
        </div>
      </div>

      {/* 2. ÜST KURUMSAL VARLIK KARTLARI */}
      <div className="kurumsal-grid-4">
        <div className="kurumsal-kart" style={{ borderTop: `3px solid ${isReal ? '#FF9800' : '#2962FF'}` }}>
          <div className="kurumsal-kart-baslik">
            <span>Toplam Portföy Değeri</span>
            <span className="rozet-al" style={{ color: isReal ? '#FF9800' : '#2962FF', borderColor: isReal ? 'rgba(255,152,0,0.4)' : 'rgba(41,98,255,0.4)', background: isReal ? 'rgba(255,152,0,0.1)' : 'rgba(41,98,255,0.1)' }}>
              {isReal ? 'GERÇEK VARLIK' : 'NET VARLIK'}
            </span>
          </div>
          <div className="kurumsal-kart-deger" style={{ color: '#FFFFFF' }}>
            {fmt(toplamVarlik, 0)} ₺
          </div>
          <div className="kurumsal-kart-alt">
            <span>{isReal ? 'Kurum Senkronizasyonu' : 'Kullanılabilir Varlık'}</span>
            <span style={{ color: '#089981' }}>Canlı</span>
          </div>
        </div>

        <div className="kurumsal-kart" style={{ borderTop: '3px solid #D7FF4E' }}>
          <div className="kurumsal-kart-baslik">
            <span>Hisse Pozisyon Değeri</span>
            <span style={{ fontSize: 11, color: '#787B86' }}>{pozisyonlar.length} Pozisyon</span>
          </div>
          <div className="kurumsal-kart-deger">
            {fmt(veri?.pozisyon_degeri || 0, 0)} ₺
          </div>
          <div className="kurumsal-kart-alt">
            <span>Hisse Ağırlığı</span>
            <span style={{ fontWeight: 700, fontFamily: 'JetBrains Mono', color: '#D7FF4E' }}>
              %{toplamVarlik > 0 ? fmt(((veri?.pozisyon_degeri || 0) / toplamVarlik) * 100, 1) : 0}
            </span>
          </div>
        </div>

        <div className="kurumsal-kart" style={{ borderTop: `3px solid ${kz >= 0 ? '#089981' : '#F23645'}` }}>
          <div className="kurumsal-kart-baslik">
            <span>Toplam Kâr / Zarar</span>
            <span className={kz >= 0 ? 'rozet-al' : 'rozet-sat'}>{kz >= 0 ? 'KÂRDA' : 'ZARARDA'}</span>
          </div>
          <div className="kurumsal-kart-deger" style={{ color: kz >= 0 ? '#089981' : '#F23645' }}>
            <Tutar v={kz} d={0} />
          </div>
          <div className="kurumsal-kart-alt">
            <span>Net Getiri Oranı</span>
            <span style={{ fontWeight: 700, fontFamily: 'JetBrains Mono', color: kz >= 0 ? '#089981' : '#F23645' }}>
              <Yuzde v={kzYuzde} />
            </span>
          </div>
        </div>

        <div className="kurumsal-kart" style={{ borderTop: '3px solid #FF9800' }}>
          <div className="kurumsal-kart-baslik">
            <span>{isReal ? 'Yatırım Nakit Bakiyesi' : 'Kullanılabilir Nakit'}</span>
            <span style={{ fontSize: 11, color: '#787B86' }}>TRY Bakiye</span>
          </div>
          <div className="kurumsal-kart-deger">
            {fmt(nakit, 0)} ₺
          </div>
          <div className="kurumsal-kart-alt">
            {blokeNakit > 0 ? (
              <span style={{ color: '#FF9800' }}>Bloke: {fmt(blokeNakit, 0)} ₺</span>
            ) : (
              <span>Nakit Oranı</span>
            )}
            <span style={{ fontWeight: 700, fontFamily: 'JetBrains Mono' }}>
              %{toplamVarlik > 0 ? fmt((nakit / toplamVarlik) * 100, 1) : 100}
            </span>
          </div>
        </div>
      </div>

      {/* 3. BEKLEYEN LİMİT EMİRLER UYARI KARTI (Demo Modundaysa ve Varsa) */}
      {!isReal && bekleyenler.length > 0 && (
        <div className="kurumsal-kart" style={{ padding: 16, borderLeft: '4px solid #2962FF' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ color: '#2962FF', fontWeight: 700 }}>⏳ Borsada Bekleyen Limit Emirler ({bekleyenler.length})</span>
              <span style={{ fontSize: 11.5, color: '#787B86' }}>
                Toplam Bloke Teminat: <b style={{ color: '#FF9800', fontFamily: 'JetBrains Mono' }}>{fmt(blokeNakit)} ₺</b>
              </span>
            </div>
            <button
              className="arac-btn"
              onClick={() => onModulDegistir?.('Portföy', 'Emir Ver (Demo)')}
              style={{ fontSize: 11, padding: '4px 10px' }}
            >
              Emir Masasına Git ›
            </button>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table>
              <thead>
                <tr>
                  <th>Tarih</th>
                  <th>Hisse</th>
                  <th>Yön</th>
                  <th>Lot</th>
                  <th>Limit Fiyat</th>
                  <th>Piyasa Fiyatı</th>
                  <th>Bloke Tutar</th>
                  <th>Durum</th>
                  <th style={{ textAlign: 'right' }}>İşlem</th>
                </tr>
              </thead>
              <tbody>
                {bekleyenler.map(em => (
                  <tr key={em.id}>
                    <td style={{ color: '#787B86', fontSize: 11 }}>{em.tarih}</td>
                    <td style={{ fontWeight: 700, color: '#FFFFFF' }}>{em.hisse}</td>
                    <td><span className={em.yon === 'AL' ? 'rozet-al' : 'rozet-sat'}>{em.yon}</span></td>
                    <td>{fmt(em.lot, 0)}</td>
                    <td style={{ color: '#2962FF', fontWeight: 700 }}>{fmt(em.fiyat)} ₺</td>
                    <td style={{ color: '#D1D4DC' }}>{fmt(em.anlik_fiyat)} ₺</td>
                    <td style={{ color: '#FF9800', fontWeight: 700 }}>{fmt(em.tutar)} ₺</td>
                    <td><span className="rozet" style={{ background: 'rgba(255,152,0,0.15)', color: '#FF9800' }}>Tahtada</span></td>
                    <td style={{ textAlign: 'right' }}>
                      <button
                        className="arac-btn"
                        onClick={() => emirIptalEt(em.id)}
                        style={{ fontSize: 11, padding: '3px 8px', color: '#F23645', borderColor: 'rgba(242,54,69,0.3)' }}
                      >
                        İptal
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 4. ANA POZİSYONLAR TABLOSU & VARLIK DAĞILIMI */}
      <div className="terminal-iki-kolon">
        {/* Sol: Varlıklarım & Pozisyon Detayları */}
        <div className="kurumsal-kart" style={{ flex: 2, padding: 18 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <h4 style={{ color: '#FFFFFF', margin: 0 }}>
              📊 {isReal ? `${bagliBanka} Portföy Pozisyonları` : 'Demo Portföy Pozisyonlarım'} ({pozisyonlar.length})
            </h4>
            {!isReal && (
              <button
                className="arac-btn aktif"
                onClick={() => onModulDegistir?.('Portföy', 'Emir Ver (Demo)')}
                style={{ fontSize: 11.5, padding: '5px 12px' }}
              >
                + Yeni Emir Ver
              </button>
            )}
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table>
              <thead>
                <tr>
                  <th>Hisse</th>
                  <th>Lot</th>
                  <th>Maliyet</th>
                  <th>Güncel Fiyat</th>
                  <th>Piyasa Değeri</th>
                  <th>Portföy Payı</th>
                  <th>Net K/Z</th>
                  <th style={{ textAlign: 'right' }}>İşlem</th>
                </tr>
              </thead>
              <tbody>
                {pozisyonlar.length ? (
                  pozisyonlar.map(p => {
                    const pkz = p.piyasa_degeri - p.lot * p.maliyet;
                    const pyz = p.maliyet > 0 ? (pkz / (p.lot * p.maliyet)) * 100 : 0;
                    const pay = toplamVarlik > 0 ? (p.piyasa_degeri / toplamVarlik) * 100 : 0;
                    return (
                      <tr key={p.hisse}>
                        <td>
                          <div className="tablo-hisse-hucre">
                            <span className="kod">{p.hisse}</span>
                            <span className="ad">{SIRKETLER[p.hisse] || 'BIST Şirketi'}</span>
                          </div>
                        </td>
                        <td style={{ fontWeight: 700, color: '#FFFFFF' }}>{fmt(p.lot, 0)}</td>
                        <td>{fmt(p.maliyet)} ₺</td>
                        <td style={{ fontWeight: 600, color: '#D1D4DC' }}>{fmt(p.guncel_fiyat)} ₺</td>
                        <td style={{ fontWeight: 700, color: '#FFFFFF' }}>{fmt(p.piyasa_degeri)} ₺</td>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <span style={{ fontSize: 11, minWidth: 34 }}>%{fmt(pay, 1)}</span>
                            <div style={{ width: 50, height: 5, background: '#1E222D', borderRadius: 3, overflow: 'hidden' }}>
                              <div style={{ width: `${Math.min(100, pay)}%`, height: '100%', background: isReal ? '#FF9800' : '#2962FF' }} />
                            </div>
                          </div>
                        </td>
                        <td>
                          <span style={{ color: pkz >= 0 ? '#089981' : '#F23645', fontWeight: 700 }}>
                            <Tutar v={pkz} /> (<Yuzde v={pyz} />)
                          </span>
                        </td>
                        <td style={{ textAlign: 'right' }}>
                          <div className="hisse-aksiyon-grup">
                            {!isReal ? (
                              <>
                                <button
                                  className="btn-aksiyon-al"
                                  onClick={() => {
                                    window.location.hash = `#emir?hisse=${p.hisse}&yon=AL`;
                                    onModulDegistir?.('Portföy', 'Emir Ver (Demo)');
                                  }}
                                  title={`${p.hisse} Hızlı Alış Emri Gir`}
                                >
                                  AL
                                </button>
                                <button
                                  className="btn-aksiyon-sat"
                                  onClick={() => {
                                    window.location.hash = `#emir?hisse=${p.hisse}&yon=SAT`;
                                    onModulDegistir?.('Portföy', 'Emir Ver (Demo)');
                                  }}
                                  title={`${p.hisse} Hızlı Satış Emri Gir`}
                                >
                                  SAT
                                </button>
                              </>
                            ) : (
                              <span style={{ fontSize: 10.5, color: '#787B86', padding: '2px 6px', background: '#1E222D', borderRadius: 4 }}>
                                Salt Okunur
                              </span>
                            )}
                            <button
                              className="btn-aksiyon-grafik"
                              onClick={() => {
                                window.location.hash = `#stratejik?hisse=${p.hisse}`;
                                onModulDegistir?.('Analiz', 'Stratejik Analiz');
                              }}
                              title={`${p.hisse} Stratejik Analiz Grafiğine Git`}
                            >
                              Grafik
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={8} className="empty-hint" style={{ padding: 30, textAlign: 'center' }}>
                      {isReal
                        ? 'Bağlı kurumunuzda henüz hisse senedi pozisyonu görünmüyor.'
                        : 'Portföyünüzde henüz hisse senedi bulunmuyor. "Emir Ver (Demo)" ekranından ilk BIST hissenizi ekleyebilirsiniz.'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Sağ: Portföy Varlık Dağılımı Donut Grafiği */}
        <div className="kurumsal-kart" style={{ flex: 1, padding: 18 }}>
          <h4 style={{ color: '#FFFFFF', margin: '0 0 10px' }}>🍩 Varlık & Portföy Dağılımı</h4>
          {donutFig && <PlotlyGrafik data={donutFig.data} layout={donutFig.layout} config={{ staticPlot: true }} />}

          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 10, borderTop: '1px solid #1E222D', paddingTop: 10, fontSize: 12 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', color: '#787B86' }}>
              <span>Hisse Senedi Varlığı:</span>
              <span style={{ color: '#FFFFFF', fontWeight: 600 }}>{fmt(veri?.pozisyon_degeri || 0)} ₺</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', color: '#787B86' }}>
              <span>Nakit Rezervi:</span>
              <span style={{ color: '#089981', fontWeight: 600 }}>{fmt(nakit)} ₺</span>
            </div>
            {blokeNakit > 0 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', color: '#787B86' }}>
                <span>Bloke Limit Teminatı:</span>
                <span style={{ color: '#FF9800', fontWeight: 600 }}>{fmt(blokeNakit)} ₺</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Açık Bankacılık Bağlantı Modalı */}
      <BankaBaglantiModal
        acik={bankaModalAcik}
        kapat={() => setBankaModalAcik(false)}
        api={api}
        bagliBanka={bagliBanka}
        onBaglandi={() => {
          yukle();
        }}
      />

      {/* Gerçek Banka Portföyü Düzenleme Modalı */}
      {duzenleModalAcik && (
        <div className="tradeall-modal-backdrop" onClick={() => setDuzenleModalAcik(false)}>
          <div
            className="tradeall-modal"
            onClick={e => e.stopPropagation()}
            style={{ maxWidth: 620, width: '92vw', background: '#131722', border: '1px solid #2A2E39', borderRadius: 12 }}
          >
            <div className="tradeall-modal-header" style={{ padding: '16px 20px', borderBottom: '1px solid #2A2E39' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ fontSize: 20 }}>✏️</span>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 16, color: '#FFFFFF' }}>
                    {bagliBanka || 'Gerçek Banka'} Portföyünü Düzenle
                  </div>
                  <div style={{ fontSize: 11, color: '#787B86' }}>
                    Bankanızdaki hisseleri, lot adetlerini, maliyetlerinizi ve nakit bakiyenizi tanımlayın.
                  </div>
                </div>
              </div>
              <button className="tradeall-modal-kapat" onClick={() => setDuzenleModalAcik(false)} aria-label="Kapat">✕</button>
            </div>

            <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 16 }}>
              {islemMesaji && (
                <div style={{ padding: '8px 12px', background: 'rgba(8, 153, 129, 0.15)', border: '1px solid #089981', color: '#089981', borderRadius: 6, fontSize: 12 }}>
                  {islemMesaji}
                </div>
              )}

              {/* 1. Nakit Bakiyesi */}
              <div style={{ background: '#1E222D', padding: 12, borderRadius: 8, border: '1px solid #2A2E39' }}>
                <label style={{ display: 'block', fontSize: 11.5, color: '#787B86', marginBottom: 6, fontWeight: 600 }}>
                  🏛️ BANKA YATIRIM NAKİT BAKİYESİ (₺)
                </label>
                <div style={{ display: 'flex', gap: 8 }}>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={duzenleNakit}
                    onChange={e => setDuzenleNakit(e.target.value)}
                    placeholder="Örn: 25000"
                    style={{ flex: 1, background: '#131722', border: '1px solid #2A2E39', color: '#FFFFFF', padding: '8px 12px', borderRadius: 6, fontSize: 13, fontFamily: 'JetBrains Mono' }}
                  />
                  <button
                    type="button"
                    className="arac-btn aktif"
                    onClick={async () => {
                      try {
                        await api('/api/bank/portfolio/cash', { method: 'POST', govde: { nakit: parseFloat(duzenleNakit) || 0 } });
                        setIslemMesaji('Nakit bakiye güncellendi.');
                        yukle();
                      } catch (err) {
                        alert(err.message || 'Hata oluştu');
                      }
                    }}
                    style={{ padding: '8px 14px', fontSize: 12, background: '#089981', borderColor: '#089981', color: '#FFFFFF', fontWeight: 600 }}
                  >
                    Kaydet
                  </button>
                </div>
              </div>

              {/* 2. Mevcut Hisseler */}
              <div>
                <label style={{ display: 'block', fontSize: 11.5, color: '#787B86', marginBottom: 6, fontWeight: 600 }}>
                  📊 BANKADAKİ MEVCUT HİSSELERİNİZ ({pozisyonlar.length})
                </label>
                {pozisyonlar.length === 0 ? (
                  <div style={{ color: '#787B86', fontSize: 12, padding: 10, background: '#1E222D', borderRadius: 6, textAlign: 'center' }}>
                    Henüz hisseniz yok. Aşağıdaki formdan ilk hissenizi ekleyebilirsiniz.
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 180, overflowY: 'auto' }}>
                    {pozisyonlar.map(p => (
                      <div
                        key={p.hisse}
                        style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#1E222D', padding: '8px 12px', borderRadius: 6, border: '1px solid #2A2E39' }}
                      >
                        <div>
                          <b style={{ color: '#FFFFFF', fontSize: 13 }}>{p.hisse}</b>
                          <span style={{ color: '#787B86', fontSize: 11.5, marginLeft: 8 }}>
                            {p.lot} Lot @ {fmt(p.maliyet)} ₺
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={async () => {
                            if (window.confirm(`${p.hisse} hissesini portföyden silmek istiyor musunuz?`)) {
                              try {
                                await api(`/api/portfolio/${p.hisse}`, { method: 'DELETE' });
                                setIslemMesaji(`${p.hisse} silindi.`);
                                yukle();
                              } catch (err) {
                                alert(err.message || 'Silinemedi');
                              }
                            }
                          }}
                          style={{ background: 'rgba(242, 54, 69, 0.15)', border: '1px solid rgba(242, 54, 69, 0.3)', color: '#F23645', borderRadius: 4, padding: '3px 8px', fontSize: 11, cursor: 'pointer' }}
                        >
                          Sil
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* 3. Yeni Hisse Ekle / Güncelle Formu */}
              <div style={{ background: '#1E222D', padding: 12, borderRadius: 8, border: '1px solid #2A2E39' }}>
                <label style={{ display: 'block', fontSize: 11.5, color: '#FF9800', marginBottom: 8, fontWeight: 700 }}>
                  + YENİ HİSSE EKLE VEYA GÜNCELLE
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(100px, 1fr)) auto', gap: 8, alignItems: 'center' }}>
                  <input
                    type="text"
                    value={yeniHisse}
                    onChange={e => setYeniHisse(e.target.value.toUpperCase())}
                    placeholder="Sembol (THYAO)"
                    maxLength={6}
                    style={{ background: '#131722', border: '1px solid #2A2E39', color: '#FFFFFF', padding: '8px 10px', borderRadius: 6, fontSize: 12, fontFamily: 'JetBrains Mono' }}
                  />
                  <input
                    type="number"
                    min="1"
                    value={yeniLot}
                    onChange={e => setYeniLot(e.target.value)}
                    placeholder="Lot"
                    style={{ background: '#131722', border: '1px solid #2A2E39', color: '#FFFFFF', padding: '8px 10px', borderRadius: 6, fontSize: 12, fontFamily: 'JetBrains Mono' }}
                  />
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={yeniMaliyet}
                    onChange={e => setYeniMaliyet(e.target.value)}
                    placeholder="Maliyet ₺"
                    style={{ background: '#131722', border: '1px solid #2A2E39', color: '#FFFFFF', padding: '8px 10px', borderRadius: 6, fontSize: 12, fontFamily: 'JetBrains Mono' }}
                  />
                  <button
                    type="button"
                    className="arac-btn aktif"
                    onClick={async () => {
                      if (!yeniHisse) return alert('Lütfen hisse kodu girin.');
                      try {
                        await api('/api/portfolio', {
                          method: 'POST',
                          govde: { hisse: yeniHisse, lot: parseInt(yeniLot) || 1, maliyet: parseFloat(yeniMaliyet) || 0 }
                        });
                        setIslemMesaji(`${yeniHisse} portföye kaydedildi.`);
                        yukle();
                      } catch (err) {
                        alert(err.message || 'Eklenemedi');
                      }
                    }}
                    style={{ padding: '8px 14px', fontSize: 12, background: '#FF9800', borderColor: '#FF9800', color: '#000000', fontWeight: 700 }}
                  >
                    Kaydet
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

import React, { useState, useEffect } from 'react';

const VARSAYILAN_BANKALAR = [
  { id: 'is_bankasi', ad: 'İş Bankası (İş Yatırım)', aciklama: 'İş Yatırım Menkul Değerler A.Ş.', renk: '#004B93', logo_text: 'İŞ' },
  { id: 'garanti_bbva', ad: 'Garanti BBVA Yatırım', aciklama: 'Garanti Yatırım Menkul Kıymetler A.Ş.', renk: '#008542', logo_text: 'GB' },
  { id: 'yapi_kredi', ad: 'Yapı Kredi Yatırım', aciklama: 'Yapı Kredi Yatırım Menkul Değerler A.Ş.', renk: '#003A70', logo_text: 'YK' },
  { id: 'akbank', ad: 'Akbank Yatırımcı', aciklama: 'Ak Yatırım Menkul Değerler A.Ş.', renk: '#E30613', logo_text: 'AK' },
  { id: 'ziraat', ad: 'Ziraat Yatırım', aciklama: 'Ziraat Yatırım Menkul Değerler A.Ş.', renk: '#D2001A', logo_text: 'ZR' },
  { id: 'vakif', ad: 'Vakıf Yatırım', aciklama: 'Vakıf Yatırım Menkul Değerler A.Ş.', renk: '#FDB813', logo_text: 'VK' },
  { id: 'qnb', ad: 'QNB Finansinvest', aciklama: 'QNB Finansinvest Menkul Değerler A.Ş.', renk: '#6A1A40', logo_text: 'QNB' },
  { id: 'midas', ad: 'Midas Menkul Değerler', aciklama: 'Midas Menkul Değerler A.Ş. — SPK Lisanslı', renk: '#11E1A3', logo_text: 'MD' },
];

export default function BankaBaglantiModal({ acik, kapat, api, bagliBanka, onBaglandi }) {
  const [bankalar, setBankalar] = useState(VARSAYILAN_BANKALAR);
  const [secilenBanka, setSecilenBanka] = useState(null);
  const [asama, setAsama] = useState('liste'); // 'liste' | 'giris' | 'bekleniyor' | 'basarili'
  const [tcKimlik, setTcKimlik] = useState('');
  const [sifre, setSifre] = useState('');
  const [smsKodu, setSmsKodu] = useState('');
  const [hata, setHata] = useState('');
  const [yukleniyor, setYukleniyor] = useState(false);

  useEffect(() => {
    if (acik) {
      setHata('');
      setAsama('liste');
      setSecilenBanka(null);
      setSmsKodu('');
      api('/api/bank/list')
        .then(r => {
          if (r?.bankalar?.length) setBankalar(r.bankalar);
        })
        .catch(() => {});
    }
  }, [acik, api]);

  if (!acik) return null;

  const handleBankaSec = (b) => {
    setSecilenBanka(b);
    setAsama('giris');
    setHata('');
  };

  const handleBaglan = async (e) => {
    e?.preventDefault();
    if (!tcKimlik || tcKimlik.trim().length < 5) {
      setHata('Lütfen geçerli bir T.C. Kimlik / Müşteri No girin.');
      return;
    }
    setHata('');
    setYukleniyor(true);
    setAsama('bekleniyor');

    try {
      // Simüle Açık Bankacılık doğrulaması (1.2 saniye gecikme)
      await new Promise(r => setTimeout(r, 1200));

      const res = await api('/api/bank/connect', {
        method: 'POST',
        govde: {
          banka: secilenBanka.ad,
          musteri_no: tcKimlik,
          sms_kodu: smsKodu || '123456',
        },
      });

      setAsama('basarili');
      setTimeout(() => {
        onBaglandi?.(res);
        kapat();
      }, 1500);
    } catch (err) {
      setAsama('giris');
      setHata(err.message || 'Banka bağlantısı kurulamadı.');
    } finally {
      setYukleniyor(false);
    }
  };

  const handleBaglantiKes = async () => {
    if (!window.confirm(`${bagliBanka} bağlantısını kesmek istediğinize emin misiniz? Demo moda dönülecektir.`)) {
      return;
    }
    setYukleniyor(true);
    try {
      await api('/api/bank/disconnect', { method: 'POST' });
      onBaglandi?.({ account_mode: 'demo', banka: '' });
      kapat();
    } catch (err) {
      setHata(err.message || 'Bağlantı kesilemedi.');
    } finally {
      setYukleniyor(false);
    }
  };

  return (
    <div className="tradeall-modal-backdrop" onClick={kapat}>
      <div
        className="tradeall-modal banka-baglanti-modal"
        onClick={e => e.stopPropagation()}
        style={{ maxWidth: 620, width: '92vw', background: '#131722', border: '1px solid #2A2E39', borderRadius: 12 }}
      >
        {/* Modal Başlığı */}
        <div className="tradeall-modal-header" style={{ padding: '16px 20px', borderBottom: '1px solid #2A2E39' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 20 }}>🏛️</span>
            <div>
              <div style={{ fontWeight: 700, fontSize: 16, color: '#FFFFFF' }}>
                Açık Bankacılık (Open Banking) Portföy Bağlantısı
              </div>
              <div style={{ fontSize: 11, color: '#787B86' }}>
                BIST Aracı Kurum & Banka Entegrasyon Masası (Salt Okunur / Read-Only)
              </div>
            </div>
          </div>
          <button className="tradeall-modal-kapat" onClick={kapat} aria-label="Kapat">
            ✕
          </button>
        </div>

        {/* Modal İçeriği */}
        <div style={{ padding: 20 }}>
          {bagliBanka && asama === 'liste' && (
            <div
              style={{
                background: 'rgba(8, 153, 129, 0.1)',
                border: '1px solid rgba(8, 153, 129, 0.3)',
                borderRadius: 8,
                padding: '14px 16px',
                marginBottom: 18,
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: 12,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ fontSize: 24 }}>✅</span>
                <div>
                  <div style={{ color: '#FFFFFF', fontWeight: 600, fontSize: 14 }}>
                    Aktif Bağlantı: <span style={{ color: '#089981' }}>{bagliBanka}</span>
                  </div>
                  <div style={{ fontSize: 11.5, color: '#787B86' }}>
                    Portföy verileriniz güvenli API üzerinden anlık senkronize ediliyor.
                  </div>
                </div>
              </div>
              <button
                className="arac-btn"
                onClick={handleBaglantiKes}
                disabled={yukleniyor}
                style={{
                  background: 'rgba(242, 54, 69, 0.15)',
                  color: '#F23645',
                  borderColor: 'rgba(242, 54, 69, 0.4)',
                  fontSize: 12,
                  padding: '6px 14px',
                }}
              >
                {yukleniyor ? 'İşleniyor...' : 'Bağlantıyı Kes'}
              </button>
            </div>
          )}

          {/* Aşama 1: Banka Listesi Seçimi */}
          {asama === 'liste' && (
            <div>
              <div style={{ marginBottom: 14 }}>
                <div style={{ fontSize: 13, color: '#D1D4DC', fontWeight: 600, marginBottom: 4 }}>
                  Portföyünüzü bağlamak istediğiniz banka veya aracı kurumu seçiniz:
                </div>
                <div style={{ fontSize: 11.5, color: '#787B86' }}>
                  Açık Bankacılık standartları gereği yalnızca portföy pozisyonlarınız ve bakiyeniz okunur. İşlem yetkisi verilmez.
                </div>
              </div>

              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
                  gap: 12,
                  maxHeight: 380,
                  overflowY: 'auto',
                  paddingRight: 4,
                }}
              >
                {bankalar.map(b => (
                  <div
                    key={b.id}
                    onClick={() => handleBankaSec(b)}
                    style={{
                      background: '#1E222D',
                      border: '1px solid #2A2E39',
                      borderRadius: 8,
                      padding: 14,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 12,
                      transition: 'all 0.2s ease',
                    }}
                    onMouseEnter={e => {
                      e.currentTarget.style.borderColor = b.renk || '#2962FF';
                      e.currentTarget.style.background = '#242836';
                    }}
                    onMouseLeave={e => {
                      e.currentTarget.style.borderColor = '#2A2E39';
                      e.currentTarget.style.background = '#1E222D';
                    }}
                  >
                    <div
                      style={{
                        width: 42,
                        height: 42,
                        borderRadius: 8,
                        background: b.renk || '#2962FF',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#FFFFFF',
                        fontWeight: 700,
                        fontSize: 14,
                        letterSpacing: 0.5,
                        flexShrink: 0,
                      }}
                    >
                      {b.logo_text || 'BK'}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ color: '#FFFFFF', fontWeight: 600, fontSize: 13.5, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {b.ad}
                      </div>
                      <div style={{ color: '#787B86', fontSize: 11, marginTop: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {b.aciklama}
                      </div>
                    </div>
                    <span style={{ color: '#787B86', fontSize: 16 }}>›</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Aşama 2: Banka Giriş / Onay Ekranı */}
          {asama === 'giris' && secilenBanka && (
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
                <button
                  type="button"
                  onClick={() => setAsama('liste')}
                  style={{
                    background: 'transparent',
                    border: '1px solid #2A2E39',
                    borderRadius: 6,
                    color: '#D1D4DC',
                    padding: '4px 10px',
                    fontSize: 12,
                    cursor: 'pointer',
                  }}
                >
                  ← Geri
                </button>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div
                    style={{
                      width: 28,
                      height: 28,
                      borderRadius: 6,
                      background: secilenBanka.renk || '#2962FF',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#FFFFFF',
                      fontWeight: 700,
                      fontSize: 11,
                    }}
                  >
                    {secilenBanka.logo_text || 'BK'}
                  </div>
                  <span style={{ color: '#FFFFFF', fontWeight: 700, fontSize: 15 }}>
                    {secilenBanka.ad}
                  </span>
                </div>
              </div>

              {/* Güvenlik Rozeti & Yasal Bilgilendirme */}
              <div
                style={{
                  background: 'rgba(41, 98, 255, 0.08)',
                  border: '1px solid rgba(41, 98, 255, 0.25)',
                  borderRadius: 8,
                  padding: 12,
                  marginBottom: 16,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#2962FF', fontWeight: 600, fontSize: 12, marginBottom: 4 }}>
                  <span>🔒</span>
                  <span>256-Bit SSL Açık Bankacılık Güvenlik Protokolü</span>
                </div>
                <div style={{ fontSize: 11, color: '#B2B5BE', lineHeight: 1.4 }}>
                  Bu bağlantı yalnızca hisse senedi pozisyonlarınızı ve yatırım nakit bakiyenizi <b>SALT OKUNUR (Read-Only)</b> olarak Plutos ekranlarına aktarır.
                  Hesabınızdan <b>para transferi veya alım/satım emri VERİLEMEZ</b>.
                </div>
              </div>

              {hata && <div className="error-msg" style={{ marginBottom: 12 }}>{hata}</div>}

              <form onSubmit={handleBaglan} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 12, color: '#787B86', marginBottom: 4 }}>
                    T.C. Kimlik No veya Müşteri Numarası
                  </label>
                  <input
                    type="text"
                    value={tcKimlik}
                    onChange={e => setTcKimlik(e.target.value)}
                    placeholder="Örn: 12345678901"
                    maxLength={11}
                    required
                    style={{
                      width: '100%',
                      background: '#1E222D',
                      border: '1px solid #2A2E39',
                      borderRadius: 6,
                      color: '#FFFFFF',
                      padding: '10px 12px',
                      fontSize: 13,
                      fontFamily: 'JetBrains Mono, monospace',
                      outline: 'none',
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: 12, color: '#787B86', marginBottom: 4 }}>
                    İnternet Şubesi / API Giriş Şifresi
                  </label>
                  <input
                    type="password"
                    value={sifre}
                    onChange={e => setSifre(e.target.value)}
                    placeholder="••••••••"
                    required
                    style={{
                      width: '100%',
                      background: '#1E222D',
                      border: '1px solid #2A2E39',
                      borderRadius: 6,
                      color: '#FFFFFF',
                      padding: '10px 12px',
                      fontSize: 13,
                      outline: 'none',
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: 12, color: '#787B86', marginBottom: 4 }}>
                    SMS / Mobil Onay Kodu (Simülasyon için 6 haneli kod)
                  </label>
                  <input
                    type="text"
                    value={smsKodu}
                    onChange={e => setSmsKodu(e.target.value)}
                    placeholder="123456"
                    maxLength={6}
                    style={{
                      width: '100%',
                      background: '#1E222D',
                      border: '1px solid #2A2E39',
                      borderRadius: 6,
                      color: '#FFFFFF',
                      padding: '10px 12px',
                      fontSize: 13,
                      fontFamily: 'JetBrains Mono, monospace',
                      outline: 'none',
                    }}
                  />
                </div>

                <div style={{ display: 'flex', gap: 10, marginTop: 10 }}>
                  <button
                    type="button"
                    className="arac-btn"
                    onClick={() => setAsama('liste')}
                    style={{ flex: 1, padding: 12 }}
                  >
                    Vazgeç
                  </button>
                  <button
                    type="submit"
                    className="arac-btn aktif"
                    disabled={yukleniyor}
                    style={{
                      flex: 2,
                      padding: 12,
                      background: secilenBanka.renk || '#2962FF',
                      borderColor: secilenBanka.renk || '#2962FF',
                      color: '#FFFFFF',
                      fontWeight: 700,
                    }}
                  >
                    {yukleniyor ? 'Bağlanıyor...' : `Güvenli Bağlan (${secilenBanka.logo_text})`}
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Aşama 3: Bağlantı Kuruluyor (Spinner) */}
          {asama === 'bekleniyor' && (
            <div style={{ textAlign: 'center', padding: '36px 20px' }}>
              <div
                style={{
                  width: 44,
                  height: 44,
                  border: '3px solid #2A2E39',
                  borderTopColor: '#2962FF',
                  borderRadius: '50%',
                  margin: '0 auto 16px',
                  animation: 'spin 0.8s linear infinite',
                }}
              />
              <div style={{ color: '#FFFFFF', fontWeight: 600, fontSize: 15, marginBottom: 6 }}>
                {secilenBanka?.ad} API'sine Güvenle Bağlanılıyor...
              </div>
              <div style={{ color: '#787B86', fontSize: 12 }}>
                BIST pay senedi pozisyonları ve yatırım bakiyeniz şifreli protokol ile senkronize ediliyor.
              </div>
            </div>
          )}

          {/* Aşama 4: Başarılı */}
          {asama === 'basarili' && (
            <div style={{ textAlign: 'center', padding: '36px 20px' }}>
              <div style={{ fontSize: 44, marginBottom: 12 }}>🎉</div>
              <div style={{ color: '#089981', fontWeight: 700, fontSize: 16, marginBottom: 6 }}>
                Bağlantı Başarıyla Kuruldu!
              </div>
              <div style={{ color: '#D1D4DC', fontSize: 13, marginBottom: 14 }}>
                {secilenBanka?.ad} portföyünüz salt okunur modda aktarıldı. Gerçek portföy görünümüne yönlendiriliyorsunuz...
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

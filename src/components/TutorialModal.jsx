import React, { useState, useEffect } from 'react';

const REHBER_ADIMLARI = [
  {
    baslik: 'Plutos Yatırım Terminaline Hoş Geldiniz! 👋',
    altBaslik: 'Yatırıma yeni başlayanlardan profesyonel fon yöneticilerine kadar herkes için tasarlandı.',
    rozet: 'GİRİŞ',
    ikon: '🏛️',
    icerik: (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <p style={{ margin: 0, lineHeight: 1.6, color: '#D1D4DC' }}>
          Plutos; Borsa İstanbul (BIST), kıymetli madenler ve döviz piyasalarını tek bir kurumsal ekrandan canlı takip etmenizi, analiz yapmanızı ve <b>100.000 ₺ risksiz sanal bakiye</b> ile pratik yapmanızı sağlar.
        </p>
        <div className="rehber-grid-2" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 10, marginTop: 4 }}>
          <div style={{ background: '#1E222D', padding: 12, borderRadius: 6, border: '1px solid #2A2E39' }}>
            <span style={{ color: '#089981', fontWeight: 700, fontSize: 13, display: 'block', marginBottom: 4 }}>🟢 Yeni Başlayanlar İçin:</span>
            <span style={{ fontSize: 12, color: '#787B86' }}>Sade görünüm, şirketlerin tam isimleri, terim açıklamaları ve risksiz demo işlem.</span>
          </div>
          <div style={{ background: '#1E222D', padding: 12, borderRadius: 6, border: '1px solid #2A2E39' }}>
            <span style={{ color: '#2962FF', fontWeight: 700, fontSize: 13, display: 'block', marginBottom: 4 }}>⚡ Profesyoneller İçin:</span>
            <span style={{ fontSize: 12, color: '#787B86' }}>5 kademe derinlik (Level 2), AKD takas analizi, Markowitz optimizasyonu ve Monte Carlo.</span>
          </div>
        </div>
      </div>
    ),
  },
  {
    baslik: '1. Canlı Piyasa & Kayan Ticker Bandı 📊',
    altBaslik: 'En üstteki kayan bant piyasanın anlık nabzını tutar.',
    rozet: 'PİYASA BANDI',
    ikon: '📈',
    icerik: (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <p style={{ margin: 0, lineHeight: 1.6, color: '#D1D4DC' }}>
          Ekranın en üstünde yer alan şerit, Borsa İstanbul hisselerinin, altın (Gram & Çeyrek), gümüş, brent petrol ve döviz kurlarının son fiyatlarını gösterir.
        </p>
        <ul style={{ margin: 0, paddingLeft: 18, color: '#D1D4DC', fontSize: 12.5, lineHeight: 1.7 }}>
          <li><b>Kategori Çipleri:</b> Sadece BIST Hisseleri, Endeksler veya Döviz & Emtia'yı tek tıkla filtreleyebilirsiniz.</li>
          <li><b>Durdur / Başlat:</b> Sol taraftaki ⏸️ butonu ile akışı dilediğiniz an duraklatabilirsiniz. Farenizi üzerine getirdiğinizde de otomatik durur.</li>
          <li><b>Tıklanabilir Hisseler:</b> Bir hisseye tıkladığınızda sistem anında o şirketin teknik grafiğini ve derinlik tablosunu açar.</li>
        </ul>
      </div>
    ),
  },
  {
    baslik: '2. Sade ve Kolay Görünüm Modu 💡',
    altBaslik: 'Karmaşık finansal göstergeler yerine net ve anlaşılır özetler.',
    rozet: 'KULLANICI DOSTU',
    ikon: '🎯',
    icerik: (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <p style={{ margin: 0, lineHeight: 1.6, color: '#D1D4DC' }}>
          Ana sayfanın sağ üstünde yer alan <b>"Sade Görünüm / Gelişmiş Görünüm"</b> anahtarı ile arayüzü kendinize göre özelleştirebilirsiniz:
        </p>
        <div style={{ background: '#1E222D', padding: 12, borderRadius: 6, border: '1px solid #2A2E39', fontSize: 12.5, color: '#D1D4DC' }}>
          <p style={{ margin: '0 0 6px 0', fontWeight: 600, color: '#D7FF4E' }}>🌱 Sade Görünümde Neler Var?</p>
          <span style={{ color: '#787B86', lineHeight: 1.6 }}>
            Toplam varlığınız ve nakdiniz anlaşılır kartlarda özetlenir. BIST 100 endeksi sade bir seans grafiğiyle gösterilir. Günün en popüler altın, döviz ve şirketleri doğrudan alım butonlarıyla listelenir.
          </span>
        </div>
      </div>
    ),
  },
  {
    baslik: '3. Risksiz Demo İşlem (100.000 ₺ Sanal Bakiye) 💰',
    altBaslik: 'Kendi paranızı riske atmadan borsa işlemlerini uygulamalı öğrenin.',
    rozet: 'RİSKSİZ EĞİTİM',
    ikon: '🛡️',
    icerik: (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <p style={{ margin: 0, lineHeight: 1.6, color: '#D1D4DC' }}>
          Hesabınıza tanımlı <b>100.000 ₺ sanal nakit</b> bulunmaktadır.
        </p>
        <ul style={{ margin: 0, paddingLeft: 18, color: '#D1D4DC', fontSize: 12.5, lineHeight: 1.7 }}>
          <li><b>Emir Ver (Demo):</b> İstediğiniz hisseyi seçip, Piyasa veya Limit fiyatıyla gerçek piyasa fiyatından demo alıp satabilirsiniz.</li>
          <li><b>Portföyüm:</b> Aldığınız hisselerin anlık piyasa değerini, kâr/zarar oranını ve maliyetinizi takip edebilirsiniz.</li>
          <li><b>Gerçek Borsaya Gitmez:</b> İşlemleriniz simülasyondur; böylece stratejilerinizi güvenle test edebilirsiniz.</li>
        </ul>
      </div>
    ),
  },
  {
    baslik: '4. Profesyonel Analiz & Kuantitatif Araçlar 🔬',
    altBaslik: 'Derinlik, AKD, Algoritmik Tarayıcı ve Yapay Zeka.',
    rozet: 'PRO ANALİZ',
    ikon: '📊',
    icerik: (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <p style={{ margin: 0, lineHeight: 1.6, color: '#D1D4DC' }}>
          İleri düzey analiz yapmak istediğinizde üst menüden şu araçlara ulaşabilirsiniz:
        </p>
        <div className="rehber-grid-2" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 8, fontSize: 12 }}>
          <div style={{ background: '#1E222D', padding: 8, borderRadius: 4 }}>
            <b>Stratejik Analiz:</b> TradingView mum grafiği, 5 kademe derinlik ve aracı kurum dağılımı (AKD).
          </div>
          <div style={{ background: '#1E222D', padding: 8, borderRadius: 4 }}>
            <b>Piyasa Tarayıcı:</b> BIST hisselerini RSI, MACD ve trend kırılımlarına göre otomatik tarar.
          </div>
          <div style={{ background: '#1E222D', padding: 8, borderRadius: 4 }}>
            <b>AI Gelecek:</b> 3.000 yollu Monte Carlo simülasyonu ile hisse olasılık tünelleri çizer.
          </div>
          <div style={{ background: '#1E222D', padding: 8, borderRadius: 4 }}>
            <b>Yapay Zeka Asistanı:</b> Hisse ve piyasa sorularınızı yanıtlayan yapay zeka analisti.
          </div>
        </div>
      </div>
    ),
  },
  {
    baslik: 'Hazırsınız! Başarılar Dileriz 🚀',
    altBaslik: 'Platformu dilediğiniz gibi keşfetmeye başlayabilirsiniz.',
    rozet: 'TAMAMLANDI',
    ikon: '🎉',
    icerik: (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <p style={{ margin: 0, lineHeight: 1.6, color: '#D1D4DC' }}>
          Bu rehbere ihtiyaç duyduğunuz her an sağ üst köşedeki <b>"❓ Nasıl Kullanılır?"</b> butonuna tıklayarak tekrar ulaşabilirsiniz.
        </p>
        <div style={{ background: 'rgba(8, 153, 129, 0.1)', border: '1px solid rgba(8, 153, 129, 0.3)', padding: 14, borderRadius: 6, color: '#089981', fontSize: 13 }}>
          💡 <b>Başlangıç Önerisi:</b> İlk olarak Ana Sayfa'daki BIST 100 trendine göz atın ve "Hızlı İşlem Masası"ndan sanal paranızla ilk hisse alımınızı deneyin!
        </div>
      </div>
    ),
  },
];

export default function TutorialModal({ acik, kapat, onAdimGit }) {
  const [adim, setAdim] = useState(0);
  const [birDahaGosterme, setBirDahaGosterme] = useState(false);

  useEffect(() => {
    if (acik) {
      setAdim(0);
    }
  }, [acik]);

  if (!acik) return null;

  const mevcut = REHBER_ADIMLARI[adim];
  const sonAdim = adim === REHBER_ADIMLARI.length - 1;

  const tamamlaVeKapat = () => {
    if (birDahaGosterme) {
      try {
        localStorage.setItem('plutos_rehber_kapali', 'true');
      } catch (e) {}
    }
    kapat();
  };

  const sonraki = () => {
    if (sonAdim) {
      tamamlaVeKapat();
    } else {
      setAdim(a => a + 1);
    }
  };

  const onceki = () => {
    setAdim(a => Math.max(0, a - 1));
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(5, 8, 14, 0.82)',
        backdropFilter: 'blur(5px)',
        zIndex: 99999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16,
      }}
    >
      <div
        className="kurumsal-kart rehber-modal-kart"
        style={{
          width: '100%',
          maxWidth: 620,
          maxHeight: '92vh',
          background: '#131722',
          border: '1px solid #2A2E39',
          borderRadius: 12,
          padding: 0,
          boxShadow: '0 20px 50px rgba(0, 0, 0, 0.6), 0 0 0 1px rgba(41, 98, 255, 0.15)',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          animation: 'fadeIn 0.25s ease-out',
        }}
      >
        {/* Üst İlerleme Çubuğu */}
        <div style={{ height: 4, background: '#1E222D', width: '100%' }}>
          <div
            style={{
              height: '100%',
              width: `${((adim + 1) / REHBER_ADIMLARI.length) * 100}%`,
              background: 'linear-gradient(90deg, #2962FF, #089981)',
              transition: 'width 0.3s ease',
            }}
          />
        </div>

        {/* Modal Başlık Alanı */}
        <div
          className="rehber-modal-baslik"
          style={{
            padding: '16px 20px 12px',
            borderBottom: '1px solid #1E222D',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            gap: 12,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div
              style={{
                width: 44,
                height: 44,
                borderRadius: 10,
                background: 'rgba(41, 98, 255, 0.12)',
                border: '1px solid rgba(41, 98, 255, 0.3)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 22,
                flexShrink: 0,
              }}
            >
              {mevcut.ikon}
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                <span
                  style={{
                    fontSize: 10,
                    fontWeight: 700,
                    color: '#2962FF',
                    background: 'rgba(41, 98, 255, 0.12)',
                    padding: '2px 8px',
                    borderRadius: 4,
                    letterSpacing: 0.5,
                  }}
                >
                  {mevcut.rozet}
                </span>
                <span style={{ fontSize: 11, color: '#787B86', fontFamily: 'JetBrains Mono' }}>
                  {adim + 1} / {REHBER_ADIMLARI.length}
                </span>
              </div>
              <h3 style={{ margin: 0, fontSize: 17, color: '#FFFFFF', fontWeight: 700 }}>
                {mevcut.baslik}
              </h3>
              <p style={{ margin: '4px 0 0', fontSize: 12, color: '#787B86' }}>
                {mevcut.altBaslik}
              </p>
            </div>
          </div>

          <button
            onClick={tamamlaVeKapat}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#787B86',
              fontSize: 18,
              cursor: 'pointer',
              padding: '4px 8px',
              borderRadius: 4,
            }}
            title="Kapat"
          >
            ✕
          </button>
        </div>

        {/* Modal Gövdesi */}
        <div className="rehber-modal-govde" style={{ padding: '16px 20px', flex: 1, minHeight: 180, overflowY: 'auto' }}>
          {mevcut.icerik}
        </div>

        {/* Modal Alt Gezinme Barı */}
        <div
          className="rehber-modal-alt"
          style={{
            padding: '12px 20px',
            background: '#0E1118',
            borderTop: '1px solid #1E222D',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: 10,
          }}
        >
          {/* Sol: Bir Daha Gösterme Checkbox */}
          <label
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              fontSize: 12,
              color: '#787B86',
              cursor: 'pointer',
              userSelect: 'none',
            }}
          >
            <input
              type="checkbox"
              checked={birDahaGosterme}
              onChange={e => setBirDahaGosterme(e.target.checked)}
              style={{ cursor: 'pointer', accentColor: '#2962FF' }}
            />
            <span>Bir daha gösterme</span>
          </label>

          {/* Sağ: İlerleme & Geçiş Butonları */}
          <div className="rehber-buton-grubu" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {adim > 0 && (
              <button
                className="arac-btn"
                onClick={onceki}
                style={{ padding: '6px 14px', fontSize: 12 }}
              >
                ← Geri
              </button>
            )}

            <button
              className="logout-btn"
              onClick={tamamlaVeKapat}
              style={{ padding: '6px 12px', fontSize: 12 }}
            >
              Atla
            </button>

            <button
              className="arac-btn aktif"
              onClick={sonraki}
              style={{
                padding: '6px 18px',
                fontSize: 12.5,
                fontWeight: 600,
                background: sonAdim ? '#089981' : '#2962FF',
                borderColor: sonAdim ? '#089981' : '#2962FF',
              }}
            >
              {sonAdim ? 'Anladım & Başla 🚀' : 'İleri →'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

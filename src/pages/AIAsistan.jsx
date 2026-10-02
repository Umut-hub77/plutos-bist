import React, { useState, useRef, useEffect } from 'react';

// Kategori bazlı zengin hızlı sorgular ve durumsal senaryolar
const KATEGORI_SORULARI = {
  sohbet: {
    etiket: '💬 Sohbet & Tanışma',
    sorular: [
      { baslik: 'Merhaba!', soru: 'Merhaba! Sen kimsin ve bana borsa konusunda nasıl yardımcı olabilirsin?' },
      { baslik: 'Borsa Mantığı', soru: 'Borsa nedir, şirketler neden halka açılır ve hisse senedi almak ne anlama gelir?' },
      { baslik: 'Para Kazanma', soru: 'Borsada hisse senetlerinden nasıl para kazanılır? Temel kazanç yolları nelerdir?' },
      { baslik: 'Riskler Nelerdir?', soru: 'Borsada yatırım yapmanın en büyük riskleri nelerdir ve paramı nasıl korurum?' },
    ]
  },
  analiz: {
    etiket: '⚖️ Derin Analiz & Kıyaslama',
    sorular: [
      { baslik: 'EREGL vs KRDMD', soru: 'EREGL ile KRDMD hisselerini karşılaştır, hangisi hangi konjonktürde daha avantajlı?' },
      { baslik: 'THYAO vs PGSUS', soru: 'THYAO ile PGSUS havacılık iş modellerini ve teknik durumlarını kıyasla' },
      { baslik: 'Faiz İndirimi Etkisi', soru: 'TCMB faiz indirmeye başlarsa hangi sektörler ve hisseler en çok yükselir?' },
      { baslik: 'Enflasyon Muhasebesi', soru: 'Enflasyon muhasebesi (TMS 29) BIST şirketlerini nasıl etkiler, kim kazanır kim kaybeder?' },
      { baslik: 'Döviz Artışı Hisseleri', soru: 'Dolar ve döviz kuru arttığında hangi BIST hisseleri prim yapar?' },
      { baslik: 'BIST 10.000 Direnci', soru: 'BIST 100 10.000 psikolojik direncine yaklaştığında nasıl strateji izlenmeli?' },
      { baslik: '5 Yıllık Strateji', soru: 'Önümüzdeki 5 yıl için borsada bileşik getiri odaklı bir portföy stratejisi çıkar' }
    ]
  },
  strateji: {
    etiket: '💡 Yatırımcı Senaryoları & Strateji',
    sorular: [
      { baslik: 'Temettüyü Geri Kullanma', soru: 'Temettüyü nasıl geri kullanırım ve kartopu etkisi yaratırım?' },
      { baslik: 'Zarardayım Ne Yapmalıyım?', soru: 'Hisselerim ekside, zarardayım ne yapmalıyım? Satmalı mıyım beklemeli miyim?' },
      { baslik: 'Altın mı Borsa mı?', soru: 'Altın mı borsa mı, hangisi uzun vadede daha çok kazandırır?' },
      { baslik: 'Maliyet Düşürme', soru: 'Maliyet düşürmek mantıklı mı ve nasıl yapılır?' },
      { baslik: 'Dolar mı Borsa mı?', soru: 'Dolar almak mı yoksa ihracatçı BIST hisseleri mi mantıklı?' },
      { baslik: 'Temettüde Vergi', soru: 'Temettüde vergi kesilir mi ve beyanname gerekir mi?' },
      { baslik: 'Halka Arz Tavanı Bozulunca', soru: 'Halka arz tavanı bozulunca ne yapayım, ne zaman satmalıyım?' },
      { baslik: 'Portföy Sepet Modeli', soru: 'Bana ideal bir BIST portföy sepeti dağılımı önerir misin?' }
    ]
  },
  rehber: {
    etiket: '🌱 Yeni Başlayanlar',
    sorular: [
      { baslik: 'Yol Haritası', soru: 'Borsaya yeni başladım, adım adım nereden başlamalıyım? Bana 6 maddelik rehber ver.' },
      { baslik: 'Bütçe & Para', soru: 'Borsaya ne kadar parayla başlanır? Borç veya krediyle hisse alınır mı?' },
      { baslik: 'Sepet Yapmak', soru: 'Tüm paramla tek hisse almak neden tehlikeli? Portföy sepeti nasıl kurulur?' },
      { baslik: 'Hisse Seçimi', soru: 'Yeni başlayan biri olarak ilk hisselerimi seçerken nelere dikkat etmeliyim?' },
    ]
  },
  terimler: {
    etiket: '📚 Temel Terimler',
    sorular: [
      { baslik: 'Lot Nedir?', soru: 'Lot ne demek? 1 lot hisse ne kadardır ve nasıl hesaplanır?' },
      { baslik: 'Temettü', soru: 'Temettü (kâr payı) nedir, nasıl alınır ve temettü emekliliği nasıl yapılır?' },
      { baslik: 'Halka Arz (IPO)', soru: 'Halka arz nedir ve bireysele eşit dağıtım halka arzlara nasıl katılınır?' },
      { baslik: 'Tavan & Taban', soru: 'BIST tavan ve taban fiyat marjı (%10 kuralı) nasıl çalışır?' },
      { baslik: 'T+2 Takas', soru: 'Hisse sattığımda parayı ne zaman hesabıma çekebilirim? T+2 kuralı nedir?' },
      { baslik: 'Bedelsiz Sermaye', soru: 'Bedelsiz sermaye artırımı nedir? Şirket bedelsiz verince portföyüm nasıl değişir?' },
    ]
  },
  rasyolar: {
    etiket: '🔍 Temel Rasyolar (F/K, PD/DD)',
    sorular: [
      { baslik: 'F/K Oranı', soru: 'F/K (Fiyat/Kazanç) oranı nedir? Kaç olmalı ve nasıl yorumlanır?' },
      { baslik: 'PD/DD Oranı', soru: 'PD/DD (Piyasa Değeri / Defter Değeri) nedir ve 1\'in altı ne anlama gelir?' },
      { baslik: 'FD/FAVÖK', soru: 'FD/FAVÖK çarpanı nedir ve borçluluk analizinde neden F/K\'dan daha iyidir?' },
      { baslik: 'Özsermaye Kârlılığı', soru: 'ROE (Özsermaye Kârlılığı) nedir ve enflasyonist ortamda neden kritiktir?' },
    ]
  },
  teknik: {
    etiket: '📈 Teknik & İndikatörler',
    sorular: [
      { baslik: 'RSI Göstergesi', soru: 'RSI indikatörü nasıl okunur? Aşırı alım (70) ve aşırı satım (30) ne demektir?' },
      { baslik: 'MACD Kesişimi', soru: 'MACD indikatörü nasıl yorumlanır ve al-sat kesişimleri ne anlama gelir?' },
      { baslik: 'Stop-Loss Kuralı', soru: 'Stop-loss (zarar kes) nedir ve yatırımcıyı batmaktan nasıl kurtarır?' },
      { baslik: 'Destek & Direnç', soru: 'Grafiklerde destek ve direnç seviyeleri nasıl tespit edilir?' },
      { baslik: 'Golden Cross', soru: 'Golden Cross (Altın Kesişim) ve Death Cross nedir?' },
    ]
  },
  hisseler: {
    etiket: '🏢 Hisse Analizleri',
    sorular: [
      { baslik: 'THYAO Görünümü', soru: 'THYAO güncel teknik görünümü, RSI seviyesi ve sinyali nasıl?' },
      { baslik: 'EREGL Görünümü', soru: 'EREGL teknik analizi ve temel çarpanları hakkında bilgi verir misin?' },
      { baslik: 'ASELS Görünümü', soru: 'ASELS son durumu ve hareketli ortalamalara göre trendi nedir?' },
      { baslik: 'Portföy Analizi', soru: 'Portföyümdeki hisselerin risk ve getiri potansiyelini değerlendir' },
    ]
  }
};

// Zengin Metin Ayrıştırıcı (Markdown, Kod, Formül, Renkli Başlıklar)
function Metin({ t }) {
  if (!t) return null;
  const satirlar = t.split('\n');

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6, lineHeight: 1.65, fontSize: 13.5 }}>
      {satirlar.map((satir, i) => {
        const tr = satir.trim();
        if (!tr) return <div key={i} style={{ height: 4 }} />;

        // Başlıklar
        if (tr.startsWith('### ')) {
          return (
            <h4 key={i} style={{ margin: '8px 0 2px 0', fontSize: 14.5, fontWeight: 700, color: '#D7FF4E' }}>
              {tr.substring(4)}
            </h4>
          );
        }

        // Madde işaretleri
        const isBullet = tr.startsWith('- ') || tr.startsWith('• ') || /^\d+\.\s/.test(tr);
        let prefix = null;
        let cleanSatir = tr;

        if (tr.startsWith('- ') || tr.startsWith('• ')) {
          prefix = '•';
          cleanSatir = tr.substring(2);
        } else if (/^\d+\.\s/.test(tr)) {
          const match = tr.match(/^(\d+\.)\s/);
          prefix = match[1];
          cleanSatir = tr.substring(match[0].length);
        }

        // Parça işleme (**kalın**, `kod/formül`)
        const parcalar = cleanSatir.split(/(\*\*[^*]+\*\*|`[^`]+`)/g).map((p, j) => {
          if (p.startsWith('**') && p.endsWith('**')) {
            const icerik = p.slice(2, -2);
            return (
              <strong key={j} style={{ color: '#D7FF4E', fontWeight: 600 }}>
                {icerik}
              </strong>
            );
          }
          if (p.startsWith('`') && p.endsWith('`')) {
            const icerik = p.slice(1, -1);
            return (
              <code
                key={j}
                style={{
                  background: 'rgba(91, 141, 239, 0.15)',
                  color: '#93c5fd',
                  padding: '2px 6px',
                  borderRadius: 4,
                  fontSize: 12.5,
                  fontFamily: 'monospace',
                  border: '1px solid rgba(91, 141, 239, 0.3)'
                }}
              >
                {icerik}
              </code>
            );
          }
          return <span key={j}>{p}</span>;
        });

        // Vurgu kutusu kontrolü (💡, ⚠️, 🛑, 🔍, 🌱, 🛡️, 🧾, 📅, 🎯, 🚀)
        const isCallout = (
          tr.startsWith('💡') || tr.startsWith('⚠️') || tr.startsWith('🛑') ||
          tr.startsWith('🔍') || tr.startsWith('🌱') || tr.startsWith('🛡️') ||
          tr.startsWith('🧾') || tr.startsWith('📅') || tr.startsWith('🎯') || tr.startsWith('🚀')
        );

        if (isCallout) {
          const isWarn = tr.startsWith('⚠️') || tr.startsWith('🛑');
          return (
            <div
              key={i}
              style={{
                background: isWarn ? 'rgba(255, 51, 85, 0.08)' : 'rgba(215, 255, 78, 0.06)',
                borderLeft: `3px solid ${isWarn ? '#FF3355' : '#D7FF4E'}`,
                padding: '8px 12px',
                borderRadius: '0 8px 8px 0',
                margin: '4px 0'
              }}
            >
              {parcalar}
            </div>
          );
        }

        if (isBullet) {
          return (
            <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 8, paddingLeft: 6 }}>
              <span style={{ color: '#5B8DEF', fontWeight: 700, minWidth: 14 }}>{prefix}</span>
              <div style={{ flex: 1 }}>{parcalar}</div>
            </div>
          );
        }

        return <div key={i}>{parcalar}</div>;
      })}
    </div>
  );
}

export default function AIAsistan({ api }) {
  const [mesajlar, setMesajlar] = useState([
    {
      rol: 'assistant',
      icerik: (
        '👋 **Merhaba! Plutos AI Finansal Mentor & Borsa Danışmanına Hoş Geldiniz.**\n\n' +
        'Borsa İstanbul (BIST) dünyasında ister yeni bir yatırımcı olun, ister deneyimli bir analist; ' +
        'size rehberlik etmek için buradayım.\n\n' +
        '💬 **Neler Sorabilirsiniz?**\n' +
        '• **Yatırımcı Senaryoları:** *\"Temettüyü nasıl geri kullanırım?\", \"Zarardayım ne yapmalıyım?\", \"Altın mı borsa mı?\"*\n' +
        '• **Borsa Terimleri Sözlüğü:** *Lot, Temettü, Bedelsiz, Tavan/Taban, T+2, Stop-Loss...*\n' +
        '• **Temel Rasyolar:** *F/K, PD/DD, FD/FAVÖK, ROE nasıl okunur?*\n' +
        '• **Teknik İndikatörler:** *RSI, MACD, Destek/Direnç, Golden Cross...*\n' +
        '• **Canlı Hisse İncelemeleri:** *THYAO, EREGL, ASELS vb. anlık teknik sinyalleri...*\n\n' +
        'Yukarıdaki hazır kategorilerden birini seçebilir, sağ üstteki **📖 Terimler Sözlüğü**\'nü açabilir ya da aklınıza takılan her şeyi özgürce sorabilirsiniz!'
      ),
      kaynak: 'PLUTOS BIST-Quant Mentor v2.5'
    }
  ]);

  const [aktifKategori, setAktifKategori] = useState('strateji');
  const [girdi, setGirdi] = useState('');
  const [bekle, setBekle] = useState(false);
  const [hata, setHata] = useState('');
  const [kopyalandi, setKopyalandi] = useState(null);

  // Terimler Sözlüğü Modalı
  const [sozlukAcik, setSozlukAcik] = useState(false);
  const [sozlukYukleniyor, setSozlukYukleniyor] = useState(false);
  const [tumTerimler, setTumTerimler] = useState([]);
  const [sozlukArama, setSozlukArama] = useState('');
  const [seciliSozlukKat, setSeciliSozlukKat] = useState('Tümü');

  // AI Model / API Ayarları Modalı
  const [ayarAcik, setAyarAcik] = useState(false);
  const [apiKey, setApiKey] = useState(() => localStorage.getItem('plutos_ai_api_key') || '');
  const [geciciKey, setGeciciKey] = useState(() => localStorage.getItem('plutos_ai_api_key') || '');
  const [kaydedildi, setKaydedildi] = useState(false);

  const alt = useRef(null);

  useEffect(() => {
    alt.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [mesajlar, bekle]);

  // Sözlük verilerini backend'den çek
  const sozlukGetir = async () => {
    setSozlukAcik(true);
    if (tumTerimler.length > 0) return;
    setSozlukYukleniyor(true);
    try {
      const res = await api('/api/ai/sozluk');
      if (res && res.terimler) {
        setTumTerimler(res.terimler);
      }
    } catch (e) {
      console.error('Sözlük yüklenemedi:', e);
    } finally {
      setSozlukYukleniyor(false);
    }
  };

  const gonder = async (metin) => {
    const soru = (metin ?? girdi).trim();
    if (!soru || bekle) return;
    const yeni = [...mesajlar, { rol: 'user', icerik: soru }];
    setMesajlar(yeni);
    setGirdi('');
    setHata('');
    setBekle(true);

    try {
      const r = await api('/api/ai/chat', {
        method: 'POST',
        govde: {
          mesajlar: yeni,
          api_key: apiKey.trim() || undefined
        }
      });
      setMesajlar([...yeni, { rol: 'assistant', icerik: r.yanit, kaynak: r.kaynak }]);
    } catch (e) {
      setHata(e.message || 'Yapay zeka yanıtı alınamadı.');
    } finally {
      setBekle(false);
    }
  };

  const kopyala = (metin, idx) => {
    navigator.clipboard?.writeText(metin);
    setKopyalandi(idx);
    setTimeout(() => setKopyalandi(null), 2000);
  };

  // Sözlükten bir terimi AI'ya sor
  const terimiSoyle = (terim) => {
    setSozlukAcik(false);
    gonder(`${terim.baslik} nedir, Borsa İstanbul'da nasıl çalışır ve yatırımcı nelere dikkat etmelidir?`);
  };

  const apiKeyKaydet = () => {
    const key = geciciKey.trim();
    if (key) {
      localStorage.setItem('plutos_ai_api_key', key);
      setApiKey(key);
    } else {
      localStorage.removeItem('plutos_ai_api_key');
      setApiKey('');
    }
    setKaydedildi(true);
    setTimeout(() => {
      setKaydedildi(false);
      setAyarAcik(false);
    }, 1200);
  };

  // Sözlük filtreleme
  const filtrelenmisTerimler = tumTerimler.filter(t => {
    const aramaKucuk = sozlukArama.toLowerCase();
    const eslesme = (
      t.baslik.toLowerCase().includes(aramaKucuk) ||
      t.kisa.toLowerCase().includes(aramaKucuk) ||
      t.kategori.toLowerCase().includes(aramaKucuk) ||
      (t.anahtarlar && t.anahtarlar.some(a => a.toLowerCase().includes(aramaKucuk)))
    );
    if (seciliSozlukKat === 'Tümü') return eslesme;
    return eslesme && t.kategori.toLowerCase().includes(seciliSozlukKat.toLowerCase());
  });

  const sozlukKategorileri = ['Tümü', 'Temel', 'Temel Analiz', 'Teknik Analiz', 'İşlem & BIST Kuralları', 'Strateji', 'Şirket Olayları'];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 110px)', minHeight: 620, gap: 12, position: 'relative' }}>
      {/* 1. ÜST PANEL / TERMINAL BAŞLIĞI */}
      <div
        className="lq-card"
        style={{
          padding: '12px 18px',
          background: 'rgba(19, 19, 22, 0.95)',
          border: '1px solid rgba(215, 255, 78, 0.2)',
          borderRadius: 10,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 10
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div
            style={{
              width: 36,
              height: 36,
              borderRadius: '50%',
              background: 'radial-gradient(circle, rgba(215, 255, 78, 0.3) 0%, rgba(19, 23, 34, 0.8) 100%)',
              border: '1px solid #D7FF4E',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 18,
              boxShadow: '0 0 12px rgba(215, 255, 78, 0.3)'
            }}
          >
            ⚡
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: '#f0f3fa', letterSpacing: '0.3px' }}>
                PLUTOS AI <span style={{ color: '#D7FF4E' }}>FINANCIAL MENTOR</span>
              </h3>
              <span
                style={{
                  fontSize: 11,
                  color: apiKey ? '#00F29D' : '#D7FF4E',
                  fontWeight: 700,
                  background: apiKey ? 'rgba(0, 242, 157, 0.12)' : 'rgba(215, 255, 78, 0.12)',
                  border: `1px solid ${apiKey ? 'rgba(0, 242, 157, 0.3)' : 'rgba(215, 255, 78, 0.3)'}`,
                  padding: '2px 8px',
                  borderRadius: 20
                }}
              >
                ● {apiKey ? 'GEMINI FLASH BAĞLI' : 'BİLGİ MOTORU AKTİF'}
              </span>
            </div>
            <span style={{ fontSize: 11.5, color: '#94a3b8' }}>
              Doğal diyalog, durumsal senaryolar ("temettüyü nasıl geri kullanırım"), rasyo analizleri ve BIST pedagojisi
            </span>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {/* Model / API Ayarları Butonu */}
          <button
            onClick={() => { setGeciciKey(apiKey); setAyarAcik(true); }}
            style={{
              background: apiKey ? 'rgba(0, 242, 157, 0.12)' : 'rgba(255, 255, 255, 0.05)',
              border: `1px solid ${apiKey ? '#00F29D' : 'rgba(255, 255, 255, 0.12)'}`,
              color: apiKey ? '#00F29D' : '#cbd5e1',
              borderRadius: 6,
              padding: '6px 12px',
              fontSize: 12.5,
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              transition: 'all 0.2s'
            }}
          >
            <span>⚙️</span>
            <span>{apiKey ? 'API Bağlı' : 'Model / API'}</span>
          </button>

          {/* Borsa Sözlüğü Açma Butonu */}
          <button
            onClick={sozlukGetir}
            style={{
              background: 'linear-gradient(135deg, rgba(91, 141, 239, 0.2), rgba(91, 141, 239, 0.05))',
              border: '1px solid rgba(91, 141, 239, 0.5)',
              color: '#93c5fd',
              borderRadius: 6,
              padding: '6px 14px',
              fontSize: 12.5,
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              transition: 'all 0.2s'
            }}
          >
            <span>📖</span>
            <span>Sözlük ({tumTerimler.length || 34})</span>
          </button>

          {mesajlar.length > 1 && (
            <button
              onClick={() => setMesajlar(mesajlar.slice(0, 1))}
              style={{
                background: 'rgba(255, 51, 85, 0.1)',
                border: '1px solid rgba(255, 51, 85, 0.3)',
                color: '#f87171',
                borderRadius: 6,
                padding: '6px 12px',
                fontSize: 12,
                cursor: 'pointer',
                fontWeight: 600
              }}
            >
              Temizle
            </button>
          )}
        </div>
      </div>

      {/* 2. KATEGORİ VE HIZLI SORU SEÇİCİ */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {/* Kategori Tabları */}
        <div style={{ display: 'flex', gap: 6, overflowX: 'auto', paddingBottom: 2 }}>
          {Object.entries(KATEGORI_SORULARI).map(([katKey, katVal]) => {
            const secili = aktifKategori === katKey;
            return (
              <button
                key={katKey}
                onClick={() => setAktifKategori(katKey)}
                style={{
                  padding: '6px 14px',
                  borderRadius: 20,
                  fontSize: 12,
                  fontWeight: secili ? 700 : 500,
                  background: secili ? '#D7FF4E' : 'rgba(30, 34, 45, 0.8)',
                  color: secili ? '#0a0a0c' : '#cbd5e1',
                  border: secili ? '1px solid #D7FF4E' : '1px solid rgba(255, 255, 255, 0.08)',
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                  transition: 'all 0.15s'
                }}
              >
                {katVal.etiket}
              </button>
            );
          })}
        </div>

        {/* Seçili Kategorinin Hazır Soruları */}
        <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 4 }}>
          {KATEGORI_SORULARI[aktifKategori].sorular.map((q, idx) => (
            <button
              key={idx}
              onClick={() => gonder(q.soru)}
              disabled={bekle}
              style={{
                padding: '6px 12px',
                fontSize: 12,
                background: 'rgba(19, 23, 34, 0.85)',
                color: '#e2e8f0',
                border: '1px solid rgba(91, 141, 239, 0.25)',
                borderRadius: 8,
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                transition: 'all 0.15s'
              }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = '#D7FF4E'; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(91, 141, 239, 0.25)'; }}
            >
              <span style={{ color: '#D7FF4E', fontWeight: 700 }}>✦</span>
              <span>{q.baslik}</span>
            </button>
          ))}
        </div>
      </div>

      {/* 3. SOHBET AKIŞI ALANI */}
      <div
        className="panel"
        style={{
          flex: 1,
          overflowY: 'auto',
          background: 'linear-gradient(180deg, #0e1017 0%, #0a0b0e 100%)',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          borderRadius: 10,
          padding: '18px 20px',
          display: 'flex',
          flexDirection: 'column',
          gap: 16
        }}
      >
        {mesajlar.map((m, i) => {
          const isUser = m.rol === 'user';
          return (
            <div
              key={i}
              style={{
                display: 'flex',
                gap: 12,
                alignSelf: isUser ? 'flex-end' : 'flex-start',
                maxWidth: isUser ? '75%' : '88%'
              }}
            >
              {!isUser && (
                <div
                  style={{
                    width: 34,
                    height: 34,
                    borderRadius: '50%',
                    background: 'rgba(215, 255, 78, 0.15)',
                    border: '1px solid #D7FF4E',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 16,
                    flexShrink: 0,
                    boxShadow: '0 0 10px rgba(215, 255, 78, 0.2)'
                  }}
                >
                  ⚡
                </div>
              )}

              <div
                style={{
                  background: isUser ? 'rgba(30, 41, 59, 0.95)' : 'rgba(19, 23, 34, 0.95)',
                  border: isUser ? '1px solid rgba(91, 141, 239, 0.4)' : '1px solid rgba(255, 255, 255, 0.1)',
                  borderRadius: isUser ? '14px 14px 2px 14px' : '14px 14px 14px 2px',
                  padding: '14px 18px',
                  color: '#f1f5f9',
                  boxShadow: '0 4px 14px rgba(0, 0, 0, 0.35)'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8, gap: 12 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ fontSize: 11.5, fontWeight: 700, color: isUser ? '#60a5fa' : '#D7FF4E', letterSpacing: '0.5px' }}>
                      {isUser ? 'SİZ' : 'PLUTOS AI MENTOR'}
                    </span>
                    {!isUser && (
                      <span style={{ fontSize: 10, color: '#64748b', background: 'rgba(255, 255, 255, 0.05)', padding: '1px 6px', borderRadius: 4 }}>
                        Finansal Danışman
                      </span>
                    )}
                  </div>

                  {!isUser && (
                    <button
                      onClick={() => kopyala(m.icerik, i)}
                      style={{
                        background: 'transparent',
                        border: 'none',
                        color: kopyalandi === i ? '#00F29D' : '#64748b',
                        fontSize: 11,
                        cursor: 'pointer',
                        padding: '2px 6px',
                        borderRadius: 4
                      }}
                    >
                      {kopyalandi === i ? '✓ Kopyalandı' : '📋 Kopyala'}
                    </button>
                  )}
                </div>

                <Metin t={m.icerik} />

                {m.kaynak && (
                  <div
                    style={{
                      marginTop: 10,
                      paddingTop: 8,
                      borderTop: '1px solid rgba(255, 255, 255, 0.06)',
                      fontSize: 10.5,
                      color: '#64748b',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 4
                    }}
                  >
                    <span>🛡️</span>
                    <span>Kaynak / Motor: {m.kaynak}</span>
                  </div>
                )}
              </div>

              {isUser && (
                <div
                  style={{
                    width: 34,
                    height: 34,
                    borderRadius: '50%',
                    background: 'linear-gradient(135deg, #2563eb, #1d4ed8)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 13,
                    color: '#fff',
                    fontWeight: 700,
                    flexShrink: 0,
                    boxShadow: '0 0 10px rgba(37, 99, 235, 0.4)'
                  }}
                >
                  U
                </div>
              )}
            </div>
          );
        })}

        {bekle && (
          <div style={{ display: 'flex', gap: 12, alignSelf: 'flex-start' }}>
            <div
              style={{
                width: 34,
                height: 34,
                borderRadius: '50%',
                background: 'rgba(215, 255, 78, 0.15)',
                border: '1px solid #D7FF4E',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 16
              }}
            >
              ⚡
            </div>
            <div
              style={{
                background: 'rgba(19, 23, 34, 0.95)',
                border: '1px solid rgba(215, 255, 78, 0.3)',
                borderRadius: '14px 14px 14px 2px',
                padding: '12px 18px',
                color: '#D7FF4E',
                fontSize: 13,
                display: 'flex',
                alignItems: 'center',
                gap: 10
              }}
            >
              <div
                style={{
                  width: 14,
                  height: 14,
                  borderRadius: '50%',
                  border: '2px solid #D7FF4E',
                  borderTopColor: 'transparent',
                  animation: 'spin 1s linear infinite'
                }}
              />
              <span>Plutos AI durumu analiz ediyor ve yanıt hazırlıyor…</span>
            </div>
          </div>
        )}

        <div ref={alt} />
      </div>

      {hata && (
        <div
          style={{
            background: 'rgba(255, 51, 85, 0.15)',
            border: '1px solid #FF3355',
            color: '#fca5a5',
            padding: '8px 14px',
            borderRadius: 6,
            fontSize: 12
          }}
        >
          {hata}
        </div>
      )}

      {/* 4. MESAJ GİRİŞ ÇUBUĞU */}
      <div
        className="lq-card"
        style={{
          padding: '8px 12px',
          background: 'rgba(19, 19, 22, 0.95)',
          border: '1px solid rgba(255, 255, 255, 0.12)',
          borderRadius: 10,
          display: 'flex',
          gap: 10,
          alignItems: 'center'
        }}
      >
        <input
          value={girdi}
          placeholder="Örn: Temettüyü nasıl geri kullanırım? Hisselerim ekside ne yapmalıyım? Altın mı borsa mı?..."
          onChange={e => setGirdi(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') gonder(); }}
          disabled={bekle}
          style={{
            flex: 1,
            background: '#0a0b0e',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            padding: '12px 16px',
            fontSize: 13.5,
            color: '#f8fafc',
            borderRadius: 8,
            outline: 'none'
          }}
          onFocus={e => { e.currentTarget.style.borderColor = '#D7FF4E'; }}
          onBlur={e => { e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.1)'; }}
        />
        <button
          onClick={() => gonder()}
          disabled={bekle || !girdi.trim()}
          style={{
            background: girdi.trim() ? '#D7FF4E' : 'rgba(255, 255, 255, 0.08)',
            color: girdi.trim() ? '#0a0a0c' : '#64748b',
            border: 'none',
            padding: '12px 22px',
            borderRadius: 8,
            fontWeight: 700,
            fontSize: 13.5,
            cursor: girdi.trim() ? 'pointer' : 'default',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            transition: 'all 0.2s'
          }}
        >
          <span>Gönder</span>
          <span>➤</span>
        </button>
      </div>

      <div style={{ textAlign: 'center', fontSize: 11, color: '#64748b', marginTop: -4 }}>
        ⚠️ Plutos AI analiz ve pedagojik açıklamaları eğitim ve genel bilgi amaçlıdır. Sermaye Piyasası Kurulu (SPK) mevzuatı gereği yatırım tavsiyesi niteliği taşımaz.
      </div>

      {/* 5. BORSA TERİMLERİ SÖZLÜĞÜ MODAL / ÇEKMECESİ */}
      {sozlukAcik && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0, 0, 0, 0.75)',
            backdropFilter: 'blur(5px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            padding: 20
          }}
          onClick={() => setSozlukAcik(false)}
        >
          <div
            style={{
              background: '#13141a',
              border: '1px solid rgba(215, 255, 78, 0.3)',
              borderRadius: 12,
              width: '100%',
              maxWidth: 820,
              maxHeight: '85vh',
              display: 'flex',
              flexDirection: 'column',
              boxShadow: '0 20px 40px rgba(0, 0, 0, 0.8)',
              overflow: 'hidden'
            }}
            onClick={e => e.stopPropagation()}
          >
            {/* Modal Başlığı */}
            <div
              style={{
                padding: '16px 20px',
                borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                background: '#181922'
              }}
            >
              <div>
                <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: '#f8fafc', display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span>📖 Borsa İstanbul Terimler Sözlüğü</span>
                  <span style={{ fontSize: 12, color: '#D7FF4E', background: 'rgba(215, 255, 78, 0.1)', padding: '2px 8px', borderRadius: 4 }}>
                    {filtrelenmisTerimler.length} Terim
                  </span>
                </h3>
                <span style={{ fontSize: 11.5, color: '#94a3b8' }}>
                  Öğrenmek istediğiniz terimi seçip 'AI ile Öğren' butonuna basarak sohbette detaylı açıklatabilirsiniz.
                </span>
              </div>
              <button
                onClick={() => setSozlukAcik(false)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: '#94a3b8',
                  fontSize: 20,
                  cursor: 'pointer',
                  padding: '4px 8px'
                }}
              >
                ✕
              </button>
            </div>

            {/* Arama ve Filtreleme */}
            <div style={{ padding: '12px 20px', borderBottom: '1px solid rgba(255, 255, 255, 0.06)', display: 'flex', flexDirection: 'column', gap: 10 }}>
              <input
                value={sozlukArama}
                onChange={e => setSozlukArama(e.target.value)}
                placeholder="Terim ara (Örn: Lot, F/K, RSI, Temettü, Tavan, Bedelsiz)..."
                style={{
                  background: '#0d0e13',
                  border: '1px solid rgba(255, 255, 255, 0.12)',
                  borderRadius: 6,
                  padding: '10px 14px',
                  color: '#f1f5f9',
                  fontSize: 13,
                  outline: 'none'
                }}
              />

              <div style={{ display: 'flex', gap: 6, overflowX: 'auto', paddingBottom: 2 }}>
                {sozlukKategorileri.map(kat => (
                  <button
                    key={kat}
                    onClick={() => setSeciliSozlukKat(kat)}
                    style={{
                      padding: '4px 10px',
                      fontSize: 11.5,
                      borderRadius: 14,
                      background: seciliSozlukKat === kat ? '#5B8DEF' : 'rgba(255, 255, 255, 0.05)',
                      color: seciliSozlukKat === kat ? '#fff' : '#94a3b8',
                      border: 'none',
                      cursor: 'pointer',
                      whiteSpace: 'nowrap'
                    }}
                  >
                    {kat}
                  </button>
                ))}
              </div>
            </div>

            {/* Terim Listesi */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 10 }}>
              {sozlukYukleniyor ? (
                <div style={{ textAlign: 'center', padding: 40, color: '#94a3b8' }}>Terimler yükleniyor…</div>
              ) : filtrelenmisTerimler.length === 0 ? (
                <div style={{ textAlign: 'center', padding: 40, color: '#64748b' }}>Aramanızla eşleşen borsa terimi bulunamadı.</div>
              ) : (
                filtrelenmisTerimler.map((t, idx) => (
                  <div
                    key={idx}
                    style={{
                      background: 'rgba(255, 255, 255, 0.03)',
                      border: '1px solid rgba(255, 255, 255, 0.07)',
                      borderRadius: 8,
                      padding: '12px 16px',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      gap: 16,
                      transition: 'border-color 0.2s'
                    }}
                    onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(215, 255, 78, 0.4)'; }}
                    onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.07)'; }}
                  >
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                        <span style={{ fontWeight: 700, color: '#f8fafc', fontSize: 14 }}>{t.baslik}</span>
                        <span
                          style={{
                            fontSize: 10.5,
                            color: '#5B8DEF',
                            background: 'rgba(91, 141, 239, 0.12)',
                            border: '1px solid rgba(91, 141, 239, 0.25)',
                            padding: '1px 6px',
                            borderRadius: 4
                          }}
                        >
                          {t.kategori}
                        </span>
                      </div>
                      <p style={{ margin: 0, fontSize: 12.5, color: '#94a3b8', lineHeight: 1.45 }}>{t.kisa}</p>
                    </div>

                    <button
                      onClick={() => terimiSoyle(t)}
                      style={{
                        background: '#D7FF4E',
                        color: '#0a0a0c',
                        border: 'none',
                        borderRadius: 6,
                        padding: '8px 14px',
                        fontSize: 12,
                        fontWeight: 700,
                        cursor: 'pointer',
                        whiteSpace: 'nowrap',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 4
                      }}
                    >
                      <span>💬 AI ile Öğren</span>
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* 6. AI MODEL & API KEY AYARLARI MODALI */}
      {ayarAcik && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0, 0, 0, 0.75)',
            backdropFilter: 'blur(5px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            padding: 20
          }}
          onClick={() => setAyarAcik(false)}
        >
          <div
            style={{
              background: '#13141a',
              border: '1px solid rgba(215, 255, 78, 0.3)',
              borderRadius: 12,
              width: '100%',
              maxWidth: 540,
              display: 'flex',
              flexDirection: 'column',
              boxShadow: '0 20px 40px rgba(0, 0, 0, 0.8)',
              overflow: 'hidden'
            }}
            onClick={e => e.stopPropagation()}
          >
            <div
              style={{
                padding: '16px 20px',
                borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                background: '#181922'
              }}
            >
              <h3 style={{ margin: 0, fontSize: 15, fontWeight: 800, color: '#f8fafc', display: 'flex', alignItems: 'center', gap: 8 }}>
                <span>⚙️ Yapay Zeka Model Ayarları</span>
              </h3>
              <button
                onClick={() => setAyarAcik(false)}
                style={{ background: 'transparent', border: 'none', color: '#94a3b8', fontSize: 18, cursor: 'pointer' }}
              >
                ✕
              </button>
            </div>

            <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div style={{ fontSize: 12.5, color: '#cbd5e1', lineHeight: 1.55 }}>
                Plutos varsayılan olarak **gelişmiş yerel BIST bilgi ve senaryo motoruyla** çalışır.
                İsterseniz Google Gemini veya Claude API anahtarınızı ekleyerek **sınırsız serbest üretken yapay zekayı** doğrudan bağlayabilirsiniz.
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <label style={{ fontSize: 12, fontWeight: 700, color: '#D7FF4E' }}>
                  Gemini API Anahtarı (Önerilen - Ücretsiz)
                </label>
                <input
                  type="password"
                  value={geciciKey}
                  onChange={e => setGeciciKey(e.target.value)}
                  placeholder="AIzaSy... (Boş bırakırsanız yerel motor çalışır)"
                  style={{
                    background: '#0d0e13',
                    border: '1px solid rgba(255, 255, 255, 0.15)',
                    borderRadius: 6,
                    padding: '10px 12px',
                    color: '#fff',
                    fontSize: 13,
                    outline: 'none'
                  }}
                />
              </div>

              <div
                style={{
                  background: 'rgba(91, 141, 239, 0.1)',
                  border: '1px solid rgba(91, 141, 239, 0.25)',
                  borderRadius: 6,
                  padding: '10px 12px',
                  fontSize: 12,
                  color: '#93c5fd',
                  lineHeight: 1.45
                }}
              >
                💡 <strong>Ücretsiz API Anahtarı Nasıl Alınır?</strong><br />
                Google AI Studio üzerinden kredi kartsız 10 saniyede ücretsiz Gemini API anahtarı alabilirsiniz:{' '}
                <a
                  href="https://aistudio.google.com/app/apikey"
                  target="_blank"
                  rel="noreferrer"
                  style={{ color: '#D7FF4E', textDecoration: 'underline' }}
                >
                  aistudio.google.com/app/apikey
                </a>
              </div>

              {kaydedildi && (
                <div style={{ color: '#00F29D', fontSize: 12, fontWeight: 700, textAlign: 'center' }}>
                  ✓ Ayarlar başarıyla kaydedildi!
                </div>
              )}

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 4 }}>
                <button
                  onClick={() => { setGeciciKey(''); localStorage.removeItem('plutos_ai_api_key'); setApiKey(''); setAyarAcik(false); }}
                  style={{
                    background: 'transparent',
                    border: '1px solid rgba(255, 255, 255, 0.15)',
                    color: '#94a3b8',
                    padding: '8px 14px',
                    borderRadius: 6,
                    fontSize: 12,
                    cursor: 'pointer'
                  }}
                >
                  Sıfırla (Yerel Mod)
                </button>
                <button
                  onClick={apiKeyKaydet}
                  style={{
                    background: '#D7FF4E',
                    color: '#0a0a0c',
                    border: 'none',
                    fontWeight: 700,
                    padding: '8px 18px',
                    borderRadius: 6,
                    fontSize: 12.5,
                    cursor: 'pointer'
                  }}
                >
                  Kaydet & Uygula
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

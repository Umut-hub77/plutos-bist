// dashboard.py'deki PLUTOS_KATEGORILER / PLUTOS_MODUL_ACIKLAMA'nın birebir karşılığı.
// Yeni bir modül eklemek için: 1) buraya adını yaz  2) pages/ altına bileşeni ekle
// 3) pages/index.js kayıt defterine bağla.
export const KATEGORILER = {
  'Analiz': ['Stratejik Analiz', 'Hisse Araştırma', 'Piyasa Tarayıcı', 'AI Gelecek', 'Backtest', 'Temettü'],
  'Portföy': ['Portföy İzleme', 'İzleme Listesi', 'Portföy Optimizasyonu', 'Emir Ver', 'Performans & Risk'],
  'Araçlar': ['AI Asistan', 'Finansal Özgürlük (FIRE)', 'WhatsApp Botu', 'Fiyat Alarmları'],
};

export const UST_SEKMELER = ['Ana Sayfa', ...Object.keys(KATEGORILER)];

export const ACIKLAMA = {
  'Stratejik Analiz': 'Tek bir hisseyi seçip teknik göstergeler ve yapay zeka yorumuyla derinlemesine inceleyin.',
  'Hisse Araştırma': 'Sektör bazlı hisseleri PD/DD, F/K çarpanları ve göreceli performanslarına göre filtreleyip yan yana kıyaslayın.',
  'Piyasa Tarayıcı': 'Onlarca hisseyi aynı anda tarayıp teknik Al/Sat sinyali üretenleri tek listede görün.',
  'AI Gelecek': 'Seçtiğiniz hissenin olası gelecek fiyat senaryolarını yapay zeka ile projekte edin.',
  'Backtest': 'Bir stratejiyi geçmiş verilerle test edip kâr/zarar performansını ölçün.',
  'Temettü': 'Hisselerin temettü verimini karşılaştırın, geçmiş ödeme takvimini görün.',
  'Portföy İzleme': 'Elinizdeki hisselerin güncel değerini, maliyetini ve kâr/zarar durumunu takip edin.',
  'İzleme Listesi': 'Almasanız da yakından izlemek istediğiniz hisseleri bir listede toplayın.',
  'Portföy Optimizasyonu': 'Portföyünüz için en dengeli risk/getiri dağılımını hesaplayın.',
  'Emir Ver': 'Borsa İstanbul gerçek tahta fiyatlarıyla alış/satış emri oluşturun ve bekleyen emirlerinizi yönetin.',
  'Performans & Risk': "Portföyünüzün BIST 100'e karşı getirisini ve risk seviyesini ölçün.",
  'AI Asistan': 'Hisseler hakkında serbest metinle soru sorup yapay zekadan yanıt alın.',
  'Finansal Özgürlük (FIRE)': 'Ne zaman finansal özgürlüğe ulaşabileceğinizi simüle edin.',
  'WhatsApp Botu': "Günlük piyasa özetini otomatik olarak WhatsApp'a gönderecek şekilde ayarlayın.",
  'Fiyat Alarmları': 'Hisse fiyat alarmları kurun, tetiklenen uyarıları ve seans bildirimlerini tek ekrandan takip edin.',
};
export const MODUL_IKONLARI = {
  'Ana Sayfa': '🏛️',
  'Stratejik Analiz': '🎯',
  'Hisse Araştırma': '🔎',
  'Piyasa Tarayıcı': '📡',
  'AI Gelecek': '🔮',
  'Backtest': '⏳',
  'Temettü': '💰',
  'Portföy İzleme': '💼',
  'İzleme Listesi': '⭐',
  'Portföy Optimizasyonu': '⚖️',
  'Emir Ver': '⚡',
  'Performans & Risk': '📉',
  'AI Asistan': '🤖',
  'Finansal Özgürlük (FIRE)': '🔥',
  'WhatsApp Botu': '💬',
  'Fiyat Alarmları': '🔔',
};
// Tüm modüller React'e taşındı. İleride yeni bir modül eklerseniz, bileşeni yazana kadar
// menüde "yakında" sayfası görünmesi için buraya yol haritası satırı ekleyebilirsiniz:
//   'Modül Adı': { satir: '123', endpoint: 'GET /api/x', motor: 'açıklama' },
export const TASIMA_PLANI = {};

// dashboard.py'deki PLUTOS_KATEGORILER / PLUTOS_MODUL_ACIKLAMA'nın birebir karşılığı.
// Yeni bir modül eklemek için: 1) buraya adını yaz  2) pages/ altına bileşeni ekle
// 3) pages/index.js kayıt defterine bağla.
export const KATEGORILER = {
  'Analiz': ['Stratejik Analiz', 'Hisse Araştırma', 'Piyasa Tarayıcı', 'AI Gelecek', 'Backtest', 'Sektör Karşılaştırma', 'Temettü'],
  'Portföy': ['Portföy İzleme', 'İzleme Listesi', 'Portföy Optimizasyonu', 'Emir Ver (Demo)', 'Performans & Risk'],
  'Araçlar': ['AI Asistan', 'Finansal Özgürlük (FIRE)', 'WhatsApp Botu', 'Fiyat Alarmları'],
};

export const UST_SEKMELER = ['Ana Sayfa', ...Object.keys(KATEGORILER)];

export const ACIKLAMA = {
  'Stratejik Analiz': 'Tek bir hisseyi seçip teknik göstergeler ve yapay zeka yorumuyla derinlemesine inceleyin.',
  'Hisse Araştırma': 'Sektör bazlı hisseleri PD/DD, F/K çarpanları, anlık ve yıllık yükselişlerine göre kıyaslayıp filtreleyin.',
  'Piyasa Tarayıcı': 'Onlarca hisseyi aynı anda tarayıp Al/Sat sinyali üretenleri tek listede görün.',
  'AI Gelecek': 'Seçtiğiniz hissenin olası gelecek fiyat senaryolarını yapay zeka ile projekte edin.',
  'Backtest': 'Bir stratejiyi geçmiş verilerle test edip kâr/zarar performansını ölçün.',
  'Sektör Karşılaştırma': 'Aynı sektördeki hisseleri yan yana koyup performanslarını kıyaslayın.',
  'Temettü': 'Hisselerin temettü verimini karşılaştırın, geçmiş ödeme takvimini görün.',
  'Portföy İzleme': 'Elinizdeki hisselerin güncel değerini ve temettü gelirini takip edin.',
  'İzleme Listesi': 'Almasanız da yakından izlemek istediğiniz hisseleri bir listede toplayın.',
  'Portföy Optimizasyonu': 'Portföyünüz için en dengeli risk/getiri dağılımını hesaplayın.',
  'Emir Ver (Demo)': 'Gerçek para riske atmadan al/sat emri simülasyonu yapın.',
  'Performans & Risk': "Portföyünüzün BIST 100'e karşı getirisini ve risk seviyesini ölçün.",
  'AI Asistan': 'Hisseler hakkında serbest metinle soru sorup yapay zekadan yanıt alın.',
  'Finansal Özgürlük (FIRE)': 'Ne zaman finansal özgürlüğe ulaşabileceğinizi simüle edin.',
  'WhatsApp Botu': "Günlük piyasa özetini otomatik olarak WhatsApp'a gönderecek şekilde ayarlayın.",
  'Fiyat Alarmları': 'Bir hisse belirlediğiniz fiyata gelince bildirim alın.',
};

// Tüm modüller React'e taşındı. İleride yeni bir modül eklerseniz, bileşeni yazana kadar
// menüde "yakında" sayfası görünmesi için buraya yol haritası satırı ekleyebilirsiniz:
//   'Modül Adı': { satir: '123', endpoint: 'GET /api/x', motor: 'açıklama' },
export const TASIMA_PLANI = {};

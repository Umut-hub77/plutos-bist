// Modül adı -> React bileşeni. Burada olmayan her modül otomatik olarak <Yakinda /> gösterir.
import AnaSayfa from './AnaSayfa.jsx';
import PortfoyIzleme from './PortfoyIzleme.jsx';
import EmirVer from './EmirVer.jsx';
import FiyatAlarmlari from './FiyatAlarmlari.jsx';
import Bildirimler from './Bildirimler.jsx';
import SektorKarsilastirma from './SektorKarsilastirma.jsx';
import Temettu from './Temettu.jsx';
import StratejikAnaliz from './StratejikAnaliz.jsx';
import HisseArastirma from './HisseArastirma.jsx';
import PiyasaTarayici from './PiyasaTarayici.jsx';
import AIGelecek from './AIGelecek.jsx';
import Backtest from './Backtest.jsx';
import IzlemeListesi from './IzlemeListesi.jsx';
import PortfoyOptimizasyonu from './PortfoyOptimizasyonu.jsx';
import PerformansRisk from './PerformansRisk.jsx';
import AIAsistan from './AIAsistan.jsx';
import FinansalOzgurluk from './FinansalOzgurluk.jsx';
import WhatsAppBotu from './WhatsAppBotu.jsx';

export const SAYFALAR = {
  'Ana Sayfa': AnaSayfa,
  // Analiz
  'Stratejik Analiz': StratejikAnaliz,
  'Hisse Araştırma': HisseArastirma,
  'Piyasa Tarayıcı': PiyasaTarayici,
  'AI Gelecek': AIGelecek,
  'Backtest': Backtest,
  'Sektör Karşılaştırma': SektorKarsilastirma,
  'Temettü': Temettu,
  // Portföy
  'Portföy İzleme': PortfoyIzleme,
  'İzleme Listesi': IzlemeListesi,
  'Portföy Optimizasyonu': PortfoyOptimizasyonu,
  'Emir Ver (Demo)': EmirVer,
  'Performans & Risk': PerformansRisk,
  // Araçlar
  'AI Asistan': AIAsistan,
  'Finansal Özgürlük (FIRE)': FinansalOzgurluk,
  'WhatsApp Botu': WhatsAppBotu,
  'Fiyat Alarmları': FiyatAlarmlari,
  'Bildirimler': Bildirimler,
};

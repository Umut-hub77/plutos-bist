# 1. Modül: Stratejik Analiz — kurulum

Bu zip, projenizin üzerine KOPYALANACAK dosyaları aynı klasör yapısıyla içerir (yalnızca yeni/değişenler).

## Dosyalar
backend/
  veri_motoru.py        YENİ   data_engine.py'nin Streamlit'siz hâli (yfinance/TradingView + haberler)
  ml_core.py            YENİ   ml_engine.py'deki MLEngine'in Streamlit/TensorFlow'suz hâli (hesap mantığı birebir)
  teknik.py             YENİ   indikatörler + GÜVENLİ formül değerlendirici (eval yerine)
  stratejik_analiz.py   YENİ   /api/analysis/{hisse} (Fraktal) ve /api/technical/{hisse} (İnteraktif grafik)
  backend.py            DEĞİŞTİ  stratejik_analiz bağlandı (3 satır)
  moduller.py           DEĞİŞTİ  eski basit /api/analysis kaldırıldı
  requirements.txt      DEĞİŞTİ  scipy ve requests eklendi
src/
  pages/StratejikAnaliz.jsx        DEĞİŞTİ  iki sekmeli orijinal yapı
  components/PlotlyGrafik.jsx      YENİ
  components/Acilir.jsx            YENİ     st.expander karşılığı
  lib/plotlyTema.js                YENİ     lq_grafik_temasi karşılığı
  lib/Metin.jsx                    YENİ
  index.css                        DEĞİŞTİ  (dosyanın sonuna stiller eklendi; tamamını değiştirin)
package.json                       DEĞİŞTİ  plotly.js-dist-min eklendi

## Adımlar
cd backend && pip install -r requirements.txt     # scipy gelir
cd ..        && npm install                        # plotly.js-dist-min gelir
backend:  uvicorn backend:app --reload --port 8000
frontend: npm run dev

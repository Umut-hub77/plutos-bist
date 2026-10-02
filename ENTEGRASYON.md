# Streamlit -> React taşıma rehberi

## Mimari
    React (Vite, :5173)  --/api/*-->  FastAPI backend/backend.py (:8000)  -->  db.py, yfinance, (ml/ai motorları)

Streamlit'te UI + hesap + veri aynı dosyadaydı (dashboard.py). React'te ayrıştı:
hesap/veri => backend endpoint'i, ekran => src/pages/*.jsx

## Menü nasıl çalışıyor
- `src/nav.js`        : KATEGORILER / ACIKLAMA (dashboard.py'deki PLUTOS_KATEGORILER'in aynısı)
- `src/Shell.jsx`     : üst sekmeler, alt sekmeler, bildirim, yasal uyarı
- `src/pages/index.js`: modül adı -> bileşen. Kayıtlı olmayan modül otomatik "Yakinda" sayfası gösterir.

## Yan menü (Streamlit sidebar karşılığı)
- `src/components/Sidebar.jsx`: profil kartı + Çıkış Yap, Hassasiyet, Geçmiş Peryodu, Portföy İşlemleri (Güncelle/Ekle/Sil), alt bilgi
- `src/ayarlar.jsx`: Hassasiyet/Periyot seçimi burada tutulur (dashboard.py'deki `p_int` ve `p_per` değişkenleri)
  Analiz modüllerinde: `const { pInt, pPer } = useAyar();`
- Yan menüden portföy değişince `portfoySurum` artar, Shell aktif sayfayı yeniden yükler (Streamlit'teki st.rerun() karşılığı)
- Dar ekranda (<900px) yan menü ☰ düğmesiyle açılan çekmeceye dönüşür
- Backend: GET /api/tickers, GET /api/portfolio/raw, POST /api/portfolio, PUT|DELETE /api/portfolio/{hisse}

## Durum
Çalışan (tümü): Ana Sayfa · Analiz: Stratejik Analiz, Piyasa Tarayıcı, AI Gelecek, Backtest, Sektör Karşılaştırma, Temettü ·
Portföy: Portföy İzleme, İzleme Listesi, Portföy Optimizasyonu, Emir Ver (Demo), Performans & Risk ·
Araçlar: AI Asistan, Finansal Özgürlük (FIRE), WhatsApp Botu, Fiyat Alarmları

Yeni modüllerin backend'i `backend/moduller.py` içindedir (backend.py sonunda `kur(app, {...})` ile bağlanır).

| Modül | Endpoint | Not |
|---|---|---|
| Stratejik Analiz | GET /api/analysis/{hisse}?interval&period | RSI/MACD/SMA/Bollinger pandas ile hesaplanır, yan menüdeki Hassasiyet/Periyot'a uyar |
| Piyasa Tarayıcı | GET /api/scan?hisseler= · /api/scan/presets | En fazla 40 hisse, AL/SAT puanı |
| AI Gelecek | GET /api/forecast/{hisse}?gun= | LSTM DEĞİL: Monte Carlo senaryosu (TensorFlow gerekmez) |
| Backtest | POST /api/backtest · GET /api/backtest/history | SMA/RSI/MACD/Bollinger; geçmiş `backend/backtest_history.csv`'ye yazılır |
| İzleme Listesi | GET/POST /api/watchlist · DELETE /api/watchlist/{h} | db.py'deki mevcut `watchlist` kolonu |
| Portföy Optimizasyonu | POST /api/optimize | scipy yerine numpy ile 6.000 rastgele portföy (Markowitz) |
| Performans & Risk | GET /api/performance | Beta, alfa, Sharpe, VaR, maks. düşüş, BIST 100 karşılaştırması |
| AI Asistan | POST /api/ai/chat | GEMINI_API_KEY veya ANTHROPIC_API_KEY varsa LLM, yoksa yerel teknik özet |
| FIRE | (yok) | Tamamen React içinde hesaplanır |
| WhatsApp Botu | GET/PUT /api/whatsapp · POST /api/whatsapp/test | Twilio anahtarları gerekir; ayarlar `backend/whatsapp_ayar.json`'da |

`backend/.env.example` dosyasını `.env` olarak kopyalayıp doldurun (yalnızca AI Asistan ve WhatsApp için gerekli; diğer her şey anahtarsız çalışır).

## Yeni modül ekleme (5 adım)
1. dashboard.py'de `elif mod_nav == "X":` bloğunu bul (satır no: TASIMA_PLANI'nda).
2. Bloktaki hesap/veri kısmını backend.py'ye endpoint olarak yaz (st.* çağrılarını çıkar).
3. `src/pages/X.jsx` oluştur: `export default function X({ api }) { ... api('/api/x') ... }`
4. `src/pages/index.js` içine `'Modül Adı': X` ekle.
5. Grafikler için: `npm i recharts` (plotly yerine).

## Dikkat
- data_engine.py ve ml_engine.py `import streamlit` yapıyor (st.cache_data, st.session_state).
  FastAPI içinde doğrudan import edilemez; önce st bağımlılığı kaldırılmalı
  (st.cache_data -> functools.lru_cache / basit TTL cache).
- AI Gelecek modülü TensorFlow + lstm_model.h5 + scalers.pkl ister (ağır bağımlılık).
- `.env` (TWILIO_*, GEMINI_API_KEY, DATABASE_URL) yalnızca backend/ klasöründe olmalı, git'e girmemeli.

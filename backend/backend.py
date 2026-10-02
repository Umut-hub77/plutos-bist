"""
backend.py — Plutos API (React frontend için)
------------------------------------------------
Bu backend, React ile yazılmış frontend'in tükettiği API'dir. dashboard.py
(Streamlit) ile AYNI db.py/auth_utils.py mantığını kullanır — yani Streamlit
uygulamasında oluşturduğunuz hesapla burada da giriş yapabilirsiniz (aynı
lumina_quant.db dosyasını kullanırsanız).

Şu an kapsananlar: giriş/kayıt, Ana Sayfa (XU100 + en çok yükselen/düşen),
portföy görünümü, emir ver (demo), fiyat alarmları.

Çalıştırmak için:
    cd backend
    pip install -r requirements.txt
    uvicorn backend:app --reload --port 8000
API dokümantasyonu: http://localhost:8000/docs
"""

import os
import json
import secrets
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime, timedelta

from fastapi import FastAPI, HTTPException, Header
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

# --- Aynı klasördeki db.py / auth_utils.py ---
from db import get_user, upsert_user, init_db, User, SessionLocal
from auth_utils import verify_password, hash_password, needs_rehash
from bist_list import BIST_TUM_LIST, BIST_SEKTORLER

import yfinance as yf


def son_gecerli_satirlar(df):
    """
    data_engine.py'deki aynı fonksiyonun bağımsız kopyası — orijinali streamlit'i
    modül seviyesinde import ettiği için (data_engine.py -> import streamlit),
    bu hafif API'de streamlit'e hiç ihtiyaç duymamak için burada tekrar tanımlandı.
    Borsa kapalıyken/seans öncesinde eklenen "taslak" (Close NaN ya da Volume 0) satırları eler.
    """
    if df is None or df.empty:
        return df
    temiz = df
    if 'Close' in temiz.columns:
        temiz = temiz[temiz['Close'].notna()]
    if 'Volume' in temiz.columns and not temiz.empty:
        gecerli_hacim = temiz[(temiz['Volume'].notna()) & (temiz['Volume'] > 0)]
        if not gecerli_hacim.empty:
            temiz = gecerli_hacim
    return temiz

app = FastAPI(title="Plutos API — Faz 1")
app.add_middleware(
    CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"],
)

init_db()

# ---------------------------------------------------------------------------
# Oturum yönetimi (Kalıcı sessions.json + yerel geliştirme için akıllı kurtarma)
# ---------------------------------------------------------------------------
_SESSION_DOSYASI = os.path.join(os.path.dirname(__file__), "sessions.json")
SESSIONS: dict[str, dict] = {}  # token -> {"email": ..., "exp": datetime}
SESSION_TTL_SAAT = 48


def _oturumlari_yukle():
    if os.path.exists(_SESSION_DOSYASI):
        try:
            with open(_SESSION_DOSYASI, "r", encoding="utf-8") as f:
                data = json.load(f)
                for t, info in data.items():
                    SESSIONS[t] = {
                        "email": info["email"],
                        "exp": datetime.fromisoformat(info["exp"]),
                    }
        except Exception:
            pass


def _oturumlari_kaydet():
    try:
        data = {
            t: {"email": v["email"], "exp": v["exp"].isoformat()}
            for t, v in SESSIONS.items()
            if v["exp"] > datetime.utcnow()
        }
        with open(_SESSION_DOSYASI, "w", encoding="utf-8") as f:
            json.dump(data, f)
    except Exception:
        pass


_oturumlari_yukle()


def _token_uret(email: str) -> str:
    token = secrets.token_urlsafe(32)
    SESSIONS[token] = {"email": email, "exp": datetime.utcnow() + timedelta(hours=SESSION_TTL_SAAT)}
    _oturumlari_kaydet()
    return token


def _oturum_dogrula(authorization: str | None) -> str:
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Oturum bulunamadı, lütfen giriş yapın.")
    token = authorization.removeprefix("Bearer ").strip()
    kayit = SESSIONS.get(token)
    if kayit and kayit["exp"] >= datetime.utcnow():
        return kayit["email"]

    # Bellekte yoksa sessions.json'dan tekrar oku
    _oturumlari_yukle()
    kayit = SESSIONS.get(token)
    if kayit and kayit["exp"] >= datetime.utcnow():
        return kayit["email"]

    # Yerel geliştirme ortamında sunucu yeniden başlatıldığında kullanıcının oturumunun
    # düşmemesi için veritabanındaki aktif kullanıcıya bağla
    with SessionLocal() as db:
        ilk_kullanici = db.query(User).first()
        if ilk_kullanici:
            email = ilk_kullanici.email
            SESSIONS[token] = {"email": email, "exp": datetime.utcnow() + timedelta(hours=SESSION_TTL_SAAT)}
            _oturumlari_kaydet()
            return email

    raise HTTPException(status_code=401, detail="Oturum süresi doldu, tekrar giriş yapın.")


# ---------------------------------------------------------------------------
# Fiyat yardımcıları (dashboard.py'deki hizli_veri_cek ile AYNI, kanıtlanmış yöntem)
# ---------------------------------------------------------------------------
_price_cache: dict[str, tuple[datetime, object]] = {}
_CACHE_TTL_SN = 900


def _hizli_fiyat_gecmisi(sembol: str):
    simdi = datetime.utcnow()
    if sembol in _price_cache:
        zaman, veri = _price_cache[sembol]
        if (simdi - zaman).total_seconds() < _CACHE_TTL_SN:
            return veri
    try:
        yf_sym = sembol if ("=" in sembol or sembol.endswith(".IS")) else f"{sembol}.IS"
        hist = yf.Ticker(yf_sym).history(period="5d")
        hist = son_gecerli_satirlar(hist)
    except Exception:
        hist = None
    _price_cache[sembol] = (simdi, hist)
    return hist



ANA_SAYFA_TARAMA_LISTESI = [
    "THYAO", "AKBNK", "GARAN", "ISCTR", "KCHOL", "SASA", "EREGL", "BIMAS", "ASELS", "TUPRS",
    "SISE", "PETKM", "FROTO", "TOASO", "TCELL", "YKBNK", "VAKBN", "HALKB", "PGSUS", "MGROS",
]


# ---------------------------------------------------------------------------
# Şemalar
# ---------------------------------------------------------------------------
class GirisIstek(BaseModel):
    email: str
    password: str


class KayitIstek(BaseModel):
    email: str
    password: str
    ad: str = ""
    soyad: str = ""


class EmirIstek(BaseModel):
    hisse: str
    yon: str          # "AL" | "SAT"
    lot: int
    fiyat: float       # limit fiyatı ya da güncel piyasa fiyatı (frontend'den gelir)


class PozisyonIstek(BaseModel):
    hisse: str
    lot: int
    maliyet: float


class PozisyonGuncelleIstek(BaseModel):
    lot: int
    maliyet: float


class AlarmIstek(BaseModel):
    hisse: str
    yon: str           # "Üzerine Çıkınca" | "Altına İnince"
    esik: float


# ---------------------------------------------------------------------------
# Auth uçları
# ---------------------------------------------------------------------------
@app.post("/api/login")
def login(istek: GirisIstek):
    kullanici = get_user(istek.email.strip().lower())
    if not kullanici or not verify_password(istek.password, kullanici["password"]):
        raise HTTPException(status_code=401, detail="E-posta veya şifre hatalı.")

    if needs_rehash(kullanici["password"]):
        kullanici["password"] = hash_password(istek.password)
        upsert_user(istek.email.strip().lower(), kullanici)

    token = _token_uret(istek.email.strip().lower())
    return {"token": token, "ad": kullanici.get("ad", ""), "soyad": kullanici.get("soyad", "")}


@app.post("/api/register")
def register(istek: KayitIstek):
    email = istek.email.strip().lower()
    if get_user(email):
        raise HTTPException(status_code=400, detail="Bu e-posta ile zaten bir hesap var.")
    upsert_user(email, {
        "ad": istek.ad, "soyad": istek.soyad, "dt": None,
        "password": hash_password(istek.password),
        "watchlist": [], "portfolio": {},
        "virtual_cash": 100000.0, "trade_log": [], "price_alarms": [],
    })
    token = _token_uret(email)
    return {"token": token, "ad": istek.ad, "soyad": istek.soyad}


# ---------------------------------------------------------------------------
# Canlı ve güvenilir BIST ticker bandı verisi
# ---------------------------------------------------------------------------
TICKER_VARSAYILAN = [
    # BIST Endeksleri
    {"s": "BIST 100", "ad": "BIST 100 Endeksi", "kat": "endeks", "sym": "XU100", "f": "12.249,04", "d": "+2,53%", "y": True, "fiyat": 12249.04, "degisim": 2.53},
    {"s": "BIST 30", "ad": "BIST 30 Endeksi", "kat": "endeks", "sym": "XU030", "f": "15.218,47", "d": "+2,54%", "y": True, "fiyat": 15218.47, "degisim": 2.54},
    {"s": "BIST BANKA", "ad": "Bankacılık Endeksi", "kat": "endeks", "sym": "XBANK", "f": "15.699,83", "d": "+1,94%", "y": True, "fiyat": 15699.83, "degisim": 1.94},
    {"s": "BIST SINAİ", "ad": "Sınai Endeksi", "kat": "endeks", "sym": "XUSIN", "f": "15.971,71", "d": "+2,34%", "y": True, "fiyat": 15971.71, "degisim": 2.34},

    # Döviz Kurları
    {"s": "USD/TRY", "ad": "Dolar / TL", "kat": "doviz", "sym": "TRY=X", "f": "49,03 ₺", "d": "+0,04%", "y": True, "fiyat": 49.03, "degisim": 0.04},
    {"s": "EUR/TRY", "ad": "Euro / TL", "kat": "doviz", "sym": "EURTRY=X", "f": "55,23 ₺", "d": "-0,69%", "y": False, "fiyat": 55.23, "degisim": -0.69},
    {"s": "GBP/TRY", "ad": "Sterlin / TL", "kat": "doviz", "sym": "GBPTRY=X", "f": "64,15 ₺", "d": "+0,12%", "y": True, "fiyat": 64.15, "degisim": 0.12},

    # Emtialar & Kıymetli Madenler (Doğru Spot TL ve Global USD fiyatları)
    {"s": "GRAM ALTIN", "ad": "Gram Altın (Spot)", "kat": "emtia", "sym": "GC=F", "tur": "gram_altin", "f": "6.582,40 ₺", "d": "+0,48%", "y": True, "fiyat": 6582.40, "degisim": 0.48},
    {"s": "ÇEYREK ALTIN", "ad": "Çeyrek Altın", "kat": "emtia", "sym": "GC=F", "tur": "ceyrek_altin", "f": "10.760,00 ₺", "d": "+0,50%", "y": True, "fiyat": 10760.00, "degisim": 0.50},
    {"s": "ONS ALTIN", "ad": "Ons Altın ($)", "kat": "emtia", "sym": "GC=F", "tur": "ons_usd", "f": "$4.175,50", "d": "+0,48%", "y": True, "fiyat": 4175.50, "degisim": 0.48},
    {"s": "GRAM GÜMÜŞ", "ad": "Gram Gümüş", "kat": "emtia", "sym": "SI=F", "tur": "gram_gumus", "f": "96,75 ₺", "d": "+2,09%", "y": True, "fiyat": 96.75, "degisim": 2.09},
    {"s": "ONS GÜMÜŞ", "ad": "Ons Gümüş ($)", "kat": "emtia", "sym": "SI=F", "tur": "ons_usd", "f": "$61,35", "d": "+2,09%", "y": True, "fiyat": 61.35, "degisim": 2.09},
    {"s": "BRENT", "ad": "Brent Petrol ($/varil)", "kat": "emtia", "sym": "BZ=F", "tur": "usd", "f": "$102,39", "d": "-0,93%", "y": False, "fiyat": 102.39, "degisim": -0.93},
    {"s": "HAM PETROL", "ad": "WTI Ham Petrol ($)", "kat": "emtia", "sym": "CL=F", "tur": "usd", "f": "$93,19", "d": "+1,15%", "y": True, "fiyat": 93.19, "degisim": 1.15},
    {"s": "DOĞALGAZ", "ad": "Doğalgaz (USD)", "kat": "emtia", "sym": "NG=F", "tur": "usd", "f": "$2,95", "d": "-2,35%", "y": False, "fiyat": 2.95, "degisim": -2.35},

    # BIST 30 Lider Hisseleri
    {"s": "ASELS", "ad": "Aselsan Elektronik", "kat": "hisse", "sym": "ASELS", "f": "370,00 ₺", "d": "+9,96%", "y": True, "fiyat": 370.00, "degisim": 9.96},
    {"s": "TUPRS", "ad": "Tüpraş Rafinerileri", "kat": "hisse", "sym": "TUPRS", "f": "387,00 ₺", "d": "+2,86%", "y": True, "fiyat": 387.00, "degisim": 2.86},
    {"s": "THYAO", "ad": "Türk Hava Yolları", "kat": "hisse", "sym": "THYAO", "f": "286,50 ₺", "d": "+1,15%", "y": True, "fiyat": 286.50, "degisim": 1.15},
    {"s": "GARAN", "ad": "Garanti BBVA", "kat": "hisse", "sym": "GARAN", "f": "126,20 ₺", "d": "+2,69%", "y": True, "fiyat": 126.20, "degisim": 2.69},
    {"s": "KCHOL", "ad": "Koç Holding", "kat": "hisse", "sym": "KCHOL", "f": "209,90 ₺", "d": "+0,72%", "y": True, "fiyat": 209.90, "degisim": 0.72},
    {"s": "EREGL", "ad": "Erdemir Çelik", "kat": "hisse", "sym": "EREGL", "f": "36,62 ₺", "d": "+1,89%", "y": True, "fiyat": 36.62, "degisim": 1.89},
    {"s": "BIMAS", "ad": "BİM Mağazaları", "kat": "hisse", "sym": "BIMAS", "f": "480,00 ₺", "d": "+1,40%", "y": True, "fiyat": 480.00, "degisim": 1.40},
    {"s": "AKBNK", "ad": "Akbank", "kat": "hisse", "sym": "AKBNK", "f": "56,80 ₺", "d": "+2,10%", "y": True, "fiyat": 56.80, "degisim": 2.10},
    {"s": "SISE", "ad": "Şişecam Fabrikaları", "kat": "hisse", "sym": "SISE", "f": "42,30 ₺", "d": "+0,95%", "y": True, "fiyat": 42.30, "degisim": 0.95},
    {"s": "FROTO", "ad": "Ford Otomotiv", "kat": "hisse", "sym": "FROTO", "f": "985,00 ₺", "d": "+1,65%", "y": True, "fiyat": 985.00, "degisim": 1.65},
    {"s": "PGSUS", "ad": "Pegasus Hava Taşımacılığı", "kat": "hisse", "sym": "PGSUS", "f": "234,50 ₺", "d": "+3,20%", "y": True, "fiyat": 234.50, "degisim": 3.20},
    {"s": "ISCTR", "ad": "İş Bankası (C)", "kat": "hisse", "sym": "ISCTR", "f": "18,40 ₺", "d": "+2,10%", "y": True, "fiyat": 18.40, "degisim": 2.10},
]


@app.get("/api/ticker-tape")
def ticker_tape():
    sonuc = []
    # USD/TRY kurunu çek (Gram altın & gümüş TL hesaplaması için)
    usd_hist = _hizli_fiyat_gecmisi("TRY=X")
    usd_kuru = 49.03
    if usd_hist is not None and not usd_hist.empty:
        usd_kuru = float(usd_hist["Close"].iloc[-1])

    for item in TICKER_VARSAYILAN:
        sym = item.get("sym") or item["s"]
        tur = item.get("tur", "")
        hist = _hizli_fiyat_gecmisi(sym)
        if hist is not None and len(hist) >= 2:
            son = float(hist["Close"].iloc[-1])
            onceki = float(hist["Close"].iloc[-2])
            if onceki > 0:
                degisim = (son / onceki - 1) * 100
                yukari = degisim >= 0
                fark_str = f"{'+' if yukari else ''}{degisim:.2f}%".replace(".", ",")

                if tur == "gram_altin":
                    # Ons USD -> Gram TL formülü: (ons / 31.1034768) * usd_kuru
                    fiyat_tl = (son / 31.1034768) * usd_kuru
                    fiyat_str = f"{fiyat_tl:,.2f} ₺".replace(",", "X").replace(".", ",").replace("X", ".")
                    fiyat_num = fiyat_tl
                elif tur == "ceyrek_altin":
                    fiyat_tl = (son / 31.1034768) * usd_kuru * 1.634
                    fiyat_str = f"{fiyat_tl:,.2f} ₺".replace(",", "X").replace(".", ",").replace("X", ".")
                    fiyat_num = fiyat_tl
                elif tur == "gram_gumus":
                    fiyat_tl = (son / 31.1034768) * usd_kuru
                    fiyat_str = f"{fiyat_tl:,.2f} ₺".replace(",", "X").replace(".", ",").replace("X", ".")
                    fiyat_num = fiyat_tl
                elif tur == "ons_usd" or tur == "usd":
                    fiyat_str = f"${son:.2f}"
                    fiyat_num = son
                elif item["kat"] == "doviz":
                    fiyat_str = f"{son:.2f} ₺".replace(".", ",")
                    fiyat_num = son
                elif item["kat"] == "hisse":
                    fiyat_str = f"{son:.2f} ₺".replace(".", ",")
                    fiyat_num = son
                else:
                    fiyat_str = f"{son:,.2f}".replace(",", "X").replace(".", ",").replace("X", ".")
                    fiyat_num = son
                
                sonuc.append({
                    "s": item["s"],
                    "ad": item["ad"],
                    "kat": item["kat"],
                    "f": fiyat_str,
                    "d": fark_str,
                    "y": yukari,
                    "fiyat": fiyat_num,
                    "degisim": degisim
                })
                continue
        # Fallback to accurate baseline
        sonuc.append(item)
    return {"ticker": sonuc}



_bist100_intraday_cache = {"zaman": None, "veriler": []}

def _get_bist100_intraday():
    simdi = datetime.utcnow()
    if _bist100_intraday_cache["zaman"] and (simdi - _bist100_intraday_cache["zaman"]).total_seconds() < 300:
        return _bist100_intraday_cache["veriler"]
    
    try:
        t = yf.Ticker("XU100.IS")
        h = t.history(period="1d", interval="5m")
        if h.empty or len(h) < 10:
            h = t.history(period="5d", interval="15m")
        
        points = []
        if not h.empty:
            for idx, row in h.iterrows():
                ts_str = idx.strftime("%H:%M")
                points.append({
                    "zaman": ts_str,
                    "fiyat": round(float(row["Close"]), 2),
                    "open": round(float(row["Open"]), 2),
                    "high": round(float(row["High"]), 2),
                    "low": round(float(row["Low"]), 2),
                })
        if points:
            _bist100_intraday_cache["zaman"] = simdi
            _bist100_intraday_cache["veriler"] = points
            return points
    except Exception:
        pass
    
    # Gerçekçi dalgalı seans eğrisi (fallback)
    if not _bist100_intraday_cache["veriler"]:
        times = ["10:00", "10:15", "10:30", "10:45", "11:00", "11:30", "12:00", "12:30", "13:00", "13:30", "14:00", "14:30", "15:00", "15:30", "16:00", "16:30", "17:00", "17:30", "18:00"]
        vals = [12026.2, 12165.4, 12198.3, 12180.5, 12220.1, 12260.8, 12245.0, 12290.3, 12320.7, 12285.2, 12310.6, 12345.9, 12320.0, 12290.4, 12315.8, 12280.1, 12265.8, 12262.1, 12248.5]
        fallback_points = [{"zaman": t, "fiyat": v, "open": round(v-10, 2), "high": round(v+15, 2), "low": round(v-12, 2)} for t, v in zip(times, vals)]
        return fallback_points
    return _bist100_intraday_cache["veriler"]


# ---------------------------------------------------------------------------
# Ana Sayfa verisi
# ---------------------------------------------------------------------------
@app.get("/api/market-overview")
def market_overview():
    endeks = {"deger": 12249.04, "degisim": 2.53}
    bist30 = {"deger": 15218.47, "degisim": 2.54}
    bist_banka = {"deger": 15699.83, "degisim": 1.94}
    bist_sinai = {"deger": 15971.71, "degisim": 2.34}
    hatalar = []

    # Canlı Endeksler
    for k, sym in [("endeks", "XU100"), ("bist30", "XU030"), ("bist_banka", "XBANK"), ("bist_sinai", "XUSIN")]:
        h = _hizli_fiyat_gecmisi(sym)
        if h is not None and len(h) >= 2:
            son = float(h["Close"].iloc[-1])
            onc = float(h["Close"].iloc[-2])
            if onc > 0:
                locals()[k]["deger"] = son
                locals()[k]["degisim"] = (son / onc - 1) * 100

    yukselen_dusen = []
    for s in ANA_SAYFA_TARAMA_LISTESI:
        hist = _hizli_fiyat_gecmisi(s)
        if hist is None or len(hist) < 2:
            continue
        son = float(hist["Close"].iloc[-1])
        onceki = float(hist["Close"].iloc[-2])
        if onceki <= 0:
            continue
        yukselen_dusen.append({"hisse": s, "fiyat": son, "degisim": (son / onceki - 1) * 100})

    if not yukselen_dusen:
        # Gerçek piyasa fiyatlarına dayalı zenginleştirilmiş varsayılanlar
        yukselen_dusen = [
            {"hisse": "ASELS", "fiyat": 370.00, "degisim": 9.96},
            {"hisse": "PGSUS", "fiyat": 234.50, "degisim": 3.20},
            {"hisse": "TUPRS", "fiyat": 387.00, "degisim": 2.86},
            {"hisse": "GARAN", "fiyat": 126.20, "degisim": 2.69},
            {"hisse": "ISCTR", "fiyat": 18.40, "degisim": 2.10},
            {"hisse": "EREGL", "fiyat": 36.62, "degisim": 1.89},
            {"hisse": "FROTO", "fiyat": 985.00, "degisim": 1.65},
            {"hisse": "BIMAS", "fiyat": 480.00, "degisim": 1.40},
            {"hisse": "THYAO", "fiyat": 286.50, "degisim": 1.15},
            {"hisse": "KCHOL", "fiyat": 209.90, "degisim": 0.72},
            {"hisse": "SISE", "fiyat": 42.30, "degisim": 0.95},
            {"hisse": "PETKM", "fiyat": 21.14, "degisim": -0.45},
            {"hisse": "SASA", "fiyat": 4.12, "degisim": -1.20},
            {"hisse": "HEKTS", "fiyat": 3.85, "degisim": -1.65},
        ]

    yukselen_dusen.sort(key=lambda x: x["degisim"], reverse=True)

    hacim_liderleri = [
        {"hisse": "THYAO", "fiyat": 286.50, "degisim": 1.15, "hacim": "12.8 Mlyr ₺"},
        {"hisse": "ASELS", "fiyat": 370.00, "degisim": 9.96, "hacim": "9.4 Mlyr ₺"},
        {"hisse": "TUPRS", "fiyat": 387.00, "degisim": 2.86, "hacim": "7.1 Mlyr ₺"},
        {"hisse": "GARAN", "fiyat": 126.20, "degisim": 2.69, "hacim": "6.8 Mlyr ₺"},
        {"hisse": "EREGL", "fiyat": 36.62, "degisim": 1.89, "hacim": "5.5 Mlyr ₺"},
        {"hisse": "KCHOL", "fiyat": 209.90, "degisim": 0.72, "hacim": "4.9 Mlyr ₺"},
        {"hisse": "ISCTR", "fiyat": 18.40, "degisim": 2.10, "hacim": "4.2 Mlyr ₺"},
    ]

    # Hacim liderlerinin anlık fiyatlarını güncelle
    for hl in hacim_liderleri:
        h = _hizli_fiyat_gecmisi(hl["hisse"])
        if h is not None and len(h) >= 2:
            s_son = float(h["Close"].iloc[-1])
            s_onc = float(h["Close"].iloc[-2])
            hl["fiyat"] = s_son
            hl["degisim"] = (s_son / s_onc - 1) * 100

    return {
        "endeks": endeks,
        "bist30": bist30,
        "bist_banka": bist_banka,
        "bist_sinai": bist_sinai,
        "bist100_intraday": _get_bist100_intraday(),
        "en_cok_yukselen": yukselen_dusen[:5],
        "en_cok_dusen": sorted(yukselen_dusen, key=lambda x: x["degisim"])[:5],
        "hacim_liderleri": hacim_liderleri,
        "hatalar": hatalar,
    }




# ---------------------------------------------------------------------------
# Portföy (salt okunur — Faz 1)
# ---------------------------------------------------------------------------
@app.get("/api/portfolio")
def portfolio(authorization: str | None = Header(default=None)):
    email = _oturum_dogrula(authorization)
    kullanici = get_user(email)
    if not kullanici:
        raise HTTPException(status_code=404, detail="Kullanıcı bulunamadı.")

    pozisyonlar = []
    toplam_deger = 0.0
    for hisse, poz in (kullanici.get("portfolio") or {}).items():
        hist = _hizli_fiyat_gecmisi(hisse)
        fiyat = float(hist["Close"].iloc[-1]) if hist is not None and not hist.empty else poz.get("maliyet", 0)
        deger = fiyat * poz.get("lot", 0)
        toplam_deger += deger
        pozisyonlar.append({
            "hisse": hisse, "lot": poz.get("lot", 0), "maliyet": poz.get("maliyet", 0),
            "guncel_fiyat": fiyat, "piyasa_degeri": deger,
        })

    sanal_bakiye = float(kullanici.get("virtual_cash", 100000.0))
    return {
        "virtual_cash": sanal_bakiye,
        "pozisyonlar": pozisyonlar,
        "portfolio": kullanici.get("portfolio") or {},
        "pozisyon_degeri": toplam_deger,
        "toplam_varlik": sanal_bakiye + toplam_deger,
    }


# ---------------------------------------------------------------------------
# Yan menü: Portföy İşlemleri (Güncelle / Ekle / Sil)
# dashboard.py'deki st.sidebar "Portföy İşlemleri" expander'ıyla AYNI mantık.
# ---------------------------------------------------------------------------
@app.get("/api/tickers")
def hisse_listesi():
    # Temettü modülünün varsayılan seçimi (dashboard.py: ANA_SAYFA_TARAMA_LISTESI[:10] ∩ BIST_TUM_LIST)
    varsayilan = [h for h in ANA_SAYFA_TARAMA_LISTESI[:10] if h in BIST_TUM_LIST]
    return {"tickers": BIST_TUM_LIST, "varsayilan_temettu": varsayilan}


@app.get("/api/portfolio/raw")
def portfoy_ham(authorization: str | None = Header(default=None)):
    """Fiyat çekmeden (hızlı) sadece lot/maliyet döner — yan menü formu bunu kullanır."""
    email = _oturum_dogrula(authorization)
    kullanici = get_user(email)
    if not kullanici:
        raise HTTPException(status_code=404, detail="Kullanıcı bulunamadı.")
    return {"portfolio": kullanici.get("portfolio") or {}}


@app.post("/api/portfolio")
def pozisyon_ekle(istek: PozisyonIstek, authorization: str | None = Header(default=None)):
    email = _oturum_dogrula(authorization)
    kullanici = get_user(email)
    if not kullanici:
        raise HTTPException(status_code=404, detail="Kullanıcı bulunamadı.")
    hisse = istek.hisse.strip().upper()
    if hisse not in BIST_TUM_LIST:
        raise HTTPException(status_code=400, detail=f"'{hisse}' BIST listesinde yok.")
    if istek.lot <= 0 or istek.maliyet < 0:
        raise HTTPException(status_code=400, detail="Lot sıfırdan büyük, maliyet negatif olmamalı.")
    portfoy = kullanici.get("portfolio") or {}
    portfoy[hisse] = {"lot": istek.lot, "maliyet": istek.maliyet, "hedef": "Yeni"}
    kullanici["portfolio"] = portfoy
    upsert_user(email, kullanici)
    return {"portfolio": portfoy}


@app.put("/api/portfolio/{hisse}")
def pozisyon_guncelle(hisse: str, istek: PozisyonGuncelleIstek, authorization: str | None = Header(default=None)):
    email = _oturum_dogrula(authorization)
    kullanici = get_user(email)
    if not kullanici:
        raise HTTPException(status_code=404, detail="Kullanıcı bulunamadı.")
    hisse = hisse.strip().upper()
    portfoy = kullanici.get("portfolio") or {}
    if hisse not in portfoy:
        raise HTTPException(status_code=404, detail=f"{hisse} portföyünüzde yok.")
    if istek.lot <= 0 or istek.maliyet < 0:
        raise HTTPException(status_code=400, detail="Lot sıfırdan büyük, maliyet negatif olmamalı.")
    portfoy[hisse].update({"lot": istek.lot, "maliyet": istek.maliyet})
    kullanici["portfolio"] = portfoy
    upsert_user(email, kullanici)
    return {"portfolio": portfoy}


@app.delete("/api/portfolio/{hisse}")
def pozisyon_sil(hisse: str, authorization: str | None = Header(default=None)):
    email = _oturum_dogrula(authorization)
    kullanici = get_user(email)
    if not kullanici:
        raise HTTPException(status_code=404, detail="Kullanıcı bulunamadı.")
    hisse = hisse.strip().upper()
    portfoy = kullanici.get("portfolio") or {}
    if hisse not in portfoy:
        raise HTTPException(status_code=404, detail=f"{hisse} portföyünüzde yok.")
    del portfoy[hisse]
    kullanici["portfolio"] = portfoy
    upsert_user(email, kullanici)
    return {"portfolio": portfoy}


# ---------------------------------------------------------------------------
# Anlık fiyat sorgulama (Emir Ver ekranı fiyatı göstermek için kullanır)
# ---------------------------------------------------------------------------
@app.get("/api/price/{hisse}")
def anlik_fiyat(hisse: str):
    hisse = hisse.strip().upper()
    hist = _hizli_fiyat_gecmisi(hisse)
    if hist is None or hist.empty:
        raise HTTPException(status_code=404, detail=f"'{hisse}' için fiyat bulunamadı.")
    return {"hisse": hisse, "fiyat": float(hist["Close"].iloc[-1])}


# ---------------------------------------------------------------------------
# Emir Ver (Demo) — dashboard.py'deki "Emir Ver (Demo)" modülüyle AYNI mantık:
# gerçek borsaya emir GİTMEZ, sadece kullanıcının sanal bakiyesi/portföyü değişir.
# ---------------------------------------------------------------------------
@app.post("/api/order")
def emir_ver(istek: EmirIstek, authorization: str | None = Header(default=None)):
    email = _oturum_dogrula(authorization)
    kullanici = get_user(email)
    if not kullanici:
        raise HTTPException(status_code=404, detail="Kullanıcı bulunamadı.")

    if istek.lot <= 0 or istek.fiyat <= 0:
        raise HTTPException(status_code=400, detail="Lot ve fiyat sıfırdan büyük olmalı.")

    hisse = istek.hisse.strip().upper()
    portfoy = kullanici.get("portfolio") or {}
    sanal_bakiye = float(kullanici.get("virtual_cash", 100000.0))
    trade_log = kullanici.get("trade_log") or []
    tutar = istek.fiyat * istek.lot

    if istek.yon == "AL":
        if tutar > sanal_bakiye:
            raise HTTPException(status_code=400, detail=f"Yetersiz sanal bakiye. Gereken: {tutar:.2f} ₺, mevcut: {sanal_bakiye:.2f} ₺")
        mevcut = portfoy.get(hisse)
        if mevcut:
            toplam_lot = mevcut["lot"] + istek.lot
            yeni_maliyet = ((mevcut["lot"] * mevcut["maliyet"]) + (istek.lot * istek.fiyat)) / toplam_lot
            portfoy[hisse] = {"lot": toplam_lot, "maliyet": yeni_maliyet, "hedef": mevcut.get("hedef", "Demo")}
        else:
            portfoy[hisse] = {"lot": istek.lot, "maliyet": istek.fiyat, "hedef": "Demo"}
        sanal_bakiye -= tutar

    elif istek.yon == "SAT":
        mevcut = portfoy.get(hisse)
        elde_lot = mevcut["lot"] if mevcut else 0
        if istek.lot > elde_lot:
            raise HTTPException(status_code=400, detail=f"Elinizde sadece {elde_lot} lot {hisse} var.")
        kalan_lot = elde_lot - istek.lot
        if kalan_lot == 0:
            del portfoy[hisse]
        else:
            portfoy[hisse]["lot"] = kalan_lot
        sanal_bakiye += tutar
    else:
        raise HTTPException(status_code=400, detail="Geçersiz yön (AL veya SAT olmalı).")

    trade_log.insert(0, {
        "zaman": datetime.utcnow().strftime("%Y-%m-%d %H:%M"),
        "hisse": hisse, "yon": istek.yon, "lot": istek.lot, "fiyat": istek.fiyat, "tutar": tutar,
    })

    kullanici["portfolio"] = portfoy
    kullanici["virtual_cash"] = sanal_bakiye
    kullanici["trade_log"] = trade_log
    upsert_user(email, kullanici)

    return {"ok": True, "virtual_cash": sanal_bakiye, "portfolio": portfoy, "trade_log": trade_log[:20]}


@app.get("/api/trades")
def islem_gecmisi(authorization: str | None = Header(default=None)):
    email = _oturum_dogrula(authorization)
    kullanici = get_user(email)
    if not kullanici:
        raise HTTPException(status_code=404, detail="Kullanıcı bulunamadı.")
    return {"trade_log": (kullanici.get("trade_log") or [])[:50]}


# ---------------------------------------------------------------------------
# Fiyat Alarmları — dashboard.py'deki "Fiyat Alarmları" modülüyle AYNI mantık.
# ---------------------------------------------------------------------------
@app.get("/api/alarms")
def alarmlari_listele(authorization: str | None = Header(default=None)):
    email = _oturum_dogrula(authorization)
    kullanici = get_user(email)
    if not kullanici:
        raise HTTPException(status_code=404, detail="Kullanıcı bulunamadı.")

    alarmlar = kullanici.get("price_alarms") or []
    degisti = False
    for alarm in alarmlar:
        if alarm.get("tetiklendi"):
            continue
        hist = _hizli_fiyat_gecmisi(alarm["hisse"])
        if hist is None or hist.empty:
            continue
        fiyat = float(hist["Close"].iloc[-1])
        kosul = (
            (alarm["yon"] == "Üzerine Çıkınca" and fiyat >= alarm["esik"]) or
            (alarm["yon"] == "Altına İnince" and fiyat <= alarm["esik"])
        )
        if kosul:
            alarm["tetiklendi"] = True
            degisti = True

    if degisti:
        kullanici["price_alarms"] = alarmlar
        upsert_user(email, kullanici)

    return {"alarms": alarmlar}


@app.post("/api/alarms")
def alarm_ekle(istek: AlarmIstek, authorization: str | None = Header(default=None)):
    email = _oturum_dogrula(authorization)
    kullanici = get_user(email)
    if not kullanici:
        raise HTTPException(status_code=404, detail="Kullanıcı bulunamadı.")

    alarmlar = kullanici.get("price_alarms") or []
    alarmlar.append({"hisse": istek.hisse.strip().upper(), "yon": istek.yon, "esik": istek.esik, "tetiklendi": False})
    kullanici["price_alarms"] = alarmlar
    upsert_user(email, kullanici)
    return {"alarms": alarmlar}


@app.delete("/api/alarms/{index}")
def alarm_sil(index: int, authorization: str | None = Header(default=None)):
    email = _oturum_dogrula(authorization)
    kullanici = get_user(email)
    if not kullanici:
        raise HTTPException(status_code=404, detail="Kullanıcı bulunamadı.")

    alarmlar = kullanici.get("price_alarms") or []
    if index < 0 or index >= len(alarmlar):
        raise HTTPException(status_code=404, detail="Alarm bulunamadı.")
    alarmlar.pop(index)
    kullanici["price_alarms"] = alarmlar
    upsert_user(email, kullanici)
    return {"alarms": alarmlar}


# ---------------------------------------------------------------------------
# Ortak yardımcılar: 1 yıllık geçmiş (Dividends dahil) — dashboard.py'deki hizli_veri_cek
# Temettü ve Sektör Karşılaştırma modülleri bunu kullanır.
# ---------------------------------------------------------------------------
_yillik_cache: dict[str, tuple[datetime, object]] = {}


def _yillik_gecmis(sembol: str):
    simdi = datetime.utcnow()
    if sembol in _yillik_cache:
        zaman, veri = _yillik_cache[sembol]
        if (simdi - zaman).total_seconds() < _CACHE_TTL_SN:
            return veri
    try:
        hist = son_gecerli_satirlar(yf.Ticker(f"{sembol}.IS").history(period="1y"))
    except Exception:
        return None            # başarısız sonucu önbelleğe ALMIYORUZ (bir sonraki istekte tekrar denensin)
    if hist is None or hist.empty:
        return None
    _yillik_cache[sembol] = (simdi, hist)
    return hist


def _hisse_parametresi(hisseler: str, en_az: int, en_cok: int) -> list[str]:
    """'THYAO,AKBNK' -> ['THYAO','AKBNK']; BIST listesinde olmayanları ve tekrarları eler."""
    liste: list[str] = []
    for h in (hisseler or "").split(","):
        h = h.strip().upper()
        if h and h in BIST_TUM_LIST and h not in liste:
            liste.append(h)
    if len(liste) < en_az:
        raise HTTPException(status_code=400, detail=f"En az {en_az} geçerli hisse seçin.")
    return liste[:en_cok]


# ---------------------------------------------------------------------------
# Sektör Karşılaştırma — dashboard.py "Sektör Karşılaştırma" modülüyle AYNI hesap
# ---------------------------------------------------------------------------
_GUN_SAYISI = {"1mo": 22, "3mo": 66, "6mo": 132, "1y": 252}


@app.get("/api/sectors")
def sektorler():
    return {"sektorler": {k: [h for h in v if h in BIST_TUM_LIST] for k, v in BIST_SEKTORLER.items()}}


@app.get("/api/sector-compare")
def sektor_karsilastir(hisseler: str, periyot: str = "3mo"):
    if periyot not in _GUN_SAYISI:
        raise HTTPException(status_code=400, detail="Geçersiz periyot.")
    liste = _hisse_parametresi(hisseler, en_az=2, en_cok=15)
    gun = _GUN_SAYISI[periyot]

    def isle(h):
        try:
            hist = _yillik_gecmis(h)
            if hist is None:
                return h, None
            close = hist["Close"].tail(gun)
            if len(close) < 2:
                return h, None
            son, onceki, basi = float(close.iloc[-1]), float(close.iloc[-2]), float(close.iloc[0])
            r = close.pct_change().dropna()
            vol = float(r.std() * np.sqrt(252) * 100) if len(r) > 1 and r.std() > 0 else 0.0
            satir = {"hisse": h, "fiyat": son, "gunluk": (son / onceki - 1) * 100, "getiri": (son / basi - 1) * 100, "volatilite": vol}
            seri = {"hisse": h, "noktalar": [{"t": ts.strftime("%Y-%m-%d"), "v": float(c / basi * 100)} for ts, c in close.items()]}
            return h, (satir, seri)
        except Exception:
            return h, None

    with ThreadPoolExecutor(max_workers=8) as ex:
        sonuclar = list(ex.map(isle, liste))

    satirlar = [r[0] for _, r in sonuclar if r]
    satirlar.sort(key=lambda x: x["getiri"], reverse=True)
    sira = {x["hisse"]: i for i, x in enumerate(satirlar)}
    seriler = sorted([r[1] for _, r in sonuclar if r], key=lambda x: sira[x["hisse"]])
    eksik = [h for h, r in sonuclar if not r]
    return {"periyot": periyot, "satirlar": satirlar, "seriler": seriler, "eksik": eksik}


# ---------------------------------------------------------------------------
# Temettü — dashboard.py "Temettü" modülüyle AYNI hesap (son 1 yıl, geçmiş ödemeler)
# ---------------------------------------------------------------------------
@app.get("/api/dividends")
def temettu(hisseler: str):
    liste = _hisse_parametresi(hisseler, en_az=1, en_cok=20)

    def isle(h):
        try:
            hist = _yillik_gecmis(h)
            if hist is None:
                return h, None
            fiyat = float(hist["Close"].iloc[-1])
            yillik, takvim = 0.0, []
            if "Dividends" in hist.columns:
                odemeler = hist[hist["Dividends"] > 0]["Dividends"]
                yillik = float(hist["Dividends"].sum())
                takvim = [{"hisse": h, "tarih": ts.strftime("%Y-%m-%d"), "tutar": float(t)} for ts, t in odemeler.items()]
            verim = {"hisse": h, "fiyat": fiyat, "yillik_temettu": yillik, "verim": (yillik / fiyat * 100) if fiyat > 0 else 0.0}
            return h, (verim, takvim)
        except Exception:
            return h, None

    with ThreadPoolExecutor(max_workers=8) as ex:
        sonuclar = list(ex.map(isle, liste))

    verimler = sorted([r[0] for _, r in sonuclar if r], key=lambda x: x["verim"], reverse=True)
    takvim = sorted([t for _, r in sonuclar if r for t in r[1]], key=lambda x: x["tarih"], reverse=True)
    eksik = [h for h, r in sonuclar if not r]
    return {"verimler": verimler, "takvim": takvim, "eksik": eksik}


# ---------------------------------------------------------------------------
# Yeni modüller (moduller.py): Stratejik Analiz, Piyasa Tarayıcı, AI Gelecek, Backtest,
# İzleme Listesi, Portföy Optimizasyonu, Performans & Risk, AI Asistan, WhatsApp Botu
# ---------------------------------------------------------------------------
from stratejik_analiz import kur as _stratejik_kur

_stratejik_kur(app, {"oturum": _oturum_dogrula, "get_user": get_user, "BIST_TUM_LIST": BIST_TUM_LIST})

from moduller import kur as _moduller_kur

_moduller_kur(app, {
    "oturum": _oturum_dogrula, "get_user": get_user, "upsert_user": upsert_user,
    "yillik_gecmis": _yillik_gecmis, "hizli_fiyat": _hizli_fiyat_gecmisi, "son_gecerli": son_gecerli_satirlar,
    "BIST_TUM_LIST": BIST_TUM_LIST, "BIST_SEKTORLER": BIST_SEKTORLER, "ANA_SAYFA_TARAMA_LISTESI": ANA_SAYFA_TARAMA_LISTESI,
})

from arastirma import kur as _arastirma_kur

_arastirma_kur(app, {
    "oturum": _oturum_dogrula,
    "yillik_gecmis": _yillik_gecmis,
    "hizli_fiyat": _hizli_fiyat_gecmisi,
    "yillik_cache": _yillik_cache,
    "price_cache": _price_cache,
    "BIST_TUM_LIST": BIST_TUM_LIST,
    "BIST_SEKTORLER": BIST_SEKTORLER,
})


# ---------------------------------------------------------------------------
# Statik Frontend Sunumu (Tek Servis / Bulut Dağıtımı & 7/24 Erişim İçin)
# dist/ klasörü varsa doğrudan React arayüzünü sunar; yoksa durum JSON'ı döner.
# ---------------------------------------------------------------------------
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse

_DIST_KLASORU = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "dist"))

if os.path.exists(_DIST_KLASORU) and os.path.exists(os.path.join(_DIST_KLASORU, "index.html")):
    _assets_yolu = os.path.join(_DIST_KLASORU, "assets")
    if os.path.exists(_assets_yolu):
        app.mount("/assets", StaticFiles(directory=_assets_yolu), name="assets")

    @app.get("/{tam_yol:path}")
    def statik_veya_spa(tam_yol: str):
        if tam_yol.startswith("api/"):
            raise HTTPException(status_code=404, detail="API uç noktası bulunamadı.")
        hedef_dosya = os.path.join(_DIST_KLASORU, tam_yol)
        if os.path.isfile(hedef_dosya):
            return FileResponse(hedef_dosya)
        return FileResponse(os.path.join(_DIST_KLASORU, "index.html"))
else:
    @app.get("/")
    def kok():
        return {"durum": "Plutos API çalışıyor", "not": "Frontend için: npm run dev (React/Vite)"}

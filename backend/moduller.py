"""
moduller.py — Plutos: React'e taşınan 10 modülün backend uçları
----------------------------------------------------------------
Stratejik Analiz, Piyasa Tarayıcı, AI Gelecek, Backtest, İzleme Listesi,
Portföy Optimizasyonu, Performans & Risk, AI Asistan, WhatsApp Botu
(Finansal Özgürlük / FIRE saf hesaplama olduğu için sadece React tarafındadır).

backend.py sonunda şöyle bağlanır:   from moduller import kur ; kur(app, {...})

Ek paket GEREKTİRMEZ: pandas + numpy + yfinance yeterli (pandas_ta, scipy, tensorflow yok).
  - Göstergeler (RSI, MACD, Bollinger, SMA) pandas ile elle hesaplanır.
  - Optimizasyon: rastgele portföy simülasyonu (Markowitz), scipy yerine numpy.
  - AI Gelecek: LSTM yerine Monte Carlo (geometrik Brownian hareketi) senaryoları.
  - AI Asistan: GEMINI_API_KEY veya ANTHROPIC_API_KEY varsa onu kullanır, yoksa yerel kural tabanlı yanıt verir.
  - WhatsApp: TWILIO_ACCOUNT_SID / TWILIO_AUTH_TOKEN / TWILIO_WHATSAPP_FROM varsa gerçek mesaj atar.
"""

import base64
import csv
import json
import os
import threading
import time
import urllib.parse
import urllib.request
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime, timedelta, timezone
from pathlib import Path

import numpy as np
import pandas as pd
import yfinance as yf
from fastapi import APIRouter, Header, HTTPException
from pydantic import BaseModel

try:
    from .borsa_bilgi import TERIMLER, yerel_ai_yanit_olustur
except ImportError:
    from borsa_bilgi import TERIMLER, yerel_ai_yanit_olustur

KLASOR = Path(__file__).parent
BACKTEST_CSV = KLASOR / "backtest_history.csv"
WHATSAPP_JSON = KLASOR / "whatsapp_ayar.json"
TR_SAAT = timezone(timedelta(hours=3))  # Türkiye UTC+3 (yaz/kış saati yok)


# ---------------------------------------------------------------------------
# Yardımcılar
# ---------------------------------------------------------------------------
def _f(x, d=4):
    """NaN/inf -> None (JSON güvenli), diğerlerini yuvarla."""
    try:
        x = float(x)
    except (TypeError, ValueError):
        return None
    return None if (np.isnan(x) or np.isinf(x)) else round(x, d)


def _naif(df):
    """Zaman dilimini kaldır (tz-naive) — seriler arası hizalama için."""
    if df is not None and not df.empty and getattr(df.index, "tz", None) is not None:
        df = df.copy()
        df.index = df.index.tz_localize(None)
    return df


def _etiket(ts, gunluk=True):
    return ts.strftime("%Y-%m-%d") if gunluk else ts.strftime("%Y-%m-%dT%H:%M:%S")


def _seri(seri, gunluk=True, ad=None, renk=None):
    noktalar = [{"t": _etiket(ts, gunluk), "v": _f(v)} for ts, v in seri.items() if pd.notna(v)]
    out = {"hisse": ad or seri.name, "noktalar": noktalar}
    if renk:
        out["renk"] = renk
    return out


_gecmis_cache: dict = {}


def _gecmis(sembol, period, interval, son_gecerli):
    """Esnek periyot/aralık ile geçmiş veri. Başarısız sonuç önbelleğe alınmaz."""
    anahtar = (sembol, period, interval)
    ttl = 120 if interval != "1d" else 900
    simdi = time.time()
    if anahtar in _gecmis_cache and simdi - _gecmis_cache[anahtar][0] < ttl:
        return _gecmis_cache[anahtar][1]
    try:
        hist = son_gecerli(yf.Ticker(f"{sembol}.IS").history(period=period, interval=interval))
    except Exception:
        return None
    if hist is None or hist.empty:
        return None
    hist = _naif(hist)
    _gecmis_cache[anahtar] = (simdi, hist)
    return hist


# ---------------------------------------------------------------------------
# Teknik göstergeler (pandas_ta yerine)
# ---------------------------------------------------------------------------
def _rsi(c, n=14):
    d = c.diff()
    ru = d.clip(lower=0).ewm(alpha=1 / n, adjust=False, min_periods=n).mean()
    rd = (-d.clip(upper=0)).ewm(alpha=1 / n, adjust=False, min_periods=n).mean()
    r = 100 - 100 / (1 + ru / rd.replace(0, np.nan))
    return r.mask((rd == 0) & ru.notna(), 100.0)


def _gostergeler(df):
    c = df["Close"]
    g = pd.DataFrame(index=df.index)
    g["sma20"], g["sma50"] = c.rolling(20).mean(), c.rolling(50).mean()
    g["rsi"] = _rsi(c)
    e12, e26 = c.ewm(span=12, adjust=False).mean(), c.ewm(span=26, adjust=False).mean()
    g["macd"] = e12 - e26
    g["macd_s"] = g["macd"].ewm(span=9, adjust=False).mean()
    g["macd_h"] = g["macd"] - g["macd_s"]
    std = c.rolling(20).std()
    g["bb_m"], g["bb_u"], g["bb_l"] = g["sma20"], g["sma20"] + 2 * std, g["sma20"] - 2 * std
    return g


def _puanla(close, g):
    """Son bar için (puan, karar, yorumlar). Puan -5..+5."""
    puan, yorum = 0, []
    rsi, s20, s50 = g["rsi"].iloc[-1], g["sma20"].iloc[-1], g["sma50"].iloc[-1]
    mh, bu, bl = g["macd_h"].iloc[-1], g["bb_u"].iloc[-1], g["bb_l"].iloc[-1]
    if pd.notna(rsi):
        if rsi < 30:   puan += 2; yorum.append(f"RSI {rsi:.1f}: aşırı satım bölgesinde, tepki alımı gelebilir.")
        elif rsi < 45: puan += 1; yorum.append(f"RSI {rsi:.1f}: zayıf ama aşırı satımda değil.")
        elif rsi > 70: puan -= 2; yorum.append(f"RSI {rsi:.1f}: aşırı alım bölgesinde, düzeltme riski var.")
        elif rsi > 60: puan -= 1; yorum.append(f"RSI {rsi:.1f}: güçlü ama aşırı alıma yaklaşıyor.")
        else:          yorum.append(f"RSI {rsi:.1f}: nötr bölgede.")
    if pd.notna(s20):
        if close > s20: puan += 1; yorum.append("Fiyat 20 günlük ortalamanın üzerinde (kısa vade pozitif).")
        else:           puan -= 1; yorum.append("Fiyat 20 günlük ortalamanın altında (kısa vade negatif).")
    if pd.notna(s50) and pd.notna(s20):
        if s20 > s50: puan += 1; yorum.append("SMA20, SMA50'nin üzerinde (yükseliş trendi).")
        else:         puan -= 1; yorum.append("SMA20, SMA50'nin altında (düşüş trendi).")
    if pd.notna(mh):
        if mh > 0: puan += 1; yorum.append("MACD histogramı pozitif (momentum yukarı).")
        else:      puan -= 1; yorum.append("MACD histogramı negatif (momentum aşağı).")
    if pd.notna(bl) and close < bl:   puan += 1; yorum.append("Fiyat Bollinger alt bandının altında.")
    elif pd.notna(bu) and close > bu: puan -= 1; yorum.append("Fiyat Bollinger üst bandının üzerinde.")
    karar = ("GÜÇLÜ AL" if puan >= 3 else "AL" if puan >= 1 else "NÖTR" if puan == 0
             else "SAT" if puan >= -2 else "GÜÇLÜ SAT")
    return puan, karar, yorum


def _yf_parametre(interval, period):
    gecerli = {"1d": {"1mo", "3mo", "6mo", "1y", "2y", "5y", "10y", "ytd", "max"},
               "1h": {"1mo", "3mo", "6mo", "1y", "2y"}, "1m": {"1d", "5d", "7d"}}
    varsayilan = {"1d": "1y", "1h": "6mo", "1m": "1d"}
    if interval not in gecerli:
        interval = "1d"
    # Streamlit'teki "1s/5s/30s" gibi yfinance'in desteklemediği değerler varsayılana düşer
    return interval, period if period in gecerli[interval] else varsayilan[interval]


# ---------------------------------------------------------------------------
# Şemalar
# ---------------------------------------------------------------------------
class BacktestIstek(BaseModel):
    hisse: str
    strateji: str = "SMA Kesişimi"
    periyot: str = "2y"
    sermaye: float = 100000.0
    komisyon_bps: float = 10.0     # 10 bps = %0,10 (her alım/satımda)
    p1: float = 20
    p2: float = 50


class OptimizeIstek(BaseModel):
    hisseler: list[str]
    rf: float = 30.0               # yıllık risksiz getiri, %


class WatchIstek(BaseModel):
    hisse: str


class SohbetMesaj(BaseModel):
    rol: str                       # "user" | "assistant"
    icerik: str


class SohbetIstek(BaseModel):
    mesajlar: list[SohbetMesaj]
    api_key: str | None = None


class WhatsAppAyar(BaseModel):
    telefon: str = ""              # +905xxxxxxxxx
    aktif: bool = False
    saat: str = "09:30"            # HH:MM (Türkiye saati)
    portfoy: bool = True
    piyasa: bool = True
    alarmlar: bool = True


# ---------------------------------------------------------------------------
def kur(app, d):
    """
    d: backend.py'den gelen bağımlılıklar:
       oturum(authorization)->email, get_user, upsert_user, yillik_gecmis, hizli_fiyat,
       son_gecerli, BIST_TUM_LIST, BIST_SEKTORLER, ANA_SAYFA_TARAMA_LISTESI
    """
    r = APIRouter()
    oturum, get_user, upsert_user = d["oturum"], d["get_user"], d["upsert_user"]
    yillik, hizli, son_gecerli = d["yillik_gecmis"], d["hizli_fiyat"], d["son_gecerli"]
    TUM, SEKTOR, POPULER = d["BIST_TUM_LIST"], d["BIST_SEKTORLER"], d["ANA_SAYFA_TARAMA_LISTESI"]

    def kullanici(authorization, zorunlu=True):
        if not authorization and not zorunlu:
            return None, {}
        try:
            email = oturum(authorization)
            k = get_user(email)
            if not k:
                if zorunlu:
                    raise HTTPException(status_code=404, detail="Kullanıcı bulunamadı.")
                return None, {}
            return email, k
        except Exception:
            if zorunlu:
                raise
            return None, {}

    def hisse_kontrol(h):
        h = (h or "").strip().upper()
        if h not in TUM:
            raise HTTPException(status_code=400, detail=f"'{h}' BIST listesinde yok.")
        return h

    def liste_kontrol(hisseler, en_az, en_cok):
        out = []
        for h in hisseler:
            h = (h or "").strip().upper()
            if h in TUM and h not in out:
                out.append(h)
        if len(out) < en_az:
            raise HTTPException(status_code=400, detail=f"En az {en_az} geçerli hisse seçin.")
        return out[:en_cok]

    def kapanislar(hisseler):
        """1 yıllık kapanışlar, tarih bazında hizalı DataFrame + eksik liste."""
        with ThreadPoolExecutor(max_workers=8) as ex:
            sonuc = list(ex.map(lambda h: (h, yillik(h)), hisseler))
        seriler, eksik = {}, []
        for h, hist in sonuc:
            if hist is None or hist.empty:
                eksik.append(h)
            else:
                s = _naif(hist)["Close"].copy()
                s.index = s.index.normalize()
                seriler[h] = s[~s.index.duplicated(keep="last")]
        df = pd.DataFrame(seriler).sort_index().ffill().dropna() if seriler else pd.DataFrame()
        return df, eksik

    # 1) STRATEJİK ANALİZ -> artık stratejik_analiz.py içinde (orijinal koda sadık sürüm)

    # =======================================================================
    # 2) PİYASA TARAYICI
    # =======================================================================
    @r.get("/api/scan/presets")
    def tarama_onayarlari():
        p = {"Popüler 20": POPULER}
        for ad, liste in SEKTOR.items():
            p[ad] = [h for h in liste if h in TUM]
        return {"presets": p}

    @r.get("/api/scan")
    def tara(hisseler: str):
        liste = liste_kontrol(hisseler.split(","), 1, 40)

        def isle(h):
            try:
                hist = yillik(h)
                if hist is None or len(hist) < 30:
                    return h, None
                g, c = _gostergeler(hist), hist["Close"]
                puan, karar, _ = _puanla(float(c.iloc[-1]), g)
                s20, s50 = g["sma20"].iloc[-1], g["sma50"].iloc[-1]
                hacim = hist["Volume"] if "Volume" in hist.columns else None
                ho = float(hacim.iloc[-1] / hacim.tail(20).mean()) if hacim is not None and hacim.tail(20).mean() > 0 else None
                return h, {
                    "hisse": h, "fiyat": _f(c.iloc[-1]), "gunluk": _f((c.iloc[-1] / c.iloc[-2] - 1) * 100),
                    "rsi": _f(g["rsi"].iloc[-1], 1),
                    "trend": "Yükseliş" if pd.notna(s50) and s20 > s50 else "Düşüş" if pd.notna(s50) else "—",
                    "macd": "Pozitif" if g["macd_h"].iloc[-1] > 0 else "Negatif",
                    "hacim_orani": _f(ho, 2), "puan": puan, "karar": karar,
                }
            except Exception:
                return h, None

        with ThreadPoolExecutor(max_workers=8) as ex:
            sonuc = list(ex.map(isle, liste))
        satirlar = sorted([s for _, s in sonuc if s], key=lambda x: x["puan"], reverse=True)
        return {"satirlar": satirlar, "eksik": [h for h, s in sonuc if not s]}

    # =======================================================================
    # 3) AI GELECEK  (Monte Carlo senaryo — LSTM/TensorFlow gerektirmez)
    # =======================================================================
    @r.get("/api/forecast/{hisse}")
    def tahmin(hisse: str, gun: int = 30):
        hisse = hisse_kontrol(hisse)
        gun = max(5, min(gun, 120))
        hist = _gecmis(hisse, "2y", "1d", son_gecerli)
        if hist is None or len(hist) < 60:
            raise HTTPException(status_code=404, detail=f"{hisse} için yeterli geçmiş veri yok (en az 60 gün).")
        c = hist["Close"]
        lr = np.log(c / c.shift(1)).dropna().tail(252)
        mu, sigma = float(lr.mean()) * 0.5, float(lr.std())   # getiri beklentisi %50 törpülenir (aşırı iyimserliği engeller)
        s0 = float(c.iloc[-1])

        rng = np.random.default_rng(42)       # sabit tohum: her yenilemede aynı sonuç
        z = rng.standard_normal((3000, gun))
        yollar = s0 * np.exp(np.cumsum((mu - 0.5 * sigma ** 2) + sigma * z, axis=1))
        p = np.percentile(yollar, [5, 25, 50, 75, 95], axis=0)
        tarihler = pd.bdate_range(start=c.index[-1] + pd.Timedelta(days=1), periods=gun)

        def ileri(v, ad, renk):
            pts = [{"t": _etiket(c.index[-1]), "v": _f(s0)}] + [{"t": _etiket(t), "v": _f(x)} for t, x in zip(tarihler, v)]
            return {"hisse": ad, "noktalar": pts, "renk": renk}

        # Basit trend: son 60 günün log-fiyat eğimi, son kapanıştan itibaren sürdürülür
        egim = np.polyfit(np.arange(60), np.log(c.tail(60).values), 1)[0]
        trend = s0 * np.exp(egim * np.arange(1, gun + 1))

        gecmis = c.tail(90)
        return {
            "hisse": hisse, "gun": gun, "fiyat": _f(s0),
            "gunluk_vol": _f(sigma * 100, 2), "yillik_vol": _f(sigma * np.sqrt(252) * 100, 1),
            "medyan": _f(p[2][-1]), "iyimser": _f(p[4][-1]), "kotumser": _f(p[0][-1]),
            "medyan_degisim": _f((p[2][-1] / s0 - 1) * 100), "artis_olasiligi": _f(float((yollar[:, -1] > s0).mean() * 100), 1),
            "seriler": [
                _seri(gecmis, True, "Geçmiş", "#E0E0E0"),
                ileri(p[2], "Medyan senaryo", "#D7FF4E"),
                ileri(p[4], "İyimser (%95)", "#22C55E"),
                ileri(p[0], "Kötümser (%5)", "#F0455C"),
                ileri(trend, "Trend (son 60 gün eğimi)", "#4EA8FF"),
            ],
        }

    # =======================================================================
    # 4) BACKTEST
    # =======================================================================
    def _pozisyon(c, g, strateji, p1, p2):
        if strateji == "SMA Kesişimi":
            hizli_, yavas = c.rolling(int(p1)).mean(), c.rolling(int(p2)).mean()
            return ((hizli_ > yavas) & yavas.notna()).astype(float)
        if strateji == "MACD":
            return ((g["macd"] > g["macd_s"]) & g["macd_s"].notna()).astype(float)
        pos, acik = [], 0.0
        for i in range(len(c)):
            if strateji == "RSI":
                v = g["rsi"].iloc[i]
                if pd.notna(v):
                    if v < p1: acik = 1.0
                    elif v > p2: acik = 0.0
            else:  # Bollinger: alt bant altında al, orta bant üstünde sat
                if pd.notna(g["bb_l"].iloc[i]):
                    if c.iloc[i] < g["bb_l"].iloc[i]: acik = 1.0
                    elif c.iloc[i] > g["bb_m"].iloc[i]: acik = 0.0
            pos.append(acik)
        return pd.Series(pos, index=c.index)

    def _csv_yaz(satir):
        yeni = not BACKTEST_CSV.exists()
        with open(BACKTEST_CSV, "a", newline="", encoding="utf-8") as f:
            w = csv.DictWriter(f, fieldnames=list(satir.keys()))
            if yeni:
                w.writeheader()
            w.writerow(satir)

    @r.post("/api/backtest")
    def backtest(istek: BacktestIstek, authorization: str | None = Header(default=None)):
        email = oturum(authorization)
        hisse = hisse_kontrol(istek.hisse)
        if istek.strateji not in ("SMA Kesişimi", "RSI", "MACD", "Bollinger"):
            raise HTTPException(status_code=400, detail="Geçersiz strateji.")
        if istek.periyot not in ("6mo", "1y", "2y", "5y"):
            raise HTTPException(status_code=400, detail="Periyot 6mo, 1y, 2y veya 5y olmalı.")
        if istek.sermaye <= 0:
            raise HTTPException(status_code=400, detail="Sermaye sıfırdan büyük olmalı.")
        if istek.strateji == "SMA Kesişimi" and not (2 <= istek.p1 < istek.p2 <= 250):
            raise HTTPException(status_code=400, detail="Hızlı ortalama yavaş ortalamadan küçük olmalı (2–250).")
        if istek.strateji == "RSI" and not (0 < istek.p1 < istek.p2 < 100):
            raise HTTPException(status_code=400, detail="RSI: alım eşiği satım eşiğinden küçük olmalı (0–100).")

        hist = _gecmis(hisse, istek.periyot, "1d", son_gecerli)
        if hist is None or len(hist) < 60:
            raise HTTPException(status_code=404, detail=f"{hisse} için yeterli veri yok.")
        c = hist["Close"]
        g = _gostergeler(hist)
        pos = _pozisyon(c, g, istek.strateji, istek.p1, istek.p2)
        kom = istek.komisyon_bps / 10000.0

        # Sinyal barın kapanışında üretilir, getiri bir sonraki bardan itibaren işler (ileriye bakma hatası yok)
        pe = pos.shift(1).fillna(0.0)
        strat = pe * c.pct_change().fillna(0) - pe.diff().abs().fillna(pe.iloc[0]) * kom
        equity = istek.sermaye * (1 + strat).cumprod()
        bh = istek.sermaye * c / c.iloc[0]

        islemler, giris = [], None
        for i in range(1, len(c)):
            if pos.iloc[i] == 1 and pos.iloc[i - 1] == 0:
                giris = (c.index[i], float(c.iloc[i]))
            elif pos.iloc[i] == 0 and pos.iloc[i - 1] == 1 and giris:
                cikis = float(c.iloc[i])
                islemler.append({
                    "giris_tarih": _etiket(giris[0]), "giris_t": _etiket(giris[0]),
                    "giris": _f(giris[1]), "giris_f": _f(giris[1]),
                    "cikis_tarih": _etiket(c.index[i]), "cikis_t": _etiket(c.index[i]),
                    "cikis": _f(cikis), "cikis_f": _f(cikis),
                    "getiri": _f(((cikis / giris[1]) - 1 - 2 * kom) * 100, 2), "acik": False
                })
                giris = None
        if giris:
            cikis = float(c.iloc[-1])
            islemler.append({
                "giris_tarih": _etiket(giris[0]), "giris_t": _etiket(giris[0]),
                "giris": _f(giris[1]), "giris_f": _f(giris[1]),
                "cikis_tarih": _etiket(c.index[-1]), "cikis_t": _etiket(c.index[-1]),
                "cikis": _f(cikis), "cikis_f": _f(cikis),
                "getiri": _f(((cikis / giris[1]) - 1 - kom) * 100, 2), "acik": True
            })

        tg = float(equity.iloc[-1] / istek.sermaye - 1)
        bhg = float(c.iloc[-1] / c.iloc[0] - 1)
        yil = max(len(c) / 252, 1e-9)
        maxdd = float(((equity / equity.cummax()) - 1).min())
        sharpe = float(strat.mean() / strat.std() * np.sqrt(252)) if strat.std() > 0 else None
        kazanan = [t for t in islemler if (t["getiri"] or 0) > 0]
        toplam_kazanc = sum(t["getiri"] for t in islemler if (t["getiri"] or 0) > 0)
        toplam_kayip = abs(sum(t["getiri"] for t in islemler if (t["getiri"] or 0) < 0))
        kar_faktoru = float(toplam_kazanc / toplam_kayip) if toplam_kayip > 0 else (toplam_kazanc if toplam_kazanc > 0 else 1.0)
        metr = {
            "toplam_getiri": _f(tg * 100, 2), "bh_getiri": _f(bhg * 100, 2),
            "yillik_getiri": _f(((1 + tg) ** (1 / yil) - 1) * 100, 2) if tg > -1 else None,
            "max_dusus": _f(maxdd * 100, 2), "sharpe": _f(sharpe, 2),
            "islem_sayisi": len(islemler),
            "basari_orani": _f(len(kazanan) / len(islemler) * 100, 1) if islemler else None,
            "kazanma_orani": _f(len(kazanan) / len(islemler) * 100, 1) if islemler else None,
            "kar_islem": len(kazanan),
            "kar_faktoru": _f(kar_faktoru, 2),
            "son_deger": _f(equity.iloc[-1], 2),
            "son_kasa": _f(equity.iloc[-1], 2),
        }
        _csv_yaz({
            "zaman": datetime.now(TR_SAAT).strftime("%Y-%m-%d %H:%M"), "email": email, "hisse": hisse, "strateji": istek.strateji,
            "parametre": f"{istek.p1:g}/{istek.p2:g}", "periyot": istek.periyot, "toplam_getiri": metr["toplam_getiri"],
            "bh_getiri": metr["bh_getiri"], "islem": len(islemler), "max_dusus": metr["max_dusus"],
        })
        return {
            "hisse": hisse, "metrikler": metr, "islemler": islemler[::-1][:100],
            "seriler": [_seri(equity, True, "Strateji", "#D7FF4E"), _seri(bh, True, "Al-Tut", "#4EA8FF")],
        }

    @r.get("/api/backtest/history")
    def backtest_gecmisi(authorization: str | None = Header(default=None)):
        email = oturum(authorization)
        if not BACKTEST_CSV.exists():
            return {"gecmis": []}
        with open(BACKTEST_CSV, newline="", encoding="utf-8") as f:
            satirlar = [s for s in csv.DictReader(f) if s.get("email") == email]
        for s in satirlar:
            s.pop("email", None)
        return {"gecmis": satirlar[::-1][:30]}

    # =======================================================================
    # 5) İZLEME LİSTESİ  (db.py'deki mevcut 'watchlist' kolonu)
    # =======================================================================
    @r.get("/api/watchlist")
    def izleme_listesi(authorization: str | None = Header(default=None)):
        _, k = kullanici(authorization)
        liste = [h for h in (k.get("watchlist") or []) if isinstance(h, str)]

        def isle(h):
            hist = yillik(h)
            if hist is None or len(hist) < 30:
                return {"hisse": h, "fiyat": None, "gunluk": None, "rsi": None, "karar": None}
            c, g = hist["Close"], _gostergeler(hist)
            _, karar, _ = _puanla(float(c.iloc[-1]), g)
            return {"hisse": h, "fiyat": _f(c.iloc[-1]), "gunluk": _f((c.iloc[-1] / c.iloc[-2] - 1) * 100),
                    "rsi": _f(g["rsi"].iloc[-1], 1), "karar": karar}

        with ThreadPoolExecutor(max_workers=8) as ex:
            return {"liste": list(ex.map(isle, liste))}

    @r.post("/api/watchlist")
    def izleme_ekle(istek: WatchIstek, authorization: str | None = Header(default=None)):
        email, k = kullanici(authorization)
        h = hisse_kontrol(istek.hisse)
        liste = list(k.get("watchlist") or [])
        if h in liste:
            raise HTTPException(status_code=400, detail=f"{h} zaten izleme listenizde.")
        liste.append(h)
        k["watchlist"] = liste
        upsert_user(email, k)
        return {"watchlist": liste}

    @r.delete("/api/watchlist/{hisse}")
    def izleme_sil(hisse: str, authorization: str | None = Header(default=None)):
        email, k = kullanici(authorization)
        h = hisse.strip().upper()
        liste = [x for x in (k.get("watchlist") or []) if x != h]
        k["watchlist"] = liste
        upsert_user(email, k)
        return {"watchlist": liste}

    # =======================================================================
    # 6) PORTFÖY OPTİMİZASYONU  (Markowitz — rastgele portföy simülasyonu)
    # =======================================================================
    @r.post("/api/optimize")
    def optimize(istek: OptimizeIstek):
        liste = liste_kontrol(istek.hisseler, 2, 10)
        kap, eksik = kapanislar(liste)
        liste = [h for h in liste if h in kap.columns]
        if len(liste) < 2 or len(kap) < 60:
            raise HTTPException(status_code=400, detail="Optimizasyon için yeterli ortak geçmiş veri yok (en az 2 hisse, 60 gün).")
        getiriler = kap.pct_change().dropna()
        mu, cov = getiriler.mean().values * 252, getiriler.cov().values * 252
        rf, n = istek.rf / 100.0, len(liste)

        rng = np.random.default_rng(7)
        w = np.vstack([rng.dirichlet(np.ones(n), 6000), np.eye(n), np.full((1, n), 1 / n)])
        ret = w @ mu
        risk = np.sqrt(np.einsum("ij,jk,ik->i", w, cov, w))
        sharpe = (ret - rf) / np.where(risk > 0, risk, np.nan)

        def paket(i):
            return {"agirliklar": {h: _f(w[i][j] * 100, 1) for j, h in enumerate(liste)},
                    "getiri": _f(ret[i] * 100, 1), "risk": _f(risk[i] * 100, 1), "sharpe": _f(sharpe[i], 2)}

        ornek = rng.choice(len(w), size=min(500, len(w)), replace=False)
        return {
            "hisseler": liste, "eksik": eksik, "gun": len(getiriler),
            "max_sharpe": paket(int(np.nanargmax(sharpe))), "min_risk": paket(int(np.argmin(risk))), "esit": paket(len(w) - 1),
            "nokta": [{"risk": _f(risk[i] * 100, 1), "getiri": _f(ret[i] * 100, 1), "sharpe": _f(sharpe[i], 2)} for i in ornek],
            "tekil": [{"hisse": h, "risk": _f(risk[6000 + j] * 100, 1), "getiri": _f(ret[6000 + j] * 100, 1)} for j, h in enumerate(liste)],
        }

    # =======================================================================
    # 7) PERFORMANS & RİSK
    # =======================================================================
    @r.get("/api/performance")
    def performans(rf: float = 30.0, authorization: str | None = Header(default=None)):
        _, k = kullanici(authorization)
        port = k.get("portfolio") or {}
        if not port:
            return {"bos": True}
        kap, eksik = kapanislar(list(port.keys()))
        if kap.empty or len(kap) < 30:
            raise HTTPException(status_code=404, detail="Portföy hisseleri için yeterli geçmiş veri alınamadı.")
        lotlar = pd.Series({h: float(port[h]["lot"]) for h in kap.columns})
        deger = (kap * lotlar).sum(axis=1)
        r_p = deger.pct_change().dropna()

        bench = yillik("XU100")
        rb, bench_norm = None, None
        if bench is not None and not bench.empty:
            b = _naif(bench)["Close"]; b.index = b.index.normalize()
            b = b[~b.index.duplicated(keep="last")].reindex(deger.index).ffill().dropna()
            if len(b) > 30:
                rb = b.pct_change().dropna()
                bench_norm = b / b.iloc[0] * 100
        vol = float(r_p.std() * np.sqrt(252))
        yillik_getiri = float(r_p.mean() * 252)
        beta = alpha = None
        if rb is not None:
            ortak_r = pd.concat([r_p, rb], axis=1, join="inner").dropna()
            if len(ortak_r) > 30 and ortak_r.iloc[:, 1].var() > 0:
                beta = float(ortak_r.cov().iloc[0, 1] / ortak_r.iloc[:, 1].var())
                alpha = float((ortak_r.iloc[:, 0].mean() - beta * ortak_r.iloc[:, 1].mean()) * 252)
        dd = float((deger / deger.cummax() - 1).min())
        var95 = float(-np.percentile(r_p, 5))
        agirlik = (kap.iloc[-1] * lotlar) / deger.iloc[-1]
        satirlar = [{"hisse": h, "agirlik": _f(agirlik[h] * 100, 1),
                     "getiri": _f((kap[h].iloc[-1] / kap[h].iloc[0] - 1) * 100, 1),
                     "volatilite": _f(kap[h].pct_change().std() * np.sqrt(252) * 100, 1)} for h in kap.columns]
        norm = deger / deger.iloc[0] * 100
        seriler = [_seri(norm.rename("Portföy"), True, "Portföy", "#D7FF4E")]
        if bench_norm is not None:
            seriler.append(_seri(bench_norm.rename("BIST 100"), True, "BIST 100", "#4EA8FF"))
        return {
            "bos": False, "eksik": eksik, "gun": len(deger), "seriler": seriler,
            "metrikler": {
                "toplam_getiri": _f((deger.iloc[-1] / deger.iloc[0] - 1) * 100, 2),
                "bist_getiri": _f((bench_norm.iloc[-1] / 100 - 1) * 100, 2) if bench_norm is not None else None,
                "yillik_vol": _f(vol * 100, 2), "sharpe": _f((yillik_getiri - rf / 100) / vol, 2) if vol > 0 else None,
                "max_dusus": _f(dd * 100, 2), "beta": _f(beta, 2), "alfa": _f(alpha * 100, 2) if alpha is not None else None,
                "var95_yuzde": _f(var95 * 100, 2), "var95_tutar": _f(var95 * deger.iloc[-1], 0), "portfoy_degeri": _f(deger.iloc[-1], 0),
            },
            "satirlar": sorted(satirlar, key=lambda x: -(x["agirlik"] or 0)),
        }

    # =======================================================================
    # 8) AI ASİSTAN
    # =======================================================================
    def _hisse_ozeti(h):
        hist = yillik(h)
        if hist is None or len(hist) < 30:
            return None
        c, g = hist["Close"], _gostergeler(hist)
        puan, karar, yorum = _puanla(float(c.iloc[-1]), g)
        return {"hisse": h, "fiyat": _f(c.iloc[-1], 2), "gunluk_degisim_%": _f((c.iloc[-1] / c.iloc[-2] - 1) * 100, 2),
                "rsi": _f(g["rsi"].iloc[-1], 1), "sma20": _f(g["sma20"].iloc[-1], 2), "sma50": _f(g["sma50"].iloc[-1], 2),
                "1y_getiri_%": _f((c.iloc[-1] / c.iloc[0] - 1) * 100, 1), "sinyal": karar, "puan": puan, "notlar": yorum}

    def _http_json(url, govde, basliklar):
        istek = urllib.request.Request(url, data=json.dumps(govde).encode(), headers={"Content-Type": "application/json", **basliklar})
        with urllib.request.urlopen(istek, timeout=45) as yanit:
            return json.loads(yanit.read().decode())

    @r.get("/api/ai/sozluk")
    def ai_sozluk():
        """Borsa İstanbul terimleri sözlüğü listesi."""
        liste = []
        for kod, v in TERIMLER.items():
            liste.append({
                "kod": kod,
                "baslik": v["baslik"],
                "kategori": v["kategori"],
                "kisa": v["kisa"],
                "aciklama": v["aciklama"],
                "anahtarlar": v.get("anahtarlar", [])
            })
        return {"terimler": liste}

    @r.post("/api/ai/chat")
    def ai_sohbet(istek: SohbetIstek, authorization: str | None = Header(default=None)):
        _, k = kullanici(authorization, zorunlu=False)
        if not istek.mesajlar or istek.mesajlar[-1].rol != "user":
            raise HTTPException(status_code=400, detail="Son mesaj kullanıcıdan olmalı.")
        soru = istek.mesajlar[-1].icerik
        anilan = []
        for kelime in soru.upper().replace(",", " ").replace("?", " ").replace(".", " ").split():
            if kelime in TUM and kelime not in anilan:
                anilan.append(kelime)
        port = k.get("portfolio") or {}
        if not anilan and "portf" in soru.lower() and port:    # "portföyümü değerlendir" -> portföydeki hisseler
            anilan = list(port.keys())
        with ThreadPoolExecutor(max_workers=4) as ex:
            ozetler = [o for o in ex.map(_hisse_ozeti, anilan[:6]) if o]

        baglam = (
            "Sen Plutos platformunun kıdemli Borsa İstanbul (BIST) Baş Stratejisti, Portföy Yöneticisi ve Finansal Analiz Uzmanısın.\n"
            "UZMANLIK VE ANALİZ İLKELERİN:\n"
            "1. KAPSAM: Borsa İstanbul şirketleri, sektör dinamikleri, bilançolar, para politikası, makroekonomi, teknik analiz ve portföy teorisi dahil borsayla ilgili HERHANGİ bir soruya derinlemesine, gerekçeli ve çok boyutlu yanıt ver.\n"
            "2. DERİN ANALİZ & ÇIKARIM: Asla yüzeysel veya kısa geçiştirici yanıt verme. Hisseleri veya sektörleri kıyaslarken avantaj/risklerini somut maddelerle karşılaştır. Analizinin sonunda mutlaka net bir '🎯 Stratejik Değerlendirme & Sonuç' bölümü sunarak somut bir çıkarım yap.\n"
            "3. RASYONEL VE GERÇEKÇİ: Sayı veya veri uydurma; sana sağlanan gerçek verileri ve finans matematiğini kullan.\n"
            "4. BİLGİLENDİRME: Yanıtının en altına kısa bir not ekle: '⚠️ Yatırım tavsiyesi (YTD) niteliği taşımaz.'\n"
            f"Kullanıcı portföyü: {json.dumps(port, ensure_ascii=False) if port else 'boş'}\n"
            f"Sanal bakiye: {k.get('virtual_cash')}\n"
            f"Sorulan hisselerin güncel verisi: {json.dumps(ozetler, ensure_ascii=False) if ozetler else 'yok'}"
        )
        gecmis = [(m.rol, m.icerik) for m in istek.mesajlar[-12:]]

        user_key = (istek.api_key or "").strip()

        # 1. Google Gemini
        gemini = user_key if (user_key and not user_key.startswith("sk-") and not user_key.startswith("gsk_")) else os.environ.get("GEMINI_API_KEY")
        if gemini:
            try:
                model = os.environ.get("GEMINI_MODEL", "gemini-2.5-flash")
                cevap = _http_json(
                    f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={gemini}",
                    {"system_instruction": {"parts": [{"text": baglam}]},
                     "contents": [{"role": "user" if rol == "user" else "model", "parts": [{"text": t}]} for rol, t in gecmis]}, {})
                return {"yanit": cevap["candidates"][0]["content"]["parts"][0]["text"], "kaynak": f"Gemini ({model}) Baş Analist"}
            except Exception:
                pass

        # 2. Groq (Llama 3.3 70B)
        groq_key = user_key if user_key.startswith("gsk_") else os.environ.get("GROQ_API_KEY")
        if groq_key:
            try:
                cevap = _http_json(
                    "https://api.groq.com/openai/v1/chat/completions",
                    {"model": os.environ.get("GROQ_MODEL", "llama-3.3-70b-versatile"),
                     "messages": [{"role": "system", "content": baglam}] + [{"role": "user" if rol == "user" else "assistant", "content": t} for rol, t in gecmis]},
                    {"Authorization": f"Bearer {groq_key}"})
                return {"yanit": cevap["choices"][0]["message"]["content"], "kaynak": "Groq Llama 3.3 70B Quant Stratejist"}
            except Exception:
                pass

        # 3. OpenAI (GPT-4o-mini / GPT-4o)
        openai_key = user_key if (user_key.startswith("sk-") and not user_key.startswith("sk-ant")) else os.environ.get("OPENAI_API_KEY")
        if openai_key:
            try:
                model = os.environ.get("OPENAI_MODEL", "gpt-4o-mini")
                cevap = _http_json(
                    "https://api.openai.com/v1/chat/completions",
                    {"model": model, "messages": [{"role": "system", "content": baglam}] + [{"role": "user" if rol == "user" else "assistant", "content": t} for rol, t in gecmis]},
                    {"Authorization": f"Bearer {openai_key}"})
                return {"yanit": cevap["choices"][0]["message"]["content"], "kaynak": f"OpenAI {model} Stratejist"}
            except Exception:
                pass

        # 4. Anthropic Claude
        claude = user_key if user_key.startswith("sk-ant") else os.environ.get("ANTHROPIC_API_KEY")
        if claude:
            try:
                cevap = _http_json(
                    "https://api.anthropic.com/v1/messages",
                    {"model": os.environ.get("ANTHROPIC_MODEL", "claude-sonnet-5-5"), "max_tokens": 1500, "system": baglam,
                     "messages": [{"role": "user" if rol == "user" else "assistant", "content": t} for rol, t in gecmis]},
                    {"x-api-key": claude, "anthropic-version": "2023-06-01"})
                return {"yanit": "".join(b.get("text", "") for b in cevap["content"]), "kaynak": "Claude 3.5 Sonnet Baş Analist"}
            except Exception:
                pass

        # --- Yerel Mod: BIST Bilgi Motoru & Doğal Sohbet ---
        return yerel_ai_yanit_olustur(soru, portfoy=port, bakiye=k.get("virtual_cash"), ozetler=ozetler)

    # =======================================================================
    # 9) WHATSAPP BOTU  (Twilio)
    # =======================================================================
    kilit = threading.Lock()

    def _ayar_oku():
        try:
            return json.loads(WHATSAPP_JSON.read_text(encoding="utf-8"))
        except Exception:
            return {}

    def _ayar_yaz(v):
        WHATSAPP_JSON.write_text(json.dumps(v, ensure_ascii=False, indent=2), encoding="utf-8")

    def twilio_hazir():
        return all(os.environ.get(x) for x in ("TWILIO_ACCOUNT_SID", "TWILIO_AUTH_TOKEN", "TWILIO_WHATSAPP_FROM"))

    def _mesaj_olustur(k, ayar):
        satirlar = [f"📊 *Plutos Günlük Özet* — {datetime.now(TR_SAAT).strftime('%d.%m.%Y')}"]
        if ayar.get("piyasa", True):
            b = yillik("XU100")
            if b is not None and len(b) >= 2:
                c = b["Close"]
                satirlar.append(f"BIST 100: {c.iloc[-1]:,.0f} ({(c.iloc[-1] / c.iloc[-2] - 1) * 100:+.2f}%)")
        port = k.get("portfolio") or {}
        if ayar.get("portfoy", True) and port:
            toplam, maliyet = 0.0, 0.0
            for h, p in port.items():
                hist = hizli(h)
                fiyat = float(hist["Close"].iloc[-1]) if hist is not None and not hist.empty else p["maliyet"]
                toplam += fiyat * p["lot"]; maliyet += p["maliyet"] * p["lot"]
            if maliyet > 0:
                satirlar.append(f"Portföy: {toplam:,.0f} ₺ (K/Z {toplam - maliyet:+,.0f} ₺ / {(toplam / maliyet - 1) * 100:+.1f}%)")
        if ayar.get("alarmlar", True):
            tetik = [a for a in (k.get("price_alarms") or []) if a.get("tetiklendi")]
            if tetik:
                satirlar.append("🔔 Tetiklenen alarmlar: " + ", ".join(f"{a['hisse']} {a['esik']}" for a in tetik))
        satirlar.append("⚠️ Yatırım tavsiyesi değildir.")
        return "\n".join(satirlar)

    def _twilio_gonder(telefon, metin):
        sid, token, kaynak = os.environ["TWILIO_ACCOUNT_SID"], os.environ["TWILIO_AUTH_TOKEN"], os.environ["TWILIO_WHATSAPP_FROM"]
        kaynak = kaynak if kaynak.startswith("whatsapp:") else f"whatsapp:{kaynak}"
        veri = urllib.parse.urlencode({"From": kaynak, "To": f"whatsapp:{telefon}", "Body": metin}).encode()
        istek = urllib.request.Request(f"https://api.twilio.com/2010-04-01/Accounts/{sid}/Messages.json", data=veri)
        istek.add_header("Authorization", "Basic " + base64.b64encode(f"{sid}:{token}".encode()).decode())
        urllib.request.urlopen(istek, timeout=20).read()

    def _telefon_gecerli(t):
        t = (t or "").strip()
        return t.startswith("+") and t[1:].isdigit() and 10 <= len(t) <= 16

    @r.get("/api/whatsapp")
    def whatsapp_getir(authorization: str | None = Header(default=None)):
        email, k = kullanici(authorization)
        ayar = {**WhatsAppAyar().model_dump(), **_ayar_oku().get(email, {})}
        ayar.pop("son_gonderim", None)
        return {"ayar": ayar, "twilio_hazir": twilio_hazir(), "onizleme": _mesaj_olustur(k, ayar)}

    @r.put("/api/whatsapp")
    def whatsapp_kaydet(istek: WhatsAppAyar, authorization: str | None = Header(default=None)):
        email, k = kullanici(authorization)
        if istek.telefon and not _telefon_gecerli(istek.telefon):
            raise HTTPException(status_code=400, detail="Telefonu uluslararası formatta yazın, örn: +905551234567")
        try:
            sa, dk = istek.saat.split(":"); assert 0 <= int(sa) < 24 and 0 <= int(dk) < 60
        except Exception:
            raise HTTPException(status_code=400, detail="Saat HH:MM biçiminde olmalı.")
        if istek.aktif and not istek.telefon:
            raise HTTPException(status_code=400, detail="Otomatik gönderim için telefon numarası girin.")
        with kilit:
            tum = _ayar_oku()
            tum[email] = {**tum.get(email, {}), **istek.model_dump()}
            _ayar_yaz(tum)
        return {"ok": True}

    @r.post("/api/whatsapp/test")
    def whatsapp_test(authorization: str | None = Header(default=None)):
        email, k = kullanici(authorization)
        ayar = {**WhatsAppAyar().model_dump(), **_ayar_oku().get(email, {})}
        if not _telefon_gecerli(ayar.get("telefon")):
            raise HTTPException(status_code=400, detail="Önce geçerli bir telefon numarasını kaydedin (+905...).")
        if not twilio_hazir():
            raise HTTPException(status_code=503, detail="Twilio ayarlı değil. backend/.env içine TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN ve TWILIO_WHATSAPP_FROM ekleyin.")
        try:
            _twilio_gonder(ayar["telefon"], _mesaj_olustur(k, ayar))
        except Exception as e:
            raise HTTPException(status_code=502, detail=f"Twilio hatası: {e}")
        return {"ok": True}

    def _zamanlayici():
        """Her 30 sn'de bir: saati gelen ve bugün gönderilmemiş aktif kullanıcılara özet yolla."""
        while True:
            time.sleep(30)
            try:
                if not twilio_hazir():
                    continue
                simdi = datetime.now(TR_SAAT)
                with kilit:
                    tum = _ayar_oku()
                for email, ayar in tum.items():
                    if not ayar.get("aktif") or ayar.get("son_gonderim") == simdi.strftime("%Y-%m-%d"):
                        continue
                    try:
                        hedef = datetime.strptime(ayar.get("saat", "09:30"), "%H:%M")
                    except ValueError:
                        continue
                    fark = (simdi.hour * 60 + simdi.minute) - (hedef.hour * 60 + hedef.minute)
                    if not 0 <= fark <= 10:      # sadece hedef saatten sonraki 10 dk içinde gönder
                        continue
                    k = get_user(email)
                    if k and _telefon_gecerli(ayar.get("telefon")):
                        _twilio_gonder(ayar["telefon"], _mesaj_olustur(k, ayar))
                        with kilit:
                            t2 = _ayar_oku(); t2[email]["son_gonderim"] = simdi.strftime("%Y-%m-%d"); _ayar_yaz(t2)
            except Exception:
                pass

    threading.Thread(target=_zamanlayici, daemon=True).start()
    app.include_router(r)

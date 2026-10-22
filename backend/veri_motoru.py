"""
veri_motoru.py — data_engine.py'nin Streamlit'siz karşılığı (FastAPI için).
------------------------------------------------------------------------
Orijinaldeki mantık korunur:
  * Fiyat verisi: TradingView (tvDatafeed KURULUYSA) -> Yahoo Finance (yfinance) yedeği
  * "Taslak" satırları (Close NaN / Volume 0) temizleme: son_gecerli_satirlar
  * Haberler: Google News RSS
Değişen tek şey: st.cache_data / st.session_state yerine basit TTL önbelleği.
"""
import threading
import time
import xml.etree.ElementTree as ET

import pandas as pd
import requests
import yfinance as yf

try:
    from tvDatafeed import TvDatafeed, Interval
    TVDATAFEED_AVAILABLE = True
except ImportError:
    TVDATAFEED_AVAILABLE = False

_tv = None
_kilit = threading.Lock()
_onbellek: dict = {}


def _onbellekten(anahtar, ttl):
    kayit = _onbellek.get(anahtar)
    if kayit and time.time() - kayit[0] < ttl:
        return kayit[1]
    return None


def _onbellege(anahtar, deger):
    _onbellek[anahtar] = (time.time(), deger)
    return deger


def son_gecerli_satirlar(df):
    """Borsa kapalıyken yfinance'in eklediği 'taslak' satırları (Close NaN / Volume 0) eler."""
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


def _tv_baglan():
    global _tv
    if not TVDATAFEED_AVAILABLE:
        return None
    with _kilit:
        if _tv is None:
            try:
                _tv = TvDatafeed()
            except Exception:
                _tv = None
    return _tv


def _yfinance_dogrudan(symbol, period, interval):
    """Yedek kanal (Yahoo) — hissenin halka arzından itibaren tüm geçmişini ('max') destekler."""
    try:
        clean = symbol.split('.')[0].upper()
        yf_period = period
        if interval in ('5m', '15m', '30m') and period not in ('1d', '5d', '1mo', '60d'):
            yf_period = '60d'
        elif interval in ('60m', '1h') and period in ('3y', '5y', '10y', 'max'):
            yf_period = '2y'
        elif interval in ('1d', '5d', '1wk', '1mo', '3mo') and period in ('3y', 'max'):
            yf_period = 'max'

        df = yf.download(f"{clean}.IS", period=yf_period, interval=interval, progress=False)
        if df is not None and not df.empty:
            if isinstance(df.columns, pd.MultiIndex):
                df.columns = df.columns.droplevel(1)
            return son_gecerli_satirlar(df)
    except Exception:
        pass
    return pd.DataFrame()


def gecmis_veri(symbol, period='max', interval='1d'):
    """data_engine.get_historical_data karşılığı (TTL 120 sn). Başarısız sonuç önbelleğe alınmaz."""
    anahtar = ('hist', symbol.upper(), period, interval)
    hit = _onbellekten(anahtar, 120)
    if hit is not None:
        return hit.copy()

    # Tam geçmiş ('max', '10y', '5y', '3y') istendiğinde doğrudan Yahoo Finance üzerinden halka arzdan itibaren tüm veriyi çek
    if period in ('max', '10y', '5y', '3y') and interval in ('1d', '5d', '1wk', '1mo'):
        df_yf = _yfinance_dogrudan(symbol, 'max' if period == 'max' else period, interval)
        if df_yf is not None and not df_yf.empty:
            _onbellege(anahtar, df_yf)
            return df_yf.copy()

    clean = symbol.split('.')[0].upper()
    tv = _tv_baglan()
    if tv is not None:
        try:
            n_bars = 5000
            if interval == '1d':
                n_bars = {'max': 5000, '10y': 2600, '5y': 1300, '3y': 780, '1y': 260, '6mo': 130}.get(period, 5000)
            elif interval in ('1h', '60m'):
                n_bars = 2000
            itvl = Interval.in_1_hour if interval in ('1h', '60m') else Interval.in_daily
            for _ in range(2):
                df = tv.get_hist(symbol=clean, exchange='BIST', interval=itvl, n_bars=n_bars)
                if df is None:
                    df = tv.get_hist(symbol=clean, exchange='ISE', interval=itvl, n_bars=n_bars)
                if df is not None and not df.empty:
                    df = df.rename(columns={'open': 'Open', 'high': 'High', 'low': 'Low', 'close': 'Close', 'volume': 'Volume'})
                    _onbellege(anahtar, df)
                    return df.copy()
                time.sleep(0.1)
        except Exception:
            pass

    df = _yfinance_dogrudan(symbol, period, interval)
    if df is not None and not df.empty:
        _onbellege(anahtar, df)
    return df


def ticker_gecmisi(sembol, period='1y'):
    """
    hisse_inceleme_ekrani'ndaki çift motorlu veri çekme: önce yf.Ticker().history, olmazsa TradingView.
    Dönüş: (df, hata_metni). Başarılıysa df dolu, hata_metni ''.
    """
    yf_hata, tv_hata = "Hata yok", "Hata yok"
    try:
        df = yf.Ticker(f"{sembol}.IS").history(period=period)
        if df is not None and not df.empty:
            return df, ""
        yf_hata = "Yahoo Finance boş tablo döndürdü."
    except Exception as e:
        yf_hata = str(e)
    tv = _tv_baglan()
    if tv is not None:
        try:
            df = tv.get_hist(symbol=sembol, exchange='BIST', interval=Interval.in_daily, n_bars=260)
            if df is not None and not df.empty:
                return df, ""
            tv_hata = "TradingView veriyi bulamadı."
        except Exception as e:
            tv_hata = str(e)
    else:
        tv_hata = "TradingView (tvDatafeed) kurulu değil."
    return pd.DataFrame(), f"Yahoo Finance: {yf_hata} | TradingView: {tv_hata}"


def haberler(symbol):
    """Google News RSS — ilk 5 haber [{'title','link'}]."""
    anahtar = ('news', symbol.upper())
    hit = _onbellekten(anahtar, 600)
    if hit is not None:
        return hit
    try:
        clean = symbol.split('.')[0].upper()
        url = f"https://news.google.com/rss/search?q={clean}+hisse&hl=tr-TR&gl=TR&ceid=TR:tr"
        r = requests.get(url, headers={'User-Agent': 'Mozilla/5.0'}, timeout=4)
        if r.status_code == 200:
            root = ET.fromstring(r.content)
            liste = [{'title': i.find('title').text, 'link': i.find('link').text} for i in root.findall('.//item')[:5]]
            return _onbellege(anahtar, liste)
    except Exception:
        pass
    return []


def temel_oranlar(symbol):
    """yfinance .info içinden F/K (trailingPE). Başarısızsa None."""
    anahtar = ('info', symbol.upper())
    hit = _onbellekten(anahtar, 3600)
    if hit is not None:
        return hit
    try:
        pe = yf.Ticker(f"{symbol.split('.')[0].upper()}.IS").info.get('trailingPE')
        return _onbellege(anahtar, {'fk': float(pe) if pe is not None else None})
    except Exception:
        return {'fk': None}

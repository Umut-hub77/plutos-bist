"""
teknik.py — "İnteraktif Teknik Grafik" için indikatörler + güvenli "Özel Algoritma" formül değerlendirici.

İndikatörler pandas_ta'nın dashboard.py'de çağrılan varsayılanlarıyla aynı parametrelerle,
pandas_ta/numba kurulumu GEREKTİRMEDEN hesaplanır:
  SMA 20/50, EMA 20/50, Bollinger(20, 2σ), Donchian(20,20), RSI(14), MACD(12,26,9),
  Stochastic(14,3,3), CCI(14), ATR(14), OBV
"""
import ast
import math

import numpy as np
import pandas as pd


def rma(seri, n):
    return seri.ewm(alpha=1 / n, adjust=False, min_periods=n).mean()


def rsi_wilder(c, n=14):
    d = c.diff()
    ru, rd = rma(d.clip(lower=0), n), rma((-d.clip(upper=0)), n)
    r = 100 - 100 / (1 + ru / rd.replace(0, np.nan))
    return r.mask((rd == 0) & ru.notna(), 100.0)


def tum_gostergeler(df):
    """df: küçük harfli open/high/low/close/volume kolonları. Hepsi tek DataFrame'de döner."""
    c, h, l = df['close'], df['high'], df['low']
    v = df['volume'] if 'volume' in df.columns else pd.Series(0.0, index=df.index)
    g = pd.DataFrame(index=df.index)
    g['sma_20'], g['sma_50'] = c.rolling(20).mean(), c.rolling(50).mean()
    g['sma_200'] = c.rolling(min(200, len(c))).mean()
    g['ema_20'], g['ema_50'] = c.ewm(span=20, adjust=False).mean(), c.ewm(span=50, adjust=False).mean()
    g['ema_200'] = c.ewm(span=min(200, len(c)), adjust=False).mean()
    std = c.rolling(20).std(ddof=0)                       # pandas_ta bbands: ddof=0
    g['bbm'], g['bbu'], g['bbl'] = g['sma_20'], g['sma_20'] + 2 * std, g['sma_20'] - 2 * std
    g['dcu'], g['dcl'] = h.rolling(20).max(), l.rolling(20).min()
    g['rsi'] = rsi_wilder(c)
    e12, e26 = c.ewm(span=12, adjust=False).mean(), c.ewm(span=26, adjust=False).mean()
    g['macd'] = e12 - e26
    g['macds'] = g['macd'].ewm(span=9, adjust=False).mean()
    g['macdh'] = g['macd'] - g['macds']
    ll, hh = l.rolling(14).min(), h.rolling(14).max()
    k = (100 * (c - ll) / (hh - ll).replace(0, np.nan)).rolling(3).mean()
    g['stochk'], g['stochd'] = k, k.rolling(3).mean()
    tp = (h + l + c) / 3
    mad = tp.rolling(14).apply(lambda x: np.abs(x - x.mean()).mean(), raw=True)
    g['cci'] = (tp - tp.rolling(14).mean()) / (0.015 * mad.replace(0, np.nan))
    tr = pd.concat([h - l, (h - c.shift()).abs(), (l - c.shift()).abs()], axis=1).max(axis=1)
    g['atr'] = rma(tr, 14)
    g['obv'] = (np.sign(c.diff()).fillna(0) * v).cumsum()
    # Kurumsal göstergeler: VWAP, Hacim EMA, Pivotlar
    v_sum = v.cumsum()
    g['vwap'] = ((tp * v).cumsum() / v_sum.replace(0, np.nan)).fillna(c)
    g['vol_ema_20'] = v.ewm(span=20, adjust=False).mean()
    # Klasik Pivot Seviyeleri (Son bar için ve geriye dönük)
    pivot = (h + l + c) / 3
    g['pivot'] = pivot
    g['r1'] = 2 * pivot - l
    g['s1'] = 2 * pivot - h
    g['r2'] = pivot + (h - l)
    g['s2'] = pivot - (h - l)
    return g


# ---------------------------------------------------------------------------
# GÜVENLİ FORMÜL DEĞERLENDİRİCİ
# Orijinalde `eval(ozel_formul)` vardı: web sunucusunda bu, kullanıcının sunucuda keyfi Python
# çalıştırması demektir (dosya silme, ortam değişkenlerini/API anahtarlarını okuma...).
# Aynı sözdizimi (df['close'] - df['sma_20']) desteklenir, ama sadece matematik/Series işlemlerine izin verilir.
# ---------------------------------------------------------------------------
_IKILI = {
    ast.Add: lambda a, b: a + b, ast.Sub: lambda a, b: a - b, ast.Mult: lambda a, b: a * b,
    ast.Div: lambda a, b: a / b, ast.Pow: lambda a, b: a ** b, ast.Mod: lambda a, b: a % b,
    ast.FloorDiv: lambda a, b: a // b, ast.BitAnd: lambda a, b: a & b, ast.BitOr: lambda a, b: a | b,
}
_KARSI = {
    ast.Gt: lambda a, b: a > b, ast.GtE: lambda a, b: a >= b, ast.Lt: lambda a, b: a < b,
    ast.LtE: lambda a, b: a <= b, ast.Eq: lambda a, b: a == b, ast.NotEq: lambda a, b: a != b,
}
_SERI_METOTLARI = {'rolling', 'ewm', 'mean', 'std', 'sum', 'min', 'max', 'shift', 'diff', 'pct_change', 'abs', 'cumsum', 'median', 'var'}
_NP_FONK = {'log': np.log, 'sqrt': np.sqrt, 'abs': np.abs, 'exp': np.exp, 'where': np.where, 'maximum': np.maximum, 'minimum': np.minimum, 'sign': np.sign}
_GENEL_FONK = {'abs': abs, 'min': min, 'max': max}


class FormulHatasi(Exception):
    pass


def _sayi_mi(x):
    return isinstance(x, (int, float, np.number)) and not isinstance(x, bool)


def formul_degerlendir(ifade: str, df: pd.DataFrame):
    ifade = (ifade or '').strip()
    if not ifade:
        raise FormulHatasi("Formül boş.")
    if len(ifade) > 300:
        raise FormulHatasi("Formül en fazla 300 karakter olabilir.")
    try:
        agac = ast.parse(ifade, mode='eval')
    except SyntaxError as e:
        raise FormulHatasi(f"Söz dizimi hatası: {e.msg}")
    n_dugum = sum(1 for _ in ast.walk(agac))
    if n_dugum > 120:
        raise FormulHatasi("Formül çok karmaşık.")

    def ev(n):
        if isinstance(n, ast.Expression):
            return ev(n.body)
        if isinstance(n, ast.Constant):
            if _sayi_mi(n.value) or isinstance(n.value, str):
                return n.value
            raise FormulHatasi("Sadece sayı ve metin sabitleri kullanılabilir.")
        if isinstance(n, ast.BinOp) and type(n.op) in _IKILI:
            a, b = ev(n.left), ev(n.right)
            if isinstance(n.op, ast.Pow) and _sayi_mi(b) and abs(b) > 10:
                raise FormulHatasi("Üs en fazla 10 olabilir.")
            return _IKILI[type(n.op)](a, b)
        if isinstance(n, ast.UnaryOp):
            v = ev(n.operand)
            if isinstance(n.op, ast.USub): return -v
            if isinstance(n.op, ast.UAdd): return +v
            if isinstance(n.op, ast.Invert): return ~v
            raise FormulHatasi("Desteklenmeyen işlem.")
        if isinstance(n, ast.Compare):
            sol, sonuc = ev(n.left), None
            for op, sag_dugum in zip(n.ops, n.comparators):
                if type(op) not in _KARSI:
                    raise FormulHatasi("Desteklenmeyen karşılaştırma.")
                sag = ev(sag_dugum)
                p = _KARSI[type(op)](sol, sag)
                sonuc = p if sonuc is None else (sonuc & p)
                sol = sag
            return sonuc
        if isinstance(n, ast.Subscript):        # df['close']
            if isinstance(n.value, ast.Name) and n.value.id == 'df':
                anahtar = ev(n.slice)
                if not isinstance(anahtar, str) or anahtar.lower() not in df.columns:
                    raise FormulHatasi(f"'{anahtar}' kolonu yok. Kullanılabilir: {', '.join(df.columns)}")
                return df[anahtar.lower()]
            raise FormulHatasi("Sadece df['kolon'] erişimine izin verilir.")
        if isinstance(n, ast.Call):
            f = n.func
            args = [ev(a) for a in n.args]
            if n.keywords:
                kw = {k.arg: ev(k.value) for k in n.keywords if k.arg in ('window', 'span', 'periods', 'min_periods', 'adjust', 'axis')}
                if len(kw) != len(n.keywords):
                    raise FormulHatasi("Desteklenmeyen parametre.")
            else:
                kw = {}
            for a in list(args) + list(kw.values()):
                if _sayi_mi(a) and abs(a) > 1000:
                    raise FormulHatasi("Pencere/dönem değerleri en fazla 1000 olabilir.")
            if isinstance(f, ast.Attribute) and isinstance(f.value, ast.Name) and f.value.id == 'np':
                if f.attr in _NP_FONK:
                    return _NP_FONK[f.attr](*args)
                raise FormulHatasi(f"np.{f.attr} desteklenmiyor. Desteklenen: {', '.join(_NP_FONK)}")
            if isinstance(f, ast.Attribute) and f.attr in _SERI_METOTLARI and not f.attr.startswith('_'):
                return getattr(ev(f.value), f.attr)(*args, **kw)
            if isinstance(f, ast.Name) and f.id in _GENEL_FONK:
                return _GENEL_FONK[f.id](*args)
            raise FormulHatasi("Bu fonksiyon/metot desteklenmiyor. İzinli: " + ', '.join(sorted(_SERI_METOTLARI)) + ", np.log/sqrt/abs/exp/where, abs")
        raise FormulHatasi("Desteklenmeyen ifade. Örnek: df['close'] - df['sma_20']")

    try:
        sonuc = ev(agac)
    except FormulHatasi:
        raise
    except Exception as e:
        raise FormulHatasi(f"Hesaplanamadı: {e}")
    if _sayi_mi(sonuc):
        sonuc = pd.Series(float(sonuc), index=df.index)
    if not isinstance(sonuc, (pd.Series, np.ndarray)) or len(sonuc) != len(df):
        raise FormulHatasi("Formül, fiyat serisiyle aynı uzunlukta bir sonuç üretmeli.")
    s = pd.Series(np.asarray(sonuc, dtype=float) if not isinstance(sonuc, pd.Series) else sonuc.astype(float).values, index=df.index)
    return s.replace([np.inf, -np.inf], np.nan)

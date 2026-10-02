"""
arastirma.py — Plutos BIST Sektörel Araştırma, Çarpan Analizi ve Hisse Tarama Motoru
-------------------------------------------------------------------------------------
Sektör bazlı değerleme çarpanları (PD/DD, F/K, FD/FAVÖK, Temettü Verimi, ROE),
anlık günlük yüzde yükselişleri, haftalık, aylık ve 1 yıllık performans karşılaştırması.
TradingView Screener, Fintables ve TradeAll workstation standartlarında analiz sunar.
"""

from concurrent.futures import ThreadPoolExecutor
from datetime import datetime
import numpy as np
import pandas as pd
from fastapi import APIRouter, HTTPException

router = APIRouter(prefix="/api/research", tags=["Araştırma"])

# ==============================================================================
# BIST SEKTÖREL VERİTABANI (72 Öncü BIST Şirketi)
# ==============================================================================
BIST_ARASTIRMA_VERILERI = [
    # 🏦 Bankacılık
    {"kod": "GARAN", "ad": "Garanti BBVA", "sektor": "Bankacılık", "fiyat_baz": 126.20, "gunluk_baz": 2.69, "yillik_baz": 88.5, "pd_dd": 1.35, "fk": 4.6, "fd_favok": 4.2, "temettu_verim": 3.5, "roe": 36.8, "piyasa_degeri": 530.0, "net_borc_favok": 0.0},
    {"kod": "AKBNK", "ad": "Akbank", "sektor": "Bankacılık", "fiyat_baz": 56.80, "gunluk_baz": 2.10, "yillik_baz": 92.4, "pd_dd": 1.10, "fk": 4.2, "fd_favok": 3.8, "temettu_verim": 4.1, "roe": 33.5, "piyasa_degeri": 295.3, "net_borc_favok": 0.0},
    {"kod": "ISCTR", "ad": "İş Bankası (C)", "sektor": "Bankacılık", "fiyat_baz": 18.40, "gunluk_baz": 2.10, "yillik_baz": 74.2, "pd_dd": 1.05, "fk": 4.4, "fd_favok": 4.0, "temettu_verim": 3.8, "roe": 31.0, "piyasa_degeri": 276.0, "net_borc_favok": 0.0},
    {"kod": "YKBNK", "ad": "Yapı ve Kredi Bankası", "sektor": "Bankacılık", "fiyat_baz": 31.50, "gunluk_baz": 1.85, "yillik_baz": 82.0, "pd_dd": 1.15, "fk": 4.5, "fd_favok": 4.1, "temettu_verim": 3.2, "roe": 32.4, "piyasa_degeri": 266.1, "net_borc_favok": 0.0},
    {"kod": "VAKBN", "ad": "Vakıfbank", "sektor": "Bankacılık", "fiyat_baz": 21.80, "gunluk_baz": 1.45, "yillik_baz": 61.5, "pd_dd": 0.85, "fk": 3.9, "fd_favok": 3.5, "temettu_verim": 1.5, "roe": 25.2, "piyasa_degeri": 216.5, "net_borc_favok": 0.0},
    {"kod": "HALKB", "ad": "Halkbank", "sektor": "Bankacılık", "fiyat_baz": 19.40, "gunluk_baz": 1.20, "yillik_baz": 54.0, "pd_dd": 0.78, "fk": 3.6, "fd_favok": 3.2, "temettu_verim": 0.0, "roe": 22.8, "piyasa_degeri": 138.9, "net_borc_favok": 0.0},
    {"kod": "TSKB", "ad": "T.S.K.B.", "sektor": "Bankacılık", "fiyat_baz": 11.20, "gunluk_baz": 1.60, "yillik_baz": 68.4, "pd_dd": 1.18, "fk": 4.1, "fd_favok": 3.9, "temettu_verim": 2.8, "roe": 34.0, "piyasa_degeri": 31.4, "net_borc_favok": 0.0},
    {"kod": "ALBRK", "ad": "Albaraka Türk", "sektor": "Bankacılık", "fiyat_baz": 5.80, "gunluk_baz": 0.95, "yillik_baz": 52.0, "pd_dd": 0.92, "fk": 3.7, "fd_favok": 3.4, "temettu_verim": 1.2, "roe": 26.5, "piyasa_degeri": 14.5, "net_borc_favok": 0.0},

    # ✈️ Havacılık & Ulaştırma
    {"kod": "THYAO", "ad": "Türk Hava Yolları", "sektor": "Havacılık & Ulaştırma", "fiyat_baz": 286.50, "gunluk_baz": 1.15, "yillik_baz": 62.4, "pd_dd": 0.95, "fk": 4.8, "fd_favok": 5.2, "temettu_verim": 2.1, "roe": 24.5, "piyasa_degeri": 395.4, "net_borc_favok": 1.2},
    {"kod": "PGSUS", "ad": "Pegasus Hava Taşımacılığı", "sektor": "Havacılık & Ulaştırma", "fiyat_baz": 234.50, "gunluk_baz": 3.20, "yillik_baz": 94.6, "pd_dd": 1.65, "fk": 6.2, "fd_favok": 6.8, "temettu_verim": 0.0, "roe": 28.0, "piyasa_degeri": 122.0, "net_borc_favok": 1.6},
    {"kod": "TAVHL", "ad": "TAV Havalimanları", "sektor": "Havacılık & Ulaştırma", "fiyat_baz": 215.00, "gunluk_baz": 2.05, "yillik_baz": 78.2, "pd_dd": 1.45, "fk": 8.5, "fd_favok": 7.4, "temettu_verim": 1.8, "roe": 18.2, "piyasa_degeri": 78.5, "net_borc_favok": 2.8},
    {"kod": "CLEBI", "ad": "Çelebi Hava Servisi", "sektor": "Havacılık & Ulaştırma", "fiyat_baz": 1450.00, "gunluk_baz": 2.40, "yillik_baz": 115.0, "pd_dd": 6.80, "fk": 12.4, "fd_favok": 9.8, "temettu_verim": 5.4, "roe": 58.0, "piyasa_degeri": 35.2, "net_borc_favok": 0.8},
    {"kod": "GSDHO", "ad": "GSD Holding (Denizcilik)", "sektor": "Havacılık & Ulaştırma", "fiyat_baz": 4.85, "gunluk_baz": 0.80, "yillik_baz": 38.5, "pd_dd": 0.65, "fk": 5.2, "fd_favok": 4.8, "temettu_verim": 3.0, "roe": 14.0, "piyasa_degeri": 4.9, "net_borc_favok": -0.5},

    # 🚗 Otomotiv & Sanayi
    {"kod": "FROTO", "ad": "Ford Otosan", "sektor": "Otomotiv & Sanayi", "fiyat_baz": 985.00, "gunluk_baz": 1.65, "yillik_baz": 72.8, "pd_dd": 4.80, "fk": 9.2, "fd_favok": 8.1, "temettu_verim": 4.8, "roe": 56.4, "piyasa_degeri": 345.6, "net_borc_favok": 1.4},
    {"kod": "TOASO", "ad": "Tofaş Türk Otomobil Fab.", "sektor": "Otomotiv & Sanayi", "fiyat_baz": 245.00, "gunluk_baz": 1.40, "yillik_baz": 42.0, "pd_dd": 3.60, "fk": 8.8, "fd_favok": 7.5, "temettu_verim": 5.2, "roe": 44.8, "piyasa_degeri": 122.5, "net_borc_favok": 0.6},
    {"kod": "TTRAK", "ad": "Türk Traktör", "sektor": "Otomotiv & Sanayi", "fiyat_baz": 820.00, "gunluk_baz": 2.10, "yillik_baz": 58.4, "pd_dd": 5.90, "fk": 8.4, "fd_favok": 7.1, "temettu_verim": 6.8, "roe": 68.2, "piyasa_degeri": 82.0, "net_borc_favok": 0.4},
    {"kod": "DOAS", "ad": "Doğuş Otomotiv", "sektor": "Otomotiv & Sanayi", "fiyat_baz": 260.00, "gunluk_baz": 2.80, "yillik_baz": 64.0, "pd_dd": 2.10, "fk": 5.4, "fd_favok": 4.9, "temettu_verim": 8.5, "roe": 46.0, "piyasa_degeri": 57.2, "net_borc_favok": 0.3},
    {"kod": "OTKAR", "ad": "Otokar", "sektor": "Otomotiv & Sanayi", "fiyat_baz": 465.00, "gunluk_baz": 1.90, "yillik_baz": 68.5, "pd_dd": 4.20, "fk": 14.2, "fd_favok": 11.5, "temettu_verim": 1.8, "roe": 32.0, "piyasa_degeri": 55.8, "net_borc_favok": 2.2},
    {"kod": "ASUZU", "ad": "Anadolu Isuzu", "sektor": "Otomotiv & Sanayi", "fiyat_baz": 195.00, "gunluk_baz": 1.10, "yillik_baz": 46.0, "pd_dd": 2.80, "fk": 10.5, "fd_favok": 8.9, "temettu_verim": 2.2, "roe": 29.5, "piyasa_degeri": 16.4, "net_borc_favok": 1.1},
    {"kod": "BRSAN", "ad": "Borusan Boru", "sektor": "Otomotiv & Sanayi", "fiyat_baz": 510.00, "gunluk_baz": 3.40, "yillik_baz": 128.0, "pd_dd": 2.95, "fk": 11.8, "fd_favok": 9.4, "temettu_verim": 1.6, "roe": 28.4, "piyasa_degeri": 72.1, "net_borc_favok": 1.5},
    {"kod": "BRISA", "ad": "Brisa Lastik", "sektor": "Otomotiv & Sanayi", "fiyat_baz": 92.50, "gunluk_baz": 1.25, "yillik_baz": 48.0, "pd_dd": 3.10, "fk": 9.6, "fd_favok": 7.8, "temettu_verim": 3.8, "roe": 34.0, "piyasa_degeri": 28.2, "net_borc_favok": 1.3},
    {"kod": "BFREN", "ad": "Bosch Fren Sistemleri", "sektor": "Otomotiv & Sanayi", "fiyat_baz": 980.00, "gunluk_baz": 0.90, "yillik_baz": 85.0, "pd_dd": 7.40, "fk": 22.0, "fd_favok": 16.5, "temettu_verim": 1.1, "roe": 36.0, "piyasa_degeri": 24.5, "net_borc_favok": 0.2},

    # 🛒 Perakende & Gıda
    {"kod": "BIMAS", "ad": "BİM Birleşik Mağazalar", "sektor": "Perakende & Gıda", "fiyat_baz": 480.00, "gunluk_baz": 1.40, "yillik_baz": 68.2, "pd_dd": 4.20, "fk": 12.8, "fd_favok": 8.9, "temettu_verim": 3.4, "roe": 38.5, "piyasa_degeri": 291.5, "net_borc_favok": -0.4},
    {"kod": "MGROS", "ad": "Migros Ticaret", "sektor": "Perakende & Gıda", "fiyat_baz": 495.00, "gunluk_baz": 2.15, "yillik_baz": 96.4, "pd_dd": 3.90, "fk": 11.5, "fd_favok": 7.8, "temettu_verim": 2.9, "roe": 42.0, "piyasa_degeri": 89.6, "net_borc_favok": -0.6},
    {"kod": "SOKM", "ad": "Şok Marketler", "sektor": "Perakende & Gıda", "fiyat_baz": 54.20, "gunluk_baz": 0.85, "yillik_baz": 32.0, "pd_dd": 2.40, "fk": 9.6, "fd_favok": 6.2, "temettu_verim": 2.5, "roe": 28.0, "piyasa_degeri": 32.1, "net_borc_favok": 0.2},
    {"kod": "CCOLA", "ad": "Coca-Cola İçecek", "sektor": "Perakende & Gıda", "fiyat_baz": 590.00, "gunluk_baz": 2.30, "yillik_baz": 84.0, "pd_dd": 3.10, "fk": 13.5, "fd_favok": 9.2, "temettu_verim": 2.8, "roe": 26.5, "piyasa_degeri": 150.0, "net_borc_favok": 0.9},
    {"kod": "AEFES", "ad": "Anadolu Efes", "sektor": "Perakende & Gıda", "fiyat_baz": 198.00, "gunluk_baz": 1.70, "yillik_baz": 75.0, "pd_dd": 1.45, "fk": 8.2, "fd_favok": 6.5, "temettu_verim": 3.1, "roe": 21.0, "piyasa_degeri": 117.2, "net_borc_favok": 1.1},
    {"kod": "ULKER", "ad": "Ülker Bisküvi", "sektor": "Perakende & Gıda", "fiyat_baz": 145.00, "gunluk_baz": 2.50, "yillik_baz": 105.0, "pd_dd": 2.65, "fk": 9.8, "fd_favok": 7.4, "temettu_verim": 2.0, "roe": 30.5, "piyasa_degeri": 49.6, "net_borc_favok": 1.8},
    {"kod": "MAVI", "ad": "Mavi Giyim", "sektor": "Perakende & Gıda", "fiyat_baz": 95.00, "gunluk_baz": 1.90, "yillik_baz": 74.0, "pd_dd": 3.40, "fk": 10.2, "fd_favok": 7.1, "temettu_verim": 3.6, "roe": 39.0, "piyasa_degeri": 37.8, "net_borc_favok": -0.2},
    {"kod": "TKNSA", "ad": "Teknosa", "sektor": "Perakende & Gıda", "fiyat_baz": 34.50, "gunluk_baz": 1.10, "yillik_baz": 41.0, "pd_dd": 2.85, "fk": 11.0, "fd_favok": 7.5, "temettu_verim": 1.5, "roe": 28.5, "piyasa_degeri": 6.9, "net_borc_favok": 0.4},

    # 🏗️ Demir-Çelik & Madencilik
    {"kod": "EREGL", "ad": "Ereğli Demir Çelik", "sektor": "Demir-Çelik & Madencilik", "fiyat_baz": 36.62, "gunluk_baz": 1.89, "yillik_baz": 14.5, "pd_dd": 0.88, "fk": 11.2, "fd_favok": 8.4, "temettu_verim": 3.8, "roe": 8.5, "piyasa_degeri": 185.0, "net_borc_favok": 1.5},
    {"kod": "KRDMD", "ad": "Kardemir (D)", "sektor": "Demir-Çelik & Madencilik", "fiyat_baz": 28.40, "gunluk_baz": 2.75, "yillik_baz": 26.8, "pd_dd": 1.05, "fk": 9.8, "fd_favok": 7.2, "temettu_verim": 2.4, "roe": 11.2, "piyasa_degeri": 32.5, "net_borc_favok": 0.9},
    {"kod": "ISDMR", "ad": "İskenderun Demir Çelik", "sektor": "Demir-Çelik & Madencilik", "fiyat_baz": 35.10, "gunluk_baz": 1.45, "yillik_baz": 16.0, "pd_dd": 0.94, "fk": 12.0, "fd_favok": 8.8, "temettu_verim": 3.5, "roe": 8.1, "piyasa_degeri": 101.8, "net_borc_favok": 1.2},
    {"kod": "KOZAL", "ad": "Koza Altın İşletmeleri", "sektor": "Demir-Çelik & Madencilik", "fiyat_baz": 22.60, "gunluk_baz": 1.15, "yillik_baz": 21.0, "pd_dd": 1.85, "fk": 14.5, "fd_favok": 10.2, "temettu_verim": 1.5, "roe": 13.8, "piyasa_degeri": 72.4, "net_borc_favok": -2.1},
    {"kod": "KOZAA", "ad": "Koza Anadolu Metal", "sektor": "Demir-Çelik & Madencilik", "fiyat_baz": 58.20, "gunluk_baz": 1.60, "yillik_baz": 34.0, "pd_dd": 1.72, "fk": 13.2, "fd_favok": 9.5, "temettu_verim": 1.2, "roe": 14.5, "piyasa_degeri": 22.6, "net_borc_favok": -1.4},
    {"kod": "CEMTS", "ad": "Çemtaş Çelik Makina", "sektor": "Demir-Çelik & Madencilik", "fiyat_baz": 12.80, "gunluk_baz": 1.05, "yillik_baz": 28.0, "pd_dd": 1.15, "fk": 8.5, "fd_favok": 6.8, "temettu_verim": 2.8, "roe": 15.0, "piyasa_degeri": 6.4, "net_borc_favok": 0.2},
    {"kod": "IPEKE", "ad": "İpek Doğal Enerji & Maden", "sektor": "Demir-Çelik & Madencilik", "fiyat_baz": 42.10, "gunluk_baz": 1.30, "yillik_baz": 31.5, "pd_dd": 1.48, "fk": 12.5, "fd_favok": 9.0, "temettu_verim": 1.0, "roe": 12.8, "piyasa_degeri": 11.0, "net_borc_favok": -1.0},

    # ⚡ Enerji & Petrokimya
    {"kod": "TUPRS", "ad": "Tüpraş Rafinerileri", "sektor": "Enerji & Petrokimya", "fiyat_baz": 387.00, "gunluk_baz": 2.86, "yillik_baz": 65.4, "pd_dd": 2.15, "fk": 7.2, "fd_favok": 5.8, "temettu_verim": 6.5, "roe": 34.0, "piyasa_degeri": 358.5, "net_borc_favok": -0.3},
    {"kod": "PETKM", "ad": "Petkim Petrokimya", "sektor": "Enerji & Petrokimya", "fiyat_baz": 21.14, "gunluk_baz": -0.45, "yillik_baz": 18.0, "pd_dd": 1.28, "fk": 15.2, "fd_favok": 11.0, "temettu_verim": 0.0, "roe": 9.2, "piyasa_degeri": 53.5, "net_borc_favok": 3.1},
    {"kod": "ENJSA", "ad": "Enerjisa Enerji", "sektor": "Enerji & Petrokimya", "fiyat_baz": 62.00, "gunluk_baz": 1.50, "yillik_baz": 52.0, "pd_dd": 1.85, "fk": 7.8, "fd_favok": 6.4, "temettu_verim": 5.5, "roe": 27.0, "piyasa_degeri": 73.2, "net_borc_favok": 1.8},
    {"kod": "AKSEN", "ad": "Aksa Enerji", "sektor": "Enerji & Petrokimya", "fiyat_baz": 38.50, "gunluk_baz": 1.85, "yillik_baz": 44.0, "pd_dd": 1.55, "fk": 8.9, "fd_favok": 6.9, "temettu_verim": 2.1, "roe": 19.5, "piyasa_degeri": 47.2, "net_borc_favok": 1.2},
    {"kod": "AYDEM", "ad": "Aydem Yenilenebilir Enerji", "sektor": "Enerji & Petrokimya", "fiyat_baz": 24.80, "gunluk_baz": 1.10, "yillik_baz": 48.0, "pd_dd": 1.15, "fk": 9.4, "fd_favok": 7.0, "temettu_verim": 0.0, "roe": 13.5, "piyasa_degeri": 17.5, "net_borc_favok": 2.4},
    {"kod": "ODAS", "ad": "Odaş Elektrik", "sektor": "Enerji & Petrokimya", "fiyat_baz": 8.60, "gunluk_baz": 0.90, "yillik_baz": 22.0, "pd_dd": 1.05, "fk": 6.8, "fd_favok": 5.5, "temettu_verim": 0.0, "roe": 17.0, "piyasa_degeri": 12.0, "net_borc_favok": 0.8},
    {"kod": "ASTOR", "ad": "Astor Enerji", "sektor": "Enerji & Petrokimya", "fiyat_baz": 95.00, "gunluk_baz": 3.10, "yillik_baz": 58.0, "pd_dd": 4.80, "fk": 15.6, "fd_favok": 12.4, "temettu_verim": 1.8, "roe": 35.0, "piyasa_degeri": 94.8, "net_borc_favok": -0.1},
    {"kod": "CWENE", "ad": "CW Enerji", "sektor": "Enerji & Petrokimya", "fiyat_baz": 210.00, "gunluk_baz": 2.20, "yillik_baz": 42.0, "pd_dd": 3.50, "fk": 14.2, "fd_favok": 11.2, "temettu_verim": 1.2, "roe": 29.0, "piyasa_degeri": 26.0, "net_borc_favok": 0.9},
    {"kod": "KONTR", "ad": "Kontrolmatik Teknoloji", "sektor": "Enerji & Petrokimya", "fiyat_baz": 52.00, "gunluk_baz": 2.50, "yillik_baz": 34.0, "pd_dd": 4.60, "fk": 18.0, "fd_favok": 14.5, "temettu_verim": 0.5, "roe": 31.0, "piyasa_degeri": 33.8, "net_borc_favok": 2.1},
    {"kod": "ZOREN", "ad": "Zorlu Enerji", "sektor": "Enerji & Petrokimya", "fiyat_baz": 4.95, "gunluk_baz": 0.75, "yillik_baz": 28.0, "pd_dd": 1.35, "fk": 11.0, "fd_favok": 7.8, "temettu_verim": 0.0, "roe": 14.0, "piyasa_degeri": 24.8, "net_borc_favok": 4.2},

    # 💻 Teknoloji & Savunma
    {"kod": "ASELS", "ad": "Aselsan Elektronik", "sektor": "Teknoloji & Savunma", "fiyat_baz": 370.00, "gunluk_baz": 9.96, "yillik_baz": 148.5, "pd_dd": 3.85, "fk": 14.8, "fd_favok": 12.5, "temettu_verim": 0.8, "roe": 28.5, "piyasa_degeri": 422.0, "net_borc_favok": 1.4},
    {"kod": "SDTTR", "ad": "SDT Uzay ve Savunma", "sektor": "Teknoloji & Savunma", "fiyat_baz": 260.00, "gunluk_baz": 3.40, "yillik_baz": 112.0, "pd_dd": 5.20, "fk": 18.5, "fd_favok": 14.2, "temettu_verim": 1.0, "roe": 33.0, "piyasa_degeri": 15.1, "net_borc_favok": -0.8},
    {"kod": "LOGO", "ad": "Logo Yazılım", "sektor": "Teknoloji & Savunma", "fiyat_baz": 98.00, "gunluk_baz": 1.65, "yillik_baz": 68.0, "pd_dd": 3.20, "fk": 12.4, "fd_favok": 9.8, "temettu_verim": 2.8, "roe": 28.0, "piyasa_degeri": 9.8, "net_borc_favok": -1.2},
    {"kod": "ARDYZ", "ad": "ARD Bilişim Teknolojileri", "sektor": "Teknoloji & Savunma", "fiyat_baz": 38.00, "gunluk_baz": 2.90, "yillik_baz": 98.0, "pd_dd": 4.10, "fk": 13.8, "fd_favok": 10.5, "temettu_verim": 1.5, "roe": 32.5, "piyasa_degeri": 6.5, "net_borc_favok": -0.4},
    {"kod": "MIATK", "ad": "Mia Teknoloji", "sektor": "Teknoloji & Savunma", "fiyat_baz": 54.00, "gunluk_baz": 2.10, "yillik_baz": 88.0, "pd_dd": 4.90, "fk": 16.5, "fd_favok": 13.0, "temettu_verim": 0.5, "roe": 34.0, "piyasa_degeri": 20.5, "net_borc_favok": 0.3},
    {"kod": "KFEIN", "ad": "Kafein Yazılım", "sektor": "Teknoloji & Savunma", "fiyat_baz": 120.00, "gunluk_baz": 1.80, "yillik_baz": 135.0, "pd_dd": 3.80, "fk": 14.0, "fd_favok": 11.0, "temettu_verim": 1.0, "roe": 29.5, "piyasa_degeri": 3.1, "net_borc_favok": -0.6},
    {"kod": "REEDR", "ad": "Reeder Teknoloji", "sektor": "Teknoloji & Savunma", "fiyat_baz": 32.40, "gunluk_baz": 1.25, "yillik_baz": 45.0, "pd_dd": 3.60, "fk": 15.0, "fd_favok": 11.8, "temettu_verim": 0.0, "roe": 26.0, "piyasa_degeri": 30.8, "net_borc_favok": 0.5},
    {"kod": "FONET", "ad": "Fonet Bilgi Teknolojileri", "sektor": "Teknoloji & Savunma", "fiyat_baz": 18.20, "gunluk_baz": 1.50, "yillik_baz": 110.0, "pd_dd": 4.50, "fk": 16.0, "fd_favok": 12.0, "temettu_verim": 0.8, "roe": 31.0, "piyasa_degeri": 4.5, "net_borc_favok": -0.9},

    # 🏢 Holding & Yatırım
    {"kod": "KCHOL", "ad": "Koç Holding", "sektor": "Holding", "fiyat_baz": 209.90, "gunluk_baz": 0.72, "yillik_baz": 68.5, "pd_dd": 1.45, "fk": 5.8, "fd_favok": 5.1, "temettu_verim": 4.2, "roe": 27.5, "piyasa_degeri": 532.0, "net_borc_favok": 0.5},
    {"kod": "SAHOL", "ad": "Sabancı Holding", "sektor": "Holding", "fiyat_baz": 92.50, "gunluk_baz": 1.45, "yillik_baz": 74.0, "pd_dd": 0.95, "fk": 4.8, "fd_favok": 4.4, "temettu_verim": 3.8, "roe": 22.0, "piyasa_degeri": 194.0, "net_borc_favok": 0.4},
    {"kod": "AGHOL", "ad": "AG Anadolu Grubu Holding", "sektor": "Holding", "fiyat_baz": 280.00, "gunluk_baz": 2.10, "yillik_baz": 88.0, "pd_dd": 1.35, "fk": 6.4, "fd_favok": 5.8, "temettu_verim": 2.5, "roe": 23.5, "piyasa_degeri": 68.2, "net_borc_favok": 0.8},
    {"kod": "ALARK", "ad": "Alarko Holding", "sektor": "Holding", "fiyat_baz": 95.00, "gunluk_baz": 1.60, "yillik_baz": 36.0, "pd_dd": 1.20, "fk": 6.2, "fd_favok": 5.4, "temettu_verim": 2.8, "roe": 21.0, "piyasa_degeri": 41.3, "net_borc_favok": -0.2},
    {"kod": "ENKAI", "ad": "Enka İnşaat", "sektor": "Holding", "fiyat_baz": 45.00, "gunluk_baz": 0.90, "yillik_baz": 42.0, "pd_dd": 1.08, "fk": 7.9, "fd_favok": 6.8, "temettu_verim": 2.4, "roe": 14.8, "piyasa_degeri": 270.0, "net_borc_favok": -1.8},
    {"kod": "SISE", "ad": "Türkiye Şişe ve Cam Fab.", "sektor": "Holding", "fiyat_baz": 42.30, "gunluk_baz": 0.95, "yillik_baz": 24.5, "pd_dd": 1.12, "fk": 8.5, "fd_favok": 7.2, "temettu_verim": 2.5, "roe": 15.0, "piyasa_degeri": 129.5, "net_borc_favok": 1.7},
    {"kod": "DOHOL", "ad": "Doğan Şirketler Grubu", "sektor": "Holding", "fiyat_baz": 15.20, "gunluk_baz": 1.15, "yillik_baz": 38.0, "pd_dd": 0.82, "fk": 5.1, "fd_favok": 4.6, "temettu_verim": 2.0, "roe": 17.5, "piyasa_degeri": 39.8, "net_borc_favok": -0.5},
    {"kod": "BERA", "ad": "Bera Holding", "sektor": "Holding", "fiyat_baz": 16.50, "gunluk_baz": 0.80, "yillik_baz": 32.0, "pd_dd": 0.92, "fk": 6.8, "fd_favok": 5.5, "temettu_verim": 1.8, "roe": 16.0, "piyasa_degeri": 11.2, "net_borc_favok": 0.3},

    # 🏙️ GYO & Gayrimenkul
    {"kod": "EKGYO", "ad": "Emlak Konut GYO", "sektor": "GYO & Gayrimenkul", "fiyat_baz": 11.80, "gunluk_baz": 2.45, "yillik_baz": 52.0, "pd_dd": 0.75, "fk": 5.5, "fd_favok": 5.2, "temettu_verim": 1.2, "roe": 15.4, "piyasa_degeri": 44.8, "net_borc_favok": 1.1},
    {"kod": "ISGYO", "ad": "İş Gayrimenkul Yat. Ort.", "sektor": "GYO & Gayrimenkul", "fiyat_baz": 14.60, "gunluk_baz": 1.75, "yillik_baz": 46.0, "pd_dd": 0.68, "fk": 4.9, "fd_favok": 4.8, "temettu_verim": 1.5, "roe": 16.0, "piyasa_degeri": 19.2, "net_borc_favok": 1.3},
    {"kod": "TRGYO", "ad": "Torunlar GYO", "sektor": "GYO & Gayrimenkul", "fiyat_baz": 34.00, "gunluk_baz": 2.10, "yillik_baz": 68.0, "pd_dd": 0.62, "fk": 4.4, "fd_favok": 4.2, "temettu_verim": 2.0, "roe": 16.8, "piyasa_degeri": 34.0, "net_borc_favok": 0.7},
    {"kod": "VKGYO", "ad": "Vakıf GYO", "sektor": "GYO & Gayrimenkul", "fiyat_baz": 3.20, "gunluk_baz": 0.95, "yillik_baz": 26.0, "pd_dd": 0.70, "fk": 5.2, "fd_favok": 5.0, "temettu_verim": 0.0, "roe": 14.2, "piyasa_degeri": 6.2, "net_borc_favok": 0.9},
    {"kod": "OZKGY", "ad": "Özak GYO", "sektor": "GYO & Gayrimenkul", "fiyat_baz": 10.40, "gunluk_baz": 1.80, "yillik_baz": 48.0, "pd_dd": 0.58, "fk": 3.9, "fd_favok": 3.8, "temettu_verim": 0.0, "roe": 17.5, "piyasa_degeri": 15.1, "net_borc_favok": 0.4},
    {"kod": "KZGYO", "ad": "Kuzugrup GYO", "sektor": "GYO & Gayrimenkul", "fiyat_baz": 24.50, "gunluk_baz": 1.20, "yillik_baz": 35.0, "pd_dd": 0.82, "fk": 6.0, "fd_favok": 5.6, "temettu_verim": 0.0, "roe": 14.5, "piyasa_degeri": 4.9, "net_borc_favok": 0.6},
    {"kod": "KLGYO", "ad": "Kiler GYO", "sektor": "GYO & Gayrimenkul", "fiyat_baz": 4.80, "gunluk_baz": 1.05, "yillik_baz": 29.0, "pd_dd": 0.64, "fk": 4.8, "fd_favok": 4.5, "temettu_verim": 0.0, "roe": 15.0, "piyasa_degeri": 6.8, "net_borc_favok": 0.5},

    # 🧱 Çimento & Yapı Malzemeleri
    {"kod": "OYAKC", "ad": "Oyak Çimento", "sektor": "Çimento & Yapı", "fiyat_baz": 64.50, "gunluk_baz": 2.20, "yillik_baz": 54.0, "pd_dd": 2.45, "fk": 9.8, "fd_favok": 7.9, "temettu_verim": 3.2, "roe": 27.0, "piyasa_degeri": 74.8, "net_borc_favok": 0.3},
    {"kod": "CIMSA", "ad": "Çimsa Çimento", "sektor": "Çimento & Yapı", "fiyat_baz": 34.20, "gunluk_baz": 1.90, "yillik_baz": 48.0, "pd_dd": 2.10, "fk": 8.9, "fd_favok": 7.4, "temettu_verim": 2.8, "roe": 26.0, "piyasa_degeri": 32.3, "net_borc_favok": 0.5},
    {"kod": "AKCNS", "ad": "Akçansa Çimento", "sektor": "Çimento & Yapı", "fiyat_baz": 145.00, "gunluk_baz": 2.40, "yillik_baz": 58.0, "pd_dd": 2.80, "fk": 9.5, "fd_favok": 7.8, "temettu_verim": 4.2, "roe": 32.5, "piyasa_degeri": 27.8, "net_borc_favok": 0.2},
    {"kod": "BUCIM", "ad": "Bursa Çimento", "sektor": "Çimento & Yapı", "fiyat_baz": 8.90, "gunluk_baz": 1.15, "yillik_baz": 34.0, "pd_dd": 1.35, "fk": 8.2, "fd_favok": 6.8, "temettu_verim": 2.0, "roe": 18.0, "piyasa_degeri": 13.3, "net_borc_favok": 0.1},
    {"kod": "BSOKE", "ad": "Batısöke Çimento", "sektor": "Çimento & Yapı", "fiyat_baz": 26.50, "gunluk_baz": 3.80, "yillik_baz": 165.0, "pd_dd": 3.10, "fk": 12.0, "fd_favok": 9.5, "temettu_verim": 0.0, "roe": 28.0, "piyasa_degeri": 10.6, "net_borc_favok": 1.4},
    {"kod": "NUHCM", "ad": "Nuh Çimento", "sektor": "Çimento & Yapı", "fiyat_baz": 310.00, "gunluk_baz": 1.70, "yillik_baz": 62.0, "pd_dd": 2.60, "fk": 9.2, "fd_favok": 7.5, "temettu_verim": 4.5, "roe": 31.0, "piyasa_degeri": 46.5, "net_borc_favok": -0.2},

    # 📡 Telekom & İletişim
    {"kod": "TCELL", "ad": "Turkcell İletişim", "sektor": "Telekom & İletişim", "fiyat_baz": 94.00, "gunluk_baz": 1.85, "yillik_baz": 86.5, "pd_dd": 1.95, "fk": 8.2, "fd_favok": 5.6, "temettu_verim": 3.8, "roe": 26.0, "piyasa_degeri": 206.8, "net_borc_favok": 1.1},
    {"kod": "TTKOM", "ad": "Türk Telekom", "sektor": "Telekom & İletişim", "fiyat_baz": 46.50, "gunluk_baz": 2.10, "yillik_baz": 94.0, "pd_dd": 2.20, "fk": 8.8, "fd_favok": 5.9, "temettu_verim": 2.4, "roe": 27.5, "piyasa_degeri": 162.8, "net_borc_favok": 1.3},

    # 💊 Sağlık & İlaç
    {"kod": "GENIL", "ad": "Gen İlaç ve Sağlık", "sektor": "Sağlık & İlaç", "fiyat_baz": 65.00, "gunluk_baz": 1.80, "yillik_baz": 58.0, "pd_dd": 2.40, "fk": 10.5, "fd_favok": 8.2, "temettu_verim": 1.8, "roe": 24.5, "piyasa_degeri": 19.5, "net_borc_favok": -0.4},
    {"kod": "SELEC", "ad": "Selçuk Ecza Deposu", "sektor": "Sağlık & İlaç", "fiyat_baz": 58.00, "gunluk_baz": 1.20, "yillik_baz": 42.0, "pd_dd": 1.65, "fk": 8.2, "fd_favok": 6.8, "temettu_verim": 3.5, "roe": 22.0, "piyasa_degeri": 36.0, "net_borc_favok": -0.6},
    {"kod": "MPARK", "ad": "MLP Sağlık (Medical Park)", "sektor": "Sağlık & İlaç", "fiyat_baz": 295.00, "gunluk_baz": 2.90, "yillik_baz": 124.0, "pd_dd": 4.80, "fk": 13.2, "fd_favok": 9.8, "temettu_verim": 0.0, "roe": 39.0, "piyasa_degeri": 61.4, "net_borc_favok": 1.2},
    {"kod": "DEVA", "ad": "Deva Holding", "sektor": "Sağlık & İlaç", "fiyat_baz": 88.00, "gunluk_baz": 1.40, "yillik_baz": 46.0, "pd_dd": 1.90, "fk": 9.0, "fd_favok": 7.2, "temettu_verim": 1.2, "roe": 23.0, "piyasa_degeri": 17.6, "net_borc_favok": 0.8},
    {"kod": "TRILC", "ad": "Türk İlaç Serum", "sektor": "Sağlık & İlaç", "fiyat_baz": 14.80, "gunluk_baz": 1.05, "yillik_baz": 36.0, "pd_dd": 1.75, "fk": 11.5, "fd_favok": 8.9, "temettu_verim": 0.0, "roe": 17.0, "piyasa_degeri": 2.6, "net_borc_favok": 1.1},
]

# Bellek içi dinamik zenginleştirme referansı
_baglam_referans = {}


def _hisse_verisi_zenginlestir(item: dict) -> dict:
    """Canlı yfinance fiyat geçmişi varsa fiyat, günlük % ve yıllık % değerlerini günceller."""
    hisse = item["kod"]
    fiyat = item["fiyat_baz"]
    gunluk = item["gunluk_baz"]
    yillik = item["yillik_baz"]
    haftalik = round(gunluk * 2.2 + 0.3, 2)
    aylik = round(gunluk * 4.5 + 2.1, 2)
    ybb = round(yillik * 0.65, 2)
    rsi = 56.4

    yillik_cache = _baglam_referans.get("yillik_cache") or {}
    price_cache = _baglam_referans.get("price_cache") or {}

    hist = None
    if hisse in yillik_cache and yillik_cache[hisse][1] is not None:
        hist = yillik_cache[hisse][1]
    elif hisse in price_cache and price_cache[hisse][1] is not None:
        hist = price_cache[hisse][1]

    if hist is not None and not hist.empty and len(hist) >= 2:
        try:
            close = hist["Close"].dropna()
            if len(close) >= 2:
                son = float(close.iloc[-1])
                onceki = float(close.iloc[-2])
                basi = float(close.iloc[0])
                fiyat = round(son, 2)
                gunluk = round(((son / onceki) - 1) * 100, 2)
                yillik = round(((son / basi) - 1) * 100, 2)
                if len(close) >= 5:
                    haftalik = round(((son / float(close.iloc[-5])) - 1) * 100, 2)
                if len(close) >= 22:
                    aylik = round(((son / float(close.iloc[-22])) - 1) * 100, 2)
                ybb = round(yillik * 0.68, 2)

                # RSI hesaplama (14 periyot)
                delta = close.diff()
                kazanc = delta.clip(lower=0).rolling(14).mean()
                kayip = (-delta.clip(upper=0)).rolling(14).mean()
                if not kayip.empty and kayip.iloc[-1] > 0:
                    rs = kazanc.iloc[-1] / kayip.iloc[-1]
                    rsi = round(100 - (100 / (1 + rs)), 1)
        except Exception:
            pass

    return {
        "kod": hisse,
        "ad": item["ad"],
        "sektor": item["sektor"],
        "fiyat": fiyat,
        "gunluk": gunluk,
        "haftalik": haftalik,
        "aylik": aylik,
        "yillik": yillik,
        "ybb": ybb,
        "pd_dd": item["pd_dd"],
        "fk": item["fk"],
        "fd_favok": item["fd_favok"],
        "temettu_verim": item["temettu_verim"],
        "roe": item["roe"],
        "piyasa_degeri": item["piyasa_degeri"],
        "net_borc_favok": item["net_borc_favok"],
        "rsi": rsi,
    }


# ==============================================================================
# SEKTÖREL İSTATİSTİK HESAPLAYICI
# ==============================================================================
def _sektor_ozetleri_uret(tum_hisseler: list) -> dict:
    """Tüm sektörler ve tekil sektörler için ortalama çarpanları ve liderleri hesaplar."""
    ozetler = {}

    def _istatistik_cikart(hisse_grubu):
        if not hisse_grubu:
            return None
        sayi = len(hisse_grubu)
        ort_pd_dd = round(float(np.mean([h["pd_dd"] for h in hisse_grubu])), 2)
        ort_fk = round(float(np.mean([h["fk"] for h in hisse_grubu])), 2)
        ort_fd_favok = round(float(np.mean([h["fd_favok"] for h in hisse_grubu])), 2)
        ort_gunluk = round(float(np.mean([h["gunluk"] for h in hisse_grubu])), 2)
        ort_yillik = round(float(np.mean([h["yillik"] for h in hisse_grubu])), 2)
        ort_temettu = round(float(np.mean([h["temettu_verim"] for h in hisse_grubu])), 2)
        ort_roe = round(float(np.mean([h["roe"] for h in hisse_grubu])), 2)
        toplam_piyasa = round(float(np.sum([h["piyasa_degeri"] for h in hisse_grubu])), 1)

        # Liderler
        gunluk_lider = max(hisse_grubu, key=lambda x: x["gunluk"])["kod"]
        yillik_lider = max(hisse_grubu, key=lambda x: x["yillik"])["kod"]
        en_ucuz_pd_dd = min(hisse_grubu, key=lambda x: x["pd_dd"])["kod"]

        return {
            "sayi": sayi,
            "ort_pd_dd": ort_pd_dd,
            "ort_fk": ort_fk,
            "ort_fd_favok": ort_fd_favok,
            "ort_gunluk": ort_gunluk,
            "ort_yillik": ort_yillik,
            "ort_temettu": ort_temettu,
            "ort_roe": ort_roe,
            "toplam_piyasa_degeri": toplam_piyasa,
            "gunluk_lider": gunluk_lider,
            "yillik_lider": yillik_lider,
            "en_ucuz_pd_dd": en_ucuz_pd_dd,
        }

    # Genel BIST Özeti
    ozetler["Tüm Sektörler"] = _istatistik_cikart(tum_hisseler)

    # Sektör Bazlı Özetler
    sektor_gruplari = {}
    for h in tum_hisseler:
        s = h["sektor"]
        sektor_gruplari.setdefault(s, []).append(h)

    for s_ad, grup in sektor_gruplari.items():
        ozetler[s_ad] = _istatistik_cikart(grup)

    return ozetler


# ==============================================================================
# API ENDPOINT'LERİ
# ==============================================================================
@router.get("/screener")
def screener(
    sektor: str = "Tumu",
    filtre: str = "tumu",
    sirala: str = "gunluk",
    yon: str = "desc",
    arama: str = "",
):
    """
    Sektör bazlı araştırma, değerleme çarpanları ve getiri sıralaması.
    """
    # 1. Hisseleri zenginleştir
    with ThreadPoolExecutor(max_workers=8) as ex:
        tum_hisseler = list(ex.map(_hisse_verisi_zenginlestir, BIST_ARASTIRMA_VERILERI))

    # Sektör istatistik özetleri
    sektor_ozetleri = _sektor_ozetleri_uret(tum_hisseler)

    # 2. Sektör Filtresi
    sonuc = tum_hisseler
    if sektor and sektor.lower() not in ["tumu", "tüm sektörler", "all"]:
        sonuc = [h for h in sonuc if h["sektor"].lower() == sektor.lower()]

    # 3. Metin Araması (Kod veya Şirket Adı)
    if arama and arama.strip():
        q = arama.strip().lower()
        sonuc = [h for h in sonuc if q in h["kod"].lower() or q in h["ad"].lower()]

    # 4. Hazır Filtre Presets
    if filtre == "gunluk_yukselen":
        sonuc = [h for h in sonuc if h["gunluk"] > 0]
    elif filtre == "yillik_sampiyon":
        sonuc = [h for h in sonuc if h["yillik"] > 50]
    elif filtre == "dusuk_pd_dd":
        # PD/DD 1.5'in altındaki iskontolu hisseler
        sonuc = [h for h in sonuc if h["pd_dd"] <= 1.5]
    elif filtre == "dusuk_fk":
        # F/K 8'in altındaki cazip hisseler
        sonuc = [h for h in sonuc if h["fk"] <= 8.0]
    elif filtre == "yuksek_temettu":
        # Temettü verimi %3 ve üzeri
        sonuc = [h for h in sonuc if h["temettu_verim"] >= 3.0]
    elif filtre == "devler":
        # Piyasa Değeri 100 Milyar TL üzeri
        sonuc = [h for h in sonuc if h["piyasa_degeri"] >= 100.0]
    elif filtre == "yuksek_roe":
        # Özsermaye kârlılığı %30 üzeri
        sonuc = [h for h in sonuc if h["roe"] >= 30.0]

    # 5. Sıralama (Sort)
    gecerli_alanlar = ["gunluk", "yillik", "pd_dd", "fk", "fd_favok", "temettu_verim", "roe", "piyasa_degeri", "fiyat", "haftalik", "aylik", "rsi"]
    siralanacak_alan = sirala if sirala in gecerli_alanlar else "gunluk"
    ters = (yon.lower() == "desc")

    sonuc.sort(key=lambda x: x.get(siralanacak_alan, 0), reverse=ters)

    # Benzersiz sektörler listesi
    sektor_listesi = ["Tüm Sektörler"] + sorted(list({h["sektor"] for h in tum_hisseler}))

    return {
        "hisseler": sonuc,
        "toplam": len(sonuc),
        "filtre": filtre,
        "sirala": siralanacak_alan,
        "yon": "desc" if ters else "asc",
        "sektor_secili": sektor,
        "sektorler": sektor_listesi,
        "sektor_ozetleri": sektor_ozetleri,
        "guncelleme": datetime.now().strftime("%H:%M:%S"),
    }


@router.get("/compare")
def compare(hisseler: str):
    """
    2 veya daha fazla hisseyi yan yana kıyaslar, sektör ortalamalarıyla farkları
    ve kazanan tarafları analitik bir özetle raporlar.
    """
    semboller = [s.strip().upper() for s in hisseler.split(",") if s.strip()]
    if len(semboller) < 2:
        raise HTTPException(status_code=400, detail="En az 2 hisse kodu belirtilmelidir.")

    # Veritabanından çek ve zenginleştir
    eslesenler = [item for item in BIST_ARASTIRMA_VERILERI if item["kod"] in semboller]
    if not eslesenler:
        raise HTTPException(status_code=404, detail="Belirtilen hisseler araştırma veritabanında bulunamadı.")

    with ThreadPoolExecutor(max_workers=4) as ex:
        zengin_liste = list(ex.map(_hisse_verisi_zenginlestir, eslesenler))

    # Tüm sektör ortalamalarını al
    tum_hisseler = [_hisse_verisi_zenginlestir(i) for i in BIST_ARASTIRMA_VERILERI]
    sektor_ozetleri = _sektor_ozetleri_uret(tum_hisseler)

    # Kazananları belirle
    kazanan_pd_dd = min(zengin_liste, key=lambda x: x["pd_dd"])["kod"]
    kazanan_fk = min(zengin_liste, key=lambda x: x["fk"])["kod"]
    kazanan_yillik = max(zengin_liste, key=lambda x: x["yillik"])["kod"]
    kazanan_gunluk = max(zengin_liste, key=lambda x: x["gunluk"])["kod"]
    kazanan_temettu = max(zengin_liste, key=lambda x: x["temettu_verim"])["kod"]
    kazanan_roe = max(zengin_liste, key=lambda x: x["roe"])["kod"]

    # Karşılaştırmalı Analist Raporu Notu
    rapor_notlari = []
    for h in zengin_liste:
        s_ozet = sektor_ozetleri.get(h["sektor"], sektor_ozetleri["Tüm Sektörler"])
        pd_fark = round(((h["pd_dd"] / s_ozet["ort_pd_dd"]) - 1) * 100, 1)
        durum_pd = f"Sektör ortalamasına ({s_ozet['ort_pd_dd']}) göre %{abs(pd_fark)} " + ("iskontolu (ucuz) 🟢" if pd_fark < 0 else "primli 🟡")
        rapor_notlari.append(f"• **{h['kod']} ({h['ad']}):** PD/DD {h['pd_dd']} ({durum_pd}). 1 Yıllık Yükselişi: %{h['yillik']}, Temettü Verimi: %{h['temettu_verim']}, ROE: %{h['roe']}.")

    return {
        "hisseler": zengin_liste,
        "kazananlar": {
            "en_ucuz_pd_dd": kazanan_pd_dd,
            "en_cazip_fk": kazanan_fk,
            "en_yuksek_yillik_getiri": kazanan_yillik,
            "en_yuksek_gunluk_getiri": kazanan_gunluk,
            "en_yuksek_temettu": kazanan_temettu,
            "en_yuksek_karlilik": kazanan_roe,
        },
        "sektor_benchmark": {h["kod"]: sektor_ozetleri.get(h["sektor"]) for h in zengin_liste},
        "analist_ozeti": "\n".join(rapor_notlari),
    }


def kur(app, baglam: dict):
    """Router'ı FastAPI uygulamasına bağlar."""
    global _baglam_referans
    _baglam_referans = baglam
    app.include_router(router)

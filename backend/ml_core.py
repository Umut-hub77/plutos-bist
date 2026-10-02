"""
ml_core.py — ml_engine.py içindeki MLEngine sınıfının Streamlit/TensorFlow'suz kopyası.
------------------------------------------------------------------------------------
Hesap mantığı (RSI, EMA, MACD, formasyon tespiti, fraktal eşleşme, yorum üretici,
haber duygu analizi, sinyal puanı) orijinal dosyayla BİREBİR aynıdır; tek fark
`fillna(method=...)` çağrısının yeni pandas sürümleriyle uyumlu `.ffill().bfill()` hâlidir.
LSTM sınıfı burada yok: AI Gelecek modülünde ayrı bir dosyada (lstm_core.py) ele alınacak.
"""
import numpy as np
import pandas as pd
try:
    from scipy.interpolate import interp1d
except ImportError:
    class interp1d:
        def __init__(self, x, y, kind='linear'):
            self.x = np.asarray(x)
            self.y = np.asarray(y)
        def __call__(self, x_new):
            return np.interp(x_new, self.x, self.y)


class MLEngine:
    def __init__(self):
        self.templates = {
            "OBO (Düşüş) 📉": [0.2, 0.5, 0.3, 0.9, 0.3, 0.5, 0.2],
            "TOBO (Yükseliş) 📈": [0.8, 0.5, 0.7, 0.1, 0.7, 0.5, 0.8],
            "İkili Tepe (M) 📉": [0.1, 0.9, 0.4, 0.9, 0.1],
            "İkili Dip (W) 📈": [0.9, 0.1, 0.6, 0.1, 0.9],
            "Fincan Kulp 📈": [0.9, 0.4, 0.1, 0.1, 0.4, 0.8, 0.7, 0.9],
            "Boğa Bayrağı 🚩": [0.1, 1.0, 0.7, 0.9, 0.7, 0.85],
            "Ayı Bayrağı 🏳️": [0.9, 0.0, 0.3, 0.1, 0.3, 0.15],
            "V Dip (Ani Dönüş) 📈": [1.0, 0.0, 1.0],
            "Ters V (Ani Çöküş) 📉": [0.0, 1.0, 0.0]
        }
        self.pos_words = ["kar","al", "alım","alış", "artış", "büyüme", "rekor", "temettü", "onay", "anlaşma", "pozitif", "yukarı", "hedef", "strong", "buy", "kazandırdı", "tavan", "dev", "imza", "bedelsiz","sermaye artırımı"]
        self.neg_words = ["zarar","düşüyor", "düştü", "düşüş", "satış", "satım", "ceza", "iptal", "kriz", "dava", "satış", "negatif", "aşağı", "loss", "down", "kayıp", "taban", "geriledi"]

    def calculate_rsi(self, prices, window=14):
        delta = prices.diff()
        gain = (delta.where(delta > 0, 0)).rolling(window=window).mean()
        loss = (-delta.where(delta < 0, 0)).rolling(window=window).mean()
        rs = gain / (loss + 1e-9)
        return 100 - (100 / (1 + rs))

    def calculate_ema(self, data, span):
        return data.ewm(span=span, adjust=False).mean()

    def calculate_macd(self, data):
        exp1 = data.ewm(span=12, adjust=False).mean()
        exp2 = data.ewm(span=26, adjust=False).mean()
        macd_line = exp1 - exp2
        signal_line = macd_line.ewm(span=9, adjust=False).mean()
        histogram = macd_line - signal_line
        return macd_line, signal_line, histogram

    # --- YENİ EKLENEN YORUMCU MOTORU ---
    def generate_investment_comment(self, price, rsi, ema20, ema50, macd_line, signal_line, pattern_name):
        """
        Tüm indikatörleri analiz edip Türkçe, yatırımcı dostu bir özet çıkarır.
        """
        comment = []
        status = "neutral" # neutral, positive, negative
        score = 0

        # 1. EMA (Trend) Analizi
        if price > ema20 and ema20 > ema50:
            comment.append("Hisse fiyatı kısa ve orta vadeli ortalamaların üzerinde, **trend güçlü pozitif**.")
            score += 2
        elif price < ema20 and price < ema50:
            comment.append("Fiyat ortalamaların altında baskılanıyor, **satış baskısı hakim**.")
            score -= 2
        elif price > ema20 and price < ema50:
            comment.append("Fiyat toparlanmaya çalışıyor ancak henüz ana düşüş trendini kıramadı.")
        else:
            comment.append("Fiyat ortalamalar arasında sıkışmış durumda, yön arayışı sürüyor.")

        # 2. RSI (Momentum) Analizi
        if rsi > 70:
            comment.append("RSI aşırı alım bölgesinde (70+). Kâr satışları gelebilir, dikkatli olunmalı.")
            score -= 1
        elif rsi < 30:
            comment.append("RSI aşırı satım bölgesinde (30-). Buradan tepki yükselişi gelme ihtimali yüksek.")
            score += 1
        else:
            comment.append(f"Momentum (RSI: {rsi:.0f}) dengeli bölgede hareket ediyor.")

        # 3. MACD Analizi
        if macd_line > signal_line:
            comment.append("MACD göstergesi **AL** sinyalini koruyor.")
            score += 1
        else:
            comment.append("MACD göstergesi negatif veya **SAT** konumunda.")
            score -= 1

        # 4. Formasyon
        if "Yükselen" in pattern_name or "Boğa" in pattern_name or "TOBO" in pattern_name or "Fincan" in pattern_name:
            comment.append(f"Grafikte oluşan **{pattern_name}** yapısı yükseliş beklentisini destekliyor.")
            score += 2
        elif "Düşen" in pattern_name or "Ayı" in pattern_name or "OBO" in pattern_name or "Ters V" in pattern_name:
            comment.append(f"Grafikteki **{pattern_name}** yapısı düşüş riskine işaret ediyor.")
            score -= 2

        # Sonuç Rengi Belirleme
        if score >= 2: status = "positive"
        elif score <= -2: status = "negative"
        
        full_text = " ".join(comment)
        return full_text, status
    # -----------------------------------

    def detect_pattern_advanced(self, segment):
        try:
            y_s = pd.Series(segment)
            smooth = y_s.rolling(window=3, center=True).mean().ffill().bfill().values
            y_n = (smooth - np.min(smooth)) / (np.max(smooth) - np.min(smooth) + 1e-9)
            x_o = np.linspace(0, 1, len(y_n))
            best_m, max_c = "Belirsiz", -1.0
            for name, tmpl in self.templates.items():
                f = interp1d(np.linspace(0, 1, len(tmpl)), tmpl, kind='linear')
                corr = np.corrcoef(y_n, f(x_o))[0, 1]
                if corr > max_c: max_c, best_m = corr, name
            slope = np.polyfit(np.arange(len(segment)), segment, 1)[0]
            if max_c > 0.65: return best_m, slope, max_c
            trend = "Yükselen Trend 📈" if slope > 0.05 else "Düşen Trend 📉" if slope < -0.05 else "Yatay Seyir ↔️"
            return trend, slope, max_c
        except: return "Belirsiz", 0, 0

    def analyze_sentiment(self, news_input):
        total_score = 0
        if isinstance(news_input, list):
            for item in news_input:
                title = str(item.get('title', '')).lower()
                for w in self.pos_words: total_score += 1 if w in title else 0
                for w in self.neg_words: total_score -= 1 if w in title else 0
        elif isinstance(news_input, str):
            text = news_input.lower()
            for w in self.pos_words: total_score += 1 if w in text else 0
            for w in self.neg_words: total_score -= 1 if w in text else 0
        return ("POZİTİF 🟢", total_score) if total_score > 0 else ("NEGATİF 🔴", total_score) if total_score < 0 else ("NÖTR ⚪", 0)

    def find_multiple_matches(self, current_data, full_history, window_size=30, top_n=3):
        """
        FRAKTAL ANALİZ MOTORU (AKILLI & ESNEK)
        Eğer seçili aralık çok uzunsa, sadece son 'Aktif Trend' kısmını (max 90 bar) tarar.
        Böylece her zaman sonuç bulur.
        """
        MAX_WINDOW = 90
        effective_window = min(window_size, MAX_WINDOW)
        
        c_pat = current_data[-effective_window:]
        
        if len(full_history) < effective_window * 2: return []
        if np.std(c_pat) == 0: return [] 
        
        c_norm = (c_pat - np.mean(c_pat)) / np.std(c_pat)
        
        matches = []
        search_limit = len(full_history) - effective_window - 30 
        
        step = 2 if len(full_history) < 1000 else 5
        
        for i in range(0, search_limit, step):
            h_seg = full_history[i : i+effective_window]
            
            if np.std(h_seg) == 0: continue
            
            h_norm = (h_seg - np.mean(h_seg)) / np.std(h_seg)
            dist = np.linalg.norm(c_norm - h_norm)
            similarity = 100 / (1 + dist)
            matches.append((similarity, i))
            
        matches.sort(key=lambda x: x[0], reverse=True)
        
        unique_matches = []
        seen_indices = set()
        
        for score, idx in matches:
            is_duplicate = False
            for seen in seen_indices:
                if abs(idx - seen) < effective_window: 
                    is_duplicate = True
                    break
            
            if not is_duplicate:
                unique_matches.append((score, idx, effective_window))
                seen_indices.add(idx)
            
            if len(unique_matches) >= top_n: break
            
        return unique_matches

    def get_pattern_visualization(self, data, pattern_name):
        x = np.arange(len(data))
        try:
            if any(k in pattern_name for k in ["Fincan", "V Dip", "Ters V"]): z = np.polyfit(x, data, 2)
            elif any(k in pattern_name for k in ["OBO", "TOBO", "İkili"]): z = np.polyfit(x, data, 4)
            else: z = np.polyfit(x, data, 1)
            return np.poly1d(z)(x)
        except: return np.poly1d(np.polyfit(x, data, 1))(x)

    def get_trend_line(self, data):
        try: return np.poly1d(np.polyfit(np.arange(len(data)), data, 1))(np.arange(len(data)))
        except: return data

    def get_signal_and_score(self, rsi, slope):
        score = 0
        signal = "TUT ⚪"
        if rsi < 30: score += 50
        elif rsi < 45: score += 25
        elif rsi > 70: score -= 40
        if slope > 0.05: score += 30
        if rsi < 30 and slope > -0.05: signal = "GÜÇLÜ AL 🚀"; score += 20
        elif rsi < 50 and slope > 0: signal = "AL 🟢"
        elif rsi > 80: signal = "GÜÇLÜ SAT 🔻"
        elif rsi > 70: signal = "SAT 🔴"
        return signal, score

import React, { useState } from 'react';
import { getFintablesVerisi } from '../lib/fintablesVerisi.js';
import { fmt } from '../lib/format.jsx';

export default function FintablesKarneKart({
  hisse = 'THYAO',
  fiyat,
  degisim,
  onHizliAl,
  onGrafikGit,
  varsayilanAcik = false,
}) {
  const [detayAcik, setDetayAcik] = useState(varsayilanAcik);
  const data = getFintablesVerisi(hisse);

  const getSkorRenk = (s) => {
    if (s >= 8.5) return '#089981';
    if (s >= 7.0) return '#2962FF';
    if (s >= 5.5) return '#FF9800';
    return '#F23645';
  };

  const getSkorEtiket = (s) => {
    if (s >= 8.5) return 'Mükemmel & Çok Güçlü';
    if (s >= 7.0) return 'Sağlıklı & Güvenilir';
    if (s >= 5.5) return 'Orta Düzey';
    return 'Yüksek Riskli';
  };

  return (
    <div className="fintables-kart">
      {/* Üst Şerit: Şirket, Fintables Skoru ve Fiyat */}
      <div className="fintables-kart-ust">
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div className="fintables-logo-kutu">
            <span style={{ fontWeight: 800, fontSize: 13, color: '#D7FF4E', fontFamily: 'JetBrains Mono' }}>
              {data.kod.slice(0, 3)}
            </span>
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontWeight: 700, fontSize: 16, color: '#FFFFFF', fontFamily: 'JetBrains Mono' }}>
                {data.kod}
              </span>
              <span className="fintables-sektor-rozet">{data.sektor}</span>
            </div>
            <span style={{ fontSize: 11.5, color: '#787B86', display: 'block', marginTop: 2 }}>
              Fintables Temel Analiz Karnesi
            </span>
          </div>
        </div>

        {/* Skor Rozeti & Fiyat */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          {fiyat != null && (
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: 17, fontWeight: 700, color: '#FFFFFF', fontFamily: 'JetBrains Mono' }}>
                {fmt(fiyat)} ₺
              </div>
              {degisim != null && (
                <div style={{ fontSize: 11, fontWeight: 700, color: degisim >= 0 ? '#089981' : '#F23645' }}>
                  {degisim >= 0 ? '▲ +' : '▼ '}{fmt(degisim)}%
                </div>
              )}
            </div>
          )}

          <div
            className="fintables-skor-rozet"
            style={{ borderColor: getSkorRenk(data.skor), background: `${getSkorRenk(data.skor)}15` }}
          >
            <span style={{ fontSize: 10, color: '#787B86', textTransform: 'uppercase' }}>FİNTABLES SKORU</span>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 2 }}>
              <b style={{ fontSize: 18, color: getSkorRenk(data.skor), fontFamily: 'JetBrains Mono' }}>
                {data.skor}
              </b>
              <span style={{ fontSize: 11, color: '#787B86' }}>/10</span>
            </div>
          </div>
        </div>
      </div>

      {/* Temel Değerleme Rasyoları Hapları (Valuation Pills) */}
      <div className="fintables-rasyo-serit">
        <div className="rasyo-hap" title="Fiyat / Kazanç Oranı (10 altı genelde cazip kabul edilir)">
          <span className="hap-label">F/K:</span>
          <span className="hap-val" style={{ color: data.f_k <= 7 ? '#089981' : '#FFFFFF' }}>
            {data.f_k}
          </span>
          {data.f_k <= 7 && <span className="hap-badge iyi">Cazip</span>}
        </div>

        <div className="rasyo-hap" title="Piyasa Değeri / Defter Değeri (1 altı varlıklarına göre iskontoludur)">
          <span className="hap-label">PD/DD:</span>
          <span className="hap-val" style={{ color: data.pd_dd <= 1.2 ? '#089981' : '#FFFFFF' }}>
            {data.pd_dd}x
          </span>
          {data.pd_dd < 1.0 && <span className="hap-badge iyi">İskontolu</span>}
        </div>

        <div className="rasyo-hap" title="Firma Değeri / FAVÖK">
          <span className="hap-label">FD/FAVÖK:</span>
          <span className="hap-val">{data.fd_favok}x</span>
        </div>

        <div className="rasyo-hap" title="Özsermaye Karlılığı (ROE: Yıllık özkaynak getirisi)">
          <span className="hap-label">ROE (Kârlılık):</span>
          <span className="hap-val" style={{ color: data.roe >= 25 ? '#089981' : '#D7FF4E' }}>
            %{data.roe}
          </span>
        </div>

        <div className="rasyo-hap" title="Net Borç / Yıllık FAVÖK">
          <span className="hap-label">Net Borç/FAVÖK:</span>
          <span className="hap-val" style={{ color: data.net_borc_favok <= 1.5 ? '#089981' : '#FF9800' }}>
            {data.net_borc_favok}x
          </span>
        </div>

        {data.temettu_verimi > 0 && (
          <div className="rasyo-hap" title="Yıllık Temettü Verimi">
            <span className="hap-label">Temettü:</span>
            <span className="hap-val" style={{ color: '#D7FF4E' }}>%{data.temettu_verimi}</span>
          </div>
        )}
      </div>

      {/* Yatırımcı Özeti (1 Cümlelik Fintables Değerlendirmesi) */}
      <div className="fintables-ozet-kutu">
        <span style={{ fontSize: 12.5, color: '#D1D4DC', lineHeight: 1.5 }}>
          💡 <b>Fintables Görüşü:</b> {data.ozet}
        </span>
      </div>

      {/* Detaylı Karne Aç/Kapat Butonu & Aksiyonlar */}
      <div className="fintables-aksiyon-bar">
        <button
          className="fintables-toggle-btn"
          onClick={() => setDetayAcik(o => !o)}
        >
          <span>{detayAcik ? '▲ Şirket Karnesini Gizle' : '▼ 15 Kriterli Şirket Karnesini Gör'}</span>
          <span style={{ fontSize: 11, color: '#089981', fontWeight: 600 }}>
            ({data.karne.karlilik.puan + data.karne.buyume.puan + data.karne.borcluluk.puan}/15 Başarılı Kriter)
          </span>
        </button>

        <div style={{ display: 'flex', gap: 8 }}>
          {onHizliAl && (
            <button className="btn-aksiyon-al" onClick={() => onHizliAl(data.kod)}>
              ⚡ Hızlı Al (TradeAll)
            </button>
          )}
          {onGrafikGit && (
            <button className="btn-aksiyon-grafik" onClick={() => onGrafikGit(data.kod)}>
              📈 Grafik (TradingView)
            </button>
          )}
        </div>
      </div>

      {/* Açılır 3 Sütunlu Finansal Sağlık Karnesi */}
      {detayAcik && (
        <div className="fintables-karne-grid">
          {/* 1. Karlılık Sütunu */}
          <div className="karne-sutun">
            <div className="karne-sutun-baslik">
              <span>💰 Karlılık</span>
              <span className="karne-puan-rozet">{data.karne.karlilik.puan}/{data.karne.karlilik.toplam}</span>
            </div>
            <div className="karne-kriter-liste">
              {data.karne.karlilik.kriterler.map((k, i) => (
                <div key={i} className="karne-kriter-oge">
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span className={k.durum ? 'tik-yesil' : 'carpi-kirmizi'}>
                      {k.durum ? '✓' : '✗'}
                    </span>
                    <span className="kriter-ad">{k.ad}</span>
                  </div>
                  <span className="kriter-deger">{k.deger}</span>
                </div>
              ))}
            </div>
          </div>

          {/* 2. Büyüme Sütunu */}
          <div className="karne-sutun">
            <div className="karne-sutun-baslik">
              <span>🚀 Büyüme</span>
              <span className="karne-puan-rozet">{data.karne.buyume.puan}/{data.karne.buyume.toplam}</span>
            </div>
            <div className="karne-kriter-liste">
              {data.karne.buyume.kriterler.map((k, i) => (
                <div key={i} className="karne-kriter-oge">
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span className={k.durum ? 'tik-yesil' : 'carpi-kirmizi'}>
                      {k.durum ? '✓' : '✗'}
                    </span>
                    <span className="kriter-ad">{k.ad}</span>
                  </div>
                  <span className="kriter-deger">{k.deger}</span>
                </div>
              ))}
            </div>
          </div>

          {/* 3. Borçluluk Sütunu */}
          <div className="karne-sutun">
            <div className="karne-sutun-baslik">
              <span>🛡️ Borçluluk & Kaldıraç</span>
              <span className="karne-puan-rozet">{data.karne.borcluluk.puan}/{data.karne.borcluluk.toplam}</span>
            </div>
            <div className="karne-kriter-liste">
              {data.karne.borcluluk.kriterler.map((k, i) => (
                <div key={i} className="karne-kriter-oge">
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span className={k.durum ? 'tik-yesil' : 'carpi-kirmizi'}>
                      {k.durum ? '✓' : '✗'}
                    </span>
                    <span className="kriter-ad">{k.ad}</span>
                  </div>
                  <span className="kriter-deger">{k.deger}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

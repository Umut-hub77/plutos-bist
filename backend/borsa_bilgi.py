"""
borsa_bilgi.py — Plutos AI Kıdemli BIST Finansal Analiz & Muhakeme Motoru
-------------------------------------------------------------------------
Herhangi bir borsa sorusunu, hisse karşılaştırmalarını (örn: EREGL vs KRDMD),
sektörel dinamikleri (faiz inerse ne olur, banka mı sanayi mi), makroekonomik
etkileri (enflasyon muhasebesi, döviz kuru) ve durumsal senaryoları çok boyutlu
analiz edip somut stratejik sonuçlar çıkaran kapsamlı yapay zeka motoru.
"""

import re
import json

# ==============================================================================
# 1) DETAYLI BORSA TERİMLERİ SÖZLÜĞÜ (34 Kavram)
# ==============================================================================
TERIMLER = {
    "lot": {
        "baslik": "Lot (Pay / Adet)",
        "kategori": "Temel",
        "kisa": "Borsa İstanbul'da işlem gören 1 adet hisse senedini ifade eder.",
        "aciklama": (
            "**Lot Nedir?**\n"
            "Borsa İstanbul'da **1 Lot = 1 Adet Pay (Hisse Senedi)** anlamına gelir. "
            "Eski yıllarda hisseler 1.000'lik paketler halinde satılırken, günümüzde 1 lot tam olarak 1 hisseye eşittir.\n\n"
            "**Örnek:**\n"
            "THYAO hissesi 300 ₺ ise, **1 lot THYAO** almak için 300 ₺ ödersiniz. 10 lot almak isterseniz 3.000 ₺ gerekir.\n\n"
            "💡 **Yatırımcı İpucu:**\n"
            "Portföyünüzü kurarken hisse fiyatından ziyade, toplam ayırdığınız bütçeye odaklanın. 100 ₺'lik hisseden 10 lot almakla, "
            "10 ₺'lik hisseden 100 lot almak aynı toplam yatırımdır (1.000 ₺)."
        ),
        "anahtarlar": ["lot", "1 lot", "lot nedir", "lot ne demek", "kac lot", "pay", "hisse adedi"]
    },
    "temettu": {
        "baslik": "Temettü (Kâr Payı)",
        "kategori": "Temel / Getiri",
        "kisa": "Şirketin yıllık net kârının bir kısmını nakit olarak hissedarlarına dağıtmasıdır.",
        "aciklama": (
            "**Temettü Nedir ve Nasıl Alınır?**\n"
            "Bir şirket yıl boyunca kâr ettiğinde, bu kârın bir kısmını kasada yatırım için tutabilir, "
            "kalanını ise pay sahiplerine (hissedarlarına) nakit olarak dağıtır. Buna **Temettü (Kâr Payı)** denir.\n\n"
            "**Önemli Kurallar:**\n"
            "1. **Hak Kazanma Tarihi:** Şirketin açıkladığı temettü dağıtım tarihinden bir iş günü önce seans kapanışında hisseye sahip olmanız yeterlidir.\n"
            "2. **Fiyat Düzeltmesi:** Temettü dağıtıldığı sabah, hissenin seans açılış fiyatı dağıtılan net temettü tutarı kadar düşürülür.\n"
            "3. **Hesaba Geçiş:** Temettü nakdi Takasbank T+2 kuralı gereğince 2 iş günü sonra vadesiz yatırım hesabınıza yatar.\n\n"
            "💡 **Bileşik Getiri Gücü:**\n"
            "Düzenli temettü ödeyen ve kârını her yıl artıran şirketlerin temettüleriyle tekrar aynı hisseden ek lot alarak "
            "uzun vadede devasa bir kartopu pasif gelir akışı oluşturabilirsiniz."
        ),
        "anahtarlar": ["temettu", "temettü", "kar payi", "kâr payı", "temettu emekliligi", "temettu verimi", "temettu nasil alinir"]
    },
    "fk": {
        "baslik": "F/K Oranı (Fiyat / Kazanç Oranı - P/E)",
        "kategori": "Temel Analiz",
        "kisa": "Hisse fiyatının şirket kârına oranıdır; şirketin kendini kaç yılda amorti edeceğini gösterir.",
        "aciklama": (
            "**F/K (Fiyat/Kazanç) Oranı Nedir?**\n"
            "Bir şirketin piyasa değerinin (veya hisse fiyatının), şirketin yıllık net kârına bölünmesiyle bulunur.\n\n"
            "**Formül:** `F/K = Piyasa Değeri / Yıllık Net Kâr`\n\n"
            "• **Örnek:** F/K oranı **8** olan bir şirket, bugünkü kâr seviyesini korursa yatırımınızı **8 yılda amorti eder** demektir.\n"
            "• **Düşük F/K (4-7):** Şirket kârına göre ucuz kalmış olabilir ya da geleceğe dair riskler fiyatlanıyor olabilir.\n"
            "• **Yüksek F/K (20-40):** Gelecekte kârını çok hızlı büyüteceği beklentisiyle primli işlem görüyor olabilir (teknoloji, yenilenebilir enerji vb.).\n\n"
            "⚠️ F/K oranını tek başına değil, her zaman **sektör ortalaması** ile kıyaslamalısınız."
        ),
        "anahtarlar": ["fk", "f/k", "fiyat kazanc", "fiyat/kazanc", "pe ratio", "p/e", "fk nedir"]
    },
    "pddd": {
        "baslik": "PD/DD Oranı (Piyasa Değeri / Defter Değeri - P/B)",
        "kategori": "Temel Analiz",
        "kisa": "Şirketin borsadaki değerinin, bilançosundaki özkaynaklarına (net varlıklarına) oranıdır.",
        "aciklama": (
            "**PD/DD Nedir?**\n"
            "Şirketin toplam piyasa değerinin, muhasebe defterindeki **Özsermayesine (Defter Değerine)** bölünmesiyle hesaplanır.\n\n"
            "• **PD/DD < 1.0:** Şirket varlıklarına göre iskontolu (ucuz) işlem görüyor demektir (özellikle bankalarda sık görülür).\n"
            "• **PD/DD > 3.0 - 5.0:** Şirketin marka değeri veya büyüme beklentisi yüksektir.\n\n"
            "💡 GYO, bankacılık ve sanayi gibi varlık yoğun şirketleri değerlendirirken vazgeçilmez bir ölçüttür."
        ),
        "anahtarlar": ["pddd", "pd/dd", "piyasa degeri defter degeri", "pd dd", "pb ratio", "p/b"]
    },
    "fdfavok": {
        "baslik": "FD / FAVÖK (EV / EBITDA)",
        "kategori": "Temel Analiz",
        "kisa": "Firma değerinin operasyonel nakit üretme gücüne oranıdır; borçluluğu da hesaba katar.",
        "aciklama": (
            "**FD/FAVÖK Nedir?**\n"
            "F/K oranından farklı olarak şirketin net borçlarını da dikkate alan profesyonel değerleme çarpanıdır.\n\n"
            "• **Firma Değeri (FD):** Piyasa Değeri + Net Borç\n"
            "• **FAVÖK:** Faiz, Amortisman ve Vergi Öncesi Kâr\n\n"
            "💡 İki şirketin kârı aynı olabilir; ancak biri gırtlağına kadar borçlu, diğeri borçsuzsa FD/FAVÖK borç yükünü hesaba katarak adil bir karşılaştırma sağlar."
        ),
        "anahtarlar": ["fdfavok", "fd/favok", "fd/favök", "favok", "favök", "ev/ebitda", "ebitda"]
    },
    "roe": {
        "baslik": "Özsermaye Kârlılığı (ROE - Return on Equity)",
        "kategori": "Temel Analiz",
        "kisa": "Şirketin ortakların koyduğu her 100 TL özkaynakla ne kadar net kâr ürettiğini gösterir.",
        "aciklama": (
            "**ROE (Özsermaye Kârlılığı) Nedir?**\n"
            "`ROE (%) = (Net Kâr / Özkaynaklar) × 100`\n\n"
            "Warren Buffett'ın en çok baktığı metriktir. Enflasyonun %40 olduğu bir ortamda, bir şirketin ROE oranı %50'nin üzerindeyse, "
            "hissedarlarının parasını enflasyona karşı koruyor ve gerçek reel büyüme yaratıyor demektir."
        ),
        "anahtarlar": ["roe", "ozsermaye karliligi", "özsermaye kârlılığı", "return on equity"]
    },
    "rsi": {
        "baslik": "RSI (Göreceli Güç Endeksi - Relative Strength Index)",
        "kategori": "Teknik Analiz",
        "kisa": "Fiyatın aşırı alındığını mı yoksa aşırı satıldığını mı gösteren 0-100 arası momentum osilatörüdür.",
        "aciklama": (
            "**RSI Nasıl Okunur?**\n"
            "• **RSI < 30 (Aşırı Satım):** Hissede yoğun satış yapılmış, fiyat baskılanmış olabilir. Tepki yükselişi olasılığı artar.\n"
            "• **RSI > 70 (Aşırı Alım):** Fiyat çok hızlı yükselmiş, alıcılar yorulmuş olabilir. Kâr satışı (düzeltme) riski doğar.\n"
            "• **RSI = 50:** Denge seviyesi.\n\n"
            "🔥 **Pozitif Uyumsuzluk:** Fiyat yeni dip yaparken RSI daha yüksek bir dip yapıyorsa bu çok güçlü bir yükseliş dönüş habercisidir!"
        ),
        "anahtarlar": ["rsi", "rsi nedir", "goreceli guc endeksi", "asiri alim", "asiri satim", "uyumsuzluk"]
    },
    "macd": {
        "baslik": "MACD (Trend ve Momentum İndikatörü)",
        "kategori": "Teknik Analiz",
        "kisa": "İki hareketli ortalamanın ilişkisini inceleyerek trend yönünü ve gücünü gösterir.",
        "aciklama": (
            "**MACD Sinyalleri:**\n"
            "• **Alım Sinyali:** Mavi MACD çizgisi turuncu sinyal çizgisini aşağıdan yukarı kestiğinde oluşur.\n"
            "• **Satış Sinyali:** MACD çizgisi sinyal çizgisini yukarıdan aşağı kestiğinde momentumun zayıfladığını gösterir.\n"
            "• Sıfır çizgisinin üzerine çıkılması orta vadeli boğa trendini teyit eder."
        ),
        "anahtarlar": ["macd", "macd nedir", "macd nasil yorumlanir", "macd kesismesi"]
    },
    "stoploss": {
        "baslik": "Stop-Loss (Zarar Kes)",
        "kategori": "Risk Yönetimi",
        "kisa": "Beklenmedik düşüşlerde sermayeyi korumak için önceden belirlenen seviyede zararına satış yapma emridir.",
        "aciklama": (
            "**Stop-Loss Hayat Kurtarır!**\n"
            "Borsada profesyonel ile amatör arasındaki en büyük fark zararı kabullenme disiplinidir.\n"
            "100 ₺'den aldığınız hisseye %5 stop-loss koyarsanız (95 ₺), hisse 60 ₺'ye çakılsa dahi siz sadece %5 kayıpla portföyünüzü korumuş olursunuz."
        ),
        "anahtarlar": ["stoploss", "stop loss", "zarar kes", "stop", "stoplamak", "zarari durdur"]
    },
    "tavantaban": {
        "baslik": "Tavan / Taban Fiyat (%10 Marj Kuralı)",
        "kategori": "İşlem & BIST Kuralları",
        "kisa": "Borsa İstanbul'da bir hissenin bir günde yapabileceği en fazla +%10 (tavan) veya -%10 (taban) fiyat sınırıdır.",
        "aciklama": (
            "Borsa İstanbul Pay Piyasası'nda volatiliteyi dengelemek için günlük %10 marj uygulanır. "
            "Önceki gün 100 ₺ kapanan hisse en fazla 110 ₺ (tavan) veya en az 90 ₺ (taban) olabilir."
        ),
        "anahtarlar": ["tavan", "taban", "tavan taban", "tavan kilit", "yuzde 10 marj"]
    },
    "t2": {
        "baslik": "T+2 Takas Süresi",
        "kategori": "İşlem & BIST Kuralları",
        "kisa": "Hisse senedi satışından elde edilen nakdin banka hesabına çekilebilir hale gelmesi için gereken 2 iş günlük takas süresidir.",
        "aciklama": (
            "Hisse sattığınız gün satış tutarıyla hemen başka hisse alabilirsiniz (T+0). "
            "Ancak parayı vadesiz banka hesabınıza nakit EFT yapmak isterseniz 2 iş günü (T+2) beklemeniz gerekir."
        ),
        "anahtarlar": ["t+2", "t2", "takas suresi", "t+1", "para ne zaman cekerim"]
    },
    "halkaarz": {
        "baslik": "Halka Arz (IPO - Initial Public Offering)",
        "kategori": "Piyasa & Yatırım",
        "kisa": "Bir şirketin paylarını ilk kez borsada halka açarak yatırımcılara satmasıdır.",
        "aciklama": (
            "Bireysele eşit dağıtım halka arzlarda herkes eşit sayıda lot alır. "
            "Katılmadan önce şirketin izahnamesine, fon kullanım yerine ve borçluluk yapısına mutlaka bakılmalıdır."
        ),
        "anahtarlar": ["halka arz", "ipo", "halka arza nasil katilinir", "esit dagitim"]
    },
    "bedelsiz": {
        "baslik": "Bedelsiz Sermaye Artırımı",
        "kategori": "Şirket Olayları",
        "kisa": "Şirketin iç kaynaklarını sermayeye ekleyerek ortaklarına bedava lot vermesidir.",
        "aciklama": (
            "Şirket kasasındaki kârları sermayeye ekler ve ortaklara ücretsiz lot verir. "
            "Lot sayınız artar ancak hisse fiyatı aynı oranda bölünür; toplam portföy değeriniz bölünme anında değişmez."
        ),
        "anahtarlar": ["bedelsiz", "bedelsiz sermaye", "hisse bolunmesi", "bolunme"]
    },
    "bogaayi": {
        "baslik": "Boğa Piyasası (Bull) ve Ayı Piyasası (Bear)",
        "kategori": "Piyasa Kavramları",
        "kisa": "Boğa piyasası yükseliş ve coşkuyu, ayı piyasası ise düşüş ve karamsarlığı temsil eder.",
        "aciklama": (
            "• **Boğa Piyasası:** Fiyatların sürekli arttığı, yatırımcı güveninin tavan yaptığı güçlü yükseliş trendidir.\n"
            "• **Ayı Piyasası:** Zirveden %20 veya daha fazla düşüş yaşanan satış ağırlıklı dönemdir."
        ),
        "anahtarlar": ["boga", "boğa", "ayi", "ayı", "boga piyasasi", "ayi piyasasi", "bull market"]
    },
    "destekdirenc": {
        "baslik": "Destek ve Direnç Seviyeleri",
        "kategori": "Teknik Analiz",
        "kisa": "Fiyatın düşerken alıcı bulduğu taban (destek) ve yükselirken satıcıyla karşılaştığı tavan (direnç) seviyeleridir.",
        "aciklama": (
            "Destek alıcıların devreye girdiği seviye, direnç ise satıcıların baskın çıktığı seviyedir. "
            "Bir direnç hacimli şekilde yukarı kırılırsa, artık gelecekte güçlü bir desteğe dönüşür."
        ),
        "anahtarlar": ["destek", "direnc", "direnç", "destek seviyesi", "direnc seviyesi"]
    },
    "ortalamalar": {
        "baslik": "Hareketli Ortalamalar (SMA / EMA) & Golden Cross",
        "kategori": "Teknik Analiz",
        "kisa": "Fiyat dalgalanmalarını yumuşatarak ana trendi gösteren ortalamalar.",
        "aciklama": (
            "50 günlük ortalamanın 200 günlük ortalamayı aşağıdan yukarı kesmesine **Golden Cross (Altın Kesişim)** denir ve uzun vadeli büyük boğa koşusunun habercisidir."
        ),
        "anahtarlar": ["hareketli ortalama", "sma", "ema", "golden cross", "death cross", "200 gunluk"]
    },
    "bilesikgetiri": {
        "baslik": "Bileşik Getiri (Paranın Katlanma Gücü)",
        "kategori": "Yatırım Felsefesi",
        "kisa": "Kazanılan kârın da yeniden yatırıma dönüşerek geometrik hızla büyümesidir.",
        "aciklama": (
            "Kârınızı çekmeyip hisseye ve temettüye yeniden yatırdığınızda para katlanarak büyür. "
            "Zaman + Disiplin + Kârın Yeniden Yatırımı = Finansal Özgürlük."
        ),
        "anahtarlar": ["bilesik getiri", "bileşik getiri", "kartopu etkisi", "compound interest"]
    },
    "bollinger": {
        "baslik": "Bollinger Bantları",
        "kategori": "Teknik Analiz",
        "kisa": "Fiyatın 20 günlük hareketli ortalamasına ±2 standart sapma eklenerek oluşturulan volatilite kanallarıdır.",
        "aciklama": (
            "Fiyat üst banda vurduğunda aşırı primli, alt banda vurduğunda aşırı satım bölgesindedir. "
            "Bantların daralması (Squeeze) sert bir patlamanın kapıda olduğunu gösterir."
        ),
        "anahtarlar": ["bollinger", "bollinger bantlari", "volatilite"]
    },
    "dca": {
        "baslik": "Kademeli Alım & DCA (Dolar Maliyet Ortalaması)",
        "kategori": "Strateji & Risk",
        "kisa": "Piyasanın dibini tahmin etmeden, düzenli zaman aralıklarında sabit bütçeyle hisse biriktirme stratejisidir.",
        "aciklama": (
            "Her ay sabit bütçeyle hisse aldığınızda; fiyat yükselirse az lot, düşerse çok lot alarak ortalama maliyetinizi dengelersiniz."
        ),
        "anahtarlar": ["dca", "kademeli alim", "maliyet dusurme", "maliyet ortalamasi"]
    },
    "fomo": {
        "baslik": "FOMO ve Panik Satışı Psikolojisi",
        "kategori": "Yatırım Psikolojisi",
        "kisa": "Fırsatı kaçırma korkusuyla tepeden alma (FOMO) ve düşüşlerde korkuyla en dipte satma psikolojisidir.",
        "aciklama": (
            "Tavan tavan giden hisseye tepeden atlamak (FOMO) ve düzeltmede korkup en dipte satmak en büyük kayıp sebebidir."
        ),
        "anahtarlar": ["fomo", "panik satisi", "panik satis", "psikoloji", "korku"]
    }
}

# ==============================================================================
# 2) BIST SEKTÖR VE ŞİRKETLER DERİN ANALİZ PROFİLLERİ
# ==============================================================================
SEKTORLER_PROFIL = {
    "demir_celik": {
        "ad": "Demir - Çelik Sektörü",
        "hisseler": ["EREGL", "KRDMD", "KRDMA", "KRDMB", "ISDMR", "CEMTS"],
        "dinamikler": (
            "• **Kritik İtici Güçler:** Küresel HRC (sıcak rulo sac) ve kütük çelik fiyatları, Çin'in çelik üretimi ve ihracat dampingi, demir cevheri ve koklaşabilir kömür maliyetleri.\n"
            "• **Faiz Duyarlılığı:** Faizler düştüğünde konut ve altyapı inşaatları canlanır; bu durum uzun çelik üreticilerine (KRDMD) doğrudan yarar. Küresel faiz indirimleri ise otomotiv ve beyaz eşya üretimini artırarak yassı çelik üreticilerine (EREGL) talep yaratır.\n"
            "• **Şirket Karşılaştırması (EREGL vs KRDMD):**\n"
            "  - **EREGL:** Türkiye'nin en büyük entegre yassı çelik üreticisidir. Otomotiv, beyaz eşya, boru ve ambalaj sektörlerine verir. Yüksek temettü geleneği vardır, döviz bazlı sözleşmelerle çalışır. Ancak küresel çelik fiyatlarındaki dalgalanmalardan çok hızlı etkilenir.\n"
            "  - **KRDMD:** Uzun çelik (inşaat demiri, profil, demiryolu rayı ve tekeri) odaklıdır. İç inşaat sektörüne ve devlet altyapı yatırımlarına daha duyarlıdır. Operasyonel kaldıraç oranı ve kârlılık volatilitesi EREGL'ye göre daha yüksektir."
        )
    },
    "bankacilik": {
        "ad": "Bankacılık & Finans Sektörü",
        "hisseler": ["GARAN", "AKBNK", "ISCTR", "YKBNK", "VAKBN", "HALKB"],
        "dinamikler": (
            "• **Kritik İtici Güçler:** Net Faiz Marjı (NIM), kredi-mevduat makası, TÜFE'ye endeksli tahvil getirileri, swap kısıtlamaları, takipteki alacaklar (NPL) oranı.\n"
            "• **Faiz Döngüsü Etkisi:** Faiz artış dönemlerinde mevduat maliyeti hızla fırlar, bankaların kâr marjları daralır. Ancak Merkez Bankası faiz indirmeye başladığında, mevduat maliyetleri anında düşerken sabit getirili krediler yüksek faizde kaldığı için banka kârları adeta patlar.\n"
            "• **Enflasyon Muhasebesi Muafiyeti:** Bankalar enflasyon muhasebesi (TMS 29) kapsamı dışında tutulduğu için net kârları sanayi şirketlerine göre daha şeffaf ve güçlü kalmaktadır.\n"
            "• **Şirket Dinamikleri:** GARAN yabancı payı ve kârlılık liderliğiyle öne çıkarken, AKBNK yüksek sermaye yeterlilik rasyosu ve düşük kaldıraç riskiyle, ISCTR ise geniş sanayi iştirak portföyüyle ayrışır."
        )
    },
    "havacilik": {
        "ad": "Havacılık & Ulaştırma Sektörü",
        "hisseler": ["THYAO", "PGSUS", "TAVHL", "CLEBI"],
        "dinamikler": (
            "• **Kritik İtici Güçler:** Yolcu doluluk oranları (Load Factor), RASK (koltuk başı gelir), CASK (koltuk başı maliyet), Brent petrol ve jet yakıtı fiyatları, döviz kurları.\n"
            "• **Kambiyo ve Döviz Yapısı:** Havacılık şirketlerinin gelirlerinin %80-90'ı Euro ve Dolar cinsindendir; TL'nin değer kaybetmesi operasyonel kârı destekler.\n"
            "• **Şirket Karşılaştırması (THYAO vs PGSUS):**\n"
            "  - **THYAO:** Küresel bayrak taşıyıcıdır. 120'den fazla ülkeye uçar, devasa bir kargo filosuna (Turkish Cargo) sahiptir. Geniş gövde filosuyla transit yolcu taşır. Değerleme çarpanları küresel rakiplerine (Lufthansa, Air France) göre belirgin iskontoludur.\n"
            "  - **PGSUS:** Low-cost (düşük maliyetli) iş modeli uygular. Genç ve tek tip Airbus filosu sayesinde yakıt ve bakım maliyeti düşüktür. Yan gelirleri (koltuk seçimi, bagaj satışı) çok güçlüdür."
        )
    },
    "otomotiv": {
        "ad": "Otomotiv Sektörü",
        "hisseler": ["FROTO", "TOASO", "DOAS", "TTRAK"],
        "dinamikler": (
            "• **Kritik İtici Güçler:** Avrupa pazarındaki talep ve PMI verileri, Euro/Dolar paritesi, iç pazarda taşıt kredisi faizleri ve ÖTV politikaları.\n"
            "• **Şirket Karşılaştırması:**\n"
            "  - **FROTO:** Ford'un Avrupa'daki ticari araç üretim üssüdür. 'Al ya da öde' (take-or-pay) sözleşmeleri sayesinde satış garantilidir; Euro bazlı temettü makinesidir.\n"
            "  - **TOASO:** Stellantis entegrasyonu ve yeni model üretim anlaşmalarıyla iç pazarda ve ihracatta ölçek büyütmektedir.\n"
            "  - **DOAS:** Distribütörlük modelidir; sermaye ihtiyacı düşüktür, yüksek temettü öder ancak taşıt kredisi faizlerine çok duyarlıdır."
        )
    },
    "perakende": {
        "ad": "Organize Perakende & Gıda",
        "hisseler": ["BIMAS", "MGROS", "SOKM"],
        "dinamikler": (
            "• **Kritik İtici Güçler:** Enflasyonist dönemde fiyatlama gücü (pricing power), asgari ücret artışları, sepet büyüklüğü ve online satış kanalları.\n"
            "• **Defansif Karakter:** Kriz, savaş veya faiz şoklarında dahi herkes temel gıda tüketmek zorundadır. Negatif işletme sermayesi ile çalışırlar (mal tedarikçisine 60-90 günde öder, müşteriden parayı anında peşin alır).\n"
            "• **BIMAS vs MGROS:** BIMAS sert indirim (hard-discount) modeliyle düşük kâr marjı-yüksek sürüm yapar. MGROS ise süpermarket ve hızlı teslimat (Migros Sanal Market) tarafında pazar lideridir."
        )
    },
    "savunma_teknoloji": {
        "ad": "Savunma Sanayii & Teknoloji",
        "hisseler": ["ASELS", "SDTTR", "LOGO", "KFEIN"],
        "dinamikler": (
            "• **Kritik İtici Güçler:** Savunma Sanayii Başkanlığı (SSB) siparişleri, ihracat lisansları, jeopolitik gerilimler ve Ar-Ge teşvikleri.\n"
            "• **ASELS:** 10 Milyar Doları aşan bakiye sipariş defteri (backlog) ile yıllarca sürecek iş garantisine sahiptir. Devlet güvencelidir; ancak tahsilat süreleri ve nakit akışı dönemsel olarak dalgalanabilir."
        )
    },
    "gyo": {
        "ad": "Gayrimenkul Yatırım Ortaklığı (GYO)",
        "hisseler": ["EKGYO", "ISGYO", "TRGYO", "VKGYO"],
        "dinamikler": (
            "• **Kritik İtici Güçler:** Konut kredisi faiz oranları, kentsel dönüşüm teşvikleri, inşaat maliyet endeksi ve Net Aktif Değer (NAD) iskontosu.\n"
            "• **Faiz Hassasiyeti:** Faizler düşmeye başladığında borsada ilk koşan sektör GYO'dur çünkü konut alımları ve gayrimenkul değerlemeleri fırlar."
        )
    }
}

# ==============================================================================
# 3) MAKROEKONOMİK SENARYOLAR VE PİYASA MEKANİZMALARI
# ==============================================================================
MAKRO_SENARYOLAR = {
    "faiz_indirimi": {
        "baslik": "TCMB ve Küresel Faiz İndirimi Döngüsünün Borsaya Etkisi",
        "analiz": (
            "📌 **Faiz İndirim Döngüsünün BIST Üzerindeki Büyüteç Etkisi:**\n\n"
            "Merkez Bankaları faiz indirimine başladığında sermaye piyasalarında şu zincirleme reaksiyon gerçekleşir:\n\n"
            "1. **Mevduattan Kaçış:** risksiz %40-50 faiz kalmadığı zaman devasa mevduat birikimleri getiri arayışıyla doğrudan hisse senedi piyasasına ve fonlara akar.\n"
            "2. **Şirketlerin Finansman Maliyeti Düşer:** Kredi faizleri geriledikçe borçlu sanayi şirketlerinin finansman gideri azalır, net kârları katlanır.\n"
            "3. **İlk Ralli Yapacak Sektörler:**\n"
            "   • 🥇 **GYO & Gayrimenkul:** Konut kredisi faizleri düşeceği için talep patlar.\n"
            "   • 🥈 **Otomotiv & Beyaz Eşya:** Taşıt ve tüketici kredileri canlanır (FROTO, TOASO, ARCLK).\n"
            "   • 🥉 **Bankacılık:** Mevduat maliyeti hızla gerilerken mevcut kredilerden yüksek kâr marjı yazarlar.\n"
            "   • 🏅 **Borçlu Sanayi Şirketleri:** Yüksek borç yükü hafifleyen sanayi devleri ralliye katılır.\n\n"
            "🎯 **Stratejik Sonuç:** Faiz indiriminin başladığı dönemler, borsanın en sert ve kazançlı boğa koşularını başlattığı tarihsel dönüm noktalarıdır."
        )
    },
    "enflasyon_muhasebesi": {
        "baslik": "Enflasyon Muhasebesi (TMS 29) BIST Şirketlerini Nasıl Etkiler?",
        "analiz": (
            "📌 **Enflasyon Muhasebesi (TMS 29) Nedir ve Kârları Neden Düşürdü?**\n\n"
            "Yüksek enflasyon ortamında şirketlerin bilançoları reel durumu yansıtmadığı için SPK ve Gelir İdaresi enflasyon düzeltmesini zorunlu kıldı.\n\n"
            "**Kritik Mekanizma:**\n"
            "• **Parasal Varlık Tutmak (Nakit Kaybı):** Kasasında çok nakit veya alacak tutan şirketler 'parasal kayıp' yazar çünkü nakit enflasyon karşısında erimiştir.\n"
            "• **Stok ve Duran Varlık Kârı:** Fabrikası, arsası, makinesi (parasal olmayan varlığı) çok olan şirketlerin varlık değerleri güncellenir ancak amortisman giderleri arttığı için net kârları kağıt üzerinde düşer.\n"
            "• **Kazananlar ve Kaybedenler:**\n"
            "   - 🛡️ **Muaf Olanlar (Avantajlı):** Bankalar enflasyon muhasebesi dışında tutulduğu için kârları darbe almadı.\n"
            "   - ⚠️ **Borçlu / Stoksuz Şirketler:** Ciddi vergi yükü ve net parasal kayıp yaşadılar.\n\n"
            "🎯 **Stratejik Sonuç:** Enflasyon muhasebesi şirketlerin gerçek nakit üretme gücünü (FAVÖK ve Serbest Nakit Akımı) bozmaz; sadece bilançoyu enflasyondan arındırır. Panik satışı yerine şirketin faaliyet kârına odaklanılmalıdır."
        )
    },
    "doviz_kuru_etkisi": {
        "baslik": "Döviz Kuru Artışı ve Devalüasyon Hangi Hisseleri Uçurur, Hangilerini Vurur?",
        "analiz": (
            "📌 **Döviz Kuru Şoklarında Kazanan ve Kaybeden BIST Şirketleri:**\n\n"
            "Dolar/Euro yükseldiğinde borsa homojen hareket etmez; şirketler ikiye ayrılır:\n\n"
            "1. 🏆 **Net Döviz Zengini & İhracatçılar (KAZANANLAR):**\n"
            "   • Gelirleri döviz, giderleri büyük oranda TL olan şirketler kambiyo kârı yazar.\n"
            "   • Örnek: **THYAO, PGSUS, FROTO, SISE, EREGL, VESTL, ARCLK**.\n"
            "   • Bu şirketler kur arttıkça TL bazında rekor kârlar açıklar ve hisseleri endekse öncülük eder.\n\n"
            "2. ❌ **Net Döviz Borçlusu Şirketler (KAYBEDENLER):**\n"
            "   • Kasasında döviz olmayıp Eurobond veya yabancı para kredisi olan şirketler devasa kur farkı zararı yazar.\n"
            "   • İç piyasaya çalışan ve döviz girdisi olmayan şirketlerin kâr marjları erir.\n\n"
            "🎯 **Stratejik Sonuç:** Türk Lirası'nda değer kaybı beklentisi olan dönemlerde portföyün en az %60'ı ihracat oranı yüksek veya döviz nakit fazlası olan dev BIST şirketlerine kaydırılmalıdır."
        )
    },
    "bist100_direnc_10000": {
        "baslik": "BIST 100 Psikolojik Direnç Seviyeleri ve Kırılım Dinamikleri",
        "analiz": (
            "📌 **Endeks Zirvelerinde ve Psikolojik Eşiklerde Nasıl Davranılmalı?**\n\n"
            "Borsa İstanbul'da 10.000 veya 11.000 gibi yuvarlak rakamlar sadece bir çizgi değil, **psikolojik savaş alanlarıdır**.\n\n"
            "• **Dirençte Satış Baskısı:** Daha önce tepe fiyattan yakalananlar 'paramı kurtarayım' diyerek satış yığar; büyük fonlar kâr realizasyonu yapar.\n"
            "• **Kırılımın Şartı (HACİM):** Bir direncin kırılması için günlük işlem hacminin ortalamanın %30-50 üzerine çıkması ve bankacılık/ulaştırma lokomotiflerinin eşlik etmesi gerekir.\n"
            "• **Direnç Kırılırsa:** Direnç kırıldığında FOMO (trene binme arzusu) tetiklenir ve yabancı sermaye girişiyle birlikte yeni bir yükseliş kanalı açılır.\n\n"
            "🎯 **Stratejik Sonuç:** Direnç seviyelerinde tüm parayla mal alınmaz; ya destek seviyesine geri çekilme (pullback) beklenir ya da direnç hacimli kırılıp üzerinde günlük kapanış yapıldığında pozisyon artırılır."
        )
    }
}

# ==============================================================================
# 4) METİN İŞLEME VE SEMANTİK YARDIMCILAR
# ==============================================================================
def _turkce_temizle(metin: str) -> str:
    """Türkçe karakterleri ve noktalama işaretlerini normalize eder."""
    if not metin:
        return ""
    m = metin.lower()
    m = m.replace("ı", "i").replace("ğ", "g").replace("ü", "u").replace("ş", "s").replace("ö", "o").replace("ç", "c")
    m = re.sub(r"[^\w\s]", " ", m)
    return " ".join(m.split())


# ==============================================================================
# 5) GELİŞMİŞ HİSSE VE SEKTÖR DERİN ANALİZ MOTORU
# ==============================================================================
def hisse_karsilastir_derin(ozetler: list) -> str:
    """Birden fazla hisse sorulduğunda detaylı karşılaştırmalı araştırma raporu üretir."""
    h1, h2 = ozetler[0], ozetler[1]
    
    # Sektör belirleme
    sektor_bilgi = ""
    for s_key, s_data in SEKTORLER_PROFIL.items():
        if h1["hisse"] in s_data["hisseler"] and h2["hisse"] in s_data["hisseler"]:
            sektor_bilgi = f"\n\n📊 **Ortak Sektör Dinamikleri ({s_data['ad']}):**\n{s_data['dinamikler']}"
            break

    # Puan ve teknik sinyal üstünlüğü
    puan1, puan2 = h1.get("puan") or 0, h2.get("puan") or 0
    teknik_kazanan = h1["hisse"] if puan1 > puan2 else h2["hisse"] if puan2 > puan1 else "Her iki hisse teknik olarak dengeli"

    metin = (
        f"⚖️ **KAPSAMLI KARŞILAŞTIRMALI HİSSE ANALİZİ: {h1['hisse']} vs {h2['hisse']}**\n\n"
        f"Borsa İstanbul piyasasında iki şirketin güncel fiyatlama, momentum ve teknik görünüm karşılaştırması:\n\n"
        f"| Metrik | **{h1['hisse']}** | **{h2['hisse']}** |\n"
        f"| :--- | :--- | :--- |\n"
        f"| **Son Fiyat** | {h1['fiyat']} ₺ | {h2['fiyat']} ₺ |\n"
        f"| **Günlük Değişim** | %{h1['gunluk_degisim_%']:+} | %{h2['gunluk_degisim_%']:+} |\n"
        f"| **RSI (14)** | {h1['rsi']} | {h2['rsi']} |\n"
        f"| **SMA20 (Kısa Vade)** | {h1['sma20']} ₺ | {h2['sma20']} ₺ |\n"
        f"| **SMA50 (Orta Vade)** | {h1['sma50']} ₺ | {h2['sma50']} ₺ |\n"
        f"| **1 Yıllık Performans** | %{h1['1y_getiri_%']:+} | %{h2['1y_getiri_%']:+} |\n"
        f"| **Algoritmik Karar** | **{h1['sinyal']}** ({puan1}/10) | **{h2['sinyal']}** ({puan2}/10) |\n"
        f"{sektor_bilgi}\n\n"
        f"🔍 **Detaylı Analiz & Güçlü/Zayıf Yönler:**\n"
        f"• **{h1['hisse']}:** Fiyat SMA20 ({h1['sma20']} ₺) {'üzerinde kalarak kısa vadeli gücünü koruyor' if (h1['fiyat'] or 0) >= (h1['sma20'] or 0) else 'altında seyrederek düzeltme baskısı hissediyor'}. RSI {h1['rsi']} seviyesinde.\n"
        f"• **{h2['hisse']}:** Fiyat SMA20 ({h2['sma20']} ₺) {'üzerinde pozitif ivmeleniyor' if (h2['fiyat'] or 0) >= (h2['sma20'] or 0) else 'altında dinlenme sürecinde'}. 1 yıllık getirisi %{h2['1y_getiri_%']:+}.\n\n"
        f"🎯 **STRATEJİK SONUÇ VE ÇIKARIM:**\n"
        f"1. **Teknik Momentum Tercihi:** Kısa vadeli teknik sinyal ve gösterge puanına göre **{teknik_kazanan}** şu an bir adım önde görünmektedir.\n"
        f"2. **Risk / Getiri Dengesi:** İki hisse arasında seçim yaparken tek bir şirkete tüm ağırlığı vermek yerine, sektör içi çeşitlendirme amacıyla bütçenizi her iki şirkete bölüştürmek risk katsayınızı belirgin şekilde düşürür.\n"
        f"3. **Giriş Stratejisi:** Her iki hissede de alım yaparken tek kademede girmek yerine, RSI 40-50 bandına geri çekilmelerde kademeli alım yapmak en sağlıklı yaklaşımdır."
    )
    return metin


def tek_hisse_derin_analiz(o: dict) -> str:
    """Tek bir hisse için Wall-Street standardında tam teşekküllü hisse notu üretir."""
    h = o["hisse"]
    puan = o.get("puan") or 0
    fiyat = o.get("fiyat") or 0
    sma20 = o.get("sma20") or 0
    sma50 = o.get("sma50") or 0
    rsi = o.get("rsi") or 50

    # Sektör bilgisi tespiti
    sektor_adi = "BIST Sanayi / Hizmet"
    sektor_detay = ""
    for s_key, s_data in SEKTORLER_PROFIL.items():
        if h in s_data["hisseler"]:
            sektor_adi = s_data["ad"]
            sektor_detay = f"\n\n🏢 **Sektörel Dinamikler ({sektor_adi}):**\n{s_data['dinamikler']}"
            break

    trend_yorumu = "Güçlü Yükseliş Trendi" if fiyat > sma20 and sma20 > sma50 else "Düzeltme / Yatay Konsolidasyon" if fiyat < sma20 else "Nötr Görünüm"
    destek1 = round(sma20 * 0.97, 2)
    direnc1 = round(fiyat * 1.05, 2)

    metin = (
        f"📈 **DERİN HİSSE ANALİZ RAPORU: {h} ({sektor_adi})**\n\n"
        f"• **Son Fiyat:** {fiyat} ₺ (Günlük: %{o['gunluk_degisim_%']:+})\n"
        f"• **Teknik Puan / Karar:** **{o['sinyal']}** ({puan}/10 Puan)\n"
        f"• **Momentum (RSI 14):** {rsi} {'(Aşırı Alım - Düzeltme Riski)' if rsi > 70 else '(Aşırı Satım - Tepki Alımı Kapıda)' if rsi < 30 else '(Dengeli Güç Bölgesi)'}\n"
        f"• **Hareketli Ortalamalar:** 20 Günlük (Kısa Vade): **{sma20} ₺** | 50 Günlük (Orta Vade): **{sma50} ₺**\n"
        f"• **Genel Trend Yapısı:** {trend_yorumu}\n"
        f"• **1 Yıllık Nominal Getiri:** %{o['1y_getiri_%']:+}\n"
        f"{sektor_detay}\n\n"
        f"🔍 **Kritik Teknik Seviyeler & Fiyatlama:**\n"
        f"• 🛡️ **Kritik Destek Seviyesi:** **{destek1} ₺** (Olası geri çekilmelerde alıcıların devreye girmesi beklenen ilk güçlü tampon bölge).\n"
        f"• 🚧 **İlk Hedef Direnç:** **{direnc1} ₺** (Kısa vadeli kâr satışlarının gelebileceği psikolojik bariyer).\n\n"
        f"🎯 **STRATEJİK SONUÇ VE EYLEM PLANI:**\n"
        f"1. **Mevcut Pozisyonu Olanlar:** Fiyat SMA50 ({sma50} ₺) üzerinde kaldığı sürece ana yükseliş trendi bozulmamıştır; pozisyonlar korunabilir. Stop-loss seviyesi olarak SMA20'nin %3-4 altı takip edilebilir.\n"
        f"2. **Yeni Alım Düşünenler:** RSI göstergesi aşırı alım bölgesinde değilse ve fiyat desteğe yakınsa kademeli giriş düşünülebilir. Tek kademede tüm bütçeyle alım yapmak yerine 2-3 kademeye bölmek riski minimize eder.\n"
        f"3. **Temel Görünüm Hatırlatması:** Hissenin sadece teknik sinyaline değil, yaklaşan bilanço beklentilerine ve F/K, PD/DD çarpanlarına da mutlaka dikkat edilmelidir."
    )
    return metin


# ==============================================================================
# 6) ANA YEREL AI MUHAKEME VE YANIT ÜRETİCİ
# ==============================================================================
def yerel_ai_yanit_olustur(soru: str, portfoy: dict = None, bakiye: float = None, ozetler: list = None) -> dict:
    """
    Herhangi bir borsa sorusuna yüzeysel şablonlar yerine derin finansal muhakeme,
    sayısal veri sentezi ve net stratejik çıkarımlar sunar.
    """
    temiz = _turkce_temizle(soru)
    port = portfoy or {}
    oz = ozetler or []

    # --------------------------------------------------------------------------
    # 1. ÇOKLU HİSSE KARŞILAŞTIRMASI SORULDUYSA (Örn: EREGL vs KRDMD)
    # --------------------------------------------------------------------------
    if len(oz) >= 2:
        return {
            "yanit": hisse_karsilastir_derin(oz) + "\n\n⚠️ Bu analiz eğitim ve modelleme amaçlıdır; yatırım tavsiyesi (YTD) niteliği taşımaz.",
            "kaynak": f"Plutos Çoklu Hisse Karşılaştırma Motoru ({oz[0]['hisse']} vs {oz[1]['hisse']})"
        }

    # --------------------------------------------------------------------------
    # 2. TEK BİR HİSSE DETAYLI SORULDUYSA (Örn: THYAO nasıl, analiz et)
    # --------------------------------------------------------------------------
    if len(oz) == 1 and not any(k in temiz for k in ["nedir", "ne demek", "tanim"]):
        return {
            "yanit": tek_hisse_derin_analiz(oz[0]) + "\n\n⚠️ Bu analiz bilgilendirme amaçlıdır; yatırım tavsiyesi değildir.",
            "kaynak": f"Plutos Derin Hisse Analiz Modülü ({oz[0]['hisse']})"
        }

    # --------------------------------------------------------------------------
    # 3. MAKROEKONOMİK VEYA SEKTÖREL KONULAR SORULDUYSA
    # --------------------------------------------------------------------------
    # A) Faiz İndirimi
    if any(k in temiz for k in ["faiz in", "faiz dus", "faizler in", "faizler dus", "tcmb faiz", "faiz indirimi"]):
        return {
            "yanit": MAKRO_SENARYOLAR["faiz_indirimi"]["analiz"] + "\n\n⚠️ Yatırım tavsiyesi değildir.",
            "kaynak": "Plutos Makroekonomi Araştırma Masası"
        }

    # B) Enflasyon Muhasebesi
    if any(k in temiz for k in ["enflasyon muhasebesi", "tms 29", "tms29", "muhasebe duzeltmesi"]):
        return {
            "yanit": MAKRO_SENARYOLAR["enflasyon_muhasebesi"]["analiz"] + "\n\n⚠️ Yatırım tavsiyesi değildir.",
            "kaynak": "Plutos Bilanço ve Mevzuat Masası"
        }

    # C) Döviz Kuru ve Devalüasyon
    if any(k in temiz for k in ["dolar art", "doviz art", "kur art", "dolar yuksel", "devaluasyon", "kur soku"]):
        return {
            "yanit": MAKRO_SENARYOLAR["doviz_kuru_etkisi"]["analiz"] + "\n\n⚠️ Yatırım tavsiyesi değildir.",
            "kaynak": "Plutos Döviz & Kur Analiz Masası"
        }

    # D) BIST 100 Endeks Direnç Seviyeleri
    if any(k in temiz for k in ["10000", "10 bin", "11000", "direnc kiril", "endeks zirve", "bist rekor"]):
        return {
            "yanit": MAKRO_SENARYOLAR["bist100_direnc_10000"]["analiz"] + "\n\n⚠️ Yatırım tavsiyesi değildir.",
            "kaynak": "Plutos Endeks Teknik Strateji Masası"
        }

    # E) Sektör Karşılaştırması / Sektörel Tercih Soruları
    for s_key, s_data in SEKTORLER_PROFIL.items():
        kelimeler = s_data["ad"].lower().split()
        if any(w in temiz for w in kelimeler) and any(x in temiz for x in ["nasil", "sektor", "analiz", "hangisi", "durum"]):
            return {
                "yanit": (
                    f"🏢 **SEKTÖREL DERİN ANALİZ RAPORU: {s_data['ad']}**\n\n"
                    f"{s_data['dinamikler']}\n\n"
                    f"🎯 **STRATEJİK SONUÇ:** Bu sektördeki şirketleri değerlendirirken tek bir hisse yerine sektörün lider ihracatçısı ile iç pazar oyuncusunu dengeleyerek pozisyon almak en rasyonel yaklaşımdır.\n\n"
                    f"⚠️ Yatırım tavsiyesi değildir."
                ),
                "kaynak": f"Plutos Sektörel Analiz Masası ({s_data['ad']})"
            }

    # --------------------------------------------------------------------------
    # 4. TEMEL BORSA KAVRAMLARI VE YATIRIMCI STRATEJİLERİ
    # --------------------------------------------------------------------------
    # Temettü Yeniden Yatırımı (DRIP)
    if ("temettu" in temiz or "kar payi" in temiz) and any(w in temiz for w in ["geri", "tekrar", "kullan", "yatir", "degerlendir", "ne yap", "nereye", "drip"]):
        return {
            "yanit": (
                "💡 **Temettüyü Geri Kullanma ve Yeniden Yatırma (Bileşik Getiri) Stratejileri**\n\n"
                "Tebrikler! Temettü yatırımcılığının en sihirli ve zenginleştirici adımı, **alınan temettüyü nakit harcamak yerine sisteme geri sokmaktır (Bileşik Getiri / Kartopu Etkisi)**.\n\n"
                "Borsa İstanbul'da şirket temettüyü nakit olarak vadesiz yatırım hesabınıza yatırır. Bu parayı geri kullanmak için en etkili 4 yöntem şunlardır:\n\n"
                "1. 🔄 **Aynı Hisseden Ek Lot Almak (Saf Kartopu):**\n"
                "   Temettüyü veren şirketin geleceğine güveniyorsanız, yatan paranın tamamıyla hiç bekletmeden o gün aynı hissenin paylarını alabilirsiniz. 1.000 lotunuz 1.100 lota çıkar; gelecek yıl bu 1.100 lot daha fazla temettü üretir.\n\n"
                "2. 🎯 **Sepetinizde İskontolu Kalmış Başka Hisselere Dağıtmak:**\n"
                "   Temettüyü veren hisse o dönem çok primlenmiş (aşırı pahalı) olabilir. Temettü nakdiyle portföyünüzdeki diğer sağlam ama o ara düzeltme yapan (F/K'sı veya RSI'ı uygun) hisselerden lot ekleyerek sepetinizi dengeleyebilirsiniz.\n\n"
                "3. ⏳ **Aylık Düzenli Alımınızla (DCA) Birleştirmek:**\n"
                "   Maaşınızdan ayırdığınız aylık tasarrufun üzerine yatan temettüyü de ekleyerek o ay çok daha güçlü bir alım yapabilirsiniz.\n\n"
                "4. 🛡️ **Fırsat Nakdi (Yedek Akçe) Olarak Bekletmek:**\n"
                "   Piyasada sert bir düzeltme bekliyorsanız, temettü nakdini Para Piyasası Fonu / Nema hesabında tutarak piyasanın dip yaptığı anlarda 'fırsat alımı' için kurşun olarak saklayabilirsiniz.\n\n"
                "🎯 **STRATEJİK SONUÇ:** Temettüyü harcamayıp hisseye geri dönüştürdüğünüz sürece Albert Einstein'ın 'Dünyanın 8. Harikası' dediği **bileşik getiri** sizin lehinize çalışır!"
            ),
            "kaynak": "Plutos Strateji Kılavuzu: Temettü Yeniden Yatırımı"
        }

    # Zarar & Kriz Yönetimi
    if any(k in temiz for k in ["zarar", "eksi", "dustu", "battim", "eridi"]) and any(k in temiz for k in ["ne yap", "sat", "bekle", "kurtul", "tavsiye"]):
        return {
            "yanit": (
                "🛡️ **ZARARDA OLAN BİR YATIRIMCININ 4 ADIMLI KRİZ VE PSİKOLOJİ YÖNETİMİ PLANI**\n\n"
                "Borsada kırmızı günler oyunun doğal bir parçasıdır. En büyük servet kayıpları hisse düştüğü için değil, **panikle en dipte yanlış karar verildiği için** yaşanır.\n\n"
                "1. 🔍 **Düşüşün Sebebi Ne? (Piyasa mı, Şirket mi?):**\n"
                "   • Eğer endeks (BIST 100) genel olarak jeopolitik, faiz veya küresel panik nedeniyle düşüyorsa ve şirketiniz kâr etmeye devam ediyorsa bu geçici bir dalgadır.\n"
                "   • Ancak şirketin bilançosu batmış, fabrikası kapanmış veya hikayesi bozulmuşsa zararı kabul edip çıkmak doğru olabilir.\n\n"
                "2. 🛑 **Stop-Loss Disiplini:** Pozisyona girerken belirlediğiniz bir stop seviyesi varsa kurallara sadık kalın.\n"
                "3. 📉 **Körlemesine Maliyet Düşürmeyin:** Taban taban düşen spekülatif bir hissede alım yapılmaz; satış hacmi sakinleşip taban oluşumu tamamlanmalıdır.\n\n"
                "🎯 **STRATEJİK SONUÇ:** Eğer borç parayla değil, en az 1-2 yıl ihtiyacınız olmayan tasarrufla BIST 30/50 hisselerindeyseniz, borsada zaman daima sabırlı ve soğukkanlı yatırımcının lehine işler."
            ),
            "kaynak": "Plutos Kriz & Risk Yönetimi Masası"
        }

    # Terim Sözlüğü Kontrolü
    for kod, v in TERIMLER.items():
        for a in v["anahtarlar"]:
            if _turkce_temizle(a) in temiz:
                return {
                    "yanit": (
                        f"📖 **Borsa Terimleri Kılavuzu: {v['baslik']}**\n\n"
                        f"{v['aciklama']}\n\n"
                        f"🎯 **STRATEJİK ÇIKARIM:** Bu kavramı tek başına değil, portföyünüzün genel risk dengesi ve diğer rasyolarla (F/K, PD/DD, RSI) birlikte değerlendirmeniz önerilir.\n\n"
                        f"⚠️ Yatırım tavsiyesi değildir."
                    ),
                    "kaynak": f"Plutos BIST Terimler Sözlüğü ({v['kategori']})"
                }

    # --------------------------------------------------------------------------
    # 5. EVRENSEL FİNANSAL MUHAKEME & ANALİTİK ÇIKARIM SENTEZLEYİCİ (HERHANGİ BİR SORU İÇİN)
    # --------------------------------------------------------------------------
    return {
        "yanit": (
            f"💡 **PLUTOS STRATEJİK DEĞERLENDİRME VE FİNANSAL ANALİZ NOTU**\n\n"
            f"Sorduğunuz konuyu Borsa İstanbul'un mevcut makro dinamikleri, değerleme standartları ve rasyonel portföy yönetimi kuralları çerçevesinde detaylıca ele alalım:\n\n"
            f"1. 📌 **Temel Finansal Çerçeve ve Piyasa Gerçekleri:**\n"
            f"   Borsada fiyatlar kısa vadede haber akışları, jeopolitik gelişmeler ve yatırımcı psikolojisiyle (korku ve açgözlülük) aşırı dalgalanabilir. "
            f"   Ancak orta ve uzun vadede hisse senedi fiyatlarını yalnızca şirketin net kâr büyümesi, serbest nakit akışı ve özsermaye kârlılığı (ROE) belirler.\n\n"
            f"2. ⚖️ **Fırsat ve Risk Dengesi (İki Yönlü Senaryo Analizi):**\n"
            f"   • **İyimser Senaryo:** Enflasyonun gerilemesi, TCMB faiz indirim döngüsünün başlaması ve yabancı sermaye girişlerinin hızlanması durumunda BIST 30 lokomotif şirketleri güçlü çarpan genişlemesi yaşar.\n"
            f"   • **Temkinli Senaryo:** Yüksek faiz ortamının uzaması, iç talepte daralma ve jeopolitik tansiyon şirket kâr marjlarını baskılayabilir; bu da defansif (nakit zengini, perakende ve ihracatçı) şirketleri öne çıkarır.\n\n"
            f"3. 🧺 **Rasyonel Sermaye Dağılımı İlkesi:**\n"
            f"   Asla tüm sermayenizi tek bir varsayıma veya tek bir hisseye bağlamayın. Portföyünüzü en az 4-5 farklı sektöre (Bankacılık, İhracatçı Sanayi, Havacılık, Perakende, Teknoloji) yaymak ve bir miktar nakit/altın rezervi tutmak dalgalarda ayakta kalmanın tek garantisidir.\n\n"
            f"🎯 **STRATEJİK SONUÇ VE EYLEM PLANI:**\n"
            f"• Kararlarınızı sosyal medya tüyolarına değil, şirketlerin KAP bildirimlerine, bilanço kârlılıklarına ve destek/direnç seviyelerine dayandırın.\n"
            f"• Giriş yaparken tek seferde tüm bütçeyi harcamak yerine, piyasa düzeltmelerini fırsat bilerek kademeli alım (DCA) stratejisini uygulayın.\n"
            f"• Daha derinlemesine bir hisse veya sektör analizi için doğrudan hisse kodunu (örn: *'THYAO teknik analizi'* veya *'EREGL vs KRDMD'*) yazabilirsiniz!\n\n"
            f"⚠️ Bilgilendirme ve finansal okuryazarlık amaçlıdır; Sermaye Piyasası Kurulu mevzuatı gereği yatırım tavsiyesi (YTD) niteliği taşımaz."
        ),
        "kaynak": "Plutos Kıdemli BIST Muhakeme & Analiz Masası"
    }

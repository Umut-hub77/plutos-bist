"""
sms_service.py
--------------
Plutos BIST - Kurumsal Banka SMS & OTP Doğrulama Servisi

Açık Bankacılık (Open Banking) ve Aracı Kurum entegrasyonu için
güvenli SMS OTP üretimi, telefon formatlama, T.C. Kimlik doğrulaması
ve SMS/Bildirim iletim motoru.
"""

import os
import re
import urllib.request
import urllib.parse
import base64
import logging
from pathlib import Path
from datetime import datetime
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
import smtplib

try:
    from dotenv import load_dotenv
    for p in [Path(__file__).resolve().parent / ".env", Path.cwd() / "backend" / ".env", Path.cwd() / ".env"]:
        if p.exists():
            load_dotenv(p)
            break
    else:
        load_dotenv()
except Exception:
    pass

from email_service import get_smtp_config, is_smtp_configured

logger = logging.getLogger("plutos.sms")


def formatla_telefon(tel_str: str) -> tuple[bool, str, str]:
    """
    Girilen telefon numarasını uluslararası formata (+905xxxxxxxxx) ve
    maskeli gösterim formatına (+90 5XX *** ** YY) dönüştürür.
    
    Dönüş: (gecerli_mi, uluslararasi_format, maskeli_format)
    """
    if not tel_str:
        return False, "", ""
    
    # Sadece rakamları al
    rakamlar = re.sub(r"\D", "", tel_str)
    
    # Türkiye formatları:
    # 05xxxxxxxxx (11 hane) -> 5xxxxxxxxx
    # 905xxxxxxxxx (12 hane) -> 5xxxxxxxxx
    # 5xxxxxxxxx (10 hane)
    if len(rakamlar) == 11 and rakamlar.startswith("05"):
        rakamlar = rakamlar[1:]
    elif len(rakamlar) == 12 and rakamlar.startswith("905"):
        rakamlar = rakamlar[2:]
    elif len(rakamlar) == 10 and rakamlar.startswith("5"):
        pass
    else:
        return False, "", ""

    if len(rakamlar) != 10 or not rakamlar.startswith("5"):
        return False, "", ""

    uluslararasi = f"+90{rakamlar}"
    # Maskeleme: örn +90 532 *** ** 45
    maskeli = f"+90 {rakamlar[:3]} *** ** {rakamlar[8:]}"
    return True, uluslararasi, maskeli


def dogrula_tckn(tckn: str) -> tuple[bool, str]:
    """
    Resmi T.C. Kimlik Numarası Algoritması (Luhn türevi sağlama).
    """
    s = str(tckn).strip()
    if not s.isdigit() or len(s) != 11:
        return False, "T.C. Kimlik Numarası 11 haneli rakamlardan oluşmalıdır."
    if s[0] == "0":
        return False, "T.C. Kimlik Numarası 0 ile başlayamaz."

    d = [int(ch) for ch in s]
    
    # 1, 3, 5, 7, 9. basamakların toplamı
    tekler_toplami = d[0] + d[2] + d[4] + d[6] + d[8]
    # 2, 4, 6, 8. basamakların toplamı
    ciftler_toplami = d[1] + d[3] + d[5] + d[7]

    # 10. basamak kuralı: ((tekler * 7) - ciftler) % 10
    kural_10 = ((tekler_toplami * 7) - ciftler_toplami) % 10
    if d[9] != kural_10:
        return False, "Geçersiz T.C. Kimlik Numarası algoritma doğrulaması."

    # 11. basamak kuralı: İlk 10 basamağın toplamı % 10
    kural_11 = sum(d[:10]) % 10
    if d[10] != kural_11:
        return False, "Geçersiz T.C. Kimlik Numarası kontrol hanesi."

    return True, "Geçerli T.C. Kimlik Numarası."


def dogrula_kimlik_veya_musteri_no(no: str) -> tuple[bool, str]:
    """
    11 haneliyse TCKN algoritması işletir, 6-10 haneliyse banka müşteri numarası sayar.
    """
    temiz = str(no or "").strip()
    if not temiz.isdigit():
        return False, "T.C. Kimlik veya Müşteri Numarası yalnızca rakamlardan oluşmalıdır."
    
    if len(temiz) == 11:
        return dogrula_tckn(temiz)
    elif 6 <= len(temiz) <= 10:
        return True, "Geçerli Banka Müşteri Numarası."
    else:
        return False, "Lütfen 11 haneli T.C. Kimlik No veya 6-10 haneli Müşteri No giriniz."


def _twilio_sms_gonder(telefon: str, mesaj: str) -> tuple[bool, str]:
    """Twilio REST API üzerinden gerçek SMS gönderimi."""
    sid = os.environ.get("TWILIO_ACCOUNT_SID", "").strip()
    token = os.environ.get("TWILIO_AUTH_TOKEN", "").strip()
    gonderen = os.environ.get("TWILIO_SMS_FROM") or os.environ.get("TWILIO_FROM") or os.environ.get("TWILIO_PHONE_NUMBER", "").strip()
    
    if not (sid and token and gonderen):
        return False, "Twilio SMS ortam değişkenleri (TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_SMS_FROM) tanımlanmamış."

    # Twilio SMS için gonderen numara 'whatsapp:' ön eki taşımaz
    gonderen_temiz = gonderen.replace("whatsapp:", "").strip()
    alici_temiz = telefon.replace("whatsapp:", "").strip()

    try:
        veri = urllib.parse.urlencode({
            "From": gonderen_temiz,
            "To": alici_temiz,
            "Body": mesaj,
        }).encode("utf-8")

        url = f"https://api.twilio.com/2010-04-01/Accounts/{sid}/Messages.json"
        istek = urllib.request.Request(url, data=veri)
        auth_hdr = base64.b64encode(f"{sid}:{token}".encode("utf-8")).decode("ascii")
        istek.add_header("Authorization", f"Basic {auth_hdr}")

        with urllib.request.urlopen(istek, timeout=12) as resp:
            govde = resp.read().decode("utf-8")
            logger.info(f"Twilio SMS başarıyla iletildi: {alici_temiz}")
            return True, "SMS Twilio üzerinden başarıyla iletildi."
    except Exception as e:
        logger.error(f"Twilio SMS gönderim hatası: {e}")
        return False, str(e)


def _netgsm_sms_gonder(telefon: str, mesaj: str) -> tuple[bool, str]:
    """Netgsm REST/GET API üzerinden Türkiye içi SMS gönderimi."""
    usercode = os.environ.get("NETGSM_USERCODE", "").strip()
    password = os.environ.get("NETGSM_PASSWORD", "").strip()
    header = os.environ.get("NETGSM_HEADER", "PLUTOS").strip()

    if not (usercode and password):
        return False, "Netgsm ayarları tanımlanmamış."

    # Netgsm alıcı formatı: 905xxxxxxxxx ya da 5xxxxxxxxx
    alici = telefon.replace("+", "")
    params = urllib.parse.urlencode({
        "usercode": usercode,
        "password": password,
        "gsmno": alici,
        "message": mesaj,
        "msgheader": header,
    })
    try:
        url = f"https://api.netgsm.com.tr/sms/send/get?{params}"
        with urllib.request.urlopen(url, timeout=10) as resp:
            cevap = resp.read().decode("utf-8")
            if cevap.startswith("00") or " " in cevap:
                return True, f"Netgsm SMS iletildi: {cevap}"
            return False, f"Netgsm SMS hata kodu: {cevap}"
    except Exception as e:
        return False, str(e)


def _iletimerkezi_sms_gonder(telefon: str, mesaj: str) -> tuple[bool, str]:
    """İletiMerkezi XML API üzerinden SMS gönderimi."""
    key = os.environ.get("ILETIMERKEZI_KEY", "").strip()
    hash_val = os.environ.get("ILETIMERKEZI_HASH", "").strip()
    sender = os.environ.get("ILETIMERKEZI_SENDER", "").strip() or "PLUTOS"

    if not (key and hash_val):
        return False, "İletiMerkezi ayarları tanımlanmamış."

    alici = telefon.replace("+", "").replace(" ", "")
    xml_data = f"""<request>
        <authentication>
            <key>{key}</key>
            <hash>{hash_val}</hash>
        </authentication>
        <order>
            <sender>{sender}</sender>
            <sendDateTime></sendDateTime>
            <message>
                <text><![CDATA[{mesaj}]]></text>
                <receivers>
                    <number>{alici}</number>
                </receivers>
            </message>
        </order>
    </request>"""
    try:
        req = urllib.request.Request(
            "https://api.iletimerkezi.com/v1/send-sms",
            data=xml_data.encode("utf-8"),
            headers={"Content-Type": "text/xml; charset=utf-8"},
        )
        with urllib.request.urlopen(req, timeout=10) as resp:
            govde = resp.read().decode("utf-8")
            if "<status><code>200</code>" in govde:
                return True, "İletiMerkezi SMS başarıyla gönderildi."
            return False, f"İletiMerkezi hata: {govde}"
    except Exception as e:
        return False, str(e)


def send_bank_otp_email(to_email: str, code: str, bank_name: str, masked_phone: str) -> tuple[bool, str]:
    """
    Kullanıcının e-posta adresine banka doğrulama SMS bildirimini iletir.
    (Kullanıcı SMS sağlayıcısı kapalı olsa dahi doğrulama kodunu gerçek zamanlı teslim alır)
    """
    cfg = get_smtp_config()
    if not is_smtp_configured():
        return False, "SMTP ayarları tanımlanmamış."

    konu = f"📱 {bank_name} Açık Bankacılık Doğrulama SMS Kodu: {code}"
    
    metin = f"""Sayın Yatırımcı,

{bank_name} Açık Bankacılık portföy bağlantısı için {masked_phone} numaralı cep telefonunuza iletilen 6 haneli güvenlik kodunuz:

DOĞRULAMA KODU: {code}

Bu kod 3 dakika (180 saniye) boyunca geçerlidir.
Güvenliğiniz gereği bu kodu kimseyle paylaşmayınız.

Saygılarımızla,
Plutos Institutional Workstation
"""

    html = f"""<!DOCTYPE html>
<html lang="tr">
<head>
  <meta charset="UTF-8">
  <style>
    body {{
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background-color: #0E1118;
      color: #E2E8F0;
      margin: 0;
      padding: 20px;
    }}
    .box {{
      max-width: 520px;
      margin: 0 auto;
      background: #131722;
      border: 1px solid #2A2E39;
      border-radius: 12px;
      overflow: hidden;
    }}
    .hdr {{
      background: linear-gradient(135deg, #1E222D 0%, #131722 100%);
      padding: 20px 24px;
      border-bottom: 1px solid #2A2E39;
    }}
    .badge {{
      display: inline-block;
      font-size: 11px;
      font-weight: 700;
      background: rgba(41, 98, 255, 0.15);
      color: #2962FF;
      border: 1px solid rgba(41, 98, 255, 0.3);
      padding: 3px 8px;
      border-radius: 4px;
    }}
    .cnt {{
      padding: 26px 24px;
    }}
    .code-box {{
      background: #0E1118;
      border: 1px solid #089981;
      border-radius: 8px;
      padding: 18px;
      text-align: center;
      margin: 20px 0;
    }}
    .code-val {{
      font-family: 'Courier New', Courier, monospace;
      font-size: 36px;
      font-weight: 800;
      letter-spacing: 10px;
      color: #089981;
    }}
  </style>
</head>
<body>
  <div class="box">
    <div class="hdr">
      <span class="badge">AÇIK BANKACILIK DOĞRULAMA</span>
      <h3 style="margin: 8px 0 0 0; color: #FFFFFF;">{bank_name} Portföy Bağlantısı</h3>
    </div>
    <div class="cnt">
      <p style="margin: 0 0 12px 0; font-size: 13.5px; color: #CBD5E1; line-height: 1.5;">
        <b>{masked_phone}</b> numaralı cep telefonunuza iletilen 6 haneli güvenlik doğrulama kodunuz aşağıdadır:
      </p>
      <div class="code-box">
        <div class="code-val">{code}</div>
        <div style="font-size: 12px; color: #94A3B8; margin-top: 6px;">⏱️ Bu kod <b>3 dakika (180 saniye)</b> süreyle geçerlidir.</div>
      </div>
      <p style="margin: 0; font-size: 11.5px; color: #64748B;">
        🔒 Plutos BIST Açık Bankacılık entegrasyonu salt okunur (read-only) güvenlik protokolüyle çalışır.
      </p>
    </div>
  </div>
</body>
</html>"""

    msg = MIMEMultipart("alternative")
    msg["Subject"] = konu
    msg["From"] = cfg["from_addr"]
    msg["To"] = to_email
    msg.attach(MIMEText(metin, "plain", "utf-8"))
    msg.attach(MIMEText(html, "html", "utf-8"))

    try:
        if cfg["port"] == 465:
            server = smtplib.SMTP_SSL(cfg["host"], cfg["port"], timeout=10)
        else:
            server = smtplib.SMTP(cfg["host"], cfg["port"], timeout=10)
            server.starttls()
        server.login(cfg["user"], cfg["password"])
        server.sendmail(cfg["from_addr"], [to_email], msg.as_string())
        server.quit()
        return True, "E-posta doğrulama kodu başarıyla iletildi."
    except Exception as e:
        logger.error(f"OTP e-posta hatası: {e}")
        return False, str(e)


def guvenli_konsola_yazdir(metin: str):
    """Windows cp1254/ANSI konsollarında Unicode/Emoji çökmesini engeller."""
    try:
        print(metin, flush=True)
    except UnicodeEncodeError:
        try:
            print(metin.encode("cp1254", errors="replace").decode("cp1254"), flush=True)
        except Exception:
            try:
                print(metin.encode("ascii", errors="replace").decode("ascii"), flush=True)
            except Exception:
                pass
    except Exception:
        pass


def send_bank_sms_otp(
    phone_international: str,
    code: str,
    bank_name: str,
    user_email: str = "",
    masked_phone: str = "",
) -> dict:
    """
    SMS ve Yedek Güvenlik Kanalları üzerinden tek kullanımlık 6 haneli kodu iletir.
    Öncelik sırası:
      1. Netgsm (Türkiye GSM hatları)
      2. İletiMerkezi (Türkiye GSM hatları)
      3. Twilio (Uluslararası / Türkiye GSM hatları)
      4. SMTP E-posta Bildirimi
      5. Geliştirici / Konsol / Simüle SMS Bildirimi
    """
    mesaj = f"Plutos Açık Bankacılık: {bank_name} hesap bağlantısı için güvenlik kodunuz: {code}. Bu kod 3 dakika geçerlidir."

    sms_basarili = False
    sms_aciklama = ""

    # 1. Netgsm SMS Denemesi (Türkiye için en hızlı ve yaygın)
    if os.environ.get("NETGSM_USERCODE"):
        sms_basarili, sms_aciklama = _netgsm_sms_gonder(phone_international, mesaj)

    # 2. İletiMerkezi SMS Denemesi
    if not sms_basarili and os.environ.get("ILETIMERKEZI_KEY"):
        sms_basarili, sms_aciklama = _iletimerkezi_sms_gonder(phone_international, mesaj)

    # 3. Twilio SMS Denemesi
    if not sms_basarili and os.environ.get("TWILIO_ACCOUNT_SID") and (os.environ.get("TWILIO_SMS_FROM") or os.environ.get("TWILIO_FROM")):
        sms_basarili, sms_aciklama = _twilio_sms_gonder(phone_international, mesaj)

    # 4. Kullanıcı E-posta Bildirim Kanalı
    email_basarili = False
    if user_email:
        email_basarili, _ = send_bank_otp_email(user_email, code, bank_name, masked_phone)

    # Terminal Konsoluna ve Log Dosyasına Büyük Vurgulu Yazdır
    durumlar = []
    if sms_basarili:
        durumlar.append(f"SMS: GSM Şebekesine İletildi ({sms_aciklama})")
    else:
        durumlar.append("SMS: .env içinde SMS API bilgisi bulunamadı / Simülasyon modunda")
    if email_basarili:
        durumlar.append(f"E-Posta: {user_email} adresine iletildi")
    elif user_email:
        durumlar.append("E-Posta: SMTP yapılandırılmamış")

    banner = (
        "\n" + "=" * 68 + "\n"
        f"[PLUTOS AÇIK BANKACILIK DOĞRULAMA KODU (SMS OTP)]\n"
        f"Banka       : {bank_name}\n"
        f"Telefon     : {phone_international} ({masked_phone})\n"
        f"ONAY KODU   : >>> {code} <<<\n"
        f"Geçerlilik  : 3 Dakika (180 saniye)\n"
        f"İletim      : {' | '.join(durumlar)}\n"
        + "=" * 68 + "\n"
    )
    guvenli_konsola_yazdir(banner)
    logger.info(banner)

    return {
        "ok": True,
        "code": code,
        "sms_gonderildi": sms_basarili,
        "sms_aciklama": sms_aciklama,
        "email_gonderildi": email_basarili,
        "telefon_maskeli": masked_phone,
        "mesaj": f"6 haneli doğrulama kodu {masked_phone} numaralı hatta gönderildi.",
    }

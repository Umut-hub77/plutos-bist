"""
email_service.py
----------------
Plutos BIST - Kurumsal E-posta Doğrulama ve Bildirim Servisi

E-posta sağlayıcıları ile entegrasyonu (Gmail, Outlook, Brevo, SendGrid, Kurumsal SMTP)
standart smtplib üzerinden sağlar.

Ortam değişkenleri (.env):
    SMTP_HOST=smtp.gmail.com
    SMTP_PORT=587
    SMTP_USER=ornek@gmail.com
    SMTP_PASSWORD=uygulama_sifresi
    SMTP_FROM="Plutos BIST <ornek@gmail.com>"
"""

import os
import smtplib
import logging
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart

logger = logging.getLogger("plutos.email")


def get_smtp_config():
    return {
        "host": os.environ.get("SMTP_HOST", "").strip(),
        "port": int(os.environ.get("SMTP_PORT", "587")),
        "user": os.environ.get("SMTP_USER", "").strip(),
        "password": os.environ.get("SMTP_PASSWORD", "").strip(),
        "from_addr": os.environ.get("SMTP_FROM", "").strip() or os.environ.get("SMTP_USER", "").strip() or "noreply@plutos-bist.com",
    }


def is_smtp_configured() -> bool:
    cfg = get_smtp_config()
    return bool(cfg["host"] and cfg["user"] and cfg["password"])


def send_verification_email(to_email: str, code: str, user_name: str = "") -> tuple[bool, str]:
    """
    Kullanıcının e-posta adresine 6 haneli doğrulama kodunu HTML ve Metin olarak gönderir.
    Dönüş: (basarili: bool, aciklama: str)
    """
    cfg = get_smtp_config()

    if not is_smtp_configured():
        logger.warning(
            f"[SMTP AYARLANMAMIŞ] {to_email} için doğrulama kodu üretildi: {code} "
            "(Canlıda gerçek e-posta gönderimi için Render veya .env üzerinde SMTP_HOST/USER/PASSWORD tanımlayınız.)"
        )
        return False, "SMTP sunucu ayarları tanımlanmamış."

    hitap = f"Sayın {user_name}," if user_name else "Sayın Yatırımcı,"

    konu = f"Plutos BIST - E-Posta Doğrulama Kodunuz: {code}"

    metin_govde = f"""{hitap}

Plutos BIST Kurumsal İşlem & Portföy Masası'na hoş geldiniz.
Hesabınızı aktifleştirmek için aşağıdaki 6 haneli doğrulama kodunu giriniz:

KOD: {code}

Bu kod 10 dakika boyunca geçerlidir.
Eğer bu kaydı siz başlatmadıysanız bu e-postayı dikkate almayınız.

Saygılarımızla,
Plutos Institutional Workstation
https://plutos-bist.onrender.com
"""

    html_govde = f"""<!DOCTYPE html>
<html lang="tr">
<head>
  <meta charset="UTF-8">
  <style>
    body {{
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      background-color: #08080A;
      color: #E2E8F0;
      margin: 0;
      padding: 24px;
    }}
    .email-container {{
      max-width: 520px;
      margin: 0 auto;
      background-color: #131722;
      border: 1px solid #2A2E39;
      border-radius: 12px;
      overflow: hidden;
      box-shadow: 0 12px 30px rgba(0,0,0,0.5);
    }}
    .header {{
      background: linear-gradient(135deg, #0E1118 0%, #181C27 100%);
      padding: 24px 28px;
      border-bottom: 1px solid #2A2E39;
      display: flex;
      align-items: center;
    }}
    .brand {{
      font-size: 20px;
      font-weight: 800;
      letter-spacing: 1px;
      color: #FFFFFF;
    }}
    .badge {{
      display: inline-block;
      font-size: 10px;
      font-weight: 700;
      background: rgba(41, 98, 255, 0.15);
      color: #2962FF;
      border: 1px solid rgba(41, 98, 255, 0.35);
      padding: 2px 7px;
      border-radius: 4px;
      margin-left: 8px;
    }}
    .content {{
      padding: 32px 28px;
    }}
    .code-box {{
      background: #0E1118;
      border: 1px solid #2962FF;
      border-radius: 8px;
      padding: 20px;
      text-align: center;
      margin: 24px 0;
    }}
    .code-value {{
      font-family: 'Courier New', Courier, monospace;
      font-size: 34px;
      font-weight: 800;
      letter-spacing: 8px;
      color: #D7FF4E;
    }}
    .timer-note {{
      font-size: 12px;
      color: #94A3B8;
      margin-top: 8px;
    }}
    .footer {{
      background-color: #0E1118;
      padding: 16px 28px;
      border-top: 1px solid #1E222D;
      font-size: 11px;
      color: #64748B;
      text-align: center;
    }}
  </style>
</head>
<body>
  <div class="email-container">
    <div class="header">
      <span class="brand">PLUTOS</span>
      <span class="badge">INSTITUTIONAL WORKSTATION</span>
    </div>
    <div class="content">
      <h2 style="margin: 0 0 12px 0; font-size: 18px; color: #FFFFFF;">E-Posta Doğrulama Kodu</h2>
      <p style="margin: 0 0 14px 0; font-size: 14px; line-height: 1.6; color: #CBD5E1;">
        {hitap}<br>
        Plutos BIST Kurumsal İşlem Masası'na kaydınızı tamamlamak için aşağıdaki 6 haneli güvenlik kodunu kullanınız:
      </p>

      <div class="code-box">
        <div class="code-value">{code}</div>
        <div class="timer-note">⏱️ Bu kod <b>10 dakika</b> süreyle geçerlidir.</div>
      </div>

      <p style="margin: 0; font-size: 12px; line-height: 1.6; color: #94A3B8;">
        Güvenliğiniz için bu kodu kimseyle paylaşmayınız. Eğer bu hesabı siz açmadıysanız bu mesajı dikkate almayınız.
      </p>
    </div>
    <div class="footer">
      PLUTOS BIST TRADING WORKSTATION © 2026 • SSL-256 Kriptolu İletişim
    </div>
  </div>
</body>
</html>
"""

    msg = MIMEMultipart("alternative")
    msg["Subject"] = konu
    msg["From"] = cfg["from_addr"]
    msg["To"] = to_email

    msg.attach(MIMEText(metin_govde, "plain", "utf-8"))
    msg.attach(MIMEText(html_govde, "html", "utf-8"))

    try:
        if cfg["port"] == 465:
            server = smtplib.SMTP_SSL(cfg["host"], cfg["port"], timeout=10)
        else:
            server = smtplib.SMTP(cfg["host"], cfg["port"], timeout=10)
            server.starttls()

        server.login(cfg["user"], cfg["password"])
        server.sendmail(cfg["from_addr"], [to_email], msg.as_string())
        server.quit()
        logger.info(f"Doğrulama kodu {to_email} adresine başarıyla iletildi.")
        return True, "E-posta başarıyla iletildi."
    except Exception as e:
        logger.error(f"E-posta gönderim hatası ({to_email}): {e}")
        return False, str(e)

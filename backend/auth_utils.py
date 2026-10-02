"""
auth_utils.py
-------------
Lumina Quant - Güvenlik Katmanı

Bu modül iki şeyi merkezi hale getirir:
1) Şifre hash'leme: eski SHA256 (tuzsuz, kırılması kolay) yerine bcrypt (tuzlu, yavaş, sektör standardı).
   Geriye dönük uyumluluk için eski SHA256 hash'lerini de doğrulayabilir ve ilk başarılı
   girişte otomatik olarak bcrypt'e "yükseltir" (transparent migration) - kullanıcılar
   şifrelerini yeniden girmek zorunda kalmaz.
2) Sır (secret) yönetimi: Twilio SID/Token gibi bilgileri artık JSON dosyasına açık yazmak yerine
   .env dosyasından okur. .env asla git'e eklenmemeli (.gitignore'da).

Kullanım:
    from auth_utils import hash_password, verify_password, get_secret

    hashed = hash_password("gizliSifre123")
    verify_password("gizliSifre123", hashed)  # True/False

    tw_sid = get_secret("TWILIO_SID")
"""

import os
import hashlib
import bcrypt

try:
    from dotenv import load_dotenv
    load_dotenv()  # proje kökündeki .env dosyasını ortam değişkenlerine yükler
except ImportError:
    # python-dotenv kurulu değilse sessizce geç; os.environ yine de çalışır
    # (örn. Docker/production ortamında env değişkenleri zaten dışarıdan set edilir)
    pass


# ----------------------------------------------------------------------------
# 1) ŞİFRE HASH'LEME (bcrypt)
# ----------------------------------------------------------------------------

def hash_password(plain_password: str) -> str:
    """Yeni kayıtlar ve migration için bcrypt hash üretir."""
    salt = bcrypt.gensalt(rounds=12)
    return bcrypt.hashpw(plain_password.encode("utf-8"), salt).decode("utf-8")


def _legacy_sha256(plain_password: str) -> str:
    """Eski sistemin ürettiği hash ile aynı formatı üretir (sadece migration/karşılaştırma için)."""
    return hashlib.sha256(plain_password.encode("utf-8")).hexdigest()


def _looks_like_bcrypt(stored_hash: str) -> bool:
    return isinstance(stored_hash, str) and stored_hash.startswith(("$2b$", "$2a$", "$2y$"))


def verify_password(plain_password: str, stored_hash: str) -> bool:
    """
    Hem yeni (bcrypt) hem eski (sha256) formatı doğrular.
    Böylece mevcut users_master_db.json'daki kayıtlı kullanıcılar şifrelerini
    tekrar oluşturmak zorunda kalmadan sisteme girmeye devam edebilir.
    """
    if not stored_hash:
        return False
    if _looks_like_bcrypt(stored_hash):
        try:
            return bcrypt.checkpw(plain_password.encode("utf-8"), stored_hash.encode("utf-8"))
        except ValueError:
            return False
    # Eski format: sabit süreli olmayan karşılaştırma önemli değil (SHA256 zaten zayıf),
    # ama yine de hmac.compare_digest kullanmak iyi pratiktir.
    import hmac
    return hmac.compare_digest(_legacy_sha256(plain_password), stored_hash)


def needs_rehash(stored_hash: str) -> bool:
    """Bu hash hâlâ eski (zayıf) formatta mı? Girişten sonra otomatik yükseltme için kullanılır."""
    return not _looks_like_bcrypt(stored_hash)


# ----------------------------------------------------------------------------
# 2) SIR YÖNETİMİ (.env)
# ----------------------------------------------------------------------------

def get_secret(key: str, default: str = "") -> str:
    """
    Sırları ortam değişkenlerinden (.env) okur.
    JSON dosyasına açık metin yazmak yerine bu fonksiyonu kullan.
    """
    return os.environ.get(key, default)


REQUIRED_TWILIO_KEYS = ["TWILIO_SID", "TWILIO_TOKEN", "TWILIO_FROM"]


def twilio_configured() -> bool:
    return all(get_secret(k) for k in REQUIRED_TWILIO_KEYS)

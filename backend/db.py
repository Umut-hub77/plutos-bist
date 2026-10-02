"""
db.py
-----
Lumina Quant - Veritabanı Katmanı (Faz 1: JSON dosyası -> gerçek DB)

Neden gerekliydi:
- users_master_db.json tek dosyaydı; iki kullanıcı aynı anda yazınca (iki Streamlit
  oturumu / iki worker) veri kaybı riski vardı, eşzamanlı erişim/kilitleme yoktu.
- Sorgu, indeksleme, yedekleme, çoklu-worker deploy gibi "gerçek ürün" ihtiyaçları
  düz JSON dosyasıyla karşılanamaz.

Bu modül SQLAlchemy kullanır, böylece TEK satır değiştirerek veritabanını değiştirebilirsiniz:

    - Yerel geliştirme (varsayılan): SQLite -> lumina_quant.db (tek dosya, kurulum gerektirmez)
    - Üretim: .env dosyasında DATABASE_URL tanımlayın, örn:
        DATABASE_URL=postgresql://kullanici:sifre@host:5432/veritabani
      (Supabase kullanıyorsanız: Supabase panelinden "Connection string" kopyalayıp
       DATABASE_URL olarak .env'e yapıştırmanız yeterli.)

dashboard.py tarafında değişen HİÇBİR ŞEY YOK gibi davranır: load_master_db() /
save_master_db() fonksiyonları aynı eski JSON şeklini (dict of dict) döndürüp kabul
etmeye devam eder — sadece artık arkada gerçek bir veritabanı vardır. Bu sayede
mevcut UI kodu (giriş, kayıt, portföy CRUD) hiç değişmeden yeni DB'yi kullanır.
"""

import os
from sqlalchemy import create_engine, Column, String, JSON, DateTime
from sqlalchemy.orm import declarative_base, sessionmaker
from sqlalchemy.exc import SQLAlchemyError
from datetime import datetime, timezone

try:
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:
    pass

DATABASE_URL = os.environ.get("DATABASE_URL") or "sqlite:///lumina_quant.db"

# SQLite'a özgü ayar: aynı süreç içinde birden fazla thread'in (Streamlit + WhatsApp
# zamanlayıcı thread'i gibi) aynı bağlantıyı güvenle kullanabilmesi için gerekli.
_connect_args = {"check_same_thread": False} if DATABASE_URL.startswith("sqlite") else {}

engine = create_engine(DATABASE_URL, connect_args=_connect_args)
SessionLocal = sessionmaker(bind=engine, expire_on_commit=False)
Base = declarative_base()


class User(Base):
    __tablename__ = "users"

    email = Column(String, primary_key=True)
    ad = Column(String, nullable=False, default="")
    soyad = Column(String, nullable=False, default="")
    dt = Column(String, nullable=True)  # doğum tarihi, "YYYY-MM-DD" string olarak saklanıyor (mevcut formatla uyumlu)
    password = Column(String, nullable=False)  # bcrypt hash (bkz. auth_utils.py)
    watchlist = Column(JSON, nullable=False, default=list)
    portfolio = Column(JSON, nullable=False, default=dict)
    virtual_cash = Column(String, nullable=False, default="100000.0")  # Plutos demo (kağıt) işlem sanal bakiyesi
    trade_log = Column(JSON, nullable=False, default=list)             # Plutos demo işlem geçmişi
    price_alarms = Column(JSON, nullable=False, default=list)          # Plutos fiyat alarmları
    onboarding_gorundu = Column(String, nullable=False, default="")    # "1" ise ilk kullanım rehberi bir daha gösterilmez
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc),
                         onupdate=lambda: datetime.now(timezone.utc))


def _migrate_add_missing_columns():
    """
    SQLite'ta Base.metadata.create_all() mevcut bir tabloya YENİ KOLON eklemez
    (sadece tablo hiç yoksa oluşturur). Bu yüzden zaten var olan users tablosuna
    virtual_cash/trade_log/price_alarms kolonlarını elle (ALTER TABLE) ekliyoruz.
    Kolon zaten varsa hata sessizce yutulur (idempotent).
    """
    with engine.connect() as conn:
        for ddl in [
            "ALTER TABLE users ADD COLUMN virtual_cash VARCHAR DEFAULT '100000.0'",
            "ALTER TABLE users ADD COLUMN trade_log JSON DEFAULT '[]'",
            "ALTER TABLE users ADD COLUMN price_alarms JSON DEFAULT '[]'",
            "ALTER TABLE users ADD COLUMN onboarding_gorundu VARCHAR DEFAULT ''",
        ]:
            try:
                conn.exec_driver_sql(ddl)
                conn.commit()
            except Exception:
                pass  # kolon zaten var / farklı DB motoru -> yoksay


def init_db():
    """Tabloları oluşturur (yoksa) ve eksik kolonları ekler (varsa dokunmaz)."""
    Base.metadata.create_all(engine)
    _migrate_add_missing_columns()


def _user_to_legacy_dict(user: User) -> dict:
    """DB satırını, dashboard.py'nin beklediği eski JSON şekline çevirir."""
    return {
        "ad": user.ad,
        "soyad": user.soyad,
        "dt": user.dt,
        "password": user.password,
        "watchlist": user.watchlist or [],
        "portfolio": user.portfolio or {},
        "virtual_cash": float(user.virtual_cash) if user.virtual_cash not in (None, "") else 100000.0,
        "trade_log": user.trade_log or [],
        "price_alarms": user.price_alarms or [],
        "onboarding_gorundu": bool(user.onboarding_gorundu),
    }


def get_all_users_as_dict() -> dict:
    """
    Eski db_yukle()/load_master_db() ile aynı sözleşme:
    { "email@ornek.com": {"ad":..., "soyad":..., "dt":..., "password":..., "watchlist":[...], "portfolio":{...}}, ... }
    """
    init_db()
    session = SessionLocal()
    try:
        users = session.query(User).all()
        return {u.email: _user_to_legacy_dict(u) for u in users}
    except SQLAlchemyError:
        return {}
    finally:
        session.close()


def upsert_users_from_dict(db_dict: dict) -> None:
    """
    Eski db_kaydet()/save_master_db() ile aynı sözleşme: tüm dict'i alır,
    her kullanıcıyı DB'ye upsert eder (varsa günceller, yoksa oluşturur).
    """
    init_db()
    session = SessionLocal()
    try:
        for email, data in db_dict.items():
            user = session.get(User, email)
            if user is None:
                user = User(email=email)
                session.add(user)
            user.ad = data.get("ad", "")
            user.soyad = data.get("soyad", "")
            user.dt = data.get("dt")
            user.password = data.get("password", "")
            user.watchlist = data.get("watchlist", [])
            user.portfolio = data.get("portfolio", {})
            user.virtual_cash = str(data.get("virtual_cash", 100000.0))
            user.trade_log = data.get("trade_log", [])
            user.price_alarms = data.get("price_alarms", [])
            user.onboarding_gorundu = "1" if data.get("onboarding_gorundu") else ""
        session.commit()
    except SQLAlchemyError:
        session.rollback()
        raise
    finally:
        session.close()


def get_user(email: str):
    """Tek kullanıcıyı eski sözlük şeklinde döndürür, yoksa None."""
    init_db()
    session = SessionLocal()
    try:
        user = session.get(User, email)
        return _user_to_legacy_dict(user) if user else None
    finally:
        session.close()


def upsert_user(email: str, data: dict) -> None:
    """Tek kullanıcıyı upsert eder (tüm dict'i tekrar yazmak yerine hafif yol)."""
    upsert_users_from_dict({email: data})
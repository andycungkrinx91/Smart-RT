from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    APP_NAME: str = "Smart-RT"
    ENV: str = "dev"
    BASE_URL: str = "http://localhost:8000"

    SEED_DATA: bool = True
    SEED_SAMPLE_BLOG: bool = True

    SECRET_KEY: str = "changeme_dev_only"
    API_KEY: str | None = None
    JWT_ALG: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60

    DATABASE_URL: str = "postgresql+asyncpg://smart_rt:smart_rt@localhost:5432/smart_rt"
    # Database SSL
    # - Untuk Postgres: akan di-map ke parameter asyncpg `ssl`
    # - Untuk MySQL/MariaDB: akan di-map ke parameter driver `ssl`
    DB_SSL: bool = False

    # MySQL 8: sering perlu allow_public_key_retrieval jika SSL dimatikan
    MYSQL_ALLOW_PUBLIC_KEY_RETRIEVAL: bool = True

    # Backward compatibility
    POSTGRES_SSL: bool | None = None

    REDIS_URL: str = "redis://localhost:6379/0"
    REDIS_ENABLED: bool = True
    SESSION_TTL_SECONDS: int = 86400

    SAAS_DOMAIN: str = "smart-rt.id"

    DEFAULT_ADMIN_EMAIL: str = "admin@smart-rt.id"
    DEFAULT_ADMIN_PASSWORD: str = "admin12345"
    DEFAULT_ADMIN_NAME: str = "Administrator"

    IMAGE_STORAGE_ROOT: str = "/app/storage"
    IMAGE_PUBLIC_BASE: str = "/storage"
    IMAGE_MAX_BYTES: int = 5 * 1024 * 1024
    IMAGE_MAX_PIXELS: int = 25_000_000
    IMAGE_WEBP_QUALITY: int = 85
    IMAGE_RESIZE_RATIO: float = 1.0


settings = Settings()  # type: ignore[call-arg]

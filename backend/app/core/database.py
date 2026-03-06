from collections.abc import AsyncGenerator

from sqlalchemy.engine import URL, make_url
from sqlalchemy.pool import NullPool
from sqlalchemy.ext.asyncio import AsyncEngine, AsyncSession, async_sessionmaker, create_async_engine

from app.core.config import settings


def _build_connect_args(db_url: str) -> dict:
    url: URL = make_url(db_url)

    # DB_SSL dapat di-override oleh legacy POSTGRES_SSL jika diset
    db_ssl = settings.DB_SSL
    if settings.POSTGRES_SSL is not None:
        db_ssl = bool(settings.POSTGRES_SSL)

    backend = url.get_backend_name()
    connect_args: dict = {}

    if backend in ("postgresql", "postgres"):
        # asyncpg: ssl bisa bool atau SSLContext
        connect_args["ssl"] = bool(db_ssl)
        connect_args["timeout"] = 10
        return connect_args

    if backend in ("mysql", "mariadb"):
        # asyncmy/aiomysql: ssl None/False untuk disable
        connect_args["ssl"] = bool(db_ssl) if db_ssl else None
        return connect_args

    return connect_args


_url = make_url(settings.DATABASE_URL)
_backend = _url.get_backend_name()

engine: AsyncEngine = create_async_engine(
    settings.DATABASE_URL,
    pool_pre_ping=True,
    # Shared hosting DB (MySQL/MariaDB) sering limit koneksi; NullPool lebih aman.
    **({"poolclass": NullPool} if _backend in ("mysql", "mariadb") else {"pool_size": 2, "max_overflow": 5}),
    connect_args=_build_connect_args(settings.DATABASE_URL),
)

SessionLocal = async_sessionmaker(engine, expire_on_commit=False, class_=AsyncSession)


async def get_db() -> AsyncGenerator[AsyncSession, None]:
    async with SessionLocal() as session:
        yield session

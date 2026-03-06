from importlib import import_module
import time
from types import ModuleType
from typing import Protocol

redis_asyncio: ModuleType | None
try:
    redis_asyncio = import_module("redis.asyncio")
except ModuleNotFoundError:
    redis_asyncio = None

from app.core.config import settings


class RedisLike(Protocol):
    async def get(self, key: str) -> str | None: ...

    async def setex(self, key: str, ttl: int, value: str) -> bool | None: ...

    async def delete(self, key: str) -> int | None: ...


class InMemoryRedis:
    def __init__(self) -> None:
        self._store: dict[str, tuple[str, float]] = {}

    def _purge(self) -> None:
        now = time.time()
        expired = [k for k, (_, exp) in self._store.items() if exp <= now]
        for k in expired:
            self._store.pop(k, None)

    async def get(self, key: str) -> str | None:
        self._purge()
        item = self._store.get(key)
        if item is None:
            return None
        val, exp = item
        if exp <= time.time():
            self._store.pop(key, None)
            return None
        return val

    async def setex(self, key: str, ttl: int, value: str) -> bool:
        self._store[key] = (value, time.time() + ttl)
        return True

    async def delete(self, key: str) -> int:
        existed = 1 if key in self._store else 0
        self._store.pop(key, None)
        return existed


_redis: RedisLike | None = None


def get_redis() -> RedisLike:
    global _redis
    if _redis is None:
        primary: RedisLike
        if settings.REDIS_ENABLED and redis_asyncio is not None:
            redis_cls = getattr(redis_asyncio, "Redis", None)
            if redis_cls is not None:
                primary = redis_cls.from_url(settings.REDIS_URL, decode_responses=True)
            else:
                primary = InMemoryRedis()
        else:
            primary = InMemoryRedis()

        _redis = _ResilientRedis(primary)
    return _redis


class _ResilientRedis:
    def __init__(self, primary: RedisLike) -> None:
        self._primary: RedisLike = primary
        self._fallback: InMemoryRedis | None = None

    def _use_fallback(self) -> InMemoryRedis:
        if self._fallback is None:
            self._fallback = InMemoryRedis()
        return self._fallback

    async def get(self, key: str) -> str | None:
        try:
            return await self._primary.get(key)
        except Exception:  # noqa: BLE001
            return await self._use_fallback().get(key)

    async def setex(self, key: str, ttl: int, value: str) -> bool | None:
        try:
            return await self._primary.setex(key, ttl, value)
        except Exception:  # noqa: BLE001
            return await self._use_fallback().setex(key, ttl, value)

    async def delete(self, key: str) -> int | None:
        try:
            return await self._primary.delete(key)
        except Exception:  # noqa: BLE001
            return await self._use_fallback().delete(key)

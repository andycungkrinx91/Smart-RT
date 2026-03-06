from __future__ import annotations

import hashlib
import io
import logging
import os
import secrets
from dataclasses import dataclass
from pathlib import Path

from fastapi import HTTPException, UploadFile, status
from PIL import Image, UnidentifiedImageError

from app.core.config import settings

logger = logging.getLogger(__name__)


_ALLOWED_MIME_TYPES = {
    "image/jpeg",
    "image/png",
    "image/webp",
}
_MAGIC_BYTES = {
    "image/jpeg": (b"\xff\xd8\xff",),
    "image/png": (b"\x89PNG\r\n\x1a\n",),
}
_MAX_UPLOAD_BYTES = 5 * 1024 * 1024


@dataclass(frozen=True)
class StoredImage:
    image_url: str
    sha256: str
    mime_type: str
    size_bytes: int
    storage_path: Path


def _public_base_path() -> str:
    cleaned = settings.IMAGE_PUBLIC_BASE.strip()
    if not cleaned:
        return "/storage"
    return "/" + cleaned.strip("/")


def _validate_mime_type(content_type: str | None) -> str:
    mime_type = (content_type or "").split(";", 1)[0].strip().lower()
    if mime_type not in _ALLOWED_MIME_TYPES:
        raise HTTPException(status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE, detail="Tipe file tidak didukung")
    return mime_type


def _is_valid_webp_magic(raw: bytes) -> bool:
    return len(raw) >= 12 and raw[:4] == b"RIFF" and raw[8:12] == b"WEBP"


def _validate_magic_bytes(raw: bytes, mime_type: str) -> None:
    if mime_type == "image/webp":
        if not _is_valid_webp_magic(raw):
            raise HTTPException(status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE, detail="Magic bytes file tidak valid")
        return

    accepted = _MAGIC_BYTES.get(mime_type, ())
    if not any(raw.startswith(sig) for sig in accepted):
        raise HTTPException(status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE, detail="Magic bytes file tidak valid")


def _reencode_to_webp(raw: bytes) -> bytes:
    Image.MAX_IMAGE_PIXELS = settings.IMAGE_MAX_PIXELS
    try:
        with Image.open(io.BytesIO(raw)) as image:
            image.load()
            if image.width < 1 or image.height < 1:
                raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Dimensi gambar tidak valid")

            mode = "RGBA" if "A" in image.getbands() else "RGB"
            converted = image.convert(mode)

            resize_ratio = settings.IMAGE_RESIZE_RATIO
            if not (0 < resize_ratio <= 1):
                raise HTTPException(
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    detail="Konfigurasi IMAGE_RESIZE_RATIO tidak valid",
                )

            target_width = max(1, int(converted.width * resize_ratio))
            target_height = max(1, int(converted.height * resize_ratio))

            if target_width < converted.width or target_height < converted.height:
                converted = converted.resize((target_width, target_height), Image.Resampling.LANCZOS)

            output = io.BytesIO()
            converted.save(output, format="WEBP", quality=settings.IMAGE_WEBP_QUALITY, method=6)
            return output.getvalue()
    except HTTPException:
        raise
    except (UnidentifiedImageError, Image.DecompressionBombError, OSError, ValueError):
        raise HTTPException(status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE, detail="File gambar tidak valid")


def _safe_storage_root() -> Path:
    root = Path(settings.IMAGE_STORAGE_ROOT).resolve()
    root.mkdir(parents=True, exist_ok=True)
    try:
        os.chmod(root, 0o777)
    except OSError:
        logger.warning(
            "Gagal mengatur izin direktori storage: %s. "
            "Pastikan proses memiliki hak akses yang cukup.",
            root,
        )
    return root


def _sharded_relative_path(digest: str) -> Path:
    return Path("images") / digest[:2] / digest[2:4] / f"{digest}.webp"


def _write_atomic(target: Path, payload: bytes) -> None:
    if target.exists():
        return

    temp_file = target.parent / f".{target.name}.{secrets.token_hex(8)}.tmp"
    temp_file.write_bytes(payload)
    temp_file.replace(target)


async def store_uploaded_image(file: UploadFile) -> StoredImage:
    mime_type = _validate_mime_type(file.content_type)

    max_bytes = min(settings.IMAGE_MAX_BYTES, _MAX_UPLOAD_BYTES)
    raw = await file.read(max_bytes + 1)
    await file.close()

    if not raw:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="File gambar kosong")
    if len(raw) >= max_bytes:
        raise HTTPException(status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE, detail="Ukuran gambar harus < 5MB")

    _validate_magic_bytes(raw, mime_type)

    webp_bytes = _reencode_to_webp(raw)
    digest = hashlib.sha256(webp_bytes).hexdigest()
    rel_path = _sharded_relative_path(digest)

    root = _safe_storage_root()
    target_path = (root / rel_path).resolve()
    if root not in target_path.parents:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Path penyimpanan tidak valid")

    target_path.parent.mkdir(parents=True, exist_ok=True)
    _write_atomic(target_path, webp_bytes)

    image_url = f"{_public_base_path()}/{rel_path.as_posix()}"
    return StoredImage(
        image_url=image_url,
        sha256=digest,
        mime_type="image/webp",
        size_bytes=len(webp_bytes),
        storage_path=target_path,
    )

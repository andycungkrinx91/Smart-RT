from __future__ import annotations

from urllib.parse import urlparse

import bleach
from bleach.css_sanitizer import CSSSanitizer
from bleach.sanitizer import Cleaner


_css_sanitizer = CSSSanitizer(
    allowed_css_properties=[
        "color",
        "background",
        "background-color",
        "font-weight",
        "font-style",
        "text-align",
        "text-decoration",
        "border",
        "border-radius",
        "padding",
        "margin",
        "display",
        "width",
        "height",
        "max-width",
    ]
)


_cleaner = Cleaner(
    tags=[
        "div",
        "span",
        "p",
        "br",
        "h1",
        "h2",
        "h3",
        "h4",
        "h5",
        "h6",
        "ul",
        "ol",
        "li",
        "blockquote",
        "strong",
        "em",
        "u",
        "s",
        "code",
        "pre",
        "hr",
        "a",
        "img",
        "section",
        "article",
        "header",
        "footer",
        "figure",
        "figcaption",
        "video",
        "source",
        "iframe",
    ],
    attributes={
        "*": ["class", "style"],
        "a": ["href", "title", "target", "rel"],
        "img": ["src", "alt", "title", "width", "height", "loading"],
        "video": ["controls", "autoplay", "muted", "loop", "playsinline", "poster"],
        "source": ["src", "type"],
        "iframe": ["src", "width", "height", "allow", "allowfullscreen", "frameborder"],
    },
    protocols=["http", "https", "mailto"],
    strip=True,
    strip_comments=True,
    css_sanitizer=_css_sanitizer,
)


_allowed_iframe_hosts = {
    "www.youtube.com",
    "youtube.com",
    "www.youtube-nocookie.com",
    "youtube-nocookie.com",
    "player.vimeo.com",
}


def _sanitize_iframes(html: str) -> str:
    # bleach tidak validasi host iframe secara built-in.
    # Ini filter tambahan: hapus iframe dengan host non-allowlist.
    # Implementasi sederhana berbasis bleach linkifier + parsing manual.
    # Untuk robust parsing HTML, bisa upgrade ke lxml/beautifulsoup.
    def _filter_src(attrs, new=False):
        if attrs.get((None, "src")):
            src = attrs[(None, "src")]
            try:
                host = urlparse(src).hostname or ""
            except Exception:
                return None
            if host.lower() not in _allowed_iframe_hosts:
                return None
        return attrs

    return bleach.clean(
        html,
        tags=_cleaner.tags,
        attributes={**_cleaner.attributes, "iframe": _filter_src},
        protocols=_cleaner.protocols,
        strip=True,
        strip_comments=True,
        css_sanitizer=_css_sanitizer,
    )


def sanitize_html(html: str) -> str:
    cleaned = _cleaner.clean(html)
    cleaned = _sanitize_iframes(cleaned)
    return cleaned


def sanitize_css(css: str | None) -> str | None:
    if not css:
        return None
    # CSSSanitizer bekerja pada style attribute; untuk stylesheet, kita minimal strip karakter berbahaya.
    # Tetap pasang CSP untuk defense-in-depth.
    return css.replace("</style", r"<\/style")

"""IndexNow submission service (Requirement 14).

Уведомляет совместимые с IndexNow поисковые системы (включая Yandex) об
изменённых URL. Реализует:

- ``build_blogpost_urls(slug)`` — канонические абсолютные URL обеих локалей
  (R14.1, Property 22).
- ``submit_indexnow(urls)`` — отправка с повторами (до 3 попыток, тайм-аут 10 c
  на запрос; R14.3) и логированием полного провала без отката (R14.4).

Все сетевые вызовы обёрнуты так, чтобы сбой никогда не прерывал поток
публикации контента (save/delete).
"""

from __future__ import annotations

import logging

import requests
from django.conf import settings

logger = logging.getLogger(__name__)

# Канонический хост сайта (схема + хост), используется для построения
# абсолютных URL отправки в поисковые системы.
SITE_ORIGIN = "https://iamroot.pro"

# Поддерживаемые локали в порядке: ru, затем en.
LOCALES = ("ru", "en")

# Endpoint IndexNow. Общий шлюз ретранслирует отправку всем участвующим
# поисковым системам (включая Google и Yandex).
INDEXNOW_ENDPOINT = "https://api.indexnow.org/indexnow"

# Имя движка для диагностических логов при полном провале (R14.4).
ENGINE_NAME = "IndexNow"

# Параметры устойчивости отправки.
MAX_ATTEMPTS = 3
REQUEST_TIMEOUT_SECONDS = 10


def build_blogpost_urls(slug: str) -> list[str]:
    """Возвращает канонические абсолютные URL поста блога для обеих локалей.

    Например для ``slug="hello"``::

        ["https://iamroot.pro/ru/blog/hello", "https://iamroot.pro/en/blog/hello"]

    Validates: Requirements 14.1 (Property 22).
    """
    return [f"{SITE_ORIGIN}/{locale}/blog/{slug}" for locale in LOCALES]


def submit_indexnow(urls: list[str]) -> None:
    """Отправляет ``urls`` в IndexNow-совместимые поисковые системы.

    Выполняет до :data:`MAX_ATTEMPTS` попыток с тайм-аутом
    :data:`REQUEST_TIMEOUT_SECONDS` секунд на каждый запрос (R14.3). Если все
    попытки неуспешны, логирует затронутые URL и имя системы без отката
    публикации (R14.4). Любое исключение перехватывается, поэтому вызов
    никогда не прерывает поток публикации контента.

    Validates: Requirements 14.3, 14.4.
    """
    if not urls:
        return

    key = getattr(settings, "INDEXNOW_KEY", "") or ""
    if not key:
        logger.warning(
            "IndexNow submission skipped: INDEXNOW_KEY is not configured (urls=%s, engine=%s)",
            urls,
            ENGINE_NAME,
        )
        return

    # IndexNow требует хост без схемы.
    host = SITE_ORIGIN.split("://", 1)[-1]
    payload = {
        "host": host,
        "key": key,
        "keyLocation": f"{SITE_ORIGIN}/{key}.txt",
        "urlList": list(urls),
    }

    last_error: Exception | None = None
    for attempt in range(1, MAX_ATTEMPTS + 1):
        try:
            response = requests.post(
                INDEXNOW_ENDPOINT,
                json=payload,
                timeout=REQUEST_TIMEOUT_SECONDS,
            )
            response.raise_for_status()
            logger.info(
                "IndexNow submission succeeded on attempt %d (urls=%s, engine=%s)",
                attempt,
                urls,
                ENGINE_NAME,
            )
            return
        except requests.exceptions.RequestException as exc:
            last_error = exc
            logger.warning(
                "IndexNow submission attempt %d/%d failed (engine=%s): %s",
                attempt,
                MAX_ATTEMPTS,
                ENGINE_NAME,
                exc,
            )

    # Полный провал всех попыток — логируем URL + имя движка, без отката (R14.4).
    logger.error(
        "IndexNow submission failed after %d attempts (urls=%s, engine=%s): %s",
        MAX_ATTEMPTS,
        urls,
        ENGINE_NAME,
        last_error,
    )

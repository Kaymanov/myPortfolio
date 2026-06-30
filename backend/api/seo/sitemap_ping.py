"""Уведомление поисковых систем об обновлённом местоположении карты сайта.

Реализует критерий приёмки R14.6: при изменении опубликованного поста блога
Сайт уведомляет поисковые системы об обновлённом sitemap по адресу
https://iamroot.pro/sitemap.xml в течение 60 секунд с момента изменения.

Замечание о deprecation: классические "sitemap ping" эндпоинты Google
(`https://www.google.com/ping?sitemap=...`) и Bing были выведены из
эксплуатации в 2023 году. Современный механизм оповещения об обновлениях —
протокол IndexNow (см. `api/seo/indexnow.py`), который поддерживается Yandex,
Bing и рядом других систем. Тем не менее ряд поисковых систем по-прежнему
принимает GET-пинг карты сайта, поэтому здесь выполняется best-effort пинг
по совместимым эндпоинтам.

Главный инвариант: любая сетевая ошибка логируется и НИКОГДА не пробрасывается
вызывающему коду, чтобы не прерывать поток `save`/`delete` контента
(согласуется с принципом устойчивости R3.5 / R14.4).
"""

import logging

import requests

logger = logging.getLogger(__name__)

# Канонический адрес карты сайта (R14.6).
SITEMAP_URL = "https://iamroot.pro/sitemap.xml"

# Тайм-аут на один сетевой запрос, секунды. Короткий, чтобы не тормозить
# поток сохранения контента в админке.
PING_TIMEOUT = 5.0

# Совместимые с sitemap-ping эндпоинты. Большинство современных систем
# отказались от этого механизма в пользу IndexNow, поэтому список держим
# минимальным и расширяемым. Каждый элемент — шаблон URL с подстановкой
# адреса карты сайта.
_PING_ENDPOINTS = (
    "https://webmaster.yandex.com/ping?sitemap={sitemap}",
)


def ping_sitemap(sitemap_url: str = SITEMAP_URL) -> None:
    """Уведомляет поисковые системы об обновлённом местоположении карты сайта.

    Выполняет best-effort GET-пинг по совместимым эндпоинтам. Любая ошибка
    (тайм-аут, сеть, не-2xx статус) логируется и не прерывает поток вызова —
    функция всегда возвращает ``None`` и никогда не бросает исключений.

    Args:
        sitemap_url: Абсолютный URL карты сайта для уведомления.
            По умолчанию ``https://iamroot.pro/sitemap.xml`` (R14.6).
    """
    for template in _PING_ENDPOINTS:
        endpoint = template.format(sitemap=sitemap_url)
        try:
            response = requests.get(endpoint, timeout=PING_TIMEOUT)
            response.raise_for_status()
            logger.info(
                "Пинг карты сайта отправлен: endpoint=%s sitemap=%s",
                endpoint,
                sitemap_url,
            )
        except requests.exceptions.RequestException as exc:
            # Сбой пинга не критичен: основной механизм оповещения —
            # IndexNow. Логируем и продолжаем, не прерывая поток контента.
            logger.warning(
                "Не удалось отправить пинг карты сайта: endpoint=%s "
                "sitemap=%s error=%s",
                endpoint,
                sitemap_url,
                exc,
            )
        except Exception as exc:  # noqa: BLE001 - устойчивость превыше всего
            # Защита от любых непредвиденных ошибок (например, при
            # форматировании): поток save/delete не должен падать (R14.4).
            logger.error(
                "Непредвиденная ошибка при пинге карты сайта: "
                "endpoint=%s error=%s",
                endpoint,
                exc,
            )

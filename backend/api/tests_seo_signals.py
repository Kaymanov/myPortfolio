"""Тесты SEO-сервисов и сигналов ревалидации.

Покрывают:
- Property 22 (`build_blogpost_urls`) — канонические URL обеих локалей (R14.1).
- Property 8 (теги вебхука BlogPost) — набор тегов содержит `blogposts` и
  `blogpost-<slug>` (R3.6).
- Task 11.5 (примеры) — устойчивость `submit_indexnow`: 3 попытки, лог при
  полном провале, никогда не бросает; ранний выход при отсутствии ключа (R14.3, R14.4).
- Task 4.10 (примеры) — `trigger_nextjs_revalidation`: пустой секрет → без POST;
  сетевая ошибка не прерывает поток (R5.2, R3.1, R3.5).

Запуск: ``venv/bin/python -m pytest api/tests_seo_signals.py -q`` из каталога backend.
"""

from __future__ import annotations

import logging
from unittest import mock

import requests
from django.test import override_settings
from hypothesis import HealthCheck, given, settings as hyp_settings
from hypothesis import strategies as st

from api import signals
from api.models import BlogPost
from api.seo import indexnow


# ---------------------------------------------------------------------------
# Стратегии генерации
# ---------------------------------------------------------------------------

# URL-safe текст для slug: латиница, цифры и безопасные разделители.
URL_SAFE_ALPHABET = (
    "abcdefghijklmnopqrstuvwxyz"
    "ABCDEFGHIJKLMNOPQRSTUVWXYZ"
    "0123456789-_"
)
slug_strategy = st.text(alphabet=URL_SAFE_ALPHABET, min_size=1, max_size=120)


class _FakeBlogPost:
    """Минимальный двойник BlogPost для прогона сигнала без БД."""

    def __init__(self, slug: str, is_published: bool = False) -> None:
        self.slug = slug
        self.is_published = is_published


# ---------------------------------------------------------------------------
# Property 22: Канонические URL отправки в поисковые системы (R14.1)
# Feature: project-polish-and-seo-automation, Property 22
# ---------------------------------------------------------------------------

@given(slug=slug_strategy)
@hyp_settings(max_examples=200, deadline=None)
def test_property_22_build_blogpost_urls_returns_both_locales(slug: str) -> None:
    """Validates: Requirements 14.1

    Для любого slug `build_blogpost_urls` возвращает РОВНО два абсолютных
    канонических URL — ru и en — в фиксированном порядке.
    """
    urls = indexnow.build_blogpost_urls(slug)

    assert urls == [
        f"https://iamroot.pro/ru/blog/{slug}",
        f"https://iamroot.pro/en/blog/{slug}",
    ]


# ---------------------------------------------------------------------------
# Property 8: Теги вебхука BlogPost содержат список и конкретный пост (R3.6)
# Feature: project-polish-and-seo-automation, Property 8
# ---------------------------------------------------------------------------

@given(slug=slug_strategy)
@hyp_settings(
    max_examples=200,
    deadline=None,
    suppress_health_check=[HealthCheck.function_scoped_fixture],
)
@override_settings(
    FRONTEND_URL="https://iamroot.pro",
    REVALIDATION_SECRET="test-secret",
)
def test_property_8_blogpost_webhook_tags_contain_list_and_post(slug: str) -> None:
    """Validates: Requirements 3.6

    Для любого slug при post_save/post_delete BlogPost полезная нагрузка
    вебхука содержит и тег списка `blogposts`, и тег конкретного поста
    `blogpost-<slug>`.
    """
    instance = _FakeBlogPost(slug=slug, is_published=False)

    with mock.patch.object(signals, "requests") as fake_requests, mock.patch.object(
        signals, "submit_indexnow"
    ), mock.patch.object(signals, "ping_sitemap"):
        fake_requests.exceptions = requests.exceptions
        fake_requests.post.return_value.raise_for_status.return_value = None

        signals.revalidate_blogposts(sender=BlogPost, instance=instance)

        fake_requests.post.assert_called_once()
        payload = fake_requests.post.call_args.kwargs["json"]
        tags = set(payload["tags"])

    assert "blogposts" in tags
    assert f"blogpost-{slug}" in tags


# ---------------------------------------------------------------------------
# Task 11.5: устойчивость submit_indexnow (R14.3, R14.4)
# ---------------------------------------------------------------------------

@override_settings(INDEXNOW_KEY="test-key")
def test_submit_indexnow_retries_three_times_on_failure() -> None:
    """Validates: Requirements 14.3

    При постоянных сетевых ошибках submit_indexnow повторяет запрос ровно
    MAX_ATTEMPTS (3) раза и не бросает исключение.
    """
    urls = indexnow.build_blogpost_urls("retry-post")

    with mock.patch.object(
        indexnow.requests,
        "post",
        side_effect=requests.exceptions.ConnectionError("boom"),
    ) as post:
        # Не должно бросать.
        assert indexnow.submit_indexnow(urls) is None

    assert post.call_count == indexnow.MAX_ATTEMPTS == 3


@override_settings(INDEXNOW_KEY="test-key")
def test_submit_indexnow_logs_error_on_total_failure(caplog) -> None:
    """Validates: Requirements 14.4

    После исчерпания всех попыток логируется ошибка с URL и именем движка,
    при этом исключение не пробрасывается (поток публикации не откатывается).
    """
    urls = indexnow.build_blogpost_urls("fail-post")

    with mock.patch.object(
        indexnow.requests,
        "post",
        side_effect=requests.exceptions.Timeout("timeout"),
    ):
        with caplog.at_level(logging.ERROR, logger=indexnow.logger.name):
            assert indexnow.submit_indexnow(urls) is None

    error_records = [r for r in caplog.records if r.levelno == logging.ERROR]
    assert error_records, "Ожидался лог уровня ERROR при полном провале"
    message = error_records[-1].getMessage()
    assert indexnow.ENGINE_NAME in message
    assert "fail-post" in message


@override_settings(INDEXNOW_KEY="test-key")
def test_submit_indexnow_succeeds_without_retry_on_first_ok() -> None:
    """Validates: Requirements 14.3

    Успех с первой попытки прекращает повторы.
    """
    urls = indexnow.build_blogpost_urls("ok-post")

    with mock.patch.object(indexnow.requests, "post") as post:
        post.return_value.raise_for_status.return_value = None
        assert indexnow.submit_indexnow(urls) is None

    assert post.call_count == 1


@override_settings(INDEXNOW_KEY="")
def test_submit_indexnow_returns_early_without_key() -> None:
    """Validates: Requirements 14.3, 14.4

    При отсутствующем INDEXNOW_KEY функция возвращается рано, без сетевого
    запроса и без исключений.
    """
    urls = indexnow.build_blogpost_urls("no-key")

    with mock.patch.object(indexnow.requests, "post") as post:
        assert indexnow.submit_indexnow(urls) is None

    post.assert_not_called()


def test_submit_indexnow_empty_urls_is_noop() -> None:
    """Validates: Requirements 14.3

    Пустой список URL — no-op без сетевого запроса.
    """
    with mock.patch.object(indexnow.requests, "post") as post:
        assert indexnow.submit_indexnow([]) is None

    post.assert_not_called()


# ---------------------------------------------------------------------------
# Task 4.10: trigger_nextjs_revalidation (R5.2, R3.1, R3.5)
# ---------------------------------------------------------------------------

@override_settings(FRONTEND_URL="https://iamroot.pro", REVALIDATION_SECRET="")
def test_trigger_revalidation_empty_secret_skips_post() -> None:
    """Validates: Requirements 5.2

    При пустом REVALIDATION_SECRET вебхук отключён: POST не выполняется.
    """
    with mock.patch.object(signals.requests, "post") as post:
        signals.trigger_nextjs_revalidation(["blogposts"])

    post.assert_not_called()


@override_settings(FRONTEND_URL="", REVALIDATION_SECRET="test-secret")
def test_trigger_revalidation_empty_frontend_url_skips_post() -> None:
    """Validates: Requirements 5.2

    При пустом FRONTEND_URL вебхук отключён: POST не выполняется.
    """
    with mock.patch.object(signals.requests, "post") as post:
        signals.trigger_nextjs_revalidation(["blogposts"])

    post.assert_not_called()


@override_settings(FRONTEND_URL="https://iamroot.pro", REVALIDATION_SECRET="test-secret")
def test_trigger_revalidation_network_error_does_not_interrupt() -> None:
    """Validates: Requirements 3.1, 3.5

    Сетевая ошибка вебхука логируется и не прерывает поток — функция
    завершается нормально (возвращает None, без исключения).
    """
    with mock.patch.object(
        signals.requests,
        "post",
        side_effect=requests.exceptions.ConnectionError("down"),
    ) as post:
        # Не должно бросать.
        assert signals.trigger_nextjs_revalidation(["blogposts"]) is None

    post.assert_called_once()

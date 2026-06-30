"""Integration-тесты безопасности HTTP-уровня (R4.5, R4.6).

Проверяют два инварианта продакшен-конфигурации Django:

* R4.5 — запрос с заголовком ``Host``, отсутствующим в ``ALLOWED_HOSTS``,
  отклоняется (Django возвращает 400 ``DisallowedHost``). Принудительное
  применение ``ALLOWED_HOSTS`` происходит только при ``DEBUG = False``, поэтому
  тесты воспроизводят продакшен-режим через ``override_settings``.
* R4.6 — кросс-доменный запрос от источника, отсутствующего в
  ``CORS_ALLOWED_ORIGINS``, не получает заголовок ``Access-Control-Allow-Origin``,
  тогда как запрос от разрешённого источника — получает.

Замечание об окружении: оба инварианта реализуются на уровне middleware и
срабатывают ДО исполнения view, поэтому доступ к базе данных не требуется и
``@pytest.mark.django_db`` не используется.

* Отклонение по ``Host`` поднимает ``DisallowedHost`` в ``CommonMiddleware`` до
  диспетчеризации view, поэтому read-only DRF-эндпоинт не выполняет запрос к БД.
* Заголовки CORS добавляет ``corsheaders.middleware.CorsMiddleware``. Для
  preflight-запроса (``OPTIONS`` с ``Access-Control-Request-Method``) middleware
  возвращает ответ напрямую, не вызывая view, что также исключает обращение к БД.

Используется эндпоинт ``/api/skills/`` (его путь покрывается ``CORS_URLS_REGEX``).
"""

from django.test import Client, override_settings

SKILLS_ENDPOINT = "/api/skills/"
ALLOWED_ORIGIN = "https://iamroot.pro"
DISALLOWED_ORIGIN = "https://evil.example.com"


@override_settings(ALLOWED_HOSTS=["testserver"], DEBUG=False)
def test_disallowed_host_is_rejected():
    """R4.5: Host не из ALLOWED_HOSTS отклоняется со статусом 400."""
    client = Client()
    response = client.get(SKILLS_ENDPOINT, HTTP_HOST="evil.example.com")
    assert response.status_code == 400


@override_settings(ALLOWED_HOSTS=["testserver"], DEBUG=False)
def test_allowed_host_is_accepted():
    """R4.5 (контроль): разрешённый Host не отклоняется как DisallowedHost.

    Используется CORS-preflight (``OPTIONS``), который обслуживается middleware
    без обращения к view/БД, поэтому достаточно убедиться, что запрос не
    отклонён с 400.
    """
    client = Client()
    response = client.options(
        SKILLS_ENDPOINT,
        HTTP_HOST="testserver",
        HTTP_ACCESS_CONTROL_REQUEST_METHOD="GET",
        HTTP_ORIGIN=ALLOWED_ORIGIN,
    )
    assert response.status_code != 400


@override_settings(
    DEBUG=False,
    ALLOWED_HOSTS=["testserver"],
    CORS_ALLOW_ALL_ORIGINS=False,
    CORS_ALLOWED_ORIGINS=[ALLOWED_ORIGIN],
)
def test_cross_origin_from_disallowed_origin_has_no_cors_header():
    """R4.6: источник не из allow-list не получает Access-Control-Allow-Origin."""
    client = Client()
    response = client.options(
        SKILLS_ENDPOINT,
        HTTP_ACCESS_CONTROL_REQUEST_METHOD="GET",
        HTTP_ORIGIN=DISALLOWED_ORIGIN,
    )
    assert "Access-Control-Allow-Origin" not in response.headers


@override_settings(
    DEBUG=False,
    ALLOWED_HOSTS=["testserver"],
    CORS_ALLOW_ALL_ORIGINS=False,
    CORS_ALLOWED_ORIGINS=[ALLOWED_ORIGIN],
)
def test_cross_origin_from_allowed_origin_gets_cors_header():
    """R4.6 (контроль): разрешённый источник получает корректный CORS-заголовок."""
    client = Client()
    response = client.options(
        SKILLS_ENDPOINT,
        HTTP_ACCESS_CONTROL_REQUEST_METHOD="GET",
        HTTP_ORIGIN=ALLOWED_ORIGIN,
    )
    assert response.headers.get("Access-Control-Allow-Origin") == ALLOWED_ORIGIN

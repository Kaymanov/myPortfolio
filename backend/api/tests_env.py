"""Тесты для модуля конфигурации окружения ``core.env``.

Покрывает свойства корректности из дизайна
(Feature: project-polish-and-seo-automation):

- Property 9 — ``require_env`` собирает ВСЕ отсутствующие/пустые обязательные
  переменные и точно перечисляет их в ``MissingEnvError.missing`` (R4.2).
- Property 10 — ``get_bool`` возвращает ``True`` только при значении ``"True"``,
  иначе ``False`` (включая отсутствие и пустую строку) (R4.3).

Плюс smoke-тесты конфигурации для задачи 2.5: импорт ``core.settings`` и сбор
всех отсутствующих имён в ``require_env``.

Тесты не загрязняют реальный ``os.environ`` — все изменения окружения
выполняются через ``monkeypatch`` и автоматически откатываются.
"""

import os
from contextlib import contextmanager

from hypothesis import given, settings
from hypothesis import strategies as st

from core.env import MissingEnvError, get_bool, require_env


@contextmanager
def _patched_environ(set_vars=(), del_names=()):
    """Временно изменить ``os.environ`` и гарантированно восстановить его.

    Используется в property-тестах вместо function-scoped fixture
    ``monkeypatch`` (Hypothesis не сбрасывает такие fixture между примерами).
    Реальное окружение восстанавливается даже при исключении.
    """
    touched = list(del_names) + [name for name, _ in set_vars]
    saved = {name: os.environ.get(name) for name in touched}
    try:
        for name in del_names:
            os.environ.pop(name, None)
        for name, value in set_vars:
            os.environ[name] = value
        yield
    finally:
        for name, original in saved.items():
            if original is None:
                os.environ.pop(name, None)
            else:
                os.environ[name] = original


# Имена переменных-кандидатов: валидные идентификаторы окружения, уникальные и
# с префиксом, чтобы не пересекаться с реальными переменными процесса.
_env_name = st.text(
    alphabet=st.characters(whitelist_categories=("Lu", "Nd"), whitelist_characters="_"),
    min_size=1,
    max_size=12,
).map(lambda s: "TEST_ENV_" + s)

# Непустые значения, пригодные для os.environ: UTF-8 кодируемые, без null-байтов.
_non_empty_value = st.text(
    alphabet=st.characters(codec="utf-8", exclude_characters="\x00"),
    min_size=1,
    max_size=20,
).filter(lambda v: v != "")

# Произвольные строковые значения окружения (UTF-8 кодируемые, без null-байтов).
_env_value = st.text(
    alphabet=st.characters(codec="utf-8", exclude_characters="\x00"), max_size=30
)


# ---------------------------------------------------------------------------
# Property 9: require_env перечисляет ВСЕ отсутствующие обязательные переменные
# ---------------------------------------------------------------------------
@settings(max_examples=200)
@given(
    names=st.lists(_env_name, min_size=1, max_size=8, unique=True),
    # Для каждого имени решаем: задано непустым (True) или отсутствует/пусто (False).
    present_flags=st.lists(st.booleans(), min_size=1, max_size=8),
    # Если переменная "отсутствует" — может быть либо не задана, либо пустая строка.
    use_empty_string=st.booleans(),
    values=st.lists(_non_empty_value, min_size=1, max_size=8),
)
def test_require_env_reports_exact_missing_set(
    names, present_flags, use_empty_string, values
):
    """Feature: project-polish-and-seo-automation, Property 9.

    Для любого подмножества обязательных переменных, которое отсутствует или
    пусто, ``require_env`` бросает ``MissingEnvError``, и сообщённое множество
    имён ТОЧНО совпадает с множеством отсутствующих переменных (R4.2).
    """
    expected_missing = []
    set_vars = []
    for i, name in enumerate(names):
        present = present_flags[i % len(present_flags)]
        if present:
            set_vars.append((name, values[i % len(values)]))
        else:
            if use_empty_string:
                set_vars.append((name, ""))  # пустая строка трактуется как отсутствие
            # иначе оставляем переменную не заданной
            expected_missing.append(name)

    # Имена, которые должны отсутствовать (и не были выставлены в "").
    del_names = [n for n in names if n not in {k for k, _ in set_vars}]

    with _patched_environ(set_vars=set_vars, del_names=del_names):
        if expected_missing:
            try:
                require_env(*names)
                raise AssertionError(
                    "ожидалась MissingEnvError, но исключение не возникло"
                )
            except MissingEnvError as exc:
                # Сообщённое множество ТОЧНО равно множеству отсутствующих.
                assert set(exc.missing) == set(expected_missing)
        else:
            # Все переменные заданы непустыми — исключения быть не должно.
            result = require_env(*names)
            assert set(result.keys()) == set(names)


# ---------------------------------------------------------------------------
# Property 10: get_bool — True только при значении "True"
# ---------------------------------------------------------------------------
@settings(max_examples=200)
@given(value=_env_value)
def test_get_bool_true_only_for_exact_true_string(value):
    """Feature: project-polish-and-seo-automation, Property 10.

    Для любого строкового значения переменной окружения ``get_bool`` возвращает
    ``True`` только если значение равно ``"True"``, иначе ``False`` (R4.3).
    """
    name = "TEST_ENV_BOOL_FLAG"
    expected = value == "True"
    with _patched_environ(set_vars=[(name, value)]):
        assert get_bool(name) is expected


@settings(max_examples=200)
@given(default=st.booleans())
def test_get_bool_missing_uses_default(default):
    """Feature: project-polish-and-seo-automation, Property 10.

    Отсутствующая переменная возвращает ``True`` только если ``default is True``,
    иначе ``False`` (R4.3).
    """
    name = "TEST_ENV_BOOL_MISSING"
    with _patched_environ(del_names=[name]):
        assert get_bool(name, default=default) is (default is True)


# ---------------------------------------------------------------------------
# Example / smoke-тесты (задача 2.5)
# ---------------------------------------------------------------------------
def test_get_bool_empty_string_is_false(monkeypatch):
    """Пустая строка → False (R4.3)."""
    monkeypatch.setenv("TEST_ENV_BOOL_EMPTY", "")
    assert get_bool("TEST_ENV_BOOL_EMPTY") is False


def test_get_bool_common_truthy_values_are_false(monkeypatch):
    """Значения вроде "true"/"1"/"yes" НЕ дают True (консервативная трактовка)."""
    for raw in ("true", "TRUE", "1", "yes", "on", " True"):
        monkeypatch.setenv("TEST_ENV_BOOL_VARIANT", raw)
        assert get_bool("TEST_ENV_BOOL_VARIANT") is False
    monkeypatch.setenv("TEST_ENV_BOOL_VARIANT", "True")
    assert get_bool("TEST_ENV_BOOL_VARIANT") is True


def test_require_env_collects_all_missing_names(monkeypatch):
    """require_env собирает ВСЕ отсутствующие имена за один проход (R4.2)."""
    for name in ("AAA_MISSING", "BBB_PRESENT", "CCC_MISSING"):
        monkeypatch.delenv(name, raising=False)
    monkeypatch.setenv("BBB_PRESENT", "value")

    try:
        require_env("AAA_MISSING", "BBB_PRESENT", "CCC_MISSING")
        raise AssertionError("ожидалась MissingEnvError")
    except MissingEnvError as exc:
        assert set(exc.missing) == {"AAA_MISSING", "CCC_MISSING"}
        # Сообщение об ошибке перечисляет каждое отсутствующее имя.
        assert "AAA_MISSING" in str(exc)
        assert "CCC_MISSING" in str(exc)


def test_require_env_returns_values_when_all_present(monkeypatch):
    """Когда все переменные заданы непустыми — возвращается отображение значений."""
    monkeypatch.setenv("XXX_ONE", "1")
    monkeypatch.setenv("YYY_TWO", "two")
    result = require_env("XXX_ONE", "YYY_TWO")
    assert result == {"XXX_ONE": "1", "YYY_TWO": "two"}


def test_settings_module_imports():
    """core.settings импортируется без ошибок (env корректно прочитан) — задача 2.5."""
    from django.conf import settings

    # require_env прочитал security-critical переменные на этапе импорта.
    assert settings.SECRET_KEY
    assert isinstance(settings.ALLOWED_HOSTS, list)
    assert isinstance(settings.CORS_ALLOWED_ORIGINS, list)
    # CORS строго по allow-list.
    assert settings.CORS_ALLOW_ALL_ORIGINS is False
    # DEBUG — булево значение из get_bool.
    assert isinstance(settings.DEBUG, bool)

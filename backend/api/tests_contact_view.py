"""View-уровневые example-тесты контактного эндпоинта (R2.1, R2.5, R2.6, R6.5).

Эти тесты намеренно ГЕРМЕТИЧНЫ (без БД). В данном окружении тестовый
пользователь PostgreSQL не имеет права CREATE DATABASE, поэтому
``@pytest.mark.django_db`` и любой запуск, требующий создания тестовой БД,
завершается ошибкой («нет прав для создания базы данных»). Чтобы покрыть
серверную логику без живой БД, мы вызываем
``ContactMessageCreateView.perform_create`` напрямую с замоканным сериализатором
(``serializer.save()`` возвращает фейковый instance) и мокаем
``api.views.send_mail``.

Покрытие требований:

* R2.1 — сообщение сохраняется (``serializer.save()``) ДО отправки письма, то
  есть до формирования успешного ответа. Проверяется порядком вызовов.
* R2.5 — при сбое ``send_mail`` (исключение) сохранённый instance не меняется и
  исключение не пробрасывается (ответ остаётся успешным); сбой логируется через
  ``logger.error``.
* R2.6 — это клиентское требование (отключение полей/кнопки во время отправки).
  На сервере оно неприменимо (N/A): backend не управляет состоянием формы. Тест
  документирует это явно.
* R6.5 — троттлинг 5 запросов в сутки на IP. Полноценный интеграционный тест
  6-го отклонённого запроса требует прохождения через DRF-стек с БД (см. ниже),
  что недоступно без CREATE DATABASE. Поэтому здесь проверяется конфигурация
  троттла (``ContactRateThrottle.rate == '5/day'``) как инвариант, гарантирующий,
  что 6-й запрос за 24 ч будет отклонён.
"""

import logging
from unittest.mock import Mock, patch

from api.views import ContactMessageCreateView, ContactRateThrottle


def _make_fake_instance():
    """Фейковый сохранённый ContactMessage с полями, используемыми во view."""
    instance = Mock(name="ContactMessageInstance")
    instance.sender_alias = "neo"
    instance.return_node_ip = "10.0.0.1"
    instance.timestamp = "2024-01-01T00:00:00Z"
    instance.encrypted_payload = "payload"
    return instance


# --- R2.1: сохранение происходит до отправки письма (до успешного ответа) ---

def test_perform_create_saves_before_sending_email():
    """R2.1: serializer.save() вызывается ДО send_mail."""
    view = ContactMessageCreateView()
    instance = _make_fake_instance()

    serializer = Mock(name="serializer")
    serializer.save.return_value = instance

    # Общий объект-наблюдатель фиксирует порядок вызовов save и send_mail.
    call_order = Mock()
    serializer.save.side_effect = lambda *a, **k: (call_order.save(), instance)[1]

    with patch("api.views.send_mail") as send_mail_mock:
        send_mail_mock.side_effect = lambda *a, **k: call_order.send_mail()
        view.perform_create(serializer)

    # save должен быть зарегистрирован раньше send_mail.
    recorded = [c[0] for c in call_order.method_calls]
    assert recorded == ["save", "send_mail"], (
        f"Ожидался порядок ['save', 'send_mail'], получено {recorded}"
    )
    serializer.save.assert_called_once()
    send_mail_mock.assert_called_once()


def test_perform_create_sends_mail_with_fail_silently_false():
    """R2.1/R2.5 (контроль): на успехе send_mail вызывается один раз и логируется info."""
    view = ContactMessageCreateView()
    serializer = Mock(name="serializer")
    serializer.save.return_value = _make_fake_instance()

    with patch("api.views.send_mail") as send_mail_mock, \
            patch.object(logging.getLogger("api.views"), "info") as info_mock:
        view.perform_create(serializer)

    send_mail_mock.assert_called_once()
    # fail_silently=False, чтобы сбои доставки ловились (см. R2.5).
    assert send_mail_mock.call_args.kwargs.get("fail_silently") is False
    info_mock.assert_called_once()


# --- R2.5: сбой письма не теряет сохранённое сообщение и не пробрасывается ---

def test_perform_create_email_failure_does_not_propagate():
    """R2.5: исключение из send_mail не пробрасывается из perform_create."""
    view = ContactMessageCreateView()
    serializer = Mock(name="serializer")
    serializer.save.return_value = _make_fake_instance()

    with patch("api.views.send_mail", side_effect=Exception("SMTP down")):
        # Не должно подняться исключение — успешный ответ сохраняется.
        view.perform_create(serializer)

    # Сообщение всё равно было сохранено.
    serializer.save.assert_called_once()


def test_perform_create_email_failure_leaves_instance_untouched_and_logs_error():
    """R2.5: при сбое письма сохранённый instance не модифицируется, пишется logger.error."""
    view = ContactMessageCreateView()
    instance = _make_fake_instance()
    serializer = Mock(name="serializer")
    serializer.save.return_value = instance

    with patch("api.views.send_mail", side_effect=Exception("SMTP down")), \
            patch.object(logging.getLogger("api.views"), "error") as error_mock:
        view.perform_create(serializer)

    # После save() во view нет операций, изменяющих instance (нет .save()/setattr).
    instance.save.assert_not_called()
    instance.delete.assert_not_called()
    # Сбой доставки зафиксирован в логе приложения.
    error_mock.assert_called_once()


# --- R2.6: отключение элементов формы — клиентское поведение (N/A на сервере) ---

def test_r2_6_disable_form_elements_is_client_side_not_server():
    """R2.6: отключение полей/кнопки во время отправки — забота клиента (N/A для view).

    Backend не управляет состоянием формы и не возвращает признаков
    disabled-состояния; требование реализуется во фронтенд-компоненте формы.
    Тест документирует, что во view нет серверной логики для R2.6.
    """
    # perform_create оперирует только сохранением и письмом — без управления UI.
    import inspect

    source = inspect.getsource(ContactMessageCreateView.perform_create)
    assert "disabled" not in source.lower()


# --- R6.5: rate limit 5/day → 6-й запрос за 24 ч отклоняется ---

def test_contact_rate_throttle_rate_is_5_per_day():
    """R6.5: троттл настроен на 5 запросов в сутки.

    Полноценный интеграционный тест (отправка 6 HTTP-запросов и ожидание 429 на
    шестом) требует прохождения через DRF-view с обращением к БД при
    ``serializer.save()`` для первых пяти успешных запросов, что невозможно без
    права CREATE DATABASE в этом окружении. Конфигурация ``rate == '5/day'`` —
    инвариант, гарантирующий отклонение 6-го запроса за 24 часа: DRF
    ``AnonRateThrottle`` разрешает ровно ``num_requests`` (5) в окне ``duration``
    (1 день) и возвращает 429 на следующем.
    """
    throttle = ContactRateThrottle()
    assert ContactRateThrottle.rate == "5/day"
    # Парсинг rate в DRF: num_requests=5, duration=86400 c (24 ч).
    assert throttle.num_requests == 5
    assert throttle.duration == 24 * 60 * 60

"""Тесты устойчивости пинга карты сайта (R14.6).

Проверяют главный инвариант: ``ping_sitemap`` никогда не пробрасывает
исключения вызывающему коду, независимо от исхода сетевого запроса.
"""

from unittest import mock

import requests
from django.test import SimpleTestCase

from api.seo import sitemap_ping


class PingSitemapTests(SimpleTestCase):
    def test_successful_ping_does_not_raise(self):
        with mock.patch.object(sitemap_ping.requests, "get") as get:
            get.return_value.raise_for_status.return_value = None
            # Не должно бросать и должно вернуть None.
            self.assertIsNone(sitemap_ping.ping_sitemap())
            get.assert_called()

    def test_uses_default_sitemap_url(self):
        with mock.patch.object(sitemap_ping.requests, "get") as get:
            get.return_value.raise_for_status.return_value = None
            sitemap_ping.ping_sitemap()
            called_url = get.call_args.args[0]
            self.assertIn(sitemap_ping.SITEMAP_URL, called_url)

    def test_request_exception_is_swallowed(self):
        with mock.patch.object(
            sitemap_ping.requests,
            "get",
            side_effect=requests.exceptions.Timeout("boom"),
        ):
            # Сетевая ошибка не должна прерывать поток вызова.
            self.assertIsNone(sitemap_ping.ping_sitemap())

    def test_unexpected_exception_is_swallowed(self):
        with mock.patch.object(
            sitemap_ping.requests,
            "get",
            side_effect=ValueError("unexpected"),
        ):
            # Даже непредвиденная ошибка не должна пробрасываться (R14.4).
            self.assertIsNone(sitemap_ping.ping_sitemap())

    def test_custom_sitemap_url_is_used(self):
        custom = "https://iamroot.pro/custom-sitemap.xml"
        with mock.patch.object(sitemap_ping.requests, "get") as get:
            get.return_value.raise_for_status.return_value = None
            sitemap_ping.ping_sitemap(custom)
            self.assertIn(custom, get.call_args.args[0])

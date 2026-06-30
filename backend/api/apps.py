import logging

from django.apps import AppConfig
from django.conf import settings

logger = logging.getLogger(__name__)


class ApiConfig(AppConfig):
    name = 'api'

    def ready(self):
        import api.signals  # noqa

        # R5.2: при пустом REVALIDATION_SECRET вебхук ревалидации отключён.
        # Логируем это ровно один раз на этапе инициализации приложения,
        # а не на каждом сигнале. Per-call guard в signals.py сохраняется.
        if not getattr(settings, 'REVALIDATION_SECRET', None):
            logger.warning(
                "Revalidation webhook disabled: REVALIDATION_SECRET is not configured"
            )

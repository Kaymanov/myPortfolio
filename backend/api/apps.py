import logging

from django.apps import AppConfig
from django.conf import settings

logger = logging.getLogger(__name__)


class ApiConfig(AppConfig):
    name = 'api'
    # БД создана с BigAutoField (см. 0001_initial). Фиксируем тот же тип, чтобы
    # модель совпадала с реальной схемой — это убирает W042 и расхождение
    # "models have changes" без какой-либо миграции/альтерации таблиц.
    default_auto_field = 'django.db.models.BigAutoField'

    def ready(self):
        import api.signals  # noqa

        # R5.2: при пустом REVALIDATION_SECRET вебхук ревалидации отключён.
        # Логируем это ровно один раз на этапе инициализации приложения,
        # а не на каждом сигнале. Per-call guard в signals.py сохраняется.
        if not getattr(settings, 'REVALIDATION_SECRET', None):
            logger.warning(
                "Revalidation webhook disabled: REVALIDATION_SECRET is not configured"
            )

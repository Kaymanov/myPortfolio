#!/bin/sh
# Entrypoint бэкенда: применяет миграции и собирает статику перед стартом
# gunicorn. Запускается при каждом старте контейнера, поэтому новые миграции
# (например 0008 с SEO-полями) применяются автоматически после git pull +
# пересборки образа.
set -e

echo "[entrypoint] Применяю миграции БД..."
python manage.py migrate --noinput

echo "[entrypoint] Собираю статику..."
python manage.py collectstatic --noinput

echo "[entrypoint] Запускаю gunicorn..."
exec gunicorn core.wsgi:application \
  --bind 0.0.0.0:8000 \
  --workers 2 \
  --threads 4

# Аудит безопасности и рекомендации по проекту Portfolio

**Дата аудита:** 2026-03-26
**Проект:** iamroot.pro Portfolio (Django + Next.js)

---

## 1. КРИТИЧЕСКИЕ УЯЗВИМОСТИ БЕЗОПАСНОСТИ

### 1.1 Хардкод чувствительных данных в settings.py

**Файл:** `backend/core/settings.py`
**Уровень:** 🔴 КРИТИЧЕСКИЙ

```python
# Строка 29
SECRET_KEY = 'django-insecure-!&il@3pwro=yuqo4du#w84lg)-n@wqz75(^^@i=6di%qswcj0m'

# Строки 147-148
EMAIL_HOST_USER = 'akaymanov@schooltech.ru'
EMAIL_HOST_PASSWORD = 'onlkrxzgdpdqonuk'
```

**Проблемы:**
- SECRET_KEY скомпрометирован (публично в репозитории)
- Пароль от почтового сервера в открытом виде
- При утечке злоумышленник может подписывать сессионные cookie, сбрасывать пароли

**Рекомендации:**
1. Немедленно сменить SECRET_KEY
2. Сменить пароль почтового ящика
3. Перенести все секреты в переменные окружения:
```python
SECRET_KEY = os.environ.get('SECRET_KEY')
EMAIL_HOST_USER = os.environ.get('EMAIL_HOST_USER')
EMAIL_HOST_PASSWORD = os.environ.get('EMAIL_HOST_PASSWORD')
```
4. Добавить `.env` в `.gitignore`

---

### 1.2 Пароль базы данных в .env файле

**Файл:** `backend/.env`
**Уровень:** 🔴 КРИТИЧЕСКИЙ

```
USER_PASSWORD_BD="123"
```

**Проблемы:**
- Экстремально слабый пароль (3 символа)
- Хранится в тексте проекта
- Легко подбирается brute-force

**Рекомендации:**
1. Установить сложный пароль (минимум 16 символов)
2. Ограничить доступ PostgreSQL только на localhost
3. Создать отдельного пользователя БД с минимальными привилегиями

---

### 1.3 DEBUG = True в production-конфигурации

**Файл:** `backend/core/settings.py:32`
**Уровень:** 🟠 ВЫСОКИЙ

```python
DEBUG = True
```

**Проблемы:**
- При ошибках отображается полная трассировка стека
- Раскрывается структура проекта, пути, настройки
- Может привести к утечке SECRET_KEY и других секретов

**Рекомендации:**
```python
DEBUG = os.environ.get('DEBUG', 'False').lower() == 'true'
```

---

### 1.4 Недостаточная конфигурация ALLOWED_HOSTS

**Файл:** `backend/core/settings.py:34`
**Уровень:** 🟠 ВЫСОКИЙ

```python
ALLOWED_HOSTS = ['localhost', '127.0.0.1']
```

**Проблемы:**
- При деплое на реальный домен возникнут ошибки
- Отсутствует защита от HTTP Host header injection

**Рекомендации:**
```python
ALLOWED_HOSTS = os.environ.get('ALLOWED_HOSTS', 'localhost,127.0.0.1').split(',')
```

---

### 1.5 Отсутствие CSRF защиты для API

**Файл:** `backend/core/settings.py`
**Уровень:** 🟠 ВЫСОКИЙ

**Проблемы:**
- `CsrfViewMiddleware` включен, но для DRF API нужна дополнительная настройка
- Отсутствует `CSRF_COOKIE_SECURE = True` для HTTPS

**Рекомендации:**
```python
CSRF_COOKIE_SECURE = True
SESSION_COOKIE_SECURE = True
CSRF_COOKIE_HTTPONLY = True
```

---

## 2. ПРОБЛЕМЫ С ОТПРАВКОЙ EMAIL

### 2.1 Конфликт SSL/TLS настроек

**Файл:** `backend/core/settings.py:137-141`
**Уровень:** 🟡 СРЕДНИЙ

```python
EMAIL_BACKEND = 'django.core.mail.backends.smtp.EmailBackend'
EMAIL_HOST = 'smtp.yandex.ru'
EMAIL_PORT = 465
EMAIL_USE_SSL = True
EMAIL_USE_TLS = False
```

**Проблема:**
Порт 465 традиционно использует **implicit SSL**, но Django может некорректно обрабатывать эту конфигурацию в некоторых версиях.

**Рекомендации:**

**Вариант А (рекомендуемый для Яндекса):**
```python
EMAIL_PORT = 465
EMAIL_USE_SSL = True  # Implicit SSL для порта 465
EMAIL_USE_TLS = False
```

**Вариант Б (альтернативный):**
```python
EMAIL_PORT = 587
EMAIL_USE_SSL = False
EMAIL_USE_TLS = True  # Explicit STARTTLS для порта 587
```

---

### 2.2 Отсутствие обработки ошибок валидации

**Файл:** `backend/api/views.py:45-72`
**Уровень:** 🟡 СРЕДНИЙ

**Проблемы:**
1. Нет валидации email адреса отправителя перед отправкой
2. При ошибке SMTP сообщение всё равно сохраняется в БД
3. Отсутствует логирование ошибок (только print)
4. Нет retry-механизма для временных ошибок SMTP

**Рекомендации:**
```python
from django.core.exceptions import ValidationError
from django.core.validators import validate_email
import logging

logger = logging.getLogger(__name__)

def perform_create(self, serializer):
    instance = serializer.save()

    # Валидация email
    try:
        validate_email(instance.return_node_ip)
    except ValidationError:
        logger.error(f"Invalid email: {instance.return_node_ip}")
        instance.delete()
        return

    subject = f"[IAMROOT.PRO] Оповещение: Новый Payload от {instance.sender_alias}"
    message = f"""..."""

    try:
        send_mail(
            subject=subject,
            message=message,
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=[settings.ADMIN_EMAIL],
            fail_silently=False,
        )
        logger.info(f"Email sent to {settings.ADMIN_EMAIL}")
    except Exception as e:
        logger.error(f"SMTP Error: {type(e).__name__}: {e}")
        # Можно добавить повторную попытку через Celery
```

---

### 2.3 Отсутствие логирования

**Файл:** `backend/api/views.py`
**Уровень:** 🟡 СРЕДНИЙ

**Проблемы:**
- Использование `print()` вместо proper logging
- Невозможно отследить историю отправок в production
- Нет структурированного логирования ошибок

**Рекомендации:**
```python
# backend/core/settings.py
LOGGING = {
    'version': 1,
    'disable_existing_loggers': False,
    'handlers': {
        'file': {
            'level': 'ERROR',
            'class': 'logging.FileHandler',
            'filename': '/var/log/django/errors.log',
        },
    },
    'loggers': {
        'django': {
            'handlers': ['file'],
            'level': 'ERROR',
            'propagate': True,
        },
    },
}
```

---

## 3. ПРОБЛЕМЫ АРХИТЕКТУРЫ И КОНФИГУРАЦИИ

### 3.1 CORS конфигурация

**Файл:** `backend/core/settings.py:36-38`
**Уровень:** 🟡 СРЕДНИЙ

```python
CORS_ALLOWED_ORIGINS = [
    "http://localhost:3000",
]
```

**Проблемы:**
- Не настроено для production домена
- Отсутствует `CORS_ALLOW_CREDENTIALS` если нужна авторизация

**Рекомендации:**
```python
CORS_ALLOWED_ORIGINS = os.environ.get(
    'CORS_ALLOWED_ORIGINS',
    'http://localhost:3000'
).split(',')

# Для production
CORS_ALLOW_CREDENTIALS = True
CORS_ALLOW_HEADERS = [
    'accept',
    'accept-encoding',
    'authorization',
    'content-type',
    'origin',
    'user-agent',
    'x-csrftoken',
]
```

---

### 3.2 Hardcoded BASE_URL в frontend

**Файл:** `frontend/src/lib/api.ts:2`
**Уровень:** 🟡 СРЕДНИЙ

```typescript
const BASE_URL = "http://127.0.0.1:8000/api";
```

**Проблемы:**
- Не работает в production
- Контактная форма использует `process.env.NEXT_PUBLIC_API_URL`, а остальные API - нет

**Рекомендации:**
```typescript
const BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000/api";

export async function getSkills() {
  const res = await fetch(`${BASE_URL}/skills/`, {
    next: { revalidate: 3600 },
  });
  // ...
}
```

---

### 3.3 Отсутствие rate limiting настроек

**Файл:** `backend/api/views.py:37-38`
**Уровень:** 🟡 СРЕДНИЙ

```python
class ContactRateThrottle(AnonRateThrottle):
    rate = '5/day'
```

**Проблемы:**
- Лимит только для анонимных пользователей
- Нет глобального throttle для API
- 5 запросов в день - может быть слишком мало для тестирования

**Рекомендации:**
```python
# backend/core/settings.py
REST_FRAMEWORK = {
    'DEFAULT_THROTTLE_CLASSES': [
        'rest_framework.throttling.AnonRateThrottle',
        'rest_framework.throttling.UserRateThrottle',
    ],
    'DEFAULT_THROTTLE_RATES': {
        'anon': '100/hour',
        'user': '1000/hour',
        'contact': '10/hour',  # Специфично для контактной формы
    }
}

# backend/api/views.py
class ContactRateThrottle(AnonRateThrottle):
    scope = 'contact'  # Использует rate из settings
```

---

### 3.4 Отсутствие пагинации

**Файл:** `backend/api/views.py`
**Уровень:** 🟢 НИЗКИЙ

**Проблемы:**
- При большом количестве записей API будет возвращать всё сразу
- Нет `page_size` настройки

**Рекомендации:**
```python
# backend/core/settings.py
REST_FRAMEWORK = {
    'DEFAULT_PAGINATION_CLASS': 'rest_framework.pagination.PageNumberPagination',
    'PAGE_SIZE': 20,
}
```

---

## 4. МОДЕЛИ ДАННЫХ

### 4.1 Experience.date_range тип данных

**Файл:** `backend/api/models.py:38`
**Уровень:** 🟢 НИЗКИЙ

```python
date_range = models.DateField()
```

**Проблемы:**
- Поле называется `date_range` но имеет тип `DateField` (одна дата)
- Для периода работы нужны два поля: `start_date` и `end_date`

**Рекомендации:**
```python
start_date = models.DateField()
end_date = models.DateField(null=True, blank=True)  # null = работает сейчас
```

---

### 4.2 Отсутствие индексов

**Файл:** `backend/api/models.py`
**Уровень:** 🟢 НИЗКИЙ

**Проблемы:**
- Нет индексов на часто используемых полях
- `BlogPost.slug` имеет `unique=True` но явный индекс ускорит поиск

**Рекомендации:**
```python
class BlogPost(models.Model):
    slug = models.SlugField(max_length=200, unique=True, db_index=True)

class ContactMessage(models.Model):
    timestamp = models.DateTimeField(auto_now_add=True, db_index=True)
    is_processed = models.BooleanField(default=False, db_index=True)
```

---

### 4.3 ContactMessage.encrypted_payload

**Файл:** `backend/api/models.py:79`
**Уровень:** 🟡 СРЕДНИЙ

**Проблемы:**
- Поле называется `encrypted_payload` но данные НЕ шифруются
- Вводящее в заблуждение название

**Рекомендации:**
1. Переименовать в `message` или `payload`
2. ИЛИ реализовать реальное шифрование:
```python
from cryptography.fernet import Fernet

class ContactMessage(models.Model):
    _encrypted_payload = models.TextField(db_column='encrypted_payload')

    @property
    def encrypted_payload(self):
        return self._encrypted_payload

    @encrypted_payload.setter
    def encrypted_payload(self, value):
        f = Fernet(os.environ.get('ENCRYPTION_KEY'))
        self._encrypted_payload = f.encrypt(value.encode()).decode()

    def get_decrypted_payload(self):
        f = Fernet(os.environ.get('ENCRYPTION_KEY'))
        return f.decrypt(self._encrypted_payload.encode()).decode()
```

---

## 5. FRONTEND ПРОБЛЕМЫ

### 5.1 Обработка ошибок формы

**Файл:** `frontend/src/components/ContactTerminal.tsx:40-54`
**Уровень:** 🟡 СРЕДНИЙ

**Проблемы:**
- Общие сообщения об ошибках без конкретики
- Нет отображения ошибок валидации от сервера
- `alert()` вместо UI-компонента

**Рекомендации:**
```typescript
const [error, setError] = useState<string | null>(null);

// В handleSubmit:
if (!response.ok) {
  const data = await response.json();
  setError(data.detail || 'Transmission failed');
  return;
}
```

---

### 5.4 Отсутствие HTTPS проверки

**Файл:** `frontend/src/lib/api.ts`
**Уровень:** 🟡 СРЕДНИЙ

**Проблемы:**
- HTTP URL для API в production
- Данные формы отправляются в открытом виде

**Рекомендации:**
- Использовать HTTPS в production
- Настроить редирект HTTP → HTTPS на уровне reverse proxy (nginx)

---

## 6. ОТКУДА БЕРУТСЯ ДАННЫЕ ДЛЯ БЛОГА

### 6.1 BlogPost модель и админка

**Файл:** `backend/api/admin.py` (не прочитан, но требуется проверка)

**Рекомендации:**
Убедитесь, что `BlogPost` зарегистрирован в admin.py:
```python
from django.contrib import admin
from .models import BlogPost

@admin.register(BlogPost)
class BlogPostAdmin(admin.ModelAdmin):
    list_display = ['title', 'slug', 'created_at', 'is_published']
    list_filter = ['is_published', 'created_at']
    search_fields = ['title', 'content']
    prepopulated_fields = {'slug': ('title',)}
```

---

## 7. ДОПОЛНИТЕЛЬНЫЕ РЕКОМЕНДАЦИИ

### 7.1 Требования к зависимостям

**Отсутствует:** `requirements.txt`

**Рекомендации:**
Создайте файл `backend/requirements.txt`:
```
Django==6.0.3
djangorestframework==3.17.0
django-cors-headers==4.9.0
Pillow==12.1.1
psycopg2-binary==2.9.10
python-dotenv==1.0.0
gunicorn==21.2.0  # для production
```

---

### 7.2 .gitignore

**Рекомендации:**
Убедитесь, что в `.gitignore` есть:
```
# Environment
.env
venv/
.venv/

# IDE
.vscode/
.idea/

# Python
__pycache__/
*.py[cod]
*.mo

# Django
*.log
db.sqlite3

# Media
media/

# Next.js
.next/
node_modules/
```

---

### 7.3 Production чеклист

Перед деплоем:

- [ ] Сменить все пароли и SECRET_KEY
- [ ] Установить `DEBUG = False`
- [ ] Настроить `ALLOWED_HOSTS` для домена
- [ ] Включить HTTPS
- [ ] Настроить сбор статических файлов (`collectstatic`)
- [ ] Настроить логирование
- [ ] Установить rate limiting
- [ ] Настроить backup базы данных
- [ ] Протестировать отправку email
- [ ] Проверить CORS для production домена

---

## 8. ПОЧЕМУ НЕ ОТПРАВЛЯЕТСЯ EMAIL - ДИАГНОСТИКА

### Возможные причины:

1. **Неправильный пароль приложения Яндекс**
   - Для Яндекса нужно создавать "пароль приложения" в настройках аккаунта
   - Обычный пароль от почты не подойдёт

2. **Блокировка портов фаерволом**
   ```bash
   # Проверьте доступность порта
   telnet smtp.yandex.ru 465
   # или
   nc -zv smtp.yandex.ru 465
   ```

3. **Проблема с SSL контекстом**
   - Попробуйте добавить в settings.py:
   ```python
   EMAIL_SSL_CERTFILE = None
   EMAIL_SSL_KEYFILE = None
   ```

4. **Лимиты отправки Яндекса**
   - Бесплатные аккаунты имеют лимиты на отправку
   - Проверьте статус аккаунта

5. **Ошибка в коде не логируется**
   - Замените `print()` на logging
   - Проверьте логи Django при отправке формы

### Команды для диагностики:

```bash
# Проверка подключения к SMTP
openssl s_client -connect smtp.yandex.ru:465

# Тест отправки через Django shell
cd backend
source venv/bin/activate
python manage.py shell
```

```python
from django.core.mail import send_mail
from django.conf import settings

try:
    send_mail(
        subject='Тестовое сообщение',
        message='Это тестовое письмо',
        from_email=settings.DEFAULT_FROM_EMAIL,
        recipient_list=[settings.ADMIN_EMAIL],
        fail_silently=False,
    )
    print("Письмо отправлено успешно!")
except Exception as e:
    print(f"Ошибка: {e}")
```

---

## 9. ПРИОРИТЕТЫ ИСПРАВЛЕНИЙ

### 🔴 Критические (исправить немедленно):
1. Сменить SECRET_KEY и пароль почты
2. Убрать хардкод пароля БД ("123")
3. Перенести секреты в переменные окружения

### 🟠 Высокие (до деплоя):
4. Установить `DEBUG = False`
5. Настроить `ALLOWED_HOSTS`
6. Настроить HTTPS

### 🟡 Средние (в ближайшем спринте):
7. Исправить конфигурацию SMTP
8. Добавить proper logging
9. Улучшить обработку ошибок формы
10. Настроить rate limiting

### 🟢 Низкие (по возможности):
11. Добавить индексы БД
12. Исправить naming в моделях
13. Добавить пагинацию API

---

## Заключение

Проект имеет рабочий функционал, но содержит **критические уязвимости безопасности**, которые необходимо устранить перед публикацией в production. Особое внимание следует уделить:

1. Хардкоду секретов в коде
2. Слабым паролям
3. DEBUG режиму
4. Проблемам с отправкой email

После исправления критических проблем проект будет готов к безопасному деплою.

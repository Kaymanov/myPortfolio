import logging
from django.shortcuts import render
from django.http import JsonResponse
from rest_framework import viewsets
from rest_framework import generics
from rest_framework.throttling import AnonRateThrottle
from django.core.mail import send_mail
from django.conf import settings
from .models import SkillGroup, Project, Experience, Education, BlogPost, ContactMessage
from .serializers import SkillGroupSerializer, ProjectSerializer, ExperienceSerializer, EducationSerializer, BlogPostSerializer, ContactMessageSerializer

logger = logging.getLogger(__name__)


def health_check(request):
    """Лёгкий health-эндпоинт для Docker healthcheck (без обращения к БД)."""
    return JsonResponse({"status": "ok"})


# Create your views here.
class SkillGroupViewSet(viewsets.ReadOnlyModelViewSet):
    """
    ReadOnlyModelViewSet позволяет только получать данные (GET).
    Для портфолио это безопасно.
    """
    queryset = SkillGroup.objects.all().order_by('order')
    serializer_class = SkillGroupSerializer

class ProjectViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = Project.objects.all().order_by('-created_at')
    serializer_class = ProjectSerializer


class ExperienceViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = Experience.objects.all().order_by('-date_range')
    serializer_class = ExperienceSerializer

class EducationViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = Education.objects.all().order_by('-date_range')
    serializer_class = EducationSerializer

class BlogPostViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = BlogPost.objects.all().order_by('-created_at')
    serializer_class = BlogPostSerializer
    lookup_field = 'slug'

# Ограничиваем: не больше 5 сообщений в день с одного IP (настроим ниже)
class ContactRateThrottle(AnonRateThrottle):
    rate = '5/day' 

class ContactMessageCreateView(generics.CreateAPIView):
    queryset = ContactMessage.objects.all()
    serializer_class = ContactMessageSerializer
    throttle_classes = [ContactRateThrottle]  # Включаем защиту от спама
    # Публичный анонимный эндпоинт: убираем SessionAuthentication, иначе DRF
    # требует CSRF-токен на POST ("CSRF Failed: CSRF token missing"). Сессии
    # здесь не используются; защита обеспечивается honeypot + time-trap + throttle.
    authentication_classes = []

    def perform_create(self, serializer):
        # 1. Сохраняем в базу данных
        instance = serializer.save()
        
        # 2. Формируем и отправляем Email
        subject = f"[IAMROOT.PRO] Оповещение: Новый Payload от {instance.sender_alias}"
        message = f"""
        Инициировано новое защищенное соединение на сайте iamroot.pro.

        SENDER_ALIAS: {instance.sender_alias}
        RETURN_NODE_IP: {instance.return_node_ip}
        T-STAMP: {instance.timestamp}

        ENCRYPTED_PAYLOAD:
        {instance.encrypted_payload}
        """
        
        try:
            send_mail(
                subject=subject,
                message=message,
                from_email=settings.DEFAULT_FROM_EMAIL, # От кого (твой сервер)
                recipient_list=[settings.ADMIN_EMAIL],  # Кому (тебе)
                fail_silently=False # В проде лучше False, чтобы ловить ошибки почты
            )
            logger.info("SMTP: Пакет успешно отправлен для %s", instance.sender_alias)
        except Exception as e:
            # Сообщение уже сохранено в БД; сбой доставки письма не меняет его.
            logger.error("SMTP delivery failed: %s", e)
from django.shortcuts import render
from rest_framework import viewsets
from rest_framework import generics
from rest_framework.throttling import AnonRateThrottle
from django.core.mail import send_mail
from django.conf import settings
from .models import SkillGroup, Project, Experience, Education, BlogPost, ContactMessage
from .serializers import SkillGroupSerializer, ProjectSerializer, ExperienceSerializer, EducationSerializer, BlogPostSerializer, ContactMessageSerializer
# Create your views here.
class SkillGroupViewSet(viewsets.ReadOnlyModelViewSet):
    """
    ReadOnlyModelViewSet позволяет только получать данные (GET).
    Для портфолио это безопасно.
    """
    queryset = SkillGroup.objects.all().order_by('order')
    serializer_class = SkillGroupSerializer

class ProjectViewSet(viewsets.ModelViewSet):
    queryset = Project.objects.all().order_by('-created_at')
    serializer_class = ProjectSerializer


class ExperienceViewSet(viewsets.ModelViewSet):
    queryset = Experience.objects.all().order_by('-date_range')
    serializer_class = ExperienceSerializer

class EducationViewSet(viewsets.ModelViewSet):
    queryset = Education.objects.all().order_by('-date_range')
    serializer_class = EducationSerializer

class BlogPostViewSet(viewsets.ModelViewSet):
    queryset = BlogPost.objects.all().order_by('-created_at')
    serializer_class = BlogPostSerializer
    lookup_field = 'slug'

# Ограничиваем: не больше 5 сообщений в день с одного IP (настроим ниже)
class ContactRateThrottle(AnonRateThrottle):
    rate = '5/day' 

class ContactMessageCreateView(generics.CreateAPIView):
    queryset = ContactMessage.objects.all()
    serializer_class = ContactMessageSerializer
    throttle_classes = [ContactRateThrottle] # Включаем защиту от спама

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
            print("SMTP: Пакет успешно отправлен")
        except Exception as e:
            # Если почта отвалилась, в базу всё равно запишется
            print(f"SMTP Error: {e}")
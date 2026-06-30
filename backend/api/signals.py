from django.db.models.signals import post_save, post_delete
from django.dispatch import receiver
from django.conf import settings
import requests
import logging

from .models import Skill, SkillGroup, Project, Experience, Education, BlogPost
from .seo.indexnow import submit_indexnow, build_blogpost_urls
from .seo.sitemap_ping import ping_sitemap

logger = logging.getLogger(__name__)

def trigger_nextjs_revalidation(tags):
    if not hasattr(settings, 'FRONTEND_URL') or not settings.FRONTEND_URL:
        return
    if not hasattr(settings, 'REVALIDATION_SECRET') or not settings.REVALIDATION_SECRET:
        return
        
    webhook_url = f"{settings.FRONTEND_URL.rstrip('/')}/api/revalidate"
    payload = {
        "secret": settings.REVALIDATION_SECRET,
        "tags": tags
    }
    
    try:
        # Небольшой таймаут (2 сек), чтобы не тормозить сохранение через админку
        response = requests.post(webhook_url, json=payload, timeout=2.0)
        response.raise_for_status()
        logger.info(f"На фронтенд отправлен Webhook для ревалидации тэгов: {tags}")
    except requests.exceptions.RequestException as e:
        logger.error(f"Ошибка при отправке Webhook на фронтенд: {e}")

@receiver([post_save, post_delete], sender=Skill)
@receiver([post_save, post_delete], sender=SkillGroup)
def revalidate_skills(sender, **kwargs):
    trigger_nextjs_revalidation(["skills"])

@receiver([post_save, post_delete], sender=Project)
def revalidate_projects(sender, **kwargs):
    trigger_nextjs_revalidation(["projects"])

@receiver([post_save, post_delete], sender=Experience)
def revalidate_experience(sender, **kwargs):
    trigger_nextjs_revalidation(["experience"])

@receiver([post_save, post_delete], sender=Education)
def revalidate_education(sender, **kwargs):
    trigger_nextjs_revalidation(["education"])

@receiver([post_save, post_delete], sender=BlogPost)
def revalidate_blogposts(sender, instance, **kwargs):
    tags = ["blogposts"]
    if instance and getattr(instance, 'slug', None):
        tags.append(f"blogpost-{instance.slug}")
    trigger_nextjs_revalidation(tags)

    # После ревалидации уведомляем поисковые системы (R14.1, R14.6).
    # Любая ошибка логируется и НИКОГДА не прерывает поток save/delete (R14.4):
    # сами SEO-функции внутренне устойчивы, но добавляем защитный guard.
    slug = getattr(instance, 'slug', None) if instance else None
    try:
        if slug and getattr(instance, 'is_published', False):
            submit_indexnow(build_blogpost_urls(slug))
        ping_sitemap()
    except Exception as e:  # noqa: BLE001 - устойчивость превыше всего
        logger.error(f"Ошибка при уведомлении SEO-сервисов для BlogPost: {e}")

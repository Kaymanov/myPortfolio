from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import SkillGroupViewSet, ProjectViewSet, ExperienceViewSet, EducationViewSet, BlogPostViewSet, ContactMessageCreateView, health_check
router = DefaultRouter()
router.register(r'skills', SkillGroupViewSet)
router.register(r'projects', ProjectViewSet)
router.register(r'experience', ExperienceViewSet)
router.register(r'education', EducationViewSet)
router.register(r'blogposts', BlogPostViewSet)

urlpatterns = [
    path('', include(router.urls)),
    path('contact/', ContactMessageCreateView.as_view(), name='contact-create'),
    path('health', health_check, name='health-check'),  # для Docker healthcheck
]
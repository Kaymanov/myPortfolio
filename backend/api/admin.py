from django.contrib import admin
from django.db import models
from martor.widgets import AdminMartorWidget
from modeltranslation.admin import TranslationAdmin
from .models import SkillGroup, Skill, Project, Experience, Education, BlogPost, ContactMessage
# Register your models here.


@admin.register(SkillGroup)
class SkillGroupAdmin(admin.ModelAdmin):
    list_display = ('name', 'order')
    search_fields = ('name',)

@admin.register(Skill)
class SkillAdmin(admin.ModelAdmin):
    list_display = ('name', 'group', 'level')
    list_filter = ('group',)
    search_fields = ('name',)

@admin.register(Project)
class ProjectAdmin(TranslationAdmin):
    list_display = ('title', 'created_at')
    search_fields = ('title', 'description')

@admin.register(Experience)
class ExperienceAdmin(TranslationAdmin):
    list_display = ('title', 'company', 'date_range', 'end_date', 'status', 'objective')
    search_fields = ('title', 'company', 'objective')


@admin.register(Education)
class EducationAdmin(TranslationAdmin):
    list_display = ('degree', 'institution', 'date_range', 'status')
    search_fields = ('degree', 'institution')

@admin.register(BlogPost)
class BlogPostAdmin(TranslationAdmin):
    list_display = ('title', 'slug', 'created_at', 'updated_at', 'is_published')
    search_fields = ('title', 'slug')
    list_filter = ('is_published',)
    readonly_fields = ('created_at', 'updated_at')

    # Markdown-редактор martor для всех TextField (в т.ч. переводов content_*)
    formfield_overrides = {
        models.TextField: {'widget': AdminMartorWidget},
    }

    fieldsets = (
        ("Контент", {
            'fields': ('title', 'slug', 'excerpt', 'content', 'tags', 'is_published'),
        }),
        ("SEO", {
            'description': (
                "Если поля пусты, для SEO используются title и excerpt. "
                "Рекомендации: meta_title ≤ 60 симв., meta_description 50–160 симв."
            ),
            'fields': ('meta_title', 'meta_description', 'og_image'),
        }),
        ("Служебное", {
            'classes': ('collapse',),
            'fields': ('created_at', 'updated_at'),
        }),
    )

@admin.register(ContactMessage)
class ContactMessageAdmin(admin.ModelAdmin):
    list_display = ('sender_alias', 'return_node_ip', 'timestamp', 'is_processed')
    search_fields = ('sender_alias', 'return_node_ip')
    list_filter = ('is_processed',)
from django.contrib import admin
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
    list_display = ('name', 'group', 'level', 'icon_name')
    list_filter = ('group',)
    search_fields = ('name',)

    fieldsets = (
        (None, {
            'fields': ('group', 'name', 'level', 'icon_name'),
            'description': (
                "<strong>Как добавить иконку к скиллу:</strong><br>"
                "1. <strong>Из библиотеки react-icons</strong> — впиши точное имя "
                "компонента в поле «Название иконки», например: "
                "<code>SiDocker</code>, <code>FaLinux</code>, "
                "<code>AiOutlineWindows</code>, <code>TbBrandUbuntu</code>, "
                "<code>IoLogoJavascript</code>.<br>"
                "&nbsp;&nbsp;&nbsp;Каталог всех иконок с поиском: "
                "<a href='https://react-icons.github.io/react-icons/' "
                "target='_blank'>react-icons.github.io/react-icons</a> "
                "(копируй имя прямо из каталога).<br>"
                "2. <strong>Свой SVG</strong> (если бренда нет в библиотеке, "
                "например Zabbix) — положи файл в "
                "<code>frontend/public/icons/skills/</code> "
                "(например <code>zabbix.svg</code>) и впиши "
                "<code>custom:zabbix</code> (префикс <code>custom:</code> + имя "
                "файла без <code>.svg</code>).<br>"
                "3. Если поле пустое — иконка не показывается."
            ),
        }),
    )

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

    def formfield_for_dbfield(self, db_field, request, **kwargs):
        """Martor-виджет только для полей content (включая content_ru/content_en).
        Остальные TextField (excerpt и т.п.) используют стандартный textarea."""
        if db_field.name.startswith('content'):
            kwargs['widget'] = AdminMartorWidget
        return super().formfield_for_dbfield(db_field, request, **kwargs)

    fieldsets = (
        ("Контент", {
            'fields': ('title', 'slug', 'excerpt', 'content', 'tags', 'is_published'),
        }),
        ("SEO", {
            'description': (
                "Если поля пусты, для SEO используются title и excerpt. "
                "Рекомендации: meta_title ≤ 60 симв., meta_description 120–160 симв."
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
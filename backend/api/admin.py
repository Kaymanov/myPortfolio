from django.contrib import admin
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
class ProjectAdmin(admin.ModelAdmin):
    list_display = ('title', 'created_at')
    search_fields = ('title', 'description')

@admin.register(Experience)
class ExperienceAdmin(admin.ModelAdmin):
    list_display = ('title', 'company', 'date_range', 'end_date', 'status', 'objective')
    search_fields = ('title', 'company', 'objective')


@admin.register(Education)
class EducationAdmin(admin.ModelAdmin):
    list_display = ('degree', 'institution', 'date_range', 'status')
    search_fields = ('degree', 'institution')

@admin.register(BlogPost)
class BlogPostAdmin(admin.ModelAdmin):
    list_display = ('title', 'slug', 'created_at', 'is_published')
    search_fields = ('title', 'slug')
    list_filter = ('is_published',)

@admin.register(ContactMessage)
class ContactMessageAdmin(admin.ModelAdmin):
    list_display = ('sender_alias', 'return_node_ip', 'timestamp', 'is_processed')
    search_fields = ('sender_alias', 'return_node_ip')
    list_filter = ('is_processed',)
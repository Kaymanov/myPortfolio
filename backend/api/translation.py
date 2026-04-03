from modeltranslation.translator import translator, TranslationOptions
from .models import Project, Experience, Education, BlogPost

class ProjectTranslationOptions(TranslationOptions):
    fields = ('title', 'description',)

class ExperienceTranslationOptions(TranslationOptions):
    fields = ('title', 'stage', 'company', 'objective',)

class EducationTranslationOptions(TranslationOptions):
    fields = ('institution', 'degree', 'record_type',)

class BlogPostTranslationOptions(TranslationOptions):
    fields = ('title', 'excerpt', 'content',)

translator.register(Project, ProjectTranslationOptions)
translator.register(Experience, ExperienceTranslationOptions)
translator.register(Education, EducationTranslationOptions)
translator.register(BlogPost, BlogPostTranslationOptions)

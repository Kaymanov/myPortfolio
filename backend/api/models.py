from django.db import models
from django.utils.text import slugify

# Create your models here.

class SkillGroup(models.Model):
    """Категории: LINUX, NETWORKING, SECURITY и т.д."""
    name = models.CharField(max_length=100)
    order = models.IntegerField(default=0)

    def __str__(self):
        return self.name

class Skill(models.Model):
    group = models.ForeignKey(SkillGroup, related_name='skills', on_delete=models.CASCADE)
    name = models.CharField(max_length=100)
    level = models.IntegerField(help_text="Процент владения от 0 до 100")
    icon_name = models.CharField(max_length=50, blank=True, help_text="Название иконки для фронтенда")

    def __str__(self):
        return f"{self.name} ({self.level}%)"

class Project(models.Model):
    title = models.CharField(max_length=200)
    description = models.TextField()
    image = models.ImageField(upload_to='projects/', blank=True)
    technologies = models.JSONField(default=list, help_text="Список тегов, например ['Django', 'React']")
    link = models.URLField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.title

class Experience(models.Model):
    title = models.CharField(max_length=200)
    stage = models.CharField(max_length=100)
    company = models.CharField(max_length=200)
    date_range = models.DateField()
    end_date = models.DateField(blank=True, null=True)
    objective = models.TextField()
    details= models.JSONField(default=list, help_text="Список тегов, например ['Django', 'React']")
    status = models.CharField(max_length=50, default="active", help_text="active, archived, etc.")

    def __str__(self):
        return f"{self.title} at {self.company}"

class Education(models.Model):
    # Тип записи: Базовое (Университет) или Патч (Курсы/Повышение квалификации)
    record_type = models.CharField(max_length=50, default="BASE_KERNEL", help_text="BASE_KERNEL, PATCH, CERTIFICATE")
    institution = models.CharField(max_length=200) # Например, АГУ или онлайн-платформа
    degree = models.CharField(max_length=200)      # Специальность / Квалификация
    date_range = models.CharField(max_length=50)   # Например, "2015 - 2019"
    status = models.CharField(max_length=50, default="VERIFIED") # VERIFIED, IN_PROGRESS
    
    def __str__(self):
        return f"{self.degree} at {self.institution}"

class BlogPost(models.Model):
    title = models.CharField(max_length=200)
    slug = models.SlugField(max_length=200, unique=True, blank=True)
    excerpt = models.TextField(help_text="Краткое описание для превью")
    content = models.TextField(help_text="Полный текст статьи (можно использовать Markdown/HTML)")
    created_at = models.DateTimeField(auto_now_add=True)
    tags = models.JSONField(default=list, help_text="Список тегов, например ['Linux', 'Proxmox']")
    is_published = models.BooleanField(default=True)

    def save(self, *args, **kwargs):
        if not self.slug:
            self.slug = slugify(self.title) # Автоматическая генерация URL
        super().save(*args, **kwargs)

    def __str__(self):
        return f"LOG: {self.title}"


class ContactMessage(models.Model):
    sender_alias = models.CharField(max_length=150, verbose_name="Имя (Alias)")
    return_node_ip = models.EmailField(verbose_name="Email отправителя")
    encrypted_payload = models.TextField(verbose_name="Сообщение")
    timestamp = models.DateTimeField(auto_now_add=True, verbose_name="Время получения")
    is_processed = models.BooleanField(default=False, verbose_name="Обработано")

    class Meta:
        verbose_name = "Входящее сообщение"
        verbose_name_plural = "Входящие сообщения"
        ordering = ['-timestamp']

    def __str__(self):
        return f"PAYLOAD FROM: {self.sender_alias} [{self.timestamp.strftime('%Y-%m-%d %H:%M')}]"
from rest_framework import serializers
from .models import Skill, SkillGroup, Project, Experience, Education, BlogPost, ContactMessage

class SkillSerializer(serializers.ModelSerializer):
    class Meta:
        model = Skill
        fields = ['id', 'name', 'level', 'icon_name']

class SkillGroupSerializer(serializers.ModelSerializer):
    skills = SkillSerializer(many=True, read_only=True)

    class Meta:
        model = SkillGroup
        fields = ['id', 'name', 'skills']

class ProjectSerializer(serializers.ModelSerializer):
    class Meta:
        model = Project
        fields = '__all__'

class ExperienceSerializer(serializers.ModelSerializer):
    class Meta:
        model = Experience
        fields = '__all__'

class EducationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Education
        fields = '__all__'

class BlogPostSerializer(serializers.ModelSerializer):
    class Meta:
        model = BlogPost
        fields = '__all__'

class ContactMessageSerializer(serializers.ModelSerializer):
    # Виртуальные поля для защиты от ботов
    honeypot = serializers.CharField(required=False, allow_blank=True, write_only=True)
    time_elapsed = serializers.IntegerField(required=False, write_only=True)

    class Meta:
        model = ContactMessage
        fields = ['id', 'sender_alias', 'return_node_ip', 'encrypted_payload', 'timestamp', 'honeypot', 'time_elapsed']
        read_only_fields = ['id', 'timestamp']

    def validate(self, attrs):
        # Проверка ловушки (Honeypot) - должна быть ПУСТОЙ
        honeypot = attrs.pop('honeypot', None)
        if honeypot:
            raise serializers.ValidationError({"detail": "Transmission aborted: Bot signatures detected."})
        
        # Проверка времени (Time Trap) - должно быть больше 3 секунд (3000ms)
        time_elapsed = attrs.pop('time_elapsed', None)
        if time_elapsed is None or time_elapsed < 3000:
            raise serializers.ValidationError({"detail": "Transmission too fast: Artificial entity suspected."})

        return super().validate(attrs)
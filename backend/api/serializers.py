from rest_framework import serializers
from .models import Skill, SkillGroup, Project, Experience, Education, BlogPost, ContactMessage
from .validators import (
    REASON_BOT,
    REASON_FIELD_LENGTH,
    REASON_INVALID_EMAIL,
    validate_contact,
)

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

    # Поля контента переопределены как нестрогие, чтобы упорядоченная валидация
    # (honeypot → тайминг → формат email → длины) в validate() выполнялась в
    # фиксированном порядке (R6.7), а не прерывалась полевыми проверками DRF
    # (формат email / max_length) до неё. Контент — недоверенный plain text (R6.6).
    sender_alias = serializers.CharField(allow_blank=True, trim_whitespace=False)
    return_node_ip = serializers.CharField(allow_blank=True, trim_whitespace=False)
    encrypted_payload = serializers.CharField(allow_blank=True, trim_whitespace=False)

    class Meta:
        model = ContactMessage
        fields = ['id', 'sender_alias', 'return_node_ip', 'encrypted_payload', 'timestamp', 'honeypot', 'time_elapsed']
        read_only_fields = ['id', 'timestamp']

    def validate(self, attrs):
        # Виртуальные поля защиты от ботов не попадают в модель — извлекаем их.
        honeypot = attrs.pop('honeypot', None)
        time_elapsed = attrs.pop('time_elapsed', None)

        # Упорядоченная валидация (R6.7): honeypot → тайминг → формат email →
        # длины полей. Самое раннее нарушение выигрывает, отправка не сохраняется.
        result = validate_contact({
            'honeypot': honeypot,
            'time_elapsed': time_elapsed,
            'sender_alias': attrs.get('sender_alias', ''),
            'return_node_ip': attrs.get('return_node_ip', ''),
            'encrypted_payload': attrs.get('encrypted_payload', ''),
        })

        if not result.ok:
            # Нарушения honeypot/тайминга (R6.3, R6.4) — общая ошибка-приманка.
            if result.reason == REASON_BOT:
                raise serializers.ValidationError({"detail": result.message})
            # Формат email (R6.1) и длины полей (R6.2) — ошибка с именем поля.
            if result.reason in (REASON_INVALID_EMAIL, REASON_FIELD_LENGTH):
                raise serializers.ValidationError({result.field: result.message})
            raise serializers.ValidationError({"detail": result.message})

        return super().validate(attrs)
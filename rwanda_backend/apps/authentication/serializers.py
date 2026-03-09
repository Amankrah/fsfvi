"""
Authentication serializers.

Aligned with Rwanda frontend expected interfaces.
"""

from rest_framework import serializers

from .models import GovernmentUser


class LoginSerializer(serializers.Serializer):
    username = serializers.CharField()
    password = serializers.CharField(write_only=True)


class RefreshTokenSerializer(serializers.Serializer):
    refresh_token = serializers.CharField()


class MfaVerifySerializer(serializers.Serializer):
    code = serializers.CharField(max_length=8)
    temp_token = serializers.CharField(required=False)
    is_backup_code = serializers.BooleanField(default=False)


class PasswordChangeSerializer(serializers.Serializer):
    current_password = serializers.CharField(write_only=True)
    new_password = serializers.CharField(write_only=True)


class Enable2FASerializer(serializers.Serializer):
    code = serializers.CharField(max_length=6)


class UserProfileSerializer(serializers.ModelSerializer):
    """Matches frontend UserResponse interface."""

    government_name = serializers.CharField(source="full_name", read_only=True)
    country_code = serializers.SerializerMethodField()
    is_active = serializers.SerializerMethodField()
    is_temporary_password = serializers.BooleanField(read_only=True)
    two_fa_enabled = serializers.BooleanField(source="mfa_enabled", read_only=True)
    district_id = serializers.CharField(source="district", read_only=True)
    province_id = serializers.CharField(source="province", read_only=True)

    class Meta:
        model = GovernmentUser
        fields = [
            "id", "username", "government_name", "country_code",
            "is_active", "is_temporary_password", "two_fa_enabled",
            "created_at", "last_login", "role", "district_id", "province_id",
        ]
        read_only_fields = fields

    def get_country_code(self, obj):
        return "RW"

    def get_is_active(self, obj):
        return obj.status == "active"

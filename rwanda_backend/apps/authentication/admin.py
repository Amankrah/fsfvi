from django.contrib import admin

from .models import AuditLog, GovernmentUser


@admin.register(GovernmentUser)
class GovernmentUserAdmin(admin.ModelAdmin):
    list_display = ["username", "full_name", "email", "role", "status", "mfa_enabled", "last_login"]
    list_filter = ["role", "status", "mfa_enabled"]
    search_fields = ["username", "email", "full_name"]
    readonly_fields = ["id", "password_hash", "created_at", "updated_at", "last_login"]
    fieldsets = [
        ("Identity", {"fields": ["id", "username", "email", "full_name", "title"]}),
        ("Role & Status", {"fields": ["role", "status", "is_staff", "is_superuser"]}),
        ("MFA", {"fields": ["mfa_enabled"]}),
        ("Security", {"fields": ["failed_login_attempts", "locked_until", "last_login", "password_changed_at"]}),
        ("Location", {"fields": ["province", "district", "department"]}),
        ("Timestamps", {"fields": ["created_at", "updated_at"]}),
    ]


@admin.register(AuditLog)
class AuditLogAdmin(admin.ModelAdmin):
    list_display = ["action", "user", "ip_address", "success", "created_at"]
    list_filter = ["action", "success"]
    search_fields = ["user__username", "ip_address"]
    readonly_fields = ["id", "user", "action", "ip_address", "user_agent", "details", "success", "created_at"]

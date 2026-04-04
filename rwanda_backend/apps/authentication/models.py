"""
Authentication Models for Rwanda FSFI.

Password hashing + JWT + MFA: use `rust_crypto` → Rust `fsfi_engine`.
Django manages user data persistence.
"""

import uuid

from django.contrib.auth.models import AbstractBaseUser, BaseUserManager
from django.db import models


class UserRole(models.TextChoices):
    ADMIN = "admin", "Administrator"
    ANALYST = "analyst", "Analyst"
    DATA_ENTRY = "data_entry", "Data Entry Officer"
    VIEWER = "viewer", "Viewer"
    AUDITOR = "auditor", "Auditor"


class UserStatus(models.TextChoices):
    ACTIVE = "active", "Active"
    INACTIVE = "inactive", "Inactive"
    LOCKED = "locked", "Locked"
    PENDING = "pending", "Pending Approval"


class GovernmentUserManager(BaseUserManager):
    def create_user(self, username, email, password=None, **extra_fields):
        if not username:
            raise ValueError("Username is required")
        if not email:
            raise ValueError("Email is required")

        from . import rust_crypto

        email = self.normalize_email(email)
        user = self.model(username=username, email=email, **extra_fields)

        if password:
            rust_crypto.validate_password_strength(password)
            user.password_hash = rust_crypto.hash_password(password)
        else:
            user.password_hash = ""

        # AbstractBaseUser `password` column: unusable placeholder; API auth uses `password_hash` (Rust).
        user.set_unusable_password()
        user.save(using=self._db)
        return user

    def create_superuser(self, username, email, password=None, **extra_fields):
        extra_fields.setdefault("role", UserRole.ADMIN)
        extra_fields.setdefault("status", UserStatus.ACTIVE)
        extra_fields.setdefault("is_staff", True)
        extra_fields.setdefault("is_superuser", True)
        return self.create_user(username, email, password, **extra_fields)


class GovernmentUser(AbstractBaseUser):
    """Rwanda Government FSFI User.

    Authentication (hashing, JWT, MFA) is handled by the Rust fsfi_engine.
    Django manages data persistence and admin interface.
    """

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    username = models.CharField(max_length=150, unique=True, db_index=True)
    email = models.EmailField(unique=True, db_index=True)
    password_hash = models.TextField(help_text="Argon2id hash (set by Rust engine)")
    full_name = models.CharField(max_length=255)
    title = models.CharField(max_length=100, blank=True, default="")
    role = models.CharField(max_length=20, choices=UserRole.choices, default=UserRole.VIEWER)
    status = models.CharField(max_length=20, choices=UserStatus.choices, default=UserStatus.PENDING)

    # Django admin compatibility
    is_staff = models.BooleanField(default=False)
    is_superuser = models.BooleanField(default=False)
    is_active = models.BooleanField(default=True)

    # MFA (secrets stored encrypted by Rust AES-256-GCM)
    mfa_enabled = models.BooleanField(default=False)
    mfa_secret = models.TextField(blank=True, default="", help_text="AES-256-GCM encrypted TOTP secret")
    backup_code_hashes = models.JSONField(default=list, blank=True, help_text="SHA-256 hashes of backup codes")

    # Security
    failed_login_attempts = models.IntegerField(default=0)
    locked_until = models.DateTimeField(null=True, blank=True)
    last_login = models.DateTimeField(null=True, blank=True)
    password_changed_at = models.DateTimeField(null=True, blank=True)
    is_temporary_password = models.BooleanField(default=False)

    # Session tracking
    session_id = models.CharField(max_length=255, blank=True, default="")

    # Metadata
    province = models.CharField(max_length=100, blank=True, default="")
    district = models.CharField(max_length=100, blank=True, default="")
    department = models.CharField(max_length=200, blank=True, default="")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    objects = GovernmentUserManager()

    USERNAME_FIELD = "username"
    REQUIRED_FIELDS = ["email", "full_name"]

    class Meta:
        db_table = "government_users"
        verbose_name = "Government User"
        verbose_name_plural = "Government Users"
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.full_name} ({self.username})"

    def has_perm(self, perm, obj=None):
        return self.is_superuser or self.role == UserRole.ADMIN

    def has_module_perms(self, app_label):
        return self.is_superuser or self.role == UserRole.ADMIN


class AuditLog(models.Model):
    """Tracks authentication events for government compliance."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(GovernmentUser, on_delete=models.SET_NULL, null=True, related_name="audit_logs")
    action = models.CharField(max_length=50, db_index=True)
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    user_agent = models.TextField(blank=True, default="")
    details = models.JSONField(default=dict, blank=True)
    success = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)

    class Meta:
        db_table = "auth_audit_logs"
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.action} by {self.user} at {self.created_at}"

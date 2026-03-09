"""
Authentication Views.

All crypto operations (password verify, JWT, MFA) delegated to Rust fsfi_engine.
Django handles request/response, user lookup, and audit logging.
Response shapes aligned with Rwanda frontend interfaces.
"""

import json

from django.conf import settings
from django.utils import timezone
from rest_framework import status
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import AuditLog, GovernmentUser
from .serializers import (
    Enable2FASerializer,
    LoginSerializer,
    MfaVerifySerializer,
    PasswordChangeSerializer,
    RefreshTokenSerializer,
    UserProfileSerializer,
)


def log_auth_event(user, action, request, success=True, details=None):
    """Create an audit log entry."""
    AuditLog.objects.create(
        user=user,
        action=action,
        ip_address=request.META.get("REMOTE_ADDR"),
        user_agent=request.META.get("HTTP_USER_AGENT", ""),
        details=details or {},
        success=success,
    )


class LoginView(APIView):
    """POST /api/auth/login — Authenticate with username + password.

    Returns LoginResponse: { token?, user, requires_two_fa, two_fa_temp_token?, message? }
    """

    permission_classes = [AllowAny]

    def post(self, request):
        serializer = LoginSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        username = serializer.validated_data["username"]
        password = serializer.validated_data["password"]

        # Look up user
        try:
            user = GovernmentUser.objects.get(username=username)
        except GovernmentUser.DoesNotExist:
            return Response(
                {"error": "Invalid credentials"},
                status=status.HTTP_401_UNAUTHORIZED,
            )

        # Check account lock
        if user.locked_until and user.locked_until > timezone.now():
            log_auth_event(user, "login_locked", request, success=False)
            return Response(
                {"error": "Account is locked. Try again later."},
                status=status.HTTP_423_LOCKED,
            )

        # Check account status
        if user.status != "active":
            return Response(
                {"error": "Account is not active"},
                status=status.HTTP_403_FORBIDDEN,
            )

        # Verify password via Rust engine
        try:
            import fsfi_engine

            is_valid = fsfi_engine.py_verify_password(password, user.password_hash)
        except Exception as e:
            import logging
            logging.getLogger(__name__).error(f"Password verify error: {e}")
            is_valid = False

        if not is_valid:
            user.failed_login_attempts += 1
            if user.failed_login_attempts >= 5:
                user.locked_until = timezone.now() + timezone.timedelta(minutes=30)
                user.status = "locked"
            user.save(update_fields=["failed_login_attempts", "locked_until", "status"])
            log_auth_event(user, "login_failed", request, success=False)
            return Response(
                {"error": "Invalid credentials"},
                status=status.HTTP_401_UNAUTHORIZED,
            )

        # Check if MFA is required
        if user.mfa_enabled:
            import fsfi_engine

            session_id = fsfi_engine.py_generate_session_id()
            user.session_id = session_id
            user.save(update_fields=["session_id"])
            return Response({
                "requires_two_fa": True,
                "two_fa_temp_token": session_id,
                "user": UserProfileSerializer(user).data,
                "message": "Please provide your 2FA code",
            })

        # No MFA — complete login
        return self._complete_login(user, request)

    @staticmethod
    def _complete_login(user, request):
        """Generate tokens and return frontend-expected LoginResponse."""
        import fsfi_engine

        session_id = fsfi_engine.py_generate_session_id()
        token_json = fsfi_engine.py_generate_token_pair(
            str(user.id),
            user.username,
            user.role,
            session_id,
            settings.FSFI_JWT_SECRET,
        )
        tokens = json.loads(token_json)

        # Update user state
        user.last_login = timezone.now()
        user.failed_login_attempts = 0
        user.locked_until = None
        user.session_id = session_id
        if user.status == "locked":
            user.status = "active"
        user.save(update_fields=[
            "last_login", "failed_login_attempts", "locked_until", "session_id", "status",
        ])

        log_auth_event(user, "login_success", request)

        return Response({
            "token": tokens["access_token"],
            "refresh_token": tokens["refresh_token"],
            "requires_two_fa": False,
            "user": UserProfileSerializer(user).data,
        })


class MfaVerifyView(APIView):
    """POST /api/auth/2fa/verify — Verify 2FA code after login.

    Accepts: { temp_token, code } matching frontend verify2FA call.
    Returns TwoFAVerifyResponse: { token, user }
    """

    permission_classes = [AllowAny]

    def post(self, request):
        serializer = MfaVerifySerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        temp_token = serializer.validated_data.get("temp_token") or request.data.get("temp_token")
        code = serializer.validated_data["code"]
        is_backup = serializer.validated_data.get("is_backup_code", False)

        if not temp_token:
            return Response(
                {"error": "Temporary token required"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            user = GovernmentUser.objects.get(session_id=temp_token, mfa_enabled=True)
        except GovernmentUser.DoesNotExist:
            return Response(
                {"error": "Invalid session"},
                status=status.HTTP_401_UNAUTHORIZED,
            )

        import fsfi_engine

        if is_backup:
            idx = fsfi_engine.py_verify_backup_code(code, user.backup_code_hashes)
            if idx is not None:
                hashes = list(user.backup_code_hashes)
                hashes.pop(idx)
                user.backup_code_hashes = hashes
                user.save(update_fields=["backup_code_hashes"])
                valid = True
            else:
                valid = False
        else:
            valid = fsfi_engine.py_verify_totp_encrypted(
                user.mfa_secret, code, settings.FSFI_ENCRYPTION_KEY,
            )

        if not valid:
            log_auth_event(user, "mfa_failed", request, success=False)
            return Response(
                {"error": "Invalid 2FA code"},
                status=status.HTTP_401_UNAUTHORIZED,
            )

        log_auth_event(user, "mfa_verified", request)

        # Complete login — generate tokens
        session_id = fsfi_engine.py_generate_session_id()
        token_json = fsfi_engine.py_generate_token_pair(
            str(user.id),
            user.username,
            user.role,
            session_id,
            settings.FSFI_JWT_SECRET,
        )
        tokens = json.loads(token_json)

        user.last_login = timezone.now()
        user.failed_login_attempts = 0
        user.locked_until = None
        user.session_id = session_id
        if user.status == "locked":
            user.status = "active"
        user.save(update_fields=[
            "last_login", "failed_login_attempts", "locked_until", "session_id", "status",
        ])

        return Response({
            "token": tokens["access_token"],
            "refresh_token": tokens["refresh_token"],
            "user": UserProfileSerializer(user).data,
        })


class MfaSetupView(APIView):
    """POST /api/auth/2fa/setup — Start 2FA setup for the authenticated user.

    Returns TwoFASetupResponse: { secret, qr_code_url, backup_codes }
    """

    permission_classes = [IsAuthenticated]

    def post(self, request):
        user = request.user

        if user.mfa_enabled:
            return Response(
                {"error": "MFA is already enabled"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        import fsfi_engine

        setup_json = fsfi_engine.py_setup_mfa(
            user.username,
            settings.FSFI_MFA_ISSUER,
            settings.FSFI_ENCRYPTION_KEY,
        )
        setup = json.loads(setup_json)

        # Store encrypted secret and backup code hashes temporarily
        # MFA is not fully enabled until /2fa/enable confirms with a valid code
        user.mfa_secret = setup["encrypted_secret"]
        user.backup_code_hashes = setup["backup_code_hashes"]
        user.save(update_fields=["mfa_secret", "backup_code_hashes"])

        log_auth_event(user, "mfa_setup_started", request)

        return Response({
            "secret": setup.get("plain_secret", ""),
            "qr_code_url": setup["otpauth_url"],
            "backup_codes": setup["backup_codes"],
        })


class Enable2FAView(APIView):
    """POST /api/auth/2fa/enable — Confirm 2FA setup with a valid TOTP code.

    Accepts: { code }
    Returns: { backup_codes }
    """

    permission_classes = [IsAuthenticated]

    def post(self, request):
        serializer = Enable2FASerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        user = request.user
        code = serializer.validated_data["code"]

        if user.mfa_enabled:
            return Response(
                {"error": "MFA is already enabled"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if not user.mfa_secret:
            return Response(
                {"error": "Run 2FA setup first"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        import fsfi_engine

        valid = fsfi_engine.py_verify_totp_encrypted(
            user.mfa_secret, code, settings.FSFI_ENCRYPTION_KEY,
        )

        if not valid:
            return Response(
                {"error": "Invalid verification code"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        user.mfa_enabled = True
        user.save(update_fields=["mfa_enabled"])

        log_auth_event(user, "mfa_enabled", request)

        return Response({
            "backup_codes": [],
            "message": "Two-factor authentication has been enabled.",
        })


class Disable2FAView(APIView):
    """POST /api/auth/2fa/disable — Disable 2FA with a valid TOTP code.

    Accepts: { code }
    """

    permission_classes = [IsAuthenticated]

    def post(self, request):
        serializer = Enable2FASerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        user = request.user
        code = serializer.validated_data["code"]

        if not user.mfa_enabled:
            return Response(
                {"error": "MFA is not enabled"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        import fsfi_engine

        valid = fsfi_engine.py_verify_totp_encrypted(
            user.mfa_secret, code, settings.FSFI_ENCRYPTION_KEY,
        )

        if not valid:
            return Response(
                {"error": "Invalid verification code"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        user.mfa_enabled = False
        user.mfa_secret = ""
        user.backup_code_hashes = []
        user.save(update_fields=["mfa_enabled", "mfa_secret", "backup_code_hashes"])

        log_auth_event(user, "mfa_disabled", request)

        return Response({"message": "Two-factor authentication has been disabled."})


class VerifyTokenView(APIView):
    """GET /api/auth/verify — Verify current token and return user profile.

    Returns UserResponse (used by frontend useAuth hook on page load).
    """

    permission_classes = [IsAuthenticated]

    def get(self, request):
        return Response(UserProfileSerializer(request.user).data)


class RefreshTokenView(APIView):
    """POST /api/auth/refresh — Get new access token using refresh token."""

    permission_classes = [AllowAny]

    def post(self, request):
        serializer = RefreshTokenSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        token = serializer.validated_data["refresh_token"]

        try:
            import fsfi_engine

            claims_json = fsfi_engine.py_verify_token(token, settings.FSFI_JWT_SECRET)
            claims = json.loads(claims_json)
        except Exception:
            return Response(
                {"error": "Invalid refresh token"},
                status=status.HTTP_401_UNAUTHORIZED,
            )

        if claims.get("token_type") != "refresh":
            return Response(
                {"error": "Not a refresh token"},
                status=status.HTTP_401_UNAUTHORIZED,
            )

        try:
            user = GovernmentUser.objects.get(id=claims["sub"])
        except GovernmentUser.DoesNotExist:
            return Response(
                {"error": "User not found"},
                status=status.HTTP_401_UNAUTHORIZED,
            )

        # Generate new token pair
        session_id = fsfi_engine.py_generate_session_id()
        token_json = fsfi_engine.py_generate_token_pair(
            str(user.id),
            user.username,
            user.role,
            session_id,
            settings.FSFI_JWT_SECRET,
        )

        user.session_id = session_id
        user.save(update_fields=["session_id"])

        tokens = json.loads(token_json)
        return Response({
            "token": tokens["access_token"],
            "refresh_token": tokens["refresh_token"],
        })


class LogoutView(APIView):
    """POST /api/auth/logout — Invalidate session."""

    permission_classes = [IsAuthenticated]

    def post(self, request):
        user = request.user
        user.session_id = ""
        user.save(update_fields=["session_id"])
        log_auth_event(user, "logout", request)
        return Response({"message": "Logged out successfully"})


class PasswordChangeView(APIView):
    """POST /api/auth/change-password — Change password."""

    permission_classes = [IsAuthenticated]

    def post(self, request):
        serializer = PasswordChangeSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        user = request.user

        import fsfi_engine

        # Verify current password
        if not fsfi_engine.py_verify_password(
            serializer.validated_data["current_password"],
            user.password_hash,
        ):
            return Response(
                {"error": "Current password is incorrect"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Validate new password strength
        try:
            fsfi_engine.py_validate_password_strength(
                serializer.validated_data["new_password"]
            )
        except Exception as e:
            return Response(
                {"error": str(e)},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Hash and save new password
        user.password_hash = fsfi_engine.py_hash_password(
            serializer.validated_data["new_password"]
        )
        user.password_changed_at = timezone.now()
        user.is_temporary_password = False
        user.save(update_fields=["password_hash", "password_changed_at", "is_temporary_password"])

        log_auth_event(user, "password_changed", request)

        return Response({"message": "Password changed successfully"})


class ProfileView(APIView):
    """GET /api/auth/profile — Get current user profile."""

    permission_classes = [IsAuthenticated]

    def get(self, request):
        return Response(UserProfileSerializer(request.user).data)

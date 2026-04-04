"""
JWT Authentication Backend.

JWT verification via `rust_crypto` → Rust `fsfi_engine` (`jwt.rs`).
"""

from django.conf import settings
from rest_framework import authentication, exceptions

from . import rust_crypto
from .models import GovernmentUser


class RustJWTAuthentication(authentication.BaseAuthentication):
    """DRF authentication backend using Rust JWT verification."""

    keyword = "Bearer"

    def authenticate(self, request):
        auth_header = authentication.get_authorization_header(request).decode("utf-8")

        if not auth_header:
            return None

        parts = auth_header.split()
        if len(parts) != 2 or parts[0] != self.keyword:
            return None

        token = parts[1]

        try:
            claims = rust_crypto.verify_token_json(token, settings.FSFI_JWT_SECRET)
        except Exception as e:
            raise exceptions.AuthenticationFailed(f"Invalid token: {e}")

        # Check token type
        if claims.get("token_type") != "access":
            raise exceptions.AuthenticationFailed("Invalid token type")

        # Look up user
        try:
            user = GovernmentUser.objects.get(id=claims["sub"])
        except GovernmentUser.DoesNotExist:
            raise exceptions.AuthenticationFailed("User not found")

        if user.status != "active":
            raise exceptions.AuthenticationFailed("Account is not active")

        return (user, claims)

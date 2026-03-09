"""
JWT Authentication Backend.

Calls Rust fsfi_engine for JWT verification — Django only looks up the user.
"""

import json

from django.conf import settings
from rest_framework import authentication, exceptions

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
            import fsfi_engine

            claims_json = fsfi_engine.py_verify_token(token, settings.FSFI_JWT_SECRET)
            claims = json.loads(claims_json)
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

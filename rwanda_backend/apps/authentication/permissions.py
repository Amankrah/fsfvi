"""
Role-based permissions for Rwanda FSFI.
"""

from rest_framework import permissions


class IsAdmin(permissions.BasePermission):
    """Only admin users."""

    def has_permission(self, request, view):
        return request.user and request.user.role == "admin"


class IsAnalyst(permissions.BasePermission):
    """Admin or analyst users."""

    def has_permission(self, request, view):
        return request.user and request.user.role in ("admin", "analyst")


class IsDataEntry(permissions.BasePermission):
    """Admin, analyst, or data entry users."""

    def has_permission(self, request, view):
        return request.user and request.user.role in ("admin", "analyst", "data_entry")


class IsAuditor(permissions.BasePermission):
    """Read-only access for auditors + full access for admins."""

    def has_permission(self, request, view):
        if request.user and request.user.role == "admin":
            return True
        if request.user and request.user.role == "auditor":
            return request.method in permissions.SAFE_METHODS
        return False


class ReadOnly(permissions.BasePermission):
    """Read-only access for any authenticated user."""

    def has_permission(self, request, view):
        return request.method in permissions.SAFE_METHODS

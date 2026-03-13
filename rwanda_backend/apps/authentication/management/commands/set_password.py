"""
Reset a government user's password (forgot-password / admin reset).

Usage:
    python manage.py set_password --username admin --password "YourNewSecurePassword123!"
"""
import getpass

from django.core.management.base import BaseCommand, CommandError

from apps.authentication.models import GovernmentUser


class Command(BaseCommand):
    help = "Reset a government user's password (min 12 characters)"

    def add_arguments(self, parser):
        parser.add_argument("--username", type=str, help="Username to reset")
        parser.add_argument("--password", type=str, help="New password (will prompt if not provided)")

    def handle(self, *args, **options):
        username = options["username"]
        if not username:
            username = input("Username: ").strip()
        if not username:
            raise CommandError("Username is required")

        user = GovernmentUser.objects.filter(username=username).first()
        if not user:
            raise CommandError(f"User '{username}' not found")

        password = options["password"]
        if not password:
            password = getpass.getpass("New password: ")
            password_confirm = getpass.getpass("Confirm new password: ")
            if password != password_confirm:
                raise CommandError("Passwords do not match")
        if len(password) < 12:
            raise CommandError("Password must be at least 12 characters")

        import fsfi_engine

        try:
            fsfi_engine.py_validate_password_strength(password)
        except Exception as e:
            raise CommandError(f"Password does not meet strength rules: {e}")

        user.password_hash = fsfi_engine.py_hash_password(password)
        user.password_changed_at = None  # allow first-login flow if desired
        user.is_temporary_password = False
        user.save(update_fields=["password_hash", "password_changed_at", "is_temporary_password"])

        self.stdout.write(self.style.SUCCESS(f"Password for user '{username}' has been reset successfully."))

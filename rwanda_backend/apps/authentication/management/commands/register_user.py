"""
Management command to register government users.

Usage:
    python manage.py register_user

Options:
    --username      Username (required)
    --email         Email address (required)
    --password      Password (will prompt if not provided)
    --full-name     Full name (required)
    --title         Job title (optional)
    --role          Role: admin, analyst, data_entry, viewer, auditor (default: viewer)
    --province      Province assignment (optional)
    --district      District assignment (optional)
    --department    Department (optional)
    --admin         Create as admin with staff access
    --superuser     Create as superuser (full access)

Examples:
    # Interactive mode
    python manage.py register_user

    # Quick admin user
    python manage.py register_user --username admin --email admin@minagri.gov.rw --full-name "System Admin" --admin

    # District officer
    python manage.py register_user --username jdoe --email jdoe@rab.gov.rw --full-name "John Doe" --role data_entry --district Bugesera
"""

import getpass

from django.core.management.base import BaseCommand, CommandError

from apps.authentication.models import GovernmentUser, UserRole, UserStatus


class Command(BaseCommand):
    help = "Register a new government user for Rwanda FSFI"

    def add_arguments(self, parser):
        parser.add_argument("--username", type=str, help="Username")
        parser.add_argument("--email", type=str, help="Email address")
        parser.add_argument("--password", type=str, help="Password (will prompt if not provided)")
        parser.add_argument("--full-name", type=str, help="Full name")
        parser.add_argument("--title", type=str, default="", help="Job title")
        parser.add_argument(
            "--role",
            type=str,
            choices=["admin", "analyst", "data_entry", "viewer", "auditor"],
            default="viewer",
            help="User role (default: viewer)",
        )
        parser.add_argument("--province", type=str, default="", help="Province assignment")
        parser.add_argument("--district", type=str, default="", help="District assignment")
        parser.add_argument("--department", type=str, default="", help="Department")
        parser.add_argument("--admin", action="store_true", help="Create as admin with staff access")
        parser.add_argument("--superuser", action="store_true", help="Create as superuser")

    def handle(self, *args, **options):
        self.stdout.write(self.style.HTTP_INFO("\n=== Rwanda FSFI Government User Registration ===\n"))

        # Get username
        username = options["username"]
        if not username:
            username = input("Username: ").strip()
        if not username:
            raise CommandError("Username is required")
        if GovernmentUser.objects.filter(username=username).exists():
            raise CommandError(f"Username '{username}' already exists")

        # Get email
        email = options["email"]
        if not email:
            email = input("Email: ").strip()
        if not email:
            raise CommandError("Email is required")
        if GovernmentUser.objects.filter(email=email).exists():
            raise CommandError(f"Email '{email}' already exists")

        # Get full name
        full_name = options["full_name"]
        if not full_name:
            full_name = input("Full name: ").strip()
        if not full_name:
            raise CommandError("Full name is required")

        # Get password
        password = options["password"]
        if not password:
            password = getpass.getpass("Password: ")
            password_confirm = getpass.getpass("Confirm password: ")
            if password != password_confirm:
                raise CommandError("Passwords do not match")

        # Get role
        role = options["role"]
        if options["admin"] or options["superuser"]:
            role = "admin"

        # Determine status
        status = UserStatus.ACTIVE

        # Create user
        try:
            user = GovernmentUser.objects.create_user(
                username=username,
                email=email,
                password=password,
                full_name=full_name,
                title=options["title"],
                role=role,
                status=status,
                province=options["province"],
                district=options["district"],
                department=options["department"],
                is_staff=options["admin"] or options["superuser"],
                is_superuser=options["superuser"],
            )

            self.stdout.write(self.style.SUCCESS(f"\nUser created successfully!"))
            self.stdout.write(f"  ID:       {user.id}")
            self.stdout.write(f"  Username: {user.username}")
            self.stdout.write(f"  Email:    {user.email}")
            self.stdout.write(f"  Name:     {user.full_name}")
            self.stdout.write(f"  Role:     {user.get_role_display()}")
            self.stdout.write(f"  Status:   {user.get_status_display()}")

            if options["superuser"]:
                self.stdout.write(self.style.WARNING("  Access:   SUPERUSER (full system access)"))
            elif options["admin"]:
                self.stdout.write(self.style.WARNING("  Access:   ADMIN (staff access)"))

            if user.province:
                self.stdout.write(f"  Province: {user.province}")
            if user.district:
                self.stdout.write(f"  District: {user.district}")

            self.stdout.write(self.style.HTTP_INFO("\nUser can now log in at /api/auth/login/\n"))

        except ValueError as e:
            raise CommandError(str(e))
        except Exception as e:
            raise CommandError(f"Failed to create user: {e}")

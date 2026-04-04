"""
Bridge from Django `apps.authentication` to Rust `fsfi_engine` auth.

All password hashing, strength checks, TOTP / backup-code MFA, and JWT
operations used by this app should go through this module so the Python
boundary matches:

- `fsfi_engine/src/auth/password.rs` — Argon2id, validation, generated passwords
- `fsfi_engine/src/auth/mfa.rs` — setup, TOTP verify, backup codes
- `fsfi_engine/src/auth/jwt.rs` — session id, token pair, verify

Do not call `fsfi_engine` directly from views or management commands; import here only.
"""

from __future__ import annotations

import json
import logging
from typing import Any, List, Optional

import fsfi_engine

logger = logging.getLogger(__name__)

__all__ = [
    "hash_password",
    "verify_password",
    "validate_password_strength",
    "generate_secure_password",
    "setup_mfa",
    "verify_totp_encrypted",
    "verify_backup_code",
    "hash_backup_code",
    "generate_session_id",
    "generate_token_pair_json",
    "verify_token_json",
]


# --- password.rs -----------------------------------------------------------------


def hash_password(password: str) -> str:
    return fsfi_engine.py_hash_password(password)


def verify_password(password: str, password_hash: str) -> bool:
    try:
        return fsfi_engine.py_verify_password(password, password_hash)
    except Exception as e:
        logger.exception("Rust password verify failed: %s", e)
        return False


def validate_password_strength(password: str) -> None:
    """Raise ValueError with policy message from Rust if password is weak."""
    fsfi_engine.py_validate_password_strength(password)


def generate_secure_password() -> str:
    return fsfi_engine.py_generate_secure_password()


# --- mfa.rs ----------------------------------------------------------------------


def setup_mfa(username: str, issuer: str, encryption_key: str) -> dict[str, Any]:
    """Return dict with secret, encrypted_secret, otpauth_url, backup_codes, backup_code_hashes."""
    raw = fsfi_engine.py_setup_mfa(username, issuer, encryption_key)
    return json.loads(raw)


def verify_totp_encrypted(encrypted_secret: str, code: str, encryption_key: str) -> bool:
    try:
        return fsfi_engine.py_verify_totp_encrypted(encrypted_secret, code, encryption_key)
    except Exception as e:
        logger.exception("Rust TOTP verify failed: %s", e)
        return False


def verify_backup_code(code: str, stored_hashes: List[str]) -> Optional[int]:
    try:
        return fsfi_engine.py_verify_backup_code(code, stored_hashes)
    except Exception as e:
        logger.exception("Rust backup-code verify failed: %s", e)
        return None


def hash_backup_code(code: str) -> str:
    return fsfi_engine.py_hash_backup_code(code)


# --- jwt.rs ----------------------------------------------------------------------


def generate_session_id() -> str:
    return fsfi_engine.py_generate_session_id()


def generate_token_pair_json(
    user_id: str,
    username: str,
    role: str,
    session_id: str,
    jwt_secret: str,
) -> dict[str, Any]:
    raw = fsfi_engine.py_generate_token_pair(
        user_id, username, role, session_id, jwt_secret
    )
    return json.loads(raw)


def verify_token_json(token: str, jwt_secret: str) -> dict[str, Any]:
    raw = fsfi_engine.py_verify_token(token, jwt_secret)
    return json.loads(raw)

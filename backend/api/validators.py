"""Pure, testable validators for the contact form (Requirement 6).

These functions contain no Django/DRF/ORM dependencies so the ordering and
invariants of contact-form validation can be tested without a database.

Validation order (Requirement 6.7), earliest violation wins, no save on any
failure:

    1. honeypot non-empty               -> reject as bot (6.3)
    2. time_elapsed missing/negative/<3000ms -> reject as bot (6.4)
    3. email format (exactly one "@", non-empty local + domain) (6.1)
    4. field lengths (alias 1-150, email 1-254, message 1-5000) (6.2)
    5. rate limit (enforced in the view via AnonRateThrottle) (6.5)

Message content is treated as untrusted plain text and is never interpreted as
executable markup (6.6).
"""

from dataclasses import dataclass
from typing import Any, Mapping, Optional

# Field length bounds (Requirement 6.2)
ALIAS_MIN, ALIAS_MAX = 1, 150
EMAIL_MIN, EMAIL_MAX = 1, 254
MESSAGE_MIN, MESSAGE_MAX = 1, 5000

# Time trap threshold in milliseconds (Requirement 6.4)
MIN_ELAPSED_MS = 3000

# Violation reasons
REASON_BOT = "bot"
REASON_INVALID_EMAIL = "invalid_email"
REASON_FIELD_LENGTH = "field_length"


def is_valid_email(email: Any) -> bool:
    """Return True iff ``email`` has exactly one "@" with a non-empty local
    part and a non-empty domain part (Requirement 6.1)."""
    if not isinstance(email, str):
        return False
    if email.count("@") != 1:
        return False
    local, _, domain = email.partition("@")
    return bool(local) and bool(domain)


def field_lengths_ok(alias: Any, email: Any, message: Any) -> Optional[str]:
    """Return the name of the first field violating its length bounds, or
    ``None`` when all fields are within range (Requirement 6.2).

    Fields are checked in a fixed order so the earliest violation is reported.
    Non-string / missing values are treated as length 0 (a violation).
    """
    alias_len = len(alias) if isinstance(alias, str) else 0
    email_len = len(email) if isinstance(email, str) else 0
    message_len = len(message) if isinstance(message, str) else 0

    if not (ALIAS_MIN <= alias_len <= ALIAS_MAX):
        return "sender_alias"
    if not (EMAIL_MIN <= email_len <= EMAIL_MAX):
        return "return_node_ip"
    if not (MESSAGE_MIN <= message_len <= MESSAGE_MAX):
        return "encrypted_payload"
    return None


@dataclass(frozen=True)
class ContactValidation:
    """Outcome of :func:`validate_contact`.

    ``ok`` is True when the submission passes every check evaluated here.
    On failure, ``reason`` identifies the earliest violation, ``field`` names
    the offending field (for email/length reasons) and ``message`` is a
    human-readable detail suitable for an API response.
    """

    ok: bool
    reason: Optional[str] = None
    field: Optional[str] = None
    message: Optional[str] = None


def validate_contact(payload: Mapping[str, Any]) -> ContactValidation:
    """Apply contact-form checks in the fixed order defined by Requirement 6.7.

    Returns the earliest violation. Rate limiting (6.5) is intentionally NOT
    handled here; it is enforced in the view via the throttle class before the
    submission is saved.
    """
    # 1. Honeypot must be empty (Requirement 6.3)
    honeypot = payload.get("honeypot")
    if honeypot:
        return ContactValidation(
            ok=False,
            reason=REASON_BOT,
            message="Transmission aborted: Bot signatures detected.",
        )

    # 2. Time trap: missing, negative, or under 3000ms (Requirement 6.4)
    time_elapsed = payload.get("time_elapsed")
    if time_elapsed is None or time_elapsed < 0 or time_elapsed < MIN_ELAPSED_MS:
        return ContactValidation(
            ok=False,
            reason=REASON_BOT,
            message="Transmission too fast: Artificial entity suspected.",
        )

    # 3. Email format (Requirement 6.1)
    email = payload.get("return_node_ip", "")
    if not is_valid_email(email):
        return ContactValidation(
            ok=False,
            reason=REASON_INVALID_EMAIL,
            field="return_node_ip",
            message="Invalid return node: address must contain exactly one '@' "
            "with a non-empty local and domain part.",
        )

    # 4. Field lengths (Requirement 6.2)
    violating_field = field_lengths_ok(
        payload.get("sender_alias", ""),
        email,
        payload.get("encrypted_payload", ""),
    )
    if violating_field is not None:
        bounds = {
            "sender_alias": (ALIAS_MIN, ALIAS_MAX),
            "return_node_ip": (EMAIL_MIN, EMAIL_MAX),
            "encrypted_payload": (MESSAGE_MIN, MESSAGE_MAX),
        }[violating_field]
        return ContactValidation(
            ok=False,
            reason=REASON_FIELD_LENGTH,
            field=violating_field,
            message=f"Length out of bounds: must be between {bounds[0]} and "
            f"{bounds[1]} characters.",
        )

    return ContactValidation(ok=True)

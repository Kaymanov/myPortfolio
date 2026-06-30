"""Property-based and example tests for the pure contact-form validators.

Covers design Properties 11-14 (Requirements 6.1, 6.2, 6.6, 6.7) plus example
tests for honeypot / time-trap / valid-payload behaviour.

These validators are pure (no Django/DB), so the tests need no database.
"""

import copy

from hypothesis import given, settings
from hypothesis import strategies as st

from api.validators import (
    ALIAS_MAX,
    ALIAS_MIN,
    EMAIL_MAX,
    EMAIL_MIN,
    MESSAGE_MAX,
    MESSAGE_MIN,
    MIN_ELAPSED_MS,
    REASON_BOT,
    REASON_FIELD_LENGTH,
    REASON_INVALID_EMAIL,
    field_lengths_ok,
    is_valid_email,
    validate_contact,
)


# ---------------------------------------------------------------------------
# Reference helpers (independent re-derivation of the spec, not the impl)
# ---------------------------------------------------------------------------


def _ref_is_valid_email(email: str) -> bool:
    """Spec: valid iff exactly one '@' with non-empty local and domain."""
    if email.count("@") != 1:
        return False
    local, _, domain = email.partition("@")
    return len(local) > 0 and len(domain) > 0


# ---------------------------------------------------------------------------
# Property 11: is_valid_email
# Feature: project-polish-and-seo-automation, Property 11
# Validates: Requirements 6.1
# ---------------------------------------------------------------------------


@settings(max_examples=100)
@given(st.text())
def test_property_11_is_valid_email_arbitrary_text(email):
    """Feature: project-polish-and-seo-automation, Property 11.

    Validates: Requirements 6.1.

    For any string, is_valid_email is True iff there is exactly one '@'
    with a non-empty local part and a non-empty domain part.
    """
    assert is_valid_email(email) == _ref_is_valid_email(email)


@settings(max_examples=100)
@given(
    local=st.text(alphabet=st.characters(blacklist_characters="@"), min_size=1),
    domain=st.text(alphabet=st.characters(blacklist_characters="@"), min_size=1),
)
def test_property_11_well_formed_emails_are_valid(local, domain):
    """Feature: project-polish-and-seo-automation, Property 11.

    Validates: Requirements 6.1.

    A single '@' joining a non-empty local and non-empty domain is valid.
    """
    assert is_valid_email(f"{local}@{domain}") is True


# ---------------------------------------------------------------------------
# Property 12: field_lengths_ok reports the FIRST offending field
# Feature: project-polish-and-seo-automation, Property 12
# Validates: Requirements 6.2
# ---------------------------------------------------------------------------


def _ref_first_offending_field(alias, email, message):
    """Spec: check alias, then email, then message; return first out of range."""
    if not (ALIAS_MIN <= len(alias) <= ALIAS_MAX):
        return "sender_alias"
    if not (EMAIL_MIN <= len(email) <= EMAIL_MAX):
        return "return_node_ip"
    if not (MESSAGE_MIN <= len(message) <= MESSAGE_MAX):
        return "encrypted_payload"
    return None


# Lengths that may fall inside or just outside the various bounds.
_length_strategy = st.integers(min_value=0, max_value=300)


@settings(max_examples=100)
@given(
    alias_len=_length_strategy,
    email_len=_length_strategy,
    message_len=st.integers(min_value=0, max_value=5100),
)
def test_property_12_first_offending_field(alias_len, email_len, message_len):
    """Feature: project-polish-and-seo-automation, Property 12.

    Validates: Requirements 6.2.

    field_lengths_ok rejects iff any field is out of range and returns the
    FIRST offending field in fixed order (alias -> email -> message).
    """
    alias = "a" * alias_len
    email = "e" * email_len
    message = "m" * message_len

    result = field_lengths_ok(alias, email, message)
    expected = _ref_first_offending_field(alias, email, message)
    assert result == expected

    # rejects iff at least one field is out of range
    in_range = (
        (ALIAS_MIN <= alias_len <= ALIAS_MAX)
        and (EMAIL_MIN <= email_len <= EMAIL_MAX)
        and (MESSAGE_MIN <= message_len <= MESSAGE_MAX)
    )
    assert (result is None) == in_range


# ---------------------------------------------------------------------------
# Property 13: message content is treated as untrusted plain text
# Feature: project-polish-and-seo-automation, Property 13
# Validates: Requirements 6.6
# ---------------------------------------------------------------------------


# Generate messages that fit within bounds, including HTML/markup-like content.
_markup_fragments = st.sampled_from(
    [
        "<script>alert('x')</script>",
        "<b>bold</b>",
        "{{ 7 * 7 }}",
        "${jndi:ldap://evil}",
        "</div><img src=x onerror=alert(1)>",
        "normal text",
        "line1\nline2",
        "&amp; &lt; &gt;",
        "'; DROP TABLE users; --",
    ]
)


@settings(max_examples=100)
@given(
    fragment=_markup_fragments,
    extra=st.text(min_size=0, max_size=200),
)
def test_property_13_message_passes_through_unchanged(fragment, extra):
    """Feature: project-polish-and-seo-automation, Property 13.

    Validates: Requirements 6.6.

    validate_contact only classifies a submission; it never mutates the input
    payload, and markup in the message is carried verbatim (treated as plain
    text, never interpreted/executed).
    """
    message = (fragment + extra)[:MESSAGE_MAX]
    if len(message) < MESSAGE_MIN:
        message = "x"

    payload = {
        "sender_alias": "Tester",
        "return_node_ip": "user@example.com",
        "encrypted_payload": message,
        "honeypot": "",
        "time_elapsed": MIN_ELAPSED_MS,
    }
    snapshot = copy.deepcopy(payload)

    result = validate_contact(payload)

    # Input payload is never mutated by validation.
    assert payload == snapshot
    # The message value is byte-for-byte preserved (no escaping/stripping).
    assert payload["encrypted_payload"] == message
    # A well-formed submission with arbitrary markup content is accepted.
    assert result.ok is True


# ---------------------------------------------------------------------------
# Property 14: ordered validation, earliest violation wins, never ok on failure
# Feature: project-polish-and-seo-automation, Property 14
# Validates: Requirements 6.7
# ---------------------------------------------------------------------------


def _ref_expected_reason(payload):
    """Spec ordering: honeypot -> timing -> email -> lengths."""
    if payload.get("honeypot"):
        return REASON_BOT
    te = payload.get("time_elapsed")
    if te is None or te < 0 or te < MIN_ELAPSED_MS:
        return REASON_BOT
    if not is_valid_email(payload.get("return_node_ip", "")):
        return REASON_INVALID_EMAIL
    if (
        field_lengths_ok(
            payload.get("sender_alias", ""),
            payload.get("return_node_ip", ""),
            payload.get("encrypted_payload", ""),
        )
        is not None
    ):
        return REASON_FIELD_LENGTH
    return None


# Strategies that independently may or may not be valid for each check.
_honeypot_strategy = st.sampled_from(["", "bot-filled", "x"])
_time_strategy = st.one_of(
    st.none(),
    st.integers(min_value=-5000, max_value=10000),
)
_email_strategy = st.sampled_from(
    [
        "user@example.com",  # valid
        "no-at-sign",  # invalid
        "two@@example.com",  # invalid
        "@example.com",  # invalid (empty local)
        "user@",  # invalid (empty domain)
        "",  # invalid (empty)
    ]
)
_alias_strategy = st.sampled_from(["", "ok", "a" * 200])
_message_strategy = st.sampled_from(["", "hello", "m" * 6000])


@settings(max_examples=100)
@given(
    honeypot=_honeypot_strategy,
    time_elapsed=_time_strategy,
    email=_email_strategy,
    alias=_alias_strategy,
    message=_message_strategy,
)
def test_property_14_ordered_earliest_violation(
    honeypot, time_elapsed, email, alias, message
):
    """Feature: project-polish-and-seo-automation, Property 14.

    Validates: Requirements 6.7.

    For any payload with one or more simultaneous violations, validate_contact
    applies checks in the fixed order honeypot -> timing -> email -> lengths,
    returns the EARLIEST violation, and is never ok when any check fails.
    """
    payload = {
        "honeypot": honeypot,
        "time_elapsed": time_elapsed,
        "return_node_ip": email,
        "sender_alias": alias,
        "encrypted_payload": message,
    }

    result = validate_contact(payload)
    expected_reason = _ref_expected_reason(payload)

    if expected_reason is None:
        assert result.ok is True
        assert result.reason is None
    else:
        assert result.ok is False
        assert result.reason == expected_reason


# ---------------------------------------------------------------------------
# Task 7.10: Example tests
# Validates: Requirements 6.3, 6.4, 6.7
# ---------------------------------------------------------------------------


def _valid_payload(**overrides):
    payload = {
        "honeypot": "",
        "time_elapsed": MIN_ELAPSED_MS,
        "return_node_ip": "user@example.com",
        "sender_alias": "Ada Lovelace",
        "encrypted_payload": "Hello, this is a genuine message.",
    }
    payload.update(overrides)
    return payload


def test_example_honeypot_non_empty_is_rejected():
    """A non-empty honeypot is rejected as a bot (Requirement 6.3)."""
    result = validate_contact(_valid_payload(honeypot="i am a bot"))
    assert result.ok is False
    assert result.reason == REASON_BOT


def test_example_time_elapsed_none_is_rejected():
    """Missing time_elapsed is rejected as a bot (Requirement 6.4)."""
    result = validate_contact(_valid_payload(time_elapsed=None))
    assert result.ok is False
    assert result.reason == REASON_BOT


def test_example_time_elapsed_negative_is_rejected():
    """Negative time_elapsed is rejected as a bot (Requirement 6.4)."""
    result = validate_contact(_valid_payload(time_elapsed=-1))
    assert result.ok is False
    assert result.reason == REASON_BOT


def test_example_time_elapsed_below_threshold_is_rejected():
    """time_elapsed under MIN_ELAPSED_MS is rejected as a bot (Requirement 6.4)."""
    result = validate_contact(_valid_payload(time_elapsed=MIN_ELAPSED_MS - 1))
    assert result.ok is False
    assert result.reason == REASON_BOT


def test_example_valid_payload_is_ok():
    """A genuine, well-formed submission passes all checks (Requirement 6.7)."""
    result = validate_contact(_valid_payload())
    assert result.ok is True
    assert result.reason is None

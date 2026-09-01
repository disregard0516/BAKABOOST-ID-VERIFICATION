from collections.abc import Mapping
from typing import Any
from uuid import UUID

from sqlalchemy.ext.asyncio import (
    AsyncSession,
)

from app.db.models.audit_event import (
    AuditEvent,
)

# ============================================================
# LIMITS
# ============================================================

_MAX_ACTOR_ID_LENGTH = 255
_MAX_ACTION_LENGTH = 100
_MAX_OUTCOME_LENGTH = 32
_MAX_REQUEST_ID_LENGTH = 128
_MAX_IP_ADDRESS_LENGTH = 64
_MAX_USER_AGENT_LENGTH = 512


# ============================================================
# NORMALIZATION
# ============================================================


def _normalize_optional_string(
    value: str | None,
    *,
    maximum_length: int,
) -> str | None:
    if value is None:
        return None

    normalized = value.strip()

    if not normalized:
        return None

    return normalized[:maximum_length]


def _normalize_required_string(
    value: str,
    *,
    field_name: str,
    maximum_length: int,
) -> str:
    normalized = value.strip()

    if not normalized:
        raise ValueError(
            f"{field_name} cannot be empty."
        )

    return normalized[:maximum_length]


def _normalize_metadata(
    metadata: Mapping[str, Any] | None,
) -> dict[str, Any]:
    if metadata is None:
        return {}

    return dict(metadata)


# ============================================================
# AUDIT WRITER
# ============================================================


async def record_audit_event(
    session: AsyncSession,
    *,
    actor_type: str,
    actor_id: str | None,
    action: str,
    verification_request_id: UUID | None = None,
    metadata: Mapping[str, Any] | None = None,
    ip_address: str | None = None,

    #
    # Optional security context.
    #
    # These are optional specifically so every existing caller
    # remains source-compatible while higher-security admin
    # paths can supply richer context.
    #
    admin_session_id: UUID | None = None,
    request_id: str | None = None,
    user_agent: str | None = None,
    outcome: str = "success",
) -> AuditEvent:
    """
    Add an audit event to the caller's current transaction.

    This function deliberately does NOT commit.

    Keeping the audit row in the same database transaction as
    the protected operation means the application cannot
    successfully commit the operation while accidentally
    omitting its corresponding transactional audit event.

    Existing callers remain compatible because all newly
    introduced security-context fields are optional.

    Production audit immutability still requires database
    privilege separation and/or protected centralized log
    shipping outside this function.
    """

    normalized_actor_type = (
        _normalize_required_string(
            actor_type,
            field_name="actor_type",
            maximum_length=50,
        )
    )

    normalized_action = (
        _normalize_required_string(
            action,
            field_name="action",
            maximum_length=_MAX_ACTION_LENGTH,
        )
    )

    normalized_outcome = (
        _normalize_required_string(
            outcome,
            field_name="outcome",
            maximum_length=_MAX_OUTCOME_LENGTH,
        )
    )

    event = AuditEvent(
        actor_type=normalized_actor_type,

        actor_id=_normalize_optional_string(
            actor_id,
            maximum_length=(
                _MAX_ACTOR_ID_LENGTH
            ),
        ),

        verification_request_id=(
            verification_request_id
        ),

        action=normalized_action,

        outcome=normalized_outcome,

        metadata_json=(
            _normalize_metadata(metadata)
        ),

        ip_address=(
            _normalize_optional_string(
                ip_address,
                maximum_length=(
                    _MAX_IP_ADDRESS_LENGTH
                ),
            )
        ),

        admin_session_id=admin_session_id,

        request_id=(
            _normalize_optional_string(
                request_id,
                maximum_length=(
                    _MAX_REQUEST_ID_LENGTH
                ),
            )
        ),

        user_agent=(
            _normalize_optional_string(
                user_agent,
                maximum_length=(
                    _MAX_USER_AGENT_LENGTH
                ),
            )
        ),
    )

    session.add(event)

    return event
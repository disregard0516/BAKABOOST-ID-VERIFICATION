from __future__ import annotations

from collections.abc import Sequence

import httpx
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.db.models.admin import Admin


class CloudflareAccessPolicyError(Exception):
    """Cloudflare Access policy synchronization failed."""


def _require_cloudflare_sync_config() -> None:
    required = {
        "cloudflare_account_id": settings.cloudflare_account_id,
        "cloudflare_admin_app_id": settings.cloudflare_admin_app_id,
        "cloudflare_admin_policy_id": settings.cloudflare_admin_policy_id,
        "cloudflare_api_token": settings.cloudflare_api_token,
    }

    missing = [
        name
        for name, value in required.items()
        if not str(value).strip()
    ]

    if missing:
        raise CloudflareAccessPolicyError(
            "Cloudflare Access policy synchronization is not configured."
        )


async def get_active_admin_emails(
    session: AsyncSession,
) -> list[str]:
    result = await session.execute(
        select(Admin.email)
        .where(Admin.is_active.is_(True))
        .order_by(Admin.email.asc())
    )

    return [
        str(email).strip().lower()
        for email in result.scalars().all()
        if str(email).strip()
    ]


def _email_include_rules(
    emails: Sequence[str],
) -> list[dict[str, dict[str, str]]]:
    unique = sorted(
        {
            str(email).strip().lower()
            for email in emails
            if str(email).strip()
        }
    )

    if not unique:
        raise CloudflareAccessPolicyError(
            "Refusing to synchronize an empty administrator allow-list."
        )

    return [
        {
            "email": {
                "email": email,
            }
        }
        for email in unique
    ]


async def sync_admin_access_policy(
    session: AsyncSession,
) -> list[str]:
    """
    Synchronize the normal BAKABOOST Admin Cloudflare Access
    allow policy with active local administrator emails.

    The local database is authoritative for account activation.
    This function deliberately does not commit database state.
    """

    _require_cloudflare_sync_config()

    emails = await get_active_admin_emails(
        session
    )

    include = _email_include_rules(
        emails
    )

    base_url = (
        "https://api.cloudflare.com/client/v4"
        f"/accounts/{settings.cloudflare_account_id}"
        f"/access/policies/{settings.cloudflare_admin_policy_id}"
    )

    headers = {
        "Authorization": (
            f"Bearer {settings.cloudflare_api_token}"
        ),
        "Content-Type": "application/json",
    }

    async with httpx.AsyncClient(
        timeout=15.0
    ) as client:
        current_response = await client.get(
            base_url,
            headers=headers,
        )

        if current_response.status_code != 200:
            raise CloudflareAccessPolicyError(
                "Cloudflare Access policy could not be read."
            )

        current_body = current_response.json()

        if not current_body.get("success"):
            raise CloudflareAccessPolicyError(
                "Cloudflare Access policy read was unsuccessful."
            )

        current = current_body.get("result")

        if not isinstance(current, dict):
            raise CloudflareAccessPolicyError(
                "Cloudflare Access policy response was invalid."
            )

        payload = {
            "name": current.get(
                "name",
                "BAKABOOST Admin Allow",
            ),
            "decision": current.get(
                "decision",
                "allow",
            ),
            "include": include,
            "exclude": current.get(
                "exclude",
                [],
            ),
            "require": current.get(
                "require",
                [],
            ),
            "session_duration": current.get(
                "session_duration",
                "24h",
            ),
        }

        update_response = await client.put(
            base_url,
            headers=headers,
            json=payload,
        )

        if update_response.status_code != 200:
            raise CloudflareAccessPolicyError(
                "Cloudflare Access policy could not be updated."
            )

        update_body = update_response.json()

        if not update_body.get("success"):
            raise CloudflareAccessPolicyError(
                "Cloudflare Access policy update was unsuccessful."
            )

    return emails

from __future__ import annotations

from dataclasses import dataclass
from html import escape
from urllib.parse import urlencode, urljoin

import httpx

from app.core.config import settings

_RESEND_EMAILS_URL = "https://api.resend.com/emails"
_EMAIL_TIMEOUT_SECONDS = 10.0


class AdminInvitationEmailError(Exception):
    """Administrator invitation email delivery failed."""


class AdminInvitationEmailConfigurationError(
    AdminInvitationEmailError
):
    """Transactional email configuration is incomplete."""


@dataclass(frozen=True)
class AdminInvitationEmailDelivery:
    provider: str
    provider_message_id: str


def build_admin_invitation_accept_url(
    *,
    raw_token: str,
) -> str:
    """
    Construct the public one-time invitation acceptance URL.

    The raw invitation token is intentionally included only
    in the recipient-facing URL. It must never be logged,
    audited, or persisted by this service.
    """
    token = raw_token.strip()

    if not token:
        raise AdminInvitationEmailError(
            "Administrator invitation token is unavailable."
        )

    frontend_url = settings.frontend_url.strip().rstrip("/") + "/"
    accept_path = (
        settings.admin_invitation_accept_path.strip().lstrip("/")
    )

    if not frontend_url or not accept_path:
        raise AdminInvitationEmailConfigurationError(
            "Administrator invitation URL configuration is incomplete."
        )

    base_url = urljoin(
        frontend_url,
        accept_path,
    )

    return f"{base_url}?{urlencode({'token': token})}"


def _validate_email_configuration() -> None:
    if settings.email_provider.strip().lower() != "resend":
        raise AdminInvitationEmailConfigurationError(
            "Unsupported transactional email provider."
        )

    if not settings.resend_api_key.strip():
        raise AdminInvitationEmailConfigurationError(
            "Transactional email provider credential is missing."
        )

    if not settings.admin_invitation_from_email.strip():
        raise AdminInvitationEmailConfigurationError(
            "Administrator invitation sender is missing."
        )

    if not settings.frontend_url.strip():
        raise AdminInvitationEmailConfigurationError(
            "Frontend URL is missing."
        )


def _build_html(
    *,
    invitation_url: str,
    role: str,
) -> str:
    safe_url = escape(
        invitation_url,
        quote=True,
    )
    safe_role = escape(
        role,
        quote=True,
    )

    return f"""
<!doctype html>
<html lang="en">
  <body
    style="
      margin:0;
      padding:0;
      background:#070707;
      color:#f5f5f5;
      font-family:Arial,Helvetica,sans-serif;
    "
  >
    <div
      style="
        max-width:600px;
        margin:0 auto;
        padding:48px 24px;
      "
    >
      <div
        style="
          border:1px solid #262626;
          border-radius:18px;
          padding:32px;
          background:#101010;
        "
      >
        <div
          style="
            font-size:22px;
            font-weight:700;
            margin-bottom:20px;
          "
        >
          BAKABOOST
        </div>

        <h1
          style="
            font-size:24px;
            line-height:1.3;
            margin:0 0 16px;
          "
        >
          Administrator invitation
        </h1>

        <p
          style="
            color:#c7c7c7;
            line-height:1.6;
            margin:0 0 18px;
          "
        >
          You have been invited to join the BAKABOOST
          administration team with the role
          <strong>{safe_role}</strong>.
        </p>

        <p
          style="
            color:#c7c7c7;
            line-height:1.6;
            margin:0 0 26px;
          "
        >
          This invitation is intended only for the email
          address that received it and can be used once.
        </p>

        <a
          href="{safe_url}"
          style="
            display:inline-block;
            padding:13px 20px;
            border-radius:10px;
            background:#ffffff;
            color:#000000;
            text-decoration:none;
            font-weight:700;
          "
        >
          Accept invitation
        </a>

        <p
          style="
            color:#777777;
            font-size:12px;
            line-height:1.5;
            margin:28px 0 0;
          "
        >
          If you were not expecting this invitation,
          you can safely ignore this email.
        </p>
      </div>
    </div>
  </body>
</html>
""".strip()


async def send_admin_invitation_email(
    *,
    recipient_email: str,
    role: str,
    raw_token: str,
) -> AdminInvitationEmailDelivery:
    """
    Deliver a one-time administrator invitation using Resend.

    SECURITY CONTRACT
    -----------------
    - raw invitation token is never logged
    - provider response body is not exposed on failure
    - provider credential remains server-side
    - non-success provider responses fail closed
    """
    _validate_email_configuration()

    recipient = recipient_email.strip().lower()

    if not recipient:
        raise AdminInvitationEmailError(
            "Administrator invitation recipient is invalid."
        )

    invitation_url = build_admin_invitation_accept_url(
        raw_token=raw_token,
    )

    payload: dict[str, object] = {
        "from": settings.admin_invitation_from_email.strip(),
        "to": [recipient],
        "subject": "You are invited to BAKABOOST",
        "html": _build_html(
            invitation_url=invitation_url,
            role=role,
        ),
    }

    reply_to = (
        settings.admin_invitation_reply_to.strip()
    )

    if reply_to:
        payload["reply_to"] = reply_to

    headers = {
        "Authorization": (
            f"Bearer {settings.resend_api_key.strip()}"
        ),
        "Content-Type": "application/json",
    }

    try:
        async with httpx.AsyncClient(
            timeout=_EMAIL_TIMEOUT_SECONDS,
        ) as client:
            response = await client.post(
                _RESEND_EMAILS_URL,
                headers=headers,
                json=payload,
            )
    except httpx.HTTPError as exc:
        raise AdminInvitationEmailError(
            "Administrator invitation email delivery failed."
        ) from exc

    if not 200 <= response.status_code < 300:
        raise AdminInvitationEmailError(
            "Administrator invitation email delivery failed."
        )

    try:
        response_data = response.json()
    except ValueError as exc:
        raise AdminInvitationEmailError(
            "Transactional email provider returned an invalid response."
        ) from exc

    provider_message_id = response_data.get("id")

    if (
        not isinstance(provider_message_id, str)
        or not provider_message_id.strip()
    ):
        raise AdminInvitationEmailError(
            "Transactional email provider did not confirm delivery."
        )

    return AdminInvitationEmailDelivery(
        provider="resend",
        provider_message_id=provider_message_id.strip(),
    )

from typing import Annotated

from fastapi import Cookie, Depends, Header, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.permissions import Permission, role_has_permission
from app.db.models.admin import Admin
from app.db.models.mobile_capture_session import (
    MobileCaptureSession,
)
from app.db.models.verification_session import (
    VerificationSession,
)
from app.db.session import get_db_session
from app.services.admin.auth import (
    AdminAuthenticationError,
    AdminMFARequiredError,
    AdminReauthenticationRequiredError,
    decode_admin_token,
    get_admin_for_identity,
    require_admin_mfa,
    require_recent_admin_authentication,
)
from app.services.security.csrf import (
    CSRFValidationError,
    validate_csrf_token,
)
from app.services.verification.mobile_capture_service import (
    InvalidMobileCaptureSessionError,
    get_valid_mobile_capture_session,
)
from app.services.verification.session_service import (
    InvalidVerificationSessionError,
    get_valid_verification_session,
)

bearer_scheme = HTTPBearer(
    auto_error=False,
)


BearerCredentials = Annotated[
    HTTPAuthorizationCredentials | None,
    Depends(bearer_scheme),
]

DatabaseSession = Annotated[
    AsyncSession,
    Depends(get_db_session),
]


async def get_current_admin(
    credentials: Annotated[
        HTTPAuthorizationCredentials | None,
        Depends(bearer_scheme),
    ],
    session: Annotated[
        AsyncSession,
        Depends(get_db_session),
    ],
) -> Admin:
    if credentials is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required.",
        )

    try:
        identity = decode_admin_token(
            credentials.credentials
        )

        require_admin_mfa(identity)

        admin = await get_admin_for_identity(
            session,
            identity=identity,
        )

    except AdminMFARequiredError as exc:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Additional administrator authentication required.",
        ) from exc

    except AdminAuthenticationError as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid administrator authentication.",
        ) from exc

    return admin


CurrentAdmin = Annotated[
    Admin,
    Depends(get_current_admin),
]

def require_permission(
    permission: Permission,
):
    async def dependency(
        admin: Annotated[
            Admin,
            Depends(get_current_admin),
        ],
    ) -> Admin:
        if not role_has_permission(
            admin.role,
            permission,
        ):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Insufficient permissions.",
            )

        return admin

    return dependency

def require_sensitive_permission(
    permission: Permission,
):
    async def dependency(
        admin: Annotated[
            Admin,
            Depends(get_sensitive_admin),
        ],
    ) -> Admin:
        if not role_has_permission(
            admin.role,
            permission,
        ):
            raise HTTPException(
                status_code=(
                    status.HTTP_403_FORBIDDEN
                ),
                detail=(
                    "Insufficient permissions."
                ),
            )

        return admin

    return dependency

async def get_verification_session(
    session: Annotated[
        AsyncSession,
        Depends(get_db_session),
    ],
    verification_session: Annotated[
        str | None,
        Cookie(),
    ] = None,
) -> VerificationSession:
    if not verification_session:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Verification authentication required.",
        )

    try:
        current_session = await get_valid_verification_session(
            session,
            raw_token=verification_session,
        )

    except InvalidVerificationSessionError as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Verification authentication required.",
        ) from exc

    return current_session

async def get_sensitive_admin(
    credentials: Annotated[
        HTTPAuthorizationCredentials | None,
        Depends(bearer_scheme),
    ],
    session: Annotated[
        AsyncSession,
        Depends(get_db_session),
    ],
) -> Admin:
    if credentials is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required.",
        )

    try:
        identity = decode_admin_token(
            credentials.credentials
        )

        require_admin_mfa(identity)
        require_recent_admin_authentication(
            identity
        )

        admin = await get_admin_for_identity(
            session,
            identity=identity,
        )

    except AdminReauthenticationRequiredError:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Administrator reauthentication required.",
        )

    except AdminMFARequiredError:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Additional administrator authentication required.",
        )

    except AdminAuthenticationError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid administrator authentication.",
        )

    return admin

async def require_verification_csrf(
    verification_csrf: Annotated[
        str | None,
        Cookie(
            alias=settings.csrf_cookie_name
        ),
    ] = None,
    csrf_header: Annotated[
        str | None,
        Header(
            alias=settings.csrf_header_name
        ),
    ] = None,
) -> None:
    try:
        validate_csrf_token(
            cookie_token=verification_csrf,
            header_token=csrf_header,
        )

    except CSRFValidationError:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Invalid request verification.",
        )

async def get_mobile_capture_session(
    session: Annotated[
        AsyncSession,
        Depends(get_db_session),
    ],
    mobile_capture_session: Annotated[
        str | None,
        Cookie(
            alias=(
                settings
                .mobile_capture_cookie_name
            )
        ),
    ] = None,
) -> MobileCaptureSession:
    if not mobile_capture_session:
        raise HTTPException(
            status_code=(
                status.HTTP_401_UNAUTHORIZED
            ),
            detail=(
                "Mobile capture authentication required."
            ),
        )

    try:
        current_session = (
            await get_valid_mobile_capture_session(
                session,
                raw_mobile_token=(
                    mobile_capture_session
                ),
            )
        )

    except InvalidMobileCaptureSessionError as exc:
        raise HTTPException(
            status_code=(
                status.HTTP_401_UNAUTHORIZED
            ),
            detail=(
                "Mobile capture authentication required."
            ),
        ) from exc

    return current_session
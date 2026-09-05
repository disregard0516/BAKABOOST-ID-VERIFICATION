from fastapi import (
    APIRouter,
    Depends,
)

from app.api.rate_limits import rate_limit
from app.api.routes.admin.access import (
    router as admin_access_router,
)
from app.api.routes.admin.auth import (
    router as admin_auth_router,
)
from app.api.routes.admin.lifecycle import (
    router as admin_lifecycle_router,
)
from app.api.routes.admin.notes import (
    router as admin_notes_router,
)
from app.api.routes.admin.queue import (
    router as admin_queue_router,
)
from app.api.routes.admin.review import (
    router as admin_review_router,
)
from app.api.routes.admin.team import (
    router as admin_team_router,
)
from app.api.routes.admin.verification_requests import (
    router as admin_verification_requests_router,
)
from app.api.routes.auth.discord import (
    router as discord_auth_router,
)
from app.api.routes.verification.access import (
    router as verification_access_router,
)
from app.api.routes.verification.account import (
    router as verification_account_router,
)
from app.api.routes.verification.evidence import (
    router as evidence_router,
)
from app.api.routes.verification.form_config import (
    router as verification_form_config_router,
)
from app.api.routes.verification.mobile_capture import (
    router as mobile_capture_router,
)
from app.api.routes.verification.mobile_handoff import (
    router as mobile_handoff_router,
)
from app.api.routes.verification.public_request import (
    router as public_request_router,
)
from app.api.routes.verification.session import (
    router as verification_session_router,
)
from app.api.routes.verification.status import (
    router as verification_status_router,
)
from app.api.routes.verification.submission import (
    router as submission_router,
)
from app.core.config import settings

api_router = APIRouter()


# ---------------------------------------------------------
# ADMIN API GLOBAL RATE LIMIT
# ---------------------------------------------------------

admin_rate_limit = Depends(
    rate_limit(
        namespace="admin_api",
        limit=settings.admin_api_rate_limit,
    )
)


# ---------------------------------------------------------
# ADMIN ROUTES
# ---------------------------------------------------------

api_router.include_router(
    admin_auth_router,
    prefix="/admin",
    dependencies=[
        admin_rate_limit,
    ],
)

api_router.include_router(
    admin_verification_requests_router,
    prefix="/admin",
    dependencies=[
        admin_rate_limit,
    ],
)

api_router.include_router(
    admin_queue_router,
    prefix="/admin",
    dependencies=[
        admin_rate_limit,
    ],
)

api_router.include_router(
    admin_review_router,
    prefix="/admin",
    dependencies=[
        admin_rate_limit,
    ],
)

api_router.include_router(
    admin_lifecycle_router,
    prefix="/admin",
    dependencies=[
        admin_rate_limit,
    ],
)

api_router.include_router(
    admin_access_router,
    prefix="/admin",
    dependencies=[
        admin_rate_limit,
    ],
)

api_router.include_router(
    admin_notes_router,
    prefix="/admin",
    dependencies=[
        admin_rate_limit,
    ],
)

api_router.include_router(
    admin_team_router,
    prefix="/admin",
    dependencies=[
        admin_rate_limit,
    ],
)

# ---------------------------------------------------------
# DISCORD AUTHENTICATION
# ---------------------------------------------------------

api_router.include_router(
    discord_auth_router,
)


# ---------------------------------------------------------
# PUBLIC / APPLICANT VERIFICATION ROUTES
# ---------------------------------------------------------

api_router.include_router(
    public_request_router,
)

api_router.include_router(
    verification_account_router,
)

api_router.include_router(
    evidence_router,
)

api_router.include_router(
    submission_router,
)

api_router.include_router(
    verification_status_router,
)

api_router.include_router(
    verification_access_router,
)

api_router.include_router(
    verification_session_router,
)

api_router.include_router(
    verification_form_config_router,
)

api_router.include_router(
    mobile_capture_router,
)

api_router.include_router(
    mobile_handoff_router,
)
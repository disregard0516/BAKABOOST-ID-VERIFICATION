from urllib.parse import urlparse

from app.core.config import settings


class UnsafeProductionConfiguration(RuntimeError):
   pass


def _require_https(
   name: str,
   value: str,
) -> None:
   parsed = urlparse(value.strip())

   if (
       parsed.scheme.lower() != "https"
       or not parsed.netloc
   ):
       raise UnsafeProductionConfiguration(
           f"{name} must use a valid HTTPS URL "
           "in production."
       )


def _require_cloudflare_access_team_domain(
   value: str,
) -> None:
   team_domain = value.strip().lower()

   if not team_domain:
       raise UnsafeProductionConfiguration(
           "Cloudflare Access team domain is missing."
       )

   #
   # Configuration stores only the hostname:
   #
   # example.cloudflareaccess.com
   #
   # Schemes, paths, query strings and fragments are not
   # accepted. Keeping this value canonical allows the
   # authentication service to safely derive the issuer and
   # signing-certificate endpoint.
   #
   parsed = urlparse(
       f"https://{team_domain}"
   )

   if (
       parsed.hostname != team_domain
       or parsed.port is not None
       or parsed.path not in {"", "/"}
       or parsed.params
       or parsed.query
       or parsed.fragment
       or not team_domain.endswith(
           ".cloudflareaccess.com"
       )
   ):
       raise UnsafeProductionConfiguration(
           "CLOUDFLARE_ACCESS_TEAM_DOMAIN must be "
           "a valid cloudflareaccess.com hostname."
       )


def validate_runtime_security() -> None:
   if (
       settings.app_environment
       != "production"
   ):
       return

   if settings.debug:
       raise UnsafeProductionConfiguration(
           "DEBUG must be false in production."
       )

   _require_https(
       "FRONTEND_URL",
       settings.frontend_url,
   )

   _require_https(
       "BACKEND_URL",
       settings.backend_url,
   )

   if not settings.cookie_secure:
       raise UnsafeProductionConfiguration(
           "COOKIE_SECURE must be true in production."
       )

   forbidden_secrets = {
       "",
       "CHANGE_ME_IN_ENV",
       (
           "replace-this-with-a-long-"
           "random-secret"
       ),
   }

   secret_values = {
       "SESSION_SECRET": (
           settings.session_secret
       ),
       "VERIFICATION_TOKEN_PEPPER": (
           settings
           .verification_token_pepper
       ),
       "ACCESS_GRANT_ENCRYPTION_KEY": (
           settings
           .access_grant_encryption_key
       ),
   }

   for name, value in (
       secret_values.items()
   ):
       if (
           value.strip()
           in forbidden_secrets
       ):
           raise UnsafeProductionConfiguration(
               f"{name} is not securely "
               "configured."
           )

   #
   # Development-only administrator authentication must
   # never be available in production.
   #
   if settings.dev_admin_auth_enabled:
       raise UnsafeProductionConfiguration(
           "Development administrator "
           "authentication must be disabled "
           "in production."
       )

   #
   # Cloudflare Access is the external administrator
   # authentication boundary.
   #
   # BAKABOOST will cryptographically validate the Access
   # application JWT before exchanging it for its own
   # server-managed administrator session.
   #
   _require_cloudflare_access_team_domain(
       settings.cloudflare_access_team_domain
   )

   if (
       not settings
       .cloudflare_access_audience
       .strip()
   ):
       raise UnsafeProductionConfiguration(
           "Cloudflare Access audience is missing."
       )

   if (
       not settings
       .cloudflare_access_step_up_audience
       .strip()
   ):
       raise UnsafeProductionConfiguration(
           "Cloudflare Access step-up audience is missing."
       )
   if (
   	not settings
   	.cloudflare_access_enrollment_audience
   	.strip()
   ):
   	raise UnsafeProductionConfiguration(
           "Cloudflare Access enrollment audience is missing."
       )

   if (
       settings.cloudflare_access_step_up_audience.strip()
       == settings.cloudflare_access_audience.strip()
   ):
       raise UnsafeProductionConfiguration(
           "Cloudflare Access step-up audience must be "
           "different from the normal administrator "
           "Access audience."
       )
   if (
   	settings.cloudflare_access_enrollment_audience.strip()
   	== settings.cloudflare_access_audience.strip()
   ):
       raise UnsafeProductionConfiguration(
           "Cloudflare Access enrollment audience must be "
           "different from the normal administrator "
           "Access audience."
   	)
   if (
   	settings.cloudflare_access_enrollment_audience.strip()
   	== settings.cloudflare_access_step_up_audience.strip()
   ):
       raise UnsafeProductionConfiguration(
           "Cloudflare Access enrollment audience must be "
           "different from the step-up Access audience."
        )
   #
   # Production rate limiting is mandatory.
   #
   # An operator must not be able to bypass abuse protection
   # by setting RATE_LIMITING_ENABLED=false.
   #
   if not settings.rate_limiting_enabled:
       raise UnsafeProductionConfiguration(
           "Rate limiting must be enabled "
           "in production."
       )

   if not settings.redis_url.strip():
       raise UnsafeProductionConfiguration(
           "Redis is required for production "
           "rate limiting."
       )

   #
   # Reject obviously invalid Redis URLs before the
   # application starts serving traffic.
   #
   redis_scheme = urlparse(
       settings.redis_url
   ).scheme.lower()

   if redis_scheme not in {
       "redis",
       "rediss",
       "unix",
   }:
       raise UnsafeProductionConfiguration(
           "REDIS_URL has an unsupported scheme."
       )

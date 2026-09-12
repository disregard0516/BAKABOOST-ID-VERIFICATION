# Security Policy

SCANLY is a security-sensitive identity verification and controlled Discord access platform.

## Supported Versions

Security fixes are applied to the current production branch and actively maintained release line.

| Version | Supported |
| --- | --- |
| Current production | Yes |
| Older snapshots | No |

## Reporting a Vulnerability

Please do not open a public GitHub issue for suspected security vulnerabilities.

Report security concerns privately to:

**security@scanly.link**

Include, where possible:

- A clear description of the issue
- Affected endpoint, page, or component
- Reproduction steps
- Expected vs actual behavior
- Potential security impact
- Relevant logs, screenshots, or request details
- Suggested remediation, if known

Do not include production credentials, access tokens, private identity evidence, or other sensitive user data in the report.

## Responsible Disclosure

Please allow reasonable time for investigation and remediation before publicly disclosing a vulnerability.

Avoid actions that could:

- Access or alter another user's data
- Bypass identity verification controls
- Interfere with production availability
- Obtain or expose private evidence
- Abuse Discord access grants
- Circumvent administrator authorization or MFA controls

## Security Architecture

SCANLY uses multiple security boundaries, including:

- Immutable Discord User ID binding
- OAuth-based identity matching
- Manual administrator review
- RBAC and privileged-action controls
- CSRF protection
- Audit logging
- Private evidence storage
- Expiring or controlled access grants
- Cloudflare Access edge protection
- Administrator step-up authentication
- Server-side verification state enforcement

No individual control should be treated as the sole security boundary.

## Credentials and Secrets

Production secrets must never be committed to this repository.

This includes:

- Discord bot tokens
- Cloudflare API tokens
- Email provider API keys
- Database credentials
- Private keys
- Session secrets
- OAuth client secrets
- Storage credentials

Environment-specific secrets must be supplied outside version control.

## Security Status

SCANLY is under active development and security hardening.

The project should not be interpreted as independently audited, formally certified, or guaranteed vulnerability-free.

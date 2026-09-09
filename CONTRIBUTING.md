# Contributing to BAKABOOST

Thank you for contributing to BAKABOOST.

BAKABOOST is a security-sensitive identity verification and controlled Discord access platform. Changes should prioritize security, correctness, privacy, and maintainability.

## Development Principles

Contributions should:

- Preserve immutable Discord User ID binding
- Keep verification state transitions explicit
- Enforce authorization server-side
- Preserve administrator RBAC and session controls
- Avoid exposing identity evidence or sensitive metadata
- Maintain auditability of security-sensitive actions
- Never weaken verification or access controls for convenience
- Keep production secrets outside version control

## Backend

The backend uses Python, FastAPI, SQLAlchemy, PostgreSQL, and Alembic.

Install development dependencies:

    python -m pip install -e ".[dev]"

Run linting:

    ruff check app tests

Run tests:

    pytest -q

Database schema changes must include an appropriate Alembic migration.

## Frontend

The frontend uses Next.js, React, and TypeScript.

From the `frontend` directory:

    npm install
    npm run lint
    npm run build

Both lint and production build should pass before submitting changes.

## Pull Requests

Keep pull requests focused and clearly describe:

- What changed
- Why the change is necessary
- Security implications
- Database or migration changes
- Configuration changes
- Tests performed

Avoid combining unrelated refactors and feature changes in the same pull request.

## Security-Sensitive Changes

Changes involving authentication, authorization, verification state, evidence storage, administrator access, Discord access grants, sessions, CSRF, Cloudflare Access, or secrets require additional review.

Do not include real credentials, production tokens, private keys, identity documents, or sensitive production data in commits, tests, screenshots, issues, or pull requests.

For vulnerabilities, follow `SECURITY.md` rather than opening a public issue.

## Commit Messages

Use concise, descriptive commit messages.

Examples:

    feat: automate approved Discord access
    fix: enforce verification request ownership
    security: harden administrator session validation
    test: cover access grant consumption
    docs: document deployment security requirements

## Before Submitting

Confirm:

- Backend lint passes
- Backend tests pass
- Frontend lint passes
- Frontend production build passes
- Required migrations are included
- No secrets or generated artifacts are committed
- Security-sensitive behavior has appropriate tests

## License

Contribution or repository access does not imply permission to redistribute, sublicense, or commercially reuse BAKABOOST.

Any licensing terms are determined separately by the repository owner.

from __future__ import annotations

import uuid

from starlette.types import (
    ASGIApp,
    Message,
    Receive,
    Scope,
    Send,
)


class RequestContextMiddleware:
    """
    Generate a server-controlled correlation ID for every
    HTTP request.

    Security properties:

    - A fresh identifier is generated at the trusted
      application boundary.
    - Client-supplied X-Request-ID values are intentionally
      ignored.
    - The identifier is stored on request.state through the
      ASGI scope.
    - The same identifier is returned in X-Request-ID so
      application logs, audit events, and client-visible
      failures can be correlated safely.

    This middleware contains no authentication or
    authorization logic.
    """

    def __init__(
        self,
        app: ASGIApp,
    ) -> None:
        self.app = app

    async def __call__(
        self,
        scope: Scope,
        receive: Receive,
        send: Send,
    ) -> None:
        if scope["type"] != "http":
            await self.app(
                scope,
                receive,
                send,
            )
            return

        request_id = str(uuid.uuid4())

        state = scope.setdefault(
            "state",
            {},
        )

        state["request_id"] = request_id

        async def send_with_request_id(
            message: Message,
        ) -> None:
            if message["type"] == "http.response.start":
                headers = list(
                    message.get(
                        "headers",
                        [],
                    )
                )

                headers.append(
                    (
                        b"x-request-id",
                        request_id.encode(
                            "ascii"
                        ),
                    )
                )

                message["headers"] = headers

            await send(message)

        await self.app(
            scope,
            receive,
            send_with_request_id,
        )
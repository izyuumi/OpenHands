import os

import socketio
from starlette.types import ASGIApp, Receive, Scope, Send

from openhands.server.app import app as base_app
from openhands.server.listen_socket import sio
from openhands.server.middleware import (
    CacheControlMiddleware,
    InMemoryRateLimiter,
    LocalhostCORSMiddleware,
    RateLimitMiddleware,
)
from openhands.server.static import SPAStaticFiles


class SocketIOStaticRouter:
    """Custom ASGI router that properly handles WebSocket and HTTP requests"""

    def __init__(self, socketio_app: ASGIApp, static_app: ASGIApp):
        self.socketio_app = socketio_app
        self.static_app = static_app

    async def __call__(self, scope: Scope, receive: Receive, send: Send):
        # Let Socket.IO handle WebSocket requests and socket.io paths
        if scope["type"] == "websocket" or scope["path"].startswith("/socket.io"):
            await self.socketio_app(scope, receive, send)
        # For HTTP requests to API paths, let the base FastAPI app handle them
        elif scope["type"] == "http" and scope["path"].startswith("/api"):
            await self.socketio_app(scope, receive, send)
        # For other HTTP requests, try static files
        elif scope["type"] == "http":
            await self.static_app(scope, receive, send)
        else:
            # For any other type of request, let Socket.IO handle it
            await self.socketio_app(scope, receive, send)


if os.getenv('SERVE_FRONTEND', 'true').lower() == 'true':
    # Create static files handler
    static_files = SPAStaticFiles(directory='./frontend/build', html=True)

    # Create Socket.IO ASGI app
    socketio_app = socketio.ASGIApp(sio, other_asgi_app=base_app)

    # Use custom router
    app = SocketIOStaticRouter(socketio_app, static_files)
else:
    app = socketio.ASGIApp(sio, other_asgi_app=base_app)

base_app.add_middleware(LocalhostCORSMiddleware)
base_app.add_middleware(CacheControlMiddleware)
base_app.add_middleware(
    RateLimitMiddleware,
    rate_limiter=InMemoryRateLimiter(requests=10, seconds=1),
)

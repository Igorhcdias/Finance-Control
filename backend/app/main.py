from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from .config import get_settings
from .http_errors import register_exception_handlers
from .routers import router
from .security import token_lifetime


def create_app():
    settings = get_settings()
    token_lifetime(settings.jwt_expires_in)
    app = FastAPI(title="Finance-Control API", redirect_slashes=False)
    app.add_middleware(CORSMiddleware, allow_origins=[settings.frontend_url], allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"], allow_headers=["Authorization", "Content-Type"])
    register_exception_handlers(app)

    @app.middleware("http")
    async def trailing_slash_compatibility(request: Request, call_next):
        if request.scope["path"] != "/":
            request.scope["path"] = request.scope["path"].rstrip("/")
        return await call_next(request)

    @app.get("/health")
    def health():
        return {"status": "ok"}

    app.include_router(router)
    return app


app = create_app()

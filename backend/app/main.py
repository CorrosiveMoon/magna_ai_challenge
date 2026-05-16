from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from jose import jwt as _jwt
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded

from .config import settings
from .routers import generate, generations, improve


def _rate_limit_key(request: Request) -> str:
    """Use authenticated user ID as rate-limit key; fall back to IP for unauthenticated requests."""
    auth = request.headers.get("authorization", "")
    if auth.startswith("Bearer "):
        try:
            claims = _jwt.get_unverified_claims(auth[7:])
            if sub := claims.get("sub"):
                return sub
        except Exception:
            pass
    return get_remote_address(request)


limiter = Limiter(key_func=_rate_limit_key, default_limits=[f"{settings.rate_limit_per_min}/minute"])

app = FastAPI(
    title="Magna AI Content Suite",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
)

app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(generate.router, prefix="/api")
app.include_router(generations.router, prefix="/api")
app.include_router(improve.router, prefix="/api")


@app.get("/health", tags=["health"])
async def health():
    return {"status": "ok", "version": "1.0.0"}


@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    return JSONResponse(
        status_code=500,
        content={"error": {"code": "INTERNAL_ERROR", "message": "An unexpected error occurred"}},
    )

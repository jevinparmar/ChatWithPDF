from contextlib import asynccontextmanager
from fastapi import FastAPI, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded

from app.api.routes_admin import router as admin_router
from app.api.routes_auth import limiter, router as auth_router
from app.api.routes_chat import router as chat_router
from app.api.routes_documents import router as documents_router
from app.config import settings
from app.core.embeddings import embedding_service
from app.db.database import init_db_extensions
from app.utils.logger import logger


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifecycle events: initialize extensions, models, and storage."""
    logger.info("Initializing ChatWithPDF Backend...")
    try:
        await init_db_extensions()
    except Exception as e:
        logger.warning(f"Database pgvector extension check warning: {e}")

    # Pre-load embedding model so first query doesn't experience cold-start latency
    try:
        embedding_service.load_model()
    except Exception as e:
        logger.warning(f"Embedding model pre-load warning: {e}")

    settings.UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
    logger.info("Backend initialization complete.")
    yield
    logger.info("ChatWithPDF Backend shutting down.")


def create_app() -> FastAPI:
    """FastAPI application factory."""
    app = FastAPI(
        title="ChatWithPDF API",
        description="RAG Document Q&A API with pgvector similarity search and source citations",
        version="1.0.0",
        docs_url="/docs",
        redoc_url="/redoc",
        lifespan=lifespan,
    )

    # Attach slowapi rate limiter
    app.state.limiter = limiter
    app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

    # CORS Middleware
    origins = settings.cors_origins_list
    app.add_middleware(
        CORSMiddleware,
        allow_origins=origins,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    # Health Check endpoint
    @app.get("/health", tags=["Health"])
    async def health_check():
        return {"status": "ok"}

    # Include API routers under /api prefix
    app.include_router(auth_router, prefix="/api")
    app.include_router(documents_router, prefix="/api")
    app.include_router(chat_router, prefix="/api")
    app.include_router(admin_router, prefix="/api")

    # Global unhandled exception handler ensuring consistent JSON format
    @app.exception_handler(Exception)
    async def global_exception_handler(request: Request, exc: Exception):
        logger.exception(f"Unhandled error processing {request.method} {request.url.path}: {exc}")
        return JSONResponse(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            content={"detail": "An internal server error occurred"},
        )

    return app


app = create_app()

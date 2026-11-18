import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .config import settings
from .database import engine, Base
from .routers import tickets, investigation, escalations, analytics, ai

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("supportdesk")

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Create tables automatically on startup
    logger.info("Initializing database schema...")
    Base.metadata.create_all(bind=engine)
    logger.info("Database schema initialized.")
    yield
    logger.info("Shutting down SupportDesk backend.")

app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    description="SupportDesk - Intelligent Support Operations & Escalation Quality Platform for RideOps",
    lifespan=lifespan
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount API Routers
app.include_router(tickets.router)
app.include_router(investigation.router)
app.include_router(escalations.router)
app.include_router(analytics.router)
app.include_router(ai.router)
app.include_router(ai.legacy_router)

@app.get("/api/health")
def health_check():
    return {
        "status": "healthy",
        "service": "SupportDesk API",
        "version": settings.VERSION,
        "environment": settings.ENVIRONMENT
    }

@app.get("/")
def root():
    return {
        "message": "Welcome to SupportDesk API",
        "docs": "/docs",
        "health": "/api/health"
    }

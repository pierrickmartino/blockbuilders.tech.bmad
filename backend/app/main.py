from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings

from app.api.alerts import router as alerts_router
from app.api.auth import router as auth_router
from app.api.backtests import router as backtests_router
from app.api.health import router as health_router
from app.api.notifications import router as notifications_router
from app.api.strategies import router as strategies_router
from app.api.usage import router as usage_router
from app.api.users import router as users_router

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=[origin.strip() for origin in settings.cors_origins.split(",")],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(health_router)
app.include_router(auth_router)
app.include_router(users_router)
app.include_router(usage_router)
app.include_router(strategies_router)
app.include_router(backtests_router)
app.include_router(notifications_router)
app.include_router(alerts_router)

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings

from app.api.auth import router as auth_router
from app.api.backtests import router as backtests_router
from app.api.health import router as health_router
from app.api.strategies import router as strategies_router
from app.api.usage import router as usage_router
from app.api.users import router as users_router
from app.core.config import settings

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins.split(","),
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

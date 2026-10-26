"""Register feature routers under the existing API prefix."""
from fastapi import APIRouter
from .auth.router import router as auth_router
from .users.router import router as users_router
from .categories.router import router as categories_router
from .transactions.router import router as transactions_router
from .investments.router import router as investments_router
from .dashboard.router import router as dashboard_router

router = APIRouter(prefix="/api")
for feature_router in (auth_router, users_router, categories_router, transactions_router, investments_router, dashboard_router):
    router.include_router(feature_router)

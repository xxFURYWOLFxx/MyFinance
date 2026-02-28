from fastapi import APIRouter
from .auth import router as auth_router
from .income import router as income_router
from .expenses import router as expenses_router
from .savings import router as savings_router
from .budgets import router as budgets_router
from .goals import router as goals_router
from .business import router as business_router
from .investments import router as investments_router
from .debts import router as debts_router
from .recurring import router as recurring_router
from .dashboard import router as dashboard_router
from .reports import router as reports_router
from .admin import router as admin_router
from .forecasting import router as forecasting_router
from .archive import router as archive_router
from .search import router as search_router
from .notifications import router as notifications_router
from .export import router as export_router

api_router = APIRouter()

# Include all routers
api_router.include_router(auth_router)
api_router.include_router(dashboard_router)
api_router.include_router(income_router)
api_router.include_router(expenses_router)
api_router.include_router(savings_router)
api_router.include_router(budgets_router)
api_router.include_router(goals_router)
api_router.include_router(business_router)
api_router.include_router(investments_router)
api_router.include_router(debts_router)
api_router.include_router(recurring_router)
api_router.include_router(reports_router)
api_router.include_router(admin_router)
api_router.include_router(forecasting_router)
api_router.include_router(archive_router)
api_router.include_router(search_router)
api_router.include_router(notifications_router)
api_router.include_router(export_router)

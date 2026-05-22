from ninja import NinjaAPI

from applications.api import router as applications_router

api = NinjaAPI(title="Application Workflow Tracker API")

api.add_router("", applications_router)


@api.get("/", tags=["meta"])
def api_root(request):
    return {
        "name": "Application Workflow Tracker API",
        "docs": "/api/docs",
        "openapi": "/api/openapi.json",
        "health": "/api/health",
        "applications": "/api/applications",
    }


@api.get("/health", tags=["meta"])
def health(request):
    return {"status": "ok"}

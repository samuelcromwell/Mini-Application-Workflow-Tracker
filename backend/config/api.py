from ninja import NinjaAPI

from applications.api import router as applications_router

api = NinjaAPI(title="Application Workflow Tracker API")

api.add_router("", applications_router)


@api.get("/health")
def health(request):
    return {"status": "ok"}

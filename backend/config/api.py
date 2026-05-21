from ninja import NinjaAPI

api = NinjaAPI(title="Application Workflow Tracker API")


@api.get("/health")
def health(request):
    return {"status": "ok"}

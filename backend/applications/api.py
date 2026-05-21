from django.shortcuts import get_object_or_404
from ninja import Router
from ninja.errors import HttpError

from .models import Application
from .schemas import (
    ApplicationIn,
    ApplicationOut,
    ApplicationUpdateIn,
    ErrorOut,
    ReviewerDecisionIn,
)

router = Router(tags=["applications"])


def workflow_error(error: ValueError) -> HttpError:
    return HttpError(400, str(error))


@router.post("/applications", response={201: ApplicationOut})
def create_application(request, payload: ApplicationIn):
    application = Application.objects.create(**payload.dict())
    return 201, application


@router.get("/applications", response=list[ApplicationOut])
def list_applications(request):
    return Application.objects.all()


@router.get("/applications/{application_id}", response=ApplicationOut)
def get_application(request, application_id: int):
    return get_object_or_404(Application, id=application_id)


@router.patch(
    "/applications/{application_id}",
    response={200: ApplicationOut, 400: ErrorOut},
)
def update_application(request, application_id: int, payload: ApplicationUpdateIn):
    application = get_object_or_404(Application, id=application_id)

    if not application.can_edit:
        raise HttpError(400, "Only Draft or Need More Information applications can be edited.")

    for field, value in payload.dict(exclude_unset=True).items():
        setattr(application, field, value)

    application.save()
    return application


@router.post(
    "/applications/{application_id}/submit",
    response={200: ApplicationOut, 400: ErrorOut},
)
def submit_application(request, application_id: int):
    application = get_object_or_404(Application, id=application_id)

    try:
        application.submit()
    except ValueError as error:
        raise workflow_error(error) from error

    application.save(update_fields=["status", "submitted_at", "updated_at"])
    return application


@router.post(
    "/applications/{application_id}/start-review",
    response={200: ApplicationOut, 400: ErrorOut},
)
def start_review(request, application_id: int):
    application = get_object_or_404(Application, id=application_id)

    try:
        application.start_review()
    except ValueError as error:
        raise workflow_error(error) from error

    application.save(update_fields=["status", "updated_at"])
    return application


@router.post(
    "/applications/{application_id}/decision",
    response={200: ApplicationOut, 400: ErrorOut},
)
def record_reviewer_decision(request, application_id: int, payload: ReviewerDecisionIn):
    application = get_object_or_404(Application, id=application_id)

    try:
        application.record_decision(payload.status, payload.reviewer_comment)
    except ValueError as error:
        raise workflow_error(error) from error

    application.save(update_fields=["status", "reviewer_comment", "reviewed_at", "updated_at"])
    return application

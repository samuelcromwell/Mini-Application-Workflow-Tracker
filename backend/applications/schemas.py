from datetime import datetime
from typing import Literal, Optional

from ninja import Schema
from pydantic import EmailStr

from .models import Application

ApplicationType = Literal[
    "Recordation",
    "Renewal",
    "Change of Ownership",
    "Change of Name",
    "Discontinuation",
]

DecisionStatus = Literal[
    "Approved",
    "Need More Information",
    "Rejected",
]


class ApplicationIn(Schema):
    applicant_name: str
    applicant_email: EmailStr
    company_name: str
    application_type: ApplicationType
    description: str


class ApplicationUpdateIn(Schema):
    applicant_name: Optional[str] = None
    applicant_email: Optional[EmailStr] = None
    company_name: Optional[str] = None
    application_type: Optional[ApplicationType] = None
    description: Optional[str] = None


class ReviewerDecisionIn(Schema):
    status: DecisionStatus
    reviewer_comment: str = ""


class ApplicationOut(Schema):
    id: int
    tracking_number: str
    applicant_name: str
    applicant_email: str
    company_name: str
    application_type: str
    description: str
    status: str
    reviewer_comment: str
    created_at: datetime
    updated_at: datetime
    submitted_at: Optional[datetime]
    reviewed_at: Optional[datetime]


class ErrorOut(Schema):
    detail: str


_model_application_types = {choice.value for choice in Application.ApplicationType}
_schema_application_types = set(ApplicationType.__args__)
assert _model_application_types == _schema_application_types, (
    "ApplicationType literal is out of sync with Application.ApplicationType"
)

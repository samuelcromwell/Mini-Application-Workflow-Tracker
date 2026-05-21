from django.db import models
from django.utils import timezone
from uuid import uuid4


def generate_tracking_number() -> str:
    date_part = timezone.now().strftime("%Y%m%d")
    unique_part = uuid4().hex[:8].upper()
    return f"APP-{date_part}-{unique_part}"


class Application(models.Model):
    class ApplicationType(models.TextChoices):
        RECORDATION = "Recordation", "Recordation"
        RENEWAL = "Renewal", "Renewal"
        CHANGE_OF_OWNERSHIP = "Change of Ownership", "Change of Ownership"
        CHANGE_OF_NAME = "Change of Name", "Change of Name"
        DISCONTINUATION = "Discontinuation", "Discontinuation"

    class Status(models.TextChoices):
        DRAFT = "Draft", "Draft"
        SUBMITTED = "Submitted", "Submitted"
        UNDER_REVIEW = "Under Review", "Under Review"
        NEED_MORE_INFORMATION = "Need More Information", "Need More Information"
        APPROVED = "Approved", "Approved"
        REJECTED = "Rejected", "Rejected"

    tracking_number = models.CharField(
        max_length=32,
        unique=True,
        default=generate_tracking_number,
        editable=False,
    )
    applicant_name = models.CharField(max_length=255)
    applicant_email = models.EmailField()
    company_name = models.CharField(max_length=255)
    application_type = models.CharField(
        max_length=32,
        choices=ApplicationType.choices,
    )
    description = models.TextField()
    status = models.CharField(
        max_length=32,
        choices=Status.choices,
        default=Status.DRAFT,
    )
    reviewer_comment = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    submitted_at = models.DateTimeField(null=True, blank=True)
    reviewed_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self) -> str:
        return f"{self.tracking_number} - {self.applicant_name}"

    @property
    def can_edit(self) -> bool:
        return self.status in {
            self.Status.DRAFT,
            self.Status.NEED_MORE_INFORMATION,
        }

    def submit(self) -> None:
        if self.status not in {
            self.Status.DRAFT,
            self.Status.NEED_MORE_INFORMATION,
        }:
            raise ValueError("Only Draft or Need More Information applications can be submitted.")

        self.status = self.Status.SUBMITTED
        self.submitted_at = timezone.now()

    def start_review(self) -> None:
        if self.status != self.Status.SUBMITTED:
            raise ValueError("Only Submitted applications can move to Under Review.")

        self.status = self.Status.UNDER_REVIEW

    def record_decision(self, status: str, comment: str = "") -> None:
        allowed_decisions = {
            self.Status.NEED_MORE_INFORMATION,
            self.Status.APPROVED,
            self.Status.REJECTED,
        }

        if self.status != self.Status.UNDER_REVIEW:
            raise ValueError("Only Under Review applications can receive a reviewer decision.")

        if status not in allowed_decisions:
            raise ValueError("Reviewer decision must be Need More Information, Approved, or Rejected.")

        if status in {self.Status.NEED_MORE_INFORMATION, self.Status.REJECTED} and not comment.strip():
            raise ValueError("Reviewer comment is required for Need More Information or Rejected decisions.")

        self.status = status
        self.reviewer_comment = comment.strip()
        self.reviewed_at = timezone.now()

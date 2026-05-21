from django.contrib import admin

from .models import Application


@admin.register(Application)
class ApplicationAdmin(admin.ModelAdmin):
    list_display = (
        "tracking_number",
        "applicant_name",
        "company_name",
        "application_type",
        "status",
        "created_at",
    )
    list_filter = ("application_type", "status", "created_at")
    search_fields = (
        "tracking_number",
        "applicant_name",
        "applicant_email",
        "company_name",
    )
    readonly_fields = (
        "tracking_number",
        "created_at",
        "updated_at",
        "submitted_at",
        "reviewed_at",
    )

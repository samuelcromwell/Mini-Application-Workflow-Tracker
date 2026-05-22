import json

from django.test import Client, TestCase

from .models import Application


class HealthCheckTests(TestCase):
    def setUp(self):
        self.client = Client()

    def test_health_check_get_returns_ok(self):
        response = self.client.get("/api/health")

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json(), {"status": "ok"})

    def test_health_check_head_returns_ok_for_monitors(self):
        response = self.client.head("/api/health")

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.content, b"")


class ApplicationApiTests(TestCase):
    def setUp(self):
        self.client = Client()
        self.payload = {
            "applicant_name": "Jane Applicant",
            "applicant_email": "jane@example.com",
            "company_name": "Acme Ltd",
            "application_type": Application.ApplicationType.RECORDATION,
            "description": "Recordation request",
        }

    def post_json(self, path, payload=None):
        return self.client.post(
            path,
            data=json.dumps(payload or {}),
            content_type="application/json",
        )

    def patch_json(self, path, payload):
        return self.client.patch(
            path,
            data=json.dumps(payload),
            content_type="application/json",
        )

    def create_application(self):
        response = self.post_json("/api/applications", self.payload)
        self.assertEqual(response.status_code, 201)
        return Application.objects.get(id=response.json()["id"])

    def test_create_and_list_applications(self):
        application = self.create_application()

        response = self.client.get("/api/applications")

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()[0]["id"], application.id)
        self.assertEqual(response.json()[0]["status"], Application.Status.DRAFT)

    def test_draft_can_be_updated(self):
        application = self.create_application()

        response = self.patch_json(
            f"/api/applications/{application.id}",
            {"company_name": "Acme Holdings"},
        )

        self.assertEqual(response.status_code, 200)
        application.refresh_from_db()
        self.assertEqual(application.company_name, "Acme Holdings")

    def test_submitted_application_cannot_be_updated(self):
        application = self.create_application()
        self.post_json(f"/api/applications/{application.id}/submit")

        response = self.patch_json(
            f"/api/applications/{application.id}",
            {"company_name": "Acme Holdings"},
        )

        self.assertEqual(response.status_code, 400)

    def test_application_workflow_to_approval(self):
        application = self.create_application()

        submit_response = self.post_json(f"/api/applications/{application.id}/submit")
        review_response = self.post_json(f"/api/applications/{application.id}/start-review")
        decision_response = self.post_json(
            f"/api/applications/{application.id}/decision",
            {"status": Application.Status.APPROVED, "reviewer_comment": "Looks good."},
        )

        application.refresh_from_db()
        self.assertEqual(submit_response.status_code, 200)
        self.assertEqual(review_response.status_code, 200)
        self.assertEqual(decision_response.status_code, 200)
        self.assertEqual(application.status, Application.Status.APPROVED)
        self.assertIsNotNone(application.submitted_at)
        self.assertIsNotNone(application.reviewed_at)

    def test_rejected_decision_requires_comment(self):
        application = self.create_application()
        self.post_json(f"/api/applications/{application.id}/submit")
        self.post_json(f"/api/applications/{application.id}/start-review")

        response = self.post_json(
            f"/api/applications/{application.id}/decision",
            {"status": Application.Status.REJECTED, "reviewer_comment": ""},
        )

        self.assertEqual(response.status_code, 400)

    def test_need_more_information_can_be_edited_and_resubmitted(self):
        application = self.create_application()
        self.post_json(f"/api/applications/{application.id}/submit")
        self.post_json(f"/api/applications/{application.id}/start-review")
        self.post_json(
            f"/api/applications/{application.id}/decision",
            {
                "status": Application.Status.NEED_MORE_INFORMATION,
                "reviewer_comment": "Please add supporting details.",
            },
        )

        edit_response = self.patch_json(
            f"/api/applications/{application.id}",
            {"description": "Updated with supporting details."},
        )
        resubmit_response = self.post_json(f"/api/applications/{application.id}/submit")

        application.refresh_from_db()
        self.assertEqual(edit_response.status_code, 200)
        self.assertEqual(resubmit_response.status_code, 200)
        self.assertEqual(application.status, Application.Status.SUBMITTED)
        self.assertEqual(application.description, "Updated with supporting details.")

    def take_to_decision(self, application):
        self.post_json(f"/api/applications/{application.id}/submit")
        self.post_json(f"/api/applications/{application.id}/start-review")

    def test_approved_application_cannot_be_edited(self):
        application = self.create_application()
        self.take_to_decision(application)
        self.post_json(
            f"/api/applications/{application.id}/decision",
            {"status": Application.Status.APPROVED, "reviewer_comment": "Looks good."},
        )

        response = self.patch_json(
            f"/api/applications/{application.id}",
            {"company_name": "Acme Holdings"},
        )

        self.assertEqual(response.status_code, 400)

    def test_rejected_application_cannot_be_edited(self):
        application = self.create_application()
        self.take_to_decision(application)
        self.post_json(
            f"/api/applications/{application.id}/decision",
            {"status": Application.Status.REJECTED, "reviewer_comment": "Incomplete."},
        )

        response = self.patch_json(
            f"/api/applications/{application.id}",
            {"company_name": "Acme Holdings"},
        )

        self.assertEqual(response.status_code, 400)

    def test_start_review_rejected_when_not_submitted(self):
        application = self.create_application()

        response = self.post_json(f"/api/applications/{application.id}/start-review")

        self.assertEqual(response.status_code, 400)
        application.refresh_from_db()
        self.assertEqual(application.status, Application.Status.DRAFT)

    def test_decision_rejected_when_not_under_review(self):
        application = self.create_application()
        self.post_json(f"/api/applications/{application.id}/submit")

        response = self.post_json(
            f"/api/applications/{application.id}/decision",
            {"status": Application.Status.APPROVED, "reviewer_comment": ""},
        )

        self.assertEqual(response.status_code, 400)
        application.refresh_from_db()
        self.assertEqual(application.status, Application.Status.SUBMITTED)

    def test_need_more_information_decision_requires_comment(self):
        application = self.create_application()
        self.take_to_decision(application)

        response = self.post_json(
            f"/api/applications/{application.id}/decision",
            {"status": Application.Status.NEED_MORE_INFORMATION, "reviewer_comment": "   "},
        )

        self.assertEqual(response.status_code, 400)

    def test_create_rejects_invalid_application_type(self):
        payload = {**self.payload, "application_type": "Pizza"}

        response = self.post_json("/api/applications", payload)

        self.assertEqual(response.status_code, 422)

    def test_create_rejects_invalid_email(self):
        payload = {**self.payload, "applicant_email": "not-an-email"}

        response = self.post_json("/api/applications", payload)

        self.assertEqual(response.status_code, 422)

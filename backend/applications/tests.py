import json

from django.test import Client, TestCase

from .models import Application


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

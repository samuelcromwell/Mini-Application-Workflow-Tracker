# Mini Application Workflow Tracker

Take-home assessment for a small application workflow tracker built with a
Django Ninja backend API and a React frontend.

The workflow is:
`Draft → Submitted → Under Review → Need More Information / Approved / Rejected`

## Candidate

- Name: samuelcromwell
- Email: cromwellsamuel3@gmail.com

## Project Structure

```text
backend/    Django + Django Ninja API
frontend/   React (Vite) single-page app
```

## Tech Stack

- **Backend:** Python 3.12, Django 6, Django Ninja 1.6, SQLite (default)
- **Frontend:** React 18, Vite 6

## Prerequisites

- Python 3.10+
- Node.js 18+ and npm

## Backend

From the repository root:

```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -r backend/requirements.txt
cd backend
python manage.py migrate
python manage.py runserver
```

- API base: `http://127.0.0.1:8000/api/`
- Interactive API docs (Swagger UI): `http://127.0.0.1:8000/api/docs`
- Health check: `http://127.0.0.1:8000/api/health`

### Run migrations

```bash
source .venv/bin/activate
cd backend
python manage.py migrate
```

### Run tests

```bash
source .venv/bin/activate
cd backend
python manage.py test applications
```

### Optional: Django admin

```bash
python manage.py createsuperuser
python manage.py runserver
```

Then open `http://127.0.0.1:8000/admin/` to inspect/edit applications.

## Frontend

In a second terminal, from the repository root:

```bash
cd frontend
npm install
npm run dev
```

The app runs at `http://localhost:5174/` and talks to the backend on
`http://127.0.0.1:8000/api`. Override with `VITE_API_BASE_URL` if you need a
different host. CORS is pre-allowed for ports 5173 and 5174.

### Build for production

```bash
cd frontend
npm run build
npm run preview
```

## API Endpoints

| Method | Path                                       | Purpose                  |
|--------|--------------------------------------------|--------------------------|
| POST   | `/api/applications`                        | Create application draft |
| GET    | `/api/applications`                        | List applications        |
| GET    | `/api/applications/{id}`                   | Get application detail   |
| PATCH  | `/api/applications/{id}`                   | Update draft application |
| POST   | `/api/applications/{id}/submit`            | Submit application       |
| POST   | `/api/applications/{id}/start-review`      | Move to Under Review     |
| POST   | `/api/applications/{id}/decision`          | Record reviewer decision |

## End-to-end walkthrough (curl)

```bash
# 1. Create a draft
curl -s -X POST http://127.0.0.1:8000/api/applications \
  -H 'Content-Type: application/json' \
  -d '{
    "applicant_name": "Jane Applicant",
    "applicant_email": "jane@example.com",
    "company_name": "Acme Ltd",
    "application_type": "Recordation",
    "description": "Initial recordation request."
  }'

# 2. Submit (replace 1 with the returned id)
curl -s -X POST http://127.0.0.1:8000/api/applications/1/submit

# 3. Start review
curl -s -X POST http://127.0.0.1:8000/api/applications/1/start-review

# 4. Record a decision (Approved | Rejected | Need More Information)
curl -s -X POST http://127.0.0.1:8000/api/applications/1/decision \
  -H 'Content-Type: application/json' \
  -d '{"status": "Approved", "reviewer_comment": "Looks good."}'
```

## Workflow rules enforced

- Only `Draft` (and `Need More Information`) applications can be edited.
- Only `Draft` (and `Need More Information`) applications can be submitted.
- Only `Submitted` applications can move to `Under Review`.
- Only `Under Review` applications can receive a reviewer decision.
- `Approved` and `Rejected` applications are terminal and cannot be edited.
- `Need More Information` decisions and `Rejected` decisions require a
  reviewer comment.

These rules live in `backend/applications/models.py` and are covered by the
tests in `backend/applications/tests.py`.

## Assumptions

- Applications start in `Draft`.
- Tracking numbers are auto-generated as `APP-YYYYMMDD-XXXXXXXX`.
- `Need More Information` is treated as an editable, resubmittable state
  (the spec lists it under both "decision" outcomes and "editable" states).
- Reviewer comments are required for `Need More Information` and `Rejected`
  decisions; `Approved` may include an optional comment.
- No authentication: a single implicit user acts as both applicant and
  reviewer. Role-based access is listed under "Improvements".

## Improvements with more time

- Authentication and role-based permissions for applicants vs. reviewers.
- Filtering, search, and pagination on the application list (frontend + API).
- Soft-validate `applicant_email` is unique per applicant, and add server-side
  email format checks (currently handled via Pydantic `EmailStr`).
- Audit log of every status change with the actor and timestamp.
- File attachments per application (supporting documents).
- Optimistic UI updates and toast notifications on the frontend.
- Docker Compose for one-command setup of backend + frontend.
- CI workflow (GitHub Actions) running backend tests and a frontend build.

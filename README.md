# Mini Application Workflow Tracker

Take-home assessment for a small application workflow tracker built with a
Django Ninja backend API and a React frontend.

## Candidate

- Name: samuelcromwell
- Email: cromwellsamuel3@gmail.com

## Project Structure

```text
backend/    Django API
frontend/   React application
```

## Setup

### Backend

From the repository root:

```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -r backend/requirements.txt
cd backend
python manage.py migrate
python manage.py runserver
```

The backend API runs at `http://127.0.0.1:8000/api/`.

### Frontend

In a second terminal:

```bash
cd frontend
npm install
npm run dev
```

The frontend runs at `http://localhost:5173/`.

### Run Tests

```bash
source .venv/bin/activate
cd backend
python manage.py test applications
```

### Build Frontend

```bash
cd frontend
npm run build
```

## Assumptions

- Applications begin in `Draft`.
- `Need More Information` applications can be edited and resubmitted.

## Improvements With More Time

- Authentication and role-based permissions for applicants and reviewers.
- Richer filtering and search on the application list.
- Automated deployment configuration.

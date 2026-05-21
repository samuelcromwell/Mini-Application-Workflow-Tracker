# Backend

Django Ninja API for the application workflow tracker.

## Setup

From the repository root:

```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -r backend/requirements.txt
cd backend
python manage.py migrate
python manage.py runserver
```

The API will be available at `http://127.0.0.1:8000/api/`.

## Health Check

```bash
curl http://127.0.0.1:8000/api/health
```

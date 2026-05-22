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

## Render (production)

In the Render web service **Settings** (Root Directory: `backend`):

| Setting | Value |
|---------|--------|
| Build Command | `chmod +x build.sh && ./build.sh` |
| Start Command | `gunicorn config.wsgi:application --bind 0.0.0.0:$PORT` |

Or leave **Start Command** empty and Render will use `Procfile`.

Set env vars: `SECRET_KEY`, `DEBUG=false`, `DATABASE_URL` (Postgres), and after Vercel deploy `CORS_ALLOWED_ORIGINS`.

## Health Check

```bash
curl http://127.0.0.1:8000/api/health
```

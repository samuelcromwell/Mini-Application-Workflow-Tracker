"""Compatibility WSGI module for deployments using the old placeholder path.

The real Django project lives in ``config``. Render was configured with
``gunicorn your_application.wsgi`` at some point, so this module re-exports the
actual WSGI application while the service setting is corrected.
"""

from config.wsgi import application

"""
URL configuration for config project.

The `urlpatterns` list routes URLs to views. For more information please see:
    https://docs.djangoproject.com/en/6.0/topics/http/urls/
Examples:
Function views
    1. Add an import:  from my_app import views
    2. Add a URL to urlpatterns:  path('', views.home, name='home')
Class-based views
    1. Add an import:  from other_app.views import Home
    2. Add a URL to urlpatterns:  path('', Home.as_view(), name='home')
Including another URLconf
    1. Import the include() function: from django.urls import include, path
    2. Add a URL to urlpatterns:  path('blog/', include('blog.urls'))
"""
from django.contrib import admin
from django.http import HttpResponse, HttpResponseNotAllowed, JsonResponse
from django.urls import path

from .api import api


def health_check(request):
    allowed_methods = ["GET", "HEAD", "OPTIONS"]
    if request.method == "HEAD":
        return HttpResponse(status=200)
    if request.method == "OPTIONS":
        response = HttpResponse(status=204)
        response["Allow"] = ", ".join(allowed_methods)
        return response
    if request.method != "GET":
        return HttpResponseNotAllowed(allowed_methods)
    return JsonResponse({"status": "ok"})


def api_root(request):
    allowed_methods = ["GET", "HEAD", "OPTIONS"]
    if request.method == "HEAD":
        return HttpResponse(status=200)
    if request.method == "OPTIONS":
        response = HttpResponse(status=204)
        response["Allow"] = ", ".join(allowed_methods)
        return response
    if request.method != "GET":
        return HttpResponseNotAllowed(allowed_methods)
    return JsonResponse(
        {
            "name": "Application Workflow Tracker API",
            "docs": "/api/docs",
            "openapi": "/api/openapi.json",
            "health": "/api/health",
            "applications": "/api/applications",
        }
    )


urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/health', health_check, name='health-check'),
    path('api/health/', health_check, name='health-check-slash'),
    path('api/', api_root, name='api-root'),
    path('api/', api.urls),
]

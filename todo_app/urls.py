# todo_app/urls.py

from django.urls import path, include, re_path
from rest_framework.routers import DefaultRouter
from .views import TaskViewSet, index

router = DefaultRouter()
router.register(r'tasks', TaskViewSet, basename='task')

urlpatterns = [
    path('api/', include(router.urls)),
    re_path(r'^.*$', index, name='index'),  # SPA catch-all
]

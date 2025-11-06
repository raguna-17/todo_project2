# todo_app/urls.py

from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import TaskViewSet, index
from django.views.generic import TemplateView

router = DefaultRouter()
router.register(r'tasks', TaskViewSet, basename='task')

urlpatterns = [
    path('', index, name='index'),  # SPA のトップ
    path('login/', TemplateView.as_view(template_name='todo_app/login.html'), name='login'),  # 追加
    path('api/', include(router.urls)),
]
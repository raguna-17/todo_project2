# todo_app/urls.py
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import TaskViewSet, index

router = DefaultRouter()
router.register(r'tasks', TaskViewSet, basename='task')

urlpatterns = [
    path('', index, name='index'),  # SPAのトップページ
    path('api/', include(router.urls)),  # APIルーティング
]

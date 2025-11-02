# todo_app/urls.py
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import TaskViewSet, index, task_list

router = DefaultRouter()
router.register(r'tasks', TaskViewSet, basename='task')

urlpatterns = [
    path('', index, name='index'),               # HTMLトップページ
    path('tasks/', task_list, name='task_list'), # HTML用タスク一覧
    path('api/', include(router.urls)),          # APIルーティング
]

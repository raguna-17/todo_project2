#views.py
from rest_framework import viewsets, filters
from rest_framework.permissions import IsAuthenticated
from .models import Task
from .serializers import TaskSerializer
from django.shortcuts import render
from django.contrib.auth.decorators import login_required

# API用：ユーザーごとのタスクを操作
class TaskViewSet(viewsets.ModelViewSet):
    serializer_class = TaskSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [filters.OrderingFilter, filters.SearchFilter]
    search_fields = ['title', 'description']
    ordering_fields = ['deadline', 'priority', 'created_at']

    def get_queryset(self):
        # ログイン中ユーザーのタスクだけ取得
        return Task.objects.filter(user=self.request.user)

    def perform_create(self, serializer):
        # タスク作成時に自動でユーザーを紐付け
        serializer.save(user=self.request.user)

# HTMLトップページ
def index(request):
    return render(request, 'todo_app/index.html')

# HTML用タスク一覧ページ
@login_required
def task_list(request):
    tasks = Task.objects.filter(user=request.user)  # ユーザーごとに絞る
    return render(request, "task_list.html", {"tasks": tasks})

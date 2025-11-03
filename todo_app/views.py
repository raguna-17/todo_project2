#views.py
from rest_framework import viewsets, filters
from rest_framework.permissions import IsAuthenticated
from .models import Task
from .serializers import TaskSerializer
from django.shortcuts import render

class TaskViewSet(viewsets.ModelViewSet):
    serializer_class = TaskSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [filters.OrderingFilter, filters.SearchFilter]
    search_fields = ['title', 'description']
    ordering_fields = ['deadline', 'priority', 'created_at']

    def get_queryset(self):
        return Task.objects.filter(user=self.request.user)

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)

# SPA用トップページ
def index(request):
    return render(request, 'todo_app/index.html')

# views.py
from rest_framework import viewsets, filters
from rest_framework.permissions import IsAuthenticated
from django.views.decorators.cache import never_cache
from django.utils.decorators import method_decorator
from django.shortcuts import render
from .models import Task
from .serializers import TaskSerializer

class TaskViewSet(viewsets.ModelViewSet):
    """
    API: /api/tasks/
    - queryset: デフォルトがあると DRF のブラウザUIや自動ドキュメントで安心
    - get_queryset(): リクエストユーザーに絞る実装はそのまま
    """
    serializer_class = TaskSerializer
    # あってもなくても動くが、あると安全
    queryset = Task.objects.none()

    permission_classes = [IsAuthenticated]
    filter_backends = [filters.OrderingFilter, filters.SearchFilter]
    search_fields = ['title', 'description']
    ordering_fields = ['deadline', 'priority', 'created_at']

    def get_queryset(self):
        # 絶対に user が紐付いていること前提（Model に user FK が存在することを確認しておく）
        return Task.objects.filter(user=self.request.user).order_by('-created_at')

    def perform_create(self, serializer):
        # ここで強制的に user をセット。Serializer 側で user を read_only にしておくこと。
        serializer.save(user=self.request.user)


# SPA トップページ（キャッシュ無効にしておく）
@never_cache
def index(request):
    """
    SPA のエントリポイントを返す。
    必要ならここでテンプレートに環境依存の値を注入（例: API ベースURL）できる。
    """
    # 例: クライアントで相対パスではなく絶対パスを使いたい場合に渡す
    api_base = request.build_absolute_uri('/')  # 末尾にスラッシュあり
    return render(request, 'todo_app/index.html', context={'API_BASE': api_base})

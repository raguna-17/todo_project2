# serializers.py (抜粋)
from rest_framework import serializers
from .models import Task

class TaskSerializer(serializers.ModelSerializer):
    user = serializers.PrimaryKeyRelatedField(read_only=True)  # クライアントからは設定不可

    class Meta:
        model = Task
        fields = ['id','title','description','deadline','priority','completed','created_at','user']
        read_only_fields = ['id','created_at','user']

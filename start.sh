#!/bin/bash

# .env が存在すれば読み込む
if [ -f .env ]; then
  export $(grep -v '^#' .env | xargs)
fi

# 環境変数が設定されているか確認
if [ -z "$SECRET_KEY" ]; then
  echo "ERROR: SECRET_KEY environment variable is not set!"
  exit 1
fi

# デフォルトポートは 8000
PORT=${PORT:-8000}

# Django マイグレーション
python manage.py migrate --noinput

# 静的ファイル収集
python manage.py collectstatic --noinput

# Gunicorn 起動
exec gunicorn todo_project.wsgi:application \
    --bind 0.0.0.0:$PORT \
    --workers 3 \
    --log-level info

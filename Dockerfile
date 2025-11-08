#Dockerfile

# ベースイメージ
FROM python:3.13-slim

# 必要なシステムパッケージ（psycopg2-binaryを使うなら libpq-dev は不要）
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential gcc \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# 依存を先にコピーしてキャッシュ効かせる
COPY requirements.txt /app/
RUN python -m pip install --upgrade pip setuptools wheel \
 && pip install -r /app/requirements.txt

# アプリ本体をコピー
COPY . /app

ENV PYTHONUNBUFFERED=1 \
    DJANGO_SETTINGS_MODULE=todo_project.settings

# 静的ファイル収集（ビルド時にエラーが出るなら最後に || true を付ける）
RUN python manage.py collectstatic --noinput || true

EXPOSE 8000

CMD ["gunicorn", "todo_project.wsgi:application", "--bind", "0.0.0.0:8000", "--workers", "3"]

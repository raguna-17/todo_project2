#Dockerfile

# ベースイメージ
FROM python:3.13-slim

# 作業ディレクトリを先に作る
WORKDIR /app

# システムパッケージのインストール
RUN apt-get update && apt-get install -y \
    build-essential \
    pkg-config \
    python3-dev \
    libatlas3-base \
    libatlas3-base-dev \
    gfortran \
    && rm -rf /var/lib/apt/lists/*

# 依存を先にコピーしてキャッシュ効かせる
COPY requirements_clean.txt /app/requirements.txt
RUN python -m pip install --upgrade pip setuptools wheel \
    && pip install -r /app/requirements.txt

# アプリ本体をコピー
COPY . /app

ENV PYTHONUNBUFFERED=1 \
    DJANGO_SETTINGS_MODULE=todo_project.settings

# 静的ファイル収集（ビルド時にエラーが出る場合は || true を付ける）
RUN python manage.py collectstatic --noinput || true

EXPOSE 8000

CMD ["gunicorn", "todo_project.wsgi:application", "--bind", "0.0.0.0:${PORT}", "--workers", "3"]

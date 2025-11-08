FROM python:3.13-slim

# 必要なシステムパッケージ
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    libpq-dev \
    gcc \
    && rm -rf /var/lib/apt/lists/*

# 作業ディレクトリ
WORKDIR /app

# 依存を先にコピーしてキャッシュ効かせる
COPY pyproject.toml poetry.lock* /app/
# または requirements.txt を使う場合は COPY して pip install する

# pip / poetry のセットアップ（あなたのプロジェクトに合わせて）
RUN python -m pip install --upgrade pip setuptools wheel
# もし requirements.txt を使うなら：
COPY requirements.txt /app/
RUN pip install -r requirements.txt

# ソースコピー
COPY . /app

# 環境変数（必要なら）
ENV PYTHONUNBUFFERED=1 \
    DJANGO_SETTINGS_MODULE=your_project.settings

# collectstatic と migrate（起動時に実行するならCMDやエントリポイントで実行）
RUN python manage.py collectstatic --noinput

# ポート / 起動コマンド（gunicorn例）
EXPOSE 8000
CMD ["gunicorn", "your_project.wsgi:application", "--bind", "0.0.0.0:8000", "--workers", "3"]

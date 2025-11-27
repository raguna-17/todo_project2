# ベースイメージ
FROM python:3.13-slim

# 作業ディレクトリ作成
WORKDIR /app

# システムパッケージ
RUN apt-get update && apt-get install -y \
    build-essential \
    pkg-config \
    python3-dev \
    && rm -rf /var/lib/apt/lists/*

# pip を最新化
RUN python -m pip install --upgrade pip setuptools wheel

# numpy/pandas を先に wheel でインストール
RUN pip install numpy pandas

# 依存をコピーしてインストール
COPY requirements_clean.txt /app/requirements.txt
RUN pip install -r /app/requirements.txt

# アプリ本体をコピー
COPY . /app

# 起動スクリプトをコピーして実行権限付与
COPY start.sh /app/start.sh
RUN chmod +x /app/start.sh

# 環境変数
ENV PYTHONUNBUFFERED=1 \
    DJANGO_SETTINGS_MODULE=todo_project.settings

# ポート公開（Docker ローカル用）
EXPOSE 8000

# CMD をスクリプトに変更
CMD ["./start.sh"]

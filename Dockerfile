FROM python:3.11-slim
WORKDIR /app
COPY requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt
COPY local_server.py worker_system.py customer_archive.py customer_assets.py migrate_storage.py ./
COPY dist/client ./dist/client
ENV PORT=8765 DATA_DIR=/data PUBLIC_URL=https://abmgroup.tech PYTHONUNBUFFERED=1
VOLUME ["/data"]
EXPOSE 8765
CMD ["python", "local_server.py"]

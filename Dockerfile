FROM python:3.11-slim
WORKDIR /app
COPY requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt
COPY . ./
ENV PORT=8765 DATA_DIR=/data PUBLIC_URL=https://abmgroup.tech PYTHONUNBUFFERED=1
VOLUME ["/data"]
EXPOSE 8765
CMD ["python", "local_server.py"]

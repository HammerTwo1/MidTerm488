FROM python:3.11-slim AS build
ENV PIP_DISABLE_PIP_VERSION_CHECK=1 PIP_NO_CACHE_DIR=1
WORKDIR /wheels
COPY requirements.txt .
RUN apt-get update && apt-get install -y --no-install-recommends build-essential \
    && pip wheel --wheel-dir=/wheels -r requirements.txt \
    && apt-get purge -y build-essential && rm -rf /var/lib/apt/lists/*

FROM python:3.11-slim
WORKDIR /app
ENV PYTHONDONTWRITEBYTECODE=1 PYTHONUNBUFFERED=1
COPY --from=build /wheels /wheels
COPY requirements.txt .
RUN pip install --no-index --find-links=/wheels -r requirements.txt
COPY . .
EXPOSE 5000
HEALTHCHECK --interval=15s --timeout=3s --retries=3 CMD curl -fsS http://localhost:5000/healthz || exit 1
CMD ["python","app.py"]



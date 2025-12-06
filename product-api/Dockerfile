# --- Build stage ---
FROM python:3.12-slim AS builder
WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends build-essential \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN python -m venv /opt/venv && \
    /opt/venv/bin/pip install --upgrade pip && \
    /opt/venv/bin/pip install -r requirements.txt

COPY app.py .

# --- Runtime stage ---
FROM python:3.12-slim AS runtime
WORKDIR /app

ENV VIRTUAL_ENV=/opt/venv
ENV PATH="$VIRTUAL_ENV/bin:$PATH"
ENV FLASK_ENV=production
ENV PORT=5000

COPY --from=builder /opt/venv /opt/venv
COPY app.py .

EXPOSE 5000

# Run as non-root user
RUN useradd -m appuser
USER appuser

CMD ["gunicorn", "-b", "0.0.0.0:5000", "app:app"]

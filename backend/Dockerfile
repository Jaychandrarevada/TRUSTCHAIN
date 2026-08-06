# TrustChain backend — production image (multi-stage, non-root)
FROM python:3.12-slim AS builder
WORKDIR /build
COPY requirements.txt .
# Wheels built once in the builder stage keep the runtime image small.
RUN pip install --no-cache-dir --prefix=/install -r requirements.txt

FROM python:3.12-slim AS runtime
# Security: dedicated non-root user; no build tools in the runtime image.
RUN useradd --create-home --uid 10001 trustchain
WORKDIR /srv/app
COPY --from=builder /install /usr/local
COPY app ./app
COPY scripts ./scripts
COPY wsgi.py .

USER trustchain
ENV FLASK_ENV=production PYTHONUNBUFFERED=1
EXPOSE 5000
# Gunicorn: 4 workers, structured access logs to stdout, sane timeouts.
CMD ["gunicorn", "--bind", "0.0.0.0:5000", "--workers", "4", "--timeout", "60", \
     "--access-logfile", "-", "--error-logfile", "-", "wsgi:app"]

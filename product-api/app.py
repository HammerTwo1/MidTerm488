from flask import Flask, jsonify, request
from prometheus_client import Counter, Histogram, generate_latest, CONTENT_TYPE_LATEST
import time, random

app = Flask(__name__)

REQS = Counter("http_requests_total", "Total HTTP requests", ["service","method","status"])
LATENCY = Histogram("http_server_request_duration_seconds", "Request duration seconds", ["service","endpoint"])

@app.route("/healthz")
def healthz():
    return "ok", 200

@app.route("/readyz")
def readyz():
    return "ready", 200

@app.route("/products")
def products():
    start = time.time()
    time.sleep(random.uniform(0.01, 0.2))
    payload = [{"id":1,"name":"Widget"},{"id":2,"name":"Gadget"}]
    LATENCY.labels("product-api","/products").observe(time.time()-start)
    REQS.labels("product-api", request.method, 200).inc()
    return jsonify(payload), 200

@app.route("/metrics")
def metrics():
    return generate_latest(), 200, {"Content-Type": CONTENT_TYPE_LATEST}

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000)

const express = require("express");
const client = require("prom-client");

const app = express();
const collectDefaultMetrics = client.collectDefaultMetrics;
collectDefaultMetrics();

const reqs = new client.Counter({
  name: "http_requests_total",
  help: "Total HTTP requests",
  labelNames: ["service","method","status"],
});
const latency = new client.Histogram({
  name: "http_server_request_duration_seconds",
  help: "Request duration seconds",
  labelNames: ["service","endpoint"],
});

app.get("/healthz", (req, res) => res.status(200).send("ok"));
app.get("/readyz", (req, res) => res.status(200).send("ready"));

app.get("/orders", async (req, res) => {
  const end = latency.labels("order-api","/orders").startTimer();
  const data = [{id: 10, productId: 1, qty: 2}];
  end();
  reqs.labels("order-api", "GET", 200).inc();
  res.json(data);
});

app.get("/metrics", async (req, res) => {
  res.set("Content-Type", client.register.contentType);
  res.end(await client.register.metrics());
});

const port = process.env.PORT || 4000;
app.listen(port, () => console.log(`Order API on ${port}`));

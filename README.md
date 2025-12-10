# COMP 488 Midterm 

This repository contains a complete DevOps design for TechCommerce Inc. as it
transitions from a monolith to microservices:

- Frontend (port 3000)
- Python Flask Product API (port 5000)
- Order API (port 4000)
- Multi-stage Dockerfiles
- Kubernetes manifests (Deployments, Services, ConfigMaps, Secrets, HPA, RBAC)
- GitHub Actions CI/CD with staging + production, approvals, and rollback
- Monitoring with Prometheus + Grafana

## 1. Architecture Overview

### Services

- **Frontend**: Node.js + Express serving static assets.
- **Product API**: Flask app with `/products`, `/healthz`, `/readyz`, `/metrics`.
- **Order API**: Express app with `/orders`, `/healthz`, `/readyz`, `/metrics`.

All services expose Prometheus metrics and health endpoints. They run in the
`techcommerce` namespace and talk to each other via ClusterIP services.

## 2. Docker Design (Multi-stage, Production-Ready)

- Smaller images via multi-stage builds.
- Builder stages contain compilers and dev tools.
- Runtime stages are slim and non-root (`node`, `appuser`).

## 3. Kubernetes Design

- `techcommerce` namespace for workloads.
- Deployments:
  - Health checks (`/healthz`, `/readyz`).
  - Resource requests/limits for scheduling and autoscaling.
- Services:
  - ClusterIP for internal communication.
- ConfigMaps:
  - Non-secret config (URLs, log levels).
- Secrets:
  - DB credentials and API keys (example base64-encoded values).

## 4. HPA and Scaling

- HPA on Product API (`autoscaling/v2`):
  - `minReplicas: 2`, `maxReplicas: 10`.
  - CPU utilization target: 70%.
- Requests set to `200m` CPU so autoscaler has a baseline.
- Can be extended to custom metrics (requests per second, latency).

## 5. RBAC

### CI/CD

- ServiceAccount `ci-deployer` in `techcommerce`.
- Role with permissions on:
  - Deployments, Services, ConfigMaps, Secrets, HPAs, Pods, Pod logs.
- RoleBinding attaches the SA to the Role.

### Prometheus

- ServiceAccount `prometheus` in `monitoring`.
- ClusterRole with read-only access to:
  - Nodes, Pods, Services, Endpoints, Ingresses, `/metrics`.
- ClusterRoleBinding grants these permissions.

This follows least-privilege best practices.

## 6. Monitoring (Prometheus + Grafana)

Assumes `kube-prometheus-stack` (Prometheus Operator) deployed in `monitoring`.

### Alerting Rules

   1. **Pod Restarts > 3 in 10 minutes**  
      Detects crash loops and instability.

   2. **API Response Time > 2 seconds for 5 minutes**  
      Uses `http_server_request_duration_seconds` with `histogram_quantile(0.95, ...)`.

   3. **Error Rate > 5% for 5 minutes**  
      5xx rate / total rate > 0.05.

   4. **Disk Usage > 85%**  
      Uses `node_filesystem_*` metrics to avoid running out of space.

   ### Alertmanager

   - Routes alerts to `youremail@gmail.com`.
   - Easily extended with Slack, PagerDuty, etc.

   ## 7. Logging (Fluent Bit / Datadog-like)

   - Namespace: `logging`.
   - Fluent Bit DaemonSet:
   - Tails `/var/log/containers/*.log`.
   - Enriches with Kubernetes metadata.
   - Sends via HTTP output to `logging-backend.logging.svc.cluster.local:3100`.
   - Can be pointed to:
   - Loki, Elasticsearch, or Datadog (using their HTTP intake and API key).

   Centralized logging enables correlation with metrics and easier debugging.

## 7. CI/CD Pipeline (GitHub Actions)

### Stages

1. **Test**
   - Node tests for frontend and order API.
   - Python `pytest` for product API.

2. **Security Scan**
   - `npm audit` for Node services.
   - `pip-audit` and `bandit` for Python.

3. **Build & Push**
   - Builds Docker images for all three services.
   - Tags with `IMAGE_TAG = first 7 chars of commit SHA`.
   - Pushes to GitHub Container Registry (GHCR).

4. **Image Scanning**
   - Trivy scans built images for CRITICAL/HIGH vulns.

5. **Deploy to Staging (Auto)**
   - Uses `KUBE_CONFIG_STAGING` secret.
   - Applies namespace, configmaps, secrets, services, HPA, RBAC.
   - Applies deployments with substituted `${IMAGE_TAG}`.

6. **Deploy to Production (Manual Approval)**
   - Uses `KUBE_CONFIG_PROD` secret.
   - Bound to `production` environment (requires GitHub approval).
   - Applies deployments and HPA.

7. **Rollback**
   - `rollback_production` job:
     - `kubectl rollout undo deployment/<name> -n techcommerce`.


## 8. Security Best Practices

- Non-root containers.
- Minimal images (`alpine`, `slim`).
- Secrets in Kubernetes Secrets (never hard-coded).
- RBAC-designed with least privilege.
- Manual Approval

## 10. Cost Optimization

- Right-sized resource requests and limits (start small, tune with metrics).
- HPA to avoid overprovisioning during low load.
- Log retention policies to control storage costs.
- Separate staging and production node pools (staging can use cheaper/spot nodes).
- Scale only critical services aggressively (Product API).

## 11. Troubleshooting Scenarios

### 11.1 Pods in CrashLoopBackOff

1. Check pod status and events:
   ```bash
   kubectl get pods -n techcommerce
   kubectl describe pod <pod> -n techcommerce
   ```
2. Check logs:
   ```bash
   kubectl logs <pod> -n techcommerce --previous
   ```
3. Validate environment variables, configmaps, and secrets.
4. Check liveness/readiness probes for misconfig (wrong paths/ports).
5. Fix the underlying issue (code bug, config, resource limits) and redeploy.

### 11.2 Slow Application with Normal Metrics

1. Inspect latency metrics:
   - `http_server_request_duration_seconds` (95th/99th percentile).
   - Look for specific slow endpoints.
2. Check logs via logging backend:
   - Timeouts, slow DB queries, external API delays, retries.
3. Check dependent systems:
   - Database, cache, external services.
4. Optimize:
   - Add caching, indexes, circuit breakers.
   - Consider HPA on custom latency / queue length metrics.

### 11.3 Image Pull Errors

1. Describe pod:
   ```bash
   kubectl describe pod <pod> -n techcommerce
   ```
   - Look for `ImagePullBackOff` root cause (unauthorized, not found).
2. Validate image name and tag:
   - Make sure `ghcr.io/your-org/...:${IMAGE_TAG}` exists.
3. Check registry credentials:
   - For private registries, ensure imagePullSecrets are set.
4. Confirm node network connectivity to registry.
5. Fix tag or push missing image, then redeploy.

## 12. Setup Instructions

1. **Namespaces and core manifests**
   ```bash
   kubectl apply -f k8s/namespace.yaml
   kubectl apply -f k8s/configmaps.yaml
   kubectl apply -f k8s/secrets.yaml
   kubectl apply -f k8s/service-frontend.yaml
   kubectl apply -f k8s/service-product.yaml
   kubectl apply -f k8s/service-order.yaml
   kubectl apply -f k8s/deployment-frontend.yaml
   kubectl apply -f k8s/deployment-product.yaml
   kubectl apply -f k8s/deployment-order.yaml
   kubectl apply -f k8s/hpa-product.yaml
   kubectl apply -f k8s/rbac.yaml
   ```

2. **Monitoring**
   - Install `kube-prometheus-stack` in `monitoring`.
   - Apply:
     ```bash
     kubectl apply -f monitoring/servicemonitors.yaml
     kubectl apply -f monitoring/alert-rules.yaml
     kubectl apply -f monitoring/alertmanager-config.yaml
     ```
3. **Logging**
      ```bash
      kubectl apply -f logging/fluent-bit-configmap.yaml
      kubectl apply -f logging/fluent-bit-daemonset.yaml
      ```

3. **GitHub Actions**
   - Add secrets:
     - `KUBE_CONFIG_STAGING`
     - `KUBE_CONFIG_PROD`
     - `CR_PAT`
   - Configure `production` environment with required reviewers.


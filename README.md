# Three-Tier Techno Web App

A production-ready, containerized, and Kubernetes-deployable application consisting of:
- **Frontend:** Node.js static site served via Nginx (port `3000`)  
- **Product API:** Python Flask service with Prometheus metrics (port `5000`)  
- **Order API:** Node.js Express service with Prometheus metrics (port `4000`)  

Includes:
- Docker multi-stage builds  
- Kubernetes Deployments, Services, and HPA  
- GitHub Actions CI/CD pipeline (build, scan, deploy, rollback)  
- Prometheus & Grafana monitoring and alerting  

---

Each service runs independently in its own container and is exposed internally via Kubernetes `ClusterIP` Services.
---
## Local Development

### **1️ Run Product API locally**

```bash
cd product-api
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
python app.py
```

→ Visit: [http://localhost:5000/products](http://localhost:5000/products)

---

### **2️ Run Order API locally**

```bash
cd order-api
npm install
npm start
```

→ Visit: [http://localhost:4000/orders](http://localhost:4000/orders)

---

### **3️ Run Frontend locally**

Option A — Directly open:
```bash
cd frontend
open index.html
```

Option B — Serve with Python:
```bash
python3 -m http.server 3000
```

→ Visit: [http://localhost:3000](http://localhost:3000)

---

## Run with Docker

Each service has its own Dockerfile. Example:

```bash
docker build -t frontend:dev ./frontend
docker build -t product-api:dev ./product-api
docker build -t order-api:dev ./order-api
```

Run locally:

```bash
docker run -p 3000:3000 frontend:dev
docker run -p 5000:5000 product-api:dev
docker run -p 4000:4000 order-api:dev
```

---

## Deploy to Kubernetes

### **Step 1 — Create Namespaces**
```bash
kubectl apply -f namespaces.yaml
```

### **Step 2 — Apply Deployments and Services**
```bash
kubectl -n staging apply -f frontend.yaml
kubectl -n staging apply -f order.yaml
kubectl -n staging apply -f product.yaml
kubectl -n staging get pods
```

### **Step 3 — Apply Monitoring**
```bash
kubectl -n monitoring apply -f monitoring/
```

### **Step 4 — Access the Frontend**
Use `kubectl port-forward` or Ingress:
```bash
kubectl -n staging port-forward svc/frontend 3000:3000
```
Then open [http://localhost:3000](http://localhost:3000)

---

## CI/CD Workflow

GitHub Actions pipeline does the following:

1. **Tests:** Runs Jest (Node) and Pytest (Python)  
2. **Security Scans:** npm audit, pip-audit, Trivy image scan  
3. **Builds Images:** Pushes to GitHub Container Registry (GHCR)  
4. **Deploys to Staging:** Automatically  
5. **Manual Approval:** Required before deploying to Production  
6. **Rollback:** If deployment fails, auto reverts previous version  

To trigger manually:
```bash
gh workflow run ci-cd
```

---

## Monitoring & Alerting
To access Grafana:
```bash
kubectl -n monitoring port-forward svc/kube-prometheus-stack-grafana 3001:80
```
→ [http://localhost:3001](http://localhost:3001)  
Login: `admin / admin`


## Security Practices

- All secrets stored in K8s `Secret` or via External Secrets Operator  
- Trivy used for image vulnerability scanning  
- Images built via multi-stage for minimal surface area  
- Gunicorn used for Python production server  
- Non-root containers and read-only file systems recommended  


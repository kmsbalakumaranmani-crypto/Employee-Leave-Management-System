# 🚀 Employee Leave Management System – DevOps CI/CD Pipeline

A complete end-to-end DevOps capstone project demonstrating modern software delivery: **Code → Automated Testing → SonarQube Quality Analysis → Docker Containerization → Jenkins CI/CD → Continuous Deployment → Prometheus & Grafana Observability**.

---

## 🌟 Key Features

1. **Employee Portal**:
   - Authenticated leave submission with real-time day calculation.
   - Live leave balance tracking across multiple leave categories.
   - Application status lifecycle (`PENDING` ⏳ → `APPROVED` ✅ / `REJECTED` ❌).
   - Ability to cancel pending requests.

2. **HR / Manager Portal**:
   - Real-time review queue of submitted leave applications across departments.
   - 1-click Approval or Rejection with custom manager remarks.
   - Status filtering and audit tracking.

3. **Admin Portal**:
   - Employee directory management (Create, Update, Delete).
   - Leave quota configuration (Casual, Sick, Paid, Maternity/Paternity).
   - Company-wide leave history and analytics.

4. **DevOps Live Telemetry Hub**:
   - Live application telemetry (`/health`, `/metrics`).
   - Interactive 1-click role switcher for smooth lab demonstrations.
   - Built-in Prometheus scraper metrics (`prom-client`).

---

## 🏗️ DevOps Architecture

```text
[Developer Workstation]
         │ (git commit & push)
         ▼
  [Git Repository] ──(Webhook Trigger)──┐
                                        ▼
                                 [Jenkins CI/CD]
                                        │
           ┌────────────────────────────┼────────────────────────────┐
           ▼                            ▼                            ▼
   [Stage 1: Checkout]          [Stage 2: Build]          [Stage 3: Jest Tests]
                                                                     │ (Fail? Stop ❌)
                                                                     ▼ (Pass? ✅)
   [Stage 6: Deployment]       [Stage 5: Docker]        [Stage 4: SonarQube]
           │                    (Container Build)        (Static Code Analysis)
           ▼
[Docker Container :8080] ◄──────────────┘
         │
         ├─── Scraped by ───► [Prometheus :9090] ───► [Grafana Dashboards :3000]
         └─── Connected to ──► [MySQL / SQLite Database]
```

---

## 🛠️ Technology Stack

| Layer | Technology | Purpose |
|---|---|---|
| **Frontend** | HTML5, Vanilla CSS3 (Glassmorphism), Vanilla JavaScript | Responsive, rich dark-mode UI |
| **Backend API** | Node.js (v20+) + Express.js | REST API & routing |
| **Database** | SQLite (built-in zero-config) & MySQL 8.0 | Relational data persistence |
| **Testing** | Jest + Supertest | Automated unit & integration tests |
| **Containerization**| Docker & Docker Compose | Lightweight portable containers |
| **CI/CD** | Jenkins Declarative Pipeline (`Jenkinsfile`) | Automated pipeline orchestration |
| **Code Quality** | SonarQube Scanner (`sonar-project.properties`) | Static code analysis & test coverage |
| **Monitoring** | Prometheus (`prom-client`) + Grafana | Telemetry & business metrics |

---

## 🚀 Quick Start Guide

### 1. Run Standalone (Local Development)

```bash
# 1. Install dependencies
npm install

# 2. Run automated test suite (17/17 tests)
npm test

# 3. Start application
npm start
```

Open your browser at **[http://localhost:8080](http://localhost:8080)**.

### 2. Run with Docker

```bash
# Build Docker image
docker build -t employee-leave-management .

# Run container
docker run -d --name employee-leave-app -p 8080:8080 employee-leave-management
```

### 3. Run Full DevOps Stack (App + MySQL + Prometheus + Grafana)

```bash
docker compose up -d --build
```

- **Web Application**: `http://localhost:8080`
- **Prometheus UI**: `http://localhost:9090`
- **Grafana Dashboard**: `http://localhost:3000` (User: `admin`, Pass: `admin`)
- **Health Check Probe**: `http://localhost:8080/health`
- **Prometheus Metrics Endpoint**: `http://localhost:8080/metrics`

---

## 👥 Demo Credentials (1-Click Switcher Available in UI)

| Role | Name | Email | Password |
|---|---|---|---|
| **Employee** | John Doe | `john.doe@company.com` | `password123` |
| **HR / Manager** | Sarah Connor | `manager@company.com` | `manager123` |
| **DevOps Admin** | System Admin | `admin@company.com` | `admin123` |

---

## 📋 College Lab Demonstration Script

### Part 1: Application Demonstration

1. Open `http://localhost:8080`.
2. Notice the **Live Lab Demo Hub** ribbon at the top.
3. Click **👤 John Doe (Employee)**:
   - Show the leave quota cards (Casual, Sick, Earned).
   - Click **Apply For Leave**, pick dates and enter reason, then click **Submit**.
   - Show that the new request appears in the table with status `PENDING` ⏳.
4. Click **👩‍💼 Sarah (HR Manager)**:
   - Notice the approval request counter.
   - Click **Approve** on John's request, provide remarks ("Approved!"), and confirm.
   - Status transitions to `APPROVED` ✅.
5. Click **👤 John Doe (Employee)** again:
   - John now sees his leave as `APPROVED` with the updated quota balance.
6. Click **🛠️ DevOps Admin**:
   - Demonstrate adding a new employee or managing leave types.

### Part 2: DevOps CI/CD Demonstration

1. Show `Jenkinsfile` in repository:
   - Explain the 7 automated stages: `Checkout` → `Install` → `Test` → `SonarQube` → `Docker Build` → `Deploy` → `Verification`.
2. Demonstrate automated tests:
   ```bash
   npm test
   ```
   Show how tests validate authentication, role restrictions, and date logic before build proceeds.
3. Demonstrate Docker containerization:
   - Show `Dockerfile` (multi-stage Alpine image, non-root user, healthcheck).
   - Run `docker ps` to show the running container.
4. Show Healthcheck & Prometheus Metrics:
   - Navigate to `http://localhost:8080/health` (Shows JSON with UP status and DB dialect).
   - Navigate to `http://localhost:8080/metrics` (Shows Prometheus counters for HTTP requests and leave lifecycle metrics).

---

## 🎯 Viva Examination Q&A Guide

**Q1: What is the benefit of containerizing this application with Docker?**  
> *Answer:* Docker packages the application along with its Node.js runtime and dependencies into a lightweight image. This eliminates the "it works on my machine" problem and guarantees identical execution in development, Jenkins CI, and production.

**Q2: What happens if an automated test fails during the Jenkins pipeline?**  
> *Answer:* The pipeline automatically terminates at Stage 3 (`Run Automated Tests`). The broken build is never containerized or deployed to production, ensuring continuous quality and reliability.

**Q3: How does the monitoring integration work?**  
> *Answer:* The Node.js application exposes a `/metrics` endpoint using `prom-client`. Prometheus periodically scrapes this endpoint every 5 seconds to collect latency, memory, and custom leave counters, which Grafana visualizes.

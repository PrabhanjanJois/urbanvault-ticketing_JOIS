# UrbanVault Facility Management & Ticketing Desk

A production-minded, full-stack ticketing platform built for **UrbanVault** (managed workspace & flexible office operator) to triage, route, assign, and resolve physical facility issues across office locations.

Built with **React 18**, **Material UI (MUI v5)**, **Vite**, **Python 3.12**, **Django 5**, **Django REST Framework**, **PostgreSQL**, **Redis**, and **Celery**.

---

## 1. Quick Start & Setup Instructions

### Option A: Running with Docker Compose (Recommended)

Ensure Docker and Docker Compose are installed and running.

```bash
# 1. Clone the repository and enter directory
cd urbanvault-ticketing

# 2. Copy the sample environment file
cp .env.example .env

# 3. Build and launch all 5 containers (web, api, db, redis, celery_worker)
docker compose up --build
```

- **Frontend Application**: [http://localhost:3000](http://localhost:3000)
- **Backend API & Swagger**: [http://localhost:8000/api/](http://localhost:8000/api/)
- **Django Admin**: [http://localhost:8000/admin/](http://localhost:8000/admin/)

---

### Option B: Running Locally (Development Mode)

#### Prerequisites
- Python 3.11+ (or `uv`)
- Node.js 18+ & npm
- Redis (optional, system falls back to in-memory cache/eager tasks when offline)

#### 1. Backend Setup
```bash
cd backend

# Create and activate virtual environment
python3 -m venv .venv
source .venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Run migrations
python manage.py migrate

# Seed sample personas, properties, clients, and tickets
python manage.py seed_data

# Start backend development server
python manage.py runserver 0.0.0.0:8000
```

#### 2. Frontend Setup
In a separate terminal:
```bash
cd frontend

# Install dependencies
npm install

# Start Vite development server
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 2. Running Automated Tests

### Backend Test Suite (Pytest)
Covers state transitions, role authorization rules, and Celery task idempotency:
```bash
cd backend
source .venv/bin/activate
pytest ticketing/tests/ -v
```

### Frontend Test Suite (Vitest + React Testing Library)
Covers ticket form rendering, quick issues pills autofill, and double-submit prevention:
```bash
cd frontend
npx vitest run
```

---

## 3. Seeded User Personas & Role Matrix

A **1-Click Persona Switcher** is embedded directly into the top navigation bar, allowing evaluators to instantaneously switch roles without logging in or managing passwords:

| Role | Username | Full Name & Title | Assigned Entity | Permissions & Flow Capabilities |
| :--- | :--- | :--- | :--- | :--- |
| `CLIENT_POC` | `client_chaitanya` | Chaitanya M (Client POC) | Client: Harness (Property: Harness-1317, Floors: 2F, 3F) | Create tickets for Harness; view Harness tickets; comment; Mark Resolved CTA. Cannot assign workers or view other clients. |
| `FACILITY_MANAGER` | `fm_chandan` | Chandan S (Facility Manager) | Property: Harness-1317 (and others) | View tickets in managed properties; comment; monitor operations (no direct worker assignment). |
| `DEPARTMENT_POC` | `dept_dhananjaya` | Dhananjaya Murthy (Technical Manager) | Department: Technical / HVAC | View department tickets; **Assign Worker (Technician)**; **Change Department** (with forwarding note); mark resolved. |
| `DEPARTMENT_POC` | `dept_abdul` | Abdul (IT Manager) | Department: IT & Networks | View IT department tickets; Assign IT worker; Change department; mark resolved. |
| `TECHNICIAN` | `tech_prakash` | Prakash Kumar (Technician) | Department: Technical / HVAC | View assigned tickets; **Submit Assessment** (Mark Fully Resolved, Mark Partially Resolved, Suggest Dept Change); post comments. |

---

## 4. Architecture & Engineering Depth

### Flow A: Ticket Creation
1. **Client POC**: Client is automatically scoped to their company (`Harness`). Floor multi-select lists occupied floors (`2F, 3F`). "Quick Issues" pills (`AC not cooling`, `Internet not working`, `Pantry not cleaned`, `Lights flickering`) tap to autofill.
2. **Internal Staff**: Additional `Client*` dropdown allows selecting the tenant company, with Quick Issues dynamically updating based on that client's ticket history.
3. **On Submission**:
   - Status initialized to `PENDING_TECHNICIAN_ASSIGNMENT`.
   - Ticket auto-assigned to the concerned Department POC.
   - Activity Event 1 added: `Chaitanya M created the ticket.`
   - Activity Event 2 added: `System auto-assigned the ticket to Dhananjaya Murthy.`
   - Celery async notification dispatched with Redis deduplication.

### Flow B: Ticket Handling & State Transitions
- **Department POC**:
  - `Assign Worker`: Dept POC selects a technician (e.g., Prakash Kumar). Status becomes `PENDING_TECHNICIAN_ASSESSMENT`, ticket is assigned to the technician, and an immutable audit log is appended.
  - `Change Department`: Dept POC selects a new department + provides a mandatory forwarding note. Ticket is re-routed to the new Department POC, status becomes `PENDING_TECHNICIAN_ASSIGNMENT`, and audit log is appended.
- **Technician**:
  - `Submit Assessment`: Technician selects one of:
    - *Mark Fully Resolved*: Status becomes `RESOLVED`.
    - *Mark Partially Resolved*: Status becomes `PENDING_DEPARTMENT_REVIEW`.
    - *Suggest Department/Worker Change*: Status becomes `PENDING_DEPARTMENT_REVIEW`.
- **Sticky Comment Stream**: All stakeholders can post comments in real time at the bottom of the ticket detail view.

---

### Engineering Depth Highlights

1. **Audit History & Activity Record**:
   - Every status transition, worker assignment, and department transfer creates an immutable `TicketActivity` record capturing actor, action type, timestamp, and contextual metadata (`old_status`, `new_status`, `assigned_from`, `assigned_to`, `forwarding_note`).

2. **Database Transactions (`@transaction.atomic`)**:
   - Multi-write operations (e.g. creating ticket + auto-routing + logging 2 activities; or assigning worker + changing status + logging activity) are wrapped in `@transaction.atomic` blocks to guarantee consistency.

3. **Query Optimization**:
   - Strict `select_related('client', 'property', 'department', 'created_by', 'assigned_to')` and `prefetch_related('activities__actor', 'comments__author')` across DRF viewsets to completely eliminate N+1 query bottlenecks.
   - Database composite indexes:
     - `Index(fields=['status', '-created_at'])` for high-throughput dashboard filtering and sorting.
     - `Index(fields=['client', 'status'])` for tenant ticket isolation.

4. **Structured Logging**:
   - Structured logging configured across API actions and Celery task execution, omitting credentials and sensitive tokens.

5. **Celery Asynchronous Tasks & Idempotency**:
   - Task `send_ticket_notification(ticket_id, event_type)` is executed asynchronously using Celery with Redis broker.
   - Built-in Redis idempotency keys (`idempotency:ticket_notify:{ticket_id}:{event_type}`) ensure duplicate notifications are prevented if tasks are triggered repeatedly.
   - Configured with exponential retry backoff (`autoretry_for=(Exception,)`, `retry_backoff=True`, `max_retries=3`).

---

## 5. API Endpoints Reference

### Authentication & Personas
- `GET /api/auth/personas/`: Fetch all seeded personas for 1-click switcher.
- `POST /api/auth/switch-persona/`: Switch active persona and receive JWT tokens.
- `GET /api/auth/me/`: Get profile of currently authenticated user.
- `POST /api/auth/token/refresh/`: Refresh expired JWT access token.

### Tickets & Auxiliary Data
- `GET /api/ticketing/auxiliary-data/`: Fetch dropdown options (clients, departments, properties, technicians, quick issues).
- `GET /api/ticketing/tickets/?tab=open|closed&search=&client=&department=&status=&ordering=`: Server-side paginated, searchable, filterable ticket listing.
- `POST /api/ticketing/tickets/`: Create new ticket (auto-assigns and generates audit history).
- `GET /api/ticketing/tickets/{id}/`: Retrieve detailed ticket view with activities, comments, and available CTAs.
- `POST /api/ticketing/tickets/{id}/assign-worker/`: Assign technician to ticket (`PENDING_TECHNICIAN_ASSESSMENT`).
- `POST /api/ticketing/tickets/{id}/change-department/`: Transfer ticket to another department with forwarding note.
- `POST /api/ticketing/tickets/{id}/submit-assessment/`: Technician assessment submission.
- `POST /api/ticketing/tickets/{id}/mark-resolved/`: Direct resolution by Client POC or Department POC.
- `POST /api/ticketing/tickets/{id}/comments/`: Add comment to ticket discussion.

---

## 6. AWS Deployment Architecture Note

For a production deployment on Amazon Web Services (AWS), the platform would be architected as follows:

1. **Compute & Orchestration**:
   - **Backend API & Celery Workers**: AWS Elastic Container Service (ECS) with AWS Fargate (serverless containers).
     - Separate ECS Service for the Django API (auto-scaled on CPU / Request Count).
     - Separate ECS Service for Celery workers (auto-scaled on Redis queue depth / SQS message count).
   - **Frontend**: AWS CloudFront (CDN) backed by an Amazon S3 bucket hosting the static React build bundle (`dist/`), ensuring sub-50ms global asset delivery and edge caching.

2. **Data & Storage**:
   - **Relational Database**: Amazon RDS for PostgreSQL (Multi-AZ deployment with automatic automated failover, read replicas, and automated daily snapshots).
   - **Cache & Message Broker**: Amazon ElastiCache for Redis (Cluster mode enabled, multi-AZ with automatic failover) to power Celery queue and idempotency cache.
   - **Media & Documents**: Amazon S3 with pre-signed upload URLs for ticket attachments or inspection photos.

3. **Secrets & Configuration Management**:
   - AWS Secrets Manager and AWS Systems Manager (SSM) Parameter Store for storing `DJANGO_SECRET_KEY`, database credentials, and Redis endpoints. Injected as container environment variables at ECS task startup.

4. **Networking & Security**:
   - AWS VPC with public and private subnets across 2 Availability Zones.
   - Application Load Balancer (ALB) with AWS WAF and AWS Certificate Manager (ACM) SSL/TLS termination.
   - ECS containers and RDS database located in private subnets with strict security group rules (only ALB can reach ECS API; only ECS can reach RDS and Redis).

5. **Monitoring, Alerting & Failure Recovery**:
   - **Logging**: Amazon CloudWatch Logs for centralized container logging with structured JSON log format.
   - **Observability**: AWS CloudWatch Metrics and AWS X-Ray for distributed tracing and latency tracking.
   - **Alerting**: CloudWatch Alarms sending notifications to Amazon SNS and PagerDuty/Slack for API 5xx spikes, Celery dead-letter queue build-ups, or RDS CPU/memory saturation.
   - **Failure Recovery**: Container health checks (`/health/` or `pg_isready`), automatic container restart via ECS task definitions, and automated database failover in RDS Multi-AZ.

---

## 7. Assumptions & Limitations

- **Timebox Scope**: Adhered to the wireframe note: *"For the purpose of this assignment, the flow ends here. No further handling is required."* The ticket lifecycle completes at the technician assessment / department review / resolved stage.
- **Authentication**: Uses standard JWT tokens backed by the 1-click persona switcher to streamline reviewer evaluation without friction.
- **Client Office Association**: In the wireframe, Harness is located at `Harness-1317` occupying floors `2F, 3F`. Internal staff can choose across multiple clients.

---

## 8. What Would Be Improved With More Time

1. **WebSocket / Server-Sent Events (SSE)**: Real-time live ticket updates and comments using Django Channels without manual polling.
2. **File & Image Attachments**: Direct client-side photo uploads for damaged equipment or physical inspection reports with S3 pre-signed URLs.
3. **SLA Breach Monitoring**: Celery Beat scheduled tasks checking tickets approaching service-level agreement thresholds (e.g. unresolved after 4 hours) and triggering escalation alerts.
4. **End-to-End Testing**: Cypress or Playwright test suite validating the browser flow end-to-end.

---

## 9. Time Spent

- **Architecture, Schema Design & Specs Analysis**: 1.0 hour
- **Backend Implementation (Django, DRF, Celery, Redis, Models, Migrations, Seed Data)**: 2.0 hours
- **Frontend Implementation (React 18, Vite, Material UI, Components, Persona Switcher)**: 2.5 hours
- **Automated Testing Suite (Backend Pytest + Frontend RTL/Vitest)**: 1.0 hour
- **Dockerization, Compose & Documentation**: 1.0 hour
- **Total Time**: ~7.5 hours (well within the 9-hour timebox).

---

## 10. AI-Assisted Development Disclosure

In accordance with the assignment guidelines, AI-assisted development tools (Claude / Gemini coding assistants) were utilized for:
- Accelerating initial boilerplate scaffolding and schema syntax definitions.
- Formatting comprehensive mock seed datasets with realistic persona metadata.
- Generating unit test edge case assertions for state transition rejections.

All architectural decisions, business logic state machine designs, role authorization matrix checks, Celery idempotency implementations, and React UI layout integrations were designed, reviewed, and validated for correctness.

# UrbanVault Full-Stack Developer Assignment: Complete Specification & Blueprint

## 1. Project Overview & Business Domain
- **Company**: UrbanVault (Managed workspace & flexible office operator).
- **Domain**: Facility Management & Office Space Ticketing System.
- **Problem**: Tenant client companies report physical office issues (AC, Internet, Cleaning, Electrical), which UrbanVault facility managers, department managers, and field technicians triage, assign, and resolve.
- **Timebox**: 9 Hours max.
- **Tech Stack**:
  - **Backend**: Python 3.11+, Django 5, Django REST Framework (DRF), PostgreSQL
  - **Task Queue & Broker**: Celery + Redis
  - **Frontend**: React 18+, Material UI (MUI v5), Vite / CRA
  - **DevOps**: Docker & Docker Compose (`docker compose up --build`)
  - **Testing**: Pytest / Django TestCase, Jest / React Testing Library

---

## 2. Seeded User Personas & Role Matrix
Authentication uses standard JWT or Session tokens. A UI role-switcher in the navigation bar lets evaluators switch between seeded personas with 1 click.

| Role | Username | Full Name & Title | Assigned Entity | Permissions |
| :--- | :--- | :--- | :--- | :--- |
| `CLIENT_POC` | `client_chaitanya` | Chaitanya M (Client POC) | Client: Harness (Property: Harness-1317, Floors: 2F, 3F) | Create tickets for Harness; view Harness tickets; post comments; mark resolved. Cannot assign workers or view other clients. |
| `FACILITY_MANAGER` | `fm_chandan` | Chandan S (Facility Manager) | Property: Harness-1317 (and others) | View all tickets in managed properties; comment; re-route; track operations. |
| `DEPARTMENT_POC` | `dept_dhananjaya` | Dhananjaya Murthy (Technical Manager) | Department: Technical / HVAC | View department tickets; **Assign Worker (Technician)**; **Change Department** (with forwarding note); mark resolved. |
| `DEPARTMENT_POC` | `dept_abdul` | Abdul (IT Manager) | Department: IT & Networks | View department tickets; Assign IT worker; Change department; mark resolved. |
| `TECHNICIAN` | `tech_prakash` | Prakash Kumar (Technician) | Department: Technical / HVAC | View tickets assigned to him; **Submit Assessment** (Mark Fully Resolved, Mark Partially Resolved, Suggest Department/Worker Change); post comments. |

---

## 3. Wireframe & User Flow Architecture

### Flow A: Ticket Creation
- **Trigger**: "Create New Ticket" button.
- **Client POC View**:
  - Client is fixed to their company (`Harness`).
  - `Floor(s)`: Multi-select dropdown (`2F, 3F`) shown because Harness occupies multiple floors.
  - `Quick Issues` pills: "AC not cooling", "Internet not working", "Pantry not cleaned", "Lights flickering". Tapping autofills the issue title.
  - `Issue`: Search/text input.
  - `Description`: Issue description text area.
- **Internal Staff View (FM / Dept POC)**:
  - Additional field: `Client*` dropdown (to pick which tenant company is affected).
  - Quick Issues pills dynamically populate based on that selected client's ticket history.
- **On Submit**:
  - Status becomes: `PENDING_TECHNICIAN_ASSIGNMENT`.
  - System automatically routes and assigns ticket to Concerned Department POC.
  - Activity Log event 1: `Chaitanya M created the ticket.`
  - Activity Log event 2: `System auto-assigned the ticket to Dhananjaya Murthy.`
  - Celery background task triggered: Simulated email/SMS notification sent with retry logic and idempotency protection.

### Flow B: Ticket Handling & State Transitions

```
[Create Ticket]
      │
      ▼
Status: PENDING_TECHNICIAN_ASSIGNMENT (Assignee: Department POC)
      │
      ├─► Client POC: Sees ticket, has 1 CTA ("Mark Resolved")
      ├─► Facility Manager: Sees ticket, no CTAs (monitor only)
      └─► Department POC: Sees ticket, has 2 CTAs:
            1. "Assign Worker": picks Technician (e.g. Prakash Kumar)
            2. "Change Department": selects new department + adds forwarding note
      │
      ▼ (Dept POC selects Worker & submits)
Status: PENDING_TECHNICIAN_ASSESSMENT (Assignee: Prakash Kumar)
      │
      ├─► Activity Event 3 added: "DM assigned technician PK"
      ├─► Technician now sees ticket in their list!
      └─► Technician opens ticket, has 1 CTA: "Submit Assessment"
            Options:
            - Mark Fully Resolved
            - Mark Partially Resolved
            - Suggest Department/Worker Change
      │
      ▼ (Technician submits assessment)
Status: PENDING_DEPARTMENT_REVIEW or RESOLVED
      │
      ├─► Activity Event 4 added: "PK changed status of the ticket" + assessment notes
      └─► Flow ends here as explicitly specified in wireframe note:
          "For the purpose of this assignment, the flow ends here. No further handling is required."
```

---

## 4. Database Schema Design (PostgreSQL)

### Models & Constraints
1. **`User`** (`AbstractUser`):
   - `role`: enum (`CLIENT_POC`, `FACILITY_MANAGER`, `DEPARTMENT_POC`, `TECHNICIAN`)
   - `department`: ForeignKey(`Department`, null=True)
   - `client`: ForeignKey(`Client`, null=True)
   - `phone`, `avatar_initials`
2. **`Property`**:
   - `name` (e.g. "Harness-1317")
   - `address`, `total_floors` (list of strings, e.g. `["1F", "2F", "3F", "4F"]`)
   - `facility_manager`: ForeignKey(`User`)
3. **`Client`**:
   - `name` (e.g. "Harness")
   - `property`: ForeignKey(`Property`)
   - `occupied_floors`: JSONField (e.g. `["2F", "3F"]`)
4. **`Department`**:
   - `name`: ("Technical / HVAC", "IT & Networks", "Electrical", "Housekeeping")
   - `poc`: ForeignKey(`User`)
5. **`Ticket`**:
   - `ticket_number`: CharField unique (e.g. `TKT-1042`)
   - `client`: ForeignKey(`Client`, on_delete=CASCADE)
   - `property`: ForeignKey(`Property`, on_delete=CASCADE)
   - `floors`: JSONField (e.g. `["2F", "3F"]`)
   - `department`: ForeignKey(`Department`, on_delete=PROTECT)
   - `created_by`: ForeignKey(`User`, related_name='created_tickets')
   - `assigned_to`: ForeignKey(`User`, related_name='assigned_tickets', null=True)
   - `title`: CharField(max_length=255)
   - `description`: TextField
   - `status`: CharField(choices=[
       ('PENDING_TECHNICIAN_ASSIGNMENT', 'Pending Technician Assignment'),
       ('PENDING_TECHNICIAN_ASSESSMENT', 'Pending Technician Assessment'),
       ('PENDING_DEPARTMENT_REVIEW', 'Pending Department POC Review'),
       ('RESOLVED', 'Resolved'),
       ('CLOSED', 'Closed')
     ])
   - `created_at`, `updated_at`: DateTimeField(auto_now_add=True, auto_now=True)
   - **Database Index**:
     - `indexes = [models.Index(fields=['status', '-created_at']), models.Index(fields=['client', 'status'])]`
6. **`TicketActivity`** (Audit Trail):
   - `ticket`: ForeignKey(`Ticket`, related_name='activities')
   - `actor`: ForeignKey(`User`, null=True)
   - `action_type`: (`CREATED`, `AUTO_ASSIGNED`, `ASSIGNED_WORKER`, `CHANGED_DEPARTMENT`, `STATUS_CHANGED`, `RESOLVED`)
   - `description`: CharField
   - `metadata`: JSONField (old_status, new_status, old_assignee, new_assignee, note)
   - `created_at`: DateTimeField(auto_now_add=True)
7. **`TicketComment`**:
   - `ticket`: ForeignKey(`Ticket`, related_name='comments')
   - `author`: ForeignKey(`User`)
   - `content`: TextField
   - `created_at`: DateTimeField(auto_now_add=True)

---

## 5. Engineering Depth Highlights (Assignment Bonus Criteria)
1. **Audit History & Activity Record**: Full immutable chronological history for every state transition and worker assignment.
2. **Database Transactions**: Multi-write operations (Ticket create + auto-assign + activity log; worker assignment + status change + activity log) wrapped inside `@transaction.atomic`.
3. **Query Optimization**: Strict `select_related('client', 'property', 'department', 'created_by', 'assigned_to')` and `prefetch_related('activities', 'comments')` in DRF viewsets to prevent N+1 query overhead.
4. **Structured Logging**: Request-ID tagged logging for critical operations (creation, transitions, worker assignments) omitting credentials.
5. **Celery Asynchronous Tasks & Idempotency**:
   - Task `send_ticket_notification.delay(ticket_id, event_type)`
   - Backed by Redis with idempotency cache keys (`idempotency:ticket_notify:{ticket_id}:{event_type}`) to prevent duplicate execution.
   - Built-in `autoretry_for=(ConnectionError, Exception)`, `retry_backoff=True`, `max_retries=3`.

---

## 6. Testing Strategy (4 Core Automated Tests)
1. **API State Transition & Business Rules**: Verifies that valid status transitions succeed and invalid transitions return `HTTP 400 Bad Request`.
2. **Role Authorization**: Verifies that a `CLIENT_POC` cannot assign technicians or view other clients' tickets (`HTTP 403 Forbidden`).
3. **Celery Task Retry & Idempotency**: Tests task failure handling and prevents duplicate execution using mocked broker.
4. **Frontend Component Test**: React Testing Library test verifying the ticket form rendering, quick issues pills autofill, and double-submit prevention.

---

## 7. Deliverables Checklist
- [x] Complete source code in repository
- [x] Backend API with DRF, Postgres, Migrations, and Seed Data (`manage.py seed_data`)
- [x] Celery worker + Redis async processing
- [x] React + Material UI frontend with Persona Switcher, Dashboard, Filters, Search, and CTAs
- [x] Docker Compose config (`web`, `api`, `db`, `redis`, `celery_worker`)
- [x] Automated test suite
- [x] Comprehensive README with setup commands, architecture decisions, and AWS deployment note
- [x] AI disclosure section in README

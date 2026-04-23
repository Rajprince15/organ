"# 🫀 OrganConnect — Organ Donation & Matching Platform

A full-stack, role-based organ donation platform that connects **donors**, **hospitals**, **branch hospitals**, and **administrators** through an intelligent matching engine, real-time notifications, and a shared organ-bank marketplace.

> **Mission:** Reduce the gap between organ donors and patients in need by automating matching, streamlining hospital workflows, and creating a transparent, auditable donation pipeline.

---

## 📚 Table of Contents

- [Features](#-features)
- [Tech Stack](#-tech-stack)
- [Project Structure](#-project-structure)
- [Architecture Overview](#-architecture-overview)
- [Getting Started](#-getting-started)
- [Environment Variables](#-environment-variables)
- [Running the App](#-running-the-app)
- [Demo Credentials](#-demo-credentials)
- [API Reference](#-api-reference)
- [Smart Matching Algorithm](#-smart-matching-algorithm)
- [Testing](#-testing)
- [Roles & Permissions](#-roles--permissions)
- [Roadmap](#-roadmap)
- [Contributing](#-contributing)
- [License](#-license)

---

## ✨ Features

### 🔐 Authentication & Roles
- JWT-based authentication with **bcrypt** password hashing
- 4 user roles: `donor`, `hospital`, `branch_hospital`, `admin`
- Mobile OTP verification flow (mocked for demo)
- Role-based UI (donors see \"Donate\", hospitals see \"Post Requirement\", etc.)
- Demo credentials auto-seeded for instant preview

### 🩸 Donor Experience
- Simplified registration (name, age, mobile, email, password)
- Donation application with organ selection, blood group, location & consent
- **Auto-assignment** to the nearest branch hospital for medical check-up
- Email + SMS notifications when assigned to a branch
- Downloadable eligibility reports (PDF)
- Personal dashboard with matching hospital requirements
- Status tracking: `pending → approved → active → inactive / cancelled`
- Check-up status tracking: `pending_checkup → scheduled → completed → eligible / not_eligible`

### 🏥 Hospital Experience
- Post & manage patient organ requirements (organ, blood group, urgency)
- Advanced donor search with filters (organ, blood group, age range, city, state)
- Smart **donor-match scoring** per requirement
- Shortlist, contact history, and match workflow
- CSV export of filtered donor lists
- Organ Bank marketplace to publish available organs

### 🏛️ Branch Hospital Dashboard
- Receives donor assignments based on geographic proximity
- Schedules & records medical check-ups
- Uploads donor eligibility reports (PDF)
- Updates donor eligibility status (eligible / not_eligible)

### 🛡️ Admin Control Panel
- Platform-wide dashboard with aggregated statistics
- CRUD over users, donation applications, requirements
- Branch hospital onboarding (auto-generated credentials)
- Match analytics + configurable scoring algorithm weights
- Activity log + audit trail for sensitive actions
- Community moderation (posts, reels, events, resources)
- Support tickets, FAQ, and help documentation management
- Broadcast notifications and system settings

### 🧠 Smart Matching Engine
- Multi-factor scoring: **organ match + blood compatibility + location + age**
- Urgency multipliers (critical × 1.5, high × 1.3, medium × 1.0)
- Admin-tunable weights & minimum score threshold
- Bi-directional matching (donor → requirements, requirement → donors)
- Auto-notification on new matches (hospital & top donors)

### 🔔 Notifications & Community
- In-app notification center with unread count
- Donation-status-change and match notifications
- Email + SMS gateway hooks (extensible)
- Community posts, reels, events, and educational resources

### 📦 Organ Bank Marketplace
- Hospitals publish available organs with status tracking
- Status lifecycle: `available → reserved → in_transit → allocated → expired`

---

## 🛠 Tech Stack

| Layer        | Technology                                                                 |
|--------------|----------------------------------------------------------------------------|
| **Frontend** | React 18, Vite, TypeScript, TailwindCSS, shadcn/ui, Radix UI, React Router |
| **State/Data** | TanStack Query, React Context, React Hook Form + Zod                     |
| **Backend**  | FastAPI (Python 3.11+), Pydantic v2, Motor (async MongoDB)                 |
| **Auth**     | PyJWT, passlib[bcrypt]                                                     |
| **Database** | MongoDB (with in-memory mock fallback for zero-config demos)               |
| **Other**    | jsPDF, html2canvas, qrcode.react, Recharts, Sonner (toasts), Supabase (edge functions) |
| **Tooling**  | Yarn, Concurrently, ESLint, Ruff, Pytest                                   |

---

## 📂 Project Structure

```
organ/
├── backend/                          # FastAPI application
│   ├── server.py                     # Main API router (auth, donations, requirements, admin, matching)
│   ├── auth_routes.py                # /api/auth/* endpoints
│   ├── auth_utils.py                 # JWT + password hashing helpers
│   ├── models.py                     # Pydantic models (User, DonationApplication, etc.)
│   ├── mock_db.py                    # In-memory MongoDB emulator
│   ├── matching_service.py           # Donor ↔ requirement scoring engine
│   ├── branch_assignment_service.py  # Geo-based branch hospital matching
│   ├── notification_service.py       # In-app notifications
│   ├── email_service.py              # Email notifications
│   ├── sms_service.py                # SMS notifications
│   ├── file_upload_service.py        # Eligibility report uploads
│   ├── match_logging_service.py      # Match audit trail
│   ├── activity_logging_service.py   # Admin activity/audit logs
│   ├── admin_service.py              # Admin helper utilities
│   ├── phase3_service.py             # Support tickets, FAQs, help docs
│   ├── seed_users.py                 # Seeds demo donor/hospital/admin users
│   ├── create_sample_reports.py      # Seeds sample eligibility reports
│   ├── requirements.txt
│   └── .env
│
├── frontend/                         # React + Vite app
│   ├── src/
│   │   ├── App.tsx                   # Route configuration
│   │   ├── contexts/AuthContext.tsx  # Auth state, login/register/logout
│   │   ├── pages/
│   │   │   ├── Login.tsx, Register.tsx
│   │   │   ├── DonorDashboard.tsx, DonorRegistration.tsx, DonorMatchingRequirements.tsx, MyReports.tsx
│   │   │   ├── HospitalDashboard.tsx, HospitalRequirements.tsx, HospitalShortlist.tsx
│   │   │   │   HospitalCompatibleDonors.tsx, EnhancedDonorListPage.tsx
│   │   │   ├── BranchHospitalDashboard.tsx
│   │   │   ├── AdminDashboard.tsx
│   │   │   └── admin/                # Admin sub-pages (users, donations, matching, audit, analytics…)
│   │   ├── components/               # Shared UI (Navigation, Cards, Dialogs, shadcn/ui primitives)
│   │   ├── hooks/, lib/, integrations/, assets/
│   │   └── index.css
│   ├── supabase/functions/           # Optional edge functions
│   ├── package.json
│   ├── vite.config.ts
│   ├── tailwind.config.ts
│   └── .env
│
├── tests/                            # Pytest test files
├── backend_test.py                   # Backend API test suite
├── test_result.md                    # Agent-maintained test state
├── package.json                      # Root scripts (concurrently runs backend + frontend)
└── README.md
```

---

## 🏗 Architecture Overview

```
┌──────────────┐        ┌───────────────────────────┐        ┌──────────────┐
│   Browser    │◄──────►│  React + Vite (port 3000) │◄──────►│   FastAPI    │
│ (Donor / Hosp│  HTTP  │  shadcn/ui · Radix · RQ   │  /api  │ (port 8001)  │
│  /Admin UI)  │        └───────────────────────────┘        └──────┬───────┘
└──────────────┘                                                    │
                                                                    ▼
                    ┌──────────────────────────────────────────────────────┐
                    │   Matching · Notification · Email · SMS · File Upload │
                    │              (FastAPI service modules)                │
                    └──────────────────┬───────────────────────────────────┘
                                       ▼
                              ┌─────────────────┐
                              │    MongoDB      │
                              │  (or mock_db)   │
                              └─────────────────┘
```

**Notes**
- All backend routes are prefixed with `/api` for ingress routing.
- The frontend reads the backend URL exclusively from `REACT_APP_BACKEND_URL` / `VITE_BACKEND_URL`.
- A mock MongoDB layer (`mock_db.py`) lets you run the app without installing MongoDB.

---

## 🚀 Getting Started

### Prerequisites

- **Node.js** 18+ and **Yarn**
- **Python** 3.11+
- **MongoDB** 6+ *(optional — a mock DB is used by default)*

### 1. Clone the repository

```bash
git clone https://github.com/Rajprince15/organ.git
cd organ
```

### 2. Install dependencies

```bash
# Install everything (root, frontend, backend) in one command
yarn install:all
```

Or individually:

```bash
# Root
yarn install

# Frontend
cd frontend && yarn install && cd ..

# Backend
cd backend && pip install -r requirements.txt && cd ..
```

### 3. Configure environment variables

Create `backend/.env`:

```env
MONGO_URL=""
DB_NAME=organ_connect
USE_MOCK_DB=true                # set to false to use real MongoDB
JWT_SECRET=replace-with-a-strong-secret
JWT_ALGORITHM=HS256
JWT_EXPIRES_MIN=60
CORS_ORIGINS=*
```

Create `frontend/.env`:

```env
VITE_BACKEND_URL=http://localhost:8001
REACT_APP_BACKEND_URL=http://localhost:8001
```

### 4. Seed demo users (optional but recommended)

```bash
cd backend
python seed_users.py
python create_sample_reports.py   # optional: seed sample eligibility reports
cd ..
```

---

## ▶️ Running the App

### Run both services together

```bash
yarn dev
# or
yarn start
```

This runs:
- Backend → http://localhost:8001
- Frontend → http://localhost:3000

### Run services separately

```bash
# Backend
yarn start:backend
# -> uvicorn server:app --host 0.0.0.0 --port 8001 --reload

# Frontend
yarn start:frontend
# -> vite
```

### Supervisor (deployed/container environments)

```bash
yarn start:services      # start backend + frontend
yarn restart:services    # restart both
yarn stop:services       # stop both
```

---

## 🔑 Demo Credentials

After seeding, log in with any of these accounts on `/login`:

| Role     | Email                          | Password       |
|----------|--------------------------------|----------------|
| Donor    | `donor@organconnect.com`       | `donor123`     |
| Hospital | `hospital@organconnect.com`    | `hospital123`  |
| Admin    | `admin@organconnect.com`       | `admin123`     |

Branch hospital accounts are generated automatically by admins from **Admin → Branch Hospital Management**.

---

## 📡 API Reference

All endpoints are prefixed with `/api`. Auth-required endpoints expect `Authorization: Bearer <JWT>`.

### Authentication (`/api/auth`)

| Method | Endpoint              | Description                         |
|--------|-----------------------|-------------------------------------|
| POST   | `/register`           | Register donor or hospital          |
| POST   | `/login`              | Login (all roles)                   |
| GET    | `/me`                 | Current user from JWT               |
| POST   | `/request-otp`        | Request mobile OTP *(mocked)*       |
| POST   | `/verify-otp`         | Verify mobile OTP *(mocked)*        |

### Donor (`/api/donations`)

| Method | Endpoint                           | Description                                        |
|--------|------------------------------------|----------------------------------------------------|
| POST   | `/donations`                       | Create donation application (donor only)           |
| GET    | `/donations/me`                    | Current donor's application                        |
| GET    | `/donations/me/branch-hospital`    | Assigned branch hospital details                   |
| GET    | `/donations/me/report`             | Download eligibility report (PDF)                  |
| PUT    | `/donations/{id}`                  | Update own application                             |
| DELETE | `/donations/{id}`                  | Delete own application                             |
| GET    | `/donations/all`                   | Paginated/filterable donor list (hospital only)    |
| GET    | `/donations/export`                | CSV export of filtered donors (hospital only)      |

### Hospital Requirements (`/api/hospital-requirements`)

| Method | Endpoint                             | Description                             |
|--------|--------------------------------------|-----------------------------------------|
| POST   | `/hospital-requirements`             | Create requirement (hospital/admin)     |
| GET    | `/hospital-requirements/me`          | Own requirements (admin = all)          |
| PUT    | `/hospital-requirements/{id}`        | Update requirement                      |
| DELETE | `/hospital-requirements/{id}`        | Delete requirement                      |

### Smart Matching (`/api/matches`)

| Method | Endpoint                           | Description                                |
|--------|------------------------------------|--------------------------------------------|
| GET    | `/matches/donors/all`              | Aggregated donor matches (hospital)        |
| GET    | `/matches/donors/{requirement_id}` | Matches for a specific requirement         |
| GET    | `/matches/requirements/me`         | Requirements matching current donor        |
| POST   | `/matches/refresh`                 | Recompute matches + fire notifications     |

### Contacts & Shortlist

- `POST /api/contacts`, `GET /api/contacts/me`
- `POST /api/shortlist`, `GET /api/shortlist/me`, `DELETE /api/shortlist/{donor_id}`

### Notifications (`/api/notifications`)

| Method | Endpoint                        | Description                  |
|--------|---------------------------------|------------------------------|
| GET    | `/notifications/me`             | List user notifications      |
| GET    | `/notifications/unread-count`   | Unread count badge           |
| PUT    | `/notifications/{id}/read`      | Mark single as read          |
| PUT    | `/notifications/mark-all-read`  | Mark all as read             |
| DELETE | `/notifications/{id}`           | Delete notification          |

### Admin (`/api/admin`)

- **Stats & activity**: `GET /admin/stats`, `GET /admin/activity`, `GET /admin/analytics`
- **Users**: `GET|PUT|DELETE /admin/users[...]`
- **Donations**: `GET|PUT|DELETE /admin/donations[...]`, `GET|PUT /admin/donors/{id}`, `PUT /admin/donors/{id}/status`
- **Requirements**: `GET|PUT|DELETE /admin/requirements[...]`
- **Branch hospitals**: CRUD under `/admin/branch-hospitals`
- **Algorithm config**: `GET|PUT /admin/algorithm-config`
- **Community, events, resources, support, FAQs, help docs** (see `server.py` / `phase3_service.py`)

### File Serving

- `GET /api/uploads/{folder}/{filename}` — serves uploaded eligibility reports and images.

> 👉 Full OpenAPI docs are auto-generated at `http://localhost:8001/docs` when the backend is running.

---

## 🧮 Smart Matching Algorithm

Matches are scored with a weighted formula (defaults; all weights are admin-tunable):

| Factor                | Default Weight | Notes                                           |
|-----------------------|---------------:|-------------------------------------------------|
| Organ match           | **100**        | Hard requirement — donor must offer the organ   |
| Blood compatibility   | 50             | Exact + universal donor/recipient rules         |
| Location proximity    | 30             | Same city > same state > same country           |
| Age suitability       | 20             | Prefers donors in medically viable age bands    |

**Urgency multipliers** (applied to the final score):

- Critical → ×1.5
- High → ×1.3
- Medium → ×1.0

A `min_match_score_threshold` filters out weak matches (default `100`). Admins can tune these live from **Admin → Matching → Algorithm Config**.

---

## 🧪 Testing

```bash
# Backend API tests (full suite)
python backend_test.py

# Pytest (unit tests)
cd backend && pytest
```

Backend endpoints have been verified end-to-end for:

- ✅ Donor & hospital registration (admin role rejected, duplicate email/mobile guarded)
- ✅ Login for all 3 roles + invalid credential rejection
- ✅ JWT verification via `/api/auth/me`
- ✅ OTP request/verify (mocked — accepts any 6-digit code in demo mode)
- ✅ Donation CRUD + branch assignment + notifications
- ✅ Hospital requirement CRUD + auto-matching
- ✅ Admin CRUD over users/donations/requirements

See `test_result.md` for the full agent-maintained test history.

---

## 👥 Roles & Permissions

| Action                               | Donor | Hospital | Branch Hospital | Admin |
|--------------------------------------|:-----:|:--------:|:---------------:|:-----:|
| Register via public form             |  ✅   |    ✅    |        ❌        |   ❌   |
| Submit / edit own donation app       |  ✅   |    ❌    |        ❌        |   ❌   |
| Post organ requirements              |  ❌   |    ✅    |        ❌        |   ✅   |
| Browse / filter / export donor list  |  ❌   |    ✅    |        ❌        |   ✅   |
| Manage shortlist & contact history   |  ❌   |    ✅    |        ❌        |   ❌   |
| Conduct medical check-up & upload report | ❌ |    ❌    |        ✅        |   ✅   |
| Publish organs to Organ Bank         |  ❌   |    ✅    |        ❌        |   ✅   |
| Tune matching algorithm              |  ❌   |    ❌    |        ❌        |   ✅   |
| Full platform CRUD + audit logs      |  ❌   |    ❌    |        ❌        |   ✅   |

---

## 🗺 Roadmap

- [ ] Real SMS gateway (Twilio) + transactional email provider (Resend / SendGrid)
- [ ] WebSocket-based real-time notifications
- [ ] ML-powered compatibility scoring (HLA, organ-specific biomarkers)
- [ ] Mobile app (React Native / Expo)
- [ ] Multilingual support (i18n)
- [ ] HIPAA/GDPR compliance hardening & end-to-end encryption for medical reports
- [ ] Public dashboards with anonymised impact metrics

---

## 🤝 Contributing

1. Fork the repo and create a feature branch: `git checkout -b feat/my-feature`
2. Follow the existing code style (ESLint + Ruff + Black)
3. Add/update tests in `backend_test.py` or `tests/`
4. Commit with conventional messages: `feat:`, `fix:`, `docs:`…
5. Open a pull request describing the change and linking any relevant issues

---

## 📄 License

This project is provided **as-is** for educational and humanitarian purposes. Before using it in production — especially anywhere that touches real medical data — you must review applicable health-data regulations (HIPAA, GDPR, DPDP Act, etc.) and add the appropriate licensing & compliance controls.

---

## 🙏 Acknowledgements

- **FastAPI** & **Motor** for the async Python backend
- **shadcn/ui**, **Radix UI**, and **TailwindCSS** for the polished, accessible UI primitives
- **Lovable.dev / Emergent** tooling used during scaffolding
- Every donor who makes this work meaningful ❤️

---

*Built with care for a cause that saves lives.*
"

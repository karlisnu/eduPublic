# EDU-EduMatch

<div align="center">
  <img src="https://img.shields.io/badge/Project-EDU--EduMatch-blue" alt="EDU-EduMatch" />
  <img src="https://img.shields.io/badge/Type-University%20Tutoring-orange" alt="Tutoring Platform" />
  <img src="https://img.shields.io/badge/Stack-HTML%20%7C%20CSS%20%7C%20JavaScript-green" alt="Tech Stack" />
</div>

## Project Overview

EDU-EduMatch is a university tutoring web platform that connects students with tutors specialized in different subjects. Students can find academic support, filter tutors by subject and rating, and use registration, login, messaging, and file-management screens.

The current release is a functional frontend prototype built with HTML, CSS, and JavaScript. Real authentication, persistence, and backend endpoints are planned for the integration phase.

## Features

- Student and tutor registration forms
- Role-based login and dashboards
- Tutor search and filtering by name, subject, and rating
- Messaging and file-management screens
- Responsive interface for mobile and desktop

## Requirements

### Functional requirements

- **FR-01:** Student registration with academic and contact information.
- **FR-02:** Tutor registration with experience and teaching subjects.
- **FR-03:** Login and role-specific dashboard redirection.
- **FR-04:** Tutor search by name, subject, or rating.
- **FR-05:** Tutor cards with profile and availability information.
- **FR-06:** Student dashboard with search, messages, files, and activities.
- **FR-07:** Tutor dashboard with profile and student communication.
- **FR-08:** Navigation between home, authentication, dashboards, and academic sections.
- **FR-09:** Validation of required fields and invalid input.
- **FR-10:** Responsive design for desktop, tablet, and mobile screens.

### Non-functional requirements

- Clear and accessible user experience.
- Compatibility with modern browsers.
- Organized files that support maintenance and future expansion.
- Secure handling of credentials and parameterized database queries.

## Project Structure

- `Alumnos/html/`: student pages, authentication, registration, and dashboards
- `js/`: JavaScript logic and tutor filtering scripts
- `imagenes/`: profile images
- `Imagenescosas/`: interface and study images
- `Fuentes/`: fonts used by the interface
- `frontend/`: local frontend serving command
- `.devcontainer/`: reproducible development environment
- `.github/`: issue templates, pull request template, and CI workflow
- `docs/`: architecture and pair-working documentation

## How to Run

1. Open the repository in the Dev Container so the backend can resolve the MySQL service as `db`.
2. Prepare the schema and load local demo records:

```bash
npm --prefix backend run db:setup
```

This applies pending SQL migrations and then inserts local development accounts
and example data. It does not delete existing records. The seed creates inactive,
explicitly demo-only career and campus entries for the example student; they are
not official catalog values and cannot be selected for new registrations. Import
verified catalogs and career-subject-semester mappings before enabling tutor
applications. Student accounts are not registered through the public app.

3. Start the backend and frontend in separate terminals:

```bash
npm --prefix backend run dev
npm --prefix frontend run dev -- --host 0.0.0.0
```

The frontend is available at `http://localhost:5173`, and the API at
`http://localhost:8000`. The backend requires MySQL; if the database is
unavailable, it exits or returns an error instead of pretending to save data in
memory.

Local development accounts (only after running the seed):

| Role | Login | Password |
| --- | --- | --- |
| Administrator | `admin` | `AdminA1!` |

Students and tutors now authenticate through Microsoft SSO with an eligible
`@ues.mx` account. Seeded student/tutor rows are demo data, not proof of
institutional identity, and cannot use password login. Never use demo
administrator credentials in production. The database seed command refuses to
run when `NODE_ENV=production`.

`GET /api/catalogs` exposes active careers, campuses, and subjects.
`GET /api/catalogs/tutor-subjects?careerId=<id>&currentSemester=<n>` returns
only subjects mapped to that career at or before the tutor's current semester.
Load verified career/subject/semester rows into `career_subjects`; the current
seed does not invent an official curriculum, so tutor signup stays disabled
until eligible subjects are available. Tutors start registration through
Microsoft SSO, then submit their profile, 11-digit student number, career,
semester, average (0-100), and eligible subjects for administrator review.
Student registration is disabled; an unknown institutional student sees
“El usuario no está registrado”. The retired `POST /api/users` endpoint returns
HTTP 410.

Authentication uses a server-side MySQL session and an `HttpOnly`, `SameSite=Strict`
cookie. Apply migrations with `npm --prefix backend run db:migrate` (or rerun
`db:setup`); migration 006 adds tutor academic eligibility and career-subject
mapping. The browser restores the login with `GET /api/session` and ends it
with `POST /api/logout`. Tutor search requires an authenticated student session.
Administrative approval endpoints require an authenticated administrator:
`GET /api/admin/approvals/pending` and
`PATCH /api/admin/users/:id/approval` with `{"decision":"approved"}` or
`{"decision":"rejected"}`. Approval decisions are recorded in `approval_events`.
Interactive API documentation is available at `http://localhost:8000/api-docs`
after starting the backend. The OpenAPI document is served at
`http://localhost:8000/api-docs.json`. In Swagger UI, use the Microsoft SSO flow
for students/tutors or `POST /api/login` for an approved administrator before
trying protected endpoints; the browser retains the resulting HttpOnly session
cookie for subsequent requests. The administrator frontend entry is
`http://localhost:5173/admin-login`. Swagger UI assets
are loaded from jsDelivr, so the docs page needs internet access.
Set `FRONTEND_ORIGIN` when the browser frontend is hosted at a different origin
within the same site;
production deployments must use HTTPS so the session cookie is marked `Secure`.

Students can also sign in with a Universidad de Sonora Microsoft Entra account.
Register a **single-tenant Web** application in the university tenant and add
`http://localhost:8000/api/auth/microsoft/callback` as its Web redirect URI.
Set `MICROSOFT_TENANT_ID`, `MICROSOFT_CLIENT_ID`, `MICROSOFT_CLIENT_SECRET`,
and `MICROSOFT_REDIRECT_URI` in `backend/.env` (copy the tenant ID and callback
from `backend/.env.example`; keep the client secret private). Production requires
an HTTPS callback URI for the deployed backend, also registered in Entra.
Run `npm --prefix backend run db:migrate` to apply the Microsoft sign-in schema.
Entra sign-in is available only for `@ues.mx` students and tutors. Existing
student/tutor profiles are linked by institutional email and must be approved.
An unregistered student cannot create a public account. An unregistered tutor
can submit a tutor application after Microsoft validates the institutional
identity; EduMatch never receives or stores the institutional password.

## Dev Container and MySQL

The Dev Container starts a MySQL 8.4.3 service named `db` with database `appdb` and development credentials:

```bash
mysql -h db -u dev -pdev appdb -e "SELECT 1;"
```

MySQL data is stored in the `edumatch_mysql_data` named volume and remains
available when the service container is recreated. The container runs
`bash .devcontainer/setup.sh` after creation and installs the frontend
dependencies automatically. Run `npm --prefix backend run db:setup` after the
database is healthy and whenever new migrations or local seed data are needed.

Outside the Dev Container, copy `backend/.env.example` to `backend/.env` and set
`DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, and `DB_NAME` to match a reachable
MySQL instance. Keep `.env` local and do not commit credentials.

The project architecture and planned API boundary are documented in [`docs/architecture.md`](docs/architecture.md). Pull requests are validated by [`.github/workflows/ci.yml`](.github/workflows/ci.yml).
The complete Week 1 verification procedure is documented in [`docs/week1-verification.md`](docs/week1-verification.md).
The local startup, database migration, health-check, and troubleshooting procedures are documented in [`docs/runbook.md`](docs/runbook.md).

## Project Proposal

The primary entity is `Student`. A student can create many `TutoringRequest` records through a foreign key relationship. The related `Tutor` entity stores subjects, availability, academic experience, and rating. The first milestone covers tutor list/detail views, a validated form, and a read-only endpoint.

## Team

- Burboa Herrera Guadalupe de Jesus
- Encinas Cruz Karla Mariana
- Roman Martinez Julian Rodolfo

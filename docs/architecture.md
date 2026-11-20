# Edu-Match Architecture

## Current milestone

EDU-EduMatch currently includes a React frontend prototype served by Vite from `frontend/`. The Dev Container provides the reproducible development environment and MySQL service required for the integration phase. The older static pages in `Alumnos/html` and scripts in `js/` are retained as legacy prototype assets.

The approved product requirements are documented in
[`business-rules.md`](./business-rules.md). This document describes the current
architecture and implementation; if they differ from a business rule, report
the discrepancy instead of silently treating the implementation as the rule.

## Components

| Component | Location | Responsibility |
| --- | --- | --- |
| React frontend | `frontend/src/` | React components, JSX entry point, and CSS styles for student and tutor views, including `TutorManagementPage.jsx` |
| Frontend tooling | `frontend/package.json`, `frontend/vite.config.mjs` | React 19 dependencies, Vite development server, and `/api` proxy on port 5173 |
| Legacy frontend pages | `Alumnos/html/` | Older static student and tutor views, forms, dashboards, and navigation |
| Legacy frontend scripts | `js/` | Older login, tutor search, filtering, and UI behavior |
| Database service | `.devcontainer/docker-compose.yml` | MySQL database `appdb` on service host `db` |
| Development environment | `.devcontainer/` | Identical tools and setup for every contributor |

## Domain model

The complete MySQL model is defined in [`backend/sql/schema.sql`](../backend/sql/schema.sql). It separates authentication data from role-specific profiles:

- `users` stores credentials, one of the `admin`, `alumno`, or `tutor` roles, and the approval lifecycle. `student_profiles` and `tutor_profiles` store only fields belonging to that role.
- `careers` and `campuses` are lookup catalogs referenced by student profiles. Only active values loaded from authoritative Universidad de Sonora data may be offered for selection. Student numbers must be 11 digits and stay unverified until an authoritative verification process confirms them.
- `tutor_profiles` also records the tutor's career, current semester, and reported average (0-100). These fields remain pending administrative review; a numeric student number is not itself proof of enrollment.
- `career_subjects` maps each subject to the semester in which it is taught for an active career. Populate it only from an authoritative curriculum. Tutor signup and tutor search only accept/display subjects mapped to that career at or before the tutor's current semester.
- Names/usernames are letters only, emails are validated and unique, and student phone numbers contain 11 digits. Tutor bio/experience are capped at 100 characters; subject descriptions at 100 words; ratings and student-evaluation comments at 50 characters.
- Administrators use the existing `users` account with role `admin`; there is no separate password-bearing admin table or public admin registration. Provision the initial admin outside the public application. The backend must authorize administrative profile changes and approval events.
- `subjects` and `tutor_subjects` provide a normalized many-to-many relation so tutor search is scoped to subjects without duplicating subject names.
- `tutor_student_connections` stores the student-tutor relationship. Its database statuses are `pending`, `accepted`, `rejected`, and `ended`; `ended` is the persisted terminal state for a finished relationship. The backend must validate the connection status and ownership for each operation; the existence of a row alone does not grant access. It is not a message or chat entity.
- The backend must prevent duplicate tutoring requests while an equivalent request is pending or a connection is active, according to the policy in `business-rules.md`.
- `tutor_ratings` stores student-to-tutor ratings. `student_evaluations` is separate and stores tutor-to-student academic evaluations, preserving the direction and permissions of each action.
- `academic_files` stores metadata for files sent from a tutor to an accepted student. The binary content belongs in protected object storage, while `storage_key` identifies it in the database.
- `approval_events` keeps account approval and suspension decisions with the affected user, reviewer, decision, and timestamp. `business-rules.md` also requires auditing important profile and catalog modifications; do not assume `approval_events` records those changes unless the implementation explicitly does so.

The canonical schema is [`backend/sql/schema.sql`](../backend/sql/schema.sql). New databases use it directly; existing databases apply [`backend/sql/migrations/002_apply_profile_data_rules.sql`](../backend/sql/migrations/002_apply_profile_data_rules.sql). Legacy career/campus values are retained as inactive until verified against official catalogs. Invalid legacy values must be reviewed before the migration's stricter constraints are applied; enrollment verification must never be simulated.

Apply the weekly tutor-management tables to an existing installation with
`npm --prefix backend run db:migrate` (or use `npm --prefix backend run db:setup`
for a fresh development database and its seed data).

The connections, ratings, evaluations, and files retain both role foreign keys and a connection foreign key. The backend must validate that those IDs belong to the same connection before writing data; SQL foreign keys alone cannot enforce that cross-column business rule.

There is intentionally no `messages`, `conversations`, or chat table in EduMatch.

## Current integration boundary

The backend currently exposes:

- Interactive OpenAPI/Swagger UI at `GET /api-docs` and its machine-readable
  specification at `GET /api-docs.json`. The UI is served by the backend and
  documents the current API routes, request/response shapes, and session-cookie
  authentication. Use Microsoft SSO for student/tutor identities and
  `POST /api/login` only for administrator access before trying protected endpoints.
- Public registration catalogs at `GET /api/catalogs` and subject eligibility at
  `GET /api/catalogs/tutor-subjects`.
- `GET /api/session` and `POST /api/logout` for server-side MySQL sessions and an
  `HttpOnly` cookie. Students and tutors authenticate through Microsoft SSO;
  `POST /api/login` remains only for administrators.
- `GET /api/auth/microsoft` and its callback for single-tenant Universidad de
  Sonora student/tutor sign-in through Microsoft Entra ID. Existing accounts
  link by institutional email and retain their approval requirement. New
  students and tutors first verify their institutional identity, then submit
  their respective profile/application forms; both remain pending administrative
  approval.
- `POST /api/auth/microsoft/student-registration` creates a student profile
  from the verified handoff. The 11-digit student number remains pending manual
  verification; EduMatch does not simulate verification against university data.
- Tutor search and detail endpoints, restricted to authenticated students.
- Tutor weekly management at `/api/tutor-management`, implemented as
  `routes/tutor-management.routes.js` → `services/tutor-management.service.js` →
  `repositories/tutor-management.repository.js`. The service validates week
  boundaries, permitted hours, request decisions, and the 15-distinct-students
  cap; `TutorRequestDto` is converted to a `TutorRequest` entity before storage.
- `tutor_availability`, `tutoring_requests`, `tutor_weekly_students`, and
  `tutor_sessions` preserve each week's selectable slots, request decisions,
  distinct accepted students, and independently scheduled session states.
  Accepting a student creates a persisted `pending` tutoring session with no
  assigned slot; scheduling, completion, and cancellation update that session.
  Tutor writes lock the tutor profile in a transaction so capacity checks,
  availability changes, and schedule conflict checks are serialized.
- Students can submit a tutoring request for an approved tutor and an eligible
  subject through `POST /api/tutor-management/requests`; this is a tutoring
  connection workflow, not an internal messaging feature.
- Pending-approval listing and approval decisions, restricted to authenticated
  administrators and recorded in `approval_events`.

Session tokens are random values stored only as SHA-256 hashes in
`auth_sessions`, and expire after seven days. Server middleware checks the live
account status and role on every protected request; the frontend's stored state
is not an authorization boundary. Passwords are stored only as hashes in
`users.password_hash` only for application-managed accounts such as administrators.
Institutional passwords are validated by Microsoft and must never be received by
EduMatch. Credentials must never be stored in frontend JavaScript or committed
to the repository. All database operations must use parameterized
queries. Student-number approval remains a separate manual verification process;
approving an account does not mark its enrollment number as verified.

Microsoft sign-in uses the registered university tenant, validates the tenant,
immutable object ID, nonce, and `@ues.mx` sign-in name, and uses a short-lived,
hashed registration handoff for student profiles and tutor applications. The client secret belongs
only in backend environment configuration. EduMatch never receives or stores
the institutional password. Public student registration is disabled, and the
retired `POST /api/users` endpoint returns HTTP 410; registrations can only be
submitted through a Microsoft-verified handoff.

## Local services

```text
Browser :5173 -> Vite React frontend
Backend :8000  -> Express API
Backend -> db:3306/appdb -> MySQL
```
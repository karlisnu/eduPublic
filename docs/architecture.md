# Edu-Match Architecture

## Current milestone

EDU-EduMatch currently includes a React frontend prototype served by Vite from `frontend/`. The Dev Container provides the reproducible development environment and MySQL service required for the integration phase. The older static pages in `Alumnos/html` and scripts in `js/` are retained as legacy prototype assets.

## Components

| Component | Location | Responsibility |
| --- | --- | --- |
| React frontend | `frontend/src/` | React components, JSX entry point, and CSS styles for student and tutor views |
| Frontend tooling | `frontend/package.json`, `frontend/vite.config.mjs` | React 19 dependencies, Vite development server, and `/api` proxy on port 5173 |
| Legacy frontend pages | `Alumnos/html/` | Older static student and tutor views, forms, dashboards, and navigation |
| Legacy frontend scripts | `js/` | Older login, tutor search, filtering, and UI behavior |
| Database service | `.devcontainer/docker-compose.yml` | MySQL database `appdb` on service host `db` |
| Development environment | `.devcontainer/` | Identical tools and setup for every contributor |

## Domain model

The complete MySQL model is defined in [`backend/sql/schema.sql`](../backend/sql/schema.sql). It separates authentication data from role-specific profiles:

- `users` stores credentials, one of the `admin`, `alumno`, or `tutor` roles, and the approval lifecycle. `student_profiles` and `tutor_profiles` store only fields belonging to that role.
- `careers` and `campuses` are lookup catalogs referenced by student profiles. Only active values loaded from authoritative Universidad de Sonora data may be offered for selection. Student numbers must be 11 digits and stay unverified until an authoritative verification process confirms them.
- Names/usernames are letters only, emails are validated and unique, and student phone numbers contain 11 digits. Tutor bio/experience are capped at 100 characters; subject descriptions at 100 words; ratings and student-evaluation comments at 50 characters.
- Administrators use the existing `users` account with role `admin`; there is no separate password-bearing admin table or public admin registration. Provision the initial admin outside the public application. The backend must authorize administrative profile changes and approval events.
- `subjects` and `tutor_subjects` provide a normalized many-to-many relation so tutor search is scoped to subjects without duplicating subject names.
- `tutor_student_connections` represents a requested, accepted, rejected, or ended relationship. It is the authorization boundary for academic actions; it is not a message or chat entity.
- `tutor_ratings` stores student-to-tutor ratings. `student_evaluations` is separate and stores tutor-to-student academic evaluations, preserving the direction and permissions of each action.
- `academic_files` stores metadata for files sent from a tutor to an accepted student. The binary content belongs in protected object storage, while `storage_key` identifies it in the database.
- `approval_events` keeps the administrator decision history for account approvals and suspensions.

The canonical schema is [`backend/sql/schema.sql`](../backend/sql/schema.sql). New databases use it directly; existing databases apply [`backend/sql/migrations/002_apply_profile_data_rules.sql`](../backend/sql/migrations/002_apply_profile_data_rules.sql). Legacy career/campus values are retained as inactive until verified against official catalogs. Invalid legacy values must be reviewed before the migration's stricter constraints are applied; enrollment verification must never be simulated.

The connections, ratings, evaluations, and files retain both role foreign keys and a connection foreign key. The backend must validate that those IDs belong to the same connection before writing data; SQL foreign keys alone cannot enforce that cross-column business rule.

There is intentionally no `messages`, `conversations`, or chat table in EduMatch.

## Current integration boundary

The backend currently exposes the initial read-only endpoints:

- `GET /api/tutors` returns the available tutors.
- `GET /api/tutors/:id` returns one tutor or `404` when it does not exist.

Authentication, registration, approvals, and persistence are backed by MySQL as the remaining role-specific endpoints are integrated. Passwords are stored only as hashes in `users.password_hash`; credentials must never be stored in frontend JavaScript or committed to the repository. All database operations must use parameterized queries.

## Local services

```text
Browser :5173 -> Vite React frontend
Backend :8000  -> future API service
Backend -> db:3306/appdb -> MySQL
```
# Edu-Match Architecture

## Current milestone

EDU-EduMatch is currently a static frontend prototype served from `Alumnos/html`. The Dev Container provides the reproducible development environment and MySQL service required for the integration phase.

## Components

| Component | Location | Responsibility |
| --- | --- | --- |
| Frontend pages | `Alumnos/html/` | Student and tutor views, forms, dashboards, and navigation |
| Frontend scripts | `js/` | Login, tutor search, filtering, and UI behavior |
| Frontend command | `frontend/package.json` | Serves the prototype on port 5173 |
| Database service | `.devcontainer/docker-compose.yml` | MySQL database `appdb` on service host `db` |
| Development environment | `.devcontainer/` | Identical tools and setup for every contributor |

## Domain model

The primary entity is `Student`, with fields such as name, email, career, campus, student record number, and password hash. A `Student` can create many tutoring requests.

The related entity is `TutoringRequest`, which stores the student foreign key, tutor foreign key, subject, status, requested schedule, and creation date. This establishes a one-to-many relationship from `Student` to `TutoringRequest`.

The `Tutor` entity stores tutor profile information, academic experience, subjects, availability, and rating. A tutor can receive many tutoring requests.

## Planned integration boundary

The backend will expose read-only endpoints first:

- `GET /api/tutors` returns the available tutors.
- `GET /api/tutors/:id` returns one tutor or `404` when it does not exist.

Authentication, registration, and persistence will be added after the read-only contract is validated. Credentials must never be stored in frontend JavaScript or committed to the repository.

## Local services

```text
Browser :5173 -> frontend static server
Backend :8000  -> future API service
Backend -> db:3306/appdb -> MySQL
```
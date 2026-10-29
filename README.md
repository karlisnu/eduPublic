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

1. Clone the repository and open it in VS Code.
2. Open `Alumnos/html/index.html` directly, or use the Dev Container.
3. For a local HTTP server, run:

```bash
cd frontend
npm install
npm run dev
```

The prototype is then available at `http://localhost:5173`.

## Dev Container and MySQL

The Dev Container starts a MySQL 8.4.3 service named `db` with database `appdb` and development credentials:

```bash
mysql -h db -u dev -pdev appdb -e "SELECT 1;"
```

The container runs `bash .devcontainer/setup.sh` after creation and installs the frontend dependencies automatically.

The project architecture and planned API boundary are documented in [`docs/architecture.md`](docs/architecture.md). Pull requests are validated by [`.github/workflows/ci.yml`](.github/workflows/ci.yml).
The complete Week 1 verification procedure is documented in [`docs/week1-verification.md`](docs/week1-verification.md).

## Run CI checks locally without internet

Run the local equivalent of the GitHub Actions checks with:

```bash
bash scripts/ci-local.sh
```

The script installs frontend dependencies in npm offline mode, so the required
packages must already be in the local npm cache. It requires Node.js 22, Bash,
and the MySQL client. A local MySQL server must already be running on
`127.0.0.1:3306` with database `appdb` and user `dev`; the default password is
`dev`. Set `MYSQL_PWD` before running the script if that account uses a
different password. The script does not download tools, start MySQL, or access
the network.

## Project Proposal

The primary entity is `Student`. A student can create many `TutoringRequest` records through a foreign key relationship. The related `Tutor` entity stores subjects, availability, academic experience, and rating. The first milestone covers tutor list/detail views, a validated form, and a read-only endpoint.

## Team

- Burboa Herrera Guadalupe de Jesus
- Encinas Cruz Karla Mariana
- Roman Martinez Julian Rodolfo

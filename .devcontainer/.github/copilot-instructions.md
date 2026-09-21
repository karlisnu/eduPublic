# Project Context: EduMatch

EduMatch is a web platform that connects students and tutors for academic guidance,
tutor discovery by subject, file sharing, and performance evaluation. The project is
in the integration phase, transitioning from a frontend prototype to a full-stack
system.

**Important product constraint:** EduMatch does not include internal messaging or
chat functionality. Do not introduce message inboxes, chat flows, or student-tutor
messaging endpoints. Connections and file sharing must use the explicitly supported
platform flows only.

# Tech Stack and Environment

- Frontend: React 19, React DOM, JSX, Vite, and CSS. The active frontend lives in
  `frontend/src/`; `Alumnos/html/` and `js/` are legacy static prototype assets.
- Backend: Node.js.
- Database: MySQL.
- Development environment: Dev Containers (Docker) and WSL 2.
- Workflow: GitFlow and Scrum methodologies.

# Project Overview and User Roles

EduMatch has three distinct roles. Authentication, authorization, routing, dashboards,
and available actions must remain separate for each role. Use the backend's
pre-configured authentication and security libraries rather than creating parallel
security mechanisms.

## 1. Student Module (`Alumnos`)

- **Tutor discovery:** Students can search for tutors filtered by the subjects they
  teach, view each tutor's basic description, and review tutor ratings before making
  a selection.
- **Connections and file reception:** Support the designed flows for students to
  connect with tutors and receive academic files or resources sent exclusively by
  those tutors. This is not a messaging feature.
- **Ratings:** Display the ratings assigned to tutors.
- **Account validation:** Every new student registration must be validated and
  approved by an administrator before the student receives full platform access.

## 2. Tutor Module (`Tutores`)

- **Student management:** Tutors can view assigned students, review and accept new
  students into their roster, and manage their connections.
- **File transmission:** Tutors can share and send academic files directly to their
  assigned or accepted students. File transmission must not be implemented as a
  chat or messaging channel.
- **Student evaluation:** Provide a dedicated section for tutors to grade and qualify
  their students' academic performance.

## 3. Administrator Module (`Administradores`)

- **Secure access:** Administrators use a protected login entry point backed by the
  backend's standard authentication and security libraries.
- **Elevated privileges and control panel:** Administrators can accept or reject new
  tutor applications and validate or approve newly registered students.
- **Structural and action management:** Administrators can reorganize, manage, and
  coordinate platform structures, permissions, and user actions.

# Code Generation Rules and Business Logic

1. **Role separation and authorization**
   - Treat Student, Tutor, and Administrator as separate roles with least-privilege
     access.
   - Enforce authorization on the backend as well as hiding or guarding frontend
     routes and actions. Never rely on client-side role checks alone.
   - Preserve distinct registration, approval, login, navigation, and dashboard
     flows for each role.
   - A pending student or tutor must not gain the privileges of an approved account.
   - Do not add internal messaging capabilities under any role.

2. **Authentication and security**
   - Reuse the backend's pre-configured authentication and security libraries,
     middleware, and conventions.
   - Protect administrator routes and all role-sensitive APIs with authenticated,
     server-side authorization.
   - Validate authentication state, account approval state, and role before allowing
     access to protected resources.
   - Use secure file-access controls so students can receive files only through
     permitted tutor connections and tutors can send files only to permitted
     students.
   - Use parameterized MySQL queries for all user, profile, connection, rating,
     evaluation, approval, and file metadata operations. Never interpolate
     untrusted input into SQL.

3. **Frontend and file structure**
   - Treat `frontend/src/` as the active React frontend and preserve its Vite entry
     point and component structure.
   - Treat `Alumnos/html/` and `js/` as legacy prototype assets unless the task
     explicitly targets them.
   - Keep the design strictly responsive (FR-10) and follow UI/UX best practices
     (NFR-01) for intuitive navigation.
   - Use the existing `/api` Vite proxy for local development requests to the Node.js
     backend.

4. **Validation and account lifecycle**
   - Implement strict client-side validation in React registration and login forms,
     including required fields and correct data formats (FR-09).
   - Repeat all security-sensitive validation on the backend; client-side validation
     is not a security boundary.
   - Represent student approval and tutor application decisions explicitly, including
     pending, approved, and rejected states as supported by the backend.
   - Surface validation, authentication, authorization, upload, and approval errors
     clearly instead of silently falling back to success.

5. **Domain behavior**
   - Keep tutor search scoped to the subjects tutors teach and expose only the
     intended basic profile information and ratings.
   - Keep student-tutor connections distinct from messaging. Do not add message
     entities, message APIs, chat components, or communication assumptions.
   - Restrict academic file transmission to tutor-to-student flows, with appropriate
     ownership and authorization checks.
   - Keep tutor evaluations of students separate from student-visible tutor ratings;
     preserve the direction and permissions of each action.

6. **Code quality and integration**
   - Write modular, scalable React/JavaScript code (NFR-06) using existing helpers,
     patterns, and types where available.
   - Preserve type safety and existing behavior when extending the application.
   - Name variables and functions descriptively in English, reflecting the business
     rules (for example, `searchTutorBySubject()` and
     `validateStudentRegistration()`).
   - Keep comments, documentation, and code explanations in English.

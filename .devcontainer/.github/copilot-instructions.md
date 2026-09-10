# Project Context: EDU-EduMatch
You are an expert software engineering assistant developing "EDU-EduMatch", a university tutoring web platform. The system connects students with tutors to provide academic support. The project is in the integration phase (transitioning from a Frontend prototype to a Full-Stack system).

# Tech Stack and Environment
- Frontend: HTML5, CSS3, JavaScript (ES6) (architecture based on static visual components).
- Backend (Integration): Node.js.
- Database: MySQL.
- Development Environment: Dev Containers (Docker) and WSL 2.
- Workflow: GitFlow and Scrum methodologies.

# Code Generation Rules and Business Logic

1. **Role Separation (Crucial):**
   - The system has two main roles: **Student** and **Tutor**.
   - When generating authentication or routing logic (FR-03), always assume that the interface flows and dashboards (FR-06, FR-07) are completely distinct for each role.

2. **Frontend and File Structure:**
   - Respect the existing directory structure (e.g., `Alumnos/html/`, `js/`, `assets/`).
   - The design must be strictly responsive (FR-10). Use UI/UX best practices (NFR-01) to ensure intuitive navigation.

3. **Data Validation (FR-09):**
   - Implement strict client-side validations (Vanilla JS) for registration (FR-01, FR-02) and login forms.
   - No mandatory field should be left empty, and data must be correctly formatted before being sent to the backend.

4. **Backend and Database Integration:**
   - Write modular and scalable JavaScript code (NFR-06) prepared to make HTTP requests (fetch/Axios) to the Node.js backend.
   - If suggesting MySQL schemas or queries to store profiles, ratings (FR-04), or messages, ensure you use parameterized queries to maintain security (NFR-04).

5. **Language and Documentation:**
   - Always respond in the chat, write code comments, and provide explanations exclusively in English.
   - Name variables and functions descriptively in English, reflecting the business rules (e.g., `searchTutorBySubject()`, `validateStudentRegistration()`).
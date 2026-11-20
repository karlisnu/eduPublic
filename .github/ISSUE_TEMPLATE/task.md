---
name: Task
about: Work item for implementing or maintaining EduMatch
title: "[Task] "
labels: task
assignees: ""
---

## Goal

<!-- Replace this sentence with the specific implementation goal. -->
Complete the scoped EduMatch implementation or technical maintenance work while
preserving the React frontend, Express backend, MySQL data model, role
separation and approved business rules.

## Scope

- **Related backlog card:** EDU-
- **Task type:** Task
- **Priority:** P1 - High / P2 - Medium / P3 - Low
- **Status:** Backlog
- **Dependencies:** None / list the backlog cards or external prerequisites
- **Responsible:**
- **Target milestone:**

## Description

<!-- Describe the work to be done, its context and its expected result. -->

This task modifies the EduMatch implementation as described in the related
backlog card. The implementation must respect the architecture and
documentation established by the project:

- React 19 and Vite for the frontend in `frontend/src/`.
- Express and MySQL for the backend in `backend/src/` and `backend/sql/`.
- Authenticated session cookies and role-based authorization.
- Microsoft SSO for student and tutor identities.
- Administrator access through the protected application-managed login.
- Parameterized database queries and secure handling of credentials.
- The existing product prohibition on internal messages or chat features.

## Business rules

- Apply authorization and account approval checks on the backend.
- Do not rely only on hidden frontend elements or client-side role checks.
- Validate all user input again on the server.
- Preserve the separation between students, tutors and administrators.
- Do not permit pending or rejected accounts to perform protected actions.
- Do not expose resources to users outside an authorized connection or role.
- Use parameterized MySQL queries for data reads and writes.
- Do not invent academic catalog values or institutional verification data.
- Do not add message entities, conversations, chat components or messaging APIs.
- Preserve existing behavior outside the scope of this task.

## Acceptance criteria

### Functional behavior

- [ ] **Given** an authenticated user with the required role and approval state,
  **When** the task's action is performed, **Then** the operation completes with
  the documented success result.
- [ ] **Given** valid input, **When** the frontend form or API request is used,
  **Then** the system validates, processes and displays or returns the expected
  result.
- [ ] **Given** the EduMatch catalog or profile data, **When** the task updates
  or reads that data, **Then** it preserves all referenced and historical values
  required by the schema.

### Invalid input and authorization

- [ ] **Given** missing or invalid input, **When** the action is submitted,
  **Then** the frontend and backend provide clear validation feedback.
- [ ] **Given** an unauthenticated user, **When** a protected action is attempted,
  **Then** the backend rejects the request with HTTP 401.
- [ ] **Given** an authenticated user with an unauthorized role or account state,
  **When** a protected action is attempted, **Then** the backend rejects the
  request with HTTP 403.
- [ ] **Given** a user outside an authorized tutor-student relationship,
  **When** access to a protected relationship resource is attempted, **Then**
  the resource is denied.

### Architecture and quality

- [ ] **Given** the current EduMatch architecture, **When** this task is
  implemented, **Then** the change uses existing components, services,
  repositories and conventions.
- [ ] **Given** existing functionality outside the task scope, **When** the
  implementation is complete, **Then** that functionality has no regressions.
- [ ] **Given** an implementation or database change, **When** it is reviewed,
  **Then** it includes appropriate tests and updated documentation.

## Implementation plan

1. Review the related backlog card and its business rules.
2. Inspect the frontend, backend, database and tests related to the task.
3. Implement the smallest change that satisfies the acceptance criteria.
4. Add or update focused unit and integration tests.
5. Run the relevant project checks and record the exact command and result.
6. Update directly related documentation if the behavior or API changes.
7. Review the final diff for unrelated changes and sensitive data.

## Affected components

- [ ] React frontend
- [ ] Express backend
- [ ] MySQL schema or migration
- [ ] Microsoft authentication or sessions
- [ ] Role and account authorization
- [ ] Public or protected API documentation
- [ ] Tests
- [ ] Project documentation

## Files to update

<!-- Add the expected repository paths after implementation planning. -->

-

## Evidence

- [ ] Unit or integration tests executed.
- [ ] Acceptance criteria verified individually.
- [ ] Frontend behavior verified when applicable.
- [ ] API requests and responses verified when applicable.
- [ ] Unauthorized roles and account states verified.
- [ ] Resource ownership or tutor-student relationship verified.
- [ ] Screenshots or API evidence added when applicable.
- [ ] Sensitive values and credentials excluded from the evidence.

## Testing

### Commands

- **Frontend build:** `npm --prefix frontend run build`
- **Backend:** `npm --prefix backend test`
- **Backend CI tests:** `npm --prefix backend run test:ci`
- **Database:** `npm --prefix backend run db:migrate`
- **Local CI:** `bash scripts/ci-local.sh`

### Result

- [ ] Passed
- [ ] Failed
- [ ] Not run

<!-- Record each command, the environment, the result and the relevant output. -->

## Risks or limitations

<!-- Document only confirmed constraints or limitations. -->

## Definition of Done

- [ ] All acceptance criteria are met with evidence.
- [ ] The implementation respects the business rules.
- [ ] Relevant tests pass.
- [ ] No critical or blocking defect is known.
- [ ] The code follows the existing architecture and conventions.
- [ ] Related documentation is updated.
- [ ] The final changes are ready for review and integration through GitFlow.

## Related issues or cards

- Related backlog card:
- Blocking dependency:
- Discovered bugs or follow-up work:

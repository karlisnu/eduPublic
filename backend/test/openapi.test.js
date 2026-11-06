const assert = require("node:assert/strict");
const test = require("node:test");
const openapi = require("../src/openapi");

test("OpenAPI document describes every current API endpoint", () => {
  const documentedOperations = new Set();
  for (const [path, pathItem] of Object.entries(openapi.paths)) {
    for (const method of Object.keys(pathItem)) {
      documentedOperations.add(`${method.toUpperCase()} ${path}`);
    }
  }

  assert.deepEqual(
    [...documentedOperations].sort(),
    [
      "GET /",
      "GET /api/admin/approvals/pending",
      "GET /api/admin/tutors",
      "GET /api/auth/microsoft",
      "GET /api/auth/microsoft/callback",
      "GET /api/auth/microsoft/registration",
      "GET /api/catalogs",
      "GET /api/catalogs/tutor-subjects",
      "GET /api/health",
      "GET /api/session",
      "GET /api/tutors",
      "GET /api/tutors/{id}",
      "GET /api/tutor-management/week",
      "GET /api/tutor-management/tutors/{id}/availability",
      "DELETE /api/admin/users/{id}",
      "PATCH /api/admin/users/{id}/approval",
      "PUT /api/admin/tutors/{id}",
      "PATCH /api/tutor-management/requests/{id}",
      "PATCH /api/tutor-management/sessions/{id}/status",
      "POST /api/auth/microsoft/registration",
      "POST /api/auth/microsoft/student-registration",
      "POST /api/login",
      "POST /api/logout",
      "POST /api/users",
      "POST /api/tutor-management/requests",
      "PUT /api/tutor-management/availability",
      "PUT /api/tutor-management/students/{id}/schedule",
    ].sort(),
  );
});

test("OpenAPI secures protected routes with the existing session cookie", () => {
  assert.deepEqual(openapi.components.securitySchemes.sessionCookie, {
    type: "apiKey",
    in: "cookie",
    name: "edumatch_session",
    description: "Cookie HttpOnly creada por Microsoft SSO o `POST /api/login` para administradores.",
  });

  for (const path of [
    "/api/session",
    "/api/tutors",
    "/api/tutors/{id}",
    "/api/tutor-management/week",
    "/api/tutor-management/tutors/{id}/availability",
    "/api/tutor-management/availability",
    "/api/tutor-management/requests/{id}",
    "/api/tutor-management/students/{id}/schedule",
    "/api/tutor-management/sessions/{id}/status",
    "/api/tutor-management/requests",
    "/api/admin/approvals/pending",
    "/api/admin/tutors",
    "/api/admin/tutors/{id}",
    "/api/admin/users/{id}/approval",
    "/api/admin/users/{id}",
  ]) {
    const operation = Object.values(openapi.paths[path])[0];
    assert.deepEqual(operation.security, [{ sessionCookie: [] }], `${path} should require a session`);
  }

  assert.equal(openapi.paths["/api/users"].post.security, undefined);
  assert.equal(openapi.paths["/api/admin/approvals/pending"].get.security[0].sessionCookie.length, 0);
  assert.equal(
    openapi.paths["/api/admin/users/{id}"].delete.description.includes("Solo administradores"),
    true,
  );
  assert.equal(openapi.paths["/api/admin/users/{id}"].delete.responses[409] !== undefined, true);
  assert.equal(openapi.paths["/api/admin/tutors/{id}"].put.description.includes("Solo administradores"), true);
});

test("authentication schemas document student and tutor registration and admin-only password login", () => {
  const schemas = openapi.components.schemas;

  assert.deepEqual(schemas.LoginRequest.required, ["identifier", "password"]);
  assert.equal(schemas.LoginRequest.properties.role, undefined);
  assert.deepEqual(schemas.AdminTutorUpdate.required, [
    "firstName", "lastName", "bio", "experience", "isAvailable",
  ]);
  assert.equal(schemas.AdminTutorUpdate.properties.bio.maxLength, 100);
  assert.equal(schemas.AdminTutorUpdate.properties.isAvailable.type, "boolean");
  assert.equal(schemas.MicrosoftTutorRegistrationRequest.properties.studentNumber.pattern, "^[0-9]{11}$");
  assert.equal(schemas.MicrosoftTutorRegistrationRequest.properties.average.maximum, 100);
  assert.equal(schemas.MicrosoftTutorRegistrationRequest.properties.subjectIds.minItems, 1);
  assert.equal(schemas.MicrosoftTutorRegistrationRequest.properties.experience.maxLength, 100);
  assert.equal(schemas.StudentRegistrationRequest, undefined);
  assert.equal(schemas.MicrosoftStudentRegistrationRequest.properties.phone.pattern, "^[0-9]{11}$");
  assert.equal(schemas.MicrosoftStudentRegistrationRequest.properties.campusId.type, "integer");
});

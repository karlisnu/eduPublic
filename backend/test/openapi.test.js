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
      "GET /api/auth/microsoft",
      "GET /api/auth/microsoft/callback",
      "GET /api/auth/microsoft/registration",
      "GET /api/catalogs",
      "GET /api/health",
      "GET /api/session",
      "GET /api/tutors",
      "GET /api/tutors/{id}",
      "PATCH /api/admin/users/{id}/approval",
      "POST /api/auth/microsoft/registration",
      "POST /api/login",
      "POST /api/logout",
      "POST /api/users",
    ].sort(),
  );
});

test("OpenAPI secures protected routes with the existing session cookie", () => {
  assert.deepEqual(openapi.components.securitySchemes.sessionCookie, {
    type: "apiKey",
    in: "cookie",
    name: "edumatch_session",
    description: "Cookie HttpOnly creada por `POST /api/login`; autentícate desde Swagger UI para que el navegador la guarde.",
  });

  for (const path of [
    "/api/session",
    "/api/tutors",
    "/api/tutors/{id}",
    "/api/admin/approvals/pending",
    "/api/admin/users/{id}/approval",
  ]) {
    const operation = Object.values(openapi.paths[path])[0];
    assert.deepEqual(operation.security, [{ sessionCookie: [] }], `${path} should require a session`);
  }

  assert.equal(openapi.paths["/api/users"].post.security, undefined);
  assert.equal(openapi.paths["/api/admin/approvals/pending"].get.security[0].sessionCookie.length, 0);
});

test("registration schemas document the supported roles and exact student number format", () => {
  const schemas = openapi.components.schemas;

  assert.deepEqual(schemas.StudentRegistrationRequest.properties.role.enum, ["alumno"]);
  assert.deepEqual(schemas.TutorRegistrationRequest.properties.role.enum, ["tutor"]);
  assert.deepEqual(
    schemas.StudentRegistrationRequest.properties.studentNumber.pattern,
    "^[0-9]{11}$",
  );
  assert.equal(schemas.TutorRegistrationRequest.properties.experience.maxLength, 100);
});

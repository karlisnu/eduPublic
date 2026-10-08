const assert = require("node:assert/strict");
const test = require("node:test");
const {
  clearSessionCookie,
  createRequireAuthentication,
  hashSessionToken,
  readSessionToken,
  requireRoles,
  sessionCookie,
} = require("../src/auth");

function mockResponse() {
  return {
    statusCode: 200,
    body: null,
    status(statusCode) {
      this.statusCode = statusCode;
      return this;
    },
    json(body) {
      this.body = body;
      return this;
    },
  };
}

test("session tokens are stored as stable SHA-256 hashes", () => {
  const token = "a".repeat(64);
  const hash = hashSessionToken(token);

  assert.equal(hash, hashSessionToken(token));
  assert.match(hash, /^[a-f\d]{64}$/);
  assert.notEqual(hash, token);
});

test("session cookie is HttpOnly, same-site, and cleared with matching scope", () => {
  const token = "b".repeat(64);

  assert.match(sessionCookie(token, true), /HttpOnly/);
  assert.match(sessionCookie(token, true), /SameSite=Strict/);
  assert.match(sessionCookie(token, true), /Secure/);
  assert.match(clearSessionCookie(true), /Path=\/api; SameSite=Strict; Max-Age=0; Secure/);
});

test("session token parser ignores unrelated and malformed cookies", () => {
  const token = "c".repeat(64);

  assert.equal(readSessionToken({ headers: { cookie: `other=value; edumatch_session=${token}` } }), token);
  assert.equal(readSessionToken({ headers: { cookie: "edumatch_session=not-a-token" } }), null);
  assert.equal(readSessionToken({ headers: {} }), null);
});

test("authentication middleware loads the current approved user from MySQL", async () => {
  const token = "d".repeat(64);
  const pool = {
    query: async (_query, parameters) => {
      assert.deepEqual(parameters, [hashSessionToken(token)]);
      return [[{ id: 7, username: "Estudiante", role: "alumno" }]];
    },
  };
  const request = { headers: { cookie: `edumatch_session=${token}` } };
  const response = mockResponse();
  let nextCalled = false;

  await createRequireAuthentication(pool)(request, response, () => { nextCalled = true; });

  assert.equal(nextCalled, true);
  assert.deepEqual(request.auth, { id: 7, username: "Estudiante", role: "alumno" });
});

test("authentication middleware rejects missing and invalid sessions", async () => {
  let queryCalled = false;
  const middleware = createRequireAuthentication({
    query: async () => {
      queryCalled = true;
      return [[]];
    },
  });
  const missingResponse = mockResponse();
  await middleware({ headers: {} }, missingResponse, () => assert.fail("must reject missing cookie"));
  assert.equal(missingResponse.statusCode, 401);
  assert.equal(queryCalled, false);

  const invalidResponse = mockResponse();
  await middleware(
    { headers: { cookie: `edumatch_session=${"e".repeat(64)}` } },
    invalidResponse,
    () => assert.fail("must reject missing database session"),
  );
  assert.equal(invalidResponse.statusCode, 401);
});

test("role middleware allows only explicitly permitted roles", () => {
  const authorizeAdmin = requireRoles("admin");
  const forbiddenResponse = mockResponse();
  authorizeAdmin({ auth: { role: "alumno" } }, forbiddenResponse, () => assert.fail("must reject student"));
  assert.equal(forbiddenResponse.statusCode, 403);

  let nextCalled = false;
  authorizeAdmin({ auth: { role: "admin" } }, mockResponse(), () => { nextCalled = true; });
  assert.equal(nextCalled, true);
});

const assert = require("node:assert/strict");
const crypto = require("node:crypto");
const test = require("node:test");
const {
  clearSessionCookie,
  createRequireAuthentication,
  hashSessionToken,
  readSessionToken,
  requireRoles,
  sessionCookie,
} = require("../src/auth");
const {
  authTransactionCookie,
  createAuthorizationUrl,
  createMicrosoftTokenError,
  hashesMatch,
  parseAuthTransaction,
  verifyMicrosoftIdToken,
} = require("../src/microsoft-auth");

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

test("Microsoft auth transaction cookie keeps state, nonce, and PKCE verifier HttpOnly", () => {
  const state = "a".repeat(64);
  const nonce = "b".repeat(64);
  const codeVerifier = "c".repeat(64);
  const cookie = authTransactionCookie(state, nonce, codeVerifier, true);
  const request = { headers: { cookie: cookie.split(";")[0] } };

  assert.match(cookie, /HttpOnly/);
  assert.match(cookie, /SameSite=Lax/);
  assert.match(cookie, /Secure/);
  assert.deepEqual(parseAuthTransaction(request), { state, nonce, codeVerifier, role: "alumno" });
  const tutorCookie = authTransactionCookie(state, nonce, codeVerifier, true, "tutor");
  assert.deepEqual(
    parseAuthTransaction({ headers: { cookie: tutorCookie.split(";")[0] } }),
    { state, nonce, codeVerifier, role: "tutor" },
  );
  assert.equal(hashesMatch(state, state), true);
  assert.equal(hashesMatch(state, nonce), false);
});

test("Microsoft authorization URL uses the configured tenant, callback, and PKCE challenge", async () => {
  const names = [
    "MICROSOFT_TENANT_ID",
    "MICROSOFT_CLIENT_ID",
    "MICROSOFT_CLIENT_SECRET",
    "MICROSOFT_REDIRECT_URI",
  ];
  const previousValues = Object.fromEntries(names.map((name) => [name, process.env[name]]));
  const verifier = "v".repeat(64);
  try {
    process.env.MICROSOFT_TENANT_ID = "tenant-id";
    process.env.MICROSOFT_CLIENT_ID = "client-id";
    process.env.MICROSOFT_CLIENT_SECRET = "client-secret";
    process.env.MICROSOFT_REDIRECT_URI = "http://localhost:8000/api/auth/microsoft/callback";
    const authorizationUrl = new URL(await createAuthorizationUrl("state", "nonce", verifier));

    assert.equal(authorizationUrl.origin, "https://login.microsoftonline.com");
    assert.equal(authorizationUrl.pathname, "/tenant-id/oauth2/v2.0/authorize");
    assert.equal(authorizationUrl.searchParams.get("client_id"), "client-id");
    assert.equal(
      authorizationUrl.searchParams.get("redirect_uri"),
      "http://localhost:8000/api/auth/microsoft/callback",
    );
    assert.equal(authorizationUrl.searchParams.get("state"), "state");
    assert.equal(authorizationUrl.searchParams.get("nonce"), "nonce");
    assert.equal(authorizationUrl.searchParams.get("code_challenge_method"), "S256");
  } finally {
    for (const name of names) {
      if (previousValues[name] === undefined) delete process.env[name];
      else process.env[name] = previousValues[name];
    }
  }
});

test("Microsoft token failures expose only safe error codes for diagnosis", () => {
  const error = createMicrosoftTokenError({
    error: "invalid_client",
    error_description: "AADSTS7000215: Invalid client secret provided.",
    correlation_id: "65260db4-95bf-4cf0-98a9-8ee6ef437df9",
    access_token: "must-not-be-logged",
  });

  assert.equal(error.microsoftCode, "invalid_client");
  assert.equal(error.aadstsCode, "AADSTS7000215");
  assert.equal(error.correlationId, "65260db4-95bf-4cf0-98a9-8ee6ef437df9");
  assert.equal(JSON.stringify(error).includes("must-not-be-logged"), false);

  const invalid = createMicrosoftTokenError({
    error: "invalid client secret",
    correlation_id: "not-a-guid",
  });
  assert.equal(invalid.microsoftCode, "unknown");
  assert.equal(invalid.aadstsCode, null);
  assert.equal(invalid.correlationId, null);
});

test("Microsoft ID token validation checks signature and institutional claims", () => {
  const { privateKey, publicKey } = crypto.generateKeyPairSync("rsa", { modulusLength: 2048 });
  const signingKey = { ...publicKey.export({ format: "jwk" }), kid: "test-key", use: "sig", alg: "RS256" };
  const configuration = {
    tenantId: "971da51b-09de-4aa2-98e6-29df738b23af",
    clientId: "edumatch-client-id",
  };
  const nonce = "nonce-value";
  const now = Math.floor(Date.now() / 1000);
  const header = Buffer.from(JSON.stringify({ alg: "RS256", kid: "test-key", typ: "JWT" })).toString("base64url");
  const tokenForClaims = (claimOverrides = {}) => {
    const claims = Buffer.from(JSON.stringify({
      iss: `https://login.microsoftonline.com/${configuration.tenantId}/v2.0`,
      aud: configuration.clientId,
      tid: configuration.tenantId,
      ver: "2.0",
      nonce,
      oid: "5a16fbc3-275d-4bbc-9dc0-8e2a62c1ab42",
      preferred_username: "student@ues.mx",
      exp: now + 300,
      nbf: now - 30,
      ...claimOverrides,
    })).toString("base64url");
    const content = `${header}.${claims}`;
    const signature = crypto.sign("RSA-SHA256", Buffer.from(content), privateKey).toString("base64url");
    return `${content}.${signature}`;
  };
  const token = tokenForClaims();

  assert.deepEqual(
    verifyMicrosoftIdToken(token, nonce, configuration, [signingKey]),
    { email: "student@ues.mx", objectId: "5a16fbc3-275d-4bbc-9dc0-8e2a62c1ab42" },
  );
  assert.throws(
    () => verifyMicrosoftIdToken(token, "wrong-nonce", configuration, [signingKey]),
    /requisitos de acceso/,
  );
  assert.throws(
    () => verifyMicrosoftIdToken(
      tokenForClaims({ aud: "different-client-id" }),
      nonce,
      configuration,
      [signingKey],
    ),
    /requisitos de acceso/,
  );
  assert.throws(
    () => verifyMicrosoftIdToken(
      tokenForClaims({ exp: now - 1 }),
      nonce,
      configuration,
      [signingKey],
    ),
    /requisitos de acceso/,
  );
  assert.throws(
    () => {
      const invalidParts = token.split(".");
      invalidParts[2] = `${invalidParts[2][0] === "A" ? "B" : "A"}${invalidParts[2].slice(1)}`;
      verifyMicrosoftIdToken(invalidParts.join("."), nonce, configuration, [signingKey]);
    },
    /signature is invalid/,
  );
});

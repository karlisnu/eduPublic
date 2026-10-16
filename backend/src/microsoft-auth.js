const crypto = require("crypto");

const MICROSOFT_SCOPES = ["openid", "profile", "email"];
const ALLOWED_EMAIL_DOMAIN = "ues.mx";
const AUTH_TRANSACTION_COOKIE = "edumatch_microsoft_auth";
const REGISTRATION_COOKIE = "edumatch_student_registration";
const AUTH_TRANSACTION_MAX_AGE_SECONDS = 10 * 60;
const REGISTRATION_MAX_AGE_SECONDS = 15 * 60;
const randomToken = () => crypto.randomBytes(32).toString("hex");
const AUTHORITY_URL = "https://login.microsoftonline.com";
let signingKeysCache = { tenantId: null, expiresAt: 0, keys: [] };

function getMicrosoftConfiguration() {
  const { MICROSOFT_TENANT_ID, MICROSOFT_CLIENT_ID, MICROSOFT_CLIENT_SECRET, MICROSOFT_REDIRECT_URI } =
    process.env;

  if (!MICROSOFT_TENANT_ID || !MICROSOFT_CLIENT_ID || !MICROSOFT_CLIENT_SECRET || !MICROSOFT_REDIRECT_URI) {
    return null;
  }

  return {
    tenantId: MICROSOFT_TENANT_ID,
    clientId: MICROSOFT_CLIENT_ID,
    clientSecret: MICROSOFT_CLIENT_SECRET,
    redirectUri: MICROSOFT_REDIRECT_URI,
  };
}

function getAuthorizationEndpoint(configuration) {
  return `${AUTHORITY_URL}/${encodeURIComponent(configuration.tenantId)}/oauth2/v2.0/authorize`;
}

async function createAuthorizationUrl(state, nonce, codeVerifier) {
  const configuration = getMicrosoftConfiguration();
  if (!configuration) {
    const error = new Error("El inicio con Microsoft no está configurado");
    error.status = 503;
    error.publicMessage = "El inicio con cuenta institucional no está disponible.";
    throw error;
  }

  const authorizationUrl = new URL(getAuthorizationEndpoint(configuration));
  authorizationUrl.search = new URLSearchParams({
    client_id: configuration.clientId,
    response_type: "code",
    redirect_uri: configuration.redirectUri,
    response_mode: "query",
    scope: MICROSOFT_SCOPES.join(" "),
    state,
    nonce,
    code_challenge: crypto.createHash("sha256").update(codeVerifier).digest("base64url"),
    code_challenge_method: "S256",
    prompt: "select_account",
  }).toString();
  return authorizationUrl.toString();
}

function parseJwtPart(value) {
  if (!/^[a-z\d_-]+$/i.test(value)) throw new Error("Invalid Microsoft ID token");
  return JSON.parse(Buffer.from(value, "base64url").toString("utf8"));
}

async function getMicrosoftSigningKeys(tenantId, forceRefresh = false) {
  if (!forceRefresh && signingKeysCache.tenantId === tenantId &&
      signingKeysCache.expiresAt > Date.now()) {
    return signingKeysCache.keys;
  }

  const response = await fetch(
    `${AUTHORITY_URL}/${encodeURIComponent(tenantId)}/discovery/v2.0/keys`,
    { signal: AbortSignal.timeout(10000) },
  );
  if (!response.ok) throw new Error("Microsoft signing keys could not be retrieved");
  const data = await response.json();
  if (!Array.isArray(data.keys)) throw new Error("Microsoft signing keys response is invalid");
  signingKeysCache = { tenantId, keys: data.keys, expiresAt: Date.now() + 5 * 60 * 1000 };
  return signingKeysCache.keys;
}

function verifyMicrosoftIdToken(token, nonce, configuration, signingKeys) {
  const parts = typeof token === "string" ? token.split(".") : [];
  if (parts.length !== 3) throw new Error("Invalid Microsoft ID token");

  const header = parseJwtPart(parts[0]);
  const claims = parseJwtPart(parts[1]);
  const signature = Buffer.from(parts[2], "base64url");
  if (header.alg !== "RS256" || typeof header.kid !== "string" ||
      !Array.isArray(signingKeys)) {
    throw new Error("Unsupported Microsoft ID token signature");
  }

  const signingKey = signingKeys.find((key) =>
    key.kid === header.kid && key.kty === "RSA" &&
    (!key.use || key.use === "sig") && (!key.alg || key.alg === "RS256"));
  if (!signingKey) throw new Error("Microsoft signing key was not found");

  const signedContent = Buffer.from(`${parts[0]}.${parts[1]}`);
  const publicKey = crypto.createPublicKey({ key: signingKey, format: "jwk" });
  if (!crypto.verify("RSA-SHA256", signedContent, publicKey, signature)) {
    throw new Error("Microsoft ID token signature is invalid");
  }

  const now = Math.floor(Date.now() / 1000);
  const expectedIssuer = `${AUTHORITY_URL}/${configuration.tenantId}/v2.0`;
  const email = typeof claims.preferred_username === "string"
    ? claims.preferred_username.toLowerCase()
    : "";
  const isExpectedAudience = claims.aud === configuration.clientId;
  if (claims.iss !== expectedIssuer || !isExpectedAudience ||
      claims.tid !== configuration.tenantId || claims.ver !== "2.0" ||
      claims.nonce !== nonce || !Number.isInteger(claims.exp) || claims.exp <= now ||
      (Number.isInteger(claims.nbf) && claims.nbf > now) ||
      typeof claims.oid !== "string" || !/^[a-f\d-]{36}$/i.test(claims.oid) ||
      !email.endsWith(`@${ALLOWED_EMAIL_DOMAIN}`)) {
    throw new Error("La identidad institucional no cumple los requisitos de acceso");
  }

  return { email, objectId: claims.oid };
}

function createMicrosoftTokenError(tokenData) {
  const error = new Error("Microsoft authorization code exchange failed");
  error.microsoftCode = typeof tokenData.error === "string" &&
    /^[a-z][a-z\d_]{0,63}$/i.test(tokenData.error)
    ? tokenData.error
    : "unknown";
  error.aadstsCode = typeof tokenData.error_description === "string"
    ? tokenData.error_description.match(/\bAADSTS\d+\b/)?.[0] || null
    : null;
  error.correlationId = typeof tokenData.correlation_id === "string" &&
    /^[a-f\d-]{36}$/i.test(tokenData.correlation_id)
    ? tokenData.correlation_id
    : null;
  return error;
}

async function acquireMicrosoftIdentity(code, nonce, codeVerifier) {
  const configuration = getMicrosoftConfiguration();
  if (!configuration) {
    const error = new Error("El inicio con Microsoft no está configurado");
    error.status = 503;
    error.publicMessage = "El inicio con cuenta institucional no está disponible.";
    throw error;
  }

  const tokenEndpoint = `${AUTHORITY_URL}/${encodeURIComponent(configuration.tenantId)}/oauth2/v2.0/token`;
  const tokenResponse = await fetch(tokenEndpoint, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: configuration.clientId,
      client_secret: configuration.clientSecret,
      grant_type: "authorization_code",
      code,
      redirect_uri: configuration.redirectUri,
      scope: MICROSOFT_SCOPES.join(" "),
      code_verifier: codeVerifier,
    }),
    signal: AbortSignal.timeout(10000),
  });
  let tokenData;
  try {
    tokenData = await tokenResponse.json();
  } catch {
    throw new Error("Microsoft token endpoint returned an invalid response");
  }
  if (!tokenResponse.ok || typeof tokenData.id_token !== "string") {
    throw createMicrosoftTokenError(tokenData);
  }
  const signingKeys = await getMicrosoftSigningKeys(configuration.tenantId);
  try {
    return verifyMicrosoftIdToken(tokenData.id_token, nonce, configuration, signingKeys);
  } catch (error) {
    if (error.message !== "Microsoft signing key was not found") throw error;
    const refreshedKeys = await getMicrosoftSigningKeys(configuration.tenantId, true);
    return verifyMicrosoftIdToken(tokenData.id_token, nonce, configuration, refreshedKeys);
  }
}

function authTransactionCookie(
  state,
  nonce,
  codeVerifier,
  secure = process.env.NODE_ENV === "production",
  role = "alumno",
) {
  return `${AUTH_TRANSACTION_COOKIE}=${state}.${nonce}.${codeVerifier}.${role}; HttpOnly; Path=/api/auth/microsoft; SameSite=Lax; Max-Age=${AUTH_TRANSACTION_MAX_AGE_SECONDS}${secure ? "; Secure" : ""}`;
}

function clearAuthTransactionCookie(secure = process.env.NODE_ENV === "production") {
  return `${AUTH_TRANSACTION_COOKIE}=; HttpOnly; Path=/api/auth/microsoft; SameSite=Lax; Max-Age=0${secure ? "; Secure" : ""}`;
}

function registrationCookie(token, secure = process.env.NODE_ENV === "production") {
  return `${REGISTRATION_COOKIE}=${token}; HttpOnly; Path=/api/auth/microsoft; SameSite=Lax; Max-Age=${REGISTRATION_MAX_AGE_SECONDS}${secure ? "; Secure" : ""}`;
}

function clearRegistrationCookie(secure = process.env.NODE_ENV === "production") {
  return `${REGISTRATION_COOKIE}=; HttpOnly; Path=/api/auth/microsoft; SameSite=Lax; Max-Age=0${secure ? "; Secure" : ""}`;
}

function readCookie(request, name) {
  const cookieHeader = request.headers.cookie || "";
  const cookie = cookieHeader
    .split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${name}=`));
  return cookie?.slice(name.length + 1) || null;
}

function parseAuthTransaction(request) {
  const value = readCookie(request, AUTH_TRANSACTION_COOKIE);
  const match = value?.match(/^([a-f\d]{64})\.([a-f\d]{64})\.([a-f\d]{64})(?:\.(alumno|tutor))?$/i);
  return match
    ? {
      state: match[1],
      nonce: match[2],
      codeVerifier: match[3],
      role: (match[4] || "alumno").toLowerCase(),
    }
    : null;
}

function readRegistrationToken(request) {
  const token = readCookie(request, REGISTRATION_COOKIE);
  return token && /^[a-f\d]{64}$/i.test(token) ? token : null;
}

function hashesMatch(left, right) {
  const first = Buffer.from(left || "");
  const second = Buffer.from(right || "");
  return first.length === second.length && crypto.timingSafeEqual(first, second);
}

module.exports = {
  AUTH_TRANSACTION_MAX_AGE_SECONDS,
  REGISTRATION_MAX_AGE_SECONDS,
  acquireMicrosoftIdentity,
  authTransactionCookie,
  AUTHORITY_URL,
  clearAuthTransactionCookie,
  clearRegistrationCookie,
  createAuthorizationUrl,
  createMicrosoftTokenError,
  getMicrosoftConfiguration,
  hashesMatch,
  parseAuthTransaction,
  randomToken,
  readRegistrationToken,
  registrationCookie,
  verifyMicrosoftIdToken,
};

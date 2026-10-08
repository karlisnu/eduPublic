const crypto = require("crypto");

const SESSION_COOKIE_NAME = "edumatch_session";
const SESSION_MAX_AGE_SECONDS = 7 * 24 * 60 * 60;

function hashSessionToken(token) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

function readSessionToken(request) {
  const cookieHeader = request.headers.cookie || "";
  const cookie = cookieHeader
    .split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${SESSION_COOKIE_NAME}=`));
  const token = cookie?.slice(SESSION_COOKIE_NAME.length + 1);

  return token && /^[a-f\d]{64}$/i.test(token) ? token : null;
}

function sessionCookie(token, secure = process.env.NODE_ENV === "production") {
  return `${SESSION_COOKIE_NAME}=${token}; HttpOnly; Path=/api; SameSite=Strict; Max-Age=${SESSION_MAX_AGE_SECONDS}${secure ? "; Secure" : ""}`;
}

function clearSessionCookie(secure = process.env.NODE_ENV === "production") {
  return `${SESSION_COOKIE_NAME}=; HttpOnly; Path=/api; SameSite=Strict; Max-Age=0${secure ? "; Secure" : ""}`;
}

function createRequireAuthentication(pool) {
  return async function requireAuthentication(request, response, next) {
    const token = readSessionToken(request);
    if (!token) {
      return response.status(401).json({ error: "Inicia sesión para continuar" });
    }

    try {
      const [rows] = await pool.query(
        `SELECT u.id, u.username, u.role
         FROM auth_sessions s
         INNER JOIN users u ON u.id = s.user_id
         LEFT JOIN tutor_profiles tp ON tp.user_id = u.id
         WHERE s.token_hash = ?
           AND s.expires_at > NOW()
           AND u.account_status = 'approved'
           AND (u.role <> 'tutor' OR tp.application_status = 'approved')
         LIMIT 1`,
        [hashSessionToken(token)],
      );

      if (rows.length === 0) {
        return response.status(401).json({ error: "La sesión expiró o la cuenta no está habilitada" });
      }

      request.auth = {
        id: rows[0].id,
        username: rows[0].username,
        role: rows[0].role,
      };
      return next();
    } catch (error) {
      return next(error);
    }
  };
}

function requireRoles(...roles) {
  return function authorizeRole(request, response, next) {
    if (!request.auth) {
      return response.status(401).json({ error: "Inicia sesión para continuar" });
    }
    if (!roles.includes(request.auth.role)) {
      return response.status(403).json({ error: "No tienes permisos para realizar esta acción" });
    }
    return next();
  };
}

module.exports = {
  SESSION_MAX_AGE_SECONDS,
  clearSessionCookie,
  createRequireAuthentication,
  hashSessionToken,
  readSessionToken,
  requireRoles,
  sessionCookie,
};

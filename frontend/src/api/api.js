export const API_URL = import.meta.env.VITE_API_URL || "";

export const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  NO_CONTENT: 204,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  UNPROCESSABLE_CONTENT: 422,
  TOO_MANY_REQUESTS: 429,
  INTERNAL_SERVER_ERROR: 500,
  BAD_GATEWAY: 502,
  SERVICE_UNAVAILABLE: 503,
  GATEWAY_TIMEOUT: 504,
};

const statusMessages = {
  [HTTP_STATUS.BAD_REQUEST]: "La solicitud contiene datos inválidos.",
  [HTTP_STATUS.UNAUTHORIZED]: "La sesión no está autorizada o expiró. Inicia sesión nuevamente.",
  [HTTP_STATUS.FORBIDDEN]: "No tienes permisos para realizar esta acción.",
  [HTTP_STATUS.NOT_FOUND]: "No se encontró el recurso solicitado.",
  [HTTP_STATUS.CONFLICT]: "La solicitud entra en conflicto con los datos existentes.",
  [HTTP_STATUS.UNPROCESSABLE_CONTENT]: "No se pudieron validar los datos enviados.",
  [HTTP_STATUS.TOO_MANY_REQUESTS]: "Se realizaron demasiadas solicitudes. Inténtalo más tarde.",
  [HTTP_STATUS.INTERNAL_SERVER_ERROR]: "Ocurrió un error interno en el servidor.",
  [HTTP_STATUS.BAD_GATEWAY]: "El servidor recibió una respuesta inválida.",
  [HTTP_STATUS.SERVICE_UNAVAILABLE]: "El servicio no está disponible. Inténtalo más tarde.",
  [HTTP_STATUS.GATEWAY_TIMEOUT]: "El servidor tardó demasiado en responder.",
};

export class ApiError extends Error {
  constructor(status, message, data = {}) {
    super(`${message} (HTTP ${status})`);
    this.name = "ApiError";
    this.status = status;
    this.data = data;
  }
}

async function readApiResponse(response) {
  if (response.status === HTTP_STATUS.NO_CONTENT) return null;

  const body = await response.text();
  if (!body) return {};

  try {
    return JSON.parse(body);
  } catch {
    throw new ApiError(
      response.status,
      "La API devolvió una respuesta no válida. Verifica que el backend esté ejecutándose.",
    );
  }
}

export async function requestApi(
  url,
  fetchOptions = {},
  { expectedStatus, allowedStatuses = [] } = {},
) {
  let response;
  try {
    response = await fetch(url, fetchOptions);
  } catch (error) {
    if (error instanceof TypeError) {
      throw new ApiError(
        0,
        "No se pudo conectar con el servidor. Verifica tu conexión e inténtalo nuevamente.",
      );
    }
    throw error;
  }

  const data = await readApiResponse(response);

  if (!response.ok && !allowedStatuses.includes(response.status)) {
    throw new ApiError(
      response.status,
      data?.error || statusMessages[response.status] || "No se pudo completar la solicitud.",
      data,
    );
  }

  if (expectedStatus !== undefined && response.status !== expectedStatus) {
    throw new ApiError(
      response.status,
      `Se esperaba HTTP ${expectedStatus}, pero se recibió HTTP ${response.status}.`,
      data,
    );
  }

  return { data, status: response.status };
}

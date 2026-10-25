export const API_URL = import.meta.env.VITE_API_URL || "";

const defaultErrorMessages = {
  401: "La sesión no está autorizada o expiró. Inicia sesión nuevamente.",
  404: "No se encontró el recurso solicitado.",
  500: "Ocurrió un error interno en el servidor. Inténtalo más tarde.",
};

export class ApiError extends Error {
  constructor(status, message) {
    super(`${message} (HTTP ${status})`);
    this.name = "ApiError";
    this.status = status;
  }
}

export async function requestApi(url, options) {
  const response = await fetch(url, options);
  const body = await response.text();
  let data = {};

  if (body) {
    try {
      data = JSON.parse(body);
    } catch {
      throw new ApiError(
        response.status,
        "La API devolvió una respuesta no válida. Verifica que el backend esté ejecutándose.",
      );
    }
  }

  if (!response.ok) {
    const message = data?.error || defaultErrorMessages[response.status] ||
      `La solicitud no pudo completarse (HTTP ${response.status}).`;
    throw new ApiError(response.status, message);
  }

  return { data, status: response.status };
}

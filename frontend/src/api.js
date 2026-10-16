export const API_URL = import.meta.env.VITE_API_URL || "";

export async function readApiResponse(response) {
  const body = await response.text();
  if (!body) return {};

  try {
    return JSON.parse(body);
  } catch {
    throw new Error(
      `La API devolvió una respuesta no válida (HTTP ${response.status}). Verifica que el backend esté ejecutándose.`,
    );
  }
}

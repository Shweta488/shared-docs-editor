// Types shared by the client and the server. Keep this file free of runtime imports.

export interface ApiErrorBody {
  error: { code: string; message: string };
}

export interface HealthResponse {
  ok: true;
}

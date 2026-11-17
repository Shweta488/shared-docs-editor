// Types shared by the client and the server. Keep this file free of runtime imports.

export interface ApiErrorBody {
  error: { code: string; message: string };
}

export interface HealthResponse {
  ok: true;
}

export interface User {
  id: string;
  email: string;
  name: string;
}

export interface LoginRequest {
  email: string;
}

export interface LoginResponse {
  token: string;
  user: User;
}

export interface MeResponse {
  user: User;
}

export interface UsersResponse {
  users: User[];
}

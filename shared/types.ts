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

export type Role = 'owner' | 'editor' | 'viewer';
export type ShareRole = Exclude<Role, 'owner'>;

export interface DocSummary {
  id: string;
  title: string;
  updatedAt: string;
}

export interface OwnedDocSummary extends DocSummary {
  shareCount: number;
}

export interface SharedDocSummary extends DocSummary {
  ownerName: string;
  role: ShareRole;
}

export interface DocumentsListResponse {
  owned: OwnedDocSummary[];
  shared: SharedDocSummary[];
}

export interface DocumentDetail {
  id: string;
  title: string;
  content: string;
  ownerId: string;
  ownerName: string;
  role: Role;
  createdAt: string;
  updatedAt: string;
}

export interface DocumentResponse {
  document: DocumentDetail;
}

export interface CreateDocumentRequest {
  title?: string;
}

export interface UpdateDocumentRequest {
  title?: string;
  content?: string;
}

export type UpdateDocumentResponse = DocSummary;

export interface ShareEntry {
  user: User;
  role: ShareRole;
}

export interface SharesResponse {
  owner: User;
  shares: ShareEntry[];
}

export interface PutShareRequest {
  userId: string;
  role: ShareRole;
}

export interface PutShareResponse {
  share: ShareEntry;
}

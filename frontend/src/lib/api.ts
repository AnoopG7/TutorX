/**
 * API Client — Wrapper for backend /api/* endpoints
 * Proper error handling, auth injection, request/response logging
 */

export interface SessionMessage {
  role: 'user' | 'assistant';
  content: string;
  id?: string;
}

export interface SessionHistoryResponse {
  session_id: string;
  messages: SessionMessage[];
}

export interface Session {
  id: string;
  title: string;
  subject: string | null;
  chapter: string | null;
  ended_at: string | null;
  started_at: string;
  updated_at: string;
  created_at: string;
}

export interface SessionsListResponse {
  sessions: Session[];
}

export interface ChatRequest {
  user_id: string;
  message: string;
  subject?: string;
  chapter?: string;
  session_id?: string;
}

export interface ChatResponse {
  response: string;
  citations?: string[];
  session_id: string;
  tools_used?: string[];
}

export interface ProfileResponse {
  user_id: string;
  name: string;
  grade: number;
  subjects: string[];
  teaching_style: 'definition_first' | 'analogy_first' | 'example_first' | 'socratic';
  custom_instructions?: string;
  weak_areas: Array<{ topic: string; score?: number; last_attempted?: string }>;
  mastered_topics: string[];
  total_sessions: number;
}

export interface SignupRequest {
  email: string;
  password: string;
  name: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface AuthResponse {
  token: string;
  user_id: string;
  name: string;
}

export interface SignupResponse {
  status: 'confirm_email' | 'logged_in';
  message: string;
  user_id: string | null;
  token: string | null;
  name: string | null;
}

export class APIError extends Error {
  status: number;
  statusText: string;
  detail?: string;

  constructor(status: number, statusText: string, detail?: string) {
    super(detail || statusText);
    this.name = 'APIError';
    this.status = status;
    this.statusText = statusText;
    this.detail = detail;
  }
}

class APIClient {
  // In prod, set VITE_API_URL to your backend origin (e.g. https://tutorx-backend.onrender.com)
  // In dev without it, uses '/api' which Vite proxies to localhost:8000
  private baseURL = (() => {
    const url = import.meta.env.VITE_API_URL;
    if (url) {
      // Strip trailing slash, append /api
      return url.replace(/\/+$/, '') + '/api';
    }
    return '/api';
  })();

  private getAuthToken(): string | null {
    return localStorage.getItem('auth-token');
  }

  private setAuthToken(token: string): void {
    localStorage.setItem('auth-token', token);
  }

  private clearAuthToken(): void {
    localStorage.removeItem('auth-token');
  }

  private async handleResponse<T>(response: Response): Promise<T> {
    let data: Record<string, unknown>;
    try {
      data = await response.json() as Record<string, unknown>;
    } catch {
      data = { detail: response.statusText };
    }

    console.log('📊 [Frontend] Response details:', {
      status: response.status,
      statusText: response.statusText,
      ok: response.ok,
      headers: {
        contentType: response.headers.get('content-type'),
        corsHeaders: response.headers.get('access-control-allow-origin')
      },
      body: data
    });

    if (!response.ok) {
      const detail = data?.detail || data?.message || response.statusText;
      console.error('❌ [Frontend] API Error:', {
        status: response.status,
        detail: detail
      });
      throw new APIError(response.status, response.statusText, String(detail));
    }

    return data as T;
  }

  private getHeaders(): HeadersInit {
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };

    const token = this.getAuthToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    return headers;
  }

  async signup(req: SignupRequest): Promise<SignupResponse> {
    const response = await fetch(`${this.baseURL}/auth/signup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(req),
    });

    const result = await this.handleResponse<SignupResponse>(response);

    // Only set token if auto-confirmed (no email verification needed)
    if (result.status === 'logged_in' && result.token) {
      this.setAuthToken(result.token);
    }

    return result;
  }

  async login(req: LoginRequest): Promise<AuthResponse> {
    const response = await fetch(`${this.baseURL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(req),
    });

    const result = await this.handleResponse<AuthResponse>(response);
    this.setAuthToken(result.token);
    return result;
  }

  logout(): void {
    this.clearAuthToken();
  }

  async chat(req: ChatRequest): Promise<ChatResponse> {
    const response = await fetch(`${this.baseURL}/chat`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(req),
    });

    return this.handleResponse<ChatResponse>(response);
  }

  async getProfile(userId: string): Promise<ProfileResponse> {
    const response = await fetch(`${this.baseURL}/profile/${userId}`, {
      method: 'GET',
      headers: this.getHeaders(),
    });

    return this.handleResponse<ProfileResponse>(response);
  }

  async updateProfile(userId: string, data: Partial<ProfileResponse>): Promise<ProfileResponse> {
    const response = await fetch(`${this.baseURL}/profile/${userId}`, {
      method: 'PUT',
      headers: this.getHeaders(),
      body: JSON.stringify(data),
    });

    return this.handleResponse<ProfileResponse>(response);
  }

  async getSessions(userId: string, limit: number = 20): Promise<SessionsListResponse> {
    const response = await fetch(`${this.baseURL}/chat/sessions/${userId}?limit=${limit}`, {
      method: 'GET',
      headers: this.getHeaders(),
    });

    return this.handleResponse<SessionsListResponse>(response);
  }

  async getSessionHistory(userId: string, sessionId: string): Promise<SessionHistoryResponse> {
    const response = await fetch(`${this.baseURL}/chat/sessions/${userId}/${sessionId}/history`, {
      method: 'GET',
      headers: this.getHeaders(),
    });

    return this.handleResponse<SessionHistoryResponse>(response);
  }

  async closeSession(sessionId: string): Promise<{ status: string }> {
    const response = await fetch(`${this.baseURL}/chat/sessions/${sessionId}/close`, {
      method: 'POST',
      headers: this.getHeaders(),
    });

    return this.handleResponse<{ status: string }>(response);
  }
}

export const apiClient = new APIClient();

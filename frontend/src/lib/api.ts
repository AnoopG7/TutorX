/**
 * API client for the FastAPI backend.
 *
 * Auth: Supabase access tokens expire after about an hour. Every request
 * sends the current access token; on a 401 the client refreshes once with
 * the stored refresh token and retries. If that fails, the session is
 * cleared and `onSessionExpired` fires so the app can send the student to
 * the sign-in page.
 */

export interface SourceRef {
  subject?: string | null;
  chapter: string;
  section?: string | null;
  pages: string[];
  similarity?: number | null;
  label: string;
}

export interface SessionMessage {
  role: 'user' | 'assistant';
  content: string;
  id?: string;
  timestamp?: string;
  sources?: SourceRef[];
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
  updated_at?: string | null;
  created_at: string;
}

export interface SessionsListResponse {
  sessions: Session[];
}

export interface ChatRequest {
  message: string;
  subject?: string;
  chapter?: string;
  session_id?: string;
}

export interface ChatResponse {
  response: string;
  citations?: string[];
  sources?: SourceRef[];
  session_id: string;
  tools_used?: string[];
  grounded?: boolean;
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

export interface AuthResponse {
  token: string;
  refresh_token?: string | null;
  expires_at?: number | null;
  user_id: string;
  name: string;
}

export interface SignupResponse {
  status: 'confirm_email' | 'logged_in';
  message: string;
  user_id: string | null;
  token: string | null;
  refresh_token?: string | null;
  expires_at?: number | null;
  name: string | null;
}

export class APIError extends Error {
  status: number;
  detail?: string;

  constructor(status: number, detail?: string) {
    super(detail || `Request failed (${status})`);
    this.name = 'APIError';
    this.status = status;
    this.detail = detail;
  }
}

const TOKEN_KEY = 'auth-token';
const REFRESH_KEY = 'auth-refresh';
const USER_KEY = 'auth-user';

function readStorage(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function writeStorage(key: string, value: string | null) {
  try {
    if (value === null) localStorage.removeItem(key);
    else localStorage.setItem(key, value);
  } catch {
    /* storage unavailable (private mode) */
  }
}

class APIClient {
  // In prod VITE_API_URL is the backend origin; in dev '/api' is proxied by Vite.
  private baseURL = (() => {
    const url = import.meta.env.VITE_API_URL;
    return url ? url.replace(/\/+$/, '') + '/api' : '/api';
  })();

  private refreshing: Promise<boolean> | null = null;
  onSessionExpired: (() => void) | null = null;

  // ── Session storage ────────────────────────────────────────────────────
  saveSession(auth: AuthResponse) {
    writeStorage(TOKEN_KEY, auth.token);
    if (auth.refresh_token) writeStorage(REFRESH_KEY, auth.refresh_token);
    writeStorage(USER_KEY, JSON.stringify({ user_id: auth.user_id, name: auth.name }));
  }

  clearSession() {
    writeStorage(TOKEN_KEY, null);
    writeStorage(REFRESH_KEY, null);
    writeStorage(USER_KEY, null);
  }

  storedUser(): { user_id: string; name: string } | null {
    if (!readStorage(TOKEN_KEY)) return null;
    try {
      const u = JSON.parse(readStorage(USER_KEY) || 'null');
      return u?.user_id ? { user_id: u.user_id, name: u.name || 'Student' } : null;
    } catch {
      return null;
    }
  }

  // ── Transport ──────────────────────────────────────────────────────────
  private async parse<T>(response: Response): Promise<T> {
    let data: Record<string, unknown> = {};
    try {
      data = (await response.json()) as Record<string, unknown>;
    } catch {
      /* empty or non-JSON body */
    }
    if (!response.ok) {
      const detail = data.detail;
      const message = typeof detail === 'string' ? detail : response.statusText;
      throw new APIError(response.status, message);
    }
    return data as T;
  }

  private async refreshSession(): Promise<boolean> {
    const refreshToken = readStorage(REFRESH_KEY);
    if (!refreshToken) return false;
    // Share one refresh between concurrent 401s.
    this.refreshing ??= (async () => {
      try {
        const res = await fetch(`${this.baseURL}/auth/refresh`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ refresh_token: refreshToken }),
        });
        if (!res.ok) return false;
        this.saveSession((await res.json()) as AuthResponse);
        return true;
      } catch {
        return false;
      } finally {
        setTimeout(() => (this.refreshing = null), 0);
      }
    })();
    return this.refreshing;
  }

  private async request<T>(path: string, init: RequestInit = {}, retry = true): Promise<T> {
    const token = readStorage(TOKEN_KEY);
    const response = await fetch(`${this.baseURL}${path}`, {
      ...init,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...init.headers,
      },
    });

    if (response.status === 401 && token && retry) {
      if (await this.refreshSession()) return this.request<T>(path, init, false);
      this.clearSession();
      this.onSessionExpired?.();
    }
    return this.parse<T>(response);
  }

  private post<T>(path: string, body?: unknown) {
    return this.request<T>(path, { method: 'POST', body: body === undefined ? undefined : JSON.stringify(body) });
  }

  // ── Auth ───────────────────────────────────────────────────────────────
  async signup(req: { email: string; password: string; name: string }): Promise<SignupResponse> {
    const result = await this.parse<SignupResponse>(
      await fetch(`${this.baseURL}/auth/signup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(req),
      }),
    );
    if (result.status === 'logged_in' && result.token && result.user_id) {
      this.saveSession({
        token: result.token,
        refresh_token: result.refresh_token,
        user_id: result.user_id,
        name: result.name || req.name,
      });
    }
    return result;
  }

  async login(req: { email: string; password: string }): Promise<AuthResponse> {
    const result = await this.parse<AuthResponse>(
      await fetch(`${this.baseURL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(req),
      }),
    );
    this.saveSession(result);
    return result;
  }

  async forgotPassword(email: string): Promise<{ message: string }> {
    return this.parse(
      await fetch(`${this.baseURL}/auth/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      }),
    );
  }

  async resetPassword(accessToken: string, password: string): Promise<{ message: string }> {
    return this.parse(
      await fetch(`${this.baseURL}/auth/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ access_token: accessToken, password }),
      }),
    );
  }

  logout() {
    this.clearSession();
  }

  // ── Data ───────────────────────────────────────────────────────────────
  chat(req: ChatRequest) {
    return this.post<ChatResponse>('/chat', req);
  }

  getProfile(userId: string) {
    return this.request<ProfileResponse>(`/profile/${userId}`);
  }

  updateProfile(userId: string, data: Partial<ProfileResponse>) {
    return this.request<ProfileResponse>(`/profile/${userId}`, { method: 'PUT', body: JSON.stringify(data) });
  }

  getSessions(userId: string, limit = 20) {
    return this.request<SessionsListResponse>(`/chat/sessions/${userId}?limit=${limit}`);
  }

  getSessionHistory(userId: string, sessionId: string) {
    return this.request<SessionHistoryResponse>(`/chat/sessions/${userId}/${sessionId}/history`);
  }

  closeSession(sessionId: string) {
    return this.post<{ status: string }>(`/chat/sessions/${sessionId}/close`);
  }
}

export const apiClient = new APIClient();

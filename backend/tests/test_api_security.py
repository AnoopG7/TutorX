"""
Offline tests for auth, ownership and API contracts.
Supabase is replaced with a fake, so nothing touches a real database.

    cd backend && .venv/bin/python -m pytest -q
"""
from types import SimpleNamespace

import pytest
from fastapi.testclient import TestClient

import app.api.auth as auth_dep
import app.api.routes.auth as auth_routes
import app.api.routes.chat as chat_routes
import app.api.routes.profile as profile_routes
from app.config import Settings
from app.main import app
from app.rag.retriever import RetrievedChunk, chunks_to_sources
from app.utils.subjects import normalize_subject, normalize_subjects

ALICE, BOB = "11111111-1111-1111-1111-111111111111", "22222222-2222-2222-2222-222222222222"
TOKENS = {"alice-token": ALICE, "bob-token": BOB}


class FakeQuery:
    def __init__(self, rows):
        self.rows = rows

    def select(self, *a, **k): return self
    def limit(self, *a, **k): return self
    def order(self, *a, **k): return self
    def update(self, *a, **k): return self
    def insert(self, *a, **k): return self

    def eq(self, col, val):
        return FakeQuery([r for r in self.rows if str(r.get(col)) == str(val)])

    def execute(self):
        return SimpleNamespace(data=self.rows, count=len(self.rows))


class FakeAuth:
    def get_user(self, token):
        if token not in TOKENS:
            raise Exception("invalid JWT")
        return SimpleNamespace(user=SimpleNamespace(id=TOKENS[token], email="x@example.com", user_metadata={}))


class FakeSupabase:
    def __init__(self):
        self.auth = FakeAuth()
        self.tables = {
            "sessions": [{"id": "s-alice", "user_id": ALICE, "subject": "Science", "messages": []}],
            "student_profiles": [{"user_id": ALICE, "name": "Alice", "grade": 9, "subjects": ["Math", "Social Studies"]}],
        }

    def table(self, name):
        return FakeQuery(self.tables.get(name, []))


@pytest.fixture
def client(monkeypatch):
    fake = FakeSupabase()
    for mod in (auth_dep, chat_routes, profile_routes):
        monkeypatch.setattr(mod, "get_supabase_client", lambda: fake)
    return TestClient(app)  # no `with`: skips the lifespan's real Supabase init


def bearer(token):
    return {"Authorization": f"Bearer {token}"}


# ── Authentication ──────────────────────────────────────────────────────────
@pytest.mark.parametrize("method,path", [
    ("get", f"/api/profile/{ALICE}"),
    ("get", f"/api/chat/sessions/{ALICE}"),
    ("get", f"/api/chat/sessions/{ALICE}/s-alice/history"),
    ("post", "/api/chat/sessions/s-alice/close"),
])
def test_user_routes_require_a_token(client, method, path):
    assert getattr(client, method)(path).status_code == 401


def test_invalid_token_is_401(client):
    assert client.get(f"/api/profile/{ALICE}", headers=bearer("garbage")).status_code == 401


def test_chat_ignores_body_user_id_without_token(client):
    res = client.post("/api/chat", json={"user_id": ALICE, "message": "hi"})
    assert res.status_code == 401


def test_query_param_user_id_is_ignored_by_default(client):
    assert client.get(f"/api/chat/sessions/{ALICE}?user_id={ALICE}").status_code == 401


# ── Ownership ───────────────────────────────────────────────────────────────
def test_cannot_read_someone_elses_profile(client):
    assert client.get(f"/api/profile/{ALICE}", headers=bearer("bob-token")).status_code == 403


def test_cannot_list_someone_elses_sessions(client):
    assert client.get(f"/api/chat/sessions/{ALICE}", headers=bearer("bob-token")).status_code == 403


def test_cannot_read_someone_elses_session_history(client):
    res = client.get(f"/api/chat/sessions/{BOB}/s-alice/history", headers=bearer("bob-token"))
    assert res.status_code == 404


def test_cannot_continue_someone_elses_session(client):
    res = client.post("/api/chat", json={"message": "hi", "session_id": "s-alice"}, headers=bearer("bob-token"))
    assert res.status_code == 404


def test_owner_gets_profile_with_normalised_subjects(client):
    res = client.get(f"/api/profile/{ALICE}", headers=bearer("alice-token"))
    assert res.status_code == 200
    assert res.json()["subjects"] == ["Mathematics", "Social Science"]


def test_profile_grade_limited_to_ingested_classes(client):
    res = client.put(f"/api/profile/{ALICE}", json={"grade": 12}, headers=bearer("alice-token"))
    assert res.status_code == 422


# ── Auth routes ─────────────────────────────────────────────────────────────
def test_refresh_with_bad_token_is_401(client, monkeypatch):
    class BadRefresh:
        auth = SimpleNamespace(refresh_session=lambda t: (_ for _ in ()).throw(Exception("Invalid Refresh Token")))
    monkeypatch.setattr(auth_routes, "new_auth_client", lambda: BadRefresh())
    assert client.post("/api/auth/refresh", json={"refresh_token": "nope"}).status_code == 401


def test_forgot_password_does_not_reveal_accounts(client, monkeypatch):
    sent = []

    class Auth:
        auth = SimpleNamespace(reset_password_for_email=lambda email, opts: sent.append((email, opts)))
    monkeypatch.setattr(auth_routes, "new_auth_client", lambda: Auth())
    res = client.post("/api/auth/forgot-password", json={"email": "who@example.com"})
    assert res.status_code == 200 and "If that email has an account" in res.json()["message"]
    assert sent[0][1]["redirect_to"].endswith("/reset-password")


# ── Helpers ─────────────────────────────────────────────────────────────────
def test_cors_origins_strip_trailing_slash():
    s = Settings(cors_origins="https://anoop-tutorx.vercel.app/, http://localhost:5173")
    assert s.get_cors_origins() == ["https://anoop-tutorx.vercel.app", "http://localhost:5173"]


@pytest.mark.parametrize("raw,expected", [
    ("Social Studies", "Social Science"), ("Math", "Mathematics"), ("maths", "Mathematics"),
    ("Science", "Science"), ("", None), (None, None),
])
def test_normalize_subject(raw, expected):
    assert normalize_subject(raw) == expected


def test_normalize_subjects_dedupes():
    assert normalize_subjects(["Math", "Mathematics", "Social Studies"]) == ["Mathematics", "Social Science"]


def test_chunks_to_sources_groups_pages():
    def chunk(i, section, page, sim):
        return RetrievedChunk(i, "Chapter 4: Quadratic Equations", section, "Mathematics", 9, "...", page, sim)

    sources = chunks_to_sources([
        chunk(1, "4.3 Factorisation", "Page 77", 0.81),
        chunk(2, "4.3 Factorisation", "Page 76", 0.88),
        chunk(3, "4.4 Completing the square", None, 0.7),
    ])
    assert len(sources) == 2
    assert sources[0]["pages"] == ["76", "77"] and sources[0]["similarity"] == 0.88
    assert sources[1]["pages"] == [] and sources[1]["section"] == "4.4 Completing the square"


def test_auth_client_uses_implicit_flow(monkeypatch):
    """Reset links must carry #access_token (implicit), which ResetPasswordPage reads."""
    import app.services.supabase_service as svc
    captured = {}
    monkeypatch.setattr(svc, "create_client", lambda url, key, options=None: captured.setdefault("options", options))
    svc.new_auth_client()
    assert captured["options"].flow_type == "implicit"
    assert captured["options"].persist_session is False


# ── Sign-up ─────────────────────────────────────────────────────────────────
def _signup_client(monkeypatch, create_user):
    """Sign-up goes through the admin API (no confirmation email), then signs in."""
    from app.api.routes.auth import AuthApiError

    admin = SimpleNamespace(
        auth=SimpleNamespace(admin=SimpleNamespace(create_user=create_user)),
        table=lambda name: FakeQuery([]),
    )
    session = SimpleNamespace(access_token="at", refresh_token="rt", expires_at=1)
    signin = SimpleNamespace(auth=SimpleNamespace(sign_in_with_password=lambda creds: SimpleNamespace(session=session)))
    monkeypatch.setattr(auth_routes, "get_supabase_client", lambda: admin)
    monkeypatch.setattr(auth_routes, "new_auth_client", lambda: signin)
    return TestClient(app), AuthApiError


BODY = {"email": "new@example.com", "password": "long-enough-1", "name": "New"}


def test_signup_creates_confirmed_user_and_signs_in(monkeypatch):
    calls = []

    def create_user(attrs):
        calls.append(attrs)
        return SimpleNamespace(user=SimpleNamespace(id="u1"))

    client, _ = _signup_client(monkeypatch, create_user)
    res = client.post("/api/auth/signup", json=BODY)
    assert res.status_code == 200 and res.json()["status"] == "logged_in" and res.json()["refresh_token"] == "rt"
    assert calls[0]["email_confirm"] is True  # no confirmation email, so no email rate limit


@pytest.mark.parametrize("message,status,expected", [
    ("A user with this email address has already been registered", 422, 409),
    ("Email rate limit exceeded", 429, 429),
    ("Password should be at least 8 characters", 422, 400),
    ("Unable to validate email address: invalid format", 400, 400),
])
def test_signup_errors_are_specific(monkeypatch, message, status, expected):
    holder = {}

    def create_user(attrs):
        raise holder["err"](message, status, None)

    client, AuthApiError = _signup_client(monkeypatch, create_user)
    holder["err"] = AuthApiError
    res = client.post("/api/auth/signup", json=BODY)
    assert res.status_code == expected
    assert "Check your details" not in res.json()["detail"]

"""
Regression tests for the privileged ``/admin`` surface.

Security context
----------------
Before the fix these four endpoints were reachable **without any
credentials**, so anybody could read every user's PII and broadcast
notifications to the whole install:

    GET  /api/v1/admin/dashboard
    GET  /api/v1/admin/users
    GET  /api/v1/admin/users/{user_id}
    POST /api/v1/admin/broadcast

They now depend on ``get_current_admin`` (``app/core/deps.py``), which
requires a Bearer token that

1. is a valid, unexpired *access* token, and
2. carries a ``role`` claim (only admin login mints one), and
3. resolves to a row in the ``admins`` table.

A normal user token therefore gets **403**, never **200**.
"""

import pytest
import pytest_asyncio

from app.core.security import create_access_token, create_refresh_token

# Endpoints that used to be completely open.
PROTECTED_ADMIN_ENDPOINTS = [
    ("GET", "/api/v1/admin/dashboard", None),
    ("GET", "/api/v1/admin/users", None),
    ("GET", "/api/v1/admin/users/some-user-id", None),
    ("POST", "/api/v1/admin/broadcast", {"title": "t", "message": "m"}),
]


@pytest_asyncio.fixture
async def admin_headers(client):
    """Log in as the bootstrap admin and return its auth headers."""
    resp = await client.post(
        "/api/v1/admin/login",
        json={"email": "admin@selftrack.com", "password": "admin123"},
    )
    assert resp.status_code == 200, resp.text
    token = resp.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}


@pytest.mark.asyncio
async def test_admin_login_is_public_and_mints_role_claim(client):
    """Admin login stays public, but the token it returns carries ``role``."""
    resp = await client.post(
        "/api/v1/admin/login",
        json={"email": "admin@selftrack.com", "password": "admin123"},
    )
    assert resp.status_code == 200, resp.text
    body = resp.json()
    assert body["token_type"] == "bearer"
    assert body["access_token"]

    from app.core.security import decode_token

    payload = decode_token(body["access_token"])
    assert payload is not None
    assert payload.get("role"), "admin tokens must carry a role claim"
    assert payload.get("type") == "access"


@pytest.mark.asyncio
async def test_admin_endpoints_reject_missing_token(client):
    """The core regression: no credentials -> 401, never 200."""
    for method, url, body in PROTECTED_ADMIN_ENDPOINTS:
        resp = await client.request(method, url, json=body)
        assert resp.status_code == 401, (
            f"{method} {url} returned {resp.status_code} without a token "
            f"(expected 401)"
        )


@pytest.mark.asyncio
async def test_admin_endpoints_reject_garbage_token(client):
    """A malformed / unsigned token must be rejected as 401."""
    for method, url, body in PROTECTED_ADMIN_ENDPOINTS:
        resp = await client.request(
            method, url, json=body, headers={"Authorization": "Bearer not-a-real-token"}
        )
        assert resp.status_code == 401, f"{method} {url} accepted a bogus token"


@pytest.mark.asyncio
async def test_admin_endpoints_reject_user_token(client, registered_user):
    """A normal user token must NOT unlock the admin surface (403)."""
    _user, user_headers = registered_user
    for method, url, body in PROTECTED_ADMIN_ENDPOINTS:
        resp = await client.request(method, url, json=body, headers=user_headers)
        assert resp.status_code == 403, (
            f"{method} {url} returned {resp.status_code} for a regular user "
            f"token (expected 403)"
        )


@pytest.mark.asyncio
async def test_admin_endpoints_reject_refresh_token(client, registered_user):
    """A refresh token cannot be replayed as an access token."""
    _user, _headers = registered_user
    from app.core.security import decode_token

    user_id = decode_token(_headers["Authorization"].split(" ", 1)[1])["sub"]
    refresh = create_refresh_token(user_id)
    refresh_headers = {"Authorization": f"Bearer {refresh}"}

    for method, url, body in PROTECTED_ADMIN_ENDPOINTS:
        resp = await client.request(method, url, json=body, headers=refresh_headers)
        assert resp.status_code == 401, (
            f"{method} {url} accepted a refresh token (expected 401)"
        )


@pytest.mark.asyncio
async def test_admin_endpoints_accept_admin_token(client, admin_headers):
    """With a genuine admin token the endpoints work again (200)."""
    resp = await client.get("/api/v1/admin/dashboard", headers=admin_headers)
    assert resp.status_code == 200, resp.text
    body = resp.json()
    for field in (
        "total_users",
        "total_habits",
        "total_health_metrics",
        "active_users",
        "downloads_by_platform",
        "habit_analytics",
        "health_analytics",
        "recent_users",
    ):
        assert field in body, f"dashboard payload missing '{field}'"

    resp = await client.get("/api/v1/admin/users", headers=admin_headers)
    assert resp.status_code == 200, resp.text
    assert isinstance(resp.json(), list)


@pytest.mark.asyncio
async def test_admin_can_read_and_broadcast_to_users(
    client, admin_headers, registered_user
):
    """Full happy-path for the two most sensitive admin endpoints."""
    user, _headers = registered_user

    # /users/{id} exposes the full profile of a regular user.
    resp = await client.get(f"/api/v1/admin/users/{user['id']}", headers=admin_headers)
    assert resp.status_code == 200, resp.text
    assert resp.json()["email"] == user["email"]

    # /broadcast fans a notification out to every user.
    resp = await client.post(
        "/api/v1/admin/broadcast",
        json={
            "title": "Scheduled Maintenance",
            "message": "We will be down for 10 minutes at 02:00 IST.",
            "category": "announcement",
            "target": "all",
        },
        headers=admin_headers,
    )
    assert resp.status_code == 200, resp.text


@pytest.mark.asyncio
async def test_track_download_stays_public(client):
    """``/admin/track-download`` is intentionally open (install telemetry)."""
    resp = await client.post(
        "/api/v1/admin/track-download",
        json={
            "device_id": "test-device-123",
            "platform": "android",
            "app_version": "1.0.0",
        },
    )
    assert resp.status_code == 200, resp.text
    assert resp.json()["status"] in ("success", "already_tracked")


@pytest.mark.asyncio
async def test_admin_token_for_deleted_admin_is_rejected(client):
    """A token whose admin row disappeared must stop working."""
    from app.core.security import decode_token

    resp = await client.post(
        "/api/v1/admin/login",
        json={"email": "admin@selftrack.com", "password": "admin123"},
    )
    token = resp.json()["access_token"]
    payload = decode_token(token)

    # Forge a token for an admin id that does not exist in the admins table.
    ghost = create_access_token("00000000-0000-0000-0000-000000000000",
                                extra_claims={"role": "superadmin"})
    ghost_headers = {"Authorization": f"Bearer {ghost}"}

    resp = await client.get("/api/v1/admin/dashboard", headers=ghost_headers)
    assert resp.status_code == 403, resp.text
    assert "Admin account not found" in resp.json()["detail"]

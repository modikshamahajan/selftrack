"""
Shared pytest fixtures for the SelfTrack backend test-suite.

Design goals
------------
1. **Isolation** - the suite must never read or write the developer/production
   SQLite database. A dedicated ``selftrack_test.db`` file is used and the
   ``DATABASE_URL`` environment variable is injected *before* the application
   package is imported (pydantic-settings gives env vars priority over .env).
2. **Determinism** - the test database is recreated from scratch on every run
   so ordering between test modules can never influence results.
3. **Offline** - the SMS gateway is pinned to the ``console`` provider so no
   test ever performs a real network call to Twilio / Fast2SMS / MSG91.
"""

import os
import pathlib
import uuid

BACKEND_DIR = pathlib.Path(__file__).resolve().parent.parent
TEST_DB_PATH = BACKEND_DIR / "selftrack_test.db"

# ---------------------------------------------------------------------------
# Environment must be configured BEFORE `app.core.config` is imported.
# ---------------------------------------------------------------------------
os.environ["DATABASE_URL"] = f"sqlite+aiosqlite:///{TEST_DB_PATH}"
os.environ["SMS_PROVIDER"] = "console"
os.environ["SHOW_DEV_OTP_IN_RESPONSE"] = "true"

import pytest  # noqa: E402
import pytest_asyncio  # noqa: E402
from httpx import ASGITransport, AsyncClient  # noqa: E402

from app.core.database import init_db  # noqa: E402
from main import app  # noqa: E402


def _purge_test_database() -> None:
    """Remove any leftover test database (and its WAL side-files)."""
    for suffix in ("", "-wal", "-shm"):
        path = pathlib.Path(f"{TEST_DB_PATH}{suffix}")
        if path.exists():
            path.unlink()


@pytest_asyncio.fixture(scope="session", autouse=True)
async def _prepare_test_database():
    """Create a pristine schema once for the whole test session."""
    _purge_test_database()
    await init_db()
    yield


@pytest_asyncio.fixture
async def client():
    """Bare, unauthenticated HTTP client bound to the ASGI app."""
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://testserver") as ac:
        yield ac


def unique_email(prefix: str = "user") -> str:
    """Collision-proof e-mail address for a throwaway account."""
    return f"{prefix}.{uuid.uuid4().hex[:12]}@selftrack.app"


def unique_phone() -> str:
    """Collision-proof 10-digit Indian mobile number."""
    return str(uuid.uuid4().int % 10_000_000_000).zfill(10)


@pytest_asyncio.fixture
async def registered_user(client):
    """Create a brand new user. Returns ``(user_payload, auth_headers)``."""
    resp = await client.post(
        "/api/v1/auth/register",
        json={
            "name": "Test User",
            "email": unique_email(),
            "password": "sup3rs3cret!",
            "interests": ["Health"],
            "goals": ["Stay consistent"],
        },
    )
    assert resp.status_code == 200, resp.text
    data = resp.json()
    return data["user"], {"Authorization": f"Bearer {data['access_token']}"}


@pytest_asyncio.fixture
async def auth_client(client, registered_user):
    """HTTP client that already carries the Bearer token of ``registered_user``."""
    _user, headers = registered_user
    client.headers.update(headers)
    yield client


@pytest_asyncio.fixture
async def other_user(client):
    """A second, independent account used for ownership-isolation checks."""
    resp = await client.post(
        "/api/v1/auth/register",
        json={
            "name": "Other User",
            "email": unique_email("other"),
            "password": "an0therpass!",
        },
    )
    assert resp.status_code == 200, resp.text
    data = resp.json()
    return data["user"], {"Authorization": f"Bearer {data['access_token']}"}

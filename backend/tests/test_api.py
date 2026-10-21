import pytest
import pytest_asyncio
from httpx import AsyncClient, ASGITransport
from app.core.database import init_db
from main import app


@pytest_asyncio.fixture(scope="module", autouse=True)
async def setup_db():
    await init_db()


@pytest.mark.asyncio
async def test_root_health():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        resp = await ac.get("/")
        assert resp.status_code == 200
        data = resp.json()
        assert data["status"] == "online"
        assert "ai_engine" in data


@pytest.mark.asyncio
async def test_auth_and_full_workflow():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        # 1. Register User
        import uuid
        unique_email = f"alex.{uuid.uuid4().hex[:8]}@selftrack.app"
        reg_payload = {
            "name": "Alex Hero",
            "email": unique_email,
            "password": "securepassword123",
            "interests": ["Health", "Mindfulness"],
            "goals": ["Build healthy habits", "Improve sleep"]
        }
        reg_resp = await ac.post("/api/v1/auth/register", json=reg_payload)
        assert reg_resp.status_code == 200, reg_resp.text
        reg_data = reg_resp.json()
        assert "access_token" in reg_data
        token = reg_data["access_token"]
        headers = {"Authorization": f"Bearer {token}"}

        # 2. Verify Profile
        me_resp = await ac.get("/api/v1/auth/me", headers=headers)
        assert me_resp.status_code == 200
        assert me_resp.json()["name"] == "Alex Hero"
        assert me_resp.json()["total_xp"] >= 100

        # 3. Create Habit
        habit_payload = {
            "name": "Morning Meditation",
            "icon": "sun",
            "color": "#2ECC71",
            "category": "Mindfulness",
            "streak_target": 7
        }
        create_habit_resp = await ac.post("/api/v1/habits", json=habit_payload, headers=headers)
        assert create_habit_resp.status_code == 201
        habit_id = create_habit_resp.json()["id"]

        # 4. Toggle Habit
        toggle_resp = await ac.post(f"/api/v1/habits/{habit_id}/toggle", json={}, headers=headers)
        assert toggle_resp.status_code == 200
        assert toggle_resp.json()["completed"] is True
        assert toggle_resp.json()["current_streak"] == 1

        # 5. Sync Health Metrics (Steps & Water)
        health_sync = {
            "steps": 7500,
            "water_glasses": 6,
            "sleep_hours": 8.0,
            "sleep_quality": 88
        }
        sync_resp = await ac.post("/api/v1/health/sync", json=health_sync, headers=headers)
        assert sync_resp.status_code == 200
        assert sync_resp.json()["steps"] == 7500

        # 6. Add Food Log
        food_payload = {
            "name": "Oatmeal with Berries",
            "qty": 1,
            "calories": 250,
            "serving": "1 bowl",
            "category": "Healthy"
        }
        food_resp = await ac.post("/api/v1/health/food", json=food_payload, headers=headers)
        assert food_resp.status_code == 200
        assert food_resp.json()["name"] == "Oatmeal with Berries"

        # 7. Create Journal Entry
        journal_payload = {
            "title": "Morning Reflection",
            "content": "Feeling energized and clear-headed after morning meditation!",
            "mood": "great",
            "mood_score": 5
        }
        journal_resp = await ac.post("/api/v1/journals", json=journal_payload, headers=headers)
        assert journal_resp.status_code == 201
        assert journal_resp.json()["mood"] == "great"

        # 8. Chat with AI Coach
        chat_payload = {
            "message": "How am I doing with my habits today?"
        }
        chat_resp = await ac.post("/api/v1/ai/chat", json=chat_payload, headers=headers)
        assert chat_resp.status_code == 200
        chat_data = chat_resp.json()
        assert "reply" in chat_data
        assert len(chat_data["reply"]) > 10

        # 9. Rewards Summary, Badges & Leaderboard
        rewards_resp = await ac.get("/api/v1/rewards/summary", headers=headers)
        assert rewards_resp.status_code == 200
        assert rewards_resp.json()["total_xp"] > 100

        badges_resp = await ac.get("/api/v1/rewards/badges", headers=headers)
        assert badges_resp.status_code == 200
        assert isinstance(badges_resp.json(), list)

        leaderboard_resp = await ac.get("/api/v1/rewards/leaderboard", headers=headers)
        assert leaderboard_resp.status_code == 200
        lb_data = leaderboard_resp.json()
        assert len(lb_data) >= 1
        assert any("Alex" in item["name"] for item in lb_data)

        # 10. Social Feed & Post
        post_payload = {"content": "Hit 7,500 steps already today! #SelfTrack"}
        post_resp = await ac.post("/api/v1/social/posts", json=post_payload, headers=headers)
        assert post_resp.status_code == 201

        feed_resp = await ac.get("/api/v1/social/feed", headers=headers)
        assert feed_resp.status_code == 200
        assert len(feed_resp.json()) >= 1

        # 11. Google Play / GDPR Data Portability Export
        export_resp = await ac.get("/api/v1/users/me/export", headers=headers)
        assert export_resp.status_code == 200
        export_data = export_resp.json()
        assert "profile" in export_data
        assert "habits" in export_data
        assert len(export_data["habits"]) >= 1
        assert "health_metrics" in export_data
        assert "journal_entries" in export_data

        # 12. Update Profile Test (Name & Avatar)
        prof_resp = await ac.put("/api/v1/users/profile", json={
            "name": "Alex Champion",
            "avatar_url": "https://example.com/avatar.jpg"
        }, headers=headers)
        assert prof_resp.status_code == 200
        prof_data = prof_resp.json()
        assert prof_data["name"] == "Alex Champion"
        assert prof_data["avatar_url"] == "https://example.com/avatar.jpg"

        # 13. Update User Settings Test (including privacy flags)
        settings_resp = await ac.put("/api/v1/users/settings", json={
            "privacy_private_journal": True,
            "privacy_hide_leaderboard": True,
            "dark_mode": True
        }, headers=headers)
        assert settings_resp.status_code == 200
        settings_data = settings_resp.json()
        assert settings_data["privacy_private_journal"] is True
        assert settings_data["privacy_hide_leaderboard"] is True
        assert settings_data["dark_mode"] is True

        # 14. Notifications Test (fetch dynamic, create, mark read, mark all read)
        notifs_resp = await ac.get("/api/v1/notifications", headers=headers)
        assert notifs_resp.status_code == 200
        notifs = notifs_resp.json()
        assert len(notifs) == 0  # Clean dynamic state: 0 notifications initially

        create_notif_resp = await ac.post("/api/v1/notifications", json={
            "title": "Habit Milestone",
            "message": "Great job today!",
            "category": "habits",
            "icon": "flame",
            "color": "#FF9500"
        }, headers=headers)
        assert create_notif_resp.status_code == 200
        notif_id = create_notif_resp.json()["id"]

        notifs_resp2 = await ac.get("/api/v1/notifications", headers=headers)
        assert len(notifs_resp2.json()) == 1

        read_resp = await ac.patch(f"/api/v1/notifications/{notif_id}/read", headers=headers)
        assert read_resp.status_code == 200

        all_read_resp = await ac.post("/api/v1/notifications/mark-all-read", headers=headers)
        assert all_read_resp.status_code == 200

        # SMS Gateway Dispatch Endpoint Test
        sms_resp = await ac.post("/api/v1/notifications/send-sms", json={
            "phone": "+919876543210",
            "message": "Production SMS Verification Alert"
        }, headers=headers)
        assert sms_resp.status_code == 200
        sms_data = sms_resp.json()
        assert "provider" in sms_data
        assert "message" in sms_data

        # 15. Change Password Test
        chg_resp = await ac.post("/api/v1/auth/change-password", json={
            "current_password": "securepassword123",
            "new_password": "newsecurepassword456"
        }, headers=headers)
        assert chg_resp.status_code == 200

        # 16. Forgot Password & Reset Password Test
        forgot_resp = await ac.post("/api/v1/auth/forgot-password", json={"email": unique_email})
        assert forgot_resp.status_code == 200
        assert forgot_resp.json()["status"] == "success"

        reset_resp = await ac.post("/api/v1/auth/reset-password", json={
            "email": unique_email,
            "reset_code": "123456",
            "new_password": "finalpassword789"
        })
        assert reset_resp.status_code == 200

        # Verify login with new reset password
        new_login = await ac.post("/api/v1/auth/login", json={
            "email": unique_email,
            "password": "finalpassword789"
        })
        assert new_login.status_code == 200
        new_token = new_login.json()["access_token"]
        new_headers = {"Authorization": f"Bearer {new_token}"}

        # 17. Google Play Account Deletion Test
        del_resp = await ac.delete("/api/v1/auth/account", headers=new_headers)
        assert del_resp.status_code == 200

        # Confirm deleted
        me_after_del = await ac.get("/api/v1/auth/me", headers=new_headers)
        assert me_after_del.status_code == 404


@pytest.mark.asyncio
async def test_otp_auth_and_journal_update():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        import uuid
        phone_num = f"+9198{uuid.uuid4().int % 100000000:08d}"
        
        # 1. Send OTP
        send_resp = await ac.post("/api/v1/auth/send-otp", json={
            "phone": phone_num,
            "name": "OTP Test User"
        })
        assert send_resp.status_code == 200
        send_data = send_resp.json()
        assert send_data["status"] == "success"
        otp = send_data.get("dev_otp") or "123456"

        # 2. Verify OTP and login
        verify_resp = await ac.post("/api/v1/auth/verify-otp", json={
            "phone": phone_num,
            "otp": otp,
            "name": "OTP Test User"
        })
        assert verify_resp.status_code == 200
        verify_data = verify_resp.json()
        assert "access_token" in verify_data
        assert verify_data["user"]["name"] == "OTP Test User"
        assert verify_data["user"]["phone"] == phone_num
        token = verify_data["access_token"]
        headers = {"Authorization": f"Bearer {token}"}

        # 3. Create a journal entry
        create_journal_resp = await ac.post("/api/v1/journals", json={
            "title": "Initial Reflection",
            "content": "Original reflection content",
            "mood": "good",
            "mood_score": 4,
            "date": "2026-10-18"
        }, headers=headers)
        assert create_journal_resp.status_code == 201
        journal_id = create_journal_resp.json()["id"]

        # 4. Update the journal entry (PUT)
        update_journal_resp = await ac.put(f"/api/v1/journals/{journal_id}", json={
            "title": "Updated Reflection",
            "content": "Edited reflection with new thoughts",
            "mood": "great",
            "mood_score": 5
        }, headers=headers)
        assert update_journal_resp.status_code == 200
        updated_data = update_journal_resp.json()
        assert updated_data["title"] == "Updated Reflection"
        assert updated_data["content"] == "Edited reflection with new thoughts"
        assert updated_data["mood"] == "great"
        assert updated_data["mood_score"] == 5

        # 5. Delete the journal entry (DELETE)
        del_journal_resp = await ac.delete(f"/api/v1/journals/{journal_id}", headers=headers)
        assert del_journal_resp.status_code == 200


@pytest.mark.asyncio
async def test_phone_pin_auth_and_persistence():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        import uuid
        test_phone = f"+9198{uuid.uuid4().int % 100000000:08d}"
        test_name = "Arya Stark"
        test_pin = "4321"

        # 1. Validation test: missing compulsory name during registration
        invalid_resp = await ac.post("/api/v1/auth/phone-pin", json={
            "name": "A",  # Too short
            "phone": test_phone,
            "pin": test_pin,
            "is_registration": True
        })
        assert invalid_resp.status_code in (400, 422)

        # 2. Registration / First login: Name, Mobile, and PIN
        reg_resp = await ac.post("/api/v1/auth/phone-pin", json={
            "name": test_name,
            "phone": test_phone,
            "pin": test_pin,
            "is_registration": True
        })
        assert reg_resp.status_code == 200
        reg_data = reg_resp.json()
        assert "access_token" in reg_data
        assert reg_data["user"]["name"] == test_name
        assert reg_data["user"]["phone"] == test_phone
        assert reg_data["user"]["total_xp"] >= 100
        user_id = reg_data["user"]["id"]
        token_1 = reg_data["access_token"]
        headers_1 = {"Authorization": f"Bearer {token_1}"}

        # 3. Create a habit with user 1
        create_habit_resp = await ac.post("/api/v1/habits", json={
            "name": "Evening Meditation",
            "category": "Mindfulness",
            "icon": "moon",
            "color": "#6366F1",
            "streak_target": 7
        }, headers=headers_1)
        assert create_habit_resp.status_code == 201

        # 4. Attempt login with INCORRECT PIN
        wrong_pin_resp = await ac.post("/api/v1/auth/phone-pin", json={
            "name": test_name,
            "phone": test_phone,
            "pin": "9999"  # Wrong PIN
        })
        assert wrong_pin_resp.status_code == 401
        assert "Incorrect PIN" in wrong_pin_resp.json()["detail"]

        # 4b. Attempt login with UNREGISTERED phone number
        unreg_phone = f"+9197{uuid.uuid4().int % 100000000:08d}"
        unregistered_resp = await ac.post("/api/v1/auth/phone-pin", json={
            "phone": unreg_phone,
            "pin": "1234",
            "is_registration": False
        })
        assert unregistered_resp.status_code == 404
        assert "No registered account found" in unregistered_resp.json()["detail"]

        # 5. Login again with CORRECT PIN
        login_resp = await ac.post("/api/v1/auth/phone-pin", json={
            "name": test_name,
            "phone": test_phone,
            "pin": test_pin
        })
        assert login_resp.status_code == 200
        login_data = login_resp.json()
        assert login_data["user"]["id"] == user_id
        token_2 = login_data["access_token"]
        headers_2 = {"Authorization": f"Bearer {token_2}"}

        # 6. Verify previous data is preserved and returned
        habits_resp = await ac.get("/api/v1/habits", headers=headers_2)
        assert habits_resp.status_code == 200
        habits = habits_resp.json()
        habit_names = [h["name"] for h in habits]
        assert "Evening Meditation" in habit_names


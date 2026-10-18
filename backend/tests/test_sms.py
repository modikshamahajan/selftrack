import pytest
from app.services.sms import (
    normalize_phone_e164,
    normalize_phone_10_digits,
    dispatch_sms_otp,
)


def test_phone_normalization():
    # E.164 normalization
    assert normalize_phone_e164("+919876543210") == "+919876543210"
    assert normalize_phone_e164("9876543210") == "+919876543210"
    assert normalize_phone_e164("+1 (555) 123-4567") == "+15551234567"

    # 10-digit normalization (India)
    assert normalize_phone_10_digits("+919876543210") == "9876543210"
    assert normalize_phone_10_digits("919876543210") == "9876543210"
    assert normalize_phone_10_digits("09876543210") == "9876543210"
    assert normalize_phone_10_digits("9876543210") == "9876543210"


@pytest.mark.asyncio
async def test_dispatch_sms_console_fallback():
    # When no API keys are configured, it safely falls back to console mock
    success, msg, provider = await dispatch_sms_otp("+919876543210", "654321")
    assert provider == "console"
    assert "simulated" in msg or "console" in msg

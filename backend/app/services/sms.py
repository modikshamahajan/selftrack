import re
import logging
from typing import Tuple
import httpx
from app.core.config import settings

logger = logging.getLogger(__name__)


def normalize_phone_e164(phone: str) -> str:
    """Normalize phone number to international E.164 format (e.g. +919876543210)."""
    digits = re.sub(r"\D", "", phone)
    if phone.strip().startswith("+"):
        return f"+{digits}"
    # Default 10-digit numbers to India (+91)
    if len(digits) == 10:
        return f"+91{digits}"
    return f"+{digits}"


def normalize_phone_10_digits(phone: str) -> str:
    """Extract 10-digit mobile number for Indian SMS providers."""
    digits = re.sub(r"\D", "", phone)
    if len(digits) > 10 and digits.startswith("91"):
        return digits[-10:]
    if len(digits) > 10 and digits.startswith("0"):
        return digits[-10:]
    return digits[-10:] if len(digits) >= 10 else digits


async def send_twilio_message(phone: str, message: str) -> Tuple[bool, str]:
    """Send arbitrary SMS text message via Twilio REST API."""
    if not settings.TWILIO_ACCOUNT_SID or not settings.TWILIO_AUTH_TOKEN or not settings.TWILIO_FROM_NUMBER:
        return False, "Twilio credentials (ACCOUNT_SID, AUTH_TOKEN, FROM_NUMBER) not configured"

    e164_phone = normalize_phone_e164(phone)
    url = f"https://api.twilio.com/2010-04-01/Accounts/{settings.TWILIO_ACCOUNT_SID}/Messages.json"

    data = {
        "To": e164_phone,
        "From": settings.TWILIO_FROM_NUMBER,
        "Body": message,
    }

    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            resp = await client.post(
                url,
                data=data,
                auth=(settings.TWILIO_ACCOUNT_SID, settings.TWILIO_AUTH_TOKEN),
            )
            if resp.status_code in (200, 201):
                logger.info(f"[SMS/Twilio] Successfully sent message to {e164_phone}")
                return True, "SMS delivered successfully via Twilio"
            else:
                err_detail = resp.text
                logger.error(f"[SMS/Twilio] Failed with HTTP {resp.status_code}: {err_detail}")
                return False, f"Twilio error ({resp.status_code}): {resp.json().get('message', err_detail)}"
    except Exception as exc:
        logger.error(f"[SMS/Twilio] Network exception: {exc}")
        return False, f"Twilio connection error: {str(exc)}"


async def send_twilio_sms(phone: str, otp: str) -> Tuple[bool, str]:
    """Send SMS OTP via Twilio REST API."""
    body_text = f"Your SelfTrack verification code is: {otp}. Valid for 5 minutes. Please do not share this code."
    return await send_twilio_message(phone, body_text)


async def send_fast2sms_otp(phone: str, otp: str) -> Tuple[bool, str]:
    """Send SMS OTP via Fast2SMS (India Quick SMS / OTP Route)."""
    if not settings.FAST2SMS_API_KEY:
        return False, "Fast2SMS API key not configured"

    ten_digit = normalize_phone_10_digits(phone)
    if len(ten_digit) != 10:
        return False, f"Invalid 10-digit mobile number for Fast2SMS: {phone}"

    url = "https://www.fast2sms.com/dev/bulkV2"
    headers = {
        "authorization": settings.FAST2SMS_API_KEY,
        "Content-Type": "application/json",
    }
    payload = {
        "route": "otp",
        "variables_values": otp,
        "numbers": ten_digit,
    }

    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            resp = await client.post(url, json=payload, headers=headers)
            res_data = resp.json() if resp.status_code == 200 else {}
            if resp.status_code == 200 and res_data.get("return") is True:
                logger.info(f"[SMS/Fast2SMS] Successfully sent OTP to {ten_digit}")
                return True, "SMS delivered successfully via Fast2SMS"
            else:
                msg = res_data.get("message", [resp.text])[0] if isinstance(res_data.get("message"), list) else res_data.get("message", resp.text)
                logger.error(f"[SMS/Fast2SMS] Error: {msg}")
                return False, f"Fast2SMS error: {msg}"
    except Exception as exc:
        logger.error(f"[SMS/Fast2SMS] Network exception: {exc}")
        return False, f"Fast2SMS connection error: {str(exc)}"


async def send_msg91_otp(phone: str, otp: str) -> Tuple[bool, str]:
    """Send SMS OTP via MSG91 OTP Service."""
    if not settings.MSG91_AUTH_KEY or not settings.MSG91_TEMPLATE_ID:
        return False, "MSG91 credentials (AUTH_KEY, TEMPLATE_ID) not configured"

    digits = re.sub(r"\D", "", phone)
    if len(digits) == 10:
        digits = f"91{digits}"

    url = "https://control.msg91.com/api/v5/otp"
    headers = {
        "authkey": settings.MSG91_AUTH_KEY,
        "Content-Type": "application/json",
    }
    params = {
        "template_id": settings.MSG91_TEMPLATE_ID,
        "mobile": digits,
        "otp": otp,
    }

    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            resp = await client.post(url, params=params, headers=headers)
            res_json = resp.json() if resp.status_code == 200 else {}
            if resp.status_code == 200 and res_json.get("type") == "success":
                logger.info(f"[SMS/MSG91] Successfully sent OTP to {digits}")
                return True, "SMS delivered successfully via MSG91"
            else:
                msg = res_json.get("message", resp.text)
                logger.error(f"[SMS/MSG91] Error: {msg}")
                return False, f"MSG91 error: {msg}"
    except Exception as exc:
        logger.error(f"[SMS/MSG91] Network exception: {exc}")
        return False, f"MSG91 connection error: {str(exc)}"


async def dispatch_sms_otp(phone: str, otp: str) -> Tuple[bool, str, str]:
    """
    Main dispatcher for cellular SMS.
    Returns: (success: bool, status_message: str, provider_used: str)
    """
    provider = settings.SMS_PROVIDER.lower().strip()

    # Automatic selection based on provided credentials
    if provider == "auto":
        if settings.FAST2SMS_API_KEY:
            provider = "fast2sms"
        elif settings.TWILIO_ACCOUNT_SID and settings.TWILIO_AUTH_TOKEN:
            provider = "twilio"
        elif settings.MSG91_AUTH_KEY:
            provider = "msg91"
        else:
            provider = "console"

    if provider == "fast2sms":
        success, msg = await send_fast2sms_otp(phone, otp)
        return success, msg, "fast2sms"

    if provider == "twilio":
        success, msg = await send_twilio_sms(phone, otp)
        return success, msg, "twilio"

    if provider == "msg91":
        success, msg = await send_msg91_otp(phone, otp)
        return success, msg, "msg91"

    # Console fallback for local testing & development
    logger.info(f"[SMS/Console] OTP for {phone}: {otp}")
    return True, f"OTP [{otp}] simulated in server console", "console"

async def send_fast2sms_message(phone: str, message: str) -> Tuple[bool, str]:
    """Send arbitrary SMS text message via Fast2SMS Quick Route."""
    if not settings.FAST2SMS_API_KEY:
        return False, "Fast2SMS API key not configured"

    ten_digit = normalize_phone_10_digits(phone)
    if len(ten_digit) != 10:
        return False, f"Invalid 10-digit mobile number for Fast2SMS: {phone}"

    url = "https://www.fast2sms.com/dev/bulkV2"
    headers = {
        "authorization": settings.FAST2SMS_API_KEY,
        "Content-Type": "application/json",
    }
    payload = {
        "route": "q",
        "message": message,
        "language": "english",
        "flash": 0,
        "numbers": ten_digit,
    }

    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            resp = await client.post(url, json=payload, headers=headers)
            res_data = resp.json() if resp.status_code == 200 else {}
            if resp.status_code == 200 and res_data.get("return") is True:
                logger.info(f"[SMS/Fast2SMS] Successfully sent message to {ten_digit}")
                return True, "SMS delivered successfully via Fast2SMS"
            else:
                msg = res_data.get("message", [resp.text])[0] if isinstance(res_data.get("message"), list) else res_data.get("message", resp.text)
                logger.error(f"[SMS/Fast2SMS] Error: {msg}")
                return False, f"Fast2SMS error: {msg}"
    except Exception as exc:
        logger.error(f"[SMS/Fast2SMS] Network exception: {exc}")
        return False, f"Fast2SMS connection error: {str(exc)}"


async def dispatch_cellular_sms(phone: str, message: str) -> Tuple[bool, str, str]:
    """
    Main dispatcher for cellular SMS text messages.
    Returns: (success: bool, status_message: str, provider_used: str)
    """
    provider = settings.SMS_PROVIDER.lower().strip()

    if provider == "auto":
        if settings.FAST2SMS_API_KEY:
            provider = "fast2sms"
        elif settings.TWILIO_ACCOUNT_SID and settings.TWILIO_AUTH_TOKEN:
            provider = "twilio"
        elif settings.MSG91_AUTH_KEY:
            provider = "msg91"
        else:
            provider = "console"

    if provider == "fast2sms":
        success, msg = await send_fast2sms_message(phone, message)
        return success, msg, "fast2sms"

    if provider == "twilio":
        success, msg = await send_twilio_message(phone, message)
        return success, msg, "twilio"

    # Console / Mock development mode
    logger.info(f"[SMS/Console Mock] =======================================")
    logger.info(f"[SMS/Console Mock] Realtime SMS to {phone}: {message}")
    logger.info(f"[SMS/Console Mock] Configure TWILIO_ACCOUNT_SID or FAST2SMS_API_KEY in backend/.env for cellular network delivery.")
    logger.info(f"[SMS/Console Mock] =======================================")
    return False, "SMS simulated via developer console (no SMS gateway key configured)", "console"


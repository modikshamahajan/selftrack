import json
import logging
from datetime import datetime
from typing import Dict, Any, Tuple, Optional
import httpx
from app.core.config import settings

logger = logging.getLogger(__name__)


def build_system_context(user: Any, habits: list, metrics: Optional[Any], recent_mood: Optional[str] = None) -> str:
    today_str = datetime.now().strftime("%A, %B %d, %Y")
    
    habit_lines = []
    for h in habits:
        status = "Completed today" if getattr(h, "completed_today", False) else "Pending today"
        habit_lines.append(f"- {h.name} (Category: {h.category}, Streak: {h.current_streak} days, Target: {h.streak_target} days, Status: {status})")
    habits_text = "\n".join(habit_lines) if habit_lines else "No active habits logged yet."
    
    steps = getattr(metrics, "steps", 0) if metrics else 0
    water = getattr(metrics, "water_glasses", 0) if metrics else 0
    sleep = getattr(metrics, "sleep_hours", 7.5) if metrics else 7.5
    mood = recent_mood or "good"
    
    context = f"""You are 'SelfTrack Companion', an empathetic, motivating, and highly supportive AI personal growth and habit coach.
Current Date: {today_str}
User Name: {getattr(user, 'name', 'Friend')}
Current XP: {getattr(user, 'total_xp', 0)} XP (Level {getattr(user, 'level', 1)})

User's Real Health & Habit Telemetry Today:
- Today's Steps: {steps} / 10,000
- Water Hydration: {water} / 8 glasses
- Sleep Duration: {sleep} hours
- Recent Mood: {mood}
- Active Habits:
{habits_text}

Instructions:
1. Always be encouraging, warm, practical, and concise (2-4 sentences or short bullet points).
2. Reference their actual habits, streaks, steps, or mood when relevant to celebrate consistency or offer gentle guidance.
3. Suggest small, achievable micro-actions when the user feels stuck.
"""
    return context


async def query_local_ollama(
    prompt: str,
    system_prompt: str,
    endpoint: str = "http://localhost:11434",
    model: str = "llama3.2:1b"
) -> Optional[str]:
    try:
        url = f"{endpoint.rstrip('/')}/api/generate"
        payload = {
            "model": model,
            "prompt": prompt,
            "system": system_prompt,
            "stream": False,
            "options": {
                "temperature": 0.7,
                "num_predict": 300,
            }
        }
        async with httpx.AsyncClient(timeout=25.0) as client:
            resp = await client.post(url, json=payload)
            if resp.status_code == 200:
                data = resp.json()
                return data.get("response", "").strip()
            else:
                logger.warning(f"Ollama returned HTTP {resp.status_code}: {resp.text}")
                return None
    except Exception as e:
        logger.warning(f"Failed to reach local Ollama at {endpoint}: {e}")
        return None


async def query_gemini_api(
    prompt: str,
    system_prompt: str,
    api_key: str,
    model: str = "gemini-2.5-flash"
) -> Optional[str]:
    if not api_key:
        return None
    try:
        from google import genai
        client = genai.Client(api_key=api_key)
        # Using client.models.generate_content
        response = client.models.generate_content(
            model=model,
            contents=prompt,
            config={
                "system_instruction": system_prompt,
                "temperature": 0.7,
                "max_output_tokens": 350,
            }
        )
        return response.text.strip() if response.text else None
    except Exception as e:
        logger.warning(f"Gemini API request failed: {e}")
        return None


async def query_openai_api(
    prompt: str,
    system_prompt: str,
    api_key: str,
    model: str = "gpt-4o-mini",
    base_url: str = "https://api.openai.com/v1"
) -> Optional[str]:
    if not api_key:
        return None
    try:
        headers = {
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json"
        }
        payload = {
            "model": model,
            "messages": [
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": prompt}
            ],
            "max_tokens": 300,
            "temperature": 0.7
        }
        async with httpx.AsyncClient(timeout=25.0) as client:
            resp = await client.post(f"{base_url.rstrip('/')}/chat/completions", json=payload, headers=headers)
            if resp.status_code == 200:
                data = resp.json()
                return data["choices"][0]["message"]["content"].strip()
            return None
    except Exception as e:
        logger.warning(f"OpenAI API request failed: {e}")
        return None


def get_heuristic_coaching_fallback(prompt: str, user: Any, habits: list) -> str:
    """Intelligent rule-based coaching response if no LLM server is currently active."""
    low_prompt = prompt.lower()
    name = getattr(user, "name", "Friend")
    
    if "how am i doing" in low_prompt or "status" in low_prompt or "summary" in low_prompt:
        completed_count = sum(1 for h in habits if getattr(h, "completed_today", False))
        total = len(habits)
        return f"Hey {name}! You're making steady progress. You've completed {completed_count} out of {total} habits today. Remember that consistency builds identity—every small checkmark counts! 💪"
    
    if "mood" in low_prompt or "feel" in low_prompt:
        return f"Taking time to notice your feelings is a superpower, {name}. If today feels heavy, try a 3-minute deep breathing break or a brisk walk. If you're feeling great, harness that energy into your daily goals! 🌿"
    
    if "exercise" in low_prompt or "step" in low_prompt:
        return f"Moving your body directly energizes your brain! Aim for an extra 1,000 steps or a light 10-minute stretch this afternoon to stay refreshed. 🏃‍♂️"
    
    if "habit" in low_prompt or "routine" in low_prompt:
        return f"Habit stacking is one of the most effective techniques: attach your new habit immediately after an existing one (e.g., 'After I pour my morning coffee, I will meditate for 3 minutes'). You've got this! ✨"
        
    return f"Great question, {name}! Consistency is the compound interest of self-improvement. Focus on winning today one micro-habit at a time. What would you like to achieve next? 🌟"


class AIService:
    @staticmethod
    async def generate_response(
        user: Any,
        user_settings: Any,
        message: str,
        habits: list,
        metrics: Optional[Any],
        recent_mood: Optional[str] = None
    ) -> Tuple[str, str]:
        system_prompt = build_system_context(user, habits, metrics, recent_mood)
        
        mode = getattr(user_settings, "ai_mode", "local_ollama") if user_settings else "local_ollama"
        custom_key = getattr(user_settings, "custom_api_key", "") if user_settings else ""
        ollama_ep = getattr(user_settings, "ollama_endpoint", settings.OLLAMA_HOST) if user_settings else settings.OLLAMA_HOST
        model_name = getattr(user_settings, "ai_model_name", settings.DEFAULT_LOCAL_MODEL) if user_settings else settings.DEFAULT_LOCAL_MODEL
        
        # 1. If user chose Local Ollama
        if mode == "local_ollama":
            reply = await query_local_ollama(
                prompt=message,
                system_prompt=system_prompt,
                endpoint=ollama_ep,
                model=model_name or "llama3.2:1b"
            )
            if reply:
                return reply, f"Ollama ({model_name})"
                
        # 2. If user chose Gemini or provided BYOK Gemini Key
        if mode == "gemini" or (mode == "byok" and custom_key.startswith("AIza")):
            api_key = custom_key or settings.GEMINI_API_KEY
            if api_key:
                reply = await query_gemini_api(
                    prompt=message,
                    system_prompt=system_prompt,
                    api_key=api_key,
                    model="gemini-2.5-flash"
                )
                if reply:
                    return reply, "Google Gemini 2.5 Flash"
                    
        # 3. If user chose OpenAI or provided BYOK OpenAI Key
        if mode == "openai" or (mode == "byok" and custom_key.startswith("sk-")):
            api_key = custom_key or settings.OPENAI_API_KEY
            if api_key:
                reply = await query_openai_api(
                    prompt=message,
                    system_prompt=system_prompt,
                    api_key=api_key,
                    model="gpt-4o-mini"
                )
                if reply:
                    return reply, "OpenAI GPT-4o-mini"
                    
        # 4. Fallback attempt: try local Ollama default host if not already tried
        if mode != "local_ollama":
            reply = await query_local_ollama(
                prompt=message,
                system_prompt=system_prompt,
                endpoint=settings.OLLAMA_HOST,
                model="llama3.2:1b"
            )
            if reply:
                return reply, "Local Ollama (Fallback)"

        # 5. Intelligent contextual heuristic fallback
        reply = get_heuristic_coaching_fallback(message, user, habits)
        return reply, "SelfTrack Companion AI"

    @staticmethod
    async def generate_widget_tip(user: Any, habits: list, metrics: Optional[Any]) -> str:
        completed = sum(1 for h in habits if getattr(h, "completed_today", False))
        total = len(habits)
        steps = getattr(metrics, "steps", 0) if metrics else 0
        
        if total > 0 and completed == total:
            return "Incredible job! All your daily habits are completed. Take a moment to relax and celebrate your win! 🌟"
        elif total > 0 and completed > 0:
            return f"You're on track! {completed}/{total} habits done today. Keep the momentum going! 💪"
        elif steps > 6000:
            return f"Great activity today with {steps:,} steps! Stay hydrated and finish your evening routine strong. 🚶‍♂️"
        else:
            return "Your AI companion is ready to help you stay on track today. Tap to chat with your coach. ✨"

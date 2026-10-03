# Privacy Policy for SelfTrack

**Effective Date:** September 21, 2026  
**Last Updated:** September 21, 2026  

Welcome to **SelfTrack** ("we", "our", or "us"). We are committed to protecting your privacy and ensuring you have a transparent, secure experience while using our application.

This Privacy Policy explains how we collect, use, disclose, and safeguard your personal information when you use the SelfTrack mobile application ("App") on Android and other platforms.

---

## 1. Information We Collect

### A. Information You Directly Provide
- **Account Data**: When you register, we collect your name, email address, password hash, and optional profile picture.
- **Goals & Preferences**: Interests (e.g. mindfulness, fitness, nutrition) and self-improvement goals you select during onboarding.
- **Journal & Notes**: Written journal entries, mood scores, and associated photos or audio voice memos you choose to attach.
- **Custom Habits**: Names, categories, icons, colors, target frequencies, and daily completion logs.
- **Nutrition & Calorie Logs**: Custom food items, calorie counts, and daily intake logs.

### B. Device & Sensor Information
With your explicit runtime permission, SelfTrack accesses:
- **Physical Activity / Step Tracking (`android.permission.ACTIVITY_RECOGNITION`)**: Steps count and physical activity data collected via your device hardware pedometer to track daily fitness goals.
- **Camera & Photos (`android.permission.CAMERA`)**: Access to capture photos for your profile avatar or to attach memories to your journal entries.
- **Audio Recording (`android.permission.RECORD_AUDIO`)**: Access to the microphone strictly when you tap the mic button to dictate notes or prompt the AI companion via speech-to-text.
- **Biometric Authentication (`android.permission.USE_BIOMETRIC`)**: Used locally on your device for biometric lock/unlock (fingerprint or face). Biometric data never leaves your device and is not sent to our servers.

### C. AI & LLM Processing
- **AI Companion Prompts**: When you converse with the AI Companion or request daily/weekly insights, your text message and relevant local context (e.g. your active habit streak or mood score) are sent to the AI engine (either your configured local LLM on Ollama, or Google Gemini/OpenAI if selected).
- **No Training On Your Data**: Your conversational data is strictly used to generate immediate real-time responses and coaching insights. It is never used to train generalized foundation models without your explicit consent.

---

## 2. How We Use Your Information

We use the collected information for:
1. Providing, maintaining, and improving SelfTrack features (habit streaks, step graphs, mood correlation).
2. Calculating XP progression, levels, badges, and optional community leaderboards.
3. Providing personalized AI habit coaching and wellness insights.
4. Securing your account through encrypted JWT authentication and optional biometric verification.
5. Sending notifications you have opted into (e.g., habit reminders, streak milestones).

---

## 3. Data Storage, Security & Retention

- **Encryption**: Data transmitted between the App and backend is encrypted via TLS 1.3 / HTTPS. Passwords are salted and hashed using standard bcrypt algorithms.
- **Local Storage**: Authentication tokens and offline state are stored securely on your device using encrypted storage.
- **Retention**: We retain your personal data for as long as your account remains active.

---

## 4. Account and Data Deletion (Google Play Compliance)

You have the unconditional right to delete your account and all associated data at any time:
- **In-App Deletion**: Go to **Settings > Security & Privacy > Delete Account and All Data**, and confirm your request.
- **Immediate Effect**: Upon confirmation, your user profile, habits, habit history, health metrics, journal entries, photos, and AI chat logs are permanently purged from our database immediately.
- **Web Deletion Request**: If you are unable to access the App, you may request account deletion by emailing `support@selftrack.app` with the subject "Data Deletion Request".

---

## 5. Sharing of Information

We do not sell, rent, or trade your personal data. We only share information with:
- **Service Providers**: Infrastructure and AI providers (e.g. Google Gemini API) strictly for processing app features.
- **Legal Compliance**: When required by applicable law, regulation, or legal process.

---

## 6. Children's Privacy

SelfTrack is not intended for children under the age of 13. We do not knowingly collect personal information from children under 13.

---

## 7. Contact Us

If you have any questions, concerns, or requests regarding this Privacy Policy or your data, please contact us at:
- **Email**: support@selftrack.app
- **Website**: https://selftrack.app

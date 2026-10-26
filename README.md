# SelfTrack — Open-Source Personal Growth & Wellness Platform

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
[![F-Droid](https://img.shields.io/badge/F--Droid-Ready-green.svg)](FDROID_GUIDE.md)
[![TypeScript](https://img.shields.io/badge/TypeScript-6.0-blue.svg)](tsconfig.json)
[![React Native](https://img.shields.io/badge/React%20Native-0.88-61DAFB.svg)](package.json)
[![Expo SDK](https://img.shields.io/badge/Expo%20SDK-58-black.svg)](package.json)
[![Tests Passing](https://img.shields.io/badge/Tests-68%2F68%20Passed-brightgreen.svg)](src/store/__tests__)

SelfTrack is a privacy-first, cross-platform personal development companion designed for Android, iOS, and Web. It combines **habit tracking**, **health & nutrition analytics**, **menstrual cycle forecasting**, **private journaling**, **Pomodoro focus timer with offline soundscapes**, and **gamification rewards** into a cohesive, offline-first application.

---

## 🌟 Why SelfTrack?

- **100% Free & Open Source**: Licensed under the permissive MIT license.
- **F-Droid Ready**: Zero proprietary trackers, zero advertisements, and built completely from source.
- **Offline-First by Design**: Core habits, timers, soundscapes, symptom tracking, and journals work without any internet connection.
- **Privacy Guaranteed**: Your data belongs strictly to you. Complete in-app JSON data export and one-tap permanent deletion.
- **Micro-Animations & Rich Design**: Thoughtfully crafted UI with smooth gradients, haptic feedback, and fluid SVG progress indicators.

---

## 📱 Feature Overview

| Module | Key Capabilities |
| :--- | :--- |
| **Habit Tracker** | Fractional consistency ring dots, streak targets (3–90 days), Morning/Evening routine runners, and day-by-day persistence maps. |
| **Health & Nutrition** | Real-time pedometer step tracking (`expo-sensors`), interactive hydration visualizer, custom food creation, and categorized calorie counters. |
| **Menstrual Cycle** | Phase forecasting (Menstrual, Follicular, Ovulation, Luteal), symptom and mood logging, and fertile window calculations. |
| **Focus Timer** | Pomodoro intervals, guided breathing visualizer, and 4 offline ambient soundscapes (Forest, Rain, Ocean Waves, Lo-Fi). |
| **Reflection & Journal** | 5-point emoji mood tracker, photo attachments via camera/gallery, and timestamped reflective journaling. |
| **Smart Reminders** | Scheduled notifications for habits, water alerts, birthdays, anniversaries, and meetings with celebratory modals. |
| **Gamification** | Leveling system, XP progression, achievement badges, mystery chests, and weekly friendly leaderboards. |
| **SelfTrack AI** | Conversational companion with offline heuristic coaching and support for local Ollama, Google Gemini, and OpenAI BYOK. |

---

## 🏗️ Architecture & Technology Stack

### Frontend (Mobile & Web)
- **Framework**: React Native 0.88 / Expo SDK 58
- **Language**: TypeScript ~6.0 (Strict mode, 0 errors, 0 linter warnings)
- **State Management**: Zustand 5.0 with persistent AsyncStorage caching
- **Navigation**: React Navigation 7 (Stack Navigator + 5-Tab Navigation + Deep Linking)
- **Styling**: Token-based design system (`src/theme/`) with native reanimated micro-interactions

### Backend (Containerized REST API)
- **Framework**: FastAPI (Python 3.11 / ASGI)
- **Database**: SQLite with SQLAlchemy 2.0 (Async Engine)
- **Security**: JWT authentication, bcrypt password hashing, isolated `@admin_token` credentials
- **Container**: Rootless Podman / Docker container with persistent named volume

---

## 🚀 Getting Started

### Prerequisites
- [Node.js](https://nodejs.org/) (v18 or newer)
- [npm](https://www.npmjs.com/)
- Python 3.11+ (optional, if running backend locally without Docker)
- Podman or Docker (optional, for backend container)

### 1. Clone & Install
```bash
git clone https://github.com/modikshamahajan/selftrack.git
cd selftrack
npm install
```

### 2. Run the App
```bash
# Start Metro bundler
npm start

# Run on Android emulator or connected device
npm run android

# Run on Web browser
npm run web
```

### 3. Start the Backend Container (Optional)
```bash
./docker-start.sh

# Verify health
curl http://localhost:5000/api/v1/health
```

---

## 🧪 Testing & Code Quality

Both frontend and backend test suites are verified:

```bash
# Verify TypeScript compile (0 errors)
npx tsc --noEmit

# Run ESLint (0 errors, 0 warnings)
npm run lint

# Run Frontend Jest tests (53/53 passed)
npm test

# Run Backend Pytest tests (15/15 passed)
cd backend && .venv/bin/pytest
```

---

## 📦 Distribution Guides

- **[F-Droid Publishing Guide](FDROID_GUIDE.md)**: Instructions for submitting to the official F-Droid repository.
- **[Google Play Store Guide](PLAY_STORE_GUIDE.md)**: Instructions for building release AABs and store assets.
- **[iOS Release Guide](IOS_RELEASE_GUIDE.md)**: Configuration for Apple App Store and TestFlight.
- **[Privacy Policy](PRIVACY_POLICY.md)**: Transparent privacy and data protection documentation.

---

## 🤝 Contributing

Contributions are welcome! Please read [CONTRIBUTING.md](CONTRIBUTING.md) for details on code style, branch naming, and pull request procedures.

---

## 📄 License

This project is open-source and available under the [MIT License](LICENSE).

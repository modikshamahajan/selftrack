# SelfTrack - AI-Powered Self Improvement Platform

SelfTrack is a comprehensive, cross-platform (Android, iOS, Web) wellness and productivity mobile application featuring an integrated containerized Python FastAPI backend, local & cloud AI coaching, habit tracking, health analytics, private journaling, gamification rewards, and Google Play Store compliance.

---

## 📱 Tech Stack & Architecture

### Frontend (Mobile & Web)
- **Framework**: React Native 0.86 / Expo SDK 57 (SDK 54+ compatible)
- **Language**: TypeScript ~6.0
- **Navigation**: React Navigation 7 (Stack & Bottom Tab Navigators)
- **State Management & Storage**: Zustand 5.0 + AsyncStorage (`@react-native-async-storage/async-storage`)
- **Networking**: Axios 1.18 with dynamic IP auto-detection and JWT interceptors
- **Security & Sensors**:
  - `expo-local-authentication` (Biometrics: Face ID & Fingerprint)
  - `expo-sensors` (Live Pedometer & step counter)
  - `expo-image-picker` (Multi-image photo attachments)
  - `expo-haptics` (Haptic feedback)
- **Visuals & Charts**:
  - `react-native-reanimated` 4.5 & `react-native-worklets`
  - `expo-linear-gradient` (Smooth gradients & ambient glows)
  - `react-native-svg` (Vector graphics & circular progress rings)
  - `react-native-chart-kit` (Trend line and bar charts)
  - `@expo/vector-icons` (Feather Icons)
- **Web Support**: React Native Web (`react-native-web`)

### Backend (Containerized REST API)
- **Runtime**: Python 3.11
- **Framework**: FastAPI (Async ASGI)
- **Database**: SQLite with SQLAlchemy 2.0 (Async Engine) & persistent named volume
- **Authentication**: JWT (JSON Web Tokens) with HS256 + Passlib bcrypt password hashing
- **Containerization**: Podman 5.8 / Docker rootless container with host networking
- **AI Companion Engine**:
  - **Local On-Device / LAN**: Ollama API (`http://localhost:11434` with 5s rapid fallback)
  - **Cloud AI**: Google Gemini API (`gemini-1.5-flash` / `gemini-2.0-flash`)
  - **Offline Fallback**: Heuristic intelligent wellness coach

---

## 🚀 Quick Start & Running Locally

### 1. Start the Backend (Local Container)
The backend runs locally on your PC inside a rootless Podman / Docker container:

```bash
# Start or restart the container (host port 5000)
./docker-start.sh

# Verify container health
curl http://localhost:5000/api/v1/health

# Stop the container when finished
./docker-stop.sh
```

> **LAN Access:** When running on your physical phone, the app connects directly to your PC's Wi-Fi LAN IP (e.g., `http://192.168.1.9:5000/api/v1`).

---

### 2. Start the Frontend Mobile App
In the root `selftrack` directory:

```bash
# Install dependencies (if needed)
npm install

# Start the Expo development server
npm run start
```

#### Platform Targets:
| Target | Command | Details |
|---|---|---|
| **Android Phone (Expo Go)** | `npx expo start` -> Scan QR | Connects over Wi-Fi to your PC backend |
| **Android Emulator** | Press `a` in Metro terminal | Connects via `http://10.0.2.2:5000` |
| **Web Browser** | Press `w` in Metro terminal | Opens at `http://localhost:8081` |
| **iOS Simulator** | Press `i` in Metro terminal | Connects via `http://localhost:5000` |

---

## 🔐 Credentials & Authentication

| Role | Email | Password | Details |
|---|---|---|---|
| **Demo Account** | `demo@selftrack.app` | `demo1234` | Pre-seeded with habits, health metrics, and XP |
| **Any New User** | *Your choice* | *Min 6 chars* | Create directly via **Sign Up** |

---

## 📂 Project Structure

```
selftrack/
├── App.tsx                     # Entry point with navigation container & linking config
├── app.json                    # Expo configuration (icons, permissions, schemes)
├── package.json                # Frontend dependencies
├── tsconfig.json               # TypeScript configuration
├── docker-compose.yml          # Container compose configuration
├── docker-start.sh             # Quick startup script for Podman / Docker
├── docker-stop.sh              # Container stop and cleanup script
│
├── backend/                    # Python FastAPI Backend
│   ├── Dockerfile              # Production Python 3.11 container build
│   ├── requirements.txt        # Backend dependencies (fastapi, uvicorn, sqlalchemy, etc.)
│   ├── main.py                 # FastAPI application entry & router mounting
│   ├── run.sh                  # Native virtualenv startup script
│   ├── app/
│   │   ├── core/               # Database, security, and configuration
│   │   │   ├── config.py       # App settings & environment variables
│   │   │   ├── database.py     # Async engine & session factory
│   │   │   ├── deps.py         # JWT authentication dependency
│   │   │   └── security.py     # Password hashing & JWT token generators
│   │   ├── models/             # SQLAlchemy ORM models (User, Habit, Health, Journal, etc.)
│   │   ├── schemas/            # Pydantic v2 validation schemas
│   │   ├── services/           # AI companion service (Ollama + Gemini)
│   │   └── routers/            # API Route definitions
│   │       ├── auth.py         # Register, login, reset-password, change-password
│   │       ├── users.py        # Settings, profile, me/export, me
│   │       ├── habits.py       # Habit CRUD & toggle streak
│   │       ├── health.py       # Steps, water, food logging
│   │       ├── journals.py     # Journal CRUD & reflections
│   │       ├── ai.py           # AI chat & conversation history
│   │       ├── rewards.py      # Gamified XP, levels, and badges
│   │       ├── social.py       # Community feed & reactions
│   │       └── notifications.py# App notifications & reminders
│   └── tests/                  # Pytest test suite (`test_api.py`)
│
└── src/                        # React Native Source Code
    ├── components/             # Reusable UI Design System Components
    │   ├── Button.tsx          # Gradient, primary, outline, and ghost buttons
    │   ├── InputField.tsx      # Form inputs with icons and secure toggle
    │   ├── Card.tsx            # Elevated, glass, and gradient container cards
    │   ├── PinLockModal.tsx    # 4-digit PIN setup & verification modal
    │   ├── ProgressRing.tsx    # SVG circular animated percentage progress ring
    │   ├── XPBar.tsx           # Experience points level progress bar
    │   └── MoodSelector.tsx    # 5-stage interactive emoji mood selector
    ├── navigation/             # Stack and Tab navigation hierarchy
    ├── services/               # API client and local notification services
    ├── store/                  # Zustand state stores (auth, habits, health, journals, etc.)
    └── screens/                # 18 Full application screens
```

---

## 🌐 Complete REST API Reference (`/api/v1`)

All protected routes require `Authorization: Bearer <access_token>`.

### 1. Authentication & Account Management (`/api/v1/auth`)
| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/v1/auth/register` | Register new user account with interests & goals |
| `POST` | `/api/v1/auth/login` | Authenticate user & return access/refresh tokens |
| `POST` | `/api/v1/auth/refresh` | Refresh an expired access token |
| `GET` | `/api/v1/auth/me` | Fetch authenticated user profile and XP |
| `POST` | `/api/v1/auth/forgot-password` | Request password reset code |
| `POST` | `/api/v1/auth/reset-password` | Reset password using verified reset code |
| `POST` | `/api/v1/auth/change-password` | Update current login password |
| `DELETE` | `/api/v1/auth/account` | **Google Play Compliance**: Permanent cascade deletion of account and data |

### 2. User Settings & GDPR Compliance (`/api/v1/users`)
| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/v1/users/settings` | Get user preferences & privacy settings |
| `PUT` | `/api/v1/users/settings` | Update settings (AI mode, PIN, biometrics, dark mode) |
| `PUT` | `/api/v1/users/profile` | Update display name and avatar URL |
| `GET` | `/api/v1/users/me/export` | **GDPR & Play Store**: Download full personal data archive in JSON |
| `DELETE` | `/api/v1/users/me` | Permanent account erasure |

### 3. Habit Tracking (`/api/v1/habits`)
| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/v1/habits` | List all active habits with current/best streaks |
| `POST` | `/api/v1/habits` | Create a new habit (+20 XP) |
| `PUT` | `/api/v1/habits/{id}` | Update habit name, icon, color, or target |
| `POST` | `/api/v1/habits/{id}/toggle` | Toggle completion for today or a specific date |
| `DELETE` | `/api/v1/habits/{id}` | Delete habit |

### 4. Health & Nutrition (`/api/v1/health`)
| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/v1/health/today` | Get today's steps, water, sleep, calories |
| `POST` | `/api/v1/health/sync` | Sync pedometer steps, distance, calories |
| `POST` | `/api/v1/health/water` | Increment or decrement water intake (+1 glass) |
| `GET` | `/api/v1/health/food` | List food items logged for a date |
| `POST` | `/api/v1/health/food` | Log food item with calories & serving |
| `DELETE` | `/api/v1/health/food/{id}` | Delete food log item |

### 5. Journals & Reflections (`/api/v1/journals`)
| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/v1/journals` | Fetch journal reflections (optional `?date=YYYY-MM-DD`) |
| `POST` | `/api/v1/journals` | Create journal entry with mood score and photos (+30 XP) |
| `DELETE` | `/api/v1/journals/{id}` | Delete journal entry |

### 6. AI Companion Coach (`/api/v1/ai`)
| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/v1/ai/chat` | Chat with AI companion coach (Ollama / Gemini / Heuristic) |
| `GET` | `/api/v1/ai/history` | Get recent conversation history |
| `POST` | `/api/v1/ai/test` | Test local Ollama or cloud Gemini connectivity |

### 7. Rewards & Social (`/api/v1/rewards` & `/api/v1/social`)
| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/v1/rewards/summary` | User XP balance, current level, progress, and streak |
| `GET` | `/api/v1/rewards/badges` | Unlocked and locked gamification badges |
| `GET` | `/api/v1/social/feed` | Community feed posts and stories |
| `POST` | `/api/v1/social/posts` | Create a community post or achievement milestone |
| `POST` | `/api/v1/social/posts/{id}/like` | Like or unlike a community post |

---

## 🛡️ Google Play Store & Privacy Compliance

1. **Permanent Account Deletion**: Fully wired in both Settings and Security screens (`DELETE /api/v1/auth/account`), removing user records and cascading across all related tables.
2. **Data Portability (GDPR / CCPA)**: Users can export their complete machine-readable archive via `"Export My Data (JSON)"`.
3. **In-App Privacy Policy & Terms of Service**: Interactive modals detailing data encryption, on-device AI handling, and user rights.
4. **Biometric Security**: Native Android BiometricPrompt and iOS Face ID verification via `expo-local-authentication`.
5. **Cleartext Traffic Policy**: `android:usesCleartextTraffic="true"` configured for seamless local Wi-Fi development without HTTPS certificate errors.

---

## 🧪 Automated Testing

Run the comprehensive pytest suite verifying all workflows, authentication, data export, and cascade account deletion:

```bash
cd backend
PYTHONPATH=. ./.venv/bin/pytest tests/
```

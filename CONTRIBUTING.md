# Contributing to SelfTrack

Thank you for your interest in contributing to **SelfTrack**! SelfTrack is a community-driven, privacy-first, open-source personal development companion.

---

## 🧭 Code of Conduct

We are committed to providing a welcoming, inclusive, and harassment-free environment for everyone. Please be respectful and constructive in all issues, pull requests, and discussions.

---

## 🛠️ Development Setup

### Prerequisites

- **Node.js**: `v18` or newer (LTS recommended)
- **Package Manager**: `npm`
- **Expo CLI**: Installed automatically via npx
- **Android Studio & SDK**: If developing on Android natively
- **Python**: `v3.11+` (for local backend development)

### Getting Started

1. **Fork & Clone**:
   ```bash
   git clone https://github.com/modikshamahajan/selftrack.git
   cd selftrack
   ```

2. **Install Dependencies**:
   ```bash
   npm install
   ```

3. **Start the Development Server**:
   ```bash
   npm start
   ```

4. **Run on Android / Web**:
   ```bash
   npm run android
   # or
   npm run web
   ```

---

## 🧪 Testing & Code Quality

Before opening a pull request, ensure all linters, type checks, and tests pass:

```bash
# 1. TypeScript Compile Verification
npx tsc --noEmit

# 2. ESLint Static Analysis
npm run lint

# 3. Frontend Unit & Integration Tests
npm test

# 4. Backend Tests (if touching backend)
cd backend && .venv/bin/pytest
```

---

## 📦 Pull Request Guidelines

1. **Branch Naming**: Use descriptive branch names:
   - `feature/your-feature-name`
   - `fix/issue-description`
   - `docs/improvement-notes`
2. **Keep Commits Atomic**: Make small, focused commits with meaningful commit messages adhering to Conventional Commits:
   - `feat: add hydration reminder sound`
   - `fix: resolve cycle calculation edge case`
   - `docs: update F-Droid metadata`
3. **Privacy First**: Any new feature must be offline-first and must **never** include third-party tracking, analytics, or advertising SDKs.

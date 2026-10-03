# SelfTrack — Google Play Store Publishing & Release Guide

This guide provides the complete, step-by-step process to package, sign, and publish **SelfTrack** (`com.selftrack.app`) to the Google Play Store.

---

## 1. Prerequisites Checklist

- [x] **Package Name**: `com.selftrack.app` (configured in `app.json` and `android/app/build.gradle`).
- [x] **Target SDK**: Target API 34+ (Android 14) / Compile SDK 35 (configured).
- [x] **Permissions Declared**: `ACTIVITY_RECOGNITION`, `CAMERA`, `RECORD_AUDIO`, `POST_NOTIFICATIONS` in `AndroidManifest.xml` & `app.json`.
- [x] **Account Deletion Flow**: Implemented in `SecurityScreen.tsx` with `DELETE /api/v1/auth/account`.
- [x] **Privacy Policy**: Documented in `PRIVACY_POLICY.md` (ready to host on GitHub Pages or custom domain).
- [ ] **Google Play Developer Account**: Active developer account ($25 one-time registration).

---

## 2. Release Keystore Generation

To sign the Android App Bundle for production:

1. Open your terminal in the project directory.
2. Run the following keytool command:
   ```bash
   keytool -genkeypair -v -storetype PKCS12 -keystore selftrack-release-key.jks \
     -alias selftrack-key-alias -keyalg RSA -keysize 2048 -validity 10000
   ```
3. Store `selftrack-release-key.jks` in a secure location (or under `android/app/` while adding it to `.gitignore`).
4. Keep the keystore password, alias, and key password in a password manager.

---

## 3. Configuring Gradle Signing

Add the keystore credentials to your `~/.gradle/gradle.properties` (or `android/gradle.properties`):

```properties
SELFTRACK_UPLOAD_STORE_FILE=selftrack-release-key.jks
SELFTRACK_UPLOAD_KEY_ALIAS=selftrack-key-alias
SELFTRACK_UPLOAD_STORE_PASSWORD=your_keystore_password
SELFTRACK_UPLOAD_KEY_PASSWORD=your_key_password
```

In `android/app/build.gradle`, configure the release signing config:
```groovy
android {
    signingConfigs {
        release {
            if (project.hasProperty('SELFTRACK_UPLOAD_STORE_FILE')) {
                storeFile file(SELFTRACK_UPLOAD_STORE_FILE)
                storePassword SELFTRACK_UPLOAD_STORE_PASSWORD
                keyAlias SELFTRACK_UPLOAD_KEY_ALIAS
                keyPassword SELFTRACK_UPLOAD_KEY_PASSWORD
            }
        }
    }
    buildTypes {
        release {
            signingConfig signingConfigs.release
            minifyEnabled enableMinifyInReleaseBuilds
            proguardFiles getDefaultProguardFile("proguard-android.txt"), "proguard-rules.pro"
        }
    }
}
```

---

## 4. Building the Production Android App Bundle (.aab)

Google Play requires the **Android App Bundle (.aab)** format:

```bash
cd android
./gradlew bundleRelease
```

The output file will be generated at:
```
android/app/build/outputs/bundle/release/app-release.aab
```

This `.aab` file contains all optimized architectures (`arm64-v8a`, `armeabi-v7a`, `x86_64`) with resource shrinking enabled.

---

## 5. Google Play Console Setup

### 5.1 Create App
1. Go to [Google Play Console](https://play.google.com/console).
2. Click **Create App**.
3. App Name: **SelfTrack - Habits, Health & AI Coach**
4. Default language: **English (United States)** (or your preferred default).
5. App or Game: **App**
6. Free or Paid: **Free**

### 5.2 Store Listing Assets
- **App Icon**: 512 x 512 px (PNG, 32-bit color, no transparency).
- **Feature Graphic**: 1024 x 500 px (PNG or JPEG, no transparency).
- **Phone Screenshots**: Minimum 2 screenshots (recommended 6 to 8 showing Home, Habits, AI Chat, Health, Journal, Rewards, Analytics). Format: 16:9 or 9:16 aspect ratio (e.g. 1080 x 1920 px or 1080 x 2400 px).

### 5.3 App Content & Policy Declarations

1. **Privacy Policy**:
   - Paste the public URL where `PRIVACY_POLICY.md` is hosted (e.g., `https://yourdomain.com/privacy` or GitHub Pages).

2. **Data Safety Form Answers**:
   - *Does your app collect or share data?* Yes.
   - *Is all user data encrypted in transit?* Yes (HTTPS/TLS).
   - *Can users request that their data be deleted?* Yes (in-app under Settings > Security).
   - **Data types collected**:
     - Personal info (Name, Email address)
     - Health & Fitness (Physical activity / steps)
     - Photos & Videos (Optional avatar / journal attachments)
     - Audio (Optional speech dictation audio)
     - App info & performance (Crash logs / diagnostics)

3. **Sensitive Permissions Declaration**:
   - **Activity Recognition (`ACTIVITY_RECOGNITION`)**: Required for real-time and background step counting via `expo-sensors` Pedometer to track daily fitness goals.

4. **Target Audience**: 13 and older (general audience).

5. **In-App Account Deletion Link**:
   - Direct path: Settings > Security & Privacy > Delete Account and All Data.
   - Web URL for external requests: `https://yourdomain.com/account-deletion` or email contact.

---

## 6. Release Tracks & Testing

1. Go to **Testing > Internal Testing** (or Closed Testing).
2. Create a new release and upload `app-release.aab`.
3. Add your tester email addresses.
4. Download the tester build on your Android device to test login, step tracking permissions, local/cloud AI coaching, and habit logging.
5. Once verified, promote the release to **Production** for Google Play review.

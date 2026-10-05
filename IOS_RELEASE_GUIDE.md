# SelfTrack — iOS Build & Installation Guide (.ipa)

This guide explains how iOS app distribution works, how to generate the iPhone equivalent of an APK (**`.ipa`** file), and how to install and test **SelfTrack** on an iPhone.

---

## 1. APK vs IPA: Understanding the Difference

| Feature | Android (.apk) | iOS (.ipa) |
| :--- | :--- | :--- |
| **File Format** | `.apk` (Android Package) | `.ipa` (iOS App Store Package) |
| **Sideloading** | Easy: Send file and tap to install | Restricted: Apple requires code signing |
| **Local Building** | Can build on Linux/Windows/Mac with Gradle | Requires macOS / Xcode or Cloud CI (EAS) |
| **Certificates** | Self-signed keystore (`.jks`) | Apple Developer Certificate & Provisioning Profile |

---

## 2. Configuration Completed in the Project

The project is already pre-configured for iOS builds:

1. **`app.json`**:
   - Bundle Identifier: `com.selftrack.app`
   - iOS Usage Descriptions added to `infoPlist`:
     - `NSSpeechRecognitionUsageDescription` (Speech recognition for AI voice)
     - `NSMicrophoneUsageDescription` (Microphone recording)
     - `NSPhotoLibraryUsageDescription` (Profile pictures and journal attachments)
     - `NSCameraUsageDescription` (Taking pictures)
     - `NSFaceIDUsageDescription` (Biometric authentication)
     - `NSMotionUsageDescription` (Pedometer & step counting)

2. **`eas.json`**:
   - `preview`: Configured for internal distribution to generate an installable `.ipa` for physical iPhones.
   - `preview-simulator`: Configured with `"simulator": true` to generate builds for iOS Simulator without requiring an Apple Developer Account.

3. **`package.json`**:
   - `npm run build:ios`: Generates an installable `.ipa` for physical devices.
   - `npm run build:ios:sim`: Generates an iOS simulator build.

---

## 3. How to Build the iOS App (.ipa)

Because this development machine runs Linux and Apple's toolchain requires macOS, builds are handled in the cloud via **EAS Build** (just like `selftrack.apk` was built).

### Option A: Build for Physical iPhone (Direct Install / Ad-Hoc .ipa)
*Best for installing and running on real iPhones.*

```bash
npm run build:ios
# OR
npx eas build -p ios --profile preview
```

**What happens:**
1. EAS will prompt you to log into your **Apple ID** (or Apple Developer Account).
2. EAS will prompt to register your iPhone's UDID (EAS provides a link or QR code you open on your iPhone to automatically register it).
3. EAS builds the `.ipa` on cloud macOS servers.
4. When finished, EAS outputs:
   - A **direct install URL / QR code**: Open it in Safari on your iPhone, and tap **Install** to download the app directly to your home screen!
   - A download link for the **`.ipa`** file.

---

### Option B: Build for iOS Simulator (100% Free — No Apple Developer Account Needed)
*Best if you just want to verify the iOS build without an Apple account, or run it in Xcode Simulator / Appetize.io.*

```bash
npm run build:ios:sim
# OR
npx eas build -p ios --profile preview-simulator
```

**What happens:**
- Builds without needing any Apple Developer credentials.
- Outputs a `.tar.gz` archive containing `SelfTrack.app`.
- Can be dragged and dropped into the iOS Simulator on a Mac, or uploaded to [Appetize.io](https://appetize.io) to run in a web browser.

---

### Option C: Sideloading the .ipa with a Free Personal Apple ID (AltStore / Sideloadly)
*If you do not have a paid Apple Developer Account ($99/year) and want to install on a physical iPhone:*

1. Build an ad-hoc or development `.ipa` file using EAS.
2. Download [Sideloadly](https://sideloadly.io/) or [AltStore](https://altstore.io/) on your PC or Mac.
3. Connect your iPhone via USB.
4. Drag and drop the `.ipa` file into Sideloadly/AltStore.
5. Enter your free personal Apple ID to sign the app.
6. The app will be installed directly on your iPhone.
7. On your iPhone, go to **Settings > General > VPN & Device Management** and tap **Trust [Your Apple ID]**.

---

## 4. TestFlight & App Store Distribution (Production)

To distribute to beta testers via Apple's official **TestFlight** or release to the App Store:

1. Enroll in the [Apple Developer Program](https://developer.apple.com/programs/) ($99/year).
2. Run the production build:
   ```bash
   npx eas build -p ios --profile production
   ```
3. Submit to App Store Connect / TestFlight:
   ```bash
   npx eas submit -p ios
   ```
4. Invite testers by email or share a public TestFlight invite link. Testers install it directly via the Apple TestFlight app.

# F-Droid Publishing & Maintenance Guide for SelfTrack

This guide outlines the exact, end-to-end process for publishing and maintaining **SelfTrack** on **[F-Droid](https://f-droid.org/)**, the premier Free and Open Source (FOSS) repository for Android.

---

## 📋 What Makes F-Droid Unique?

1. **Built Completely From Source**: Unlike the Google Play Store (where you upload your own compiled `.aab` or `.apk`), F-Droid's official build servers (`fdroidserver`) clone your public Git repository, run the build tools, and sign the APK with F-Droid's secure offline keys.
2. **Zero Proprietary Blobs**: F-Droid scanners rigorously verify that your repository contains **no precompiled binary files** (`.apk`, `.jar`, `.aar`, `.so`) and **no proprietary tracking or advertising SDKs**.
3. **Reproducible & Transparent**: Users get verified open-source software built directly from public git tags.

---

## 🚀 Pre-Submission Checklist (Already Completed for SelfTrack)

- [x] **Open Source License**: `LICENSE` file added (MIT License).
- [x] **Repository Cleaned**: Removed prebuilt APKs, test SQLite databases, WAL journals, and temporary files.
- [x] **Fastlane Metadata**: Added app name, 80-char short description, full description, and 512x512 icon under `fastlane/metadata/android/en-US/`.
- [x] **Clean Native Android Build**: Standalone Android configuration in `android/` (`com.selftrack.app`, versionCode `5`, versionName `1.0.0`).
- [x] **Zero Tracking & Privacy Respecting**: SelfTrack contains no proprietary telemetry, no Firebase Analytics, and no ad libraries.
- [x] **F-Droid Build Recipe**: Prepared in `metadata/com.selftrack.app.yml`.

---

## 🛠️ Step-by-Step Submission Process

### Step 1: Push Code & Create Git Release Tag on GitHub

F-Droid builds from release tags. Once your changes are committed to GitHub:

```bash
# 1. Commit and push your latest changes to master
git add .
git commit -m "chore: prepare repository and metadata for F-Droid release"
git push origin master

# 2. Create an annotated release tag matching the version in android/app/build.gradle
git tag -a v1.0.0 -m "Release v1.0.0 (versionCode 5)"

# 3. Push the tag to GitHub
git push origin v1.0.0
```

---

### Step 2: Create a GitLab Account

F-Droid's official repository is hosted on **GitLab**:
1. Go to **[https://gitlab.com](https://gitlab.com)** and create or log in to your account.

---

### Step 3: Fork `fdroiddata`

1. Open the official repository: **[https://gitlab.com/fdroid/fdroiddata](https://gitlab.com/fdroid/fdroiddata)**.
2. Click **Fork** (top right) to create a copy under your GitLab profile.
3. Clone your fork locally or use the GitLab web editor:
   ```bash
   git clone https://gitlab.com/YOUR_GITLAB_USERNAME/fdroiddata.git
   cd fdroiddata
   git checkout -b add-selftrack
   ```

---

### Step 4: Add the Recipe File

1. Copy the prepared recipe file `metadata/com.selftrack.app.yml` from your SelfTrack repository into the `metadata/` directory of your `fdroiddata` clone:
   ```bash
   # In your fdroiddata clone:
   cp /path/to/selftrack/metadata/com.selftrack.app.yml metadata/
   ```
2. Commit and push the branch to your fork:
   ```bash
   git add metadata/com.selftrack.app.yml
   git commit -m "Add com.selftrack.app"
   git push origin add-selftrack
   ```

---

### Step 5: Open a Merge Request (MR)

1. Open your fork on GitLab: `https://gitlab.com/YOUR_GITLAB_USERNAME/fdroiddata`.
2. GitLab will prompt you to create a **New Merge Request**.
3. Set the target to `fdroid/fdroiddata:master`.
4. Title the MR: `New App: com.selftrack.app (SelfTrack)`.
5. In the description, provide:
   - Link to your GitHub repo: `https://github.com/modikshamahajan/selftrack`
   - Short explanation: *"SelfTrack is an open-source, privacy-first habits, health, and personal growth companion."*
   - Confirmation that you are the author/maintainer.
6. Submit the Merge Request.

---

### Step 6: Review & CI Verification

1. F-Droid's automated CI bot will run:
   - `fdroid lint com.selftrack.app`: Validates formatting and metadata.
   - `fdroid checkupdates com.selftrack.app`: Verifies tag discovery.
   - Build test: Clones your repo and verifies Gradle build.
2. If the bot or maintainers leave comments, address them directly.
3. Once approved and merged, F-Droid's build server will automatically compile your app in the next build cycle (usually 1-3 days) and it will appear live on the F-Droid client and website!

---

## 🔄 Releasing Updates on F-Droid in the Future

Whenever you develop new features and want to publish an update:

1. **Bump Version in Code**:
   - In `app.json`: Increment `"version"` and `"versionCode"`.
   - In `android/app/build.gradle`: Increment `versionCode` (e.g. `6`) and update `versionName` (e.g. `"1.1.0"`).
2. **Commit and Tag**:
   ```bash
   git add .
   git commit -m "release: v1.1.0"
   git tag -a v1.1.0 -m "SelfTrack v1.1.0"
   git push origin master --tags
   ```
3. Because `com.selftrack.app.yml` has:
   ```yaml
   AutoUpdateMode: Version
   UpdateCheckMode: Tags
   ```
   **F-Droid's bots will automatically detect your new GitHub tag**, build the update, and distribute it to all users without requiring a new Merge Request!

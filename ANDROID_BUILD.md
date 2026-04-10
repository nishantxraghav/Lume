# 📱 LUME — Android Build Guide

## Prerequisites

Install these once on your computer:

| Tool | Download |
|------|----------|
| Node.js 18+ | https://nodejs.org |
| Android Studio | https://developer.android.com/studio |
| Java 17 (JDK) | Bundled with Android Studio |

In Android Studio → SDK Manager, install:
- Android SDK Platform 34 (Android 14)
- Android SDK Build-Tools 34
- Android Emulator (if testing without a phone)

---

## Step 1 — Install dependencies

```bash
cd lume
npm install
```

---

## Step 2 — Add Android platform

```bash
npx cap add android
```

This creates the `android/` folder with a full Android Studio project inside.

---

## Step 3 — Build and sync

```bash
npm run build        # compiles React → dist/
npx cap sync android # copies dist/ into android WebView assets
```

Or use the shortcut script:
```bash
npm run android      # build + sync + open Android Studio
```

---

## Step 4 — Add permissions to AndroidManifest.xml

Open `android/app/src/main/AndroidManifest.xml` and add inside `<manifest>`:

```xml
<uses-permission android:name="android.permission.INTERNET" />
<uses-permission android:name="android.permission.RECORD_AUDIO" />
<uses-permission android:name="android.permission.ACCESS_NETWORK_STATE" />
<uses-permission android:name="android.permission.VIBRATE" />
```

---

## Step 5 — Configure network security (for API calls)

Create `android/app/src/main/res/xml/network_security_config.xml`:

```xml
<?xml version="1.0" encoding="utf-8"?>
<network-security-config>
    <domain-config cleartextTrafficPermitted="false">
        <domain includeSubdomains="true">api.groq.com</domain>
        <domain includeSubdomains="true">api.elevenlabs.io</domain>
        <domain includeSubdomains="true">jgefpxyasdxcpkwkqsby.supabase.co</domain>
        <domain includeSubdomains="true">generativelanguage.googleapis.com</domain>
    </domain-config>
</network-security-config>
```

Then in AndroidManifest.xml, add to `<application>`:
```xml
android:networkSecurityConfig="@xml/network_security_config"
```

---

## Step 6 — Set up Google OAuth for Android

In your Supabase Dashboard → Authentication → URL Configuration, add:
```
com.lume.mentalwellness://
```
as an allowed redirect URL.

In Google Cloud Console → OAuth → Authorized redirect URIs, add:
```
com.lume.mentalwellness://
```

---

## Step 7 — Add splash screen + app icon

1. Put your app icon (1024×1024 PNG) in `android/app/src/main/res/`
2. In Android Studio: right-click `res` → New → Image Asset
3. For splash: add `splash.png` to `android/app/src/main/res/drawable/`

---

## Step 8 — Run on device or emulator

**On a real Android phone:**
1. Enable Developer Options → USB Debugging on your phone
2. Connect via USB
3. In Android Studio, select your device and press ▶ Run

**On emulator:**
1. Android Studio → Device Manager → Create Virtual Device
2. Pick Pixel 7, API 34
3. Press ▶ Run

**Or from terminal:**
```bash
npm run android:run
```

---

## Step 9 — Build release APK

In Android Studio:
1. Build → Generate Signed Bundle / APK
2. Choose APK
3. Create a new keystore (save this file — you need it for every update)
4. Build → release

The APK will be at:
```
android/app/build/outputs/apk/release/app-release.apk
```

You can install this directly on any Android phone (enable "Install unknown apps" in settings).

---

## Step 10 — Publish to Google Play (optional)

1. Build → Generate Signed Bundle → Android App Bundle (.aab)
2. Create account at https://play.google.com/console ($25 one-time fee)
3. Create new app → upload the .aab file
4. Fill in store listing → Submit for review (1–3 days)

---

## Development workflow (after initial setup)

```bash
# Make changes to React code, then:
npm run build && npx cap sync android

# Live reload during development (phone on same WiFi):
npx cap run android --livereload --external
```

---

## Troubleshooting

| Problem | Fix |
|---------|-----|
| White screen | Check `base: './'` in vite.config.js |
| API calls fail | Check network_security_config.xml |
| Mic not working | Ensure RECORD_AUDIO permission in manifest |
| Google login fails | Add `com.lume.mentalwellness://` to Supabase redirect URLs |
| Keyboard covers input | Capacitor Keyboard plugin handles this automatically |
| Font not loading | Fonts load from network — ensure internet permission |

---

## File structure after setup

```
lume/
  android/          ← Android Studio project (git-ignore the /build folders)
    app/
      src/main/
        AndroidManifest.xml   ← add permissions here
        res/
          xml/
            network_security_config.xml
  dist/             ← built web app (auto-generated, don't edit)
  src/              ← your React source (edit here)
  capacitor.config.ts
  vite.config.js
  package.json
```

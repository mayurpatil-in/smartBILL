# Mobile App Setup Guide

## 1. Prerequisites (Required)

You must install **Android Studio** to build the Android app.

1. Download from: [https://developer.android.com/studio](https://developer.android.com/studio)
2. Install it and ensure you select "Android SDK", "Android SDK Platform", and "Android Virtual Device" during setup.

## 2. Install NDK (CRITICAL)

The build failed because the **NDK** (Native Development Kit) is missing.

1. Open Android Studio.
2. Go to **More Actions** (on welcome screen) > **SDK Manager**.
3. Click the **SDK Tools** tab (middle tab).
4. Check **"NDK (Side by side)"** and **"Android SDK Command-line Tools (latest)"**.
5. Click **Apply** to install.

## 3. Environment Variables

After installation, set these variables in Windows (Search "Edit the system environment variables"):

- **ANDROID_HOME**: `C:\Users\mayur\AppData\Local\Android\Sdk`
- **NDK_HOME**: `C:\Users\mayur\AppData\Local\Android\Sdk\ndk\<your-version-number>`
- **JAVA_HOME**: `C:\Program Files\Android\Android Studio\jbr`

Add to **Path**:

- `%ANDROID_HOME%\platform-tools`
- `%ANDROID_HOME%\cmdline-tools\latest\bin`

## 4. Initialize Mobile

Once prerequisites are ready, open a terminal in this `mobile` folder and run:

```powershell
npx tauri android init
```

## 5. Run on Android

To start the app on an emulator/device:

```powershell
npx tauri android dev
```

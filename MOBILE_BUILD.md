# Flint Mobile App Build Guide

This guide explains how to build the Flint iOS and Android mobile applications using Capacitor.

## Prerequisites

### For iOS (Required)
- Mac computer with macOS
- Xcode 14+ installed from the App Store
- Apple Developer account ($99/year) for App Store distribution
- CocoaPods: `sudo gem install cocoapods`

### For Android
- Android Studio installed
- JDK 17 or higher
- Google Play Developer account ($25 one-time) for Play Store distribution

## Project Structure

```
/ios                 - iOS native project (Xcode)
/android             - Android native project (Android Studio)
/capacitor.config.ts - Capacitor configuration
```

## App Configuration

- **Bundle ID (iOS)**: `com.flint.investing`
- **Package Name (Android)**: `com.flint.investing`
- **App Name**: Flint
- **Version**: 1.0.0

## Building for iOS

### 1. Export the iOS Project

Download the `/ios` folder from Replit:
1. Right-click on the `ios` folder in the Files pane
2. Select "Download as ZIP"
3. Extract on your Mac

### 2. Install Dependencies

```bash
cd ios/App
pod install
```

### 3. Open in Xcode

```bash
open App.xcworkspace
```

**Important**: Open `.xcworkspace`, not `.xcodeproj`

### 4. Configure Signing

1. Select the "App" project in the navigator
2. Go to "Signing & Capabilities" tab
3. Select your Team from your Apple Developer account
4. Let Xcode manage signing automatically

### 5. Set Deployment Target

- Minimum iOS version: 14.0 (recommended)
- Target devices: iPhone, iPad (optional)

### 6. Build and Run

- Select a simulator or connected device
- Press Cmd+R to build and run
- For App Store: Product → Archive

## Building for Android

### 1. Export the Android Project

Download the `/android` folder from Replit and extract it.

### 2. Open in Android Studio

1. Open Android Studio
2. File → Open → Select the `android` folder
3. Wait for Gradle sync to complete

### 3. Configure Signing (for release)

Create a keystore:
```bash
keytool -genkey -v -keystore flint-release.keystore -alias flint -keyalg RSA -keysize 2048 -validity 10000
```

Add to `android/app/build.gradle`:
```gradle
signingConfigs {
    release {
        storeFile file("flint-release.keystore")
        storePassword "your-password"
        keyAlias "flint"
        keyPassword "your-password"
    }
}
```

### 4. Build APK/AAB

- Debug APK: Build → Build Bundle(s) / APK(s) → Build APK(s)
- Release AAB: Build → Generate Signed Bundle / APK

## Updating the App

After making changes to the web app:

```bash
npm run build          # Build the web assets
npx cap sync           # Sync to native projects
```

Then re-export the ios/android folders and rebuild.

## App Store Submission Checklist

### iOS App Store
- [ ] App icons (all required sizes)
- [ ] Launch screen configured
- [ ] Privacy policy URL
- [ ] App Store screenshots
- [ ] App description and metadata
- [ ] Review guidelines compliance
- [ ] Financial app disclosures (if applicable)

### Google Play Store
- [ ] App icons (512x512 minimum)
- [ ] Feature graphic
- [ ] Screenshots for different device sizes
- [ ] Privacy policy URL
- [ ] Content rating questionnaire
- [ ] Target audience declarations

## App Icons

Place app icons in:
- iOS: `ios/App/App/Assets.xcassets/AppIcon.appiconset/`
- Android: `android/app/src/main/res/mipmap-*/`

Icon sizes needed:
- iOS: 20, 29, 40, 60, 76, 83.5, 1024 (various @1x, @2x, @3x)
- Android: 48, 72, 96, 144, 192 (mdpi, hdpi, xhdpi, xxhdpi, xxxhdpi)

## Splash Screen

Configure in `capacitor.config.ts`:
```typescript
plugins: {
  SplashScreen: {
    launchShowDuration: 2000,
    backgroundColor: '#F4F2ED',
    showSpinner: false
  }
}
```

## Troubleshooting

### iOS: "No code signing identity found"
- Ensure you're signed into Xcode with your Apple Developer account
- Check that your provisioning profile is valid

### Android: "SDK location not found"
- Create `local.properties` in android folder with:
  `sdk.dir=/path/to/Android/sdk`

### App shows blank white screen
- Check that `dist/public` folder exists and has content
- Run `npm run build && npx cap sync`

## Support

For Capacitor-specific issues: https://capacitorjs.com/docs

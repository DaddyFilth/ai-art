# App Build Guide for Google Play

This guide covers building the AI Art Exchange application for Google Play Store submission.

---

## Deployment Options

The AI Art Exchange platform can be deployed to Google Play using one of these approaches:

### Option 1: Trusted Web Activity (TWA) - Recommended for Web Apps
Package the existing Next.js web application as an Android app using TWA.

### Option 2: Progressive Web App (PWA)
Deploy as a PWA that users can install from the web and optionally submit to Play Store.

### Option 3: Native Android App
Build a dedicated Android application (future consideration).

---

## Option 1: Trusted Web Activity (TWA)

TWA allows you to package your web app as an Android app with minimal code.

### Prerequisites
- Android Studio installed
- JDK 17 or higher
- Node.js and npm
- Your web app deployed and accessible via HTTPS

### Step 1: Install Bubblewrap

```bash
npm install -g @bubblewrap/cli
```

### Step 2: Initialize TWA Project

```bash
bubblewrap init --manifest https://aiartexchange.com/manifest.json
```

Answer the prompts:
- **Application name:** AI Art Exchange
- **Package name:** com.aiartexchange.app
- **Host:** aiartexchange.com
- **Start URL:** /
- **Theme color:** [Your brand color]
- **Background color:** [Your background color]
- **Navigation color:** [Your nav color]
- **Display mode:** standalone
- **Orientation:** any
- **Icon:** URL to your 512x512 icon
- **Maskable icon:** URL to your maskable icon

### Step 3: Configure Digital Asset Links

Create a file at `https://aiartexchange.com/.well-known/assetlinks.json`:

```json
[{
  "relation": ["delegate_permission/common.handle_all_urls"],
  "target": {
    "namespace": "android_app",
    "package_name": "com.aiartexchange.app",
    "sha256_cert_fingerprints": [
      "YOUR_RELEASE_KEY_SHA256_FINGERPRINT"
    ]
  }
}]
```

To get your fingerprint:
```bash
keytool -list -v -keystore release.keystore
```

### Step 4: Build the TWA

```bash
bubblewrap build
```

This generates:
- `app-release-signed.apk` or
- `app-release-bundle.aab` (recommended for Play Store)

### Step 5: Test the TWA

```bash
bubblewrap install
```

Or manually install:
```bash
adb install app/build/outputs/apk/release/app-release-signed.apk
```

### Step 6: Prepare for Production

Update `twa-manifest.json` with production values:
- Confirm package name
- Set correct host and start URL
- Add all necessary permissions
- Configure shortcuts (optional)
- Set up notifications (if applicable)

---

## Option 2: Progressive Web App (PWA)

Make the Next.js app installable as a PWA.

### Step 1: Create Web App Manifest

Create `frontend/public/manifest.json`:

```json
{
  "name": "AI Art Exchange",
  "short_name": "AI Art",
  "description": "Create, sell, and collect AI-generated digital art",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#ffffff",
  "theme_color": "#000000",
  "orientation": "any",
  "categories": ["art", "creativity", "marketplace"],
  "icons": [
    {
      "src": "/icons/icon-72x72.png",
      "sizes": "72x72",
      "type": "image/png"
    },
    {
      "src": "/icons/icon-96x96.png",
      "sizes": "96x96",
      "type": "image/png"
    },
    {
      "src": "/icons/icon-128x128.png",
      "sizes": "128x128",
      "type": "image/png"
    },
    {
      "src": "/icons/icon-144x144.png",
      "sizes": "144x144",
      "type": "image/png"
    },
    {
      "src": "/icons/icon-152x152.png",
      "sizes": "152x152",
      "type": "image/png"
    },
    {
      "src": "/icons/icon-192x192.png",
      "sizes": "192x192",
      "type": "image/png"
    },
    {
      "src": "/icons/icon-384x384.png",
      "sizes": "384x384",
      "type": "image/png"
    },
    {
      "src": "/icons/icon-512x512.png",
      "sizes": "512x512",
      "type": "image/png",
      "purpose": "any maskable"
    }
  ]
}
```

### Step 2: Link Manifest in HTML

Update `frontend/src/app/layout.tsx`:

```tsx
export const metadata = {
  manifest: '/manifest.json',
  // ... other metadata
};
```

### Step 3: Add Service Worker

Create `frontend/public/sw.js`:

```javascript
// Basic service worker for offline functionality
const CACHE_NAME = 'ai-art-exchange-v1';
const urlsToCache = [
  '/',
  '/generate',
  '/marketplace',
  '/dashboard',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(urlsToCache))
  );
});

self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request)
      .then((response) => response || fetch(event.request))
  );
});
```

### Step 4: Register Service Worker

Create `frontend/public/register-sw.js`:

```javascript
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js')
      .then(reg => console.log('SW registered:', reg))
      .catch(err => console.log('SW registration failed:', err));
  });
}
```

Include in your layout or `_document.tsx`.

### Step 5: Test PWA

1. Build and deploy to production
2. Open in Chrome
3. Check Application tab in DevTools
4. Verify manifest and service worker
5. Test "Add to Home Screen"

### Step 6: Submit PWA to Play Store

Use Bubblewrap to wrap your PWA:
```bash
bubblewrap init --manifest https://aiartexchange.com/manifest.json
bubblewrap build
```

---

## Signing the App

### Generate Release Keystore

```bash
keytool -genkey -v -keystore release.keystore \
  -alias aiartexchange \
  -keyalg RSA \
  -keysize 2048 \
  -validity 10000
```

**IMPORTANT:** 
- Store keystore securely
- Back up to multiple locations
- Never commit to version control
- Document password in secure location

### Sign the APK/AAB

If using Bubblewrap, it handles signing automatically.

For manual signing:
```bash
jarsigner -verbose -sigalg SHA256withRSA -digestalg SHA-256 \
  -keystore release.keystore \
  app-release-unsigned.apk aiartexchange
```

Or use Android Studio's signing wizard.

---

## Build Configuration

### Version Information

Update `twa-manifest.json` or `build.gradle`:

```json
{
  "versionCode": 1,
  "versionName": "1.0.0"
}
```

Version code must increment with each release.

### Permissions

Required permissions for TWA:
```xml
<uses-permission android:name="android.permission.INTERNET" />
```

Optional permissions:
```xml
<uses-permission android:name="android.permission.CAMERA" />
<uses-permission android:name="android.permission.WRITE_EXTERNAL_STORAGE" />
```

Only request permissions you actually need.

---

## Testing Checklist

### Pre-Build Testing
- [ ] Web app fully functional on HTTPS
- [ ] All features working in mobile browsers
- [ ] Responsive design tested on various screen sizes
- [ ] Performance optimized (Lighthouse score)
- [ ] PWA manifest valid
- [ ] Service worker registered correctly

### Post-Build Testing
- [ ] Install APK/AAB on test device
- [ ] Test all core features
- [ ] Verify authentication flow
- [ ] Test payment processing
- [ ] Check offline functionality (if applicable)
- [ ] Verify proper app icon and splash screen
- [ ] Test deep linking
- [ ] Check for crashes or errors
- [ ] Test on multiple Android versions
- [ ] Verify permissions work correctly

### Device Testing
Test on:
- [ ] Android 8 (API 26)
- [ ] Android 9 (API 28)
- [ ] Android 10 (API 29)
- [ ] Android 11 (API 30)
- [ ] Android 12+ (API 31+)
- [ ] Various screen sizes (phone, tablet)
- [ ] Different manufacturers (Samsung, Google, etc.)

---

## Upload to Play Console

### Step 1: Create App in Play Console
1. Go to https://play.google.com/console
2. Click "Create app"
3. Fill in app details
4. Select categories and tags

### Step 2: Upload AAB/APK
1. Navigate to "Production" or "Testing" track
2. Click "Create new release"
3. Upload `app-release-bundle.aab` (preferred) or APK
4. Fill in release notes
5. Review and roll out

### Step 3: Complete Store Listing
Use content from:
- STORE_LISTING.md
- STORE_ASSETS.md
- Upload all required graphics

### Step 4: Fill Data Safety
Use DATA_SAFETY.md as reference

### Step 5: Complete Content Rating
Use CONTENT_RATING.md answers

### Step 6: Set Pricing & Distribution
- Select countries
- Set free/paid
- Configure in-app products

---

## Continuous Integration (Optional)

### GitHub Actions Example

Create `.github/workflows/android-build.yml`:

```yaml
name: Android Build

on:
  push:
    tags:
      - 'v*'

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Set up JDK
        uses: actions/setup-java@v5
        with:
          java-version: '17'
          distribution: 'temurin'
      
      - name: Install Bubblewrap
        run: npm install -g @bubblewrap/cli
      
      - name: Build TWA
        run: bubblewrap build
        
      - name: Upload artifact
        uses: actions/upload-artifact@v6
        with:
          name: app-release
          path: app/build/outputs/bundle/release/app-release.aab
```

---

## Troubleshooting

### Common Issues

**Digital Asset Links not verified:**
- Ensure `assetlinks.json` is accessible
- Verify SHA256 fingerprint is correct
- Wait up to 24 hours for verification

**App not installing:**
- Check minimum SDK version
- Verify APK is signed correctly
- Check device compatibility

**TWA not recognized as app:**
- Ensure proper Digital Asset Links
- Verify start URL is correct
- Check that web app is HTTPS

**Features not working:**
- Check permissions are declared
- Verify web app compatibility
- Test in mobile browser first

---

## Security Best Practices

- [ ] Use HTTPS for all connections
- [ ] Implement certificate pinning (optional)
- [ ] Secure all API keys
- [ ] Enable ProGuard/R8 for code obfuscation
- [ ] Validate all user input
- [ ] Implement proper authentication
- [ ] Use secure storage for sensitive data

---

## Performance Optimization

- [ ] Minimize APK/AAB size
- [ ] Enable R8 shrinking
- [ ] Optimize images and assets
- [ ] Implement lazy loading
- [ ] Cache static resources
- [ ] Minimize network requests
- [ ] Use WebP for images

---

## Post-Launch

### Monitoring
- Set up Firebase Crashlytics
- Monitor Play Console vitals
- Track ANR (App Not Responding) rates
- Monitor crash-free users percentage

### Updates
- Plan regular updates
- Monitor user reviews
- Fix critical bugs quickly
- Add new features based on feedback

---

## Resources

### Documentation
- [Bubblewrap CLI](https://github.com/GoogleChromeLabs/bubblewrap)
- [PWA Documentation](https://web.dev/progressive-web-apps/)
- [Android Asset Links](https://developers.google.com/digital-asset-links)
- [Play Console Help](https://support.google.com/googleplay/android-developer)

### Tools
- Android Studio: https://developer.android.com/studio
- Bubblewrap: https://www.npmjs.com/package/@bubblewrap/cli
- PWA Builder: https://www.pwabuilder.com/

---

## Contact

**Build Issues:** dev@aiartexchange.com
**Play Store Questions:** support@aiartexchange.com

---

## Last Updated
February 11, 2026

---

**Note:** This guide assumes you're using TWA for a web-first approach. Adjust based on your specific needs.

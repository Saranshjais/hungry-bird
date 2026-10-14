# HungryBird — Flutter mobile app

The Android / iOS app for HungryBird: discover street-food stalls and hidden gems, see them on a map, save
favourites, write reviews and suggest new stalls. It talks to the Flask API in [`../backend`](../backend) and is
managed from the admin panel at `/admin` on the website (banners, categories, announcements, maintenance mode,
minimum app version, push/in-app notifications).

## Features

| Area | What it does |
| --- | --- |
| **Home** | City picker, notification inbox, search, admin-managed announcement strip + banner carousel, craving categories, Hidden gems, Near you (GPS, 5 km), Most loved, food trails, community reviews, "Suggest a stall" |
| **Explore** | Debounced search across name / dish / area, filter chips (city or all cities, hidden gems, local legends, categories), sort (top rated, most reviewed, newest, nearest), recent + popular searches, infinite scroll |
| **Map** | OpenStreetMap with colour-coded pins (purple = hidden gem), tap-to-preview card, directions, my-location, hidden-gems-only toggle |
| **Vendor page** | Hero image, badges, rating summary + distribution, quick actions (directions, call, share, review), hours / price / address / socials, about, mini-map, reviews (write, edit your own, report), nearby stalls, report listing |
| **Saved** | Works for guests (stored on the device) and syncs to the account on login |
| **Suggest a stall** | Form with city, category, price band, address, pin via GPS or draggable map picker, optional Google Maps link and rating |
| **Profile** | Login / register, edit profile, change password, my suggestions (with moderation status + notes), my reviews, theme (system / light / dark), notification preference, help & FAQ with support form, about, privacy / terms, delete account |
| **Ops** | Maintenance screen and forced-update gate driven by the admin panel, cold-start friendly timeouts, offline-tolerant session restore, deep links bootstrap correctly |

## Project layout

```
lib/
├── main.dart / app.dart        # bootstrap, providers, MaterialApp.router
├── core/                       # config, theme, router, API client, formatters, link helpers
├── models/                     # Vendor, City, Review, AppUser, app content (banners, categories, settings…)
├── services/                   # typed API (hungry_bird_api.dart), local storage, location
├── state/                      # ChangeNotifier providers (auth, cities, favourites, config, notifications, prefs)
├── screens/                    # one folder/file per screen
└── widgets/                    # shared UI (cards, vendor browser, city picker, empty/error states)
test/                           # model/formatter unit tests + full-app widget test against a fake backend
```

## Running

Requires a recent stable Flutter (developed and tested on 3.47 / Dart 3.13).

```bash
cd hungry_bird_app
flutter pub get

# Against the production API (default)
flutter run

# Against a local backend (`cd backend && flask run --host 0.0.0.0`)
flutter run --dart-define=API_BASE_URL=http://10.0.2.2:5000      # Android emulator
flutter run --dart-define=API_BASE_URL=http://192.168.1.20:5000  # real phone on the same Wi-Fi
```

| `--dart-define` | Default | Purpose |
| --- | --- | --- |
| `API_BASE_URL` | `https://hungry-bird-jye4.onrender.com` | Flask backend root (no `/api`) |
| `WEBSITE_URL` | `https://hungry-bird-gamma.vercel.app` | Share links, privacy & terms pages |

Debug builds allow plain-`http` traffic so local servers work; release builds require `https`.

## Quality checks

```bash
flutter analyze
flutter test
```

## Releasing

1. Bump `version:` in `pubspec.yaml` (e.g. `1.1.0+2`). To force old installs to update, raise
   **Admin → App Settings → Configuration → Minimum app version**.
2. Android signing: create `android/key.properties` (git-ignored):
   ```properties
   storePassword=…
   keyPassword=…
   keyAlias=upload
   storeFile=/absolute/path/to/upload-keystore.jks
   ```
   Without it, release builds fall back to the debug key (fine for testing, not for the Play Store).
3. Build: `flutter build appbundle --release` (Play Store) or `flutter build ipa --release` (App Store, on macOS).
4. Put the store URLs into **Admin → App Settings → Configuration** so "Update now" and "Rate the app" work.

Icons and splash screens are generated from `assets/branding/`:

```bash
dart run flutter_launcher_icons
dart run flutter_native_splash:create
```

## Notes

- Map tiles come from the public OpenStreetMap tile server, which is fine for development and small apps.
  For heavy production traffic switch `AppConfig.mapTileUrl` to a hosted tile provider (MapTiler, Stadia, Mapbox…).
- Broadcast notifications from the admin panel always appear in the in-app inbox (bell icon). Device push
  delivery currently goes through Expo tokens (used by the older React Native app); adding Firebase Cloud
  Messaging for this app needs a Firebase project (`google-services.json` / `GoogleService-Info.plist`).
- Fonts: Plus Jakarta Sans (SIL Open Font License, see `assets/fonts/OFL.txt`), bundled so the first launch
  doesn't depend on a font CDN.

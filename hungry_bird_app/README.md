# 🦅 Hungry Bird — Flutter Mobile Application

A modern, high-performance Flutter mobile application for discovering street food vendors, hidden gems, ratings, reviews, and community stall submissions.

---

## 🎨 Features
- **Modern Material 3 Design**: Vibrant warm amber & orange palette (`#FF6B35`), curved cards, dark mode support.
- **City & Category Exploration**: Horizontal story chips for cities (Jaipur, Delhi, Mumbai, etc.) and category search.
- **Interactive OpenStreetMap Integration**: Live map view with custom markers for vendor locations (`flutter_map`).
- **One-Tap Directions**: Launches Google Maps navigation directly to the food stall.
- **Hidden Gems & Verified Badges**: Highlights local secret food spots.
- **Review System & Ratings**: Rating bar, full user review list, and modal bottom sheet to submit reviews.
- **Community Stall Submissions**: Form wizard to submit new street food stalls.
- **Saved / Favorites**: Instant bookmarking synced via local state.
- **Flask REST API Integration**: Directly consumes backend endpoints (`/api/vendors`, `/api/cities`, `/api/reviews`).

---

## 📁 Directory Architecture
```
hungry_bird_app/
├── lib/
│   ├── main.dart                  # Entrypoint & MultiProvider config
│   ├── core/
│   │   ├── theme.dart             # Light & Dark Material 3 Themes
│   │   └── api_config.dart        # Flask API endpoints (dynamic IP / localhost)
│   ├── models/
│   │   ├── vendor.dart            # Vendor data model with badges & reviews
│   │   ├── city.dart              # City model
│   │   ├── review.dart            # Review model
│   │   └── user.dart              # User authentication model
│   ├── services/
│   │   └── api_service.dart       # HTTP client & offline fallback handling
│   ├── providers/
│   │   ├── auth_provider.dart     # User login & session state
│   │   └── vendor_provider.dart   # Vendor list, filters, search & favorites
│   └── views/
│       ├── main_navigation.dart   # Bottom navigation bar
│       ├── home/                  # Home explore feed & search bar
│       ├── vendor/                # Vendor detail screen with interactive map
│       ├── submit/                # Food stall submission form
│       ├── saved/                 # Bookmarks screen
│       └── profile/               # User account & auth modals
└── pubspec.yaml                   # Dependencies & assets configuration
```

---

## 🚀 How to Run

1. **Install Flutter SDK** (if not already installed):
   - Download Flutter SDK from [flutter.dev](https://docs.flutter.dev/get-started/install/windows/mobile)
   - Add `C:\path\to\flutter\bin` to your environment variables `PATH`.

2. **Fetch Dependencies**:
   ```bash
   cd hungry_bird_app
   flutter pub get
   ```

3. **Start the Flask Backend Server**:
   ```bash
   cd backend
   python run.py
   ```

4. **Run the Flutter Mobile App**:
   ```bash
   cd hungry_bird_app
   flutter run
   ```

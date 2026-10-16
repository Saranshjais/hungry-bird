import 'package:flutter/material.dart';

import '../services/local_store.dart';

/// Device-local preferences (theme, onboarding, recent searches, chosen city).
class PreferencesProvider extends ChangeNotifier {
  PreferencesProvider(this._store) {
    _themeMode = switch (_store.getString(_kTheme)) {
      'light' => ThemeMode.light,
      'dark' => ThemeMode.dark,
      _ => ThemeMode.system,
    };
  }

  final LocalStore _store;

  static const _kTheme = 'pref_theme';
  static const _kOnboarding = 'pref_onboarding_done';
  static const _kRecent = 'pref_recent_searches';
  static const _kCity = 'pref_city';
  static const _kSeenNotification = 'pref_seen_notification';
  static const _kDismissedUpdate = 'pref_update_dismissed';

  late ThemeMode _themeMode;

  ThemeMode get themeMode => _themeMode;
  bool get onboardingDone => _store.getBool(_kOnboarding);
  List<String> get recentSearches => _store.getStringList(_kRecent);
  String? get citySlug => _store.getString(_kCity);
  int get lastSeenNotificationId => _store.getInt(_kSeenNotification);

  Future<void> setThemeMode(ThemeMode mode) async {
    _themeMode = mode;
    notifyListeners();
    await _store.setString(_kTheme, mode == ThemeMode.system ? null : mode.name);
  }

  Future<void> completeOnboarding() async {
    await _store.setBool(_kOnboarding, true);
    notifyListeners();
  }

  Future<void> setCitySlug(String slug) => _store.setString(_kCity, slug);

  Future<void> addRecentSearch(String query) async {
    final q = query.trim();
    if (q.length < 2) return;
    final list = [q, ...recentSearches.where((s) => s.toLowerCase() != q.toLowerCase())].take(8).toList();
    await _store.setStringList(_kRecent, list);
    notifyListeners();
  }

  Future<void> removeRecentSearch(String query) async {
    await _store.setStringList(_kRecent, recentSearches.where((s) => s != query).toList());
    notifyListeners();
  }

  Future<void> clearRecentSearches() async {
    await _store.setStringList(_kRecent, const []);
    notifyListeners();
  }

  Future<void> setLastSeenNotificationId(int id) async {
    await _store.setInt(_kSeenNotification, id);
    notifyListeners();
  }

  /// The latest app version whose optional-update prompt was dismissed ("Later").
  String? get dismissedUpdateVersion => _store.getString(_kDismissedUpdate);

  Future<void> dismissUpdate(String version) => _store.setString(_kDismissedUpdate, version);
}

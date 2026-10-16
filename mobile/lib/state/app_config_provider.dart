import 'package:flutter/foundation.dart';

import '../core/api_client.dart';
import '../core/config.dart';
import '../models/app_content.dart';
import '../services/hungry_bird_api.dart';

/// Remote app configuration managed from the admin panel (settings, banners, categories).
class AppConfigProvider extends ChangeNotifier {
  AppConfigProvider(this._api);

  final HungryBirdApi _api;

  AppSettings _settings = const AppSettings();
  List<AppBanner> _banners = const [];
  // Offline fallback until the first successful load (see FoodCategory.defaults).
  List<FoodCategory> _categories = FoodCategory.defaults;
  final Map<String, List<FoodCategory>> _cityCategories = {};
  final Set<String> _loadingCities = {};
  bool _loaded = false;
  String? _error;

  AppSettings get settings => _settings;
  bool get loaded => _loaded;
  String? get error => _error;
  List<FoodCategory> get categories => _categories;

  /// Admin banners, or bundled brand artwork when none are published.
  List<AppBanner> get banners => _banners.isNotEmpty ? _banners : AppBanner.fallback;

  /// Public website for share links and legal pages: the admin's setting, else the build default.
  String get websiteUrl {
    final url = _settings.websiteUrl.isNotEmpty ? _settings.websiteUrl : AppConfig.websiteUrl;
    return url.endsWith('/') ? url.substring(0, url.length - 1) : url;
  }

  FoodCategory? categoryBySlug(String? slug) {
    if (slug == null) return null;
    for (final c in _categories) {
      if (c.slug == slug) return c;
    }
    return null;
  }

  Future<void> load() async {
    try {
      final config = await _api.getAppConfig();
      _settings = config.settings;
      _banners = config.banners;
      // An empty list is the admin's answer, not an outage: show no categories.
      _categories = config.categories;
      _error = null;
    } on ApiException catch (e) {
      // Request failed (offline / older server without /app/config): keep what we have —
      // the bundled FoodCategory.defaults on a cold start — but remember real outages.
      _error = e.isNotFound ? null : e.message;
    }
    _loaded = true;
    notifyListeners();
  }

  /// Categories with stalls in [city] (`/api/categories?city=`), cached per city. Null until loaded.
  List<FoodCategory>? cityCategories(String? city) => city == null ? null : _cityCategories[city];

  Future<void> loadCityCategories(String city) async {
    if (_cityCategories.containsKey(city) || !_loadingCities.add(city)) return;
    try {
      _cityCategories[city] = await _api.getCategories(city: city);
      notifyListeners();
    } on ApiException {
      // No suggestions (rather than another city's); asked again next time.
    } finally {
      _loadingCities.remove(city);
    }
  }
}

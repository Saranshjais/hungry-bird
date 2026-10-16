import 'package:flutter/foundation.dart';

import '../core/api_client.dart';
import '../models/app_content.dart';
import '../services/hungry_bird_api.dart';

/// Remote app configuration managed from the admin panel (settings, banners, categories).
class AppConfigProvider extends ChangeNotifier {
  AppConfigProvider(this._api);

  final HungryBirdApi _api;

  AppSettings _settings = const AppSettings();
  List<AppBanner> _banners = const [];
  List<FoodCategory> _categories = FoodCategory.defaults;
  bool _loaded = false;
  String? _error;

  AppSettings get settings => _settings;
  bool get loaded => _loaded;
  String? get error => _error;
  List<FoodCategory> get categories => _categories;

  /// Admin banners, or bundled brand artwork when none are published.
  List<AppBanner> get banners => _banners.isNotEmpty ? _banners : AppBanner.fallback;

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
      if (config.categories.isNotEmpty) _categories = config.categories;
      _error = null;
    } on ApiException catch (e) {
      // Older servers don't expose /app/config; keep defaults but remember real outages.
      _error = e.isNotFound ? null : e.message;
    }
    _loaded = true;
    notifyListeners();
  }
}

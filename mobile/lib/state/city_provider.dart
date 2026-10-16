import 'package:flutter/foundation.dart';

import '../core/api_client.dart';
import '../models/city.dart';
import '../services/hungry_bird_api.dart';
import '../services/local_store.dart';

class CityProvider extends ChangeNotifier {
  CityProvider(this._api, this._store) {
    final cached = _store.getJson(_kCache);
    if (cached is List) {
      _cities = cached.map((c) => City.fromJson(Map<String, dynamic>.from(c as Map))).toList();
    }
    _selected = _find(_store.getString(_kCity));
  }

  final HungryBirdApi _api;
  final LocalStore _store;

  static const _kCache = 'cache_cities';
  static const _kCity = 'pref_city';

  List<City> _cities = const [];
  City? _selected;
  bool _loading = false;
  String? _error;

  List<City> get cities => _cities;
  bool get loading => _loading;
  String? get error => _error;

  /// The city the user is exploring (falls back to the first city).
  City? get selected => _selected ?? (_cities.isNotEmpty ? _cities.first : null);
  String? get selectedSlug => selected?.slug;

  City? _find(String? slug) {
    if (slug == null) return null;
    for (final c in _cities) {
      if (c.slug == slug) return c;
    }
    return null;
  }

  Future<void> load({String? defaultSlug}) async {
    _loading = true;
    notifyListeners();
    try {
      final list = await _api.getCities();
      // Cities with vendors first, then alphabetical.
      list.sort((a, b) {
        final byCount = (b.vendorCount > 0 ? 1 : 0).compareTo(a.vendorCount > 0 ? 1 : 0);
        return byCount != 0 ? byCount : a.name.compareTo(b.name);
      });
      _cities = list;
      _error = null;
      await _store.setJson(_kCache, list.map((c) => c.toJson()).toList());
    } on ApiException catch (e) {
      _error = e.message;
    }
    _selected = _find(_store.getString(_kCity)) ?? _find(defaultSlug) ?? _find(_selected?.slug);
    _loading = false;
    notifyListeners();
  }

  Future<void> select(City city) async {
    _selected = city;
    notifyListeners();
    await _store.setString(_kCity, city.slug);
  }

  Future<void> selectSlug(String slug) async {
    final city = _find(slug);
    if (city != null) await select(city);
  }
}

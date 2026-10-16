import 'package:flutter/foundation.dart';

import '../core/api_client.dart';
import '../models/vendor.dart';
import '../services/hungry_bird_api.dart';
import '../services/local_store.dart';
import 'auth_provider.dart';

/// Saved stalls. Guests keep them on the device; signed-in users sync with the server
/// (anything saved as a guest is merged into the account on login).
class FavoritesProvider extends ChangeNotifier {
  FavoritesProvider(this._api, this._store) {
    _loadGuest();
  }

  final HungryBirdApi _api;
  final LocalStore _store;

  static const _kGuest = 'guest_favorites';

  final Map<int, Vendor> _items = {};
  bool _loading = false;
  String? _error;
  bool _signedIn = false;

  List<Vendor> get items => _items.values.toList().reversed.toList();
  int get count => _items.length;
  bool get loading => _loading;
  String? get error => _error;

  bool isSaved(int vendorId) => _items.containsKey(vendorId);

  /// Called by the provider tree whenever auth changes.
  void bindAuth(AuthProvider auth) {
    if (auth.status == AuthStatus.unknown) return;
    final signedIn = auth.isLoggedIn;
    if (signedIn == _signedIn) return;
    _signedIn = signedIn;
    // This runs while the provider tree rebuilds; notify listeners only after the frame.
    Future.microtask(() {
      if (signedIn) {
        _mergeGuestIntoAccount();
      } else {
        _items.clear();
        _loadGuest();
        notifyListeners();
      }
    });
  }

  void _loadGuest() {
    final data = _store.getJson(_kGuest);
    if (data is List) {
      for (final raw in data) {
        final v = Vendor.fromJson(Map<String, dynamic>.from(raw as Map));
        _items[v.id] = v;
      }
    }
  }

  Future<void> _persistGuest() =>
      _store.setJson(_kGuest, _items.values.map((v) => v.toJson()).toList());

  Future<void> _mergeGuestIntoAccount() async {
    final guestIds = _items.keys.toList();
    if (guestIds.isNotEmpty) {
      try {
        await _api.syncFavorites(guestIds);
        await _store.setJson(_kGuest, null);
      } on ApiException {
        // Keep them locally and try again next login.
      }
    }
    await refresh();
  }

  Future<void> refresh() async {
    if (!_signedIn) {
      notifyListeners();
      return;
    }
    _loading = true;
    notifyListeners();
    try {
      final list = await _api.getFavorites();
      _items
        ..clear()
        ..addEntries(list.reversed.map((v) => MapEntry(v.id, v)));
      _error = null;
    } on ApiException catch (e) {
      _error = e.message;
    } finally {
      _loading = false;
      notifyListeners();
    }
  }

  /// Toggles a vendor and returns whether it is now saved. Throws [ApiException] on failure.
  Future<bool> toggle(Vendor vendor) async {
    final wasSaved = isSaved(vendor.id);
    if (wasSaved) {
      _items.remove(vendor.id);
    } else {
      _items[vendor.id] = vendor;
    }
    notifyListeners();

    if (!_signedIn) {
      await _persistGuest();
      return !wasSaved;
    }

    try {
      final saved = await _api.toggleFavorite(vendor.id);
      if (saved != !wasSaved) {
        // Server state differed; follow it.
        if (saved) {
          _items[vendor.id] = vendor;
        } else {
          _items.remove(vendor.id);
        }
        notifyListeners();
      }
      return saved;
    } on ApiException {
      if (wasSaved) {
        _items[vendor.id] = vendor;
      } else {
        _items.remove(vendor.id);
      }
      notifyListeners();
      rethrow;
    }
  }

  /// Keeps the server's view when a detail page reports a different favourite state.
  void reconcile(Vendor vendor, bool savedOnServer) {
    if (!_signedIn || savedOnServer == isSaved(vendor.id)) return;
    if (savedOnServer) {
      _items[vendor.id] = vendor;
    } else {
      _items.remove(vendor.id);
    }
    notifyListeners();
  }
}

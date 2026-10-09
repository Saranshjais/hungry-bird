import 'package:flutter/foundation.dart';

import '../core/api_client.dart';
import '../models/app_content.dart';
import '../services/hungry_bird_api.dart';
import 'preferences_provider.dart';

/// Announcements broadcast from the admin panel.
class NotificationsProvider extends ChangeNotifier {
  NotificationsProvider(this._api, this._prefs);

  final HungryBirdApi _api;
  final PreferencesProvider _prefs;

  List<AppNotification> _items = const [];
  bool _loading = false;
  String? _error;

  List<AppNotification> get items => _items;
  bool get loading => _loading;
  String? get error => _error;

  int get unreadCount => _items.where((n) => n.id > _prefs.lastSeenNotificationId).length;

  bool isUnread(AppNotification n) => n.id > _prefs.lastSeenNotificationId;

  Future<void> load({String? city}) async {
    _loading = true;
    notifyListeners();
    try {
      _items = await _api.getNotifications(city: city);
      _error = null;
    } on ApiException catch (e) {
      _error = e.isNotFound ? null : e.message;
    } finally {
      _loading = false;
      notifyListeners();
    }
  }

  Future<void> markAllRead() async {
    if (_items.isEmpty) return;
    final maxId = _items.map((n) => n.id).reduce((a, b) => a > b ? a : b);
    if (maxId > _prefs.lastSeenNotificationId) {
      await _prefs.setLastSeenNotificationId(maxId);
      notifyListeners();
    }
  }
}

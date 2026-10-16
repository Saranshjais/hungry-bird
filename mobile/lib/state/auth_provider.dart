import 'package:flutter/foundation.dart';

import '../core/api_client.dart';
import '../models/user.dart';
import '../services/hungry_bird_api.dart';
import '../services/local_store.dart';

enum AuthStatus { unknown, guest, authenticated }

class AuthProvider extends ChangeNotifier {
  AuthProvider(this._api, this._store);

  final HungryBirdApi _api;
  final LocalStore _store;

  static const _kUser = 'cache_user';

  AuthStatus _status = AuthStatus.unknown;
  AppUser? _user;

  AuthStatus get status => _status;
  AppUser? get user => _user;
  bool get isLoggedIn => _status == AuthStatus.authenticated && _user != null;

  /// Restores a saved session. Works offline using the cached profile.
  Future<void> init() async {
    final token = await _store.readToken();
    if (token == null) {
      _setGuest();
      return;
    }
    _api.token = token;
    final cached = _store.getJson(_kUser);
    if (cached is Map) {
      _user = AppUser.fromJson(Map<String, dynamic>.from(cached));
      _status = AuthStatus.authenticated;
      notifyListeners();
    }
    try {
      _user = await _api.me();
      _status = AuthStatus.authenticated;
      await _store.setJson(_kUser, _user!.toJson());
      notifyListeners();
    } on ApiException catch (e) {
      if (e.isUnauthorized || e.isForbidden) {
        await logout();
      } else if (_user == null) {
        // Server unreachable and nothing cached: stay signed in once it's back.
        _status = AuthStatus.authenticated;
        _user = const AppUser(id: 0, name: 'Foodie', email: '');
        notifyListeners();
      }
    }
  }

  Future<void> login(String email, String password) async {
    final result = await _api.login(email.trim(), password);
    await _startSession(result);
  }

  Future<void> register(String name, String email, String password) async {
    final result = await _api.register(name.trim(), email.trim(), password);
    await _startSession(result);
  }

  Future<void> _startSession(AuthResult result) async {
    _api.token = result.token;
    _user = result.user;
    _status = AuthStatus.authenticated;
    await _store.writeToken(result.token);
    await _store.setJson(_kUser, result.user.toJson());
    notifyListeners();
  }

  Future<void> logout() async {
    _api.token = null;
    await _store.writeToken(null);
    await _store.setJson(_kUser, null);
    _setGuest();
  }

  void _setGuest() {
    _user = null;
    _status = AuthStatus.guest;
    notifyListeners();
  }

  Future<void> updateProfile({required String name, required String email, String? phone}) async {
    _user = await _api.updateProfile(name: name.trim(), email: email.trim(), phone: phone?.trim());
    await _store.setJson(_kUser, _user!.toJson());
    notifyListeners();
  }

  Future<void> changePassword(String current, String next) => _api.changePassword(current, next);

  Future<void> setNotificationsEnabled(bool enabled) async {
    final previous = _user;
    if (previous == null) return;
    _user = previous.copyWith(notificationsEnabled: enabled);
    notifyListeners();
    try {
      await _api.setNotificationsEnabled(enabled);
      await _store.setJson(_kUser, _user!.toJson());
    } catch (_) {
      _user = previous;
      notifyListeners();
      rethrow;
    }
  }

  Future<void> deleteAccount() async {
    await _api.deleteAccount();
    await logout();
  }
}

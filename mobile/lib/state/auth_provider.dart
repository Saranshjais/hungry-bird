import 'package:flutter/foundation.dart';

import '../core/api_client.dart';
import '../models/user.dart';
import '../services/hungry_bird_api.dart';
import '../services/local_store.dart';

enum AuthStatus { unknown, guest, authenticated }

class AuthProvider extends ChangeNotifier {
  AuthProvider(this._api, this._store) {
    // Any 401 on a request that carried our token (expired, revoked by a password change or
    // reset, or minted before a server upgrade): forget the session and carry on as a guest.
    _api.onSessionExpired = () {
      if (_status == AuthStatus.authenticated) logout();
    };
  }

  final HungryBirdApi _api;
  final LocalStore _store;

  static const _kUser = 'cache_user';

  AuthStatus _status = AuthStatus.unknown;
  AppUser? _user;
  DateTime? _codeResendAt;

  AuthStatus get status => _status;
  AppUser? get user => _user;
  bool get isLoggedIn => _status == AuthStatus.authenticated && _user != null;
  bool get needsEmailVerification => isLoggedIn && !(_user?.emailVerified ?? true);

  /// Seconds until another verification code may be requested (0 = now).
  int get verificationResendIn {
    final at = _codeResendAt;
    if (at == null) return 0;
    final left = at.difference(DateTime.now()).inSeconds;
    return left > 0 ? left + 1 : 0;
  }

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

  /// Re-reads the profile (e.g. on app resume: Premium bought via webhook, email verified on
  /// another device). A revoked session (password reset elsewhere) logs out.
  Future<void> refreshUser() async {
    if (!isLoggedIn) return;
    try {
      await applyUser(await _api.me());
    } on ApiException catch (e) {
      if (e.isUnauthorized) await logout();
    }
  }

  /// Adopts a fresher copy of the account from any response that returns the user.
  Future<void> applyUser(AppUser user) async {
    if (!isLoggedIn) return;
    _user = user;
    await _store.setJson(_kUser, user.toJson());
    notifyListeners();
  }

  Future<void> login(String email, String password) async {
    final result = await _api.login(email.trim(), password);
    await _startSession(result);
  }

  /// Returns whether a verification code was emailed.
  Future<bool> register(String name, String email, String password) async {
    final result = await _api.register(name.trim(), email.trim(), password);
    await _startSession(result);
    if (result.verificationSent) _markCodeSent(60);
    return result.verificationSent;
  }

  Future<void> _startSession(AuthResult result) async {
    _api.token = result.token;
    _user = result.user;
    _status = AuthStatus.authenticated;
    _codeResendAt = null;
    await _store.writeToken(result.token);
    await _store.setJson(_kUser, result.user.toJson());
    notifyListeners();
  }

  Future<void> logout() async {
    _api.token = null;
    _codeResendAt = null;
    await _store.writeToken(null);
    await _store.setJson(_kUser, null);
    _setGuest();
  }

  void _setGuest() {
    _user = null;
    _status = AuthStatus.guest;
    notifyListeners();
  }

  void _markCodeSent(int resendAfter) => _codeResendAt = DateTime.now().add(Duration(seconds: resendAfter));

  /// Returns the seconds until another code may be requested.
  Future<int> sendVerificationCode() async {
    final wait = await _api.sendVerificationCode();
    _markCodeSent(wait);
    return wait;
  }

  Future<void> verifyEmail(String code) async {
    final user = await _api.verifyEmail(code);
    _codeResendAt = null;
    await applyUser(user.emailVerified ? user : user.copyWith(emailVerified: true));
  }

  /// Returns true when the email changed and the new address needs verifying.
  Future<bool> updateProfile({required String name, required String email, String? phone, String? currentPassword}) async {
    final previousEmail = _user?.email;
    final result = await _api.updateProfile(
      name: name.trim(),
      email: email.trim(),
      phone: phone?.trim(),
      currentPassword: currentPassword,
    );
    _user = result.user;
    await _store.setJson(_kUser, _user!.toJson());
    final emailChanged = previousEmail != null && previousEmail.toLowerCase() != result.user.email.toLowerCase();
    if (emailChanged && (result.verificationSent || !result.user.emailVerified)) _markCodeSent(60);
    notifyListeners();
    return emailChanged && !result.user.emailVerified;
  }

  /// The server revokes every session of the account and hands this device a fresh token.
  Future<void> changePassword(String current, String next) async {
    final result = await _api.changePassword(current, next);
    final token = result.token;
    if (token != null) {
      _api.token = token;
      await _store.writeToken(token);
    }
    if (result.user != null) await applyUser(result.user!);
  }

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

  Future<void> deleteAccount({required String currentPassword}) async {
    await _api.deleteAccount(currentPassword: currentPassword);
    await logout();
  }
}

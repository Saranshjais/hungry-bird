import 'dart:convert';

import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:shared_preferences/shared_preferences.dart';

/// Persistence: secrets in the platform keystore, everything else in SharedPreferences.
class LocalStore {
  LocalStore(this._prefs, {FlutterSecureStorage? secure}) : _secure = secure ?? const FlutterSecureStorage();

  static Future<LocalStore> create() async => LocalStore(await SharedPreferences.getInstance());

  final SharedPreferences _prefs;
  final FlutterSecureStorage _secure;

  static const _tokenKey = 'auth_token';

  // ---------- secure ----------

  Future<String?> readToken() async {
    try {
      return await _secure.read(key: _tokenKey);
    } catch (_) {
      // Keystore can be wiped (e.g. app restored from backup); treat as logged out.
      return null;
    }
  }

  Future<void> writeToken(String? token) async {
    try {
      if (token == null) {
        await _secure.delete(key: _tokenKey);
      } else {
        await _secure.write(key: _tokenKey, value: token);
      }
    } catch (_) {
      // Ignore keystore failures; the session simply won't persist.
    }
  }

  // ---------- prefs ----------

  String? getString(String key) => _prefs.getString(key);
  Future<void> setString(String key, String? value) =>
      value == null ? _prefs.remove(key) : _prefs.setString(key, value);

  bool getBool(String key, {bool fallback = false}) => _prefs.getBool(key) ?? fallback;
  Future<void> setBool(String key, bool value) => _prefs.setBool(key, value);

  int getInt(String key, {int fallback = 0}) => _prefs.getInt(key) ?? fallback;
  Future<void> setInt(String key, int value) => _prefs.setInt(key, value);

  List<String> getStringList(String key) => _prefs.getStringList(key) ?? const [];
  Future<void> setStringList(String key, List<String> value) => _prefs.setStringList(key, value);

  dynamic getJson(String key) {
    final raw = _prefs.getString(key);
    if (raw == null) return null;
    try {
      return jsonDecode(raw);
    } on FormatException {
      return null;
    }
  }

  Future<void> setJson(String key, Object? value) =>
      value == null ? _prefs.remove(key) : _prefs.setString(key, jsonEncode(value));
}
